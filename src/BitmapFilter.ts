/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { Color, ColorTransform, FilterOperation, Matrix, Stage } from './utils';


export abstract class BitmapFilter {
    abstract clone(): BitmapFilter;
    abstract render(cache: CanvasRenderingContext2D,
                    matrix: Matrix,
                    colorTransform: ColorTransform,
                    stage: Stage): CanvasRenderingContext2D;

    generateColorTransform(color: Color, data: ColorTransform): Color {
        return {
            R: Math.max(0, Math.min((color.R * data[0]) + data[4], 255))|0,
            G: Math.max(0, Math.min((color.G * data[1]) + data[5], 255))|0,
            B: Math.max(0, Math.min((color.B * data[2]) + data[6], 255))|0,
            A: Math.max(0, Math.min((color.A * 255 * data[3]) + data[7], 255)) / 255
        };
    }

    intToRGBA(int: number, alpha: number = 100): Color {
        return {
            R: (int & 0xff0000) >> 16,
            G: (int & 0x00ff00) >> 8,
            B: (int & 0x0000ff),
            A: (alpha / 100)
        };
    }

    filterOperation(inner: boolean, knockout: boolean, hideObject: boolean = false): FilterOperation {
        if (knockout)
            return inner ? 'source-in' : 'source-out';

        if (hideObject)
            return inner ? 'source-in' : 'copy';

        return inner ? 'source-atop' : 'destination-over';
    }

    coatOfColor(ctx: CanvasRenderingContext2D,
                color: Color,
                inner: boolean,
                strength: number): CanvasRenderingContext2D
    {
        var canvas = ctx.canvas;
        var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        var i = 0;
        var pxData = imgData.data;
        var R = color.R;
        var G = color.G;
        var B = color.B;
        var length = pxData.length;
        for (; i < length; i += 4) {
            var aKey = i + 3;
            var alpha = pxData[aKey];
            if (!inner) {
                if (alpha !== 0) {
                    pxData[i] = R|0;
                    pxData[i + 1] = G|0;
                    pxData[i + 2] = B|0;
                    pxData[aKey] = alpha|0;
                }
            } else {
                if (alpha !== 255) {
                    pxData[i] = R|0;
                    pxData[i + 1] = G|0;
                    pxData[i + 2] = B|0;
                    pxData[aKey] = 255 - (alpha|0);
                }
            }
        }

        ctx.putImageData(imgData, 0, 0);
        if (strength > 0) {
            for (i = 1; i < strength; i++) {
                ctx.drawImage(ctx.canvas, 0, 0);
            }
        }
        return ctx;
    }

    toColorInt(rgb: string | number): number {
        if (typeof rgb === 'string') {
            const canvas = cacheStore.getCanvas();
            canvas.width = 1;
            canvas.height = 1;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = rgb;
            rgb = parseInt('0x' + ctx.fillStyle.substr(1));

            cacheStore.destroy(ctx);
        }
        return rgb;
    }
}

export class BlurFilter extends BitmapFilter {
    readonly blurX: number;
    readonly blurY: number;
    readonly quality: number;

    constructor(blurX: any = 4, blurY: any = 4, quality: any = 1) {
        super();

        blurX = blurX | 0;
        if (!isNaN(blurX) && 0 <= blurX && 255 >= blurX)
            this.blurX = blurX;

        blurY = blurY | 0;
        if (!isNaN(blurY) && 0 <= blurY && 255 >= blurY)
            this.blurY = blurY;

        quality = quality | 0;
        if (!isNaN(quality) && 1 <= quality && 15 >= quality)
            this.quality = quality;
    }

    clone(): BlurFilter {
        return new BlurFilter(this.blurX, this.blurY, this.quality);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        var cacheCanvas = cache.canvas;
        var canvas = cacheStore.getCanvas();
        canvas.width = cacheCanvas.width;
        canvas.height = cacheCanvas.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(cacheCanvas, 0, 0);
        ctx._offsetX = cache._offsetX;
        ctx._offsetY = cache._offsetY;
        return this.executeFilter(ctx, stage);
    }

