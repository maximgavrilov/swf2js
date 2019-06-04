/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { DisplayObjectContainer } from './DisplayObjectContainer';
import { EventDispatcher } from './EventDispatcher';
import { BitmapFilter } from './BitmapFilter';
import { keyClass } from './Key';
import { MovieClip } from './MovieClip';
import { PlaceObject } from './PlaceObject';
import { Shape } from './Shape';
import { SharedObject } from './SharedObject';
import { SimpleButton } from './SimpleButton';
import { Sprite } from './Sprite';
import { Stage } from './Stage';
import { StaticText } from './StaticText';
import { TextField } from './TextField';
import {
    BlendMode, Bounds, ColorTransform, HitEvent, Matrix,
    devicePixelRatio,
    cloneArray, getBlendName, isTouchEvent, multiplicationMatrix
} from './utils';



let instanceId = 1;

class AccessibilityProperties {
}

class Path {
    constructor(readonly scope: DisplayObject,
                readonly target: string)
    { }
}

type PreRenderResult = {
    preCtx: CanvasRenderingContext2D;
    preMatrix: Matrix;
    isFilter: boolean;
    isBlend: boolean;
    rMatrix: Matrix;
    cacheKey: string;
    xMin: number;
    yMin: number;
};

export type ButtonStatus = 'up' | 'down' | 'over' | 'hit';

export type HitObject = {
    parent: DisplayObject;
    button?: SimpleButton;
};

export const CLS = {
    DisplayObjectContainer: 0 as any,
    MovieClip: 0 as any,
    Shape: 0 as any,
    SimpleButton: 0 as any,
    Sprite: 0 as any,
    StaticText: 0 as any,
    TextField: 0 as any,

    isDisplayObjectContainer(d: DisplayObject): d is DisplayObjectContainer {
        return d instanceof CLS.DisplayObjectContainer;
    },

    isMovieClip(d: DisplayObject): d is MovieClip {
        return d instanceof CLS.MovieClip;
    },

    isShape(d: DisplayObject): d is Shape {
        return d instanceof CLS.Shape;
    },

    isSimpleButton(d: DisplayObject): d is SimpleButton {
        return d instanceof CLS.SimpleButton;
    },

    isSprite(d: DisplayObject): d is Sprite {
        return d instanceof CLS.Sprite;
    },

    isStaticText(d: DisplayObject): d is StaticText {
        return d instanceof CLS.StaticText;
    },

    isTextField(d: DisplayObject): d is TextField {
        return d instanceof CLS.TextField;
    }
};

export class DisplayObject extends EventDispatcher {
    public static stages: { [stageId: number]: Stage } = {};
    public static loadStages: { [stageId: number]: Stage } = {};
    public static event?: HitEvent;

    readonly accessibilityProperties = new AccessibilityProperties();
    readonly instanceId = instanceId++;

    public characterId = 0;
    public tagType = 0;
    public ratio = 0;
    public isMask = false;
    public clipDepth = 0;
    public isClipDepth = false;
    protected stageId: number = 0
    private loadStageId: number = 0;
    protected buttonStatus: ButtonStatus = 'up';
    public removeFlag = false;
    public parentId: number = 0;

    // properties
    private __visible = true;
    private __name: string | null = null;
    public _url: string | null = null;
    private _highquality = 1;
    private _quality = 1;
    private _focusrect = 1;
    private _soundbuftime: number | null = null;
    public _totalframes = 1;
    private _level = 0;
    public _depth?: number;
    private _framesloaded = 0;
    private _target = "";
    public _lockroot?: DisplayObjectContainer = undefined;
    private _enabled = true;
    protected _blendMode: BlendMode | null = null;
    protected _filters?: BitmapFilter[];
    private _filterCacheKey?: string;
    private _mask: DisplayObject | null = null;
    protected _matrix: Matrix | null = null;
    protected _colorTransform: ColorTransform | null = null;
    private _sprite: number = 0;

    get alpha(): number {
        return this.getAlpha() / 100;
    }

    set alpha(alpha: number) {
        this.setAlpha(alpha * 100);
    }

    get _alpha(): number {
        return this.getAlpha();
    }

    set _alpha(v: number) {
        this.setAlpha(v);
    }

    get name(): string {
        return this.getName();
    }

    set name(v: string) {
        this.setName(v);
    }

    get _name(): string {
        return this.getName();
    }

    set _name(v: string) {
        this.setName(v);
    }

    get blendMode(): BlendMode | number {
        return this.getBlendMode();
    }

    set blendMode(v: BlendMode | number) {
        this.setBlendMode(v);
    }

    get filters(): BitmapFilter[] {
        return this.getFilters();
    }

    set filters(v: BitmapFilter[]) {
        this.setFilters(v);
    }

    get visible(): boolean {
        return this.getVisible();
    }

    set visible(v: boolean) {
        this.setVisible(v);
    }

    get _visible(): boolean {
        return this.getVisible();
    }

    set _visible(v: boolean) {
        this.setVisible(v);
    }

    get rotation(): number {
        return this.getRotation();
    }

    set rotation(v: number) {
        this.setRotation(v);
    }

    get _rotation(): number {
        return this.getRotation();
    }

    set _rotation(v: number) {
        this.setRotation(v);
    }

    get height(): number {
        return this.getHeight();
    }

    set height(v: number) {
        this.setHeight(v);
    }

    get _height(): number {
        return this.getHeight();
    }

    set _height(v: number) {
        this.setHeight(v);
    }

    get width(): number {
        return this.getWidth();
    }

