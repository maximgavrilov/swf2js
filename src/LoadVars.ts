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
export var LoadVars = function ()
{
    var _this = this;
    _this.xmlHttpRequest = new XMLHttpRequest();
    _this.variables = {};
    _this.target = _this;
    _this.events = {
        onData: undefined,
        onLoad: undefined
    };
};

/**
 * properties
 */
Object.defineProperties(LoadVars.prototype,
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
LoadVars.prototype.getProperty = function (name)
{
    return this.variables[name];
};

/**
 * @param name
 * @param value
 */
LoadVars.prototype.setProperty = function (name, value)
{
    this.variables[String(name)] = value;
};

/**
 * @param url
 * @returns {boolean}
 */
LoadVars.prototype.load = function (url)
{
    var _this = this;
    var xmlHttpRequest = _this.xmlHttpRequest;
    xmlHttpRequest.open("GET", url, true);
    xmlHttpRequest.onreadystatechange = function ()
    {
        var readyState = xmlHttpRequest.readyState;
        if (readyState === 4) {
            var src = decodeURIComponent(xmlHttpRequest.responseText);
            _this.decode(src);
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
 * @returns {boolean}
 */
LoadVars.prototype.send = function (url, target, method)
{
    var _this = this;
    var xmlHttpRequest = _this.xmlHttpRequest;
    var sendMethod = method ? method.toUpperCase() : "GET";
    xmlHttpRequest.open(sendMethod, url, true);
    if (sendMethod === "POST") {
        xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    }
    if (target instanceof LoadVars) {
        _this.target = target;
    }
    xmlHttpRequest.send(_this.toString());
    return true;
};

/**
 * @param url
 * @param target
 * @param method
 * @returns {boolean}
 */
LoadVars.prototype.sendAndLoad = function (url, target, method)
{
    var _this = this;
    _this.send(url, target, method);
    return _this.load(url);
};

/**
 * @param header
 * @param headerValue
 */
LoadVars.prototype.addRequestHeader = function (header, headerValue)
{
    var xmlHttpRequest = this.xmlHttpRequest;
    if (header instanceof Array) {
        var length = header.length;
        for (var i = 0; i < length;) {
            xmlHttpRequest.setRequestHeader(header[i++], headerValue[i++]);
        }
    } else {
        xmlHttpRequest.setRequestHeader(header, headerValue);
    }
};

/**
 * @param queryString
 */
LoadVars.prototype.decode = function (queryString)
{
    var variables = this.variables;
    var array = queryString.split("&");
    var length = array.length;
    for (var i = 0; i < length; i++) {
        var values = array[i];
        var splitData = values.split("=");
        if (splitData.length < 1) {
            continue;
        }
        variables[String(splitData[0])] = splitData[1];
    }
};

/**
 * @returns {number}
 */
LoadVars.prototype.getBytesLoaded = function ()
{
    return 1;
};

/**
 * @returns {number}
 */
LoadVars.prototype.getBytesTotal = function ()
{
    return 1;
};

/**
 * @returns {string}
 */
LoadVars.prototype.toString = function ()
{
    var variables = this.variables;
    var array = [];
    for (var prop in variables) {
        if (!variables.hasOwnProperty(prop)) {
            continue;
        }
        array[array.length] = prop + "=" + variables[prop];
    }
    return array.join("&");
};

