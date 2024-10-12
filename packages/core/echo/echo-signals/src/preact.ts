//
// Copyright 2023 DXOS.org
//

import { signal, batch, untracked } from '@preact/signals';

import { registerSignalsRuntime as registerRuntimeForEcho } from '@dxos/echo-signal-runtime';

let registered = false;

export const registerSignalsRuntime = () => {
  if (registered) {
    return false;
  }
  registered = true;

  registerRuntimeForEcho({
    createSignal: (id) => {
      const thisSignal = signal({});
      (thisSignal as any).__id = id;

      return {
        notifyRead: () => {
          const _ = thisSignal.value;
        },
        notifyWrite: () => {
          thisSignal.value = {};
        },
      };
    },
    batch,
    untracked,
  });
};
