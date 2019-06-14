/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { CLS, DisplayObject } from './DisplayObject';
import { StyleObj, vtc } from './VectorToCanvas';
import { Stage } from './Stage';
import {
    Bounds, Color, ColorTransform, Matrix,
    isAndroid4x, isChrome,
    LN2_2, LOG1P,
    generateColorTransform, multiplicationColor, multiplicationMatrix
} from './utils';

export class TextRecord {
    private color!: Color;
    private matrix!: Matrix;
    private data!: StyleObj[];

    getColor(): Color {
        return this.color;
    }

    setColor(color: Color): void {
        this.color = color;
    }

    getMatrix(): Matrix {
        return this.matrix;
    }

    setMatrix(matrix: Matrix): void {
        this.matrix = matrix;
    }

    getData(): StyleObj[] {
        return this.data;
    }

    setData(data: StyleObj[]): void {
        this.data = data;
    }
}

export class StaticText extends DisplayObject {
    private records: TextRecord[] = [];
    private bounds!: Bounds;

    getBounds(matrix?: Matrix): Bounds {
        if (matrix) {
            const bounds = this.bounds.transform(matrix);
            bounds.divide(20);
            return bounds;
        } else {
            return this.bounds;
        }
    }

    setBounds(bounds: Bounds): void {
        this.bounds = bounds;
    }

    getRecords(): TextRecord[] {
        return this.records;
    }

    addRecord(record: TextRecord): void {
        this.records.push(record);
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        var _this = this;

        // colorTransform
        var rColorTransform = multiplicationColor(colorTransform, _this.getColorTransform());
        var isVisible = _this.getVisible() && visible;
        var alpha = rColorTransform[3] + (rColorTransform[7] / 255);
        var stageClip = stage.clipMc || stage.isClipDepth;
        if (!stageClip && (!alpha || !isVisible)) {
            return '0';
        }

        // matrix
        var m2 = multiplicationMatrix(matrix, _this.getMatrix());

        // pre render
        var obj = _this.preRender(ctx, m2, rColorTransform, stage, visible);
        var m3 = multiplicationMatrix(stage.getMatrix(), obj.preMatrix);
        var xScale = Math.sqrt(m3[0] * m3[0] + m3[1] * m3[1]);
        var yScale = Math.sqrt(m3[2] * m3[2] + m3[3] * m3[3]);
        xScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(xScale) / LN2_2 - LOG1P));
        yScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(yScale) / LN2_2 - LOG1P));

        // render
        var bounds = _this.getBounds();
        var xMax = bounds.xMax;
        var xMin = bounds.xMin;
        var yMax = bounds.yMax;
        var yMin = bounds.yMin;
        var W = Math.abs(Math.ceil((xMax - xMin) * xScale));
        var H = Math.abs(Math.ceil((yMax - yMin) * yScale));
        var isClipDepth = _this.isClipDepth || stageClip;
        if (W > 0 && H > 0) {
            var cacheId = '' + _this.getCharacterId();// + "_" + _this.getStage().getId();
            var cacheKey = cacheStore.generateKey("Text", cacheId, [xScale, yScale], rColorTransform);
            var cache = cacheStore.getCache(cacheKey);
            var canvas;
            if (!cache && !isClipDepth) {
                if (stage.getWidth() > W && stage.getHeight() > H) {
                    canvas = cacheStore.getCanvas();
                    canvas.width = W;
                    canvas.height = H;
                    cache = canvas.getContext("2d");
                    var cMatrix: Matrix = [xScale, 0, 0, yScale, -xMin * xScale, -yMin * yScale];
                    cache.setTransform(cMatrix[0],cMatrix[1],cMatrix[2],cMatrix[3],cMatrix[4],cMatrix[5]);
                    cache = _this.executeRender(cache, cMatrix, rColorTransform, false, false);
                    cacheStore.setCache(cacheKey, cache);
                }
            }
            if (cache) {
                canvas = cache.canvas;
                var m4 = multiplicationMatrix(m3, [1 / xScale, 0, 0, 1 / yScale, xMin, yMin]);
                ctx.setTransform(m4[0],m4[1],m4[2],m4[3],m4[4],m4[5]);
                if (isAndroid4x && !isChrome) {
                    ctx.fillStyle = stage.context.createPattern(cache.canvas, "no-repeat");
                    ctx.fillRect(0, 0, W, H);
                } else {
                    ctx.drawImage(canvas, 0, 0, W, H);
                }
            } else {
                ctx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);
                _this.executeRender(ctx, m3, rColorTransform, isClipDepth, stageClip);
            }

            cacheKey += "_" + m3[4] + "_" + m3[5];
            if (obj.isFilter || obj.isBlend) {
                obj.cacheKey = cacheKey;
                _this.postRender(ctx, matrix, rColorTransform, stage, obj);
            }

            return cacheKey;
        }

        return '';
    }

    private executeRender(ctx: CanvasRenderingContext2D,
                          matrix: Matrix,
                          colorTransform: ColorTransform,
                          isClipDepth: boolean,
                          stageClip: boolean): CanvasRenderingContext2D
    {
        var _this = this;
        var records = _this.getRecords();
        var length = records.length;
        if (!length) {
            return ctx;
        }

        for (var i = 0; i < length; i++) {
            var record = records[i];
            var shapes = record.getData();
            var shapeLength = shapes.length;
            if (!shapeLength) {
                continue;
            }

            var m2 = multiplicationMatrix(matrix, record.getMatrix());
            ctx.setTransform(m2[0],m2[1],m2[2],m2[3],m2[4],m2[5]);
            var color = record.getColor();
            color = generateColorTransform(color, colorTransform);
            ctx.fillStyle = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
            for (var idx = 0; idx < shapeLength; idx++) {
                var styleObj = shapes[idx];
                if (!isClipDepth) {
                    ctx.beginPath();
                    vtc.execute(styleObj.cache, ctx);
                    ctx.fill();
                } else {
                    vtc.execute(styleObj.cache, ctx);
                }
            }
        }

        if (isClipDepth && !stageClip) {
            ctx.clip();
        }

        ctx.globalAlpha = 1;
        return ctx;
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        var _this = this;
        var records = _this.getRecords();
        var length = records.length;
        if (!length) {
            return false;
        }

        var hit = false;
        var m2 = multiplicationMatrix(matrix, _this.getMatrix());
        var m3 = multiplicationMatrix(stage.getMatrix(), m2);
        for (var i = 0; i < length; i++) {
            var record = records[i];
            var shapes = record.getData();
            var shapeLength = shapes.length;
            if (!shapeLength) {
                continue;
            }

            var m4 = multiplicationMatrix(m3, record.getMatrix());
            ctx.setTransform(m4[0],m4[1],m4[2],m4[3],m4[4],m4[5]);
            for (var idx = 0; idx < shapeLength; idx++) {
                var styleObj = shapes[idx];
                ctx.beginPath();
                vtc.execute(styleObj.cache, ctx);

                hit = ctx.isPointInPath(x, y);
                if (hit) {
                    return hit;
                }
            }
        }

        return hit;
    }
}

CLS.StaticText = StaticText;
