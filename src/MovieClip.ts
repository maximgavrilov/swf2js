/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { ActionScript } from './ActionScript';
import { clipEvent, ClipEvent } from './EventDispatcher';
import { CLS, DisplayObject } from './DisplayObject';
import { DisplayObjectContainer } from './DisplayObjectContainer';
import { PlaceObject } from './PlaceObject';
import { Sprite } from './Sprite';
import { Stage } from './Stage';
import { DefineSpriteCharacter, RemoveObject, StartSound, StartSoundTag, SwfTag } from './SwfTag';
import { TextField } from './TextField';
import { CAP, JOIN } from './VectorToCanvas';
import {
    Bounds, Matrix,
    devicePixelRatio, isTouch, isXHR2,
    cloneArray, multiplicationMatrix, startSound
} from './utils';


export type MCAction = (this: MovieClip) => void;

export class MovieClip extends Sprite {
    private _currentframe = 1;
    private removeTags: { [frame: number]: { [depth: number]: 1 } } = {};
    private actions: { [frame: number]: MCAction[] } = {};
    private labels: { [label: string]: number } = {};

    // flag
    private stopFlag = false;
    private isAction = true;

    // sound
    sounds: { [frame: number]: StartSoundTag[] } = {};
    soundStopFlag = false;

    // avm2
    protected avm2: Object | null = null;

    constructor() {
        super();

        const totalFrames = this.getTotalFrames();
        for (let frame = 1; frame <= totalFrames; frame++)
            this.container[frame] = [];
    }

    dispatchOnEvent(name: string, stage: Stage): void {
        const as = this.variables[name];
        if (as) {
            this.setActionQueue(as, stage);
        }
    }

    createEmptyMovieClip(name: string, depth: number): MovieClip | undefined {
        var _this = this;
        var stage = _this.getStage();

        if (name === undefined) {
            return undefined;
        }

        var mc = _this.getDisplayObject(name) as MovieClip;
        if (!mc) {
            mc = new MovieClip();
        }

        depth += 16384;

        mc.setName(name);
        mc.setLevel(depth);
        mc.setParent(_this);
        mc.setStage(stage);

        var container = _this.getContainer();
        var totalFrames = _this.getTotalFrames() + 1;
        var placeObject = new PlaceObject();
        var instanceId = _this.instanceId;
        for (var frame = 1; frame < totalFrames; frame++) {
            if (!(frame in container)) {
                container[frame] = [];
            }
            container[frame][depth] = mc.instanceId;
            stage.setPlaceObject(placeObject, instanceId, depth, frame);
        }
        return mc;
    }

    createTextField(name: string,
                    depth: number,
                    x: number,
                    y: number,
                    width: number,
                    height: number): TextField
    {
        if (16384 > depth) {
            depth += 16384;
        }
        var _this = this;
        var textField = new TextField();
        textField.setName(name);
        textField.setLevel(depth);
        textField.setBounds(new Bounds(0, 0, 20 * width, 20 * height));
        textField.setX(x);
        textField.setY(y);
        textField.setParent(_this);
        textField.setStage(_this.getStage());
        textField.setInitParams();
        var container = _this.getContainer();
        for (var frame in container) {
            if (!container.hasOwnProperty(frame)) {
                continue;
            }
            container[frame][depth] = textField.instanceId;
        }
        return textField;
    }

    setBackgroundColor(r: number, g: number, b: number): void {
        var stage = this.getStage();
        stage.setBackgroundColor(r, g, b);
    }

    play(): void {
        this.stopFlag = false;
    }

    stop(): void {
        this.stopFlag = true;
    }

    gotoAndPlay(frame: number | string): void {
        if (typeof frame === "string") {
            frame = this.getLabel(frame);
        } else {
            frame = +frame;
        }

        if (typeof frame === "number" && frame > 0) {
            this.setNextFrame(frame);
            this.play();
        }
    }

    gotoAndStop(frame: number | string): void {
        if (typeof frame === "string") {
            frame = this.getLabel(frame);
        }
        frame |= 0;
        if (typeof frame === "number" && frame > this.getTotalFrames()) {
            frame = this.getTotalFrames();
            this.isAction = false;
        }
        if (frame > 0) {
            this.setNextFrame(frame);
            this.stop();
        }
    }

    stopAllSounds(): void {
        var stage = this.getStage();
        var loadSounds = stage.swftag.loadSounds;
        var sLen = loadSounds.length;
        var stopSound = function () {
            this.removeEventListener("pause", stopSound);
            this.currentTime = 0;
            this.loop = false;
        };

        if (sLen > 0) {
            while (sLen--) {
                if (!(sLen in loadSounds)) {
                    continue;
                }
                var audio = loadSounds[sLen];
                audio.addEventListener("pause", stopSound);
                audio.pause();
            }
        }
    }

