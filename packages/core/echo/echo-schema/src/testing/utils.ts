//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';
import { react } from 'signia';

export const updateCounter = (touch: () => void) => {
  let updateCount = -1;
  const clear = effect(() => {
    touch();
    updateCount++;
  });

  return {
    get count() {
      return updateCount;
    },
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: clear,
  };
};

export const signiaUpdateCounter = (touch: () => void) => {
  let updateCount = -1;
  const clear = react('updateCounter', () => {
    touch();
    updateCount++;
  });

  return {
    get count() {
      return updateCount;
    },
    // https://github.com/tc39/proposal-explicit-resource-management
    [Symbol.dispose]: clear,
  };
};
