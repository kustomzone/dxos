//
// Copyright 2021 DXOS.org
//

import { EventSubscriptions } from '@dxos/async';
import { Stream } from '@dxos/codec-protobuf/stream';
import { type SpaceManager } from '@dxos/echo-pipeline';
import { FeedIterator, type FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type SubscribeToFeedsRequest,
  type SubscribeToFeedsResponse,
  type SubscribeToFeedBlocksRequest,
  type SubscribeToFeedBlocksResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { ComplexMap, nonNullable } from '@dxos/util';

type FeedInfo = {
  feed: FeedWrapper<FeedMessage>;
  owner?: SubscribeToFeedsResponse.FeedOwner;
};

type ServiceContext = {
  feedStore: FeedStore<FeedMessage>;
  spaceManager: SpaceManager;
};

export const subscribeToFeeds = (
  { feedStore, spaceManager }: ServiceContext,
  { feedKeys }: SubscribeToFeedsRequest,
) => {
  return new Stream<SubscribeToFeedsResponse>(({ next }) => {
    const subscriptions = new EventSubscriptions();
    const feedMap = new ComplexMap<PublicKey, FeedInfo>(PublicKey.hash);

    const update = () => {
      const { feeds } = feedStore;
      feeds
        .filter((feed) => !feedKeys?.length || feedKeys.some((feedKey) => feedKey.equals(feed.key)))
        .forEach((feed) => {
          if (!feedMap.has(feed.key)) {
            feedMap.set(feed.key, { feed });
            feed.on('close', update);
            subscriptions.add(() => feed.off('close', update));
          }
          if (!feedMap.get(feed.key)?.owner) {
            feedMap.get(feed.key)!.owner = findFeedOwner(spaceManager, feed.key);
          }
        });

      next({
        feeds: Array.from(feedMap.values()).map(({ feed, owner }) => ({
          feedKey: feed.key,
          length: feed.properties.length,
          bytes: feed.core.byteLength,
          downloaded: feed.core.bitfield?.data.toBuffer() ?? new Uint8Array(),
          owner,
        })),
      });
    };

    subscriptions.add(feedStore.feedOpened.on(update));
    update();

    return () => {
      subscriptions.clear();
    };
  });
};

const findFeedOwner = (
  spaceManager: SpaceManager,
  feedKey: PublicKey,
): SubscribeToFeedsResponse.FeedOwner | undefined => {
  const feedInfo = [...spaceManager.spaces.values()]
    .flatMap((space) => [...space.spaceState.feeds.values()])
    .find((feed) => feed.key.equals(feedKey));
  log('feeds', { feedInfo, key: feedKey.truncate(), allSpaces: spaceManager.spaces.size });
  if (!feedInfo) {
    return undefined;
  }
  return {
    identity: feedInfo.assertion.identityKey,
    device: feedInfo.assertion.deviceKey,
  };
};

export const subscribeToFeedBlocks = (
  { feedStore, spaceManager }: ServiceContext,
  { feedKey, spaceKey, maxBlocks = 10 }: SubscribeToFeedBlocksRequest,
) => {
  return new Stream<SubscribeToFeedBlocksResponse>(({ next }) => {
    const feedKeys = getFeedKeys(spaceManager, spaceKey, feedKey);
    if (!feedKeys.length) {
      return;
    }
    const subscriptions = new EventSubscriptions();

    const timeout = setTimeout(async () => {
      const feeds = feedKeys.map((feedKey) => feedStore.getFeed(feedKey)).filter(nonNullable);
      const update = async () => {
        const allBlocks = [];
        for (const feed of feeds) {
          if (!feed.properties.length) {
            continue;
          }

          const iterator = new FeedIterator(feed);
          await iterator.open();
          const blocks = [];
          for await (const block of iterator) {
            blocks.push(block);
            if (blocks.length >= feed.properties.length) {
              break;
            }
          }
          await iterator.close();

          allBlocks.push(...blocks);
        }

        next({
          blocks: allBlocks.slice(-maxBlocks),
        });
      };
      feeds.forEach((feed) => {
        feed.on('append', update);
        subscriptions.add(() => feed.off('append', update));

        feed.on('truncate', update);
        subscriptions.add(() => feed.off('truncate', update));
      });
      await update();
    });

    return () => {
      subscriptions.clear();
      clearTimeout(timeout);
    };
  });
};

const getFeedKeys = (spaceManager: SpaceManager, spaceKey?: PublicKey, feedKey?: PublicKey): PublicKey[] => {
  if (feedKey) {
    return [feedKey];
  }
  const space = spaceKey && spaceManager.spaces.get(spaceKey);
  if (!space) {
    return [];
  }
  return space.controlPipeline.state.feeds.map((feed) => feed.key);
};