    loadMovie(url: string, target: number | string, SendVarsMethod: 'GET'|'POST'|2): void {
        var _this = this;
        var stage = _this.getStage();
        var targetMc = null;

        if (!target) {
            target = _this.getName();
            targetMc = _this;
        }

        if (!targetMc) {
            if (typeof target === "string") {
                var _level = target.substr(0, 6);
                if (_level === "_level") {
                    target = +target.substr(6);
                }
            }
            if (typeof target === "number") {
                var parent = stage.getParent();
                if (!parent) {
                    parent = stage.getParent();
                }
                var tags = parent.getTags();
                targetMc = tags[target];
            } else {
                targetMc = _this.getDisplayObject(target);
            }
        }

        if (targetMc) {
            _this.unloadMovie(targetMc);

            var xmlHttpRequest = new XMLHttpRequest();
            var targetUrl = url;
            var body = null;
            if (SendVarsMethod === 2) {
                var urls = url.split("?");
                if (urls[1] !== undefined) {
                    body = urls[1];
                }
                targetUrl = urls[0];
                xmlHttpRequest.open("POST", targetUrl, true);
                xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            } else {
                xmlHttpRequest.open("GET", targetUrl, true);
            }

            if (isXHR2) {
                xmlHttpRequest.responseType = "arraybuffer";
            } else {
                xmlHttpRequest.overrideMimeType("text/plain; charset=x-user-defined");
            }

            xmlHttpRequest.onreadystatechange = function ()
            {
                var readyState = xmlHttpRequest.readyState;
                var status = xmlHttpRequest.status;
                if (readyState === 4) {
                    switch (status) {
                        case 200:
                        case 304:
                            var _root = _this.getDisplayObject("_root");
                            var rootStage = _root.getStage();
                            var data = isXHR2 ? xmlHttpRequest.response : xmlHttpRequest.responseText;
                            var loadStage = new Stage();
                            DisplayObject.loadStages[loadStage.getId()] = loadStage;
                            targetMc._url = url;
                            targetMc.reset();
                            loadStage.setParent(targetMc);
                            targetMc.setLoadStage(loadStage);
                            loadStage.parse(data, targetUrl);
                            loadStage.stop();

                            if (target === 0 || (typeof target !== "number" && !targetMc.getParent())) {
                                stage.stop();
                                loadStage.setId(stage.getId());
                                loadStage.setName(stage.getName());
                                loadStage.backgroundColor = stage.backgroundColor;
                                loadStage.initCanvas();
                                loadStage.loadStatus = 2;
                                loadStage.loadEvent();
                                delete DisplayObject.loadStages[loadStage.getId()];
                                DisplayObject.stages[stage.getId()] = loadStage;
                                stage = null;
                            }

                            var onData = targetMc.variables.onData;
                            if (typeof onData === "function") {
                                loadStage.executeEventAction(onData, targetMc);
                            }

                            clipEvent.type = "data";
                            targetMc.dispatchEvent(clipEvent, rootStage);

                            targetMc.addActions(rootStage);
                            break;
                    }
                }
            };
            xmlHttpRequest.send(body);
        }
    }

    unloadMovie(target: MovieClip | string): void {
        var _this = this;
        var targetMc = null;
        if (target instanceof MovieClip) {
            targetMc = target;
        } else {
            targetMc = _this.getDisplayObject(target);
            if (!targetMc) {
                return;
            }
        }

        // delete
        targetMc.reset();
        targetMc.setLoadStage(null);
        targetMc.setStage(_this.getStage());
        targetMc.container = [];
        targetMc.actions = {};
        targetMc.instances = [];
        targetMc.labels = {};
        targetMc.sounds = {};
        targetMc.removeTags = {};
        targetMc._totalframes = 1;
        targetMc._url = null;
        targetMc._lockroot = undefined;

        var loadStage = targetMc.getStage();
        delete DisplayObject.loadStages[loadStage.getId()];
    }

    getURL(url: string, target: string, method?: 'GET' | 'POST'): void {
        var _this = this;
        if (typeof url === "string") {
            var cmd = url.substr(0, 9);
            if (cmd === "FSCommand") {
                var values = url.split(":");
                cmd = values.pop();
                var str = arguments[1];
                if (str === undefined) {
                    str = "";
                }

                var stage = _this.getStage();
                var FSCommand = stage.abc.flash.system.fscommand;
                return FSCommand.apply(stage, [cmd, str]);
            }
        }

        if (target && typeof target === "string") {
            switch (target.toLowerCase()) {
                case "_self":
                case "_blank":
                case "_parent":
                case "_top":
                    break;
                case "post":
                    target = "_self";
                    method = "GET";
                    break;
                case "get":
                    target = "_self";
                    method = "GET";
                    break;
                default:
                    if (!method) {
                        method = "GET";
                    }
                    _this.loadMovie(url, target, method);
                    return;
            }
        }

        // form
        if (method === "POST") {
            var form = document.createElement("form");
            form.action = url;
            form.method = method;
            if (target) {
                form.target = target;
            }

            var urls = url.split("?");
            if (urls.length > 1) {
                var pears = urls[1].split("&");
                var pLen = pears.length;
                var _encodeURI = encodeURI;
                for (var pIdx = 0; pIdx < pLen; pIdx++) {
                    var pear = pears[pIdx].split("=");
                    var input = document.createElement("input");
                    input.type = "hidden";
                    input.name = pear[0];
                    input.value = _encodeURI(pear[1] || "");
                    form.appendChild(input);
                }
            }
            document.body.appendChild(form);
            form.submit();
        } else {
            var func = new Function("location.href = '" + url + "';");
            func();
        }
    }

