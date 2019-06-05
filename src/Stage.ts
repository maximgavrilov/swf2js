/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { ActionScript } from './ActionScript';
import { BitIO, DataIO } from './BitIO';
import { clipEvent, ClipEvent, EventDispatcher } from './EventDispatcher';
import { ButtonStatus, DisplayObject, HitObject } from './DisplayObject';
import { Global } from './Global';
import { PlaceObject } from './PlaceObject';
import { keyClass } from './Key';
import { Mouse } from './Mouse';
import { MCAction, MovieClip } from './MovieClip';
import { Packages } from './Packages';
import { SimpleButton } from './SimpleButton';
import { Sprite } from './Sprite';
import { SwfTag } from './SwfTag';
import { TextField } from './TextField';
import {
    ColorTransform, HitEvent, Matrix,
    tmpContext,
    devicePixelRatio, isAndroid, isChrome, isTouch,
    cloneArray, isTouchEvent, Writeable
} from './utils';


export type StageOptions = any;

export type Action = {
    as?: Function | Function[];
    mc: EventDispatcher;
    args?: any[];
};

export type ButtonHit = {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    parent: DisplayObject;
    matrix?: Matrix;
    button?: SimpleButton;
    CondKeyPress?: number;
};

export type DragRules = {
    startX: number;
    startY: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
};

const requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    (window as any).mozRequestAnimationFrame ||
    ((cb) => window.setTimeout(cb, 0));

let quality = 1;
let _devicePixelRatio = devicePixelRatio * quality;

let startEvent: 'mousedown' | 'touchstart' = "mousedown";
let moveEvent: 'mousemove' | 'touchmove' = "mousemove";
let endEvent: 'mouseup' | 'touchend' = "mouseup";
if (isTouch) {
    startEvent = "touchstart";
    moveEvent = "touchmove";
    endEvent = "touchend";
}

export class Stage {
    public static stageId = 1;

    swftag?: SwfTag;

    id = Stage.stageId++;
    name = 'swf2js_' + this.id;
    fileSize = 0;
    clipMc = false;
    isClipDepth = false;
    context?: CanvasRenderingContext2D;

    readonly initActions: { [charactedId: number]: MCAction } = {};

    backgroundColor: string = "transparent";
    loadStatus = 0;
    hitContext: CanvasRenderingContext2D = null;
    isHit = false;

    dragMc: Sprite = null;
    dragRules: DragRules = null;

    bgcolor = null;
    tagId = null;

    private intervalId = 0;
    private frameRate = 0;
    private stopFlag = true;


    // options
    private optionWidth = 0;
    private optionHeight = 0;
    private callback = null;
    private renderMode = false;
    private FlashVars = {};
    private quality = "medium"; // low = 0.25, medium = 0.8, high = 1.0

    // event
    readonly mouse = new Mouse();

    // params
    private canvas = null;
    private preContext = null;
    private matrix: Matrix = [1,0,0,1,0,0];
    private _matrix: Matrix = [1,0,0,1,0,0];
    private _colorTransform: ColorTransform = [1,1,1,1,0,0,0,0];
    readonly buttonHits: ButtonHit[] = [];
    readonly downEventHits: Action[] = [];
    readonly moveEventHits: Action[] = [];
    readonly upEventHits: Action[] = [];
    readonly keyDownEventHits: Action[] = [];
    readonly keyUpEventHits: Action[] = [];
    readonly actions: Action[] = [];
    private instances = [];
    readonly placeObjects: {
        [instanceId: number]: {
            [frame: number]: {
                [depth: number]: PlaceObject;
            }
        }
    } = {};
    private isAction = true;
    private _global = new Global();
    private touchObj = null;
    private touchStatus = "up";
    private overObj = null;
    private touchEndAction = null;
    private scale = 1;
    private baseWidth = 0;
    private baseHeight = 0;
    private width = 0;
    private height = 0;
    private isTouchEvent = false;
    isLoad = false;
    readonly avm2 = new Packages(this);
    readonly abc = new Packages(this);
    private parent: MovieClip;

    // render
    readonly doneTags = [];
    readonly newTags = [];

    constructor() {
        const mc = new MovieClip();
        mc.setStage(this);
        this.setParent(mc);
    }

    getId(): number {
        return this.id;
    }

    setId(id: number): void {
        this.id = id;
    }

    getParent(): MovieClip {
        return this.parent;
    }

    setParent(parent: MovieClip): void {
        this.parent = parent;
    }

    getBackgroundColor(): string {
        return this.backgroundColor;
    }

    setBackgroundColor(r: number, g: number, b: number): void {
        this.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
    }

    getGlobal(): Global {
        return this._global;
    }

    play(): void {
        var _this = this;
        _this.stopFlag = false;

        var enterFrame = function (stage) {
            return function () {
                requestAnimationFrame(function () {
                    if (stage.isLoad && !stage.stopFlag) {
                        stage.nextFrame();
                    }
                });
            };
        };
        _this.intervalId = setInterval(enterFrame(_this), _this.getFrameRate());
    }

    stop(): void {
        var _this = this;
        _this.stopFlag = true;
        clearInterval(_this.intervalId);
    }

    getName(): string {
        return this.name;
    }

    setName(name: string): void {
        this.name = name;
    }

    setOptions(options?: StageOptions): void {
        if (!options)
            return;

        var _this = this;
        _this.optionWidth = options.width || _this.optionWidth;
        _this.optionHeight = options.height || _this.optionHeight;
        _this.callback = options.callback || _this.callback;
        _this.tagId = options.tagId || _this.tagId;
        _this.renderMode = options.renderMode || _this.renderMode;
        _this.FlashVars = options.FlashVars || _this.FlashVars;
        _this.quality = options.quality || _this.quality;
        _this.bgcolor = options.bgcolor || _this.bgcolor;

        // quality
        switch (_this.quality) {
            case "low":
                _devicePixelRatio = devicePixelRatio * 0.5;
                break;
            case "high":
                _devicePixelRatio = devicePixelRatio;
                break;
        }
    }

