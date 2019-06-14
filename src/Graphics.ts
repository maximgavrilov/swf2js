/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { Stage } from './Stage';
import { CAP, CMD, JOIN, Command, vtc } from './VectorToCanvas';
import {
    Bounds, Matrix, ColorTransform,
    isAndroid4x, isChrome,
    LN2_2, LOG1P,
    intToRGBA, multiplicationMatrix, toColorInt
} from './utils';

type TriangleCulling = 'negative' | 'none' | 'positive';

export class Graphics {
    public isDraw: boolean;

    private bounds: Bounds = new Bounds();
    public maxWidth: number;
    private cmd?: Command[];
    private isFillDraw: boolean;
    private isLineDraw: boolean;
    private cacheKey: string;
    private recodes: Command[];
    private lineRecodes: Command[];

    constructor() {
        this.clear();
    }

    clear(): this {
        this.bounds.clear();
        this.maxWidth = 0;
        this.cmd = null;
        this.isDraw = false;
        this.isFillDraw = false;
        this.isLineDraw = false;
        this.cacheKey = "";
        this.recodes = [];
        this.lineRecodes = [];
        return this;
    }

    getCacheKey(): string {
        return this.cacheKey;
    }

    addCacheKey(...args): void {
        this.cacheKey += args.join('_');
    }

    getBounds(): Bounds {
        return this.bounds;
    }

    setBounds(x: number, y: number): void {
        this.bounds.set(x, y);
    }

    beginFill(rgb: number | string, alpha: number): Graphics {
        rgb = toColorInt(rgb);
        alpha = +alpha;

        if (isNaN(alpha)) {
            alpha = 100;
        } else {
            alpha *= 100;
        }

        const color = intToRGBA(rgb, alpha);
        if (!this.isFillDraw)
            this.recodes.push([CMD.BEGIN_PATH]);

        this.recodes.push([CMD.FILL_STYLE, color.R, color.G, color.B, color.A]);

        this.addCacheKey(rgb, alpha);
        this.isFillDraw = true;
        this.isDraw = true;

        return this;
    }

    lineStyle(width: number = NaN,
              rgb: number = 0x000000,
              alpha: number = 1,
              pixelHinting: boolean = false,
              noScale: number = 0,
              capsStyle: CAP = CAP.ROUND,
              jointStyle: JOIN = JOIN.ROUND,
              miterLimit: number = 3): Graphics
    {
        width = +width;
        if (!isNaN(width)) {
            if (rgb === undefined) {
                rgb = 0;
            }
            rgb = rgb ? toColorInt(rgb) : 0;
            alpha = (+alpha) * 100;
            const color = intToRGBA(rgb, alpha);
            if (width < 0.5) {
                width += 0.2;
            }
            width *= 20;
            this.maxWidth = Math.max(this.maxWidth, width);

            if (this.isLineDraw)
                this.lineRecodes.push([CMD.STROKE]);
            this.lineRecodes.push([CMD.BEGIN_PATH]);
            this.lineRecodes.push([CMD.STROKE_STYLE, color.R, color.G, color.B, color.A]);
            this.lineRecodes.push([CMD.LINE_WIDTH, width]);
            this.lineRecodes.push([CMD.LINE_CAP, capsStyle]);
            this.lineRecodes.push([CMD.LINE_JOIN, jointStyle]);
            this.addCacheKey(rgb, alpha);
            this.isLineDraw = true;
            this.isDraw = true;
        } else if (this.isLineDraw) {
            this.isLineDraw = false;
            this.lineRecodes.push([CMD.STROKE]);

            for (const r of this.lineRecodes)
                this.recodes.push(r);
            this.lineRecodes = [];
        }
        return this;
    }

    moveTo(x: number, y: number): Graphics {
        x *= 20;
        y *= 20;

        if (this.isFillDraw)
            this.recodes.push([CMD.MOVE_TO, x, y]);

        if (this.isLineDraw)
            this.lineRecodes.push([CMD.MOVE_TO, x, y]);

        if (this.isFillDraw || this.isLineDraw) {
            this.setBounds(x, y);
            this.addCacheKey(x, y);
        }

        return this;
    }

    lineTo(x: number, y: number): Graphics {
        x *= 20;
        y *= 20;

        if (this.isFillDraw)
            this.recodes.push([CMD.LINE_TO, x, y]);

        if (this.isLineDraw)
            this.lineRecodes.push([CMD.LINE_TO, x, y]);

        if (this.isFillDraw || this.isLineDraw) {
            this.setBounds(x, y);
            this.addCacheKey(x, y);
        }

        return this;
    }

    curveTo(cx: number, cy: number, dx: number, dy: number): Graphics {
        cx *= 20;
        cy *= 20;
        dx *= 20;
        dy *= 20;

        if (this.isFillDraw)
            this.recodes.push([CMD.CURVE_TO, cx, cy, dx, dy]);

        if (this.isLineDraw)
            this.lineRecodes.push([CMD.CURVE_TO, cx, cy, dx, dy]);

        if (this.isFillDraw || this.isLineDraw) {
            this.setBounds(cx, cy);
            this.setBounds(dx, dy);
            this.addCacheKey(cx, cy, dx, dy);
        }

        return this;
    }

    cubicCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): Graphics {
        cp1x *= 20;
        cp1y *= 20;
        cp2x *= 20;
        cp2y *= 20;
        x *= 20;
        y *= 20;

        if (this.isFillDraw)
            this.recodes.push([CMD.CUBIC, cp1x, cp1y, cp2x, cp2y, x, y]);

        if (this.isLineDraw)
            this.lineRecodes.push([CMD.CUBIC, cp1x, cp1y, cp2x, cp2y, x, y]);

        if (this.isFillDraw || this.isLineDraw) {
            this.setBounds(x, y);
            this.setBounds(cp1x, cp1y);
            this.setBounds(cp2x, cp2y);
            this.addCacheKey(cp1x, cp1y, cp2x, cp2y, x, y);
        }

        return this;
    }

    drawCircle(x: number, y: number, radius: number): Graphics {
        x *= 20;
        y *= 20;
        radius *= 20;

        if (this.isFillDraw)
            this.recodes.push([CMD.ARC, x, y, radius]);

        if (this.isLineDraw)
            this.lineRecodes.push([CMD.ARC, x, y, radius]);

        if (this.isFillDraw || this.isLineDraw) {
            this.setBounds(x - radius, y - radius);
            this.setBounds(x + radius, y + radius);
            this.addCacheKey(x, y, radius);
        }

        return this;
    }

    drawEllipse(x: number, y: number, width: number, height: number): Graphics {
        const hw = width / 2;
        const hh = height / 2;
        const x0 = x + hw;
        const x1 = x + width;
        const y0 = y + hh;
        const y1 = y + height;
        const cw = 4 / 3 * (Math.SQRT2 - 1) * hw;
        const ch = 4 / 3 * (Math.SQRT2 - 1) * hh;

        this.moveTo(x0, y);
        this.cubicCurveTo(x0 + cw, y, x1, y0 - ch, x1, y0);
        this.cubicCurveTo(x1, y0 + ch, x0 + cw, y1, x0, y1);
        this.cubicCurveTo(x0 - cw, y1, x, y0 + ch, x, y0);
        this.cubicCurveTo(x, y0 - ch, x0 - cw, y, x0, y);

        return this;
    }

    drawRect(x: number, y: number, width: number, height: number): Graphics {
        this.moveTo(x, y);
        this.lineTo(x + width, y);
        this.lineTo(x + width, y + height);
        this.lineTo(x, y + height);
        this.lineTo(x, y);

        return this;
    }

    drawRoundRect(x: number, y: number, width: number, height: number, ellipseWidth: number, ellipseHeight: number = ellipseWidth): Graphics {
        const hew = ellipseWidth / 2;
        const heh = ellipseHeight / 2;
        const cw = 4 / 3 * (Math.SQRT2 - 1) * hew;
        const ch = 4 / 3 * (Math.SQRT2 - 1) * heh;

        const dx0 = x + hew;
        const dx1 = x + width;
        const dx2 = dx1 - hew;

        const dy0 = y + heh;
        const dy1 = y + height;
        const dy2 = dy1 - heh;

        this.moveTo(dx0, y);
        this.lineTo(dx2, y);
        this.cubicCurveTo(dx2 + cw, y, dx1, dy0 - ch, dx1, dy0);
        this.lineTo(dx1, dy2);
        this.cubicCurveTo(dx1, dy2 + ch, dx2 + cw, dy1, dx2, dy1);
        this.lineTo(dx0, dy1);
        this.cubicCurveTo(dx0 - cw, dy1, x, dy2 + ch, x, dy2);
        this.lineTo(x, dy0);
        this.cubicCurveTo(x, dy0 - ch, dx0 - cw, y, dx0, y);

        return this;
    }

    drawTriangles(vertices: number[], indices?: number[], uvtData?: number[], culling: TriangleCulling = 'none'): Graphics {
        // TODO: uvtData, culling

        let length = vertices.length;
        if (length && length % 3 === 0) {
            var i = 0;
            var count = 0;
            if (indices) {
                length = indices.length;
                if (length && length % 3 === 0) {
                    for (i = 0; i < length; i++) {
                        var idx = indices[i];
                        if (count === 0) {
                            this.moveTo(vertices[idx], vertices[idx + 1]);
                        } else {
                            this.lineTo(vertices[idx], vertices[idx + 1]);
                        }
                        count++;
                        if (count % 3 === 0) {
                            count = 0;
                        }
                    }
                }
            } else {
                for (i = 0; i < length; i++) {
                    if (count === 0) {
                        this.moveTo(vertices[i++], vertices[i]);
                    } else {
                        this.lineTo(vertices[i++], vertices[i]);
                    }
                    count++;
                    if (count % 3 === 0) {
                        count = 0;
                    }
                }
            }
        }

        return this;
    }

    endFill(): Graphics {
        if (this.isFillDraw)
            this.recodes.push([CMD.FILL]);
        this.isFillDraw = false;
        return this;
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage): string
    {
        var cacheKey = "";
        var alpha = colorTransform[3] + (colorTransform[7] / 255);
        if (!alpha) {
            return cacheKey;
        }

        var rMatrix = multiplicationMatrix(stage.getMatrix(), matrix);
        var xScale = Math.sqrt(rMatrix[0] * rMatrix[0] + rMatrix[1] * rMatrix[1]);
        var yScale = Math.sqrt(rMatrix[2] * rMatrix[2] + rMatrix[3] * rMatrix[3]);
        xScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(xScale) / LN2_2 - LOG1P));
        yScale = Math.pow(Math.SQRT2, Math.ceil(Math.log(yScale) / LN2_2 - LOG1P));

        var maxWidth = this.maxWidth;
        var halfWidth = maxWidth / 2;
        var bounds = this.getBounds();
        var xMax = bounds.xMax;
        var xMin = bounds.xMin;
        var yMax = bounds.yMax;
        var yMin = bounds.yMin;

        var W = Math.abs(Math.ceil((xMax - xMin + maxWidth) * xScale));
        var H = Math.abs(Math.ceil((yMax - yMin + maxWidth) * yScale));
        if (W <= 0 || H <= 0) {
            return cacheKey;
        }

        var cache;
        var canvas;
        var isClipDepth = stage.clipMc || stage.isClipDepth;
        if (!isClipDepth) {
            cacheKey = cacheStore.generateKey("Graphics", '0', [xScale, yScale], colorTransform);
            cacheKey += this.getCacheKey();
            cache = cacheStore.getCache(cacheKey);
            if (!cache && stage.getWidth() > W && stage.getHeight() > H) {
                canvas = cacheStore.getCanvas();
                canvas.width = W;
                canvas.height = H;
                cache = canvas.getContext("2d");
                var cMatrix = [xScale, 0, 0, yScale, (-xMin + halfWidth) * xScale, (-yMin + halfWidth) * yScale];
                cache.setTransform(cMatrix[0], cMatrix[1], cMatrix[2], cMatrix[3], cMatrix[4], cMatrix[5]);
                cache = this.executeRender(cache, Math.min(xScale, yScale), colorTransform, false);
                cacheStore.setCache(cacheKey, cache);
            }
        }

        if (cache) {
            canvas = cache.canvas;
            const sMatrix: Matrix = [1 / xScale, 0, 0, 1 / yScale, xMin - halfWidth, yMin - halfWidth];
            var m2 = multiplicationMatrix(rMatrix, sMatrix);
            ctx.setTransform(m2[0],m2[1],m2[2],m2[3],m2[4],m2[5]);
            if (isAndroid4x && !isChrome) {
                ctx.fillStyle = stage.context.createPattern(cache.canvas, "no-repeat");
                ctx.fillRect(0, 0, W, H);
            } else {
                ctx.drawImage(canvas, 0, 0, W, H);
            }
        } else {
            ctx.setTransform(rMatrix[0],rMatrix[1],rMatrix[2],rMatrix[3],rMatrix[4],rMatrix[5]);
            this.executeRender(ctx, Math.min(rMatrix[0], rMatrix[3]), colorTransform, isClipDepth);
        }

        return cacheKey + "_" + rMatrix[4] + "_" + rMatrix[5];
    }

    executeRender(ctx: CanvasRenderingContext2D,
                  minScale: number,
                  colorTransform: ColorTransform,
                  isClip: boolean): CanvasRenderingContext2D
    {
        if (this.recodes.length || this.lineRecodes) {
            if (!this.cmd) {
                for (const recode of this.lineRecodes)
                    this.recodes.push(recode);

                this.cmd = this.recodes;
            }

            ctx.beginPath();
            vtc.execute(this.cmd, ctx, colorTransform, isClip);
            if (isClip) {
                ctx.clip();
            } else {
                if (this.isFillDraw) {
                    ctx.fill();
                }
                if (this.isLineDraw) {
                    ctx.stroke();
                }
            }
        }

        var resetCss = "rgba(0,0,0,1)";
        ctx.strokeStyle = resetCss;
        ctx.fillStyle = resetCss;
        ctx.globalAlpha = 1;

        return ctx;
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        if (!this.cmd)
            this.cmd = this.recodes;

        var rMatrix = multiplicationMatrix(stage.getMatrix(), matrix);
        ctx.setTransform(rMatrix[0],rMatrix[1],rMatrix[2],rMatrix[3],rMatrix[4],rMatrix[5]);

        ctx.beginPath();
        vtc.execute(this.cmd, ctx, [1,1,1,1,0,0,0,0], true);

        var hit = ctx.isPointInPath(x, y);
        if (hit) {
            return hit;
        }

        if ("isPointInStroke" in ctx) {
            hit = ctx.isPointInStroke(x, y);
            if (hit) {
                return hit;
            }
        }

        return hit;
    }
}

