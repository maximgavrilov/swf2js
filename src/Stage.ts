/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { BitIO } from './BitIO';
import { cacheStore } from './CacheStore';
import { clipEvent, ClipEvent } from './EventDispatcher';
import { DisplayObject } from './DisplayObject';
import { Global } from './Global';
import { PlaceObject } from './PlaceObject';
import { keyClass } from './Key';
import { Mouse } from './Mouse';
import { MovieClip } from './MovieClip';
import { Packages } from './Packages';
import { Shape } from './Shape';
import { SwfTag } from './SwfTag';
import { TextField } from './TextField';
import { vtc } from './VectorToCanvas';
import {
    Bounds,
    tmpContext,
    devicePixelRatio, isXHR2, isAndroid, isChrome, isTouch,
    cloneArray
} from './utils';

const requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    (window as any).mozRequestAnimationFrame ||
    ((cb) => window.setTimeout(cb, 0));

export let stageId = 1;
export const stages = {};
DisplayObject.stages = stages; // any

let quality = 1;
let _devicePixelRatio = devicePixelRatio * quality;

let startEvent = "mousedown";
let moveEvent = "mousemove";
let endEvent = "mouseup";
if (isTouch) {
    startEvent = "touchstart";
    moveEvent = "touchmove";
    endEvent = "touchend";
}

/**
 * @constructor
 */
export var Stage = function ()
{
    var _this = this;
    _this.id = stageId++;
    _this.name = "swf2js_" + _this.id;
    _this.intervalId = 0;

    _this.frameRate = 0;
    _this.fileSize = 0;
    _this.stopFlag = true;

    // options
    _this.optionWidth = 0;
    _this.optionHeight = 0;
    _this.callback = null;
    _this.renderMode = false;
    _this.tagId = null;
    _this.FlashVars = {};
    _this.quality = "medium"; // low = 0.25, medium = 0.8, high = 1.0
    _this.bgcolor = null;

    // event
    _this.mouse = new Mouse();

    // params
    _this.context = null;
    _this.canvas = null;
    _this.preContext = null;
    _this.hitContext = null;
    _this.matrix = [1,0,0,1,0,0];
    _this._matrix = [1,0,0,1,0,0];
    _this._colorTransform = [1,1,1,1,0,0,0,0];
    _this.characters = [];
    _this.initActions = [];
    _this.exportAssets = {};
    _this.packages = [];
    _this.registerClass = [];
    _this.buttonHits = [];
    _this.downEventHits = [];
    _this.moveEventHits = [];
    _this.upEventHits = [];
    _this.keyDownEventHits = [];
    _this.keyUpEventHits = [];
    _this.sounds = [];
    _this.loadSounds = [];
    _this.videos = [];
    _this.actions = [];
    _this.instances = [];
    _this.placeObjects = [];
    _this.fonts = [];
    _this.isAction = true;
    _this._global = new Global();
    _this.touchObj = null;
    _this.touchStatus = "up";
    _this.overObj = null;
    _this.touchEndAction = null;
    _this.imgUnLoadCount = 0;
    _this.scale = 1;
    _this.baseWidth = 0;
    _this.baseHeight = 0;
    _this.width = 0;
    _this.height = 0;
    _this.isHit = false;
    _this.isTouchEvent = false;
    _this.isLoad = false;
    _this.jpegTables = null;
    _this.backgroundColor = "transparent";
    _this.version = 8;
    _this.loadStatus = 0;
    _this.isClipDepth = false;
    _this.clipDepth = 0;
    _this.clipMc = false;
    _this.dragMc = null;
    _this.dragRules = null;
    _this.scaleMode = "showAll";
    _this.align = "";
    _this.avm2 = new Packages(_this);
    _this.abc = new Packages(_this);
    _this.symbols = {};
    _this.abcFlag = false;

    // render
    _this.doneTags = [];
    _this.newTags = [];

    // init
    var mc = new MovieClip();
    mc.setStage(_this);
    _this.setParent(mc);
};

