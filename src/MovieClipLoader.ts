/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { DisplayObject } from './DisplayObject';
import { MovieClip } from './MovieClip';
import { Stage, isXHR2 } from './utils';

declare const Stage: any;

export class MovieClipLoader {
    private events = {
        onLoadStart: undefined as Function,
        onLoadProgress: undefined as Function,
        onLoadComplete: undefined as Function,
        onLoadInit: undefined as Function,
        onLoadError: undefined as Function
    };

    onLoadStart?: Function;
    onLoadProgress?: Function;
    onLoadComplete?: Function;
    onLoadInit?: Function;
    onLoadError?: Function;

    loadClip(url: string, target: MovieClip): boolean {
        if (!url || !target) {
            return false;
        }

        var _this = this;
        var events = _this.events;

        var xmlHttpRequest = new XMLHttpRequest();
        xmlHttpRequest.open("GET", url, true);

        if (isXHR2) {
            xmlHttpRequest.responseType = "arraybuffer";
        } else {
            xmlHttpRequest.overrideMimeType("text/plain; charset=x-user-defined");
        }

        var onLoadProgress = events.onLoadProgress;
        if (!onLoadProgress) {
            onLoadProgress = _this.onLoadProgress;
        }
        if (typeof onLoadProgress === "function") {
            xmlHttpRequest.onprogress = function (e) {
                onLoadProgress.apply(_this, [target, e.loaded, e.total]);
            };
        }

        var onLoadComplete = events.onLoadComplete;
        if (!onLoadComplete) {
            onLoadComplete = _this.onLoadComplete;
        }
        if (typeof onLoadComplete === "function") {
            xmlHttpRequest.onloadend = function (e) {
                var eventStatus = (e.currentTarget as any).status;
                if (eventStatus === 200) {
                    onLoadComplete.apply(_this, [target, eventStatus]);
                }
            };
        }

        xmlHttpRequest.onreadystatechange = function ()
        {
            var readyState = xmlHttpRequest.readyState;
            if (readyState === 4) {
                var status = xmlHttpRequest.status;

                var onLoadStart = events.onLoadStart;
                if (!onLoadStart) {
                    onLoadStart = _this.onLoadStart;
                }
                if (typeof onLoadStart === "function") {
                    xmlHttpRequest.onloadstart = function ()
                    {
                        onLoadStart.apply(_this, [target]);
                    };
                }

                switch (status) {
                    case 200:
                    case 304:
                        var _root = target.getDisplayObject("_root");
                        var rootStage = _root.getStage();
                        var data = isXHR2 ? xmlHttpRequest.response : xmlHttpRequest.responseText;

                        var loadStage = new Stage();
                        DisplayObject.loadStages[loadStage.getId()] = loadStage;
                        target._url = url;
                        target.reset();
                        target.setLoadStage(loadStage);

                        loadStage.setParent(target);
                        loadStage.parse(data, url);
                        loadStage.stop();

                        // onLoadInit
                        var onLoadInit = events.onLoadInit;
                        if (!onLoadInit) {
                            onLoadInit = _this.onLoadInit;
                        }
                        if (typeof onLoadInit === "function") {
                            var queue = (function (as, loader, mc) {
                                return function () {
                                    return as.apply(loader, [mc]);
                                };
                            })(onLoadInit, _this, target);
                            target.addEventListener('load', queue);
                        }

                        target.addActions(rootStage);

                        break;
                    default:
                        var onLoadError = events.onLoadError;
                        if (!onLoadError) {
                            onLoadError = _this.onLoadError;
                        }
                        if (typeof onLoadError === "function") {
                            onLoadError.apply(_this, [target, "error", status]);
                        }
                        break;
                }
            }
        };
        xmlHttpRequest.send(null);

        return true;
    }

    addListener(listener: any): boolean {
        var _this = this;
        if (listener && typeof listener === "object") {
            var events = ["onLoadStart", "onLoadProgress", "onLoadComplete", "onLoadInit", "onLoadError"];
            var variables = listener.variables;
            for (var i = 0; i < 5; i++) {
                var event = events[i];
                if (typeof listener[event] === "function") {
                    _this.events[event] = listener[event];
                } else if (variables && typeof variables[event] === "function") {
                    _this.events[event] = variables[event];
                }
            }
        }
        return true;
    }

    removeListener(listener: any): boolean {
        var _this = this;
        if (listener && typeof listener === "object") {
            var events = ["onLoadStart", "onLoadProgress", "onLoadComplete", "onLoadInit", "onLoadError"];
            for (var i = 0; i < 5; i++) {
                var event = events[i];
                var variables = listener.variables;
                if (typeof listener[event] === "function" ||
                    (variables && typeof variables[event] === "function")
                ) {
                    _this.events[event] = undefined;
                }
            }
        }
        return true;
    }

    getProgress(target: string): any {
        return {
            bytesLoaded: 0,
            bytesTotal: 0
        };
    }
}