    loadVariables(url: string, target: string, method: 'GET' | 'POST' = 'GET'): void {
        var _this = this;
        var targetMc: DisplayObject = _this;
        if (target) {
            targetMc = _this.getDisplayObject(target);
        }

        if (targetMc) {
            var xmlHttpRequest = new XMLHttpRequest();
            var body = null;
            if (method === "POST") {
                var urls = url.split("?");
                if (urls[1] !== undefined) {
                    body = urls[1];
                }
                xmlHttpRequest.open(method, urls[0], true);
                xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            } else {
                xmlHttpRequest.open("GET", url, true);
            }

            xmlHttpRequest.onreadystatechange = function ()
            {
                var readyState = xmlHttpRequest.readyState;
                if (readyState === 4) {
                    var status = xmlHttpRequest.status;
                    switch (status) {
                        case 200:
                        case 304:
                            var responseText = decodeURIComponent(xmlHttpRequest.responseText);
                            var pairs = responseText.split("&");
                            var length = pairs.length;
                            for (var idx = 0; idx < length; idx++) {
                                var pair = pairs[idx];
                                var values = pair.split("=");
                                targetMc.setVariable(values[0], values[1]);
                            }

                            var _root = _this.getDisplayObject();
                            var rootStage = _root.getStage();
                            var stage = _this.getStage();
                            var onData = targetMc.onData;
                            if (typeof onData === "function") {
                                stage.executeEventAction(onData, targetMc);
                            }

                            clipEvent.type = "data";
                            targetMc.dispatchEvent(clipEvent, rootStage);

                            break;
                    }
                }
            };
            xmlHttpRequest.send(body);
        }
    }

    hitTest(targetMc: MovieClip, x: number = 0, y: number = 0, bool: boolean = false): boolean {
        var _this = this;
        if (!(targetMc instanceof MovieClip)) {
            if (!x || !y) {
                return false;
            }
        }

        var bounds = _this.getHitBounds();
        var xMax = bounds.xMax;
        var xMin = bounds.xMin;
        var yMax = bounds.yMax;
        var yMin = bounds.yMin;

        if (targetMc instanceof MovieClip) {
            var targetBounds = (targetMc as any).getHitBounds();
            var txMax = targetBounds.xMax;
            var txMin = targetBounds.xMin;
            var tyMax = targetBounds.yMax;
            var tyMin = targetBounds.yMin;
            return (txMax > xMin && tyMax > yMin && xMax > txMin && yMax > tyMin);
        } else {
            if (x >= xMin && x <= xMax && y >= yMin && y <= yMax) {
                if (bool) {
                    var matrix: Matrix = [1,0,0,1,0,0];
                    var mc: DisplayObject = _this;
                    while (true) {
                        var parent = mc.getParent();
                        if (!parent.getParent()) {
                            break;
                        }
                        matrix = multiplicationMatrix(parent.getMatrix(), matrix);
                        mc = parent;
                    }
                    var _root = _this.getDisplayObject("_root");
                    var stage = _root.getStage();
                    var ctx = stage.hitContext;
                    var scale = stage.getScale();
                    x *= scale;
                    y *= scale;
                    y *= devicePixelRatio;
                    x *= devicePixelRatio;

                    return _this.renderHitTest(ctx, matrix, stage, x, y);
                } else {
                    return true;
                }
            }
            return false;
        }
    }

    getHitBounds(): Bounds {
        var _this = this;
        var mc: DisplayObject = _this;
        var matrix = _this.getMatrix();
        while (true) {
            var parent = mc.getParent();
            if (!parent.getParent()) {
                break;
            }
            matrix = multiplicationMatrix(parent.getMatrix(), matrix);
            mc = parent;
        }
        return _this.getBounds(matrix);
    }

    getInstanceAtDepth(depth: number): any {
        var _this = this;
        var parent = _this.getParent();
        if (!parent) {
            parent = _this.getDisplayObject("_root");
        }
        var tags = parent.getTags();
        depth += 16384;
        return tags[depth];
    }

    swapDepths(mcOrDepth: MovieClip | number): void {
        var _this = this;
        var parent = _this.getParent();
        if (parent) {
            var tags = parent.getTags();
            if (mcOrDepth instanceof MovieClip) {
                const mc = mcOrDepth;
                if (parent === mc.getParent()) {
                    const depth = _this.getDepth() + 16384;
                    var swapDepth = mc.getDepth() + 16384;
                    _this.setDepth(depth, swapDepth, mc);
                }
            } else {
                let depth = mcOrDepth;
                if (isNaN(depth) && parent instanceof MovieClip) {
                    depth = parent.getNextHighestDepth();
                }
                if (16384 > depth) {
                    depth += 16384;
                }
                if (depth in tags) {
                    var id = tags[depth];
                    if (id !== _this.instanceId) {
                        var stage = _this.getStage();
                        var instance = stage.getInstance(id);
                        if (!(instance instanceof MovieClip))
                            throw new Error('Not a MovieClip: ' + instance);
                        _this.swapDepths(instance);
                    }
                } else {
                    _this.setDepth(depth);
                }
            }
        }
    }