/**
 * @returns {number|*}
 */
Stage.prototype.getId = function ()
{
    return this.id;
};

/**
 * @param id
 */
Stage.prototype.setId = function (id)
{
    this.id = id;
};

/**
 * @returns {*}
 */
Stage.prototype.getParent = function ()
{
    return this.parent;
};

/**
 * @param parent
 */
Stage.prototype.setParent = function (parent)
{
    this.parent = parent;
};

/**
 * @returns {number|*}
 */
Stage.prototype.getVersion = function ()
{
    return this.version;
};

/**
 * @param version
 */
Stage.prototype.setVersion = function (version)
{
    this.version = version;
};

/**
 *
 * @returns {string}
 */
Stage.prototype.getBackgroundColor = function ()
{
    return this.backgroundColor;
};

/**
 * @param r
 * @param g
 * @param b
 */
Stage.prototype.setBackgroundColor = function (r, g, b)
{
    this.backgroundColor = "rgb(" + r + "," + g + "," + b + ")";
};

/**
 * @returns {Array}
 */
Stage.prototype.getGlobal = function ()
{
    return this._global;
};

/**
 * play
 */
Stage.prototype.play = function ()
{
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
};

/**
 * stop
 */
Stage.prototype.stop = function ()
{
    var _this = this;
    _this.stopFlag = true;
    clearInterval(_this.intervalId);
};

/**
 * @returns {*}
 */
Stage.prototype.getName = function ()
{
    return this.name;
};

/**
 * @param name
 */
Stage.prototype.setName = function (name)
{
    this.name = name;
};

/**
 * @param options
 */
