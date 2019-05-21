/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';

const ua = window.navigator.userAgent;
export const isAndroid = (ua.indexOf("Android") > 0);
export const isAndroid4x = (ua.indexOf("Android 4.") > 0);
export const isiOS = (ua.indexOf("iPhone") > 0 || ua.indexOf("iPod") > 0);
export const isChrome = (ua.indexOf("Chrome") > 0);
export const isTouch = (isAndroid || isiOS);

export function cloneArray<T>(src: T): T
export function cloneArray<T>(src: T[]): T[]
{
    const dst = new Array(src.length);

    for (let i = 0; i < src.length; i++)
        dst[i] = src[i];

    return dst;
}

export type BlendMode = 'normal'
                      | 'layer'
                      | 'multiply'
                      | 'screen'
                      | 'lighten'
                      | 'darken'
                      | 'difference'
                      | 'add'
                      | 'subtract'
                      | 'invert'
                      | 'alpha'
                      | 'erase'
                      | 'overlay'
                      | 'hardlight';

export class Bounds {
    public xMin: number;
    public yMin: number;
    public xMax: number;
    public yMax: number;

    constructor() {
        this.clear();
    }

    clear(): void {
        this.xMin = Number.MAX_VALUE;
        this.yMin = Number.MAX_VALUE;
        this.xMax = -Number.MAX_VALUE;
        this.yMax = -Number.MAX_VALUE;
    }

    set(x: number, y: number): void {
        this.xMin = Math.min(this.xMin, x);
        this.xMax = Math.max(this.xMax, x);
        this.yMin = Math.min(this.yMin, y);
        this.yMax = Math.max(this.yMax, y);
    }
}

export type Color = {
    R: number;
    G: number;
    B: number;
    A: number;
};

export type ColorTransform = [
    number, number, number, number,
    number, number, number, number
];

export type Filter = any;

export type FilterOperation = 'source-over'
                     | 'source-in'
                     | 'source-out'
                     | 'copy'
                     | 'source-atop'
                     | 'destination-over';


export type Matrix = [
    number, number, number,
    number, number, number
];

export type Stage = any;

export function generateColorTransform(color: Color, data: ColorTransform): Color {
    return {
        R: Math.max(0, Math.min((color.R * data[0]) + data[4], 255))|0,
        G: Math.max(0, Math.min((color.G * data[1]) + data[5], 255))|0,
        B: Math.max(0, Math.min((color.B * data[2]) + data[6], 255))|0,
        A: Math.max(0, Math.min((color.A * 255 * data[3]) + data[7], 255)) / 255
    };
}

export function intToRGBA(int: number, alpha: number = 100): Color {
    return {
        R: (int & 0xff0000) >> 16,
        G: (int & 0x00ff00) >> 8,
        B: (int & 0x0000ff),
        A: (alpha / 100)
    };
}

export function multiplicationMatrix(a: Matrix, b: Matrix): Matrix {
    return [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5]
    ];
}

export function toColorInt(rgb: string | number): number {
    if (typeof rgb === 'string') {
        const canvas = cacheStore.getCanvas();
        canvas.width = 1;
        canvas.height = 1;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = rgb;
        rgb = parseInt('0x' + ctx.fillStyle.substr(1));

        cacheStore.destroy(ctx);
    }
    return rgb | 0;
}

const BLEND_MODES: BlendMode[] = [
    'normal', 'layer', 'multiply', 'screen', 'lighten', 'darken', 'difference',
    'add', 'subtract', 'invert', 'alpha', 'erase', 'overlay', 'hardlight'
];

export function getBlendName(blendMode: BlendMode | number): BlendMode {
    if (typeof blendMode === 'string')
        return blendMode;

    if (!BLEND_MODES[blendMode - 1])
        throw new Error('No blendMode: ' + blendMode);

    return BLEND_MODES[blendMode - 1];
}
