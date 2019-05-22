/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { DisplayObject } from './DisplayObject';

export class InteractiveObject extends DisplayObject {
    private _mouseEnabled = true;

    get mouseEnabled(): boolean {
        return this.getMouseEnabled();
    }

    set mouseEnabled(mouseEnabled: boolean) {
        this.setMouseEnabled(mouseEnabled);
    }

    getMouseEnabled(): boolean {
        return this._mouseEnabled;
    }

    setMouseEnabled(mouseEnabled: boolean): void {
        this._mouseEnabled = mouseEnabled;
    }

    reset(): void {
        super.reset();

        this._mouseEnabled = true;
    }
}
