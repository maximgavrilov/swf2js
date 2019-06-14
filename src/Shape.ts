/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { ClipEvent } from './EventDispatcher';
import { CLS, DisplayObject } from './DisplayObject';
import { Graphics } from './Graphics';
import { Stage } from './Stage';
import { StyleObj } from './VectorToCanvas';
import {
    Bounds, ColorTransform, Matrix,
    tmpContext,
    isAndroid, isAndroid4x, isChrome,
    LN2_2, LOG1P,
    colorCSS, generateColorTransform, multiplicationColor, multiplicationMatrix
} from './utils';

type LinearGradientParams = [ number, number, number, number ];

export class Shape extends DisplayObject {
    private bounds: Bounds = new Bounds();
    private data: StyleObj[] = [];
    private _graphics: Graphics = new Graphics();

    get graphics(): Graphics {
        return this.getGraphics();
    }

    addActions(): void {
    }

    putFrame(stage: Stage, clipEvent: ClipEvent): void {
        this.active = true;
        this.dispatchEvent(clipEvent, stage);
    }

    getGraphics(): Graphics {
        return this._graphics;
    }

    getData(): StyleObj[] {
        return this.data;
    }

    setData(data: StyleObj[]): void {
        this.data = data;
    }

    getBounds(matrix?: Matrix): Bounds {
        const isDraw = this.graphics.isDraw;

        if (matrix) {
            const bounds = this.bounds.transform(matrix);
            if (isDraw) {
                const gBounds = this.graphics.getBounds().transform(matrix);
                bounds.update(gBounds);
            }
            bounds.divide(20);
            return bounds;
        } else {
            const bounds = this.bounds.clone();
            if (isDraw) {
                const gBounds = this.graphics.getBounds();
                bounds.update(gBounds);
            }
            // no divide ?!
            return this.bounds;
        }
    }

    setBounds(bounds: Bounds): void {
        this.bounds = bounds.clone();
    }

