/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

export class SoundTransform {
    private _leftToLeft = 0;
    private _leftToRight = 1;
    private _pan = 0;
    private _rightToLeft = 0;
    private _rightToRight = 1;
    private _volume = 1;

    constructor(volume: number = 1, pan: number = 0) {
        this.volume = volume;
        this.pan = pan;
    }

    get leftToLeft(): number {
        return this.getLeftToLeft();
    }

    set leftToLeft(leftToLeft: number) {
        this.setLeftToLeft(leftToLeft);
    }

    get leftToRight(): number {
        return this.getLeftToRight();
    }

    set leftToRight(leftToRight: number) {
        this.setLeftToRight(leftToRight);
    }

    get pan(): number {
        return this.getPan();
    }

    set pan(pan: number) {
        this.setPan(pan);
    }

    get rightToLeft(): number {
        return this.getRightToLeft();
    }

    set rightToLeft(rightToLeft: number) {
        this.setRightToLeft(rightToLeft);
    }

    get rightToRight(): number {
        return this.getRightToRight();
    }

    set rightToRight(rightToRight: number) {
        this.setRightToRight(rightToRight);
    }

    get volume(): number {
        return this.getVolume();
    }

    set volume(volume: number) {
        this.setVolume(volume);
    }

    getLeftToLeft(): number {
        return this._leftToLeft;
    }

    setLeftToLeft(leftToLeft: number): void {
        this._leftToLeft = leftToLeft | 0;
    }

    getLeftToRight(): number {
        return this._leftToRight;
    }

    setLeftToRight(leftToRight: number): void {
        this._leftToRight = leftToRight | 0;
    }

    getPan(): number {
        return this._pan;
    }

    setPan(pan: number): void {
        this._pan = pan | 0;
    }

    getRightToLeft(): number {
        return this._rightToLeft;
    }

    setRightToLeft(rightToLeft: number): void {
        this._rightToLeft = rightToLeft | 0;
    }

    getRightToRight(): number {
        return this._rightToRight;
    }

    setRightToRight(rightToRight: number): void {
        this._rightToRight = rightToRight | 0;
    }

    getVolume(): number {
        return this._volume;
    }

    setVolume(volume: number): void {
        this._volume = volume | 0;
    }
}