    setDepth(depth: number, swapDepth?: number, swapMc?: DisplayObject): void {
        var parent = this.getParent() as DisplayObjectContainer;
        var _depth = this._depth;
        var level = (_depth !== null) ? _depth : this.getLevel();
        var totalFrame = parent instanceof MovieClip ? parent.getTotalFrames() + 1 : 1;

        if (!swapMc) {
            this._depth = depth;
        } else {
            this._depth = swapDepth;
            (swapMc as any)._depth = depth;
        }

        var container = parent.getContainer();
        var instanceId = this.instanceId;
        for (var frame = 1; frame < totalFrame; frame++) {
            if (!(frame in container)) {
                container[frame] = [];
            }

            var tags = container[frame];
            if (swapMc) {
                if (level in tags && tags[level] === instanceId) {
                    tags[depth] = swapMc.instanceId;
                }

                if (swapDepth in tags && tags[swapDepth] === swapMc.instanceId) {
                    tags[swapDepth] = instanceId;
                }
            } else {
                if (!(level in tags) || level in tags && tags[level] === instanceId) {
                    delete tags[level];
                    tags[depth] = instanceId;
                }
            }

            container[frame] = tags;
        }
        this.setController(false, false, false, false);
        if (swapMc) {
            swapMc.setController(false, false, false, false);
        }
    }


    attachMovie(id: string, name: string, depth: number = NaN, object?: any): void {
        var movieClip = null;
        var _this = this;
        if (isNaN(depth)) {
            depth = _this.getNextHighestDepth();
        }
        if (depth < 16384) {
            depth += 16384;
        }

        var mc = _this.getDisplayObject(name);
        if (!(mc instanceof MovieClip))
            throw new Error('Not a MovieClip: ' + mc);

        if (mc) {
            mc.removeMovieClip();
        }

        var stage = _this.getStage();
        var exportAssets = stage.swftag.exportAssets;
        if (id in exportAssets) {
            var characterId = exportAssets[id];
            var tag = stage.swftag.getCharacter<DefineSpriteCharacter>(characterId);
            if (tag) {
                movieClip = new MovieClip();
                movieClip.setStage(stage);
                movieClip.setParent(_this);
                movieClip.setCharacterId(characterId);
                movieClip.setLevel(depth);
                movieClip.setName(name);
                movieClip.setTarget(_this.getTarget() + "/" + name);

                // init action
                var initAction = stage.swftag.initActions[characterId];
                if (typeof initAction === "function") {
                    movieClip.active = true;
                    initAction.apply(movieClip);
                    movieClip.reset();
                }

                // registerClass
                var RegClass = stage.swftag.registerClass[characterId];
                if (RegClass) {
                    movieClip.variables.registerClass = new RegClass();
                }

                var swfTag = new SwfTag(stage, null);
                swfTag.build(tag, movieClip);

                var placeObject = new PlaceObject();
                var instanceId = _this.instanceId;
                var totalFrame = _this.getTotalFrames() + 1;
                var container = _this.getContainer();
                for (var frame = 1; frame < totalFrame; frame++) {
                    if (!(frame in container)) {
                        container[frame] = [];
                    }
                    container[frame][depth] = movieClip.instanceId;
                    stage.setPlaceObject(placeObject, instanceId, depth, frame);
                }

                if (object) {
                    for (var prop in object) {
                        if (!object.hasOwnProperty(prop)) {
                            continue;
                        }
                        movieClip.setProperty(prop, object[prop]);
                    }
                }

                var _root = _this.getDisplayObject("_root");
                var rootStage = _root.getStage();
                movieClip.addActions(rootStage);
            }
        }
        return movieClip;
    };

    getNextHighestDepth(): number {
        var depth = 0;
        var _this = this;
        var container = _this.getContainer();
        for (var idx in container) {
            if (!container.hasOwnProperty(idx)) {
                continue;
            }
            var children = container[idx];
            depth = Math.max(depth, children.length);
        }
        if (16384 > depth) {
            depth = 0;
        }
        return depth;
    }

    getBytesLoaded(): number {
        return this.getBytesTotal();
    }

    getBytesTotal(): number {
        var stage = this.getStage();
        return stage.fileSize;
    }

    updateAfterEvent(): void {
        var _root = this.getDisplayObject("_root");
        var stage = _root.getStage();
        stage.touchRender();
    }

    duplicateMovieClip(target: string, name: string, depth: number): MovieClip {
        var _this = this;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getStage();

        var targetMc = _this.getDisplayObject(name);
        var parent;
        var object;
        if (!targetMc && stage.getVersion() > 4) {
            target = arguments[0];
            depth = arguments[1];
            if (isNaN(depth)) {
                parent = _this.getParent();
                if (!parent) {
                    parent = stage.getParent();
                }
                depth = parent.getNextHighestDepth();
            }
            object = arguments[2];
            targetMc = _this;
        }

        if (16384 > depth) {
            depth += 16384;
        }

        var cloneMc;
        if (targetMc !== undefined && targetMc.getCharacterId() !== 0) {
            if (!(targetMc instanceof MovieClip))
                throw new Error('Not a MovieClip: ' + targetMc);

            stage = targetMc.getStage();
            parent = targetMc.getParent();
            if (!parent) {
                parent = stage.getParent();
            }

            var char = stage.swftag.getCharacter(targetMc.characterId);
            var swftag = new SwfTag(stage);
            if (char instanceof Array) {
                cloneMc = new MovieClip();
                cloneMc.setStage(stage);
                cloneMc.setParent(parent);
                cloneMc.setLevel(depth);
                cloneMc.setTotalFrames(targetMc.getTotalFrames());
                cloneMc.setCharacterId(targetMc.characterId);
                swftag.build(char, cloneMc);
            } else {
                var tag = {
                    CharacterId: targetMc.characterId,
                    Ratio: 0,
                    Depth: depth
                };
                cloneMc = swftag.buildObject(tag, parent);
            }

            cloneMc.setName(target);
            if (targetMc._matrix) {
                cloneMc._blendMode = targetMc._blendMode;
                cloneMc._filters = targetMc._filters;
                cloneMc._matrix = cloneArray(targetMc._matrix);
                cloneMc._colorTransform = cloneArray(targetMc._colorTransform);
            }

            var totalFrame = parent.getTotalFrames() + 1;
            var container = parent.getContainer();
            var instanceId = parent.instanceId;
            var placeObjects = stage.placeObjects[instanceId];
            var level = targetMc.getLevel();
            for (var frame = 1; frame < totalFrame; frame++) {
                if (!(frame in container)) {
                    container[frame] = [];
                }
                container[frame][depth] = cloneMc.instanceId;

                if (frame in placeObjects) {
                    var placeObject = placeObjects[frame][level];
                    if (placeObject) {
                        if (!(frame in placeObjects)) {
                            placeObjects[frame] = [];
                        }
                        placeObjects[frame][depth] = placeObject.clone();
                    }
                }
            }

            if (object) {
                for (var prop in object) {
                    if (!object.hasOwnProperty(prop)) {
                        continue;
                    }
                    cloneMc.setProperty(prop, object[prop]);
                }
            }

            cloneMc.addActions(stage);
        }

        return cloneMc;
    }

