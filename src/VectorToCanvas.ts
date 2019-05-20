/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */


function cloneDeep(src: any, obj: any): void {
    for (const prop in src) {
        if (!src.hasOwnProperty(prop)) {
            continue;
        }

        const value = src[prop];
        if (value instanceof Array) {
            obj[prop] = [];
            cloneDeep(value, obj[prop]);
        } else if (value instanceof Object) {
            obj[prop] = {};
            cloneDeep(value, obj[prop]);
        } else {
            obj[prop] = value;
        }
    }
}

export class VectorToCanvas {
    clone(src: any): any {
        const obj: any = {};
        cloneDeep(src, obj);
        return obj;
    }

    convert(shapes: any, isMorph: boolean = false): any[] {
        var lineStyles = shapes.lineStyles.lineStyles;
        var fillStyles = shapes.fillStyles.fillStyles;
        var records = shapes.ShapeRecords;
        var idx = 0;
        var obj = {} as any;
        var cache = [];
        var AnchorX = 0;
        var AnchorY = 0;
        var MoveX = 0;
        var MoveY = 0;
        var LineX = 0;
        var LineY = 0;
        var FillStyle0 = 0;
        var FillStyle1 = 0;
        var LineStyle = 0;
        var fills0 = [];
        var fills1 = [];
        var lines = [];
        var stack = [];
        var depth = 0;
        var length = records.length;
        for (var i = 0; i < length; i++) {
            var record = records[i];
            if (!record) {
                stack = this.setStack(stack, this.fillMerge(fills0, fills1, isMorph));
                stack = this.setStack(stack, lines);
                break;
            }

            if (record.isChange) {
                depth++;
                if (record.StateNewStyles) {
                    AnchorX = 0;
                    AnchorY = 0;
                    stack = this.setStack(stack, this.fillMerge(fills0, fills1, isMorph));
                    stack = this.setStack(stack, lines);
                    fills0 = [];
                    fills1 = [];
                    lines = [];

                    if (record.NumFillBits) {
                        fillStyles = record.FillStyles.fillStyles;
                    }
                    if (record.NumLineBits) {
                        lineStyles = record.LineStyles.lineStyles;
                    }
                }

                MoveX = AnchorX;
                MoveY = AnchorY;
                if (record.StateMoveTo) {
                    MoveX = record.MoveX;
                    MoveY = record.MoveY;
                }
                LineX = MoveX;
                LineY = MoveY;

                if (record.StateFillStyle0) {
                    FillStyle0 = record.FillStyle0;
                }
                if (record.StateFillStyle1) {
                    FillStyle1 = record.FillStyle1;
                }
                if (record.StateLineStyle) {
                    LineStyle = record.LineStyle;
                }
                continue;
            }

            AnchorX = record.AnchorX;
            AnchorY = record.AnchorY;
            var ControlX = record.ControlX;
            var ControlY = record.ControlY;
            var isCurved = record.isCurved;
            if (FillStyle0) {
                idx = FillStyle0 - 1;
                if (!(idx in fills0)) {
                    fills0[idx] = [];
                }

                if (!(depth in fills0[idx])) {
                    fills0[idx][depth] = {
                        obj: fillStyles[idx],
                        startX: MoveX,
                        startY: MoveY,
                        endX: 0,
                        endY: 0,
                        cache: []
                    };
                }

                obj = fills0[idx][depth];
                cache = obj.cache;
                cache[cache.length] = this.clone(record);
                obj.endX = AnchorX;
                obj.endY = AnchorY;
            }

            if (FillStyle1) {
                idx = FillStyle1 - 1;
                if (!(idx in fills1)) {
                    fills1[idx] = [];
                }

                if (!(depth in fills1[idx])) {
                    fills1[idx][depth] = {
                        obj: fillStyles[idx],
                        startX: MoveX,
                        startY: MoveY,
                        endX: 0,
                        endY: 0,
                        cache: []
                    };
                }

                obj = fills1[idx][depth];
                cache = obj.cache;
                cache[cache.length] = this.clone(record);
                obj.endX = AnchorX;
                obj.endY = AnchorY;
            }

            if (LineStyle) {
                idx = LineStyle - 1;
                if (!(idx in lines)) {
                    lines[idx] = {
                        obj: lineStyles[idx],
                        cache: []
                    };
                }

                obj = lines[idx];
                cache = obj.cache;
                cache[cache.length] = [0, LineX, LineY];
                var code = [2, AnchorX, AnchorY];
                if (isCurved) {
                    code = [1, ControlX, ControlY, AnchorX, AnchorY];
                }
                cache[cache.length] = code;
            }

            LineX = AnchorX;
            LineY = AnchorY;
        }

        return stack;
    }

