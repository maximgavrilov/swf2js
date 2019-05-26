/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { CLS, DisplayObject, HitObject } from './DisplayObject';
import { DisplayObjectContainer } from './DisplayObjectContainer';
import { ClipEvent } from './EventDispatcher';
import { Graphics } from './Graphics';
import { Shape } from './Shape';
import { StaticText } from './StaticText';
import { SoundTransform } from './SoundTransform';
import { Stage } from './Stage';
import { TextField } from './TextField';
import {
    Bounds, ColorTransform, Matrix,
    multiplicationMatrix, multiplicationColor
} from './utils';

export class Sprite extends DisplayObjectContainer {
    private _buttonMode = false;
    private _useHandCursor = false;
    private _dropTarget?: DisplayObject;
    private _hitArea?: DisplayObject;
    private _graphics = new Graphics();
    private _soundTransform = new SoundTransform();

    get graphics(): Graphics {
        return this.getGraphics();
    }

    get hitArea(): DisplayObject {
        return this.getHitArea();
    }

    set hitArea(sprite: DisplayObject) {
        this.setHitArea(sprite);
    }

    get buttonMode(): boolean {
        return this.getButtonMode();
    }

    set buttonMode(buttonMode: boolean) {
        this.setButtonMode(buttonMode);
    }

    get soundTransform(): SoundTransform {
        return this._soundTransform;
    }

    get useHandCursor(): boolean {
        return this.getUseHandCursor();
    }

    set useHandCursor(useHandCursor: boolean) {
        this.setUseHandCursor(useHandCursor);
    }

    get dropTarget(): DisplayObject {
        return this.getDropTarget();
    }

    getGraphics(): Graphics {
        return this._graphics;
    }

    getHitArea(): DisplayObject {
        return this._hitArea;
    }

    setHitArea(displayObject: DisplayObject): void {
        this._hitArea = displayObject;
    }

    getButtonMode(): boolean {
        return this._buttonMode;
    }

    setButtonMode(buttonMode: boolean): void {
        this._buttonMode = buttonMode;
    }

    getUseHandCursor(): boolean {
        return this._useHandCursor;
    }

    setUseHandCursor(useHandCursor: boolean): void {
        this._useHandCursor = useHandCursor;
    }

    startTouchDrag(touchPointID: number, lock: boolean = false, bounds: Bounds = null): void {
        this.startDrag(lock);
    }

    stopTouchDrag(touchPointID: number) {
        this.stopDrag();
    }

    startDrag(lock: boolean = false, bounds: Bounds = null): void {
        var left = bounds.xMin;
        var top = bounds.yMin;
        var right = bounds.xMax;
        var bottom = bounds.yMax;

        var _root = this.getDisplayObject("_root");
        var stage = _root.getStage();
        var startX = 0;
        var startY = 0;
        if (!lock) {
            startX = this.getXMouse();
            startY = this.getYMouse();
        }

        stage.dragMc = this;
        stage.dragRules = {
            startX: startX,
            startY: startY,
            left: left,
            top: top,
            right: right,
            bottom: bottom
        };

        this.setDropTarget();
    }

    stopDrag(): void {
        var _this = this;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();
        stage.dragMc = null;
        stage.dragRules = null;
        _this.setDropTarget();
    }

    executeDrag(): void {
        var _this = this;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();
        var dragRules = stage.dragRules;
        var startX = dragRules.startX;
        var startY = dragRules.startY;
        var left = dragRules.left;
        var top = dragRules.top;
        var right = dragRules.right;
        var bottom = dragRules.bottom;
        var x = _this.getX();
        var y = _this.getY();
        var xmouse = _this.getXMouse();
        var ymouse = _this.getYMouse();

        xmouse -= startX;
        ymouse -= startY;

        var moveX = x + xmouse;
        var moveY = y + ymouse;

        if (left === null || left === undefined) {
            _this.setX(moveX);
            _this.setY(moveY);
        } else {
            left = +left;
            top = +top;
            right = +right;
            bottom = +bottom;

            // x
            if (right < moveX) {
                _this.setX(right);
            } else if (moveX < left) {
                _this.setX(left);
            } else {
                _this.setX(moveX);
            }

            // y
            if (bottom < moveY) {
                _this.setY(bottom);
            } else if (moveY < top) {
                _this.setY(top);
            } else {
                _this.setY(moveY);
            }
        }
    }