    removeMovieClip(name?: string): void {
        var _this = this;
        var targetMc: DisplayObject = _this;
        if (typeof name === "string") {
            var target = _this.getDisplayObject(name);
            if (target) {
                targetMc = target;
            }
        }

        var depth = targetMc.getDepth() + 16384;
        var level = targetMc.getLevel();
        if (targetMc instanceof MovieClip && depth >= 16384) {
            targetMc = targetMc as any;
            targetMc.reset();
            targetMc.removeFlag = true;
            var parent = targetMc.getParent();
            if (!(parent instanceof MovieClip))
                throw new Error('Not a MovieClip: ' + parent);

            var container = parent.getContainer();
            var instanceId = targetMc.instanceId;
            var tagId;
            for (var frame = parent.getTotalFrames() + 1; --frame;) {
                if (!(frame in container)) {
                    continue;
                }

                var tags = container[frame];
                if (depth in tags) {
                    tagId = tags[depth];
                    if (tagId === instanceId) {
                        delete container[frame][depth];
                    }
                }

                if (depth !== level && 16384 > level) {
                    if (!(level in tags)) {
                        tags[level] = instanceId;
                    }
                }
            }
        }
    }

    initFrame(): void {
        var _this = this;
        _this.active = true;

        var stage = _this.getStage();
        var tags = _this.getTags();
        var length = tags.length;
        if (length) {
            tags.reverse();
            for (var depth in tags) {
                if (!tags.hasOwnProperty(depth)) {
                    continue;
                }

                var instanceId = tags[depth];
                var instance = stage.getInstance(instanceId);
                if (!instance) {
                    continue;
                }
                instance.initFrame();
            }
            tags.reverse();
        }

        var initAction = stage.swftag.initActions[_this.getCharacterId()];
        if (typeof initAction === "function") {
            initAction.apply(_this);
        }
    }

    putFrame(stage: Stage, clipEvent: ClipEvent): void {
        var _this = this;
        var myStage = _this.getStage();
        var prevTags;
        var stopFlag = _this.stopFlag;
        if (!stopFlag && _this.active) {
            var frame = _this.getCurrentFrame();
            var totalFrames = _this.getTotalFrames();
            if (totalFrames > 1) {
                if (_this.isLoad) {
                    prevTags = _this.getTags();
                    frame++;
                }
                if (frame > totalFrames) {
                    frame = 1;
                    _this.resetCheck();
                }

                _this.setCurrentFrame(frame);
                _this.remove(stage);
                _this.isAction = true;
                _this.soundStopFlag = false;
            }
        }

        if (_this.removeFlag) {
            return;
        }

        _this.active = true;
        if (prevTags !== undefined) {
            if (_this.isSwap) {
                _this.resetSwap();
            }

            var tags = _this.getTags();
            var length = tags.length;
            if (length && tags.toString() !== prevTags.toString()) {
                for (var depth in tags) {
                    if (!tags.hasOwnProperty(depth)) {
                        continue;
                    }

                    var instanceId = tags[depth];
                    if (depth in prevTags && instanceId === prevTags[depth]) {
                        continue;
                    }

                    var instance = myStage.getInstance(instanceId);
                    if (instance && instance instanceof MovieClip) {
                        stage.newTags.unshift(instance);
                    }
                }
            }
        }

        if (_this.isLoad) {
            clipEvent.type = "enterFrame";
            _this.dispatchEvent(clipEvent, stage);
            _this.dispatchOnEvent("onEnterFrame", stage);
            _this.addTouchEvent(stage);
            if (_this.isAction) {
                _this.isAction = false;
                var as = _this.getActions(_this.getCurrentFrame());
                if (as) {
                    _this.setActionQueue(as, stage);
                }
            }
        } else {
            // init action
            var initAction = myStage.swftag.initActions[_this.getCharacterId()];
            if (typeof initAction === "function") {
                initAction.apply(_this);
            }
        }
    }

    nextFrame(): void {
        var _this = this;
        var frame = _this.getCurrentFrame();
        frame++;
        _this.setNextFrame(frame);
        _this.stop();
    }

