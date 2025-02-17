import { getTypename, HasId, HasTypename, ObjectId } from '@dxos/echo-schema';

// TODO(dmaretskyi): Process schema.
export const reduceQueue = (items: (HasId & HasTypename)[]): Map<ObjectId, HasId & HasTypename> => {
  const map = new Map<ObjectId, any>();

  for (const item of items) {
    if (!ObjectId.isValid(item.id)) {
      throw new Error('Invalid object id');
    }
    if (getTypename(item) == null) {
      throw new Error('Invalid typename');
    }

    map.set(item.id, item);
  }

  return map;
};
