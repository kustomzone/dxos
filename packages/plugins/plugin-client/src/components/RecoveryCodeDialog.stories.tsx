//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { generateSeedPhrase } from '@dxos/credentials';
import { AlertDialog } from '@dxos/react-ui';
import { osTranslations } from '@dxos/shell/react';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { RecoveryCodeDialog, type RecoveryCodeDialogProps } from './RecoveryCodeDialog';
import translations from '../translations';

const Story = (args: RecoveryCodeDialogProps) => {
  return (
    <AlertDialog.Root open>
      <AlertDialog.Overlay blockAlign='start'>
        <RecoveryCodeDialog {...args} />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta: Meta<typeof RecoveryCodeDialog> = {
  title: 'plugins/plugin-client/RecoveryCodeDialog',
  component: RecoveryCodeDialog,
  render: Story,
  decorators: [withTheme, withLayout({ tooltips: true })],
  parameters: { translations: [...translations, osTranslations] },
  args: {
    code: generateSeedPhrase(),
  },
};

export default meta;

export const Default: StoryObj<typeof RecoveryCodeDialog> = {};