    prevFrame(): void {
        var _this = this;
        var frame = _this.getCurrentFrame();
        frame--;
        _this.setNextFrame(frame);
        _this.stop();
    }

    getCurrentFrame(): number {
        return this._currentframe;
    }

    setCurrentFrame(frame: number): void {
        this._currentframe = frame;
    }

    setNextFrame(frame: number): void {
        var _this = this;
        if (frame > 0 && _this.getCurrentFrame() !== frame) {
            _this.isAction = true;

            if (frame > _this.getTotalFrames()) {
                frame = _this.getTotalFrames();
                _this.isAction = false;
            }

            var maxFrame = Math.max(frame, _this.getCurrentFrame()) + 1;
            var minFrame = Math.min(frame, _this.getCurrentFrame());

            var stage = _this.getStage();
            var tags = _this.getTags();
            var checked = [];
            var nextTags = _this.getTags(frame);
            var tag, tagId, depth, nextTag, nextTagId;
            var length = Math.max(tags.length, nextTags.length);
            if (length) {
                for (depth = 0; depth < length; depth++) {
                    if (!(depth in tags) && !(depth in nextTags)) {
                        continue;
                    }

                    tagId = tags[depth];
                    nextTagId = nextTags[depth];
                    if (!tagId && !nextTagId) {
                        continue;
                    }

                    tag = stage.getInstance(tagId);
                    nextTag = stage.getInstance(nextTagId);
                    if (tagId && nextTagId) {
                        if (tagId === nextTagId) {
                            checked[tagId] = true;
                            continue;
                        }

                        tag.reset();
                        nextTag.reset();
                        checked[tagId] = true;
                        checked[nextTagId] = true;
                    } else if (tag) {
                        tag.reset();
                        checked[tagId] = true;
                    } else if (nextTag) {
                        nextTag.reset();
                        checked[nextTagId] = true;
                    }
                }
            }

            if (checked.length) {
                for (var chkFrame = minFrame; chkFrame < maxFrame; chkFrame++) {
                    var container = _this.getTags(chkFrame);
                    if (!container.length) {
                        continue;
                    }

                    for (depth in container) {
                        if (!container.hasOwnProperty(depth)) {
                            continue;
                        }
                        tagId = container[depth];
                        if (tagId in checked) {
                            continue;
                        }

                        checked[tagId] = true;
                        tag = stage.getInstance(tagId);
                        tag.reset();
                    }
                }
            }

            _this.setCurrentFrame(frame);
            _this.soundStopFlag = false;

            var _root = _this.getDisplayObject("_root");
            var rootStage = _root.getStage();
            _this.addActions(rootStage);
        }
    }

    getTotalFrames(): number {
        return this._totalframes;
    }

    setTotalFrames(frame: number): void {
        this._totalframes = frame;
    }

    addLabel(frame: number, name: string): void {
        if (typeof name !== "string") {
            name = '' + name as any;
        }
        this.labels[name.toLowerCase()] = frame|0;
    }

    getLabel(name: string): number {
        if (typeof name !== "string") {
            name = '' + name as any;
        }
        return this.labels[name.toLowerCase()];
    }

    addSound(frame: number, obj: StartSoundTag): void {
        if (!(frame in this.sounds)) {
            this.sounds[frame] = [];
        }
        this.sounds[frame].push(obj);
    }

    getSounds(): StartSoundTag[] {
        return this.sounds[this.getCurrentFrame()];
    }

    startSound_mc(sound: StartSoundTag): void {
        var _this = this;
        var stage = _this.getStage();
        var soundId = sound.SoundId;
        var tag = stage.swftag.getCharacter<StartSound>(soundId);
        if (!tag)
            return;

        var soundInfo = tag.SoundInfo;
        startSound(sound.Audio, soundInfo);
        _this.soundStopFlag = true;
    }

    getTags(frame: number = this.getCurrentFrame()): any {
        return this.container[frame] || [];
    }

    setRemoveTag(frame: number, tags: RemoveObject[]): void {
        this.removeTags[frame] = {};
        for (const tag of tags)
            this.removeTags[frame][tag.Depth] = 1;
    }

    getRemoveTags(frame: number): { [depth: number]: 1 }
    {
        return this.removeTags[frame];
    };

    remove(stage: Stage): void {
        var _this = this;
        var removeTags = _this.getRemoveTags(_this.getCurrentFrame());
        if (removeTags) {
            var myStage = _this.getStage();
            var frame = _this.getCurrentFrame() - 1;
            var tags = _this.getTags(frame);
            for (var idx in tags) {
                if (!tags.hasOwnProperty(idx)) {
                    continue;
                }

                var instanceId = tags[idx];
                var tag = myStage.getInstance(instanceId);
                if (!tag) {
                    continue;
                }

                if (tag instanceof MovieClip) {
                    tag = tag as any;
                    var depth = tag.getDepth() + 16384;
                    if (!(depth in removeTags)) {
                        continue;
                    }

                    clipEvent.type = "unload";
                    _this.dispatchEvent(clipEvent, stage);
                    tag.reset();
                } else {
                    if (!(idx in removeTags)) {
                        continue;
                    }
                    tag.reset();
                }
            }
        }
    }

