/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { CLS, DisplayObject } from './DisplayObject';
import { InteractiveObject } from './InteractiveObject';
import { PlaceObject } from './PlaceObject';
import { MovieClip } from './MovieClip';
import { Shape } from './Shape';
import { SimpleButton } from './SimpleButton';
import { Sprite } from './Sprite';
import { TextField } from './TextField';
import {
    Matrix, Stage, SoundInfo, Tag,
    multiplicationMatrix, cloneArray, startSound
} from './utils';


class TextSnapshot {
    readonly charCount = 0;

    findText(beginIndex: number, textToFind: string, caseSensitive: boolean): number {
        return -1;
    }

    getSelected(beginIndex: number, endIndex: number): boolean {
        return false;
    }

    getSelectedText(includeLineEndings: boolean = false): string {
        return '';
    }

    getText(beginIndex: number, endIndex: number, includeLineEndings: boolean = false): string {
        return '';
    }

    getTextRunInfo(beginIndex: number, endIndex: number): any[] {
        return [];
    }

    hitTestTextNearPos(x: number, y: number, maxDistance: number = 0): number {
        return -1;
    }

    setSelectColor(hexColor: number = 0xffff00): void {
    }

    setSelected(beginIndex: number, endIndex: number, select: boolean):void {
    }
}


type Container = any; // { [depth: number]: number } | { [frame: number]: { [depth: number]: number } };
type Instances = { [instanceId: number]: 1 };

export class DisplayObjectContainer extends InteractiveObject {
    soundId: number = -1;
    soundInfo?: SoundInfo;
    isSwap = false;

    private _mouseChildren = true;
    private _tabChildren = true;
    private _textSnapshot = new TextSnapshot();
    private _numChildren = 0;
    protected container: Container = {};
    private instances: Instances = {};


    get mouseChildren(): boolean {
        return this.getMouseChildren();
    }

    set mouseChildren(mouseChildren: boolean) {
        this.setMouseChildren(mouseChildren);
    }

    get textSnapshot(): TextSnapshot {
        return this.getTextSnapshot();
    }

    get numChildren(): number {
        return this.getNumChildren();
    }

    get tabChildren(): boolean {
        return this.getTabChildren();
    }

    set tabChildren(tabChildren: boolean) {
        this.setTabChildren(tabChildren);
    }

    getMouseChildren(): boolean {
        return this._mouseChildren;
    }

    setMouseChildren(mouseChildren: boolean): void {
        this._mouseChildren = mouseChildren;
    }

    getTextSnapshot(): TextSnapshot {
        return this._textSnapshot;
    }

    getNumChildren(): number {
        return this._numChildren;
    }

    getTabChildren(): boolean {
        return this._tabChildren;
    }

    setTabChildren(tabChildren: boolean): void {
        this._tabChildren = tabChildren;
    }

    getContainer(): Container {
        return this.container;
    }

    getInstances(): Instances {
        return this.instances;
    }

    setInstance(instance: DisplayObject): void {
        this.instances[instance.instanceId] = 1;
    }

    deleteInstance(instance: DisplayObject): void {
        delete this.instances[instance.instanceId];
    }

    addChild<T extends DisplayObject>(child: T): T {
        return this.addChildAt(child, this.numChildren);
    }

    addChildAt<T extends DisplayObject>(child: T, depth: number): T {
        var stage = this.getStage();
        child.setParent(this);
        child.setStage(stage);
        child.setLevel(depth);

        var container = this.getContainer();
        var frame = 1;
        var placeObject = new PlaceObject();
        var instanceId = this.instanceId;
        var _this = this;
        if (CLS.isMovieClip(_this)) {
            var totalFrames = _this.getTotalFrames() + 1;
            for (; frame < totalFrames; frame++) {
                if (!(frame in container)) {
                    container[frame] = [];
                }
                stage.setPlaceObject(placeObject, instanceId, depth, frame);
                container[frame][depth] = child.instanceId;
            }
        } else {
            stage.setPlaceObject(placeObject, instanceId, depth, frame);
            container[depth] = child.instanceId;
        }

        this._numChildren++;

        return child;
    }

    getChildAt(depth: number): DisplayObject | undefined {
        var _this = this;
        var container = _this.getContainer();
        var children = container;

        if (16384 > depth) {
            depth += 16384;
        }

        if (CLS.isMovieClip(_this)) {
            var frame = _this.getCurrentFrame();
            children = container[frame];
        }
        return children[depth];
    }

    getChildByName(name: string): DisplayObject | undefined {
        var _this = this;
        var container = _this.getContainer();
        var children = container;
        if (CLS.isMovieClip(_this)) {
            var frame = _this.getCurrentFrame();
            children = container[frame];
        }

        var obj;
        for (var depth in children) {
            if (!children.hasOwnProperty(depth)) {
                continue;
            }

            var child = children[depth];
            if (child.getName() !== name) {
                continue;
            }
            obj = child;
            break;
        }
        return obj;
    }

