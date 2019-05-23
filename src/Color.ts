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

/**
 * @param mc
 * @constructor
 */
export var Color = function (mc)
{
    var _this = this;
    _this.movieClip = mc;
    _this.variables = {};
};

/**
 *
 * @param name
 * @returns {*}
 */
Color.prototype.getProperty = function (name)
{
    return this.variables[name];
};

/**
 * @param name
 * @param value
 */
Color.prototype.setProperty = function (name, value)
{
    this.variables[String(name)] = value;
};


/**
 * @param offset
 */
Color.prototype.setRGB = function (offset)
{
    var _this = this;
    var mc = _this.movieClip;
    if (mc instanceof MovieClip) {
        mc = mc as any;

        offset |= 0;
        var obj = intToRGBA(offset);
        var colorTransform = mc.getOriginColorTransform();
        if (colorTransform) {
            const multiColor: ColorTransform = [obj.R, obj.G, obj.B, obj.A * 255, 0, 0, 0, 0];
            const color = multiplicationColor(colorTransform, multiColor);
            mc.setColorTransform(color);
        }
    }
};

/**
 * @returns {*[]|*}
 */
Color.prototype.getTransform = function ()
{
    var _this = this;
    var mc = _this.movieClip;
    if (mc instanceof MovieClip) {
        mc = mc as any;
        return mc.getColorTransform();
    }
    return undefined;
};

/**
 * @param obj
 */
Color.prototype.setTransform = function (obj)
{
    var _this = this;
    var mc = _this.movieClip;
    if (mc instanceof MovieClip) {
        mc = mc as any;
        var colorTransform = mc.getOriginColorTransform();
        var multiColor: ColorTransform = [
            obj.rb, obj.gb, obj.bb, obj.ab,
            obj.ra, obj.ga, obj.ba, obj.aa
        ];
        var color = multiplicationColor(colorTransform, multiColor);
        mc.setColorTransform(color);
    }
};