    executeFilter(ctx: CanvasRenderingContext2D, stage: Stage): CanvasRenderingContext2D {
        var _blurX = this.blurX;
        var _blurY = this.blurY;
        if (_blurX === 0 && _blurY === 0) {
            return ctx;
        }

        if (_blurX === 0) {
            _blurX = 4;
        }

        if (_blurY === 0) {
            _blurY = 4;
        }

        var _quality = this.quality;
        var scale = stage.getScale();

        var STEP = [0.5, 1.05, 1.35, 1.55, 1.75, 1.9, 2, 2.1, 2.2, 2.3, 2.5, 3, 3, 3.5, 3.5];
        var stepNo = STEP[_quality - 1];
        var blurX = Math.ceil(_blurX * stepNo * scale * devicePixelRatio);
        var blurY = Math.ceil(_blurY * stepNo * scale * devicePixelRatio);

        var canvas = ctx.canvas;
        var width = Math.ceil(canvas.width + (blurX * 2) + 1);
        var height = Math.ceil(canvas.height + (blurY * 2) + 1);

        var blurCanvas = cacheStore.getCanvas();
        blurCanvas.width = width;
        blurCanvas.height = height;
        var blurCtx = blurCanvas.getContext('2d');
        var offsetX = blurX;
        var offsetY = blurY;

        blurCtx._offsetX = blurX + ctx._offsetX;
        blurCtx._offsetY = blurY + ctx._offsetY;
        blurCtx.drawImage(canvas, offsetX, offsetY);

        var imgData = blurCtx.getImageData(0, 0, width, height);
        var px = imgData.data;

        var radiusX = (offsetX) >> 1;
        var radiusY = (offsetY) >> 1;

        var MUL = [1, 171, 205, 293, 57, 373, 79, 137, 241, 27, 391, 357, 41, 19, 283, 265, 497, 469, 443, 421, 25, 191, 365, 349, 335, 161, 155, 149, 9, 278, 269, 261, 505, 245, 475, 231, 449, 437, 213, 415, 405, 395, 193, 377, 369, 361, 353, 345, 169, 331, 325, 319, 313, 307, 301, 37, 145, 285, 281, 69, 271, 267, 263, 259, 509, 501, 493, 243, 479, 118, 465, 459, 113, 446, 55, 435, 429, 423, 209, 413, 51, 403, 199, 393, 97, 3, 379, 375, 371, 367, 363, 359, 355, 351, 347, 43, 85, 337, 333, 165, 327, 323, 5, 317, 157, 311, 77, 305, 303, 75, 297, 294, 73, 289, 287, 71, 141, 279, 277, 275, 68, 135, 67, 133, 33, 262, 260, 129, 511, 507, 503, 499, 495, 491, 61, 121, 481, 477, 237, 235, 467, 232, 115, 457, 227, 451, 7, 445, 221, 439, 218, 433, 215, 427, 425, 211, 419, 417, 207, 411, 409, 203, 202, 401, 399, 396, 197, 49, 389, 387, 385, 383, 95, 189, 47, 187, 93, 185, 23, 183, 91, 181, 45, 179, 89, 177, 11, 175, 87, 173, 345, 343, 341, 339, 337, 21, 167, 83, 331, 329, 327, 163, 81, 323, 321, 319, 159, 79, 315, 313, 39, 155, 309, 307, 153, 305, 303, 151, 75, 299, 149, 37, 295, 147, 73, 291, 145, 289, 287, 143, 285, 71, 141, 281, 35, 279, 139, 69, 275, 137, 273, 17, 271, 135, 269, 267, 133, 265, 33, 263, 131, 261, 130, 259, 129, 257, 1];

        var SHG = [0, 9, 10, 11, 9, 12, 10, 11, 12, 9, 13, 13, 10, 9, 13, 13, 14, 14, 14, 14, 10, 13, 14, 14, 14, 13, 13, 13, 9, 14, 14, 14, 15, 14, 15, 14, 15, 15, 14, 15, 15, 15, 14, 15, 15, 15, 15, 15, 14, 15, 15, 15, 15, 15, 15, 12, 14, 15, 15, 13, 15, 15, 15, 15, 16, 16, 16, 15, 16, 14, 16, 16, 14, 16, 13, 16, 16, 16, 15, 16, 13, 16, 15, 16, 14, 9, 16, 16, 16, 16, 16, 16, 16, 16, 16, 13, 14, 16, 16, 15, 16, 16, 10, 16, 15, 16, 14, 16, 16, 14, 16, 16, 14, 16, 16, 14, 15, 16, 16, 16, 14, 15, 14, 15, 13, 16, 16, 15, 17, 17, 17, 17, 17, 17, 14, 15, 17, 17, 16, 16, 17, 16, 15, 17, 16, 17, 11, 17, 16, 17, 16, 17, 16, 17, 17, 16, 17, 17, 16, 17, 17, 16, 16, 17, 17, 17, 16, 14, 17, 17, 17, 17, 15, 16, 14, 16, 15, 16, 13, 16, 15, 16, 14, 16, 15, 16, 12, 16, 15, 16, 17, 17, 17, 17, 17, 13, 16, 15, 17, 17, 17, 16, 15, 17, 17, 17, 16, 15, 17, 17, 14, 16, 17, 17, 16, 17, 17, 16, 15, 17, 16, 14, 17, 16, 15, 17, 16, 17, 17, 16, 17, 15, 16, 17, 14, 17, 16, 15, 17, 16, 17, 13, 17, 16, 17, 17, 16, 17, 14, 17, 16, 17, 16, 17, 16, 17, 9];

        var mtx = MUL[radiusX];
        var stx = SHG[radiusX];
        var mty = MUL[radiusY];
        var sty = SHG[radiusY];

        var x = 0;
        var y = 0;
        var p = 0;
        var yp = 0;
        var yi = 0;
        var yw = 0;
        var r = 0;
        var g = 0;
        var b = 0;
        var a = 0;
        var pr = 0;
        var pg = 0;
        var pb = 0;
        var pa = 0;

        var divx = radiusX + radiusX + 1;
        var divy = radiusY + radiusY + 1;
        var w = imgData.width;
        var h = imgData.height;

        var w1 = w - 1;
        var h1 = h - 1;
        var rxp1 = radiusX + 1;
        var ryp1 = radiusY + 1;

        var ssx = {r: 0, b: 0, g: 0, a: 0};
        var sx = ssx as any;
        for (var i = 1; i < divx; i++) {
            sx = sx.n = {r: 0, b: 0, g: 0, a: 0};
        }
        sx.n = ssx;

        var ssy = {r: 0, b: 0, g: 0, a: 0} as any;
        var sy = ssy;
        for (i = 1; i < divy; i++) {
            sy = sy.n = {r: 0, b: 0, g: 0, a: 0};
        }
        sy.n = ssy;

        var si = null;
        while (_quality-- > 0) {

            yw = yi = 0;
            var ms = mtx | 0;
            var ss = stx | 0;
            for (y = h; --y > -1;) {
                pr = px[yi];
                pg = px[yi + 1];
                pb = px[yi + 2];
                pa = px[yi + 3];
                r = rxp1 * pr;
                g = rxp1 * pg;
                b = rxp1 * pb;
                a = rxp1 * pa;

                sx = ssx;

                for (i = rxp1; --i > -1;) {
                    sx.r = pr;
                    sx.g = pg;
                    sx.b = pb;
                    sx.a = pa;
                    sx = sx.n;
                }

                for (i = 1; i < rxp1; i++) {
                    p = (yi + ((w1 < i ? w1 : i) << 2)) | 0;
                    r += (sx.r = px[p]);
                    g += (sx.g = px[p + 1]);
                    b += (sx.b = px[p + 2]);
                    a += (sx.a = px[p + 3]);
                    sx = sx.n;
                }

                si = ssx;
                for (x = 0; x < w; x++) {
                    px[yi++] = (r * ms) >>> ss;
                    px[yi++] = (g * ms) >>> ss;
                    px[yi++] = (b * ms) >>> ss;
                    px[yi++] = (a * ms) >>> ss;

                    p = ((yw + ((p = x + radiusX + 1) < w1 ? p : w1)) << 2);

                    r -= si.r - (si.r = px[p]);
                    g -= si.g - (si.g = px[p + 1]);
                    b -= si.b - (si.b = px[p + 2]);
                    a -= si.a - (si.a = px[p + 3]);

                    si = si.n;

                }
                yw += w;
            }

            ms = mty;
            ss = sty;
            for (x = 0; x < w; x++) {
                yi = (x << 2) | 0;

                r = (ryp1 * (pr = px[yi])) | 0;
                g = (ryp1 * (pg = px[(yi + 1) | 0])) | 0;
                b = (ryp1 * (pb = px[(yi + 2) | 0])) | 0;
                a = (ryp1 * (pa = px[(yi + 3) | 0])) | 0;

                sy = ssy;
                for (i = 0; i < ryp1; i++) {
                    sy.r = pr;
                    sy.g = pg;
                    sy.b = pb;
                    sy.a = pa;
                    sy = sy.n;
                }

                yp = w;

                for (i = 1; i <= radiusY; i++) {
                    yi = (yp + x) << 2;

                    r += (sy.r = px[yi]);
                    g += (sy.g = px[yi + 1]);
                    b += (sy.b = px[yi + 2]);
                    a += (sy.a = px[yi + 3]);

                    sy = sy.n;
                    if (i < h1) {
                        yp += w;
                    }
                }

                yi = x;
                si = ssy;
                if (_quality > 0) {
                    for (y = 0; y < h; y++) {
                        p = yi << 2;
                        px[p + 3] = pa = (a * ms) >>> ss;
                        if (pa > 0) {
                            px[p] = ((r * ms) >>> ss );
                            px[p + 1] = ((g * ms) >>> ss);
                            px[p + 2] = ((b * ms) >>> ss);
                        } else {
                            px[p] = px[p + 1] = px[p + 2] = 0;
                        }

                        p = (x + (((p = y + ryp1) < h1 ? p : h1) * w)) << 2;

                        r -= si.r - (si.r = px[p]);
                        g -= si.g - (si.g = px[p + 1]);
                        b -= si.b - (si.b = px[p + 2]);
                        a -= si.a - (si.a = px[p + 3]);

                        si = si.n;

                        yi += w;
                    }
                } else {
                    for (y = 0; y < h; y++) {
                        p = yi << 2;
                        px[p + 3] = pa = (a * ms) >>> ss;
                        if (pa > 0) {
                            pa = 255 / pa;
                            px[p] = ((r * ms) >>> ss) * pa;
                            px[p + 1] = ((g * ms) >>> ss) * pa;
                            px[p + 2] = ((b * ms) >>> ss) * pa;
                        } else {
                            px[p] = px[p + 1] = px[p + 2] = 0;
                        }

                        p = (x + (((p = y + ryp1) < h1 ? p : h1) * w)) << 2;

                        r -= si.r - (si.r = px[p]);
                        g -= si.g - (si.g = px[p + 1]);
                        b -= si.b - (si.b = px[p + 2]);
                        a -= si.a - (si.a = px[p + 3]);

                        si = si.n;

                        yi += w;
                    }
                }
            }
        }

        blurCtx.putImageData(imgData, 0, 0);
        cacheStore.destroy(ctx);

        return blurCtx;
    }
}

