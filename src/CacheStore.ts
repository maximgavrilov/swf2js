/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

class CacheStore {
    private store: { [key: string]: CanvasRenderingContext2D } = {};
    private pool: CanvasRenderingContext2D[] = [];
    private _size = 0;

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
        this._size = 0;
    }

    destroy(ctx: CanvasRenderingContext2D): void {
        // const canvas = ctx.canvas;

        // ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
        // canvas.width = canvas.height = 1;

        // this.pool.push(ctx);
    }

    getCanvas(): HTMLCanvasElement {
        const ctx = this.pool.pop();
        return ctx ? ctx.canvas : document.createElement('canvas');
    }

    getCache(key: string): CanvasRenderingContext2D {
        return this.store[key];
    }

    setCache(key: string, value: CanvasRenderingContext2D): void {
        const old = this.store[key];
        if (old && old instanceof CanvasRenderingContext2D)
            this._size -= (old.canvas.width * old.canvas.height);

        this.store[key] = value;

        if (value instanceof CanvasRenderingContext2D)
            this._size += (value.canvas.width * value.canvas.height);

        console.log('size', this._size);
    }

    generateKey(name: string, id: string, matrix: number[], cxForm: number[]): string {
        let key = name + "_" + id;
        if (matrix instanceof Array) {
            key += "_" + matrix.join("_");
        }
        if (cxForm instanceof Array) {
            key += "_" + cxForm.join("_");
        }
        return key;
    }
}

export const cacheStore = new CacheStore();
(window as any).cacheStore = cacheStore;
