//
// Copyright 2024 DXOS.org
//

import '@glideapps/glide-data-grid/dist/index.css';

import { DataEditor, type GridCell, GridCellKind, type GridColumn, type Item } from '@glideapps/glide-data-grid';
import React from 'react';

import { withFullscreen, withTheme } from '@dxos/storybook-utils';

const columns: GridColumn[] = [
  { title: 'Name', width: 200 },
  { title: 'Email', width: 240 },
  { title: 'Team', width: 60 },
];

const getData = ([col, row]: Item): GridCell => {
  return {
    kind: GridCellKind.Text,
    data: `${col}-${row}`,
    displayData: `${col}-${row}`,
    allowOverlay: true,
  };
};

const Demo = () => {
  return (
    <div className='flex grow'>
      <DataEditor
        //
        getCellContent={getData}
        columns={columns}
        rows={100}
      />
    </div>
  );
};

export default {
  title: 'react-ui-grid/glide',
  component: Demo,
  decorators: [withTheme, withFullscreen()],
};

export const Default = {};