export class DropShadowFilter extends BitmapFilter {
    readonly distance: number = 4;
    readonly angle: number = 45;
    readonly color: number = 0;
    readonly alpha: number = 1;
    readonly blurX: number = 4;
    readonly blurY: number = 4;
    readonly strength: number = 1;
    readonly quality: number = 1;
    readonly inner: boolean = false;
    readonly knockout: boolean = false;
    readonly hideObject: boolean = false;

    constructor(distance: number = 4,
                angle: any = 45,
                color: any = 0,
                alpha: any = 1,
                blurX: any = 4,
                blurY: any = 4,
                strength: any = 1,
                quality: any = 1,
                inner: any = false,
                knockout: any = false,
                hideObject: any = false)
    {
        super();

        if (!isNaN(distance))
            this.distance = distance;

        angle = +angle;
        if (!isNaN(angle) && 0 <= angle && 360 >= angle)
            this.angle = angle;

        color = this.toColorInt(color);
        if (!isNaN(color))
            this.color = color;

        alpha = +alpha;
        if (!isNaN(alpha) && 0 <= alpha && 1 >= alpha)
            this.alpha = alpha;

        blurX = blurX | 0;
        if (!isNaN(blurX) && 0 <= blurX && 255 >= blurX)
            this.blurX = blurX;

        blurY = blurY | 0;
        if (!isNaN(blurY) && 0 <= blurY && 255 >= blurY)
            this.blurY = blurY;

        strength = +strength;
        if (!isNaN(strength) && 0 <= strength && 255 >= strength)
            this.strength = strength;

        quality = quality | 0;
        if (!isNaN(quality) && 1 <= quality && 15 >= quality)
            this.quality = quality;

        if (typeof inner === 'boolean')
            this.inner = inner;

        if (typeof knockout === 'boolean')
            this.knockout = knockout;

        if (typeof hideObject === 'boolean')
            this.hideObject = hideObject;
    }