    set width(v: number) {
        this.setWidth(v);
    }

    get _width(): number {
        return this.getWidth();
    }

    set _width(v: number) {
        this.setWidth(v);
    }

    get x(): number {
        return this.getX();
    }

    set x(v: number) {
        this.setX(v);
    }

    get _x(): number {
        return this.getX();
    }

    set _x(v: number) {
        this.setX(v);
    }

    get y(): number {
        return this.getY();
    }

    set y(v: number) {
        this.setY(v);
    }

    get _y(): number {
        return this.getY();
    }

    set _y(v: number) {
        this.setY(v);
    }

    get scaleX(): number {
        return this.getXScale();
    }

    set scaleX(v: number) {
        this.setXScale(v);
    }

    get _xscale(): number {
        return this.getXScale();
    }

    set _xscale(v: number) {
        this.setXScale(v);
    }

    get scaleY(): number {
        return this.getYScale();
    }

    set scaleY(v: number) {
        this.setYScale(v);
    }

    get _yscale(): number {
        return this.getYScale();
    }

    set _yscale(v: number) {
        this.setYScale(v);
    }

    get mouseX(): number {
        return this.getXMouse();
    }

    get _xmouse(): number {
        return this.getXMouse();
    }

    get mouseY(): number {
        return this.getYMouse();
    }

    get _ymouse(): number {
        return this.getYMouse();
    }

    get mask(): DisplayObject | null {
        return this.getMask();
    }

    set mask(v: DisplayObject | null) {
        this.setMask(v);
    }

    get enabled(): boolean {
        return this.getEnabled();
    }

    set enabled(v: boolean) {
        this.setEnabled(v);
    }

    get parent(): DisplayObject | null {
        return this.getParent();
    }

    set parent(v: DisplayObject | null) {
        this.setParent(v);
    }

    get _parent(): DisplayObject | null {
        return this.getParent();
    }

    set _parent(v: DisplayObject | null) {
        this.setParent(v);
    }

    toString(): string {
        var target = this.getTarget();
        var str = "_level0";
        var array = target.split("/");
        str += array.join(".");
        return str;
    }

    setStage(stage: Stage): void {
        this.stageId = stage.getId();
        stage.setInstance(this);
    }

    getStage(): Stage {
        const stage = this.getLoadStage() || this.getParentStage();
        return stage;
    }

    getParentStage(): Stage | undefined {
        if (!this.stageId)
            return undefined;

        return DisplayObject.stages[this.stageId] || DisplayObject.loadStages[this.stageId];
    }

    getLoadStage(): Stage | undefined {
        if (!this.loadStageId)
            return undefined;

        return DisplayObject.stages[this.loadStageId] || DisplayObject.loadStages[this.loadStageId];
    }

    setLoadStage(stage?: Stage): void {
        this.loadStageId = 0;
        if (stage) {
            stage.setInstance(this);
            this.loadStageId = stage.getId();
        }
    }

    getCharacterId(): number {
        return this.characterId;
    }

    setCharacterId(v: number): void {
        this.characterId = v;
    }

    getTagType(): number {
        return this.tagType;
    }

    setTagType(v: number): void {
        this.tagType = v;
    }

    getRatio(): number {
        return this.ratio;
    }

    setRatio(v: number): void {
        this.ratio = v;
    }

    getParent(): DisplayObject {
        let parent: DisplayObject;

        if (!parent) {
            const stage = this.getLoadStage();
            parent = stage && stage.getInstance(this.parentId);
        }

        if (!parent) {
            const stage = this.getParentStage();
            parent = stage && stage.getInstance(this.parentId);
        }

        return parent;
    }

    setParent(parent: DisplayObject): void {
        if (CLS.isDisplayObjectContainer(parent)) {
            (parent as DisplayObjectContainer).setInstance(this);
        }
        this.parentId = parent.instanceId;
    }

    getParentSprite(): DisplayObject | undefined {
        if (!this._sprite)
            return undefined;

        const stage = this.getStage();
        return stage.getInstance(this._sprite);
    }

    setParentSprite(sprite: DisplayObject): void {
        this._sprite = sprite.instanceId;
    }

    getButtonStatus(): ButtonStatus {
        return this.buttonStatus;
    }

    setButtonStatus(v: ButtonStatus): void {
        this.buttonStatus = v;
    }

    getMask(): DisplayObject {
        return this._mask;
    }

    setMask(obj: DisplayObject): void {
        if (this._mask) {
            this._mask.isMask = false;
        }

        this._mask = obj;

        this._mask.isMask = true;
    }

    getEnabled(): boolean {
        return this._enabled;
    }

    setEnabled(v: boolean): void {
        this._enabled = v;
    }

    getTarget(): string {
        return this._target;
    }

    setTarget(v: string): void {
        this._target = v;
    }

    splitPath(path: string): Path {
        var scope: DisplayObject = this;
        var target = path;
        var split;
        var targetPath = "";
        if (typeof path === "string") {
            if (path.indexOf("::") !== -1) {
                scope = this;
                target = path;
            } else if (path.indexOf(":") !== -1) {
                split = path.split(":");
                targetPath = split[0];
                target = split[1];
            } else if (path.indexOf(".") !== -1) {
                split = path.split(".");
                target = split.pop();
                targetPath += split.join(".");
            }

            if (targetPath !== "") {
                var mc = this.getDisplayObject(targetPath);
                if (mc) {
                    scope = mc;
                }
            }
        }

        return new Path(scope, target);
    }

