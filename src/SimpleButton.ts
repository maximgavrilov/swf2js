/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { CLS, ButtonStatus, HitObject } from './DisplayObject';
import { InteractiveObject } from './InteractiveObject';
import { PlaceObject } from './PlaceObject';
import { Sprite } from './Sprite';
import { Stage } from './Stage';
import {
    Bounds, ButtonAction, ColorTransform, Matrix,
    isTouch,
    cloneArray, multiplicationColor, multiplicationMatrix
} from './utils';

export class SimpleButton extends InteractiveObject {
    private actions: ButtonAction[] = [];
    private _downState = new Sprite();
    private _hitState = new Sprite();
    private _overState = new Sprite();
    private _upState = new Sprite();

    get downState(): Sprite {
        return this.getSprite("down");
    }

    set downState(sprite: Sprite) {
        this.setSprite("down", sprite);
    }

    get hitState(): Sprite {
        return this.getSprite("hit");
    }

    set hitState(sprite: Sprite) {
        this.setSprite("hit", sprite);
    }

    get overState(): Sprite {
        return this.getSprite("over");
    }

    set overState(sprite: Sprite) {
        this.setSprite("over", sprite);
    }

    get upState(): Sprite {
        return this.getSprite("up");
    }

    set upState(sprite: Sprite) {
        this.setSprite("up", sprite);
    }

    setStage(stage: Stage): void {
        var _this = this;

        _this.stageId = stage.getId();
        var upState = _this.getSprite("up");
        upState.setStage(stage);
        var downState = _this.getSprite("down");
        downState.setStage(stage);
        var hitState = _this.getSprite("hit");
        hitState.setStage(stage);
        var overState = _this.getSprite("over");
        overState.setStage(stage);
        stage.setInstance(_this);
    }

    getActions(): ButtonAction[] {
        return this.actions;
    }

    setActions(actions: ButtonAction[]): void {
        this.actions = actions;
    }

    setButtonStatus(status: ButtonStatus): void {
        if (this.getButtonStatus() !== status) {
            this.buttonReset(status);
        }

        super.setButtonStatus(status);
    }

    getSprite(status?: ButtonStatus): Sprite {
        status = status || this.buttonStatus;

        switch (status) {
            case 'up': return this._upState;
            case 'down': return this._downState;
            case 'hit': return this._hitState;
            case 'over': return this._overState;
            default: ((x: never) => {})(status);
        }
    }

    setSprite(status: ButtonStatus, sprite: Sprite): void {
        const stage = this.getStage();

        var level = 0;
        switch (status) {
            case "down":
                level = 1;
                break;
            case "hit":
                level = 2;
                break;
            case "over":
                level = 3;
                break;
            case "up":
                level = 4;
                break;
            default:
                ((x: never) => {})(status);
        }

        stage.setPlaceObject(new PlaceObject(), this.instanceId, level, 0);
        sprite.setParent(this);
        sprite.setLevel(level);
        sprite.setStage(stage);
        var container = sprite.getContainer();
        for (var depth in container) {
            if (!container.hasOwnProperty(depth)) {
                continue;
            }

            var instanceId = container[depth];
            var obj = stage.getInstance(instanceId);
            obj.setParentSprite(sprite);
        }

        switch (status) {
            case "down":
                this._downState = sprite;
                break;
            case "hit":
                this._hitState = sprite;
                break;
            case "over":
                this._overState = sprite;
                break;
            case "up":
                this._upState = sprite;
                break;
            default:
                ((x: never) => {})(status);
        }
    }

    getBounds(matrix: Matrix, status: ButtonStatus): Bounds {
        var _this = this;

        var sprite = _this.getSprite(status);
        var tags = sprite.getContainer();
        var length = tags.length;
        if (length) {
            var stage = _this.getStage();
            var result = new Bounds();

            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var instanceId = tags[depth];
                var tag = stage.getInstance(instanceId);
                if (!tag || tag.isClipDepth) {
                    continue;
                }

                var matrix2 = (matrix) ? multiplicationMatrix(matrix, tag.getMatrix()) : tag.getMatrix();
                var bounds = tag.getBounds(matrix2, status);
                if (!bounds) {
                    continue;
                }

                result.update(bounds);
            }
        }