    getBaseWidth(): number {
        return this.baseWidth;
    }

    setBaseWidth(baseWidth: number): void {
        this.baseWidth = baseWidth;
    }

    getBaseHeight(): number {
        return this.baseHeight;
    }

    setBaseHeight(baseHeight: number): void {
        this.baseHeight = baseHeight;
    }

    getWidth(): number {
        return this.width;
    }

    setWidth(width: number): void {
        if (width < 0) {
            width *= -1;
        }

        this.width = width;
    }

    getHeight(): number {
        return this.height;
    }

    setHeight(height: number): void {
        if (height < 0) {
            height *= -1;
        }
        this.height = height;
    }

    getScale(): number {
        return this.scale;
    }

    setScale(scale: number): void {
        this.scale = scale;
    }

    getMatrix(): Matrix {
        return this.matrix;
    }

    setMatrix(matrix: Matrix): void {
        this.matrix = matrix;
    }

    getInstance(id: number): DisplayObject {
        return this.instances[id];
    }

    setInstance(instance: DisplayObject): void {
        this.instances[instance.instanceId] = instance;
    }

    getPlaceObject(instanceId: number, depth: number, frame: number): PlaceObject {
        var placeObjects = this.placeObjects;
        if (!(instanceId in placeObjects)) {
            return null;
        }
        var placeObject = placeObjects[instanceId];
        if (!(frame in placeObject)) {
            return null;
        }
        var tags = placeObject[frame];
        if (!(depth in tags)) {
            return null;
        }
        return tags[depth];
    }

    setPlaceObject(placeObject: PlaceObject, instanceId: number, depth: number, frame: number): void {
        var _this = this;
        var placeObjects = _this.placeObjects;
        if (!(instanceId in placeObjects)) {
            placeObjects[instanceId] = [];
        }
        if (!(frame in placeObjects[instanceId])) {
            placeObjects[instanceId][frame] = [];
        }
        placeObjects[instanceId][frame][depth] = placeObject;
    }

    copyPlaceObject(instanceId: number, depth: number, frame: number): void {
        var placeObject = this.getPlaceObject(instanceId, depth, frame - 1);
        this.setPlaceObject(placeObject, instanceId, depth, frame);
    }

    removePlaceObject(instanceId: number): void {
        delete this.placeObjects[instanceId];
        // delete this.instances[instanceId];
    }

    getFrameRate(): number {
        return this.frameRate;
    }

    setFrameRate(fps: number): void {
        this.frameRate = (1000 / fps) | 0;
    }

    loadEvent(): void {
        var _this = this;
        switch (_this.loadStatus) {
            case 2:
                _this.resize();
                _this.loadStatus++;
                break;
            case 3:
                if (!_this.isLoad || !_this.stopFlag || _this.swftag.imgUnLoadCount > 0) {
                    break;
                }
                _this.loadStatus++;
                _this.loaded();
                break;
        }
        if (_this.loadStatus !== 4) {
            setTimeout(function () { _this.loadEvent(); }, 0);
        }
    }

    parse(data: DataIO, url: string): void {
        var _this = this;
        _this.isLoad = false;
        var bitio = new BitIO(data);
        this.swftag = new SwfTag(bitio);

        _this.loadStatus++;

        var mc = _this.getParent();
        mc._url = location.href;

        // parse

        console.time('mc-parse');
        var tags = this.swftag.parse(mc);
        console.timeEnd('mc-parse');

        // mc reset
        mc.container = [];
        var frame = 1;
        var totalFrames = mc.getTotalFrames() + 1;
        while (frame < totalFrames) {
            mc.container[frame++] = [];
        }
        mc.instances = [];

        // build
        console.time('mc-build');
        this.swftag.buildStage(tags, this);
        console.timeEnd('mc-build');

        var query = url.split("?")[1];
        if (query) {
            var values = query.split("&");
            var length = values.length;
            while (length--) {
                var value = values[length];
                var pair = value.split("=");
                if (pair.length > 1) {
                    mc.setVariable(pair[0], pair[1]);
                }
            }
        }

        // FlashVars
        var vars = _this.FlashVars;
        for (var key in vars) {
            if (!vars.hasOwnProperty(key)) {
                continue;
            }
            mc.setVariable(key, vars[key]);
        }

        _this.isLoad = true;
    }

    resize(): void {
        var _this = this;
        var div = document.getElementById(_this.getName());
        if (!div) {
            return;
        }

        var oWidth = _this.optionWidth;
        var oHeight = _this.optionHeight;

        var element = document.documentElement;
        var innerWidth = Math.max(element.clientWidth, window.innerWidth || 0);
        var innerHeight = Math.max(element.clientHeight, window.innerHeight || 0);

        var parent = div.parentNode as HTMLElement;
        if (parent.tagName !== "BODY") {
            innerWidth = parent.offsetWidth;
            innerHeight = parent.offsetHeight;
        }
        var screenWidth = (oWidth > 0) ? oWidth : innerWidth;
        var screenHeight = (oHeight > 0) ? oHeight : innerHeight;

        var baseWidth = _this.getBaseWidth();
        var baseHeight = _this.getBaseHeight();
        var scale = Math.min((screenWidth / baseWidth), (screenHeight / baseHeight));
        var width = baseWidth * scale;
        var height = baseHeight * scale;

        if (width !== _this.getWidth() || height !== _this.getHeight()) {
            // div
            var style = div.style;
            style.width = width + "px";
            style.height = height + "px";
            style.top = '0';
            style.left = ((screenWidth / 2) - (width / 2)) + "px";

            width *= devicePixelRatio;
            height *= devicePixelRatio;

            _this.setScale(scale);
            _this.setWidth(width);
            _this.setHeight(height);

            // main
            var canvas = _this.context.canvas;
            canvas.width = width;
            canvas.height = height;

            // pre
            var preCanvas = _this.preContext.canvas;
            preCanvas.width = width;
            preCanvas.height = height;

            var hitCanvas = _this.hitContext.canvas;
            hitCanvas.width = width;
            hitCanvas.height = height;

            // tmp
            if (isAndroid && isChrome) {
                var tmpCanvas = tmpContext.canvas;
                tmpCanvas.width = width;
                tmpCanvas.height = height;
            }

            var mScale = scale * _devicePixelRatio / 20;
            _this.setMatrix(cloneArray([mScale, 0, 0, mScale, 0, 0]));
        }
    }

