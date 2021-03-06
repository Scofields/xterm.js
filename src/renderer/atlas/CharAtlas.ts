/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { ITerminal } from '../../Types';
import { IColorSet } from '../Types';
import { ICharAtlasConfig } from './Types';
import { isFirefox } from '../../shared/utils/Browser';
import { generateCharAtlas, ICharAtlasRequest } from '../../shared/atlas/CharAtlasGenerator';
import { generateConfig, configEquals } from './CharAtlasUtils';

interface ICharAtlasCacheEntry {
  bitmap: HTMLCanvasElement | Promise<ImageBitmap>;
  config: ICharAtlasConfig;
  ownedBy: ITerminal[];
}

let charAtlasCache: ICharAtlasCacheEntry[] = [];

/**
 * Acquires a char atlas, either generating a new one or returning an existing
 * one that is in use by another terminal.
 * @param terminal The terminal.
 * @param colors The colors to use.
 */
export function acquireCharAtlas(terminal: ITerminal, colors: IColorSet, scaledCharWidth: number, scaledCharHeight: number): HTMLCanvasElement | Promise<ImageBitmap> {
  const newConfig = generateConfig(scaledCharWidth, scaledCharHeight, terminal, colors);

  // Check to see if the terminal already owns this config
  for (let i = 0; i < charAtlasCache.length; i++) {
    const entry = charAtlasCache[i];
    const ownedByIndex = entry.ownedBy.indexOf(terminal);
    if (ownedByIndex >= 0) {
      if (configEquals(entry.config, newConfig)) {
        return entry.bitmap;
      } else {
        // The configs differ, release the terminal from the entry
        if (entry.ownedBy.length === 1) {
          charAtlasCache.splice(i, 1);
        } else {
          entry.ownedBy.splice(ownedByIndex, 1);
        }
        break;
      }
    }
  }

  // Try match a char atlas from the cache
  for (let i = 0; i < charAtlasCache.length; i++) {
    const entry = charAtlasCache[i];
    if (configEquals(entry.config, newConfig)) {
      // Add the terminal to the cache entry and return
      entry.ownedBy.push(terminal);
      return entry.bitmap;
    }
  }

  const canvasFactory = (width: number, height: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };

  const charAtlasConfig: ICharAtlasRequest = {
    scaledCharWidth,
    scaledCharHeight,
    fontSize: terminal.options.fontSize,
    fontFamily: terminal.options.fontFamily,
    fontWeight: terminal.options.fontWeight,
    fontWeightBold: terminal.options.fontWeightBold,
    background: colors.background,
    foreground: colors.foreground,
    ansiColors: colors.ansi,
    devicePixelRatio: window.devicePixelRatio,
    allowTransparency: terminal.options.allowTransparency
  };

  const newEntry: ICharAtlasCacheEntry = {
    bitmap: generateCharAtlas(window, canvasFactory, charAtlasConfig),
    config: newConfig,
    ownedBy: [terminal]
  };
  charAtlasCache.push(newEntry);
  return newEntry.bitmap;
}