    getDropTarget(): DisplayObject | undefined {
        return this._dropTarget;
    }

    setDropTarget(): void {
        var _this = this;
        _this._dropTarget = null;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();
        var parent = _this.getParent();
        if (!parent) {
            parent = stage.getParent();
        }

        var x = _root.getXMouse();
        var y = _root.getYMouse();

        var tags = parent.getTags();
        for (var depth in tags) {
            if (!tags.hasOwnProperty(depth)) {
                continue;
            }

            var id = tags[depth];
            if (id === _this.instanceId) {
                continue;
            }

            var instance = stage.getInstance(id);
            if (!CLS.isMovieClip(instance)) {
                continue;
            }

            var hit = (instance as any).hitTest(x, y);
            if (hit) {
                _this._dropTarget = instance;
                break;
            }
        }
    }

    getTags(): any {
        return this.getContainer();
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        var _this = this;
        if (_this.removeFlag) {
            return "";
        }

        _this.isLoad = true;
        stage.doneTags.unshift(_this);

        // sound
        if (CLS.isMovieClip(_this) && !_this.soundStopFlag) {
            const mc = _this;
            var sounds = mc.getSounds();
            if (sounds !== undefined) {
                var sLen = sounds.length;
                for (var idx = 0; idx < sLen; idx++) {
                    if (!(idx in sounds)) {
                        continue;
                    }
                    var sound = sounds[idx];
                    mc.startSound_mc(sound);
                }
            }
        }

        // matrix & colorTransform
        var rMatrix = multiplicationMatrix(matrix, _this.getMatrix());
        var rColorTransform = multiplicationColor(colorTransform, _this.getColorTransform());
        var isVisible = _this.getVisible() && visible;

        // pre render
        var obj = _this.preRender(ctx, rMatrix, rColorTransform, stage, visible);
        var cacheKey = obj.cacheKey;
        var preCtx = obj.preCtx;
        var preMatrix = obj.preMatrix;

        // graphics
        if (visible && this.graphics && this.graphics.isDraw)
            cacheKey += this.graphics.render(preCtx, preMatrix, rColorTransform, stage);


        // render
        var clips = [];
        var container = _this.getTags();
        var length = container.length;
        var maskObj = _this.getMask();

        if (length) {
            var myStage = _this.getStage();
            for (var depth in container) {
                if (!container.hasOwnProperty(depth)) {
                    continue;
                }

                var instanceId = container[depth];
                var instance = myStage.getInstance(instanceId);
                if (!instance) {
                    continue;
                }

                // mask end
                var cLen = clips.length;
                for (var cIdx = 0; cIdx < cLen; cIdx++) {
                    var cDepth = clips[cIdx];
                    if (depth > cDepth) {
                        clips.splice(cIdx, 1);
                        ctx.restore();
                        break;
                    }
                }

                // mask start
                if (instance.isClipDepth) {
                    ctx.save();
                    ctx.beginPath();
                    clips[clips.length] = instance.clipDepth;
                    if (CLS.isMovieClip(instance)) {
                        stage.isClipDepth = true;
                    }
                }

                if (isVisible)
                    instance.setHitRange(rMatrix, stage, visible);

                // mask
                if (instance.isMask) {
                    continue;
                }

                if (instance.isClipDepth) {
                    if (preMatrix[0] === 0) {
                        preMatrix[0] = 0.00000000000001;
                    }
                    if (preMatrix[3] === 0) {
                        preMatrix[3] = 0.00000000000001;
                    }
                }

                cacheKey += instance.render(preCtx, preMatrix, rColorTransform, stage, isVisible);
                if (stage.isClipDepth) {
                    preCtx.clip();
                    stage.isClipDepth = false;
                }
            }
        }

        if (clips.length || maskObj) {
            ctx.restore();
        }

        // post render
        if (obj.isFilter || obj.isBlend) {
            obj.cacheKey = cacheKey;
            _this.postRender(ctx, rMatrix, rColorTransform, stage, obj);
        }

        return cacheKey;
    }

