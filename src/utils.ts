/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

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
