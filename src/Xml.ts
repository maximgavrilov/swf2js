/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */


/**
 * @constructor
 */
export var Xml = function ()
{
    var _this = this;
    _this.ignoreWhite = false;
    _this.loaded = false;
    _this.status = 0;
    _this.variables = {};
};

/**
 * properties
 */
Object.defineProperties(Xml.prototype,
{
    onData: {
        get: function () {
            return this.getProperty("onData");
        },
        set: function (onData) {
            this.setProperty("onData", onData);
        }
    },
    onLoad: {
        get: function () {
            return this.getProperty("onLoad");
        },
        set: function (onLoad) {
            this.setProperty("onLoad", onLoad);
        }
    }
});

/**
 * @param name
 * @returns {*}
 */
Xml.prototype.getProperty = function (name)
{
    return this.variables[name];
};

/**
 * @param name
 * @param value
 */
Xml.prototype.setProperty = function (name, value)
{
    this.variables[String(name)] = value;
};


/**
 * @param url
 */
Xml.prototype.load = function (url)
{
    var _this = this;
    url = "" + url;
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open("GET", url, true);
    xmlHttpRequest.onreadystatechange = function ()
    {
        var readyState = xmlHttpRequest.readyState;
        if (readyState === 4) {
            var src = xmlHttpRequest.responseXML;
            var onData = _this.onData;
            if (typeof onData === "function") {
                onData.apply(src, [src]);
            }

            var onLoad;
            var status = xmlHttpRequest.status;
            switch (status) {
                case 200:
                case 304:
                    onLoad = _this.onLoad;
                    if (typeof onLoad === "function") {
                        onLoad.apply(src, [true]);
                    }
                    return true;
                default:
                    onLoad = _this.onLoad;
                    if (typeof onLoad === "function") {
                        onLoad.apply(src, [false]);
                    }
                    return false;
            }
        }
    };
    xmlHttpRequest.send(null);
};

/**
 * @param url
 * @param target
 * @param method
 */
Xml.prototype.send = function (url, target, method)
{
    var sendMethod = method ? method.toUpperCase() : "GET";
    if (target) {
        console.log(target);
    }
    var xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.open(sendMethod, url, true);
    xmlHttpRequest.send(null);
    return true;
};

/**
 * @param url
 * @param resultXML
 */
Xml.prototype.sendAndLoad = function (url, resultXML)
{
    var _this = this;
    _this.send(url);
    return _this.load(resultXML);
};


