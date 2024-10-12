//
// Copyright 2024 DXOS.org
//

import { test } from 'vitest';

import { signiaUpdateCounter } from '@dxos/echo-schema/testing';
import { compositeRuntime } from '@dxos/echo-signal-runtime';
import { registerSignalsRuntime } from '@dxos/echo-signia';

registerSignalsRuntime();

test('signals', ({ expect }) => {
  const sig = compositeRuntime.createSignal('test');

  using updates = signiaUpdateCounter(() => {
    sig.notifyRead();
  });
  expect(updates.count).toEqual(0);

  sig.notifyWrite();

  expect(updates.count).toEqual(1);
});
