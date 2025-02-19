//
// Copyright 2024 DXOS.org
//

import type { Client } from '@dxos/client';
import { generateName } from '@dxos/display-name';
import { emptyGraph, type GraphData, type GraphLink, GraphModel } from '@dxos/gem-spore';
import type { PublicKey } from '@dxos/keys';
import { type Contact } from '@dxos/protocols/proto/dxos/client/services';
import { type SubscribeToFeedBlocksResponse } from '@dxos/protocols/proto/dxos/devtools/host';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { defaultMap } from '@dxos/util';

export type FeedBlockGraphNode = {
  id: string;
  feedKey: PublicKey;
  content?: {
    type: string;
    issuer: string;
    subject: string;
  };
};

const makeBlockId = (feedKey: PublicKey, seq: number) => `${feedKey.truncate()}:${seq}`;

export class FeedBlockGraphModel extends GraphModel<FeedBlockGraphNode> {
  constructor(private _graph: GraphData<FeedBlockGraphNode> = emptyGraph) {
    super();
  }

  get graph() {
    return this._graph;
  }

  setData(graph: GraphData<FeedBlockGraphNode>) {
    this._graph = graph;
    this.triggerUpdate();
  }
}

const tryFormatIdentity = (
  client: Client,
  contacts: Contact[],
  identityKey: PublicKey,
  deviceKey?: PublicKey,
): string | undefined => {
  let identityName: string | undefined;
  if (client.halo.identity.get()?.identityKey?.equals(identityKey)) {
    identityName = deviceKey && client.halo.device?.deviceKey.equals(deviceKey) ? 'this device' : 'my device';
  } else {
    const ownerContact = contacts.find((contact) => contact.identityKey.equals(identityKey));
    identityName = ownerContact ? ownerContact?.profile?.displayName ?? generateName(identityKey.toHex()) : undefined;
  }
  return identityName && `${identityName} (${deviceKey?.truncate() ?? identityKey.truncate()})`;
};

const tryFormatSpaceKey = (client: Client, maybeSpaceKey: PublicKey): string | undefined => {
  const space = client.spaces.get().find((space) => space.key.equals(maybeSpaceKey));
  if (!space) {
    return undefined;
  }
  const fallback = `Space (${maybeSpaceKey.truncate()})`;
  if (!space.isOpen) {
    return fallback;
  }
  return space.properties.name ?? fallback;
};

const formatCredentialType = (credential?: Credential): string => {
  return (credential?.subject?.assertion?.['@type'] as string) ?? 'unknown_type';
};

const formatKey = (client: Client, contacts: Contact[], identityKey: PublicKey, deviceKey?: PublicKey) => {
  const asSpaceKey = tryFormatSpaceKey(client, identityKey);
  if (asSpaceKey) {
    return asSpaceKey;
  }
  const asIdentityKey = tryFormatIdentity(client, contacts, identityKey, deviceKey);
  if (asIdentityKey) {
    return asIdentityKey;
  }
  return `${identityKey.truncate()}${deviceKey ? ` (${deviceKey?.truncate()})` : ''}`;
};

export const createFeedBlockGraphData = (
  client: Client,
  contacts: Contact[],
  blocks: SubscribeToFeedBlocksResponse.Block[],
): GraphData<FeedBlockGraphNode> => {
  const nodes = new Map<string, FeedBlockGraphNode>();
  const links: GraphLink[] = [];

  for (const block of blocks) {
    const nodeId = makeBlockId(block.feedKey, block.seq);
    const node = defaultMap(nodes, nodeId, { id: nodeId, feedKey: block.feedKey });
    const credential = block.data.payload.credential!.credential!;
    if (credential) {
      node.content ??= {
        type: formatCredentialType(credential),
        issuer: formatKey(client, contacts, credential.issuer, credential.proof!.signer),
        subject: formatKey(client, contacts, credential.subject!.id),
      };
    }
    if (block.seq > 0) {
      const prevId = makeBlockId(block.feedKey, block.seq - 1);
      defaultMap(nodes, prevId, { id: prevId, feedKey: block.feedKey });
      links.push({ id: `${nodeId}-${prevId}`, source: nodeId, target: prevId });
    }

    for (const [feedKey, seq] of block.data.timeframe.frames() ?? []) {
      const dependencyId = makeBlockId(feedKey, seq);
      defaultMap(nodes, dependencyId, { id: dependencyId, feedKey });
      links.push({ id: `${nodeId}-${dependencyId}`, source: nodeId, target: dependencyId });
    }
  }

  return { nodes: Array.from(nodes.values()), links };
};