    clone(): DropShadowFilter {
        return new DropShadowFilter(this.distance, this.angle, this.color,
            this.alpha, this.blurX, this.blurY, this.strength, this.quality,
            this.inner, this.knockout, this.hideObject);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        var strength = this.strength;
        if (strength === 0) {
            return cache;
        }

        var quality = this.quality;
        var inner = this.inner;
        var r = this.angle * Math.PI / 180;
        var blurX = this.blurX;
        var blurY = this.blurY;

        // blur
        var blurFilter = new BlurFilter(blurX, blurY, quality);
        var ctx = blurFilter.render(cache, matrix, colorTransform, stage);

        // dropShadow
        var intColor = this.toColorInt(this.color);
        var filterColor = this.intToRGBA(intColor);
        var color = this.generateColorTransform(filterColor, colorTransform);
        ctx = this.coatOfColor(ctx, color, inner, strength);

        // synthesis
        var cacheOffsetX = cache._offsetX;
        var cacheOffsetY = cache._offsetY;
        var _offsetX = ctx._offsetX;
        var _offsetY = ctx._offsetY;

        var canvas = ctx.canvas;
        var synCanvas = cacheStore.getCanvas();
        var width = canvas.width + cacheOffsetX;
        var height = canvas.height + cacheOffsetY;
        var ox = 0;
        var oy = 0;
        var dx = 0;
        var dy = 0;

        var distance = this.distance;
        var scale = stage.getScale();
        var x = Math.ceil(Math.cos(r) * distance * scale);
        var y = Math.ceil(Math.sin(r) * distance * scale);

        if (x !== 0) {
            width += Math.abs(x);
            if (x < 0) {
                ox -= x;
            } else {
                dx = x;
            }
        }

        if (y !== 0) {
            height += Math.abs(y);
            if (y < 0) {
                oy -= y;
            } else {
                dy = y;
            }
        }

        synCanvas.width = width;
        synCanvas.height = height;
        var synCtx = synCanvas.getContext('2d');
        synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
        synCtx.globalAlpha = this.alpha;
        if (strength < 1) {
            synCtx.globalAlpha *= strength;
        }

        var knockout = this.knockout;
        var hideObject = this.hideObject;
        synCtx.globalCompositeOperation = this.filterOperation(inner, knockout, hideObject);
        synCtx.drawImage(canvas, cacheOffsetX + dx, cacheOffsetY + dy);

        synCtx._offsetX = cacheOffsetX + _offsetX;
        synCtx._offsetY = cacheOffsetY + _offsetY;

        cacheStore.destroy(ctx);

        return synCtx;
    }
}