Stage.prototype.setOptions = function (options)
{
    if (options !== undefined) {
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
};

/**
 * @returns {number}
 */
Stage.prototype.getBaseWidth = function ()
{
    return this.baseWidth;
};

/**
 * @param baseWidth
 */
Stage.prototype.setBaseWidth = function (baseWidth)
{
    this.baseWidth = baseWidth;
};

/**
 *
 * @returns {number}
 */
Stage.prototype.getBaseHeight = function ()
{
    return this.baseHeight;
};

/**
 * @param baseHeight
 */
Stage.prototype.setBaseHeight = function (baseHeight)
{
    this.baseHeight = baseHeight;
};

/**
 *
 * @returns {number}
 */
Stage.prototype.getWidth = function ()
{
    return this.width;
};

/**
 * @param width
 */
Stage.prototype.setWidth = function (width)
{
    if (width < 0) {
        width *= -1;
    }
    this.width = width;
};

/**
 * @returns {number}
 */
Stage.prototype.getHeight = function ()
{
    return this.height;
};

/**
 * @param height
 */
Stage.prototype.setHeight = function (height)
{
    if (height < 0) {
        height *= -1;
    }
    this.height = height;
};

/**
 * @returns {number}
 */
Stage.prototype.getScale = function ()
{
    return this.scale;
};

/**
 * @param scale
 */
Stage.prototype.setScale = function (scale)
{
    this.scale = scale;
};

/**
 * @returns {*}
 */
Stage.prototype.getMatrix = function ()
{
    return this.matrix;
};

/**
 * @param matrix
 */
Stage.prototype.setMatrix = function (matrix)
{
    this.matrix = matrix;
};

/**
 * @param id
 * @returns {*}
 */
Stage.prototype.getCharacter = function (id)
{
    return this.characters[id];
};

/**
 * @param id
 * @param obj
 */
Stage.prototype.setCharacter = function (id, obj)
{
    this.characters[id] = obj;
};

/**
 * @param id
 * @returns {*}
 */
Stage.prototype.getInstance = function (id)
{
    return this.instances[id];
};

/**
 * @param instance
 */
Stage.prototype.setInstance = function (instance)
{
    this.instances[instance.instanceId] = instance;
};

/**
 * @param instanceId
 * @param depth
 * @param frame
 * @returns {*}
 */
Stage.prototype.getPlaceObject = function (instanceId, depth, frame)
{
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
};

/**
 * @param placeObject
 * @param instanceId
 * @param depth
 * @param frame
 */
Stage.prototype.setPlaceObject = function (placeObject, instanceId, depth, frame)
{
    var _this = this;
    var placeObjects = _this.placeObjects;
    if (!(instanceId in placeObjects)) {
        placeObjects[instanceId] = [];
    }
    if (!(frame in placeObjects[instanceId])) {
        placeObjects[instanceId][frame] = [];
    }
    placeObjects[instanceId][frame][depth] = placeObject;
};

/**
 * @param instanceId
 * @param depth
 * @param frame
 */
Stage.prototype.copyPlaceObject = function (instanceId, depth, frame)
{
    var _this = this;
    var placeObject = _this.getPlaceObject(instanceId, depth, frame - 1);
    _this.setPlaceObject(placeObject, instanceId, depth, frame);
};

/**
 * @param instanceId
 */
Stage.prototype.removePlaceObject = function (instanceId)
{
    delete this.placeObjects[instanceId];
    // delete this.instances[instanceId];
};

/**
 * @returns {number}
 */
Stage.prototype.getFrameRate = function ()
{
    return this.frameRate;
};

/**
 * @param fps
 */
Stage.prototype.setFrameRate = function (fps)
{
    this.frameRate = (1000 / fps) | 0;
};

/**
 * loadStatus CountUp
 */
Stage.prototype.loadEvent = function ()
{
    var _this = this;
    switch (_this.loadStatus) {
        case 2:
            _this.resize();
            _this.loadStatus++;
            break;
        case 3:
            if (!_this.isLoad || !_this.stopFlag || _this.imgUnLoadCount > 0) {
                break;
            }
            _this.loadStatus++;
            _this.loaded();
            break;
    }
    if (_this.loadStatus !== 4) {
        setTimeout(function () { _this.loadEvent(); }, 0);
    }
};

/**
 * @param data
 * @param url
 */
Stage.prototype.parse = function (data, url)
{
    var _this = this;
    _this.isLoad = false;
    var bitio = new BitIO();
    var swftag = new SwfTag(_this, bitio);

    if (isXHR2) {
        bitio.setData(new Uint8Array(data));
    } else {
        bitio.init(data);
    }

    if (_this.setSwfHeader(bitio, swftag)) {
        var mc = _this.getParent();
        mc._url = location.href;

        // parse
        var tags = swftag.parse(mc);

        // mc reset
        mc.container = [];
        var frame = 1;
        var totalFrames = mc.getTotalFrames() + 1;
        while (frame < totalFrames) {
            mc.container[frame++] = [];
        }
        mc.instances = [];

        // build
        swftag.build(tags, mc);

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
    }

    _this.isLoad = true;
};

/**
 * @param bitio
 * @param swftag
 * @returns {boolean}
 */
Stage.prototype.setSwfHeader = function (bitio, swftag)
{
    var _this = this;

    var data = bitio.data;
    if (data[0] === 0xff && data[1] === 0xd8) {
        _this.parseJPEG(data, swftag);
        return false;
    }

    // signature
    var signature = bitio.getHeaderSignature();

    // version
    var version = bitio.getVersion();
    _this.setVersion(version);

    // file size
    var fileLength = bitio.getUI32();
    _this.fileSize = fileLength;

    switch (signature) {
        case "FWS": // No ZIP
            break;
        case "CWS": // ZLIB
            bitio.deCompress(fileLength, "ZLIB");
            break;
        case "ZWS": // TODO LZMA
            alert("not support LZMA");
            //bitio.deCompress(fileLength, "LZMA");
            return false;
    }

    var bounds = swftag.rect();
    var frameRate = bitio.getUI16() / 0x100;
    bitio.getUI16(); // frameCount

    _this.setBaseWidth(Math.ceil((bounds.xMax - bounds.xMin) / 20));
    _this.setBaseHeight(Math.ceil((bounds.yMax - bounds.yMin) / 20));
    _this.setFrameRate(frameRate);

    _this.loadStatus++;

    return true;
};

/**
 * @param data
 * @param swftag
 */
Stage.prototype.parseJPEG = function (data, swftag)
{
    var _this = this;
    var image = document.createElement("img");
    image.addEventListener("load", function ()
    {
        var width = this.width;
        var height = this.height;

        var canvas = cacheStore.getCanvas();
        canvas.width = width;
        canvas.height = height;
        var imageContext = canvas.getContext("2d");
        imageContext.drawImage(this, 0, 0, width, height);
        _this.setCharacter(1, imageContext);

        var shapeWidth = width * 20;
        var shapeHeight = height * 20;

        _this.setBaseWidth(width);
        _this.setBaseHeight(height);

        var shape = {
            ShapeRecords: [
                {
                    FillStyle1: 1,
                    StateFillStyle0: 0,
                    StateFillStyle1: 1,
                    StateLineStyle: 0,
                    StateMoveTo: 0,
                    StateNewStyles: 0,
                    isChange: true
                },
                {
                    AnchorX: shapeWidth,
                    AnchorY: 0,
                    ControlX: 0,
                    ControlY: 0,
                    isChange: false,
                    isCurved: false
                },
                {
                    AnchorX: shapeWidth,
                    AnchorY: shapeHeight,
                    ControlX: 0,
                    ControlY: 0,
                    isChange: false,
                    isCurved: false
                },
                {
                    AnchorX: 0,
                    AnchorY: shapeHeight,
                    ControlX: 0,
                    ControlY: 0,
                    isChange: false,
                    isCurved: false
                },
                {
                    AnchorX: 0,
                    AnchorY: 0,
                    ControlX: 0,
                    ControlY: 0,
                    isChange: false,
                    isCurved: false
                },
                0
            ],
            fillStyles: {
                fillStyleCount: 1,
                fillStyles: [{
                    bitmapId: 1,
                    bitmapMatrix: [20, 0, 0, 20, 0, 0],
                    fillStyleType: 65
                }]
            },
            lineStyles: {
                lineStyleCount: 0,
                lineStyles: []
            }
        };

        var bounds = new Bounds(0, 0, shapeWidth, shapeHeight);
        var data = vtc.convert(shape);

        _this.setCharacter(2, {
            tagType: 22,
            data: data,
            bounds: bounds
        });

        var parent = _this.getParent();
        var obj = new Shape();
        obj.setParent(parent);
        obj.setStage(_this);
        obj.setData(data);
        obj.setTagType(22);
        obj.setCharacterId(2);
        obj.setBounds(bounds);
        obj.setLevel(1);

        parent.container[1] = [];
        parent.container[1][1] = obj.instanceId;

        var placeObject = new PlaceObject();
        _this.setPlaceObject(placeObject, obj.instanceId, 1, 1);

        _this.init();
    });


    var jpegData = swftag.parseJpegData(data);
    image.src = "data:image/jpeg;base64," + swftag.base64encode(jpegData);
};

/**
 * resize
 */
Stage.prototype.resize = function ()
{
    var _this = this;
    var div = document.getElementById(_this.getName());
    if (!div) {
        return 0;
    }

    var oWidth = _this.optionWidth;
    var oHeight = _this.optionHeight;

    var element = document.documentElement;
    var innerWidth = Math.max(element.clientWidth, window.innerWidth || 0);
    var innerHeight = Math.max(element.clientHeight, window.innerHeight || 0);

    var parent = div.parentNode as any;
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
};

/**
 * loaded
 */
Stage.prototype.loaded = function ()
{
    // reset
    var _this = this;
    _this.buttonHits = [];
    _this.downEventHits = [];
    _this.moveEventHits = [];
    _this.upEventHits = [];
    _this.keyDownEventHits = [];
    _this.keyUpEventHits = [];
    _this.actions = [];

    // DOM
    _this.deleteNode();
    var div = document.getElementById(_this.getName());
    if (div) {
        var mc = _this.getParent();
        mc.initFrame();
        mc.addActions(_this);
        _this.executeAction();

        // callback
        var callback = _this.callback;
        if (typeof callback === "function") {
            callback.call(window, mc);
        }

        _this.render();
        _this.renderMain();

        var ctx = _this.context;
        var canvas = ctx.canvas;

        // load sound
        if (isTouch) {
            var loadSounds = _this.loadSounds;
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

        canvas.addEventListener(startEvent, function (event)
        {
            DisplayObject.event = event;
            _this.touchStart(event);
        });

        canvas.addEventListener(moveEvent, function (event)
        {
            DisplayObject.event = event;
            _this.touchMove(event);
        });

        canvas.addEventListener(endEvent, function (event)
        {
            DisplayObject.event = event;
            _this.touchEnd(event);
        });

        div.appendChild(canvas);

        _this.play();
    }
};

/**
 * deleteNode
 */
Stage.prototype.deleteNode = function (tagId)
{
    var div = document.getElementById(tagId ? tagId : this.getName());
    if (div) {
        var childNodes = div.childNodes;
        var length = childNodes.length;
        if (length) {
            while (length--) {
                div.removeChild(childNodes[length]);
            }
        }
    }
};

/**
 * nextFrame
 */
Stage.prototype.nextFrame = function ()
{
    var _this = this;
    _this.downEventHits = [];
    _this.moveEventHits = [];
    _this.upEventHits = [];
    _this.keyDownEventHits = [];
    _this.keyUpEventHits = [];

    // mouse event
    var parent = _this.getParent();
    var mouse = _this.mouse;
    var mouseEvents = mouse.events;
    var onMouseDown = mouseEvents.onMouseDown;
    if (onMouseDown) {
        _this.downEventHits[_this.downEventHits.length] = {as: onMouseDown, mc: parent};
    }
    var onMouseMove = mouseEvents.onMouseMove;
    if (onMouseMove) {
        _this.moveEventHits[_this.moveEventHits.length] = {as: onMouseMove, mc: parent};
    }
    var onMouseUp = mouseEvents.onMouseUp;
    if (onMouseUp) {
        _this.upEventHits[_this.upEventHits.length] = {as: onMouseUp, mc: parent};
    }

    _this.putFrame();
    _this.addActions();
    _this.executeAction();
    _this.render();
    _this.renderMain();
};

/**
 * putFrame
 */
Stage.prototype.putFrame = function ()
{
    var _this = this;
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
};

/**
 * addActions
 */
Stage.prototype.addActions = function ()
{
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
};

/**
 * render
 */
Stage.prototype.render = function ()
{
    var _this = this;
    _this.buttonHits = [];
    _this.doneTags = [];

    var ctx = _this.preContext;
    ctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var backgroundColor = _this.getBackgroundColor();
    if (!backgroundColor || backgroundColor === "transparent") {
        // pre clear
        var canvas = ctx.canvas;
        ctx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
        // main clear
        var mainCtx = _this.context;
        mainCtx.clearRect(0, 0, canvas.width + 1, canvas.height + 1);
    } else {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, _this.getWidth() + 1, _this.getHeight() + 1);
    }

    var mc = _this.getParent();
    mc.render(ctx, _this._matrix, _this._colorTransform, _this, true);
};

/**
 * executeAction
 */
Stage.prototype.executeAction = function ()
{
    var _this = this;
    if (_this.isAction && _this.actions.length) {
        _this.isAction = false;
        var i = 0;
        while (i < _this.actions.length) {
            var obj = _this.actions[i];
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
    _this.actions = [];
    _this.isAction = true;
};

/**
 * @param mc
 * @param as
 */
Stage.prototype.buttonAction = function (mc, as)
{
    var _this = this;
    _this.downEventHits = [];
    _this.moveEventHits = [];
    _this.upEventHits = [];
    _this.keyDownEventHits = [];
    _this.keyUpEventHits = [];
    as.execute(mc);
    _this.executeAction();
};

/*
 * main canvas
 */
Stage.prototype.renderMain = function ()
{
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
};

/**
 * reset
 */
Stage.prototype.reset = function ()
{
    var _this = this;
    _this.instanceId = 0;
    var mc = new MovieClip();
    mc.reset();
    mc.setStage(_this);
    _this.parent = mc;
    _this.characters = [];
    _this.instances = [];
    _this.buttonHits = [];
    _this.downEventHits = [];
    _this.moveEventHits = [];
    _this.upEventHits = [];
    _this.keyDownEventHits = [];
    _this.keyUpEventHits = [];
    _this.sounds = [];
    _this.loadSounds = [];
    _this.actions = [];
};

/**
 * init
 */
Stage.prototype.init = function ()
{
    var _this = this;
    var tagId = _this.tagId;
    var div;
    if (_this.getId() in stages) {
        if (tagId) {
            if (document.readyState === "loading") {
                var reTry = function ()
                {
                    window.removeEventListener("DOMContentLoaded", reTry);
                    _this.init();
                };
                window.addEventListener("DOMContentLoaded", reTry);
                return 0;
            }

            var container = document.getElementById(tagId);
            if (!container) {
                alert("Not Found Tag ID:" + tagId);
                return 0;
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
};

/**
 * @param div
 */
Stage.prototype.initStyle = function (div)
{
    var style;
    var _this = this;

    style = div.style;
    style.position = "relative";
    style.top = "0";
    style.backgroundColor = "transparent";
    style.overflow = "hidden";
    style["-webkit-backface-visibility"] = "hidden";

    var parent = div.parentNode;
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
};

/**
 * init canvas
 */
Stage.prototype.initCanvas = function ()
{
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
};

/**
 * loading
 */
Stage.prototype.loading = function ()
{
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
};

/**
 * @param url
 * @param options
 */
Stage.prototype.reload = function (url, options)
{
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
};

/**
 * @param url
 * @param frame
 * @param width
 * @param height
 * @returns {*}
 */
Stage.prototype.output = function (url, frame, width, height)
{
    var _this = this;
    if (!_this.isLoad || _this.stopFlag) {
        setTimeout(function ()
        {
            _this.output(url, frame, width, height);
        }, 500);
        return 0;
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
    mc.addActions();

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
};

/**
 * @param event
 */
Stage.prototype.hitCheck = function (event)
{
    var _this = this;
    _this.isHit = false;
    var buttonHits = _this.buttonHits;
    var length = buttonHits.length;
    if (!length) {
        return 0;
    }

    var div = document.getElementById(_this.getName());
    var bounds = div.getBoundingClientRect();
    var x = window.pageXOffset + bounds.left;
    var y = window.pageYOffset + bounds.top;
    var touchX = 0;
    var touchY = 0;

    if (isTouch) {
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

    if (_this.abcFlag) {
        var parent = _this.getParent();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, hitWidth, hitHeight);
        var ret = parent.hitCheck(ctx, [1,0,0,1,0,0], _this, chkX, chkY);
        return (typeof ret === "object") ? ret : false;
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

    return 0;
};

/**
 * @param actions
 * @param caller
 * @param event
 */
Stage.prototype.executeEventAction = function (actions, caller, event)
{
    var args = event || [];
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
};

/**
 * @param event
 */
Stage.prototype.touchStart = function (event)
{
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
                mc = obj.mc;
                as = obj.as;
                if (!as) {
                    as = mc.variables.onMouseDown;
                }
                _this.executeEventAction(as, obj.mc);
            }
            _this.downEventHits = [];
        }

        var hitObj = _this.hitCheck(event);
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
};

/**
 * @param mc
 * @param hitObj
 */
Stage.prototype.executePress = function (mc, hitObj)
{
    var _this = this;
    var isRender = false;
    var events;
    var press;
    var onPress;
    var rollOver;
    var onRollOver;
    var cEvent = new ClipEvent();

    events = mc.events;
    if (isTouch) {
        rollOver = events.rollOver;
        if (rollOver) {
            cEvent.type = "rollOver";
            cEvent.target = mc;
            _this.executeEventAction(rollOver, mc, [cEvent]);
            isRender = true;
        }

        onRollOver = mc.variables.onRollOver;
        if (typeof onRollOver === "function") {
            _this.executeEventAction(onRollOver, mc);
            isRender = true;
        }
    }

    events = mc.events;
    press = events.press;
    if (press) {
        cEvent.type = "press";
        cEvent.target = mc;
        _this.executeEventAction(press, mc, [cEvent]);
        isRender = true;
    }
    onPress = mc.variables.onPress;
    if (typeof onPress === "function") {
        _this.executeEventAction(onPress, mc);
        isRender = true;
    }

    var button = hitObj.button;
    if (button) {
        events = button.events;

        if (isTouch) {
            rollOver = events.rollOver;
            if (rollOver) {
                cEvent.type = "rollOver";
                cEvent.target = button;
                _this.executeEventAction(rollOver, button, [cEvent]);
            }

            onRollOver = button.variables.onRollOver;
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

        press = events.press;
        if (press) {
            cEvent.type = "press";
            cEvent.target = button;
            _this.executeEventAction(press, button, [cEvent]);
        }

        onPress = button.variables.onPress;
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

};

/**
 * @param textField
 * @param hitObj
 */
Stage.prototype.appendTextArea = function (textField, hitObj)
{
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
};

/**
 * @param event
 */
Stage.prototype.touchMove = function (event)
{
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
                as = mc.variables.onMouseMove;
            }
            _this.executeEventAction(as, mc);
        }
        _this.moveEventHits = [];
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
                        onDragOver = mc.variables.onDragOver;
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
                        onDragOver = button.variables.onDragOver;
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
                        onDragOut = mc.variables.onDragOut;
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
                            onDragOut = button.variables.onDragOut;
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

                    onRollOver = mc.variables.onRollOver;
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
                        onRollOver = button.variables.onRollOver;
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

                    onRollOut = mc.variables.onRollOut;
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

                    onRollOut = button.variables.onRollOut;
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
};

/**
 * @param event
 */
Stage.prototype.touchEnd = function (event)
{
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
            mc = obj.mc;
            as = obj.as;
            if (!as) {
                as = mc.variables.onMouseUp;
            }
            _this.executeEventAction(as, obj.mc);
        }
        _this.upEventHits = [];
    }

    var hitObj = _this.hitCheck(event);
    var dragMc = _this.dragMc;
    if (dragMc) {
        hitObj = touchObj;
        _this.isHit = true;
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
                    onRelease = mc.variables.onRelease;
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

                        onRelease = button.variables.onRelease;
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
            onReleaseOutside = mc.variables.onReleaseOutside;
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

            onReleaseOutside = button.variables.onReleaseOutside;
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

    if (!isTouch) {
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

            onRollOver = mc.variables.onRollOver;
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

                onRollOver = button.variables.onRollOver;
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
};

/**
 * @param button
 * @param mc
 * @param status
 */
Stage.prototype.executeButtonAction = function (button, mc, status)
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
};

/**
 * touchRender
 */
Stage.prototype.touchRender = function ()
{
    var _this = this;
    _this.render();
    _this.renderMain();
};

