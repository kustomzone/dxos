//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { SVG, createSvgContext, SVGRoot } from '@dxos/gem-core';
import { Graph, GraphForceProjector, type GraphLayoutNode, Markers, defaultStyles } from '@dxos/gem-spore';
import { useClient } from '@dxos/react-client';
import { useContacts } from '@dxos/react-client/halo';
import { Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { createFeedBlockGraphData, FeedBlockGraphModel, type FeedBlockGraphNode } from './model';
import { PanelContainer } from '../../../components';
import { DataSpaceSelector } from '../../../containers';
import { useFeedMessages } from '../../../hooks';

const classes = {
  default: '[&>circle]:fill-zinc-300 [&>circle]:stroke-zinc-400 [&>circle]:stroke-2',
  nodes: [
    '[&>circle]:fill-red-300',
    '[&>circle]:fill-green-300',
    '[&>circle]:fill-blue-300',
    '[&>circle]:fill-indigo-300',
    '[&>circle]:fill-teal-300',
    '[&>circle]:fill-cyan-300',
    '[&>circle]:fill-orange-300',
  ],
};

export const FeedGraphPanel = () => {
  const client = useClient();
  const feedMessages = useFeedMessages({ maxBlocks: 500 });
  const contacts = useContacts();

  const [model] = useState(() => new FeedBlockGraphModel());
  useEffect(() => {
    model.setData(createFeedBlockGraphData(client, contacts, feedMessages));
  }, [client, feedMessages, contacts]);

  const context = createSvgContext();
  const projector = useMemo(
    () =>
      new GraphForceProjector<FeedBlockGraphNode>(context, {
        forces: {
          manyBody: {
            strength: -80,
          },
          link: {
            distance: 120,
            iterations: 5,
          },
          radial: {
            radius: 100,
            strength: 0.02,
          },
        },
        attributes: {
          radius: (node: GraphLayoutNode<FeedBlockGraphNode>) => 16,
        },
      }),
    [],
  );

  return (
    <PanelContainer
      toolbar={
        <Toolbar.Root>
          <DataSpaceSelector />
        </Toolbar.Root>
      }
    >
      <SVGRoot context={context}>
        <SVG>
          <Markers />
          <Graph
            className={defaultStyles}
            model={model}
            drag
            arrows
            projector={projector}
            labels={{
              text: (node: GraphLayoutNode<FeedBlockGraphNode>, highlight) => {
                const content = node.data?.content;
                if (!content) {
                  return `${node.id} [missing]`;
                }
                const typeParts = content.type.split('.');
                const shortType = typeParts[typeParts.length - 1];
                if (highlight) {
                  return [`${node.id} [${shortType}]`, `issuer: ${content.issuer}`, `subject: ${content.subject}`].join(
                    '<br/>',
                  );
                } else {
                  return `${node.id} [${shortType}]`;
                }
              },
            }}
            attributes={{
              node: (node: GraphLayoutNode<FeedBlockGraphNode>) => {
                const classIndex = node.data?.feedKey.getInsecureHash(classes.nodes.length) ?? 0;
                return { class: mx('font-mono', classes.nodes[classIndex]) };
              },
            }}
          />
        </SVG>
      </SVGRoot>
    </PanelContainer>
  );
};