export class GlowFilter extends BitmapFilter {
    readonly color: number = 0xFF0000;
    readonly alpha: number = 1;
    readonly blurX: number = 6;
    readonly blurY: number = 6;
    readonly strength: number = 2;
    readonly quality: number = 1;
    readonly inner: boolean = false;
    readonly knockout: boolean = false;

    constructor(color: any = 0xFF0000,
                alpha: any = 1,
                blurX: any = 6,
                blurY: any = 6,
                strength: any = 2,
                quality: any = 1,
                inner: boolean = false,
                knockout: boolean = false)
    {
        super();

        color = this.toColorInt(color);
        if (!isNaN(color))
            this.color = color;

        alpha = +alpha;
        if (!isNaN(alpha) && 0 <= alpha && 1 >= alpha)
            this.alpha = alpha;

        blurX = blurX | 0;
        if (!isNaN(blurX) && 0 <= blurX && 255 >= blurX)
            this.blurX = blurX;

        blurY = blurY | 0;
        if (!isNaN(blurY) && 0 <= blurY && 255 >= blurY)
            this.blurY = blurY;

        strength = +strength;
        if (!isNaN(strength) && 0 <= strength && 255 >= strength)
            this.strength = strength;

        quality = quality | 0;
        if (!isNaN(quality) && 1 <= quality && 15 >= quality)
            this.quality = quality;

        if (typeof inner === 'boolean')
            this.inner = inner;

        if (typeof knockout === 'boolean')
            this.knockout = knockout;
    }

    clone(): GlowFilter {
        return new GlowFilter(this.color, this.alpha, this.blurX, this.blurY,
            this.strength, this.quality, this.inner, this.knockout);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        var strength = this.strength;
        if (strength === 0) {
            return cache;
        }

        var inner = this.inner;
        var blurX = this.blurX;
        var blurY = this.blurY;

        var blurFilter = new BlurFilter(blurX, blurY, this.quality);
        var ctx = blurFilter.render(cache, matrix, colorTransform, stage);

        var width = ctx.canvas.width + cache._offsetX;
        var height = ctx.canvas.height + cache._offsetY;

        var intColor = this.toColorInt(this.color);
        var filterColor = this.intToRGBA(intColor);
        var color = this.generateColorTransform(filterColor, colorTransform);
        ctx = this.coatOfColor(ctx, color, inner, strength);

        var synCanvas = cacheStore.getCanvas();
        synCanvas.width = width;
        synCanvas.height = height;
        var synCtx = synCanvas.getContext('2d');

        synCtx.drawImage(cache.canvas, ctx._offsetX, ctx._offsetY);
        synCtx.globalAlpha = this.alpha;
        if (strength < 1) {
            synCtx.globalAlpha *= strength;
        }

        synCtx.globalCompositeOperation = this.filterOperation(this.inner, this.knockout);
        synCtx.drawImage(ctx.canvas, cache._offsetX, cache._offsetY);
        synCtx._offsetX = cache._offsetX + ctx._offsetX;
        synCtx._offsetY = cache._offsetY + ctx._offsetY;

        cacheStore.destroy(ctx);

        return synCtx;
    }
}

