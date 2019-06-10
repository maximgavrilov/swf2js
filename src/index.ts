/*jshint bitwise: false*/
/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { BitIO } from './BitIO';
import { DisplayObject } from './DisplayObject';
import { Stage, StageOptions } from './Stage';
import { SwfTag } from './SwfTag';
import { isXHR2 } from './utils';

// params
if (typeof Object.defineProperty !== "function") {
    Object.defineProperty = function (obj, prop, desc)
    {
        if ("value" in desc) {
            obj[prop] = desc.value;
        }
        if ("get" in desc) {
            obj.__defineGetter__(prop, desc.get);
        }
        if ("set" in desc) {
            obj.__defineSetter__(prop, desc.set);
        }
        return obj;
    };
}

if (typeof Object.defineProperties !== "function") {
    Object.defineProperties = function (obj, descs)
    {
        for (var prop in descs) {
            if (descs.hasOwnProperty(prop)) {
                Object.defineProperty(obj, prop, descs[prop]);
            }
        }
        return obj;
    };
}

if (typeof Object.getPrototypeOf !== "function") {
    Object.getPrototypeOf = function (obj)
    {
        return obj.__proto__;
    };
}

if (typeof (Object as any).setPrototypeOf !== "function") {
    (Object as any).setPrototypeOf = function (obj, proto) {
        obj.__proto__ = proto;
        return obj;
    };
}

/**
 * resize
 */
function resizeCanvas()
{
    for (const stageId in DisplayObject.stages) {
        const stage = DisplayObject.stages[stageId];
        stage.resize();
    }
}

/**
 * resize event
 */
let resizeId = 0;

window.addEventListener("resize", () => {
    clearTimeout(resizeId);
    resizeId = setTimeout(resizeCanvas, 300);
});

/**
 * unload event
 */
window.addEventListener("unload", () => {
    DisplayObject.stages = void 0;
    DisplayObject.loadStages = void 0;
});

export class Swf2js {
    loadLib(url: string, cb: (swftag: SwfTag) => void): void
    {
        const xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("GET", url, true);
        if (isXHR2) {
            xmlHttpRequest.responseType = "arraybuffer";
        } else {
            xmlHttpRequest.overrideMimeType("text/plain; charset=x-user-defined");
        }

        xmlHttpRequest.onreadystatechange = function () {
            const readyState = xmlHttpRequest.readyState;
            if (readyState !== 4)
                return;

            var status = xmlHttpRequest.status;
            switch (status) {
                case 200:
                case 304:
                    const data = (isXHR2) ? xmlHttpRequest.response : xmlHttpRequest.responseText;
                    const bitio = new BitIO(data);
                    const swftag = new SwfTag(bitio);

                    console.time('parse');
                    swftag.parse();
                    console.timeEnd('parse');

                    cb && cb(swftag);
                    break;
                default :
                    window.alert('http status: ' + status + ' ' + xmlHttpRequest.statusText);
                    break;
            }
        };
        xmlHttpRequest.send(null);
    }

    load(url: string, options: Partial<StageOptions & { swfId: number; }>): void
    {
        // develop only
        if (url === "develop") {
            url = location.search.substr(1).split("&")[0];
        }

        if (url) {
            var stage: Stage = (options && options.stage instanceof Stage) ? options.stage : new Stage();
            stage.setOptions(options);
            DisplayObject.stages[stage.getId()] = stage;
            stage.init();

            var xmlHttpRequest = new XMLHttpRequest();
            xmlHttpRequest.open("GET", url, true);
            if (isXHR2) {
                xmlHttpRequest.responseType = "arraybuffer";
            } else {
                xmlHttpRequest.overrideMimeType("text/plain; charset=x-user-defined");
            }

            xmlHttpRequest.onreadystatechange = function ()
            {
                var readyState = xmlHttpRequest.readyState;
                if (readyState === 4) {
                    var status = xmlHttpRequest.status;
                    switch (status) {
                        case 200:
                        case 304:
                            var data = (isXHR2) ? xmlHttpRequest.response : xmlHttpRequest.responseText;
                            console.time('parse');
                            const bitio = new BitIO(data);
                            const swftag = new SwfTag(bitio);
                            if (options.swfId)
                                swftag.swfId = options.swfId;
                            stage.parse(swftag, url);
                            console.timeEnd('parse');

                            break;
                        default :
                            window.alert('http status: ' + status + ' ' + xmlHttpRequest.statusText);
                            break;
                    }
                }
            };
            xmlHttpRequest.send(null);
        } else {
            window.alert("please set swf url");
        }
    }

    reload(url: string, options: Partial<StageOptions>): void
    {
        if (!Stage.stageId) {
            return this.load(url, options);
        }
        var stage = DisplayObject.stages[0];
        for (var i in DisplayObject.stages) {
            if (!DisplayObject.stages.hasOwnProperty(i)) {
                continue;
            }
            var target = DisplayObject.stages[i];
            target.stop();
            if (i) {
                target.deleteNode(target.tagId);
                target = void 0;
            }
        }

        Stage.stageId = 1;
        DisplayObject.stages = {};
        DisplayObject.loadStages = {};
        DisplayObject.stages[0] = stage;
        stage.reload(url, options);
    }

    createRootMovieClip(width: number,
                        height: number,
                        fps: number,
                        options: Partial<StageOptions>): DisplayObject
    {
        var stage = new Stage();
        width = width || 240;
        height = height || 240;
        fps = fps || 60;

        stage.setBaseWidth(width);
        stage.setBaseHeight(height);
        stage.setFrameRate(fps);
        stage.setOptions(options);
        DisplayObject.stages[stage.getId()] = stage;
        stage.init();
        stage.isLoad = true;

        if (document.readyState === "loading") {
            var reLoad = function()
            {
                window.removeEventListener("DOMContentLoaded", reLoad, false);
                stage.resize();
                stage.loaded();
            };
            window.addEventListener("DOMContentLoaded", reLoad, false);
        }
        return stage.getParent();
    }
}

(window as any).swf2js = new Swf2js();