    putFrame(stage: Stage, clipEvent: ClipEvent): void {
        this.active = true;
        this.dispatchEvent(clipEvent, stage);
    }

    addActions(stage: Stage): void {
        var _this = this;
        var myStage = _this.getStage();
        var tags = _this.getTags();
        var length = tags.length;
        if (length) {
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }
                var instanceId = tags[depth];
                var instance = myStage.getInstance(instanceId);
                if (!instance) {
                    continue;
                }
                instance.addActions(stage);
            }
        }
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        var _this = this;
        var loadStage = _this.getStage();
        var tags = _this.getTags();
        var length = tags.length;
        var hit = false;
        var rMatrix = multiplicationMatrix(matrix, _this.getMatrix());

        if (length) {
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var instanceId = tags[depth];
                var obj = loadStage.getInstance(instanceId);
                hit = obj.renderHitTest(ctx, rMatrix, stage, x, y);
                if (hit) {
                    return hit;
                }
            }
        }

        var graphics = _this.graphics;
        if (graphics.isDraw) {
            return graphics.renderHitTest(ctx, rMatrix, stage, x, y);
        }

        return hit;
    };

    getRect(mc: DisplayObject): Bounds {
        var _this = this;
        if (!mc) {
            mc = _this;
        }
        var bounds = mc.getBounds(mc.getOriginMatrix());
        var graphics = _this.graphics;
        var twips = 20;
        var maxWidth = graphics.maxWidth / twips;
        var halfWidth = maxWidth / 2;
        var xMin = bounds.xMin + halfWidth;
        var xMax = bounds.xMax - halfWidth;
        var yMin = bounds.yMin + halfWidth;
        var yMax = bounds.yMax - halfWidth;
        return new Bounds(xMin, yMin, xMax, yMax);
    }

    hitCheck(ctx: CanvasRenderingContext2D,
             matrix: Matrix,
             stage: Stage,
             x: number,
             y: number): HitObject | undefined
    {
        var _this = this;
        if (!_this.getEnabled() ||
            !_this.getVisible() ||
            !_this.getMouseEnabled()
        ) {
            return undefined;
        }

        var hitObj;
        var hit = undefined;
        var tags = _this.getTags();
        var length = tags.length;
        var matrix2 = multiplicationMatrix(matrix, _this.getMatrix());
        if (length) {
            var loadStage = _this.getStage();
            tags.reverse();
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var tagId = tags[depth];
                var instance = loadStage.getInstance(tagId);
                if (instance instanceof Shape ||
                    instance instanceof StaticText ||
                    instance instanceof TextField
                ) {
                    hit = (instance as any).renderHitTest(ctx, matrix2, stage, x, y);
                } else {
                    hit = instance.hitCheck(ctx, matrix2, stage, x, y);
                }

                if (hit) {
                    hitObj = hit;
                    if (typeof hit !== "object") {
                        if (this.hasEventListener('press') ||
                            this.hasEventListener('release') ||
                            this.hasEventListener('releaseOutside') ||
                            this.hasEventListener('rollOver') ||
                            this.hasEventListener('rollOut') ||
                            this.hasEventListener('dragOver') ||
                            this.hasEventListener('dragOut')
                        ) {
                            stage.isHit = hit;
                            hitObj = {parent : _this};
                        }
                    }

                    tags.reverse();
                    return hitObj;
                }
            }
            tags.reverse();
        }

        var graphics = _this.graphics;
        if (graphics.isDraw) {
            hit = graphics.renderHitTest(ctx, matrix2, stage, x, y);
            if (hit) {
                hitObj = {parent : _this};
            }
        }

        return hitObj;
    }
}

CLS.Sprite = Sprite;