type BitmapFilterType = 'inner' | 'outer' | 'full';

function toBitmapFilterType(type: any): BitmapFilterType | undefined {
    switch (type) {
        case 'inner':
        case 'outer':
        case 'full':
            return type;
    }

    return undefined;
}

export class BevelFilter extends BitmapFilter {
    readonly distance: number = 4;
    readonly angle: number = 45;
    readonly highlightColor: number = 0xffffff;
    readonly highlightAlpha: number = 1;
    readonly shadowColor: number = 0x000000;
    readonly shadowAlpha: number = 1;
    readonly blurX: number = 4;
    readonly blurY: number = 4;
    readonly strength: number = 1;
    readonly quality: number = 1;
    readonly type: BitmapFilterType = 'inner';
    readonly knockout: boolean = false;

    constructor(distance: any = 4,
                angle: any = 45,
                highlightColor: any = 0xffffff,
                highlightAlpha: any = 1,
                shadowColor: any = 0x000000,
                shadowAlpha: any = 1,
                blurX: any = 4,
                blurY: any = 4,
                strength: any = 1,
                quality: any = 1,
                type: any = 'inner',
                knockout: any = false)
    {
        super();

        distance = distance | 0;
        if (!isNaN(distance))
            this.distance = distance;

        angle = +angle;
        if (!isNaN(angle) && 0 <= angle && 360 >= angle)
            this.angle = angle;

        highlightColor = this.toColorInt(highlightColor);
        if (!isNaN(highlightColor))
            this.highlightColor = highlightColor;

        highlightAlpha = +highlightAlpha;
        if (!isNaN(highlightAlpha) && 0 <= highlightAlpha && 1 >= highlightAlpha)
            this.highlightAlpha = highlightAlpha;

        shadowColor = this.toColorInt(shadowColor);
        if (!isNaN(shadowColor))
            this.shadowColor = shadowColor;

        shadowAlpha = +shadowAlpha;
        if (!isNaN(shadowAlpha) && 0 <= shadowAlpha && 1 >= shadowAlpha)
            this.shadowAlpha = shadowAlpha;

        blurX = blurX | 0;
        if (!isNaN(blurX) && 0 <= blurX && 255 >= blurX)
            this.blurX = blurX;

        blurY = blurY | 0;
        if (!isNaN(blurY) && 0 <= blurY && 255 >= blurY)
            this.blurY = blurY;

        strength = +strength;
        if (!isNaN(strength) && 0 <= strength && 255 >= strength)
            this.strength = strength;

        quality = quality | 0;
        if (!isNaN(quality) && 1 <= quality && 15 >= quality)
            this.quality = quality;

        type = toBitmapFilterType(type);
        if (type)
            this.type = type;

        if (typeof knockout === 'boolean')
            this.knockout = knockout;
    }

