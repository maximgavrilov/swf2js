/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { MovieClip } from './MovieClip';
import {
    ColorTransform,
    intToRGBA, multiplicationColor
} from './utils';

export class Color {
    private variables = {};

    constructor(private mc: MovieClip) {
    }

    getProperty(name: string): any
    {
        return this.variables[name];
    }

    setProperty(name: string, value: any): void
    {
        this.variables[String(name)] = value;
    }


    setRGB(offset: number): void
    {
        if (!(this.mc instanceof MovieClip))
            return;

        const [R, G, B, A] = intToRGBA(offset | 0);
        const colorTransform = this.mc.getOriginColorTransform();
        if (colorTransform) {
            const multiColor: ColorTransform = [R, G, B, A * 255, 0, 0, 0, 0];
            const color = multiplicationColor(colorTransform, multiColor);
            this.mc.setColorTransform(color);
        }
    }

    getTransform(): ColorTransform | undefined
    {
        if (this.mc instanceof MovieClip)
            return this.mc.getColorTransform();
        return undefined;
    }

    setTransform(obj: any): void
    {
        if (!(this.mc instanceof MovieClip))
            return;

        const colorTransform = this.mc.getOriginColorTransform();
        const multiColor: ColorTransform = [
            obj.rb, obj.gb, obj.bb, obj.ab,
            obj.ra, obj.ga, obj.ba, obj.aa
        ];
        const color = multiplicationColor(colorTransform, multiColor);
        this.mc.setColorTransform(color);
    }
}