    fillMerge(fills0: any[], fills1: any[], isMorph: boolean): any[] {
        fills0 = this.fillReverse(fills0);
        if (fills0.length) {
            for (var i in fills0) {
                if (!fills0.hasOwnProperty(i)) {
                    continue;
                }
                var fills = fills0[i];
                if (i in fills1) {
                    var fill1 = fills1[i];
                    for (var depth in fills) {
                        if (!fills.hasOwnProperty(depth)) {
                            continue;
                        }
                        fill1[fill1.length] = fills[depth];
                    }
                } else {
                    fills1[i] = fills;
                }
            }
        }
        return this.coordinateAdjustment(fills1, isMorph);
    }

    fillReverse(fills0: any[]): any[] {
        if (!fills0.length) {
            return fills0;
        }

        for (var i in fills0) {
            if (!fills0.hasOwnProperty(i)) {
                continue;
            }
            var fills = fills0[i];
            for (var depth in fills) {
                if (!fills.hasOwnProperty(depth)) {
                    continue;
                }
                var AnchorX = 0;
                var AnchorY = 0;
                var obj = fills[depth];
                var cacheX = obj.startX;
                var cacheY = obj.startY;
                var cache = obj.cache;
                var length = cache.length;
                if (length) {
                    for (var idx in cache) {
                        if (!cache.hasOwnProperty(idx)) {
                            continue;
                        }
                        var recode = cache[idx];
                        AnchorX = recode.AnchorX;
                        AnchorY = recode.AnchorY;
                        recode.AnchorX = cacheX;
                        recode.AnchorY = cacheY;
                        cacheX = AnchorX;
                        cacheY = AnchorY;
                    }
                    var array = [];
                    if (length > 0) {
                        while (length--) {
                            array[array.length] = cache[length];
                        }
                    }
                    obj.cache = array;
                }

                cacheX = obj.startX;
                cacheY = obj.startY;
                obj.startX = obj.endX;
                obj.startY = obj.endY;
                obj.endX = cacheX;
                obj.endY = cacheY;
            }
        }
        return fills0;
    }

    coordinateAdjustment(fills1: any[], isMorph: boolean): any[] {
        for (var i in fills1) {
            if (!fills1.hasOwnProperty(i)) {
                continue;
            }
            var array = [];
            var fills = fills1[i];

            for (var depth in fills) {
                if (!fills.hasOwnProperty(depth)) {
                    continue;
                }
                array[array.length] = fills[depth];
            }

            var adjustment = [];
            if (array.length > 1 && !isMorph) {
                while (true) {
                    if (!array.length) {
                        break;
                    }

                    var fill = array.shift();
                    if (fill.startX === fill.endX && fill.startY === fill.endY) {
                        adjustment[adjustment.length] = fill;
                        continue;
                    }

                    var mLen = array.length;
                    if (mLen < 0) {
                        break;
                    }

                    var isMatch = 0;
                    while (mLen--) {
                        var comparison = array[mLen];
                        if (comparison.startX === fill.endX && comparison.startY === fill.endY) {
                            fill.endX = comparison.endX;
                            fill.endY = comparison.endY;
                            var cache0 = fill.cache;
                            var cache1 = comparison.cache;
                            var cLen = cache1.length;
                            for (var cIdx = 0; cIdx < cLen; cIdx++) {
                                cache0[cache0.length] = cache1[cIdx];
                            }
                            array.splice(mLen, 1);
                            array.unshift(fill);
                            isMatch = 1;
                            break;
                        }
                    }

                    if (!isMatch) {
                        array.unshift(fill);
                    }
                }
            } else {
                adjustment = array;
            }

            var aLen = adjustment.length;
            var cache = [];
            var obj = {};
            for (var idx = 0; idx < aLen; idx++) {
                var data = adjustment[idx];
                obj = data.obj;
                var caches = data.cache;
                var cacheLength = caches.length;
                cache[cache.length] = [0, data.startX, data.startY];
                for (var compIdx = 0; compIdx < cacheLength; compIdx++) {
                    var r = caches[compIdx];
                    var code = [2, r.AnchorX, r.AnchorY];
                    if (r.isCurved) {
                        code = [1, r.ControlX, r.ControlY, r.AnchorX, r.AnchorY];
                    }
                    cache[cache.length] = code;
                }
            }

            fills1[i] = {cache: cache, obj: obj};
        }
        return fills1;
    }

