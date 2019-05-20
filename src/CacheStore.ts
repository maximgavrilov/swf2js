/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

export class CacheStore {
    private store: { [key: string]: CanvasRenderingContext2D } = {};
    private pool: CanvasRenderingContext2D[] = [];
    private size = 73400320; // 70M

    reset(): void {
        for (const key in this.store) {
            if (!this.store.hasOwnProperty(key)) {
                continue;
            }

            const value = this.store[key];
            if (!(value instanceof CanvasRenderingContext2D)) {
                continue;
            }

            this.destroy(value);
        }
        this.store = {};
        this.size = 73400320;
    }

    destroy(ctx: CanvasRenderingContext2D): void {
        const canvas = ctx.canvas;

        ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
        canvas.width = canvas.height = 1;

        this.pool.push(canvas);
    }

/**
 * @returns {*}
 */
CacheStore.prototype.getCanvas = function ()
{
    return this.pool.pop() || _document.createElement("canvas");
};

/**
 * @param key
 * @returns {*}
 */
CacheStore.prototype.getCache = function (key)
{
    return this.store[key];
};

/**
 * @param key
 * @param value
 */
CacheStore.prototype.setCache = function (key, value)
{
    var _this = this;
    if (value instanceof CanvasRenderingContext2D) {
        var canvas = value.canvas;
        _this.size -= (canvas.width * canvas.height);
    }
    this.store[key] = value;
};

/**
 * @param name
 * @param id
 * @param matrix
 * @param cxForm
 * @returns {string}
 */
CacheStore.prototype.generateKey = function (name, id, matrix, cxForm)
{
    var key = name + "_" + id;
    if (matrix instanceof Array) {
        key += "_" + matrix.join("_");
    }
    if (cxForm instanceof Array) {
        key += "_" + cxForm.join("_");
    }
    return key;
};