        return result;
    }

    buttonReset(status: ButtonStatus): void {
        var _this = this;
        var sprite = _this.getSprite();
        var container = sprite.getContainer();
        var nextSprite = _this.getSprite(status);
        var nextContainer = nextSprite.getContainer();
        var stage = _this.getStage();
        for (var depth in container) {
            if (!container.hasOwnProperty(depth)) {
                continue;
            }
            var instanceId = container[depth];
            if (depth in nextContainer && instanceId === nextContainer[depth]) {
                continue;
            }
            var instance = stage.getInstance(instanceId);
            if (!instance) {
                continue;
            }
            instance.reset();
        }
    }

    setHitRange(matrix: Matrix, stage: Stage, visible: boolean): void {
        if (this.clipDepth)
            return;

        var _this = this;
        var isVisible = _this.getVisible() && visible;
        if (_this.getEnabled() && isVisible) {
            var buttonHits = stage.buttonHits;

            // enter
            if (isTouch) {
                var actions = _this.getActions();
                var aLen = actions.length;
                if (aLen) {
                    for (var idx = 0; idx < aLen; idx++) {
                        var cond = actions[idx];
                        if (cond.CondKeyPress === 13) {
                            buttonHits.push({
                                button: _this,
                                xMin: 0,
                                xMax: stage.getWidth(),
                                yMin: 0,
                                yMax: stage.getHeight(),
                                CondKeyPress: cond.CondKeyPress,
                                parent: _this.getParent()
                            });
                        }
                    }
                }
            }

            var status: ButtonStatus = "hit";
            var hitTest = _this.getSprite(status);
            var hitTags = hitTest.getContainer();
            if (!hitTags.length) {
                status = "up";
                hitTest = _this.getSprite(status);
                hitTags = hitTest.getContainer();
            }

            if (hitTags.length) {
                var m2 = multiplicationMatrix(matrix, _this.getMatrix());
                var bounds = _this.getBounds(m2, status);
                if (bounds) {
                    buttonHits.push({
                        button: _this,
                        xMin: bounds.xMin,
                        xMax: bounds.xMax,
                        yMin: bounds.yMin,
                        yMax: bounds.yMax,
                        CondKeyPress: 0,
                        parent: _this.getParent(),
                        matrix: cloneArray(matrix)
                    });
                }
            }
        }
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        var _this = this;

        // colorTransform
        var rColorTransform = multiplicationColor(colorTransform, _this.getColorTransform());

        // matrix
        var m2 = multiplicationMatrix(matrix, _this.getMatrix());

        // pre render
        var isVisible = _this.getVisible() && visible;
        var obj = _this.preRender(ctx, m2, rColorTransform, stage, isVisible);

        // render
        var sprite = _this.getSprite();
        var rMatrix = multiplicationMatrix(obj.preMatrix, sprite.getMatrix());
        var rColorTransform2 = multiplicationColor(rColorTransform, sprite.getColorTransform());
        isVisible = sprite.getVisible() && visible;
        var cacheKey = obj.cacheKey;
        cacheKey += sprite.render(obj.preCtx, rMatrix, rColorTransform2, stage, isVisible);

        // post render
        if (obj.isFilter || obj.isBlend) {
            obj.cacheKey = cacheKey;
            _this.postRender(ctx, matrix, colorTransform, stage, obj);
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

        var sprite = _this.getSprite("hit");
        var tags = sprite.getContainer();
        var length = tags.length;
        if (!length) {
            return false;
        }

        var m2 = multiplicationMatrix(matrix, _this.getMatrix());
        var m3 = multiplicationMatrix(m2, sprite.getMatrix());

        if (length) {
            var loadStage = _this.getStage();
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var instanceId = tags[depth];
                var tag = loadStage.getInstance(instanceId);
                if (!tag) {
                    continue;
                }

                var hit = tag.renderHitTest(ctx, m3, stage, x, y);
                if (hit) {
                    return hit;
                }
            }
        }

        return false;
    }

    hitCheck(ctx: CanvasRenderingContext2D,
             matrix: Matrix,
             stage: Stage,
             x: number,
             y: number): HitObject | undefined
    {
        var _this = this;

        var sprite = _this.getSprite("hit");
        var tags = sprite.getContainer();
        var length = tags.length;
        if (!length) {
            return undefined;
        }

        var m2 = multiplicationMatrix(matrix, _this.getMatrix());
        var m3 = multiplicationMatrix(m2, sprite.getMatrix());

        var hitObj = false as any;
        var hit: HitObject | undefined = undefined;
        if (length) {
            var loadStage = _this.getStage();
            tags.reverse();
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var tagId = tags[depth];
                var instance = loadStage.getInstance(tagId);
                if (CLS.isShape(instance) ||
                    CLS.isStaticText(instance) ||
                    CLS.isTextField(instance)
                ) {
                    hit = (instance as any).renderHitTest(ctx, m3, stage, x, y);
                } else {
                    hit = instance.hitCheck(ctx, m3, stage, x, y);
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
                            hitObj = {
                                parent : _this.getParent(),
                                button : _this
                            };
                        }
                    }

                    tags.reverse();
                    return hitObj;
                }
            }
            tags.reverse();
        }

        return undefined;
    }

    addActions(stage: Stage): void {
        var _this = this;
        var sprite = _this.getSprite();
        var tags = sprite.getContainer();
        var length = tags.length;
        if (length) {
            var myStage = _this.getStage();
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }
                var instanceId = tags[depth];
                var tag = myStage.getInstance(instanceId);
                if (!tag) {
                    continue;
                }
                tag.addActions(stage);
            }
        }
    }
}

CLS.SimpleButton = SimpleButton;
