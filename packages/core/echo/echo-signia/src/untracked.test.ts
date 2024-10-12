//
// Copyright 2024 DXOS.org
//

import { atom, react, unsafe__withoutCapture } from 'signia';
import { describe, expect, test } from 'vitest';

describe('Untracked', () => {
  test('Nested `untracked` does not cause effect to run', async () => {
    const thisSignal = atom('test', {});
    let updateCount = 0;

    unsafe__withoutCapture(() => {
      react('test', () => {
        unsafe__withoutCapture(() => {
          const _ = thisSignal.value;
          thisSignal.set({});
          updateCount++;
        });
      });
    });

    expect(updateCount).to.eq(1);
  });
});