    resetCheck(): void {
        var _this = this;
        var instances = _this.getInstances();
        var stage = _this.getStage();
        for (var id in instances) {
            if (!instances.hasOwnProperty(id)) {
                continue;
            }

            var instance = stage.getInstance(+id);
            if (!instance || (!instance.getRatio() && !instance.removeFlag)) {
                continue;
            }
            instance.reset();
        }
    }

    resetSwap(): void {
        var _this = this;
        var stage = _this.getStage();
        var currentTags = _this.getTags();
        var totalFrames = _this.getTotalFrames() + 1;
        for (var frame = 1; frame < totalFrames; frame++) {
            var tags = _this.getTags(frame);
            var length = tags.length;
            if (length) {
                var resetTags = [];
                for (var sdepth in tags) {
                    if (!tags.hasOwnProperty(sdepth)) {
                        continue;
                    }

                    var depth = parseInt(sdepth);
                    var tagId = tags[depth];
                    var instance = stage.getInstance(tagId);
                    if (!instance) {
                        delete tags[depth];
                        continue;
                    }

                    if (instance.active) {
                        continue;
                    }

                    if (instance.getLevel() !== depth) {
                        if (!(instance.getLevel() in currentTags)) {
                            instance._depth = null;
                            resetTags[instance.getLevel()] = tagId;
                        }
                        delete tags[depth];
                    }
                }

                length = resetTags.length;
                if (length) {
                    for (var level in resetTags) {
                        if (!resetTags.hasOwnProperty(level)) {
                            continue;
                        }
                        tags[level] = resetTags[level];
                    }
                }
            }
        }
        _this.isSwap = false;
    }

    reset(): void {
        // NO CALL super.reset() because DisplayObjectContainer ruined this.container

        var _this = this;
        var stage = _this.getStage();
        var instances = _this.getInstances();
        for (var id in instances) {
            if (!instances.hasOwnProperty(id)) {
                continue;
            }
            var instance = stage.getInstance(+id);
            if (instance instanceof MovieClip && instance.getDepth() >= 0) {
                instance.removeMovieClip();
                if (instance.getDepth() < 0) {
                    instance.removeFlag = false;
                }
            } else {
                instance.reset();
            }
        }

        var parent = _this.getParent() as DisplayObjectContainer;
        if (parent && _this.getLevel() !== _this.getDepth()+16384) {
            parent.isSwap = true;
        }

        _this.play();
        _this.setCurrentFrame(1);
        _this.clear();
        _this.initParams();
        _this.variables = {};
    }

    private initParams(): void {
        var _this = this as any;
        _this.active = false;
        _this.removeFlag = false;
        _this.isLoad = false;
        _this.isMask = false;
        _this.isAction = true;
        _this.soundStopFlag = false;
        _this._dropTarget = null;
        _this._depth = null;
        _this._mask = null;
        _this._matrix = null;
        _this._colorTransform = null;
        _this._filters = null;
        _this._blendMode = null;
        _this.buttonStatus = "up";
        _this.mouseEnabled = true;
        _this.setVisible(true);
        _this.setEnabled(true);
    }

    addTouchEvent(stage: Stage): void {
        var _this = this;
        var events = _this.getEvents();
        var moveEventHits = stage.moveEventHits;
        var downEventHits = stage.downEventHits;
        var upEventHits = stage.upEventHits;
        var keyDownEventHits = stage.keyDownEventHits;
        for (var name in events) {
            if (!events.hasOwnProperty(name)) {
                continue;
            }
            var as = events[name];
            switch (name) {
                case "mouseDown":
                    downEventHits[downEventHits.length] = {as: as, mc: _this};
                    break;
                case "mouseMove":
                    moveEventHits[moveEventHits.length] = {as: as, mc: _this};
                    break;
                case "mouseUp":
                    upEventHits[upEventHits.length] = {as: as, mc: _this};
                    break;
                case "keyDown":
                    if (isTouch) {
                        downEventHits[downEventHits.length] = {
                            as: as,
                            mc: _this
                        };
                    } else {
                        keyDownEventHits[keyDownEventHits.length] = {
                            as: as,
                            mc: _this
                        };
                    }
                    break;
                case "keyUp":
                    upEventHits[upEventHits.length] = {as: as, mc: _this};
                    break;
            }
        }

        var variables = _this.variables;
        var onMouseDown = variables.onMouseDown;
        if (onMouseDown) {
            downEventHits[downEventHits.length] = {mc: _this};
        }
        var onMouseMove = variables.onMouseMove;
        if (onMouseMove) {
            moveEventHits[moveEventHits.length] = {mc: _this};
        }
        var onMouseUp = variables.onMouseUp;
        if (onMouseUp) {
            upEventHits[upEventHits.length] = {mc: _this};
        }
    }

    createActionScript(script: ActionScript): MCAction {
        return ((clip, origin) => {
            var as = new ActionScript([], origin.constantPool, origin.register, origin.initAction);
            as.cache = origin.cache;
            as.scope = clip;
            return () => {
                as.reset();
                as.variables["this"] = this;
                return as.execute(clip);
            };
        })(this, script);
    }

    createActionScript2(script: ActionScript, parent?: DisplayObject): MCAction {
        return ((clip, origin, chain) => {
            return function () {
                var as = new ActionScript([], origin.constantPool, origin.register, origin.initAction);
                as.parentId = origin.id; // todo
                as.cache = origin.cache;
                as.scope = clip;
                as.parent = (chain) ? chain : null;
                if (as.register.length) {
                    as.initVariable(arguments);
                }
                as.variables["this"] = this;
                return as.execute(clip);
            };
        })(this, script, parent);
    }