    getProperty(name: string | number, parse: boolean = true): any {
        var _this: DisplayObject = this;
        var target = name;
        if (parse) {
            if (typeof name !== 'string')
                throw new Error('name can not be parsed: ' + name);

            var obj = _this.splitPath(name);
            _this = obj.scope;
            target = obj.target;
        }

        if (_this.removeFlag) {
            return undefined;
        }

        var value;
        var prop = (typeof target === "string") ? target.toLowerCase() : target;
        switch (prop) {
            case 0:
            case "_x":
                value = _this.getX();
                break;
            case 1:
            case "_y":
                value = _this.getY();
                break;
            case 2:
            case "_xscale":
                value = _this.getXScale();
                break;
            case 3:
            case "_yscale":
                value = _this.getYScale();
                break;
            case 4:
            case "_currentframe":
                if (CLS.isMovieClip(_this)) {
                    value = (_this as any).getCurrentFrame();
                }
                break;
            case 5:
            case "_totalframes":
                if (CLS.isMovieClip(_this)) {
                    value = (_this as any).getTotalFrames();
                }
                break;
            case 6:
            case "_alpha":
                value = _this.getAlpha();
                break;
            case 7:
            case "_visible":
                value = _this.getVisible();
                break;
            case 8:
            case "_width":
                value = _this.getWidth();
                break;
            case 9:
            case "_height":
                value = _this.getHeight();
                break;
            case 10:
            case "_rotation":
                value = _this.getRotation();
                break;
            case 11:
            case "_target":
                value = _this.getTarget();
                break;
            case 12:
            case "_framesloaded":
                value = _this._framesloaded;
                break;
            case 13:
            case "_name":
                value = _this.getName();
                break;
            case 14:
            case "_droptarget":
                if (CLS.isMovieClip(_this)) {
                    value = (_this as any).getDropTarget();
                }
                break;
            case 15:
            case "_url":
                value = _this._url;
                break;
            case 16:
            case "_highquality":
                value = _this._highquality;
                break;
            case 17:
            case "_focusrect":
                value = _this._focusrect;
                break;
            case 18:
            case "_soundbuftime":
                value = _this._soundbuftime;
                break;
            case 19:
            case "_quality":
                value = _this._quality;
                break;
            case 20:
            case "_xmouse":
                value = _this.getXMouse();
                break;
            case 21:
            case "_ymouse":
                value = _this.getYMouse();
                break;
            case "text":
            case "htmltext":
                if (CLS.isTextField(_this)) {
                    _this = _this as any;
                    var variable = _this.getVariable("variable");
                    if (variable) {
                        var mc = _this.getParent();
                        value = mc.getProperty(variable);
                    } else {
                        value = _this.getVariable("text");
                    }
                } else {
                    value = _this.getVariable(target as string);
                }
                break;
            case "$version":
                value = "swf2js 8,0,0";
                break;
            case "enabled":
                value = _this.getEnabled();
                break;
            case "blendmode":
                value = _this.getBlendMode();
                break;
            case "sharedobject":
                value = new SharedObject();
                break;
            case "key":
                value = keyClass;
                break;
            case "mouse":
                var _root = _this.getDisplayObject("_root");
                var rootStage = _root.getStage();
                value = rootStage.mouse;
                break;
            default:
                value = _this.getVariable(target as string, parse);
                if (value === undefined && target !== name) {
                    value = _this.getGlobalVariable(name as string);
                }
                break;
        }

        return value;
    }

    setProperty(name: string | number, value: any, parse: boolean = true): void {
        var _this: DisplayObject = this;
        var target = name;
        if (parse) {
            if (typeof name !== 'string')
                throw new Error('Can not parse name: ' + name);

            var obj = _this.splitPath(name);
            _this = obj.scope;
            target = obj.target;
        }

        var prop = (typeof target === "string") ? target.toLowerCase() : target;
        switch (prop) {
            case 0:
            case "_x":
                _this.setX(value);
                break;
            case 1:
            case "_y":
                _this.setY(value);
                break;
            case 2:
            case "_xscale":
                _this.setXScale(value);
                break;
            case 3:
            case "_yscale":
                _this.setYScale(value);
                break;
            case 4:
            case "_currentframe":
            case 5:
            case "_totalframes":
            case 15:
            case "_url":
            case 20:
            case "_xmouse":
            case 21:
            case "_ymouse":
            case 11:
            case "_target":
            case 12:
            case "_framesloaded":
            case 14:
            case "_droptarget":
                // readonly
                break;
            case 6:
            case "_alpha":
                _this.setAlpha(value);
                break;
            case 7:
            case "_visible":
                _this.setVisible(value);
                break;
            case 8:
            case "_width":
                _this.setWidth(value);
                break;
            case 9:
            case "_height":
                _this.setHeight(value);
                break;
            case 10:
            case "_rotation":
                _this.setRotation(value);
                break;
            case 13:
            case "_name":
                _this.setName(value);
                break;
            case 16:
            case "_highquality":
                _this._highquality = value;
                break;
            case 17:
            case "_focusrect":
                _this._focusrect = value;
                break;
            case 18:
            case "_soundbuftime":
                _this._soundbuftime = value;
                break;
            case 19:
            case "_quality":
                _this._quality = value;
                break;
            case "text":
            case "htmltext":
                if (CLS.isTextField(_this)) {
                    _this = _this as any;
                    var variable = _this.getVariable("variable");
                    if (variable) {
                        var mc = _this.getParent();
                        mc.setProperty(variable, value);
                    } else {
                        _this.setVariable("text", value);
                    }
                    var input = (_this as any).input;
                    if (input) {
                        input.value = value;
                    }
                } else {
                    _this.setVariable(target as string, value);
                }
                break;
            case "blendmode":
                _this.setBlendMode(value);
                break;
            case "enabled":
                _this.setEnabled(value);
                break;
            case "filters":
                _this.setFilters(value);
                break;
            default:
                _this.setVariable(target as string, value);
                break;
        }
    }

