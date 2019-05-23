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
export var Mouse = function ()
{
    this.events = {};
};

/**
 * @returns {undefined}
 */
Mouse.prototype.show = function ()
{
    return undefined;
};

/**
 * @returns {undefined}
 */
Mouse.prototype.hide = function ()
{
    return undefined;
};

/**
 * @param listener
 */
Mouse.prototype.addListener = function (listener)
{
    var _this = this;
    if (listener && typeof listener === "object") {
        var events = ["onMouseDown", "onMouseMove", "onMouseUp"];
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
};

/**
 * @param listener
 */
Mouse.prototype.removeListener = function (listener)
{
    var _this = this;
    if (listener && typeof listener === "object") {
        var events = ["onMouseDown", "onMouseMove", "onMouseUp"];
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
};
