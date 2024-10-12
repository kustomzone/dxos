//
// Copyright 2022 DXOS.org
//

import { atom, transact, unsafe__withoutCapture } from 'signia';

import { registerSignalsRuntime as registerRuntimeForEcho } from '@dxos/echo-signal-runtime';

let registered = false;

// TODO(burdon): Document.
export const registerSignalsRuntime = () => {
  if (registered) {
    return false;
  }

  registered = true;

  registerRuntimeForEcho({
    createSignal: (id) => {
      const thisSignal = atom(id, {});

      return {
        notifyRead: () => {
          const _ = thisSignal.value;
        },
        notifyWrite: () => {
          thisSignal.set({});
        },
      };
    },
    batch: transact,
    untracked: unsafe__withoutCapture,
  });

  return true;
};
