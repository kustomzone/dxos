//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import * as d3 from 'd3';
import React, { type UIEventHandler, useEffect } from 'react';
import useResizeObserver from 'use-resize-observer';

import { mx } from '@dxos/react-ui-theme';
import { withTheme, withFullscreen } from '@dxos/storybook-utils';

type Point = [number, number];
const line = (ctx: CanvasRenderingContext2D, [x1, y1]: Point, [x2, y2]: Point) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

// Prior art:
// - https://github.com/myliang/x-spreadsheet?tab=readme-ov-file
// - Google sheets
//  - renders EVERYTHING as a canvas.
//  - only shows resize (and drag) borders -- doesn't change geometry until complete.
// - https://github.com/TanStack/virtual/blob/main/examples/react/dynamic/src/main.tsx#L171
// - https://tanstack.com/virtual/v3/docs/framework/react/examples/variable
// - https://canvas-grid-demo.vercel.app
// - https://sheet.brianhung.me
//  - https://github.com/BrianHung
// - https://daybrush.com/moveable

// Goals
// - use for sheet and tables.
// - support multiple locked rows/columns.

// Conclusion
// - canvas over everything (for resize cursors).
// - reduce lag bug making the actual scroll container invisible

const columnWidth = 160;
const rowHeight = 32;
const railWidth = 40;

const contentWidth = 8_000;
const contentHeight = 8_000;

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
const render = (canvas: HTMLCanvasElement, fn: (ctx: CanvasRenderingContext2D) => void) => {
  const t = Date.now();

  const ctx = canvas.getContext('2d', { alpha: false })!;

  // Get the DPR and size of the canvas.
  const dpr = window.devicePixelRatio;
  const rect = canvas.getBoundingClientRect();

  // Set the "actual" size of the canvas.
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  // Scale the context to ensure correct drawing operations.
  ctx.scale(dpr, dpr);

  // Set the "drawn" size of the canvas.
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  fn(ctx);

  return Date.now() - t;
};

const createBox = ({ x, y, width, height }: Pick<DOMRect, 'x' | 'y' | 'width' | 'height'>) => {
  const div = document.createElement('div');
  div.className = 'absolute flex items-center justify-center text-gray-500 text-xs';
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.width = `${width}px`;
  div.style.height = `${height}px`;
  return div;
};