    addFrameScript(...args): void {
        var _this = this;
        for (var i = 0; i < args.length; i++) {
            var frame = args[i++];
            var script = args[i];
            if (typeof frame === "string") {
                frame = _this.getLabel(frame);
            } else {
                frame += 1;
            }

            frame = frame|0;
            if (frame > 0 && _this.getTotalFrames() >= frame) {
                var actions = _this.actions;
                if (!(frame in actions)) {
                    actions[frame] = [];
                }

                if (script === null) {
                    actions[frame] = [];
                } else {
                    actions[frame].push(script);
                }
            }
        }
    }

    addActions(stage: Stage): void {
        var _this = this;
        _this.active = true;
        var myStage = _this.getStage();

        if (_this.isAction) {
            _this.isAction = false;
            if (!_this.isLoad) {
                // as3
                _this.buildAVM2();

                // registerClass
                var RegClass = myStage.swftag.registerClass[_this.getCharacterId()];
                if (typeof RegClass === "function") {
                    _this.variables.registerClass = new RegClass();
                }

                // clipEvent
                clipEvent.type = "initialize";
                _this.dispatchEvent(clipEvent, stage);
                clipEvent.type = "construct";
                _this.dispatchEvent(clipEvent, stage);
                clipEvent.type = "load";
                _this.dispatchEvent(clipEvent, stage);

                var onLoad = _this.variables.onLoad;
                if (typeof onLoad === "function") {
                    _this.setActionQueue(onLoad, stage);
                }
                _this.addTouchEvent(stage);
            }

            var action = _this.getActions(_this.getCurrentFrame());
            if (action) {
                _this.setActionQueue(action, stage);
            }
        }

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

    getActions(frame: number): MCAction[] {
        return this.actions[frame];
    }

    setActions(frame: number, actionScript: string): void {
        var _this = this;
        var actions = _this.actions;
        if (!(frame in actions)) {
            actions[frame] = [];
        }
        actions[frame].push(_this.createActionScript(actionScript));
    }

    overWriteAction(frame: number | string, action: MCAction): void {
        var _this = this;
        if (typeof frame === "string") {
            frame = _this.getLabel(frame);
        }
        frame = frame|0;
        if (frame > 0 && _this.getTotalFrames() >= frame) {
            _this.actions[frame] = [action];
        }
    }

    addAction(frame: number | string, action: MCAction): void {
        var _this = this;
        if (typeof frame === "string") {
            frame = _this.getLabel(frame);
        }
        frame = frame|0;
        if (frame > 0 && _this.getTotalFrames() >= frame) {
            var actions = _this.actions;
            if (!(frame in actions)) {
                actions[frame] = [];
            }
            actions[frame].push(action);
        }
    }

    executeActions(frame: number): void {
        var _this = this;
        var actions = _this.getActions(frame);
        if (actions !== undefined) {
            for (const action of actions)
                action.apply(_this);
        }
    }

    ASSetPropFlags(): void {
        // object, properties, n, allowFalse
    }

    beginFill(rgb: number | string, alpha: number): void {
        var graphics = this.getGraphics();
        graphics.beginFill(rgb, alpha);
    }

    lineStyle(width: number = NaN,
              rgb: number = 0x000000,
              alpha: number = 1,
              pixelHinting: boolean = false,
              noScale: number = 0,
              capsStyle: CAP = CAP.ROUND,
              jointStyle: JOIN = JOIN.ROUND,
              miterLimit: number = 3): void
    {
        var graphics = this.getGraphics();
        graphics.lineStyle(width, rgb, alpha, pixelHinting, noScale, capsStyle, jointStyle, miterLimit);
    }

    moveTo(x: number, y: number): void {
        var graphics = this.getGraphics();
        graphics.moveTo(x, y);
    }

    lineTo(x: number, y: number): void {
        var graphics = this.getGraphics();
        graphics.lineTo(x, y);
    }

    curveTo(cx: number, cy: number, dx: number, dy: number): void {
        var graphics = this.getGraphics();
        graphics.curveTo(cx, cy, dx, dy);
    }

    clear(): void {
        var graphics = this.getGraphics();
        graphics.clear();
    }

    endFill(): void {
        var graphics = this.getGraphics();
        graphics.endFill();
    }

    private buildAVM2(): void {
        var _this = this;
        var stage = _this.getStage();
        var symbol = stage.swftag.symbols[_this.getCharacterId()];
        if (symbol) {
            var symbols = symbol.split(".");
            var classMethod = symbols.pop();
            var length = symbols.length;
            var classObj = stage.avm2;
            var abcObj = stage.abc;
            for (var i = 0; i < length; i++) {
                classObj = classObj[symbols[i]];
                abcObj = abcObj[symbols[i]];
            }

            // build abc
            var DoABC = abcObj[classMethod];
            var ABCObj = new DoABC(_this);
            classObj[classMethod] = ABCObj;
            _this.avm2 = ABCObj;
            // AVM2 init
            var AVM2 = ABCObj[classMethod];
            if (typeof AVM2 === "function") {
                _this.actions = [];
                AVM2.apply(_this);
            }
        }
    };
}

CLS.MovieClip = MovieClip;