    loaded(): void {
        // reset
        const whis = this as Writeable<this>;
        whis.buttonHits = [];
        whis.downEventHits = [];
        whis.moveEventHits = [];
        whis.upEventHits = [];
        whis.keyDownEventHits = [];
        whis.keyUpEventHits = [];
        whis.actions = [];

        // DOM
        this.deleteNode();
        var div = document.getElementById(this.getName());
        if (div) {
            var mc = this.getParent();
            mc.initFrame();
            mc.addActions(this);
            this.executeAction();

            // callback
            var callback = this.callback;
            if (typeof callback === "function") {
                callback.call(window, mc);
            }

            this.render();
            this.renderMain();

            var ctx = this.context;
            var canvas = ctx.canvas;

            // load sound
            if (isTouch) {
                var loadSounds = this.swftag.loadSounds;
                var sLen = loadSounds.length;
                if (sLen) {
                    var loadSound = function ()
                    {
                        canvas.removeEventListener(startEvent, loadSound);
                        for (var i = sLen; i--;) {
                            if (!(i in loadSounds)) {
                                continue;
                            }
                            var audio = loadSounds[i];
                            audio.load();
                        }
                    };
                    canvas.addEventListener(startEvent, loadSound);
                }
            }

            canvas.addEventListener(startEvent, (event) => {
                DisplayObject.event = event;
                this.touchStart(event);
            });

            canvas.addEventListener(moveEvent, (event) => {
                DisplayObject.event = event;
                this.touchMove(event);
            });

            canvas.addEventListener(endEvent, (event) => {
                DisplayObject.event = event;
                this.touchEnd(event);
            });

            div.appendChild(canvas);

            this.play();
        }
    }

    deleteNode(tagId: string = this.getName()): void {
        var div = document.getElementById(tagId);
        if (div) {
            var childNodes = div.childNodes;
            var length = childNodes.length;
            if (length) {
                while (length--) {
                    div.removeChild(childNodes[length]);
                }
            }
        }
    }

    nextFrame(): void {
        const whis = this as Writeable<this>;
        whis.downEventHits = [];
        whis.moveEventHits = [];
        whis.upEventHits = [];
        whis.keyDownEventHits = [];
        whis.keyUpEventHits = [];

        // mouse event
        var parent = this.getParent();
        var mouse = this.mouse;
        var mouseEvents = mouse.events;
        var onMouseDown = mouseEvents.onMouseDown;
        if (onMouseDown) {
            this.downEventHits.push({as: onMouseDown, mc: parent});
        }
        var onMouseMove = mouseEvents.onMouseMove;
        if (onMouseMove) {
            this.moveEventHits.push({as: onMouseMove, mc: parent});
        }
        var onMouseUp = mouseEvents.onMouseUp;
        if (onMouseUp) {
            this.upEventHits.push({as: onMouseUp, mc: parent});
        }

        this.putFrame();
        this.addActions();
        this.executeAction();
        this.render();
        this.renderMain();
    }

    putFrame(): void {
        const _this = this as Writeable<this>;
        _this.newTags = [];
        var doneTags = _this.doneTags;
        var length = doneTags.length;
        if (length) {
            clipEvent.type = "enterFrame";
            var i = 0;
            while (i < length) {
                var tag = doneTags[i];
                tag.putFrame(_this, clipEvent);
                i++;
            }
        }
    }

    addActions(): void {
        var _this = this;
        var newTags = _this.newTags;
        var length = newTags.length;
        if (length) {
            var i = 0;
            while (i < length) {
                var tag = newTags[i];
                tag.addActions(_this);
                i++;
            }
        }
    }

    render(): void {
        var whis = this as Writeable<this>;
        whis.buttonHits = [];
        whis.doneTags = [];

        var ctx = this.preContext;
        ctx.globalCompositeOperation = "source-over";
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        var backgroundColor = this.getBackgroundColor();
        if (!backgroundColor || backgroundColor === "transparent") {
            // pre clear
            var canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
            // main clear
            var mainCtx = this.context;
            mainCtx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
        } else {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, this.getWidth() + 1, this.getHeight() + 1);
        }