const Grid = () => {
  const { ref: mainRef, width = 0, height = 0 } = useResizeObserver<HTMLDivElement>();

  const fakeScrollRef = React.useRef<HTMLDivElement>(null);
  const mainScrollRef = React.useRef<HTMLDivElement>(null);
  const columnsScrollRef = React.useRef<HTMLDivElement>(null);
  const rows1ScrollRef = React.useRef<HTMLDivElement>(null);
  const rows2ScrollRef = React.useRef<HTMLDivElement>(null);

  const mainContentRef = React.useRef<HTMLDivElement>(null);
  const columnsContentRef = React.useRef<HTMLDivElement>(null);
  const rows1ContentRef = React.useRef<HTMLDivElement>(null);
  const rows2ContentRef = React.useRef<HTMLDivElement>(null);

  const mainCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const columnsCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const rows1CanvasRef = React.useRef<HTMLCanvasElement>(null);
  const rows2CanvasRef = React.useRef<HTMLCanvasElement>(null);

  // TODO(burdon): Data structure? Table/sheet.
  // TODO(burdon): Resize/move (additional single canvas?) Resize handles.
  // TODO(burdon): Selection.
  // TODO(burdon): Scrollbars.
  // TODO(burdon): Table headers.
  // TODO(burdon): Cell types.

  useEffect(() => {
    render(columnsCanvasRef.current!, (ctx) => {
      d3.range(0, width * 2, columnWidth).forEach((x) => line(ctx, [x, 0], [x, rowHeight]));
    });
    columnsContentRef.current!.innerHTML = '';
    d3.range(0, width * 2, columnWidth).forEach((x, xi) => {
      const div = columnsContentRef.current!.appendChild(createBox({ x, y: 0, width: columnWidth, height: rowHeight }));
      div.innerHTML = `${xi}`;
    });

    render(rows1CanvasRef.current!, (ctx) => {
      d3.range(0, height * 2, rowHeight).forEach((y) => line(ctx, [0, y], [railWidth, y]));
    });
    rows1ContentRef.current!.innerHTML = '';
    d3.range(0, height * 2, rowHeight).forEach((y, yi) => {
      const div = rows1ContentRef.current!.appendChild(createBox({ x: 0, y, width: railWidth, height: rowHeight }));
      div.innerHTML = `${yi}`;
    });

    render(rows2CanvasRef.current!, (ctx) => {
      d3.range(0, height * 2, rowHeight).forEach((y) => line(ctx, [0, y], [railWidth, y]));
    });
    rows2ContentRef.current!.innerHTML = '';
    d3.range(0, height * 2, rowHeight).forEach((y, yi) => {
      const div = rows2ContentRef.current!.appendChild(createBox({ x: 0, y, width: railWidth, height: rowHeight }));
      div.innerHTML = 'x';
    });

    render(mainCanvasRef.current!, (ctx) => {
      d3.range(0, width * 2, columnWidth).forEach((x) => line(ctx, [x, 0], [x, height * 2]));
      d3.range(0, height * 2, rowHeight).forEach((y) => line(ctx, [0, y], [width * 2, y]));
    });
    mainContentRef.current!.innerHTML = '';
    d3.range(0, width * 2, columnWidth).forEach((x, xi) => {
      d3.range(0, height * 2, rowHeight).forEach((y, yi) => {
        // TODO(burdon): Map existing cells using d3.join.
        if (Math.random() < 0.3) {
          const div = mainContentRef.current!.appendChild(createBox({ x, y, width: columnWidth, height: rowHeight }));
          div.innerHTML = `(${xi},${yi})`;
        }
      });
    });
  }, [width, height]);

  const handleScroll: UIEventHandler<HTMLDivElement> = () => {
    requestAnimationFrame(() => {
      const { scrollLeft, scrollTop } = fakeScrollRef.current!;
      mainScrollRef.current!.scrollLeft = scrollLeft;
      mainScrollRef.current!.scrollTop = scrollTop;
      columnsScrollRef.current!.scrollLeft = scrollLeft;
      rows1ScrollRef.current!.scrollTop = scrollTop;
      rows2ScrollRef.current!.scrollTop = scrollTop;
    });
  };

  return (
    <div className={mx('grid grid-cols-[40px_1fr_40px] grid-rows-[32px_1fr_32px]', 'bs-full is-full overflow-hidden')}>
      {/* Top row. */}
      <>
        <div />
        {/* Columns. */}
        <div
          ref={columnsScrollRef}
          className='relative flex overflow-x-auto scrollbar-none border-x separator-separator'
        >
          <div style={{ width: contentWidth, height: rowHeight }}>
            <div ref={columnsContentRef} className='absolute' />
            <canvas ref={columnsCanvasRef} width={contentWidth} height={rowHeight} />
          </div>
        </div>
        <div />
      </>

      {/* Middle row. */}
      <>
        {/* Rows (left). */}
        <div ref={rows1ScrollRef} className='relative flex overflow-y-auto scrollbar-none border-y separator-separator'>
          <div style={{ width: railWidth, height: contentHeight }}>
            <div ref={rows1ContentRef} className='absolute' />
            <canvas ref={rows1CanvasRef} width={railWidth} height={contentHeight} />
          </div>
        </div>
        <div ref={mainRef} className='relative flex grow overflow-hidden'>
          {/* Fake scroll container. */}
          <div ref={fakeScrollRef} onScroll={handleScroll} className='absolute inset-0 overflow-auto scrollbar-thin'>
            <div style={{ width: contentWidth, height: contentHeight }} />
          </div>
          {/* Main content. */}
          <div
            ref={mainScrollRef}
            className='relative flex overflow-auto border separator-separator pointer-events-none'
          >
            <div style={{ width: contentWidth, height: contentHeight }}>
              <div ref={mainContentRef} className='absolute' />
              <canvas ref={mainCanvasRef} width={contentWidth} height={contentHeight} className='pointer-events-none' />
            </div>
          </div>
        </div>
        {/* Rows (right). */}
        <div ref={rows2ScrollRef} className='relative flex overflow-y-auto scrollbar-none border-y separator-separator'>
          <div style={{ width: railWidth, height: contentHeight }}>
            <div ref={rows2ContentRef} className='absolute' />
            <canvas ref={rows2CanvasRef} width={railWidth} height={contentHeight} />
          </div>
        </div>
      </>

      {/* Bottom row. */}
      <>
        <div />
        <div className='flex items-center text-green-500 font-mono opacity-50' />
        <div />
      </>
    </div>
  );
};

export default {
  title: 'react-ui-grid/layout',
  component: Grid,
  decorators: [withTheme, withFullscreen()],
};

export const Default = {};