    setStack(stack: any[], array: any[]): any[] {
        if (array.length) {
            for (var i in array) {
                if (!array.hasOwnProperty(i)) {
                    continue;
                }
                var data = array[i];
                stack[stack.length] = {
                    obj: data.obj,
                    cmd: this.buildCommand.call(this, data.cache)
                };
            }
        }
        return stack;
    }

    buildCommand(cache: any): any {
        return this.executeCanvas2D.bind(this, cache);
    }

    executeCanvas2D(cache: any, ctx: CanvasRenderingContext2D, ct: any, isClip: boolean): void {
        var length = cache.length;
        var i = 0;
        while (i < length) {
            var a = cache[i];
            switch (a[0]) {
                case 0:
                    ctx.moveTo(a[1], a[2]);
                    break;
                case 1:
                    ctx.quadraticCurveTo(a[1], a[2], a[3], a[4]);
                    break;
                case 2:
                    ctx.lineTo(a[1], a[2]);
                    break;
                case 3:
                    ctx.bezierCurveTo(a[1], a[2], a[3], a[4], a[5], a[6]);
                    break;
                case 4:
                    ctx.moveTo((a[1] + a[3]), a[2]);
                    ctx.arc(a[1], a[2], a[3], 0, Math.PI*2, false);
                    break;

                // Graphics
                case 5: // fillStyle
                    var r = Math.max(0, Math.min((a[1] * ct[0]) + ct[4], 255))|0;
                    var g = Math.max(0, Math.min((a[2] * ct[1]) + ct[5], 255))|0;
                    var b = Math.max(0, Math.min((a[3] * ct[2]) + ct[6], 255))|0;
                    var al = Math.max(0, Math.min((a[4] * 255 * ct[3]) + ct[7], 255)) / 255;
                    ctx.fillStyle = 'rgba('+r+', '+g+', '+b+', '+al+')';
                    break;
                case 6: // strokeStyle
                    var r = Math.max(0, Math.min((a[1] * ct[0]) + ct[4], 255))|0;
                    var g = Math.max(0, Math.min((a[2] * ct[1]) + ct[5], 255))|0;
                    var b = Math.max(0, Math.min((a[3] * ct[2]) + ct[6], 255))|0;
                    var al = Math.max(0, Math.min((a[4] * 255 * ct[3]) + ct[7], 255)) / 255;
                    ctx.strokeStyle = 'rgba('+r+', '+g+', '+b+', '+al+')';
                    break;
                case 7: // fill
                    if (!isClip) { ctx.fill(); }
                    break;
                case 8: // stroke
                    if (!isClip) { ctx.stroke(); }
                    break;
                case 9: // width
                    ctx.lineWidth = a[1];
                    break;
                case 10: // lineCap
                    ctx.lineCap = ('' + a[1]) as any;
                    break;
                case 11: // lineJoin
                    ctx.lineJoin = ('' + a[1]) as any;
                    break;
                case 12: // miterLimit
                    ctx.lineJoin = ('' + a[1]) as any;
                    break;
                case 13: // beginPath
                    ctx.beginPath();
                    break;
            }
            i++;
        }
    }
}
