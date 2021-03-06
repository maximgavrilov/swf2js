/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { SoundInfo } from './SwfTag';

export type Writeable<T> = { -readonly [P in keyof T]-?: T[P] };

export const LN2_2 = Math.LN2 / 2;
export const LOG1P = 0.29756328478758615;


const xmlHttpRequest = new XMLHttpRequest();
export const isXHR2 = (typeof xmlHttpRequest.responseType !== "undefined");
const ua = window.navigator.userAgent;
export const isAndroid = (ua.indexOf("Android") > 0);
export const isAndroid4x = (ua.indexOf("Android 4.") > 0);
export const isiOS = (ua.indexOf("iPhone") > 0 || ua.indexOf("iPod") > 0);
export const isChrome = (ua.indexOf("Chrome") > 0);
export const isTouch = (isAndroid || isiOS);
export const devicePixelRatio = window.devicePixelRatio || 1;

export type HitEvent = MouseEvent | TouchEvent;
export function isTouchEvent(event: HitEvent): event is TouchEvent {
    return isTouch;
}


const chkCanvas = document.createElement("canvas");
chkCanvas.width = 1;
chkCanvas.height = 1;
export const tmpContext = chkCanvas.getContext("2d");

// Alpha Bug
export const isAlphaBug = (() => {
    if (!isAndroid)
        return false;

    var imageData = tmpContext.createImageData(1, 1);
    var pixelArray = imageData.data;
    pixelArray[0] = 128;
    pixelArray[3] = 128;
    tmpContext.putImageData(imageData, 0, 0);
    imageData = tmpContext.getImageData(0, 0, 1, 1);
    pixelArray = imageData.data;
    const result = (pixelArray[0] === 255);
    imageData = null;
    pixelArray = null;
    return result;
})();

export function cloneArray<T>(src: T): T
export function cloneArray<T>(src: T[]): T[]
{
    const dst = new Array(src.length);

    for (let i = 0; i < src.length; i++)
        dst[i] = src[i];

    return dst;
}

export type Bounds = {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
};

export const Bounds = (class {
    static new(xMin: number = Number.MAX_VALUE,
               yMin: number = Number.MAX_VALUE,
               xMax: number = -Number.MAX_VALUE,
               yMax: number = -Number.MAX_VALUE)
    {
        return { xMin, yMin, xMax, yMax };
    }

    static clear(bounds: Bounds): void {
        bounds.xMin = Number.MAX_VALUE;
        bounds.yMin = Number.MAX_VALUE;
        bounds.xMax = -Number.MAX_VALUE;
        bounds.yMax = -Number.MAX_VALUE;
    }

    static clone(bounds: Bounds): Bounds {
        const { xMin, yMin, xMax, yMax } = bounds;
        return { xMin, yMin, xMax, yMax };
    }

    static set(bounds: Bounds, x: number, y: number): void {
        bounds.xMin = Math.min(bounds.xMin, x);
        bounds.xMax = Math.max(bounds.xMax, x);
        bounds.yMin = Math.min(bounds.yMin, y);
        bounds.yMax = Math.max(bounds.yMax, y);
    }

    static divide(bounds: Bounds, d: number): void {
        bounds.xMin /= d;
        bounds.yMin /= d;
        bounds.xMax /= d;
        bounds.yMax /= d;
    }

    static update(bounds: Bounds, other: Bounds): void {
        bounds.xMin = Math.min(bounds.xMin, other.xMin);
        bounds.xMax = Math.max(bounds.xMax, other.xMax);
        bounds.yMin = Math.min(bounds.yMin, other.yMin);
        bounds.yMax = Math.max(bounds.yMax, other.yMax);
    }

    static transform(bounds: Bounds, matrix: Matrix): Bounds {
        const x0 = bounds.xMax * matrix[0] + bounds.yMax * matrix[2] + matrix[4];
        const x1 = bounds.xMax * matrix[0] + bounds.yMin * matrix[2] + matrix[4];
        const x2 = bounds.xMin * matrix[0] + bounds.yMax * matrix[2] + matrix[4];
        const x3 = bounds.xMin * matrix[0] + bounds.yMin * matrix[2] + matrix[4];
        const y0 = bounds.xMax * matrix[1] + bounds.yMax * matrix[3] + matrix[5];
        const y1 = bounds.xMax * matrix[1] + bounds.yMin * matrix[3] + matrix[5];
        const y2 = bounds.xMin * matrix[1] + bounds.yMax * matrix[3] + matrix[5];
        const y3 = bounds.xMin * matrix[1] + bounds.yMin * matrix[3] + matrix[5];

        const xMax = Math.max(-Number.MAX_VALUE, x0, x1, x2, x3);
        const xMin = Math.min(Number.MAX_VALUE, x0, x1, x2, x3);
        const yMax = Math.max(-Number.MAX_VALUE, y0, y1, y2, y3);
        const yMin = Math.min(Number.MAX_VALUE, y0, y1, y2, y3);

        return { xMin, yMin, xMax, yMax };
    }
});

export type Color = [ number, number, number, number ]; // RGBA

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
    const [R, G, B, A] = color;
    return [
        Math.max(0, Math.min((R * data[0]) + data[4], 255))|0,
        Math.max(0, Math.min((G * data[1]) + data[5], 255))|0,
        Math.max(0, Math.min((B * data[2]) + data[6], 255))|0,
        Math.max(0, Math.min((A * 255 * data[3]) + data[7], 255)) / 255
    ];
}

export function colorCSS(color: Color): string {
    const [R, G, B, A] = color;
    return `rgba(${R}, ${G}, ${B}, ${A})`;
}

export function intToRGBA(int: number, alpha: number = 100): Color {
    return [
        (int & 0xff0000) >> 16,
        (int & 0x00ff00) >> 8,
        (int & 0x0000ff),
        (alpha / 100)
    ];
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

export function base64Encode(data: string): string
{
    const isBtoa = ('btoa' in window);

    if (isBtoa)
        return window.btoa(data);

    const base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = [];
    var i = 0;
    var len = data.length;

    while (i < len) {
        var c1 = data.charCodeAt(i++) & 0xff;
        if (i === len) {
            out[out.length] = base64EncodeChars.charAt(c1 >> 2);
            out[out.length] = base64EncodeChars.charAt((c1 & 0x3) << 4);
            out[out.length] = "==";
            break;
        }

        var c2 = data.charCodeAt(i++);
        if (i === len) {
            out[out.length] = base64EncodeChars.charAt(c1 >> 2);
            out[out.length] = base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            out[out.length] = base64EncodeChars.charAt((c2 & 0xF) << 2);
            out[out.length] = "=";
            break;
        }

        var c3 = data.charCodeAt(i++);
        out[out.length] = base64EncodeChars.charAt(c1 >> 2);
        out[out.length] = base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
        out[out.length] = base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
        out[out.length] = base64EncodeChars.charAt(c3 & 0x3F);
    }

    return out.join("");
}

