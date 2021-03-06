/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { BitmapFilter } from './BitmapFilter';
import { BlendMode, ColorTransform, cloneArray, getBlendName, Matrix } from './utils';

export class PlaceObject {
    private matrix: Matrix = [1, 0, 0, 1, 0, 0];
    private colorTransform: ColorTransform = [1, 1, 1, 1, 0, 0, 0, 0];
    private filters: BitmapFilter[] | null = null;
    private blendMode: BlendMode = 'normal';

    clone(): PlaceObject {
        const placeObject = new PlaceObject();
        placeObject.setMatrix(this.getMatrix());
        placeObject.setColorTransform(this.getColorTransform());
        placeObject.setFilters(this.getFilters());
        placeObject.setBlendMode(this.getBlendMode());
        return placeObject;
    }

    getMatrix(): Matrix {
        return this.matrix;
    }

    setMatrix(matrix: Matrix): void {
        this.matrix = cloneArray(matrix);
    }

    getColorTransform(): ColorTransform {
        return this.colorTransform;
    }

    setColorTransform(colorTransform: ColorTransform): void {
        this.colorTransform = cloneArray(colorTransform);
    }

    getFilters(): BitmapFilter[] | null {
        return this.filters;
    }

    setFilters(filters: BitmapFilter[] | null): void {
        this.filters = filters;
    }

    getBlendMode(): BlendMode {
        return this.blendMode;
    }

    setBlendMode(blendMode: BlendMode | number): void {
        this.blendMode = getBlendName(blendMode);
    }
}
