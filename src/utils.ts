/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';


export type Stage = any;
export type SoundInfo = any;


const ua = window.navigator.userAgent;
export const isAndroid = (ua.indexOf("Android") > 0);
export const isAndroid4x = (ua.indexOf("Android 4.") > 0);
export const isiOS = (ua.indexOf("iPhone") > 0 || ua.indexOf("iPod") > 0);
export const isChrome = (ua.indexOf("Chrome") > 0);
export const isTouch = (isAndroid || isiOS);
export const devicePixelRatio = window.devicePixelRatio || 1;

export function cloneArray<T>(src: T): T
export function cloneArray<T>(src: T[]): T[]
{
    const dst = new Array(src.length);

    for (let i = 0; i < src.length; i++)
        dst[i] = src[i];

    return dst;
}

export class Bounds {
    constructor(public xMin: number = Number.MAX_VALUE,
                public yMin: number = Number.MAX_VALUE,
                public xMax: number = -Number.MAX_VALUE,
                public yMax: number = -Number.MAX_VALUE)
    { }

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

    transform(matrix: Matrix): Bounds {
        const x0 = this.xMax * matrix[0] + this.yMax * matrix[2] + matrix[4];
        const x1 = this.xMax * matrix[0] + this.yMin * matrix[2] + matrix[4];
        const x2 = this.xMin * matrix[0] + this.yMax * matrix[2] + matrix[4];
        const x3 = this.xMin * matrix[0] + this.yMin * matrix[2] + matrix[4];
        const y0 = this.xMax * matrix[1] + this.yMax * matrix[3] + matrix[5];
        const y1 = this.xMax * matrix[1] + this.yMin * matrix[3] + matrix[5];
        const y2 = this.xMin * matrix[1] + this.yMax * matrix[3] + matrix[5];
        const y3 = this.xMin * matrix[1] + this.yMin * matrix[3] + matrix[5];

        const xMax = Math.max(-Number.MAX_VALUE, x0, x1, x2, x3);
        const xMin = Math.min(Number.MAX_VALUE, x0, x1, x2, x3);
        const yMax = Math.max(-Number.MAX_VALUE, y0, y1, y2, y3);
        const yMin = Math.min(Number.MAX_VALUE, y0, y1, y2, y3);

        return new Bounds(xMin, yMin, xMax, yMax);
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

export function multiplicationColor(a: ColorTransform, b: ColorTransform): ColorTransform {
    return [
        a[0] * b[0], a[1] * b[1],
        a[2] * b[2], a[3] * b[3],
        a[0] * b[4] + a[4], a[1] * b[5] + a[5],
        a[2] * b[6] + a[6], a[3] * b[7] + a[7]
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

const BLEND_MODES: BlendMode[] = [
    'normal', 'layer', 'multiply', 'screen', 'lighten', 'darken', 'difference',
    'add', 'subtract', 'invert', 'alpha', 'erase', 'overlay', 'hardlight'
];

export function getBlendName(blendMode: string | number): BlendMode {
    if (typeof blendMode === 'string') {
        if (BLEND_MODES.indexOf(blendMode as any) < 0)
            throw new Error('No blendMode: ' + blendMode);

        return blendMode as any;
    }

    if (!BLEND_MODES[blendMode - 1])
        throw new Error('No blendMode: ' + blendMode);

    return BLEND_MODES[blendMode - 1];
}

export function startSound(audio: HTMLMediaElement, soundInfo: SoundInfo): void {
    if (soundInfo.SyncStop) {
        audio.pause();
    } else {
        if (soundInfo.HasLoops) {
            audio.loopCount = soundInfo.LoopCount;
            var loopSound = function ()
            {
                audio.loopCount--;
                if (!this.loopCount) {
                    audio.removeEventListener("ended", loopSound);
                } else {
                    audio.currentTime = 0;
                    if (soundInfo.HasInPoint) {
                        audio.currentTime = soundInfo.InPoint;
                    }
                    audio.play();
                }
            };
            audio.addEventListener("ended", loopSound);
        }

        if (soundInfo.HasInPoint) {
            audio.addEventListener("canplay", function ()
            {
                this.currentTime = soundInfo.InPoint;
            });
        }

        audio.play();
    }
}