    clone(): BevelFilter {
        return new BevelFilter(this.distance, this.angle, this.highlightColor,
            this.highlightAlpha, this.shadowColor, this.shadowAlpha,
            this.blurX, this.blurY, this.strength, this.quality,
            this.type, this.knockout);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        var distance = this.distance;
        var angle = this.angle;
        var shadowColor = this.shadowColor;
        var shadowAlpha = this.shadowAlpha;
        var highlightColor = this.highlightColor;
        var highlightAlpha = this.highlightAlpha;
        var blurX = this.blurX;
        var blurY = this.blurY;
        var strength = this.strength;
        var quality = this.quality;
        var knockout = this.knockout;
        var r = angle * Math.PI / 180;
        var filterColor, color;
        var type = this.type;

        // blur
        var blurFilter = new BlurFilter(blurX, blurY, quality);
        var ctx = blurFilter.render(cache, matrix, colorTransform, stage);
        var canvas = ctx.canvas;
        var _offsetX = ctx._offsetX;
        var _offsetY = ctx._offsetY;

        // shadow
        var shadowCanvas = cacheStore.getCanvas();
        shadowCanvas.width = canvas.width;
        shadowCanvas.height = canvas.height;
        var shadowCtx = shadowCanvas.getContext('2d');
        shadowCtx.drawImage(canvas, 0, 0);
        var intShadowColor = this.toColorInt(shadowColor);
        filterColor = this.intToRGBA(intShadowColor);
        color = this.generateColorTransform(filterColor, colorTransform);
        shadowCtx = this.coatOfColor(shadowCtx, color, false, strength);

        // shadow
        var highlightCanvas = cacheStore.getCanvas();
        highlightCanvas.width = canvas.width;
        highlightCanvas.height = canvas.height;
        var highlightCtx = highlightCanvas.getContext('2d');
        highlightCtx.drawImage(canvas, 0, 0);
        var intHighlightColor = this.toColorInt(highlightColor);
        filterColor = this.intToRGBA(intHighlightColor);
        color = this.generateColorTransform(filterColor, colorTransform);
        highlightCtx = this.coatOfColor(highlightCtx, color, false, strength);

        var isInner = (type === 'inner' || type === 'full');
        var isOuter = (type === 'outer' || type === 'full');

        var cacheOffsetX = cache._offsetX;
        var cacheOffsetY = cache._offsetY;
        var synCanvas = cacheStore.getCanvas();
        var width = canvas.width + cacheOffsetX;
        var height = canvas.height + cacheOffsetY;
        var ox = 0;
        var oy = 0;

        var scale = stage.getScale();
        var x = Math.ceil(Math.cos(r) * distance * scale);
        var y = Math.ceil(Math.sin(r) * distance * scale);

        if (x !== 0) {
            width += Math.abs(x);
            if (x < 0) {
                ox -= x;
            }
        }

        if (y !== 0) {
            height += Math.abs(y);
            if (y < 0) {
                oy -= y;
            }
        }

        synCanvas.width = width;
        synCanvas.height = height;
        var synCtx = synCanvas.getContext('2d');
        if (!knockout) {
            synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
        }
        if (strength < 1) {
            synCtx.globalAlpha *= strength;
        }
        synCtx._offsetX = cacheOffsetX + _offsetX;
        synCtx._offsetY = cacheOffsetY + _offsetY;

        var xorCanvas = cacheStore.getCanvas();
        xorCanvas.width = width + _offsetX;
        xorCanvas.height = height + _offsetY;
        var xorCtx = xorCanvas.getContext('2d');

        xorCtx.globalCompositeOperation = 'xor';
        xorCtx.globalAlpha = highlightAlpha;
        xorCtx.drawImage(highlightCtx.canvas, -x + ox, -y + oy);
        xorCtx.globalAlpha = shadowAlpha;
        xorCtx.drawImage(shadowCtx.canvas, x, y);

        var operation;
        if (isInner && isOuter) {
            operation = 'source-over';
        } else if (isInner) {
            synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
            operation = this.filterOperation(true, knockout);
        } else if (isOuter) {
            operation = 'destination-over';
        }

        synCtx.globalCompositeOperation = operation;
        synCtx.drawImage(xorCtx.canvas, 0, 0);
        if (!isInner && isOuter && knockout) {
            synCtx.globalCompositeOperation = 'destination-out';
            synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
        }

        cacheStore.destroy(ctx);
        cacheStore.destroy(highlightCtx);
        cacheStore.destroy(shadowCtx);
        cacheStore.destroy(xorCtx);

        return synCtx;
    }
}

export class GradientGlowFilter extends BitmapFilter {
    readonly distance: number = 4;
    readonly angle: number = 45;
    readonly colors?: number[];
    readonly alphas?: number[];
    readonly ratios?: number[];
    readonly blurX: number = 4;
    readonly blurY: number = 4;
    readonly strength: number = 1;
    readonly quality: number = 1;
    readonly type: BitmapFilterType = 'inner';
    readonly knockout: boolean = false;

    constructor(distance: any = 4,
                angle: any = 45,
                colors: any[] = undefined,
                alphas: any[] = undefined,
                ratios: any[] = undefined,
                blurX: any = 4,
                blurY: any = 4,
                strength: any = 1,
                quality: any = 1,
                type: any = 'inner',
                knockout: any = false)
    {
        super();

        distance = distance | 0;
        if (!isNaN(distance))
            this.distance = distance;

        angle = +angle;
        if (!isNaN(angle) && 0 <= angle && 360 >= angle) {
            this.angle = angle;
        }

        this.colors = colors;
        this.alphas = alphas;
        this.ratios = ratios;

        blurX = blurX | 0;
        if (!isNaN(blurX) && 0 <= blurX && 255 >= blurX)
            this.blurX = blurX;

        blurY = blurY | 0;
        if (!isNaN(blurY) && 0 <= blurY && 255 >= blurY)
            this.blurY = blurY;

        strength = +strength;
        if (!isNaN(strength) && 0 <= strength && 255 >= strength)
            this.strength = strength;

        quality = quality | 0;
        if (!isNaN(quality) && 1 <= quality && 15 >= quality)
            this.quality = quality;

        type = toBitmapFilterType(type);
        if (type)
            this.type = type;

        if (typeof knockout === 'boolean')
            this.knockout = knockout;
    }