    getChildIndex(child: DisplayObject): number {
        return child.getLevel() - 16384;
    }

    removeChild(child: DisplayObject): DisplayObject {
        var _this = this;
        var container = _this.getContainer();
        var depth, obj;
        if (CLS.isMovieClip(_this)) {
            var totalFrames = _this.getTotalFrames() + 1;
            for (var frame = 1; frame < totalFrames; frame++) {
                if (!(frame in container)) {
                    continue;
                }
                var children = container[frame];
                for (depth in children) {
                    if (!children.hasOwnProperty(depth)) {
                        continue;
                    }
                    var instanceId = children[depth];
                    if (instanceId !== child.instanceId) {
                        continue;
                    }
                    delete container[frame][depth];
                    break;
                }
            }
        } else {
            for (depth in container) {
                if (!container.hasOwnProperty(depth)) {
                    continue;
                }
                obj = container[depth];
                if (obj.instanceId !== child.instanceId) {
                    continue;
                }
                delete container[depth];
                break;
            }
        }

        if (child) {
            _this.deleteInstance(child);
            _this._numChildren--;
        }

        return child;
    }

    removeChildAt(depth: number): DisplayObject | undefined {
        var _this = this;
        var container = _this.getContainer();
        var children = container;

        if (16384 > depth) {
            depth += 16384;
        }

        var child;
        if (CLS.isMovieClip(_this)) {
            var totalFrames = _this.getTotalFrames();
            for (var frame = 1; frame < totalFrames; frame++) {
                if (!(frame in container)) {
                    continue;
                }

                children = container[frame];
                if (!(depth in children)) {
                    continue;
                }

                child = children[depth];
                delete container[frame][depth];
            }
        } else {
            child = children[depth];
            delete children[depth];
        }

        if (child) {
            _this._numChildren--;
        }

        return child;
    }

    addTag(depth: number, obj: Tag): void {
        this.container[depth] = obj.instanceId;
        this._numChildren++;
    }

    startSound(): void {
        if (this.soundId < 0)
            return;

        const stage = this.getStage();
        const sound = stage.sounds[this.soundId];
        if (!sound)
            return;

        const audio = document.createElement("audio");
        audio.onload = () => {
            audio.load();
            audio.preload = "auto";
            audio.autoplay = false;
            audio.loop = false;
        };
        audio.src = sound.base64;
        startSound(audio, this.soundInfo);
    }

    reset(): void {
        super.reset();

        const stage = this.getStage();
        for (var depth in this.container) {
            if (!this.container.hasOwnProperty(depth)) {
                continue;
            }

            const instanceId = this.container[depth];
            const obj = stage.getInstance(instanceId);
            obj.reset();
        }
    }

    setHitRange(matrix: Matrix, stage: Stage, visible: boolean): void {
        const isVisible = this.getVisible() && visible;
        if (this.getEnabled() && isVisible) {
            if (this.hasEventListener('press') ||
                this.hasEventListener('release') ||
                this.hasEventListener('releaseOutside') ||
                this.hasEventListener('rollOver') ||
                this.hasEventListener('rollOut') ||
                this.hasEventListener('dragOver') ||
                this.hasEventListener('dragOut') ||
                this.onPress ||
                this.onRelease ||
                this.onRollOver ||
                this.onReleaseOutside ||
                this.onRollOut ||
                this.onDragOver ||
                this.onDragOut
            ) {
                var rMatrix = multiplicationMatrix(matrix, this.getMatrix());
                var bounds = this.getBounds(rMatrix);
                stage.buttonHits.push({
                    xMax: bounds.xMax,
                    xMin: bounds.xMin,
                    yMax: bounds.yMax,
                    yMin: bounds.yMin,
                    parent: this,
                    matrix: cloneArray(matrix)
                });
            }
        }
    }

    createMovieClip(name?: string, depth: number = 0): MovieClip {
        const movieClip = this.addChildAt(new CLS.MovieClip(), depth);
        if (name)
            movieClip.setName(name);
        return movieClip;
    }

    createSprite(name?: string, depth: number = 0): Sprite {
        const sprite = this.addChildAt(new CLS.Sprite(), depth);
        if (name)
            sprite.setName(name);
        return sprite;
    }

    createButton(name?: string, depth: number = 0): SimpleButton {
        const button = this.addChildAt(new CLS.SimpleButton(), depth);
        if (name)
            button.setName(name);
        return button;
    }

    createText(name: string, width: number, height: number, depth: number): TextField {
        const textField = this.addChildAt(new CLS.TextField(name, depth, width, height), depth);
        textField.setInitParams();
        if (name)
            textField.setName(name);
        textField.size = 12;
        return textField;
    }

    createShape(depth: number): Shape {
        const shape = new CLS.Shape();
        this.addChildAt(shape, depth);
        return shape;
    }
}

CLS.DisplayObjectContainer = DisplayObjectContainer;
