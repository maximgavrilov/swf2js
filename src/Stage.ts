/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { ActionScript } from './ActionScript';
import { clipEvent, ClipEvent, EventDispatcher } from './EventDispatcher';
import { ButtonStatus, DisplayObject, HitObject } from './DisplayObject';
import { Global } from './Global';
import { Swf2js } from './index';
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


export type StageOptions = {
    width: number;
    height: number;
    callback: (this: Window, mc: MovieClip) => void;
    tagId: string;
    FlashVars: any;
    quality: Quality;
    bgcolor: string;
    stage: Stage;
};

type Quality = 'low' | 'medium' | 'high';

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

function isButtonHit(stage: Stage, hit: ButtonHit | HitObject | undefined): hit is ButtonHit {
    return hit && stage.isHit;
}

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


    context: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    private preContext: CanvasRenderingContext2D;

    // options
    private optionWidth = 0;
    private optionHeight = 0;
    private callback = null;
    private FlashVars = {};
    private quality: Quality = 'high';

    // event
    readonly mouse = new Mouse();

    // params
    private matrix: Matrix = [1,0,0,1,0,0];
    private _matrix: Matrix = [1,0,0,1,0,0];
    private _colorTransform: ColorTransform = [1,1,1,1,0,0,0,0];
    buttonHits: ButtonHit[] = [];
    downEventHits: Action[] = [];
    moveEventHits: Action[] = [];
    upEventHits: Action[] = [];
    keyDownEventHits: Action[] = [];
    keyUpEventHits: Action[] = [];
    actions: Action[] = [];
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
    private touchObj;
    private touchStatus: 'up' | 'down' = 'up';
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
    doneTags = [];
    newTags = [];

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
        this.stopFlag = false;
        this.intervalId = setInterval(this.enterFrame, this.getFrameRate());
    }

    private enterFrame = () => {
        requestAnimationFrame(() => {
            if (this.isLoad && !this.stopFlag)
                this.nextFrame();
        });
    };

    stop(): void {
        this.stopFlag = true;
        clearInterval(this.intervalId);
        this.intervalId = 0;
    }

    getName(): string {
        return this.name;
    }

    setName(name: string): void {
        this.name = name;
    }

    setOptions(options?: Partial<StageOptions>): void {
        if (!options)
            return;

        this.optionWidth = options.width || this.optionWidth;
        this.optionHeight = options.height || this.optionHeight;
        this.callback = options.callback || this.callback;
        this.tagId = options.tagId || this.tagId;
        this.FlashVars = options.FlashVars || this.FlashVars;
        this.quality = options.quality || this.quality;
        this.bgcolor = options.bgcolor || this.bgcolor;

        // quality
        switch (this.quality) {
            case 'low':
                _devicePixelRatio = devicePixelRatio * 0.5;
                break;

            case 'medium':
                _devicePixelRatio = devicePixelRatio * 0.8;
                break;

            case "high":
                _devicePixelRatio = devicePixelRatio;
                break;

            default:
                ((x: never) => {})(this.quality);
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
        this.width = width >= 0 ? width : -width;
    }

    getHeight(): number {
        return this.height;
    }

    setHeight(height: number): void {
        this.height = height >= 0 ? height : -height;
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
        const placeObject = this.placeObjects[instanceId];
        if (!placeObject)
            return undefined;

        const tags = placeObject[frame];
        if (!tags)
            return undefined;

        return tags[depth];
    }

    setPlaceObject(placeObject: PlaceObject, instanceId: number, depth: number, frame: number): void {
        if (!(instanceId in this.placeObjects))
            this.placeObjects[instanceId] = [];

        if (!(frame in this.placeObjects[instanceId]))
            this.placeObjects[instanceId][frame] = [];

        this.placeObjects[instanceId][frame][depth] = placeObject;
    }

    copyPlaceObject(instanceId: number, depth: number, frame: number): void {
        const placeObject = this.getPlaceObject(instanceId, depth, frame - 1);
        this.setPlaceObject(placeObject, instanceId, depth, frame);
    }

    removePlaceObject(instanceId: number): void {
        delete this.placeObjects[instanceId];
    }

    getFrameRate(): number {
        return this.frameRate;
    }

    setFrameRate(fps: number): void {
        this.frameRate = (1000 / fps) | 0;
    }

    loadEvent = () => {
        switch (this.loadStatus) {
            case 2:
                this.resize();
                this.loadStatus++;
                break;
            case 3:
                if (!this.isLoad || !this.stopFlag || this.swftag.imgUnLoadCount > 0)
                    break;

                this.loadStatus++;
                this.loaded();
                break;
        }

        if (this.loadStatus !== 4)
            setTimeout(this.loadEvent, 0);
    }

    parse(swftag: SwfTag, url: string = ''): void {
        const mc = this.getParent();
        mc._url = location.href;

        this.isLoad = false;

        this.loadStatus++;

        swftag.parse(mc.characterId);

        this.build(swftag);

        const query = url.split("?")[1];
        if (query) {
            for (const value of query.split('&')) {
                const pair = value.split("=");
                if (pair.length > 1) {
                    mc.setVariable(pair[0], pair[1]);
                }
            }
        }

        // FlashVars
        const vars = this.FlashVars;
        for (const key in vars)
            mc.setVariable(key, vars[key]);

        this.isLoad = true;
    }

    build(swftag: SwfTag, name?: string): void {
        this.swftag = swftag;

        // reset mc
        const mc = this.getParent();
        mc.resetContainer();
        mc.instances = [];

        // build
        swftag.buildStage(this, name);
    }

    resize(): void {
        if (!this.isLoad)
            return;

        var div = document.getElementById(this.getName());
        if (!div)
            return;

        var oWidth = this.optionWidth;
        var oHeight = this.optionHeight;

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

        var baseWidth = this.getBaseWidth();
        var baseHeight = this.getBaseHeight();
        var scale = Math.min((screenWidth / baseWidth), (screenHeight / baseHeight));
        var width = baseWidth * scale;
        var height = baseHeight * scale;

        if (width !== this.getWidth() || height !== this.getHeight()) {
            // div
            var style = div.style;
            style.width = width + "px";
            style.height = height + "px";
            style.top = '0';
            style.left = ((screenWidth / 2) - (width / 2)) + "px";

            width *= devicePixelRatio;
            height *= devicePixelRatio;

            this.setScale(scale);
            this.setWidth(width);
            this.setHeight(height);

            // main
            var canvas = this.context.canvas;
            canvas.width = width;
            canvas.height = height;

            // pre
            var preCanvas = this.preContext.canvas;
            preCanvas.width = width;
            preCanvas.height = height;

            var hitCanvas = this.hitContext.canvas;
            hitCanvas.width = width;
            hitCanvas.height = height;

            // tmp
            if (isAndroid && isChrome) {
                var tmpCanvas = tmpContext.canvas;
                tmpCanvas.width = width;
                tmpCanvas.height = height;
            }

            var mScale = scale * _devicePixelRatio / 20;
            this.setMatrix(cloneArray([mScale, 0, 0, mScale, 0, 0]));
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
        this.newTags = [];

        clipEvent.type = "enterFrame";
        for (const tag of this.doneTags)
            tag.putFrame(this, clipEvent);
    }

    addActions(): void {
        for (const tag of this.newTags)
            tag.addActions(this);
    }

    render(): void {
        this.buttonHits = [];
        this.doneTags = [];

        const preCtx = this.preContext;
        preCtx.globalCompositeOperation = "source-over";
        preCtx.setTransform(1, 0, 0, 1, 0, 0);

        const backgroundColor = this.getBackgroundColor();
        if (!backgroundColor || backgroundColor === "transparent") {
            // pre clear
            const canvas = preCtx.canvas;
            preCtx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);

            // main clear
            this.context.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
        } else {
            preCtx.fillStyle = backgroundColor;
            preCtx.fillRect(0, 0, this.getWidth() + 1, this.getHeight() + 1);
        }

        const mc = this.getParent();
        mc.render(preCtx, this._matrix, this._colorTransform, this, true);
    }

    executeAction(): void {
        if (this.isAction) {
            this.isAction = false;

            for (const obj of this.actions) {
                const mc = obj.mc;
                if (!mc.active)
                    continue;

                const args = obj.args || [];
                const actions = obj.as;

                if (typeof actions === 'function') {
                    actions.apply(mc, args);
                } else {
                    for (const action of actions) {
                        if (typeof action === "function")
                            action.apply(mc, args);
                    }
                }
            }
        }

        this.actions = [];
        this.isAction = true;
    }

    buttonAction(mc: DisplayObject, as: ActionScript): void {
        this.downEventHits = [];
        this.moveEventHits = [];
        this.upEventHits = [];
        this.keyDownEventHits = [];
        this.keyUpEventHits = [];

        as.execute(mc);

        this.executeAction();
    }

    renderMain(): void {
        const preCanvas = this.preContext.canvas;

        if (preCanvas.width > 0 && preCanvas.height > 0) {
            this.context.setTransform(1,0,0,1,0,0);
            this.context.drawImage(preCanvas, 0, 0, preCanvas.width, preCanvas.height);
        }
    }

    reset(): void {
        const mc = new MovieClip();
        mc.reset();
        mc.setStage(this);

        this.parent = mc;
        this.instances = [];
        this.buttonHits = [];
        this.downEventHits = [];
        this.moveEventHits = [];
        this.upEventHits = [];
        this.keyDownEventHits = [];
        this.keyUpEventHits = [];
        this.actions = [];
    }

    init(): void {
        let div;
        if (this.getId() in DisplayObject.stages) {
            if (this.tagId) {
                if (document.readyState === "loading") {
                    const reTry = () => {
                        window.removeEventListener("DOMContentLoaded", reTry);
                        this.init();
                    };
                    window.addEventListener("DOMContentLoaded", reTry);
                    return;
                }

                const container = document.getElementById(this.tagId);
                if (!container) {
                    console.error("Not Found Tag ID:" + this.tagId);
                    return;
                }

                div = document.getElementById(this.getName());
                if (div) {
                    this.deleteNode();
                } else {
                    div = document.createElement("div");
                    div.id = this.getName();
                    container.appendChild(div);
                }
            } else {
                document.body.insertAdjacentHTML("beforeend", "<div id='" + this.getName() + "'></div>");
            }
        }

        div = document.getElementById(this.getName());
        if (div) {
            this.initStyle(div);
            this.loading();
        }

        if (!this.canvas) {
            this.initCanvas();
        }

        this.loadStatus++;
        this.loadEvent();
    }

    initStyle(div: HTMLDivElement): void {
        const style = div.style;
        style.position = "relative";
        style.top = "0";
        style.backgroundColor = "transparent";
        style.overflow = "hidden";
        style["-webkit-backface-visibility"] = "hidden";

        const parent = div.parentNode as HTMLElement;
        const oWidth = this.optionWidth;
        const oHeight = this.optionHeight;
        let width;
        let height;
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
        this.canvas = document.createElement("canvas");
        this.canvas.width = 1;
        this.canvas.height = 1;
        this.context = this.canvas.getContext("2d");

        const style = this.canvas.style;
        style.zIndex = '0';
        style.position = "absolute";
        style.top = '0';
        style.left = '0';
        style.zoom = 100 / _devicePixelRatio + "%";
        style["-webkit-tap-highlight-color"] = "rgba(0,0,0,0)";

        (style as any).MozTransformOrigin = "0 0";
        (style as any).MozTransform = "scale(" + 1 / _devicePixelRatio + ")";

        if (isAndroid) {
            this.canvas.addEventListener("touchcancel", () => {
                this.touchEnd(DisplayObject.event);
            });
        }

        const preCanvas = document.createElement("canvas");
        preCanvas.width = 1;
        preCanvas.height = 1;
        this.preContext = preCanvas.getContext("2d");

        const hitCanvas = document.createElement("canvas");
        hitCanvas.width = 1;
        hitCanvas.height = 1;
        this.hitContext = hitCanvas.getContext("2d");
    }

    loading(): void {
        const loadingId = this.getName() + "_loading";

        const div = document.getElementById(this.getName());
        div.innerHTML = `
            <style>
                #${loadingId} {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    margin: -24px 0 0 -24px;
                    width: 50px;
                    height: 50px;
                    border-radius: 50px;
                    border: 8px solid #dcdcdc;
                    border-right-color: transparent;
                    box-sizing: border-box;
                    -webkit-animation: ${loadingId} 0.8s infinite linear;
                    animation: ${loadingId} 0.8s infinite linear;
                }
                @-webkit-keyframes ${loadingId} {
                    0% {-webkit-transform: rotate(0deg);}
                    100% {-webkit-transform: rotate(360deg);}
                }
                @keyframes ${loadingId} {
                    0% {transform: rotate(0deg);}
                    100% {transform: rotate(360deg);}
                }
            </style>
            <div id='${loadingId}'></div>
        `;
    }

    reload(url: string, options: Partial<StageOptions>): void {
        this.stop();

        if (this.loadStatus === 4)
            this.deleteNode();

        this.loadStatus = 0;
        this.isLoad = false;
        this.reset();

        const swf2js = (window as any).swf2js as Swf2js;
        return swf2js.load(url, {
            width: options.width || this.optionWidth,
            height: options.height || this.optionHeight,
            callback: options.callback || this.callback,
            tagId: options.tagId || this.tagId,
            FlashVars: options.FlashVars || this.FlashVars,
            quality: options.quality || this.quality,
            bgcolor: options.bgcolor || this.bgcolor,
            stage: this
        });
    }

    output(url: string,
           frame: number = 1,
           width: number = this.getWidth(),
           height: number = this.getHeight()): void
    {
        if (!this.isLoad || this.stopFlag) {
            setTimeout(() => {
                this.output(url, frame, width, height);
            }, 500);
            return;
        }

        this.stop();

        // resize
        const mc = this.getParent();
        mc.reset();
        mc.gotoAndStop(frame);
        if (width !== this.getWidth() || height !== this.getHeight()) {
            this.optionWidth = width;
            this.optionHeight = height;
            this.resize();
        }

        // action
        mc.addActions(this);

        // backgroundColor
        this.preContext.canvas.style.backgroundColor = this.backgroundColor;

        // render
        this.render();

        // output
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("POST", url, true);
        xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
        xmlHttpRequest.onreadystatechange = () => {
            const readyState = xmlHttpRequest.readyState;
            if (readyState !== 4)
                return;

            var status = xmlHttpRequest.status;
            switch (status) {
                case 200:
                case 304:
                    console.log("OUTPUT SUCCESS");
                    break;
                default :
                    console.error(xmlHttpRequest.statusText);
                    break;
            }
        };

        const base64 = this.preContext.canvas.toDataURL();
        xmlHttpRequest.send("data=" + encodeURIComponent(base64));
    }

    hitCheck(event: HitEvent): ButtonHit | HitObject | undefined {
        this.isHit = false;

        if (this.buttonHits.length === 0)
            return undefined;

        const div = document.getElementById(this.getName());
        const bounds = div.getBoundingClientRect();
        const x = window.pageXOffset + bounds.left;
        const y = window.pageYOffset + bounds.top;

        let touchX = 0;
        let touchY = 0;
        if (isTouchEvent(event)) {
            const changedTouche = event.changedTouches[0];
            touchX = changedTouche.pageX;
            touchY = changedTouche.pageY;
        } else {
            touchX = event.pageX;
            touchY = event.pageY;
        }

        touchX -= x;
        touchY -= y;

        const scale = this.getScale();
        touchX /= scale;
        touchY /= scale;

        const hitCanvas = this.hitContext.canvas;
        const chkX = touchX * scale * _devicePixelRatio;
        const chkY = touchY * scale * _devicePixelRatio;

        if (this.swftag.abcFlag) {
            const parent = this.getParent();
            this.hitContext.setTransform(1, 0, 0, 1, 0, 0);
            this.hitContext.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
            const ret = parent.hitCheck(this.hitContext, [1,0,0,1,0,0], this, chkX, chkY);
            return (typeof ret === "object") ? ret : undefined;
        }

        for (let i = length; i--;) {
            const hitObj = this.buttonHits[i];
            if (!hitObj)
                continue;

            const inBounds = touchX >= hitObj.xMin && touchX <= hitObj.xMax &&
                             touchY >= hitObj.yMin && touchY <= hitObj.yMax;

            if (!inBounds)
                continue;

            let hit = false;
            if (hitObj.matrix) {
                this.hitContext.setTransform(1, 0, 0, 1, 0, 0);
                this.hitContext.clearRect(0, 0, hitCanvas.width, hitCanvas.height);
                if (hitObj.button) {
                    hit = hitObj.button.renderHitTest(this.hitContext, hitObj.matrix, this, chkX, chkY);
                } else {
                    hit = hitObj.parent.renderHitTest(this.hitContext, hitObj.matrix, this, chkX, chkY);
                }
            } else {
                hit = true;
            }

            if (hit) {
                event.preventDefault();
                this.isHit = true;
                return hitObj;
            }
        }

        return undefined;
    }

    executeEventAction(actions: Function | Function[], caller: DisplayObject, args: any[] = []): void {
        if (!actions)
            return;

        if (typeof actions === "function") {
            actions.apply(caller, args);
        } else {
            for (const action of actions) {
                if (typeof action === "function") {
                    action.apply(caller, args);
                }
            }
        }

        this.executeAction();
    }

    touchStart(event: HitEvent): void {
        if (this.touchStatus !== "up")
            return;

        this.touchStatus = "down";
        this.isHit = false;
        this.isTouchEvent = true;
        this.touchEndAction = null;

        if (this.downEventHits.length > 0) {
            event.preventDefault();

            for (const obj of this.downEventHits) {
                const mc = obj.mc as DisplayObject;
                const as = obj.as || mc.onMouseDown;
                this.executeEventAction(as, mc);
            }

            this.downEventHits = [];
        }

        const hitObj = this.hitCheck(event);
        if (isButtonHit(this, hitObj)) {
            const mc = hitObj.parent;
            if (mc.active) {
                mc.setButtonStatus("down");

                if (mc instanceof TextField) {
                    this.appendTextArea(mc, hitObj);
                } else {
                    this.executePress(mc, hitObj);
                }
            }

            if (!this.touchObj)
                this.touchObj = hitObj;
        }
    }

    private executePress(mc: DisplayObject, hitObj: ButtonHit): void {
        const cEvent = new ClipEvent();
        let isRender = false;

        if (isTouch) {
            cEvent.type = 'rollOver';
            cEvent.target = mc;
            if (mc.hasEventListener('rollOver')) {
                mc.dispatchEvent(cEvent, this);
                isRender = true;
            }
            if (mc.onRollOver) {
                mc.onRollOver.call(mc, cEvent);
                isRender = true;
            }
        }

        cEvent.type = "press";
        cEvent.target = mc;
        if (mc.hasEventListener('press')) {
            mc.dispatchEvent(cEvent, this);
            isRender = true;
        }
        if (mc.onPress) {
            mc.onPress.call(mc, cEvent);
            isRender = true;
        }

        const button = hitObj.button;
        if (button) {
            if (isTouch) {
                cEvent.type = "rollOver";
                cEvent.target = button;
                if (button.hasEventListener('rollOver'))
                    button.dispatchEvent(cEvent, this);
                if (button.onRollOver)
                    button.onRollOver.call(button, cEvent);
            }

            button.setButtonStatus("down");

            if (isTouch)
                this.executeButtonAction(button, mc, "CondIdleToOverUp");

            for (const cond of button.getActions()) {
                if (cond.CondOverDownToOverUp && !this.touchObj) {
                    this.touchEndAction = cond.ActionScript;
                    continue;
                }

                // enter
                const keyPress = cond.CondKeyPress;
                if (hitObj.CondKeyPress === 13 && hitObj.CondKeyPress !== keyPress)
                    continue;

                if (isTouch) {
                    if (keyPress === 13 ||
                        (keyPress >= 48 && keyPress <= 57) ||
                        cond.CondOverUpToOverDown
                    ) {
                        this.buttonAction(mc, cond.ActionScript);
                    }
                } else {
                    if (cond.CondOverUpToOverDown) {
                        this.buttonAction(mc, cond.ActionScript);
                    }
                }
            }

            cEvent.type = "press";
            cEvent.target = button;
            if (button.hasEventListener('press'))
                button.dispatchEvent(cEvent, this);
            if (button.onPress)
                button.onPress.call(button, cEvent);

            button.getSprite().startSound();

            button.addActions(this);
            this.executeAction();

            isRender = true;
        }

        if (isRender)
            this.touchRender();
    }

    appendTextArea(textField: TextField, hitObj: ButtonHit): void {
        textField.inputActive = true;

        const found = document.getElementById(textField.getTagName());
        if (found)
            return;

        const element = textField.input;

        const variable = textField.getProperty("variable");
        if (variable) {
            const mc = textField.getParent();
            let text = mc.getProperty(variable);
            if (!text)
                text = textField.getVariable("text");

            if (text)
                element.value = text;
        }

        const maxLength = textField.getVariable("maxChars");
        if (maxLength)
            element.maxLength = maxLength;

        const border = textField.getVariable("border");
        if (border) {
            element.style.border = "1px solid black";
            const color = textField.getVariable("backgroundColor");
            element.style.backgroundColor = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
        }

        const scale = this.getScale();
        const left = hitObj.xMin;
        const top = hitObj.yMin;
        const width = hitObj.xMax - left;
        const height = hitObj.yMax - top;
        element.style.left = Math.ceil(left * scale) - 3 + "px";
        element.style.top = Math.ceil(top * scale) - 3 + "px";
        element.style.width = Math.ceil(width * scale) + 6 + "px";
        element.style.height = Math.ceil(height * scale) + 6 + "px";

        const div = document.getElementById(this.getName());
        if (div) {
            div.appendChild(element);
            element.focus();
            setTimeout(() => element.focus(), 10);
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
        for (const cond of button.getActions()) {
            if (cond[status])
                this.buttonAction(mc, cond.ActionScript);
        }
    }

    touchRender(): void {
        this.render();
        this.renderMain();
    }
}