    clone(): GradientGlowFilter {
        return new GradientGlowFilter(this.distance, this.angle, this.colors,
            this.alphas, this.ratios, this.blurX, this.blurY, this.strength,
            this.quality, this.type, this.knockout);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        var strength = this.strength;
        if (strength === 0) {
            return cache;
        }

        var type = this.type;
        var blurX = this.blurX;
        var blurY = this.blurY;
        var isInner = (type === 'inner' || type === 'full');
        var isOuter = (type === 'outer' || type === 'full');
        var knockout = this.knockout;
        var angle = this.angle;
        var r = angle * Math.PI / 180;

        var blurFilter = new BlurFilter(blurX, blurY, this.quality);
        var ctx = blurFilter.render(cache, matrix, colorTransform, stage);

        // synthesis
        var cacheOffsetX = cache._offsetX;
        var cacheOffsetY = cache._offsetY;
        var _offsetX = ctx._offsetX;
        var _offsetY = ctx._offsetY;

        var canvas = ctx.canvas;
        var synCanvas = cacheStore.getCanvas();
        var width = canvas.width + cacheOffsetX;
        var height = canvas.height + cacheOffsetY;
        var ox = 0;
        var oy = 0;
        var dx = 0;
        var dy = 0;

        var distance = this.distance;
        var scale = stage.getScale();
        var x = Math.ceil(Math.cos(r) * distance * scale);
        var y = Math.ceil(Math.sin(r) * distance * scale);

        if (x !== 0) {
            width += Math.abs(x);
            if (x < 0) {
                ox -= x;
            } else {
                dx = x;
            }
        }

        if (y !== 0) {
            height += Math.abs(y);
            if (y < 0) {
                oy -= y;
            } else {
                dy = y;
            }
        }

        synCanvas.width = width;
        synCanvas.height = height;
        var synCtx = synCanvas.getContext('2d');
        if (!knockout) {
            synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
        }

        if (strength < 1) {
            synCtx.globalAlpha *= strength;
        }

        var operation;
        if (isInner && isOuter) {
            operation = 'source-over';
        } else {
            if (knockout) {
                synCtx.drawImage(cache.canvas, _offsetX + ox, _offsetY + oy);
            }
            operation = this.filterOperation(isInner, knockout);
        }

        synCtx.globalCompositeOperation = operation;
        synCtx.drawImage(canvas, cacheOffsetX + dx, cacheOffsetY + dy);

        synCtx._offsetX = cacheOffsetX + _offsetX;
        synCtx._offsetY = cacheOffsetY + _offsetY;

        cacheStore.destroy(ctx);

        return synCtx;
    }
}

export class ConvolutionFilter extends BitmapFilter {
    readonly matrixX: number = 0;
    readonly matrixY: number = 0;
    readonly matrix?: number[];
    readonly divisor: number = 1.0;
    readonly bias: number = 0.0;
    readonly preserveAlpha: boolean = true;
    readonly clamp: boolean = true;
    readonly color: number = 0x000000;
    readonly alpha: number = 0.0;

    constructor(matrixX: any = 0,
                matrixY: any = 0,
                matrix?: any[],
                divisor: any = 1.0,
                bias: any = 0.0,
                preserveAlpha: any = true,
                clamp: any = true,
                color: any = 0x000000,
                alpha: any = 0.0)
    {
        super();

        this.matrixX = matrixX;
        this.matrixY = matrixY;
        this.matrix = matrix;
        this.divisor = divisor;
        this.bias = bias;
        this.preserveAlpha = preserveAlpha;
        this.clamp = clamp;
        this.color = color;
        this.alpha = alpha;
    }

    clone(): ConvolutionFilter {
        return new ConvolutionFilter(this.matrixX, this.matrixY, this.matrix,
            this.divisor, this.bias, this.preserveAlpha, this.clamp, this.color,
            this.alpha);
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        return cache;
    }
}

export class ColorMatrixFilter extends BitmapFilter {
    clone(): ColorMatrixFilter {
        return new ColorMatrixFilter();
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        return cache;
    }
}

export class GradientBevelFilter extends BitmapFilter {
    constructor(...args) {
        super();
    }

    clone(): GradientBevelFilter {
        return new GradientBevelFilter();
    }

    render(cache: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): CanvasRenderingContext2D
    {
        return cache;
    }
}
