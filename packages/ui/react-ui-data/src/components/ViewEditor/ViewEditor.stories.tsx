//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { createMutableSchema } from '@dxos/echo-schema/testing';
import { withClientProvider, useStoryClientData } from '@dxos/react-client/testing';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewType } from '@dxos/schema';
import { TestSchema, testView } from '@dxos/schema/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { ViewEditor, type ViewEditorProps } from './ViewEditor';
import translations from '../../translations';
import { TestPopup } from '../testing';

const DefaultStory = (props: ViewEditorProps) => (
  <div className='w-full grid grid-cols-3'>
    <div className='flex col-span-2 w-full justify-center p-4'>
      <TestPopup>
        <ViewEditor {...props} />
      </TestPopup>
    </div>
    <SyntaxHighlighter language='json' className='w-full text-xs font-thin'>
      {JSON.stringify(props, null, 2)}
    </SyntaxHighlighter>
  </div>
);

const meta: Meta<typeof ViewEditor> = {
  title: 'ui/react-ui-data/ViewEditor',
  component: ViewEditor,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof ViewEditor>;

export const Default: Story = {
  args: {
    schema: createMutableSchema(TestSchema),
    view: testView,
  },
};

export const Echo: Story = {
  render: () => {
    const { schema, view } = useStoryClientData<Pick<ViewEditorProps, 'schema' | 'view'>>();
    return <DefaultStory schema={schema} view={view} />;
  },
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [ViewType],
      onSpaceCreated: ({ space }) => {
        const schema = space.db.schemaRegistry.addSchema(TestSchema);
        const view = space.db.add(testView);
        return { schema, view };
      },
    }),
  ],
};
