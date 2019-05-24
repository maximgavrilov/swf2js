/*jshint bitwise: false*/
/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import {
    BevelFilter, BitmapFilter, BlurFilter, ColorMatrixFilter,
    ConvolutionFilter, DropShadowFilter, GradientBevelFilter,
    GradientGlowFilter, GlowFilter
} from './BitmapFilter';
import { cacheStore } from './CacheStore';
import { DisplayObject } from './DisplayObject';
import { LoadVars } from './LoadVars';
import { stages, stageId, Stage } from './Stage';
import { isXHR2 } from './utils';

if (!("swf2js" in window)){(function(window)
{
    // params
    var resizeId = 0;
    var loadStages = [];
    DisplayObject.loadStages = loadStages; // any

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
        for (var i in stages) {
            if (!stages.hasOwnProperty(i)) {
                continue;
            }
            var stage = stages[i];
            if (!stage.isLoad) {
                continue;
            }
            stage.resize();
        }
    }

    /**
     * resize event
     */
    window.addEventListener("resize", function ()
    {
        clearTimeout(resizeId);
        resizeId = setTimeout(resizeCanvas, 300);
    });

    /**
     * unload event
     */
    window.addEventListener("unload", function ()
    {
        // stages = void 0; // ANY
        loadStages = void 0;
    });

    /**
     * @constructor
     */
    var Swf2js = function () {};

    /**
     * @type {DropShadowFilter}
     */
    Swf2js.prototype.DropShadowFilter = DropShadowFilter;

    /**
     * @type {BlurFilter}
     */
    Swf2js.prototype.BlurFilter = BlurFilter;

    /**
     * @type {GlowFilter}
     */
    Swf2js.prototype.GlowFilter = GlowFilter;

    /**
     * @type {BevelFilter}
     */
    Swf2js.prototype.BevelFilter = BevelFilter;

    /**
     * @type {GradientGlowFilter}
     */
    Swf2js.prototype.GradientGlowFilter = GradientGlowFilter;

    /**
     * @type {ConvolutionFilter}
     */
    Swf2js.prototype.ConvolutionFilter = ConvolutionFilter;

    /**
     * @type {ColorMatrixFilter}
     */
    Swf2js.prototype.ColorMatrixFilter = ColorMatrixFilter;

    /**
     * @type {GradientBevelFilter}
     */
    Swf2js.prototype.GradientBevelFilter = GradientBevelFilter;

    /**
     * @type {BitmapFilter}
     */
    Swf2js.prototype.BitmapFilter = BitmapFilter;

    /**
     * @type {LoadVars}
     */
    Swf2js.prototype.LoadVars = LoadVars;

    /**
     * @param url
     * @param options
     */
    Swf2js.prototype.load = function (url, options)
    {
        // develop only
        if (url === "develop") {
            url = location.search.substr(1).split("&")[0];
        }

        if (url) {
            var stage = (options && options.stage instanceof Stage) ? options.stage : new Stage();
            stage.setOptions(options);
            stages[stage.getId()] = stage;
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
                            stage.parse(data, url);
                            console.timeEnd('parse');

                            cacheStore.reset();
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
    };

    /**
     * @param url
     * @param options
     * @returns {*}
     */
    Swf2js.prototype.reload = function(url, options)
    {
        if (!stageId) {
            return this.load(url, options);
        }
        var stage = stages[0];
        for (var i in stages) {
            if (!stages.hasOwnProperty(i)) {
                continue;
            }
            var target = stages[i];
            target.stop();
            if (i) {
                target.deleteNode(target.tagId);
                target = void 0;
            }
        }

        // stageId = 1; // ANY
        // stages = []; // ANY
        loadStages = [];
        stages[0] = stage;
        stage.reload(url, options);
    };

    /**
     * @param width
     * @param height
     * @param fps
     * @param options
     * @returns {MovieClip}
     */
    Swf2js.prototype.createRootMovieClip = function(width, height, fps, options)
    {
        var stage = new Stage();
        width = width || 240;
        height = height || 240;
        fps = fps || 60;

        stage.setBaseWidth(width);
        stage.setBaseHeight(height);
        stage.setFrameRate(fps);
        stage.setOptions(options);
        stages[stage.getId()] = stage;
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
    };

    (window as any).swf2js = new Swf2js();
})(window);}