        var mc = this.getParent();
        mc.render(ctx, this._matrix, this._colorTransform, this, true);
    }

    executeAction(): void {
        const whis = this as Writeable<this>;

        if (this.isAction && this.actions.length) {
            this.isAction = false;
            var i = 0;
            while (i < this.actions.length) {
                var obj = this.actions[i];
                i++;

                var mc = obj.mc;
                var args = obj.args || [];
                if (!mc.active) {
                    continue;
                }

                var actions = obj.as;
                if (typeof actions === "function") {
                    actions.apply(mc, args);
                } else {
                    var length = actions.length;
                    if (!length) {
                        continue;
                    }
                    var idx = 0;
                    while (idx < length) {
                        if (!(idx in actions)) {
                            continue;
                        }
                        var action = actions[idx];
                        if (typeof action === "function") {
                            action.apply(mc, args);
                        }
                        idx++;
                    }
                }
            }
        }
        whis.actions = [];
        this.isAction = true;
    }

    buttonAction(mc: DisplayObject, as: ActionScript): void {
        const whis = this as Writeable<this>;
        whis.downEventHits = [];
        whis.moveEventHits = [];
        whis.upEventHits = [];
        whis.keyDownEventHits = [];
        whis.keyUpEventHits = [];
        as.execute(mc);
        this.executeAction();
    }

    renderMain(): void {
        var _this = this;
        var preContext = _this.preContext;
        var preCanvas = preContext.canvas;
        var width = preCanvas.width;
        var height = preCanvas.height;
        if (width > 0 && height > 0) {
            var ctx = _this.context;
            ctx.setTransform(1,0,0,1,0,0);
            ctx.drawImage(preCanvas, 0, 0, width, height);
        }
    }

    reset(): void {
        const whis = this as Writeable<this>;
        var mc = new MovieClip();
        mc.reset();
        mc.setStage(this);
        this.parent = mc;
        this.instances = [];
        whis.buttonHits = [];
        whis.downEventHits = [];
        whis.moveEventHits = [];
        whis.upEventHits = [];
        whis.keyDownEventHits = [];
        whis.keyUpEventHits = [];
        whis.actions = [];
    }

    init(): void {
        var _this = this;
        var tagId = _this.tagId;
        var div;
        if (_this.getId() in DisplayObject.stages) {
            if (tagId) {
                if (document.readyState === "loading") {
                    var reTry = function ()
                    {
                        window.removeEventListener("DOMContentLoaded", reTry);
                        _this.init();
                    };
                    window.addEventListener("DOMContentLoaded", reTry);
                    return;
                }

                var container = document.getElementById(tagId);
                if (!container) {
                    alert("Not Found Tag ID:" + tagId);
                    return;
                }

                div = document.getElementById(_this.getName());
                if (div) {
                    _this.deleteNode();
                } else {
                    div = document.createElement("div");
                    div.id = _this.getName();
                    container.appendChild(div);
                }
            } else {
                document.body.insertAdjacentHTML("beforeend", "<div id='" + _this.getName() + "'></div>");
            }
        }

        div = document.getElementById(_this.getName());
        if (div) {
            _this.initStyle(div);
            _this.loading();
        }

        if (!_this.canvas) {
            _this.initCanvas();
        }

        _this.loadStatus++;
        _this.loadEvent();
    }

    initStyle(div: HTMLDivElement): void {
        var style;
        var _this = this;

        style = div.style;
        style.position = "relative";
        style.top = "0";
        style.backgroundColor = "transparent";
        style.overflow = "hidden";
        style["-webkit-backface-visibility"] = "hidden";

        var parent = div.parentNode as HTMLElement;
        var oWidth = _this.optionWidth;
        var oHeight = _this.optionHeight;
        var width;
        var height;
        if (parent.tagName === "BODY") {
            width = (oWidth > 0) ? oWidth : window.innerWidth;
            height = (oHeight > 0) ? oHeight : window.innerHeight;
        } else {
            width = (oWidth > 0) ? oWidth : parent.offsetWidth;
            height = (oHeight > 0) ? oHeight : parent.offsetHeight;
        }

        style.width = width + "px";
        style.height = height + "px";
        style['-webkit-user-select'] = "none";
    }

    initCanvas(): void {
        var _this = this;
        var style;
        var canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;

        style = canvas.style;
        style.zIndex = 0;
        style.position = "absolute";
        style.top = 0;
        style.left = 0;
        style.zoom = 100 / _devicePixelRatio + "%";
        style["-webkit-tap-highlight-color"] = "rgba(0,0,0,0)";

        style.MozTransformOrigin = "0 0";
        style.MozTransform = "scale(" + 1 / _devicePixelRatio + ")";

        if (isAndroid) {
            canvas.addEventListener("touchcancel", function ()
            {
                _this.touchEnd(DisplayObject.event);
            });
        }

        _this.context = canvas.getContext("2d");
        _this.canvas = canvas;

        var preCanvas = document.createElement("canvas");
        preCanvas.width = 1;
        preCanvas.height = 1;
        _this.preContext = preCanvas.getContext("2d");

        var hitCanvas = document.createElement("canvas");
        hitCanvas.width = 1;
        hitCanvas.height = 1;
        _this.hitContext = hitCanvas.getContext("2d");
    }

    loading(): void {
        var _this = this;
        var div = document.getElementById(_this.getName());
        var loadingId = _this.getName() + "_loading";
        var css = "<style>";
        css += "#" + loadingId + " {\n";
        // css += "z-index: 999;\n";
        css += "position: absolute;\n";
        css += "top: 50%;\n";
        css += "left: 50%;\n";
        css += "margin: -24px 0 0 -24px;\n";
        css += "width: 50px;\n";
        css += "height: 50px;\n";
        css += "border-radius: 50px;\n";
        css += "border: 8px solid #dcdcdc;\n";
        css += "border-right-color: transparent;\n";
        css += "box-sizing: border-box;\n";
        css += "-webkit-animation: " + loadingId + " 0.8s infinite linear;\n";
        css += "animation: " + loadingId + " 0.8s infinite linear;\n";
        css += "} \n";
        css += "@-webkit-keyframes " + loadingId + " {\n";
        css += "0% {-webkit-transform: rotate(0deg);}\n";
        css += "100% {-webkit-transform: rotate(360deg);}\n";
        css += "} \n";
        css += "@keyframes " + loadingId + " {\n";
        css += "0% {transform: rotate(0deg);}\n";
        css += "100% {transform: rotate(360deg);}\n";
        css += "} \n";
        css += "</style>";
        div.innerHTML = css;
        var loadingDiv = document.createElement("div");
        loadingDiv.id = loadingId;
        div.appendChild(loadingDiv);
    }

    reload(url: string, options: StageOptions): void {
        var _this = this;
        _this.stop();

        if (_this.loadStatus === 4) {
            _this.deleteNode();
        }

        _this.loadStatus = 0;
        _this.isLoad = false;
        _this.reset();

        var swf2js = (window as any).swf2js;
        return swf2js.load(url, {
            optionWidth: options.optionWidth || _this.optionWidth,
            optionHeight: options.optionHeight || _this.optionHeight,
            callback: options.callback || _this.callback,
            tagId: options.tagId || _this.tagId,
            renderMode: options.renderMode || _this.renderMode,
            FlashVars: options.FlashVars || _this.FlashVars,
            quality: options.quality || _this.quality,
            bgcolor: options.bgcolor || _this.bgcolor,
            stage: _this
        });
    }

    output(url: string, frame: number, width: number, height: number): void {
        var _this = this;
        if (!_this.isLoad || _this.stopFlag) {
            setTimeout(function ()
            {
                _this.output(url, frame, width, height);
            }, 500);
            return;
        }

        _this.stop();
        frame = frame || 1;
        width = width || _this.getWidth();
        height = height || _this.getHeight();

        // resize
        var mc = _this.getParent();
        mc.reset();
        mc.gotoAndStop(frame);
        if (width !== _this.getWidth() || height !== _this.getHeight()) {
            _this.optionWidth = width;
            _this.optionHeight = height;
            _this.resize();
        }

        // action
        mc.addActions(this);

        // backgroundColor
        var canvas = _this.preContext.canvas;
        var style = canvas.style;
        style.backgroundColor = _this.backgroundColor;

        // render
        _this.render();

        // output
        var xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("POST", url, true);
        xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttpRequest.onreadystatechange = function ()
        {
            var readyState = xmlHttpRequest.readyState;
            if (readyState === 4) {
                var status = xmlHttpRequest.status;
                switch (status) {
                    case 200:
                    case 304:
                        console.log("OUTPUT SUCCESS");
                        break;
                    default :
                        alert(xmlHttpRequest.statusText);
                        break;
                }
            }
        };
        var base64 = canvas.toDataURL();
        xmlHttpRequest.send("data=" + encodeURIComponent(base64));
    }

    hitCheck(event: HitEvent): HitObject | undefined {
        var _this = this;
        _this.isHit = false;
        var buttonHits = _this.buttonHits;
        var length = buttonHits.length;
        if (!length) {
            return undefined;
        }

        var div = document.getElementById(_this.getName());
        var bounds = div.getBoundingClientRect();
        var x = window.pageXOffset + bounds.left;
        var y = window.pageYOffset + bounds.top;
        var touchX = 0;
        var touchY = 0;

        if (isTouchEvent(event)) {
            var changedTouche = event.changedTouches[0];
            touchX = changedTouche.pageX;
            touchY = changedTouche.pageY;
        } else {
            touchX = event.pageX;
            touchY = event.pageY;
        }

        touchX -= x;
        touchY -= y;
        var scale = _this.getScale();

        touchX /= scale;
        touchY /= scale;

        var ctx = _this.hitContext;
        var hitCanvas = ctx.canvas;
        var hitWidth = hitCanvas.width;
        var hitHeight = hitCanvas.height;
        var chkX = touchX * scale * _devicePixelRatio;
        var chkY = touchY * scale * _devicePixelRatio;

        if (this.swftag.abcFlag) {
            var parent = _this.getParent();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, hitWidth, hitHeight);
            var ret = parent.hitCheck(ctx, [1,0,0,1,0,0], _this, chkX, chkY);
            return (typeof ret === "object") ? ret : undefined;
        }

        for (var i = length; i--;) {
            if (!(i in buttonHits)) {
                continue;
            }

            var hitObj = buttonHits[i];
            if (hitObj === undefined) {
                continue;
            }

            var hit = false;
            if (touchX >= hitObj.xMin && touchX <= hitObj.xMax &&
                touchY >= hitObj.yMin && touchY <= hitObj.yMax
            ) {
                var matrix = hitObj.matrix;
                if (matrix) {
                    var mc = hitObj.parent;
                    var button = hitObj.button;

                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                    ctx.clearRect(0, 0, hitWidth, hitHeight);
                    if (button) {
                        hit = button.renderHitTest(ctx, matrix, _this, chkX, chkY);
                    } else {
                        hit = mc.renderHitTest(ctx, matrix, _this, chkX, chkY);
                    }
                } else {
                    hit = true;
                }
            }

            if (hit) {
                event.preventDefault();
                _this.isHit = true;
                return hitObj;
            }
        }

        return undefined;
    }

    executeEventAction(actions: Function | Function[], caller: DisplayObject, args: any[] = []): void {
        if (actions) {
            if (typeof actions === "function") {
                actions.apply(caller, args);
            } else {
                var length = actions.length;
                if (length) {
                    var i = 0;
                    while (i < length) {
                        var action = actions[i];
                        if (typeof action === "function") {
                            action.apply(caller, args);
                        }
                        i++;
                    }
                }
            }
            this.executeAction();
        }
    }

    touchStart(event: HitEvent): void {
        var _this = this;
        if (_this.touchStatus === "up") {
            _this.touchStatus = "down";
            _this.isHit = false;
            _this.isTouchEvent = true;
            _this.touchEndAction = null;
            var downEventHits = _this.downEventHits;
            var length = downEventHits.length;
            var mc, as;
            if (length) {
                event.preventDefault();
                for (var i = 0; i < length; i++) {
                    var obj = downEventHits[i];
                    mc = obj.mc as DisplayObject;
                    as = obj.as;
                    if (!as) {
                        as = mc.onMouseDown;
                    }
                    _this.executeEventAction(as, mc);
                }
                (_this as Writeable<this>).downEventHits = [];
            }

            var hitObj = _this.hitCheck(event) as ButtonHit; // ANY
            if (_this.isHit) {
                mc = hitObj.parent;
                if (mc.active) {
                    mc.setButtonStatus("down");
                    if (mc instanceof TextField) {
                        _this.appendTextArea(mc, hitObj);
                    } else {
                        _this.executePress(mc, hitObj);
                    }
                }
                if (_this.touchObj === null) {
                    _this.touchObj = hitObj;
                }
            }
        }
    }

    private executePress(mc: DisplayObject, hitObj: ButtonHit): void {
        var _this = this;
        var isRender = false;
        var press;
        var onPress;
        var rollOver;
        var onRollOver;
        var cEvent = new ClipEvent();

        if (isTouch) {
            rollOver = mc.hasEventListener('rollOver');
            if (rollOver) {
                cEvent.type = "rollOver";
                cEvent.target = mc;
                _this.executeEventAction(rollOver, mc, [cEvent]);
                isRender = true;
            }

            onRollOver = mc.onRollOver;
            if (typeof onRollOver === "function") {
                _this.executeEventAction(onRollOver, mc);
                isRender = true;
            }
        }

        press = mc.hasEventListener('press');
        if (press) {
            cEvent.type = "press";
            cEvent.target = mc;
            _this.executeEventAction(press, mc, [cEvent]);
            isRender = true;
        }
        onPress = mc.onPress;
        if (typeof onPress === "function") {
            _this.executeEventAction(onPress, mc);
            isRender = true;
        }

        var button = hitObj.button;
        if (button) {

            if (isTouch) {
                rollOver = button.hasEventListener('rollOver');
                if (rollOver) {
                    cEvent.type = "rollOver";
                    cEvent.target = button;
                    _this.executeEventAction(rollOver, button, [cEvent]);
                }

                onRollOver = button.onRollOver;
                if (typeof onRollOver === "function") {
                    _this.executeEventAction(onRollOver, button);
                }
            }

            button.setButtonStatus("down");
            if (isTouch) {
                _this.executeButtonAction(button, mc, "CondIdleToOverUp");
            }

            var actions = button.getActions();
            var length = actions.length;
            if (length) {
                var touchObj = _this.touchObj;

                for (var idx = 0; idx < length; idx++) {
                    if (!(idx in actions)) {
                        continue;
                    }

                    var cond = actions[idx];
                    if (cond.CondOverDownToOverUp && touchObj === null) {
                        _this.touchEndAction = cond.ActionScript;
                        continue;
                    }

                    // enter
                    var keyPress = cond.CondKeyPress;
                    if (hitObj.CondKeyPress === 13 && hitObj.CondKeyPress !== keyPress) {
                        continue;
                    }

                    if (isTouch) {
                        if (keyPress === 13 ||
                            (keyPress >= 48 && keyPress <= 57) ||
                            cond.CondOverUpToOverDown
                        ) {
                            _this.buttonAction(mc, cond.ActionScript);
                        }
                    } else {
                        if (cond.CondOverUpToOverDown) {
                            _this.buttonAction(mc, cond.ActionScript);
                        }
                    }
                }
            }

            press = button.hasEventListener('press');
            if (press) {
                cEvent.type = "press";
                cEvent.target = button;
                _this.executeEventAction(press, button, [cEvent]);
            }

            onPress = button.onPress;
            if (typeof onPress === "function") {
                _this.executeEventAction(onPress, button);
            }

            var sprite = button.getSprite();
            sprite.startSound();

            button.addActions(_this);
            _this.executeAction();

            isRender = true;
        }

        if (isRender) {
            _this.touchRender();
        }

    }

    appendTextArea(textField: TextField, hitObj: ButtonHit): void {
        var _this = this;
        textField.inputActive = true;
        var element: any = document.getElementById(textField.getTagName());
        if (!element) {
            element = textField.input;
            var variable = textField.getProperty("variable");
            var text;
            if (variable) {
                var mc = textField.getParent();
                text = mc.getProperty(variable);
                if (text === undefined) {
                    text = textField.getVariable("text");
                }
            }
            if (text !== undefined) {
                element.value = text;
            }

            var maxLength = textField.getVariable("maxChars");
            if (maxLength) {
                element.maxLength = maxLength;
            }
            var border = textField.getVariable("border");
            if (border) {
                element.style.border = "1px solid black";
                var color = textField.getVariable("backgroundColor");
                element.style.backgroundColor = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
            }

            var scale = _this.getScale();
            var left = hitObj.xMin;
            var top = hitObj.yMin;
            var width = hitObj.xMax - left;
            var height = hitObj.yMax - top;
            element.style.left = Math.ceil(left * scale) - 3 + "px";
            element.style.top = Math.ceil(top * scale) - 3 + "px";
            element.style.width = Math.ceil(width * scale) + 6 + "px";
            element.style.height = Math.ceil(height * scale) + 6 + "px";

            var div = document.getElementById(_this.getName());
            if (div) {
                div.appendChild(element);
                element.focus();
                var focus = function (el)
                {
                    return function ()
                    {
                        el.focus();
                    };
                };
                setTimeout(focus(element), 10);
            }
        }
    }

    touchMove(event: HitEvent): void {
        var _this = this;
        var overObj = _this.overObj;
        var moveEventHits = _this.moveEventHits;
        var length = moveEventHits.length;
        var mc, as, button, events;
        var dragOver, onDragOver, dragOut, onDragOut, rollOver, onRollOver, rollOut, onRollOut;
        var cEvent = new ClipEvent();

        if (length) {
            event.preventDefault();
            for (var i = 0; i < length; i++) {
                var obj = moveEventHits[i];
                mc = obj.mc;
                as = obj.as;
                if (!as) {
                    as = mc.onMouseMove;
                }
                _this.executeEventAction(as, mc);
            }
            (_this as Writeable<this>).moveEventHits = [];
        }

        if (!isTouch || (isTouch && _this.isTouchEvent)) {
            var hitObj = null;
            var touchObj = _this.touchObj;
            if (touchObj || _this.touchStatus === "up") {
                hitObj = _this.hitCheck(event);
            }

            var sprite;
            var isRender = false;
            if (!isTouch) {
                var canvas = _this.canvas;
                if (_this.isHit || touchObj) {
                    if (hitObj) {
                        canvas.style.cursor = "pointer";
                    } else {
                        canvas.style.cursor = "auto";
                    }
                } else {
                    canvas.style.cursor = "auto";
                }
            }

            if (touchObj) {
                button = touchObj.button;
                mc = touchObj.parent;

                if (mc.active) {
                    _this.overObj = hitObj;
                    if (hitObj &&
                        hitObj.parent.instanceId === mc.instanceId &&
                        hitObj.button === button
                    ) {
                        if (mc.getButtonStatus() === "up") {
                            mc.setButtonStatus("down");
                            events = mc.events;
                            dragOver = events.dragOver;
                            if (dragOver) {
                                cEvent.type = "dragOver";
                                cEvent.target = mc;
                                isRender = true;
                                _this.executeEventAction(dragOver, mc, [cEvent]);
                            }
                            onDragOver = mc.onDragOver;
                            if (typeof onDragOver === "function") {
                                isRender = true;
                                _this.executeEventAction(onDragOver, mc);
                            }
                        }

                        if (button && button.getButtonStatus() === "up") {
                            button.setButtonStatus("down");
                            sprite = button.getSprite();
                            sprite.startSound();

                            events = button.events;
                            dragOver = events.dragOver;
                            if (dragOver) {
                                cEvent.type = "dragOver";
                                cEvent.target = button;
                                isRender = true;
                                _this.executeEventAction(dragOver, button, [cEvent]);
                            }
                            onDragOver = button.onDragOver;
                            if (typeof onDragOver === "function") {
                                isRender = true;
                                _this.executeEventAction(onDragOver, button);
                            }
                            button.addActions(_this);
                            _this.executeAction();
                        }
                    } else {
                        if (mc.getButtonStatus() === "down") {
                            events = mc.events;
                            dragOut = events.dragOut;
                            if (dragOut) {
                                cEvent.type = "dragOut";
                                cEvent.target = mc;
                                isRender = true;
                                _this.executeEventAction(dragOut, mc, [cEvent]);
                            }
                            onDragOut = mc.onDragOut;
                            if (typeof onDragOut === "function") {
                                isRender = true;
                                _this.executeEventAction(onDragOut, mc);
                            }
                        }
                        mc.setButtonStatus("up");

                        if (button) {
                            if (button.getButtonStatus() === "down") {
                                button.setButtonStatus("up");

                                events = button.events;
                                dragOut = events.dragOut;
                                if (dragOut) {
                                    cEvent.type = "dragOut";
                                    cEvent.target = button;
                                    isRender = true;
                                    _this.executeEventAction(dragOut, button, [cEvent]);
                                }
                                onDragOut = button.onDragOut;
                                if (typeof onDragOut === "function") {
                                    isRender = true;
                                    _this.executeEventAction(onDragOut, button);
                                }
                                button.addActions(_this);
                                _this.executeAction();
                            }
                        }
                    }
                }
            } else if (hitObj) {

                if (overObj) {
                    button = overObj.button;
                    if (button && button !== hitObj.button) {
                        mc = overObj.parent;
                        if (mc.active) {
                            button.setButtonStatus("up");
                            _this.executeButtonAction(button, mc, "CondOverUpToIdle");
                        }
                    }
                }

                button = hitObj.button;
                mc = hitObj.parent;
                if (!isTouch && mc.active) {
                    if (!overObj || overObj.parent !== mc) {
                        events = mc.events;
                        rollOver = events.rollOver;
                        if (rollOver) {
                            cEvent.type = "rollOver";
                            cEvent.target = mc;
                            isRender = true;
                            _this.executeEventAction(rollOver, mc, [cEvent]);
                        }

                        onRollOver = mc.onRollOver;
                        if (typeof onRollOver === "function") {
                            isRender = true;
                            _this.executeEventAction(onRollOver, mc);
                        }
                    }
                }

                if (button) {
                    button.setButtonStatus("over");
                    sprite = button.getSprite();
                    sprite.startSound();
                    if (!isTouch) {
                        if (!overObj || overObj.button !== button) {
                            isRender = true;
                            _this.executeButtonAction(button, mc, "CondIdleToOverUp");

                            events = button.events;
                            rollOver = events.rollOver;
                            if (rollOver) {
                                cEvent.type = "rollOver";
                                cEvent.target = button;
                                isRender = true;
                                _this.executeEventAction(rollOver, button, [cEvent]);
                            }
                            onRollOver = button.onRollOver;
                            if (typeof onRollOver === "function") {
                                _this.executeEventAction(onRollOver, button);
                            }
                        }
                    }
                    button.addActions(_this);
                    _this.executeAction();
                }

                _this.overObj = hitObj;
            } else if (_this.touchStatus === "up") {
                _this.overObj = null;
            }

            // RollOut
            if (!touchObj && overObj) {
                button = overObj.button;
                mc = overObj.parent;
                if (mc.active) {
                    if (!hitObj || hitObj.parent !== mc) {
                        mc.setButtonStatus("up");

                        events = mc.events;
                        rollOut = events.rollOut;
                        if (rollOut) {
                            cEvent.type = "rollOut";
                            cEvent.target = mc;
                            isRender = true;
                            _this.executeEventAction(rollOut, mc, [cEvent]);
                        }

                        onRollOut = mc.onRollOut;
                        if (typeof onRollOut === "function") {
                            isRender = true;
                            _this.executeEventAction(onRollOut, mc);
                        }
                    }

                    if (button && (!hitObj || hitObj.button !== button)) {
                        button.setButtonStatus("up");
                        _this.executeButtonAction(button, mc, "CondOverUpToIdle");

                        events = button.events;
                        rollOut = events.rollOut;
                        if (rollOut) {
                            cEvent.type = "rollOut";
                            cEvent.target = button;
                            isRender = true;
                            _this.executeEventAction(rollOut, button, [cEvent]);
                        }

                        onRollOut = button.onRollOut;
                        if (typeof onRollOut === "function") {
                            isRender = true;
                            _this.executeEventAction(onRollOut, button);
                        }
                        button.addActions(_this);
                        _this.executeAction();
                    }
                }
            }

            if (isRender) {
                _this.touchRender();
            }
        }

        var dragMc = _this.dragMc;
        if (dragMc) {
            event.preventDefault();
            dragMc.executeDrag();
            _this.isHit = true;
        }
    }

    touchEnd(event: HitEvent | KeyboardEvent): void {
        var _this = this;
        var cEvent = new ClipEvent();
        var button, mc, as, events, release, onRelease, releaseOutside, onReleaseOutside;
        var touchObj = _this.touchObj;
        if (touchObj) {
            button = touchObj.button;
            if (button) {
                button.setButtonStatus("up");
            }
        }

        var upEventHits = _this.upEventHits;
        var length = upEventHits.length;
        if (length) {
            event.preventDefault();
            for (var i = 0; i < length; i++) {
                var obj = upEventHits[i];
                mc = obj.mc as DisplayObject;
                as = obj.as;
                if (!as) {
                    as = mc.onMouseUp;
                }
                _this.executeEventAction(as, mc);
            }
            (_this as Writeable<this>).upEventHits = [];
        }

        if (!(event instanceof KeyboardEvent)) {
            var hitObj = _this.hitCheck(event);
            var dragMc = _this.dragMc;
            if (dragMc) {
                hitObj = touchObj;
                _this.isHit = true;
            }
        }

        var isRender = false;
        if (touchObj) {
            mc = touchObj.parent;
            mc.setButtonStatus("up");
            button = touchObj.button;

            if (_this.isHit) {
                var touchEndAction = _this.touchEndAction;
                if (mc.active) {
                    if (mc === hitObj.parent) {
                        if (touchEndAction !== null) {
                            _this.buttonAction(mc, touchEndAction);
                            isRender = true;
                        }

                        events = mc.events;
                        release = events.release;
                        if (release) {
                            cEvent.type = "release";
                            cEvent.target = mc;
                            _this.executeEventAction(release, mc, [cEvent]);
                            isRender = true;
                        }
                        onRelease = mc.onRelease;
                        if (typeof onRelease === "function") {
                            _this.executeEventAction(onRelease, mc);
                            isRender = true;
                        }
                    }

                    if (button) {
                        if (button === hitObj.button) {
                            events = button.events;
                            release = events.release;
                            if (release) {
                                cEvent.type = "release";
                                cEvent.target = button;
                                _this.executeEventAction(release, button, [cEvent]);
                            }

                            onRelease = button.onRelease;
                            if (typeof onRelease === "function") {
                                _this.executeEventAction(onRelease, button);
                            }
                        }

                        var status = "up";
                        if (!isTouch) {
                            if (hitObj && hitObj.button === button) {
                                status = "over";
                            }
                        }

                        button.setButtonStatus(status);

                        var sprite = button.getSprite("hit");
                        sprite.startSound();

                        button.addActions(_this);
                        _this.executeAction();

                        isRender = true;
                    }
                }
            }

            if (mc.active && (!hitObj || mc !== hitObj.parent)) {
                events = mc.events;
                releaseOutside = events.releaseOutside;
                if (releaseOutside) {
                    cEvent.type = "releaseOutside";
                    cEvent.target = mc;
                    _this.executeEventAction(releaseOutside, mc, [cEvent]);
                    isRender = true;
                }
                onReleaseOutside = mc.onReleaseOutside;
                if (typeof onReleaseOutside === "function") {
                    _this.executeEventAction(onReleaseOutside, mc);
                    isRender = true;
                }
            }

            if (button && (!hitObj || button !== hitObj.button)) {
                isRender = true;

                events = button.events;
                releaseOutside = events.releaseOutside;
                if (releaseOutside) {
                    cEvent.type = "releaseOutside";
                    cEvent.target = button;
                    _this.executeEventAction(releaseOutside, button, [cEvent]);
                    isRender = true;
                }

                onReleaseOutside = button.onReleaseOutside;
                if (typeof onReleaseOutside === "function") {
                    _this.executeEventAction(onReleaseOutside, button);
                }
                button.setButtonStatus("up");
                button.addActions(_this);
                _this.executeAction();
            }
        }

        _this.isHit = false;
        _this.isTouchEvent = false;
        _this.touchObj = null;
        _this.touchStatus = "up";

        if (!isTouch && !(event instanceof KeyboardEvent)) {
            _this.hitCheck(event);
            var canvas = _this.canvas;
            if (_this.isHit) {
                canvas.style.cursor = "pointer";
            } else {
                canvas.style.cursor = "auto";
            }
        }

        if (hitObj) {
            var rollOver, onRollOver;
            mc = hitObj.parent;
            if (!touchObj || mc !== touchObj.parent) {
                events = mc.events;
                rollOver = events.rollOver;
                if (rollOver) {
                    isRender = true;
                    cEvent.type = "rollOver";
                    cEvent.target = mc;
                    _this.executeEventAction(rollOver, mc, [cEvent]);
                }

                onRollOver = mc.onRollOver;
                if (typeof onRollOver === "function") {
                    isRender = true;
                    _this.executeEventAction(onRollOver, mc);
                }
            }

            button = hitObj.button;
            if (button) {
                if (!touchObj || button !== touchObj.button) {
                    events = button.events;
                    rollOver = events.rollOver;
                    if (rollOver) {
                        isRender = true;
                        cEvent.type = "rollOver";
                        cEvent.target = button;
                        _this.executeEventAction(rollOver, button, [cEvent]);
                    }

                    onRollOver = button.onRollOver;
                    if (typeof onRollOver === "function") {
                        isRender = true;
                        _this.executeEventAction(onRollOver, button);
                    }
                }
            }
        }

        if (isRender) {
            event.preventDefault();
            _this.touchRender();
        }

        keyClass.setEvent(null);
    }

    executeButtonAction(button: SimpleButton,
                        mc: DisplayObject,
                        status: ButtonStatus | "CondOverUpToIdle" | "CondIdleToOverUp"): void
    {
        var _this = this;
        var actions = button.getActions();
        var length = actions.length;
        if (length) {
            for (var idx = 0; idx < length; idx++) {
                if (!(idx in actions)) {
                    continue;
                }

                var cond = actions[idx];
                if (!cond[status]) {
                    continue;
                }

                _this.buttonAction(mc, cond.ActionScript);
            }
        }
    }

    touchRender(): void {
        this.render();
        this.renderMain();
    }
}