    isMorphing(): boolean {
        const tagType = this.getTagType();
        return (tagType === 46 || tagType === 84);
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        stage.doneTags.unshift(this);

        // colorTransform
        const rColorTransform = multiplicationColor(colorTransform, this.getColorTransform());
        const isVisible = this.getVisible() && visible;
        const alpha = rColorTransform[3] + (rColorTransform[7] / 255);
        const stageClip = Boolean(stage.clipMc || stage.isClipDepth);

        if (!stageClip && (!alpha || !isVisible))
            return '';

        // matrix
        const m2 = multiplicationMatrix(matrix, this.getMatrix());

        // pre render
        const obj = this.preRender(ctx, m2, rColorTransform, stage, isVisible);
        let cacheKey = obj.cacheKey;

        // render
        const m3 = multiplicationMatrix(stage.getMatrix(), obj.preMatrix);
        const isClipDepth = this.isClipDepth || stageClip;
        if (isClipDepth) {
            if (m3[0]===0) {
                m3[0] = 0.00000000000001;
            }
            if (m3[3]===0) {
                m3[3] = 0.00000000000001;
            }
            ctx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);
            this.executeRender(ctx, Math.min(m3[0], m3[3]), rColorTransform, isClipDepth, stage);
        } else {
            let xScale = Math.sqrt(m3[0] * m3[0] + m3[1] * m3[1]);
            let yScale = Math.sqrt(m3[2] * m3[2] + m3[3] * m3[3]);
            xScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(xScale) / LN2_2 - LOG1P));
            yScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(yScale) / LN2_2 - LOG1P));

            const { xMin, yMin, xMax, yMax } = this.getBounds();

            const W = Math.abs(Math.ceil((xMax - xMin) * xScale));
            const H = Math.abs(Math.ceil((yMax - yMin) * yScale));

            if (W <= 0 || H <= 0)
                return cacheKey;

            const swfId = this.getStage().swftag.swfId;
            let cacheId = swfId + '_' + this.getCharacterId();
            if (this.isMorphing())
                cacheId += "_" + this.getRatio();

            cacheKey = cacheStore.generateKey("Shape", cacheId, [xScale, yScale], rColorTransform);
            let cache = cacheStore.getCache(cacheKey);

            if (!cache && stage.getWidth() > W && stage.getHeight() > H) {
                const canvas = cacheStore.getCanvas();
                canvas.width = W;
                canvas.height = H;

                cache = canvas.getContext("2d");
                cache.setTransform(xScale, 0, 0, yScale, -xMin * xScale, -yMin * yScale);
                cache = this.executeRender(
                    cache, Math.min(xScale, yScale), rColorTransform, isClipDepth, stage
                );

                cacheStore.setCache(cacheKey, cache);
            }

            if (cache) {
                const canvas = cache.canvas;
                const sMatrix: Matrix = [1 / xScale, 0, 0, 1 / yScale, xMin, yMin];
                const m4 = multiplicationMatrix(m3, sMatrix);
                obj.preCtx.setTransform(m4[0],m4[1],m4[2],m4[3],m4[4],m4[5]);
                if (isAndroid4x && !isChrome) {
                    obj.preCtx.fillStyle = stage.context.createPattern(cache.canvas, "no-repeat");
                    obj.preCtx.fillRect(0, 0, W, H);
                } else {
                    obj.preCtx.drawImage(canvas, 0, 0, W, H);
                    window.drawCall && window.drawCall(canvas);
                }
            } else {
                obj.preCtx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);
                this.executeRender(obj.preCtx, Math.min(m3[0], m3[3]), rColorTransform, isClipDepth, stage);
            }
        }

        // post render
        cacheKey += "_" + m3[4] + "_" + m3[5];
        if (obj.isFilter || obj.isBlend) {
            obj.cacheKey = cacheKey;
            this.postRender(ctx, matrix, rColorTransform, stage, obj);
        }

        return cacheKey;
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        var _this = this;
        var m2 = multiplicationMatrix(matrix, _this.getMatrix());

        var graphics = _this.graphics;
        if (graphics.isDraw) {
            return graphics.renderHitTest(ctx, m2, stage, x, y);
        }

        if (!_this.getData()) {
            return false;
        }

        var m3 = multiplicationMatrix(stage.getMatrix(), m2);
        ctx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);

        var minScale = Math.min(m3[0], m3[3]);
        var shapes = _this.getData();
        var length = shapes.length;
        var hit = false;
        for (var idx = 0; idx < length; idx++) {
            var data = shapes[idx];
            var obj = data.obj;
            var isStroke = (obj.Width !== undefined);

            ctx.beginPath();
            var cmd = data.cmd;
            cmd(ctx);

            if (isStroke) {
                ctx.lineWidth = Math.max(obj.Width, 1 / minScale);
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
            }

            hit = ctx.isPointInPath(x, y);
            if (hit) {
                return hit;
            }

            if ("isPointInStroke" in ctx) {
                hit = ctx.isPointInStroke(x, y);
                if (hit) {
                    return hit;
                }
            }
        }

        return hit;
    };

    private executeRender(ctx: CanvasRenderingContext2D,
                          minScale: number,
                          colorTransform: ColorTransform,
                          isClipDepth: boolean,
                          stage: Stage): CanvasRenderingContext2D
    {
        const shapes = this.getData();
        if (!shapes)
            return ctx;

        const stageClip = stage.clipMc || stage.isClipDepth;
        let canvas;
        for (const { obj, cmd } of shapes) {
            const styleObj = obj.HasFillFlag ? obj.FillType : obj;
            const isStroke = (obj.Width !== undefined);

            if (isClipDepth) {
                if (isStroke)
                    continue;

                cmd(ctx);
                continue;
            }

            ctx.beginPath();
            cmd(ctx);

            const styleType = styleObj.type;
            switch (styleType) {
                case 0x00: {
                    const color = generateColorTransform(styleObj.Color, colorTransform);
                    const css = colorCSS(color);
                    if (isStroke) {
                        ctx.strokeStyle = css;
                        ctx.lineWidth = Math.max(obj.Width, 1 / minScale);
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = css;
                        ctx.fill();
                    }

                    break;
                }

                // gradient
                case 0x10:
                case 0x12:
                case 0x13: {
                    const m = styleObj.gradientMatrix;
                    let css;
                    if (styleType !== 0x10) {
                        ctx.save();
                        ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
                        css = ctx.createRadialGradient(0, 0, 0, 0, 0, 16384);
                    } else {
                        const xy = this.linearGradientXY(m);
                        if (!isNaN(xy[0]) && !isNaN(xy[1])) {
                            css = ctx.createLinearGradient(xy[0], xy[1], xy[2], xy[3]);
                        } else {
                            // MAX: something better for hidden outside gradients?
                            css = ctx.createLinearGradient(0, 0, 0, 0);
                        }
                    }

                    const records = styleObj.gradient.GradientRecords;
                    for (const record of records) {
                        const color = generateColorTransform(record.Color, colorTransform);
                        css.addColorStop(record.Ratio, colorCSS(color));
                    }

                    if (isStroke) {
                        ctx.strokeStyle = css;
                        ctx.lineWidth = Math.max(obj.Width, 1 / minScale);
                        ctx.lineCap = "round";
                        ctx.lineJoin = "round";
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = css;
                        ctx.fill();
                    }

                    if (styleType !== 0x10)
                        ctx.restore();

                    break;
                }

                // bitmap
                case 0x40:
                case 0x41:
                case 0x42:
                case 0x43: {
                    const loadStage = this.getStage();
                    const bitmapId = styleObj.bitmapId;
                    const bMatrix = styleObj.bitmapMatrix;
                    const repeat = (styleType === 0x40 || styleType === 0x42) ? "repeat" : "no-repeat";
                    const bitmapCacheKey = cacheStore.generateKey(
                        "Bitmap",
                        bitmapId + "_" + loadStage.swftag.swfId + "_" + repeat,
                        undefined,
                        colorTransform
                    );

                    let image = cacheStore.getCache(bitmapCacheKey);
                    if (!image) {
                        image = loadStage.swftag.getCharacter<CanvasRenderingContext2D>(bitmapId);

                        if (!image)
                            break;

                        if (colorTransform[0] === 1 &&
                            colorTransform[1] === 1 &&
                            colorTransform[2] === 1 &&
                            !colorTransform[4] &&
                            !colorTransform[5] &&
                            !colorTransform[6]
                        ) {
                            ctx.globalAlpha = Math.max(0, Math.min((255 * colorTransform[3]) + colorTransform[7], 255)) / 255;
                        } else {
                            const imgCanvas = image.canvas;
                            const width = imgCanvas.width;
                            const height = imgCanvas.height;
                            if (width > 0 && height > 0) {
                                canvas = cacheStore.getCanvas();
                                canvas.width = width;
                                canvas.height = height;

                                const imageContext = canvas.getContext("2d");
                                imageContext.drawImage(image.canvas, 0, 0, width, height);
                                image = this.generateImageTransform(imageContext, colorTransform);
                                cacheStore.setCache(bitmapCacheKey, image);
                            }
                        }
                    }

                    if (image) {
                        ctx.save();

                        canvas = image.canvas;
                        const width = canvas.width;
                        const height = canvas.height;
                        if (width > 0 && height > 0) {
                            if (styleType === 0x41 || styleType === 0x43) {
                                ctx.clip();
                                ctx.transform(bMatrix[0], bMatrix[1], bMatrix[2], bMatrix[3], bMatrix[4], bMatrix[5]);
                                ctx.drawImage(canvas, 0, 0, width, height);
                            } else {
                                ctx.fillStyle = stage.context.createPattern(canvas, repeat);
                                ctx.transform(bMatrix[0], bMatrix[1], bMatrix[2], bMatrix[3], bMatrix[4], bMatrix[5]);
                                ctx.fill();
                            }
                        }
                        ctx.restore();
                    }

                    break;
                }
            }
        }

        if (isClipDepth && !stageClip) {
            ctx.clip();

            if (isAndroid && isChrome) {
                if (!canvas) {
                    canvas = ctx.canvas;
                }

                const cWidth = canvas.width;
                const cHeight = canvas.height;

                const tmpCanvas = tmpContext.canvas;
                canvas = ctx.canvas;
                tmpCanvas.width = cWidth;
                tmpCanvas.height = cHeight;
                tmpContext.drawImage(canvas, 0, 0);

                ctx.save();
                ctx.setTransform(1, 0, 0, 1, 0, 0);
                ctx.beginPath();
                ctx.clearRect(0, 0, cWidth + 1, cHeight + 1);
                ctx.drawImage(tmpCanvas, 0, 0);
                ctx.restore();

                tmpContext.setTransform(1,0,0,1,0,0);
                tmpContext.clearRect(0, 0, cWidth + 1, cHeight + 1);
            }
        }

        const resetCss = "rgba(0,0,0,1)";
        ctx.strokeStyle = resetCss;
        ctx.fillStyle = resetCss;
        ctx.globalAlpha = 1;

        return ctx;
    }

    private generateImageTransform(ctx: CanvasRenderingContext2D,
                                   color: ColorTransform): CanvasRenderingContext2D
    {
        var canvas = ctx.canvas;
        var width = canvas.width;
        var height = canvas.height;
        var imgData = ctx.getImageData(0, 0, width, height);
        var pxData = imgData.data;
        var idx = 0;
        var RedMultiTerm = color[0];
        var GreenMultiTerm = color[1];
        var BlueMultiTerm = color[2];
        var AlphaMultiTerm = color[3];
        var RedAddTerm = color[4];
        var GreenAddTerm = color[5];
        var BlueAddTerm = color[6];
        var AlphaAddTerm = color[7];
        var length = width * height;
        if (length > 0) {
            while (length--) {
                var R = pxData[idx++];
                var G = pxData[idx++];
                var B = pxData[idx++];
                var A = pxData[idx++];
                pxData[idx - 4] = Math.max(0, Math.min((R * RedMultiTerm) + RedAddTerm, 255))|0;
                pxData[idx - 3] = Math.max(0, Math.min((G * GreenMultiTerm) + GreenAddTerm, 255))|0;
                pxData[idx - 2] = Math.max(0, Math.min((B * BlueMultiTerm) + BlueAddTerm, 255))|0;
                pxData[idx - 1] = Math.max(0, Math.min((A * AlphaMultiTerm) + AlphaAddTerm, 255));
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return ctx;
    }

    private linearGradientXY(m: Matrix): LinearGradientParams {
        var x0 = -16384 * m[0] - 16384 * m[2] + m[4];
        var x1 =  16384 * m[0] - 16384 * m[2] + m[4];
        var x2 = -16384 * m[0] + 16384 * m[2] + m[4];
        var y0 = -16384 * m[1] - 16384 * m[3] + m[5];
        var y1 =  16384 * m[1] - 16384 * m[3] + m[5];
        var y2 = -16384 * m[1] + 16384 * m[3] + m[5];
        var vx2 = x2 - x0;
        var vy2 = y2 - y0;
        var r1 = Math.sqrt(vx2 * vx2 + vy2 * vy2);
        vx2 /= r1;
        vy2 /= r1;
        var r2 = (x1 - x0) * vx2 + (y1 - y0) * vy2;
        return [x0 + r2 * vx2, y0 + r2 * vy2, x1, y1];
    }
}

CLS.Shape = Shape;