    getDepth(): number {
        const depth = (this._depth !== undefined) ? this._depth : this.getLevel();
        return depth - 16384;
    }

    getX(): number {
        const matrix = this.getMatrix();
        return matrix[4] / 20;
    }

    setX(x: number): void {
        x = +x;
        if (isNaN(x))
            return;

        const matrix = this.cloneMatrix();
        matrix[4] = x * 20;
        this.setMatrix(matrix);
    }

    getY(): number {
        const matrix = this.getMatrix();
        return matrix[5] / 20;
    }

    setY(y: number): void {
        y = +y;
        if (isNaN(y))
            return;

        const matrix = this.cloneMatrix();
        matrix[5] = y * 20;
        this.setMatrix(matrix);
    }

    getXScale(): number {
        const matrix = this.getMatrix();
        let xScale = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]) * 100;
        if (matrix[0] < 0)
            xScale *= -1;
        return xScale;
    }

    setXScale(xscale: number): void {
        xscale = +xscale;
        if (isNaN(xscale))
            return;

        const matrix = this.cloneMatrix();
        const adjustment = (matrix[0] < 0) ? -1 : 1;
        const radianX = Math.atan2(matrix[1], matrix[0]);
        xscale /= 100;
        matrix[0] = xscale * Math.cos(radianX) * adjustment;
        matrix[1] = xscale * Math.sin(radianX) * adjustment;
        this.setMatrix(matrix);
    }

    getYScale(): number {
        const matrix = this.getMatrix();
        let yScale = Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3]) * 100;
        if (matrix[3] < 0)
            yScale *= -1;
        return yScale;
    }

    setYScale(yscale: number): void {
        yscale = +yscale;
        if (isNaN(yscale))
            return;

        const matrix = this.cloneMatrix();
        const adjustment = (matrix[3] < 0) ? -1 : 1;
        const radianY = Math.atan2(-matrix[2], matrix[3]);
        yscale /= 100;
        matrix[2] = -yscale * Math.sin(radianY) * adjustment;
        matrix[3] = yscale * Math.cos(radianY) * adjustment;
        this.setMatrix(matrix);
    }

    getAlpha(): number {
        const colorTransform = this.getColorTransform();
        const alpha = colorTransform[3] + (colorTransform[7] / 255);
        return alpha * 100;
    }

    setAlpha(alpha: number): void {
        alpha = +alpha;
        if (isNaN(alpha))
            return;

        const colorTransform = cloneArray(this.getColorTransform());
        colorTransform[3] = alpha / 100;
        colorTransform[7] = 0;
        this.setColorTransform(colorTransform);
    }

    getVisible(): boolean {
        const stage = this.getStage();
        const version = stage.swftag.version;

        if (version <= 4)
            return ((this.__visible) ? 1 : 0) as any;

        return this.__visible;
    }

    setVisible(visible: number | boolean): void {
        if (typeof visible === "boolean") {
            this.__visible = visible;
        } else {
            visible = +visible;
            if (!isNaN(visible)) {
                this.__visible = (visible) ? true : false;
            }
        }
    }

    getLevel(): number {
        return this._level;
    }

    setLevel(level: number): void {
        this._level = level;
    }

    getName(): string {
        return this.__name;
    }

    setName(name: string): void {
        this.__name = name;
    }

    getRotation(): number {
        const matrix = this.getMatrix();
        let rotation = Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI;
        switch (rotation) {
            case -90.00000000000001:
                rotation = -90;
                break;
            case 90.00000000000001:
                rotation = 90;
                break;
        }
        return rotation;
    }

    setRotation(rotation: number): void {
        rotation = +rotation;
        if (isNaN(rotation))
            return;

        const matrix = this.cloneMatrix();
        let radianX = Math.atan2(matrix[1], matrix[0]);
        let radianY = Math.atan2(-matrix[2], matrix[3]);
        const scaleX = Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]);
        const scaleY = Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3]);
        rotation *= Math.PI / 180;
        radianY += rotation - radianX;
        radianX = rotation;
        matrix[0] = scaleX * Math.cos(radianX);
        matrix[1] = scaleX * Math.sin(radianX);
        matrix[2] = -scaleY * Math.sin(radianY);
        matrix[3] = scaleY * Math.cos(radianY);

        this.setMatrix(matrix);
    }

    getWidth(): number {
        const matrix = this.getMatrix();
        const bounds = this.getBounds(matrix);
        return Math.abs(bounds.xMax - bounds.xMin);
    }

    setWidth(width: number): void {
        width = +width;
        if (isNaN(width))
            return;

        const matrix = this.getOriginMatrix();
        const bounds = this.getBounds(matrix);
        const _width = Math.abs(bounds.xMax - bounds.xMin);
        let xScale = width * matrix[0] / _width;
        if (isNaN(xScale))
            xScale = 0;

        const newMatrix = this.cloneMatrix();
        newMatrix[0] = xScale;
        this.setMatrix(newMatrix);
    }

    getHeight(): number {
        const matrix = this.getMatrix();
        const bounds = this.getBounds(matrix);
        return Math.abs(bounds.yMax - bounds.yMin);
    }

    setHeight(height: number): void {
        height = +height;
        if (isNaN(height))
            return;

        const matrix = this.getOriginMatrix();
        const bounds = this.getBounds(matrix);
        const _height = Math.abs(bounds.yMax - bounds.yMin);
        let yScale = height * matrix[3] / _height;
        if (isNaN(yScale))
            yScale = 0;

        const newMatrix = this.cloneMatrix();
        newMatrix[3] = yScale;
        this.setMatrix(newMatrix);
    }

    getXMouse(): number {
        const _event = DisplayObject.event;

        if (!_event) {
            return null;
        }
        var _this = this;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();
        var div = document.getElementById(stage.getName());
        var bounds = div.getBoundingClientRect();
        var docBody = document.body;
        var x = docBody.scrollLeft + bounds.left;
        var touchX = 0;
        if (isTouchEvent(_event)) {
            var changedTouche = _event.changedTouches[0];
            touchX = changedTouche.pageX;
        } else {
            touchX = _event.pageX;
        }

        var mc: DisplayObject = _this;
        var matrix = _this.getMatrix();
        while (true) {
            var parent = mc.getParent();
            if (!parent) {
                break;
            }
            matrix = multiplicationMatrix(parent.getMatrix(), matrix);
            mc = parent;
        }

        var scale = stage.getScale();
        touchX -= x;
        touchX /= scale;
        touchX -= matrix[4] / 20;
        return touchX;
    }

    getYMouse(): number {
        const _event = DisplayObject.event;

        if (!_event) {
            return null;
        }
        var _this = this;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();
        var div = document.getElementById(stage.getName());
        var bounds = div.getBoundingClientRect();
        var docBody = document.body;
        var y = docBody.scrollTop + bounds.top;
        var touchY = 0;
        if (isTouchEvent(_event)) {
            var changedTouche = _event.changedTouches[0];
            touchY = changedTouche.pageY;
        } else {
            touchY = _event.pageY;
        }

        var mc: DisplayObject = _this;
        var matrix = _this.getMatrix();
        while (true) {
            var parent = mc.getParent();
            if (!parent) {
                break;
            }
            matrix = multiplicationMatrix(parent.getMatrix(), matrix);
            mc = parent;
        }

        var scale = stage.getScale();
        touchY -= y;
        touchY /= scale;
        touchY -= matrix[5] / 20;
        return touchY;
    }

    getVariable(name?: string, parse: boolean = true): any {
        var _this = this;
        if (name === undefined) {
            return undefined;
        }

        var variables = _this.variables;
        if (!variables) {
            return undefined;
        }

        if (name in variables) {
            return variables[name];
        }

        var stage = _this.getStage();
        var version = stage.swftag.version;
        if (version < 7) {
            for (var key in variables) {
                if (!variables.hasOwnProperty(key)) {
                    continue;
                }
                if (key.toLowerCase() === name.toLowerCase()) {
                    return variables[key];
                }
            }
        }

        var value;
        if (version > 4) {
            var registerClass = variables.registerClass;
            if (registerClass &&
                typeof registerClass === "object" &&
                name in registerClass
            ) {
                return registerClass[name];
            }

            if (CLS.isMovieClip(_this)) {
                value = (_this as any).getDisplayObject(name, parse);
                if (value) {
                    return value;
                }
            }

            // avm2
            var cId = _this.getCharacterId();
            var symbol = stage.swftag.symbols[cId];
            if (symbol) {
                var symbols = symbol.split(".");
                var classMethod = symbols.pop();
                var sLen = symbols.length;
                var classObj = stage.avm2;
                for (var sIdx = 0; sIdx < sLen; sIdx++) {
                    classObj = classObj[symbols[sIdx]];
                }

                var AVM2 = classObj[classMethod];
                value = AVM2[name];
                if (value) {
                    return value;
                }
            }

            var _global = stage.getGlobal();
            value = _global.getVariable(name);
            if (value) {
                return value;
            }
            if (CLS.isMovieClip(_this) && name === "flash") {
                return (_this as any).flash;
            }
            if (name in window) {
                return window[name];
            }
        }
        return undefined;
    }

    setVariable(name: string | number, value: any): void {
        var _this = this;
        var variables = _this.variables;
        var stage = _this.getStage();
        if (typeof name !== "string") {
            name = '' + name;
        }

        if (stage.swftag.version < 7) {
            for (var key in variables) {
                if (!variables.hasOwnProperty(key)) {
                    continue;
                }
                if (key.toLowerCase() !== name.toLowerCase()) {
                    continue;
                }
                _this.variables[key] = value;

                return;
            }
        }
        _this.variables[name] = value;
    }

    getGlobalVariable(path: string): any {
        var _this = this;
        var stage = _this.getStage();
        var version = stage.swftag.version;
        if (version < 5) {
            return undefined;
        }

        var splitData = null;
        if (path.indexOf(".") !== -1) {
            splitData = path.split(".");
        }

        var value;
        if (splitData) {
            var _global = stage.getGlobal();
            var variables = _global.variables;
            var length = splitData.length;
            for (var i = 0; i < length; i++) {
                var name = splitData[i];
                if (version < 7) {
                    for (var key in variables) {
                        if (!variables.hasOwnProperty(key)) {
                            continue;
                        }
                        if (key.toLowerCase() === name.toLowerCase()) {
                            value = variables[key];
                            break;
                        }
                    }
                } else {
                    value = variables[name];
                }

                if (!value) {
                    break;
                }
                variables = value;
            }
        }

        return value;
    }

    getDisplayObject(path: string | number = '', parse: boolean = true): DisplayObject | undefined {
        var _this = this;
        var mc: DisplayObject = _this;
        var _root = mc;
        var tags, tag, stage, parent;

        if (!_this._lockroot) {
            while (true) {
                parent = _root.getParent();
                if (!parent) {
                    break;
                }
                _root = parent;
            }
        } else {
            stage = _this.getStage();
            _root = stage.getParent();
        }

        if (typeof path !== "string") {
            path = '' + path;
        }
        if (path === "_root") {
            return _root;
        }
        if (path === "this") {
            return this;
        }
        stage = _root.getStage();
        if (path === "_global") {
            return stage.getGlobal();
        }

        parent = mc.getParent();
        if (path === "_parent") {
            return (parent !== null) ? parent : undefined;
        }

        var len = 1;
        var splitData = [path];
        if (parse) {
            if (path.indexOf("/") !== -1) {
                splitData = path.split("/");
                len = splitData.length;
                if (splitData[0] === "") {
                    mc = _root;
                }
            } else if (path.indexOf(".") !== -1) {
                splitData = path.split(".");
                len = splitData.length;
                if (splitData[0] === "_root") {
                    mc = _root;
                }
            } else if (path.substr(0, 6) === "_level") {
                const level = +(path.substr(6));
                if (level === 0) {
                    return _root;
                }
                if (!parent) {
                    parent = stage.getParent();
                }
                tags = parent.getTags();
                if (level in tags) {
                    var tId = tags[level];
                    tag = stage.getInstance(tId);
                    if (CLS.isMovieClip(tag)) {
                        return tag;
                    }
                }
                return undefined;
            }
        }

        var version = stage.getVersion();
        for (var i = 0; i < len; i++) {
            var name = splitData[i];
            if (name === "") {
                continue;
            }
            if (name === "_root") {
                mc = _root;
                continue;
            }
            if (name === "this") {
                mc = _this;
                continue;
            }
            if (name === "_parent") {
                parent = mc.getParent();
                if (!parent) {
                    return undefined;
                }
                mc = parent;
                continue;
            }
            if (name === "..") {
                mc = mc.getParent();

                if (!mc) {
                    return undefined;
                }
                continue;
            }

            tags = (mc as any).getTags();
            if (tags === undefined) {
                return undefined;
            }

            var tagLength = tags.length;
            var setTarget = false;
            if (tagLength > 0) {
                for (var idx in tags) {
                    if (!tags.hasOwnProperty(idx)) {
                        continue;
                    }

                    var instanceId = tags[idx];
                    var loadStage = mc.getStage();
                    tag = loadStage.getInstance(instanceId);
                    if (!tag || tag.removeFlag) {
                        continue;
                    }

                    var tagName = tag.getName();
                    if (!tagName) {
                        continue;
                    }

                    if (version < 7) {
                        if (tagName.toLowerCase() === name.toLowerCase()) {
                            mc = tag;
                            setTarget = true;
                            break;
                        }
                    } else {
                        if (tagName === name) {
                            mc = tag;
                            setTarget = true;
                            break;
                        }
                    }
                }
            }

            if (!setTarget) {
                return undefined;
            }
        }
        return mc;
    }

    preRender(ctx: CanvasRenderingContext2D,
              matrix: Matrix,
              colorTransform: ColorTransform,
              stage: Stage,
              visible: boolean): PreRenderResult
    {
        var _this = this;
        _this.isLoad = true;

        var cacheKey = "";
        var preCtx = ctx;
        var preMatrix = matrix;

        var isFilter = false;
        var isBlend = false;
        var cache, rMatrix, xScale, yScale, xMin, yMin, xMax, yMax;

        // mask
        var maskObj = _this.getMask();
        if (maskObj) {
            _this.renderMask(ctx, stage);
        }

        // filter
        if (visible && !stage.clipMc) {
            var filters = _this.getFilters();
            if (filters !== null && filters.length) {
                isFilter = true;
            }

            // blend
            var blendMode = _this.getBlendMode();
            if (blendMode !== null && blendMode !== "normal") {
                isBlend = true;
            }
        }

        // filter or blend
        if (isFilter || isBlend) {
            rMatrix = multiplicationMatrix(stage.getMatrix(), matrix);

            var bounds;
            var twips = 1;
            if (CLS.isShape(_this) || CLS.isStaticText(_this)) {
                bounds = _this.getBounds();
                xScale = Math.sqrt(rMatrix[0] * rMatrix[0] + rMatrix[1] * rMatrix[1]);
                yScale = Math.sqrt(rMatrix[2] * rMatrix[2] + rMatrix[3] * rMatrix[3]);
            } else {
                twips = 20;
                bounds = _this.getBounds(matrix);
                xScale = stage.getScale() * devicePixelRatio;
                yScale = stage.getScale() * devicePixelRatio;
            }

            xMin = bounds.xMin;
            yMin = bounds.yMin;
            xMax = bounds.xMax;
            yMax = bounds.yMax;

            var width = Math.abs(Math.ceil((xMax - xMin) * xScale));
            var height = Math.abs(Math.ceil((yMax - yMin) * yScale));

            var canvas = cacheStore.getCanvas();
            canvas.width = width || 1;
            canvas.height = height || 1;
            cache = canvas.getContext("2d");
            cache._offsetX = 0;
            cache._offsetY = 0;

            var m2: Matrix = [1, 0, 0, 1, -xMin * twips, -yMin * twips];
            var m3: Matrix = [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]];
            if (CLS.isShape(_this)) {
                m3[4] = 0;
                m3[5] = 0;
            }
            preCtx = cache;
            preMatrix = multiplicationMatrix(m2, m3);
        }

        return {
            preCtx: preCtx,
            preMatrix: preMatrix,
            isFilter: isFilter,
            isBlend: isBlend,
            rMatrix: rMatrix,
            cacheKey: cacheKey,
            xMin: xMin * xScale,
            yMin: yMin * yScale
        };
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        return '';
    }

    postRender(ctx: CanvasRenderingContext2D,
               matrix: Matrix,
               colorTransform: ColorTransform,
               stage: Stage,
               obj: PreRenderResult): void
    {
        var _this = this;
        var cache = obj.preCtx;
        var isFilter = obj.isFilter;
        var cacheKey = obj.cacheKey;
        if (isFilter && cacheKey !== "") {
            cache = _this.renderFilter(cache, matrix, colorTransform, stage, cacheKey);
        }

        var xMin = obj.xMin;
        var yMin = obj.yMin;
        if (CLS.isShape(_this)) {
            xMin += obj.rMatrix[4];
            yMin += obj.rMatrix[5];
        }
        if (cache) {
            xMin -= cache._offsetX;
            yMin -= cache._offsetY;
        }

        _this.renderBlend(ctx, cache, xMin, yMin, isFilter);
    }


    renderMask(ctx: CanvasRenderingContext2D, stage: Stage): void {
        var _this = this;
        var maskObj = _this.getMask();
        if (maskObj) {
            ctx.save();
            ctx.beginPath();
            stage.clipMc = true;

            var mc = maskObj;
            var matrix: Matrix = [1,0,0,1,0,0];
            while (true) {
                var parent = mc.getParent();
                if (!parent.getParent()) {
                    break;
                }
                matrix = multiplicationMatrix(parent.getMatrix(), matrix);
                mc = parent;
            }
            maskObj.render(ctx, matrix, [1,1,1,1,0,0,0,0], stage, true);
            ctx.clip();
            stage.clipMc = false;
        }
    }

    getFilterKey(filters: BitmapFilter[]): string {
        const keys = [];
        for (const filter of filters) {
            for (const prop in filter) {
                if (filter.hasOwnProperty(prop))
                    keys.push(filter[prop]);
            }
        }
        return keys.join("_");
    }

    renderFilter(ctx: CanvasRenderingContext2D,
                 matrix: Matrix,
                 colorTransform: ColorTransform,
                 stage: Stage,
                 cacheKey: string): CanvasRenderingContext2D
    {
        var _this = this;
        var filters = _this.getFilters();
        if (stage.clipMc || !filters || !filters.length) {
            return ctx;
        }

        cacheKey += "_" + _this.getFilterKey(filters);
        var cacheStoreKey = "Filter_" + _this.instanceId;

        var cache;
        if (_this._filterCacheKey === cacheKey) {
            cache = cacheStore.getCache(cacheStoreKey);
        }

        if (!cache) {
            var fLength = filters.length;
            for (var i = 0; i < fLength; i++) {
                var filter = filters[i];
                cache = filter.render(ctx, matrix, colorTransform, stage);
            }
            _this._filterCacheKey = cacheKey;
            cacheStore.setCache(cacheStoreKey, cache);
        }

        cacheStore.destroy(ctx);

        return cache;
    }

    renderBlend(ctx: CanvasRenderingContext2D,
                cache: CanvasRenderingContext2D,
                xMin: number,
                yMin: number,
                isFilter: boolean): void
    {
        var _this = this;
        var mode = _this.getBlendMode();
        var operation = "source-over";
        var canvas = cache.canvas;
        var width = canvas.width;
        var height = canvas.height;
        cache.setTransform(1, 0, 0, 1, 0, 0);

        switch (mode) {
            case "multiply":
                operation = "multiply";
                break;
            case "screen":
                operation = "screen";
                break;
            case "lighten":
                operation = "lighten";
                break;
            case "darken":
                operation = "darken";
                break;
            case "difference":
                operation = "difference";
                break;
            case "add":
                operation = "lighter";
                break;
            case "subtract":
                cache.globalCompositeOperation = "difference";
                cache.fillStyle = "rgb(255,255,255)";
                cache.fillRect(0, 0, width, height);
                cache.globalCompositeOperation = "darken";
                cache.fillStyle = "rgb(255,255,255)";
                cache.fillRect(0, 0, width, height);
                operation = "color-burn";
                break;
            case "invert":
                cache.globalCompositeOperation = "difference";
                cache.fillStyle = "rgb(255,255,255)";
                cache.fillRect(0, 0, width, height);
                cache.globalCompositeOperation = "lighter";
                cache.fillStyle = "rgb(255,255,255)";
                cache.fillRect(0, 0, width, height);
                operation = "difference";
                break;
            case "alpha":
                operation = "source-over";
                break;
            case "erase":
                operation = "destination-out";
                break;
            case "overlay":
                operation = "overlay";
                break;
            case "hardlight":
                operation = "hard-light";
                break;
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = operation;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(canvas, xMin, yMin, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
        if (!isFilter) {
            cacheStore.destroy(cache);
        }
    }

    getOriginMatrix(): Matrix {
        const controller = this.getController();
        return controller.getMatrix();
    }

    cloneMatrix(): Matrix {
        return cloneArray(this.getMatrix());
    }

    getMatrix(): Matrix {
        const m = this._matrix || this.getOriginMatrix();

        if (!m)
            throw new Error('No matrix');

        return m;
    }

    setMatrix(matrix: Matrix): void {
        this._matrix = matrix;
        this.setController(true, false, false, false);
    }

    getOriginColorTransform(): ColorTransform {
        const controller = this.getController();
        return controller.getColorTransform();
    }

    getColorTransform(): ColorTransform {
        return this._colorTransform || this.getOriginColorTransform();
    }

    setColorTransform(colorTransform: ColorTransform): void {
        this._colorTransform = colorTransform;
        this.setController(false, true, false, false);
    }

    getOriginBlendMode(): BlendMode {
        var controller = this.getController();
        return controller.getBlendMode();
    }

    getBlendMode(): BlendMode {
        return this._blendMode || this.getOriginBlendMode();
    }

    setBlendMode(blendMode: BlendMode | string | number): void {
        const mode = getBlendName(blendMode);
        if (mode !== null) {
            this._blendMode = mode;
            this.setController(false, false, false, true);
        }
    }

    getOriginFilters(): BitmapFilter[] {
        const controller = this.getController();
        return controller.getFilters();
    }

    getFilters(): BitmapFilter[] {
        return this._filters || this.getOriginFilters();
    }

    setFilters(filters?: BitmapFilter[]): void {
        this._filterCacheKey = undefined;
        this._filters = filters;
        this.setController(false, false, true, false);
    }

    setController(isMatrix: boolean, isColorTransform: boolean, isFilters: boolean, isBlend: boolean): void {
        if (!isMatrix) {
            var _matrix = this._matrix;
            if (!_matrix) {
                _matrix = this.getMatrix();
                this._matrix = cloneArray(_matrix);
            }
        }

        if (!isColorTransform) {
            var _colorTransform = this._colorTransform;
            if (!_colorTransform) {
                _colorTransform = this.getColorTransform();
                this._colorTransform = cloneArray(_colorTransform);
            }
        }

        if (!isFilters) {
            var _filters = this._filters;
            if (!_filters) {
                _filters = this.getFilters();
                if (!_filters) {
                    _filters = [];
                }
                this._filters = _filters;
            }
        }

        if (!isBlend) {
            var _blendMode = this._blendMode;
            if (!_blendMode) {
                _blendMode = this.getBlendMode();
                this._blendMode = _blendMode;
            }
        }
    }

    getController(): PlaceObject {
        var _this = this;
        var frame = 0;
        var depth = _this.getLevel();
        var stage = _this.getParentStage();
        if (!stage) {
            return new PlaceObject();
        }

        var parent = _this.getParentSprite();
        if (!parent) {
            parent = _this.getParent();
        }
        if (!parent) {
            return new PlaceObject();
        }

        if (CLS.isMovieClip(parent)) {
            frame = (parent as any).getCurrentFrame();
        }
        var placeObject = stage.getPlaceObject(parent.instanceId, depth, frame);
        if (!placeObject) {
            stage = _this.getLoadStage();
            if (stage) {
                placeObject = stage.getPlaceObject(parent.instanceId, depth, frame);
            }
        }

        return placeObject || new PlaceObject();
    }

    reset(): void {
        var _this = this;
        _this.active = false;
        _this.isMask = false;
        _this._matrix = null;
        _this._colorTransform = null;
        _this._filters = null;
        _this._blendMode = null;
        _this._depth = null;
        _this.setVisible(true);
        _this.setEnabled(true);
        _this.setButtonStatus("up");
    }

    trace() {
        var params = ["[trace]"];
        var length = arguments.length;
        for (var i = 0; i < length; i++) {
            params[params.length] = arguments[i];
        }
        console.log.apply(window, params);
    }

    getBounds(matrix: Matrix, status?: ButtonStatus): Bounds {
        var _this = this;
        var tags = (_this as any).getTags();
        var xMax = 0;
        var yMax = 0;
        var xMin = 0;
        var yMin = 0;
        var graphics = (_this as any).graphics;
        var isDraw = graphics && graphics.isDraw;
        if (isDraw) {
            var maxWidth = graphics.maxWidth;
            var halfWidth = maxWidth / 2;
            var gBounds = graphics.bounds.transform(matrix);
            var twips = (matrix) ? 20 : 1;
            xMin = (gBounds.xMin - halfWidth) / twips;
            xMax = (gBounds.xMax + halfWidth) / twips;
            yMin = (gBounds.yMin - halfWidth) / twips;
            yMax = (gBounds.yMax + halfWidth) / twips;
        }

        var length = tags.length;
        var stage = _this.getStage();
        if (length) {
            if (!isDraw) {
                var no = Number.MAX_VALUE;
                xMax = -no;
                yMax = -no;
                xMin = no;
                yMin = no;
            }

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
                var bounds = tag.getBounds(matrix2);
                if (!bounds) {
                    continue;
                }

                xMin = Math.min(xMin, bounds.xMin);
                xMax = Math.max(xMax, bounds.xMax);
                yMin = Math.min(yMin, bounds.yMin);
                yMax = Math.max(yMax, bounds.yMax);
            }
        }

        return new Bounds(xMin, yMin, xMax, yMax);
    }


    initFrame(): void {
    }

    addActions(stage: Stage): void {
    }

    getTags(): any {
        return undefined;
    }

    setHitRange(matrix: Matrix, stage: Stage, visible: boolean): void {
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        return false;
    }

    hitCheck(ctx: CanvasRenderingContext2D,
             matrix: Matrix,
             stage: Stage,
             x: number,
             y: number): HitObject | undefined
    {
        return undefined;
    }
}

