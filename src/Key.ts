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
var Key = function ()
{
    var _this = this;
    _this.variables = {};
    _this._listeners = [];
    _this.event = null;
};

/**
 * properties
 */
Object.defineProperties(Key.prototype,
{
    onKeyDown: {
        get: function () {
            return this.getProperty("onKeyDown");
        },
        set: function (onKeyDown) {
            this.setProperty("onKeyDown", onKeyDown);
        }
    },
    onKeyUp: {
        get: function () {
            return this.getProperty("onKeyUp");
        },
        set: function (onKeyUp) {
            this.setProperty("onKeyUp", onKeyUp);
        }
    }
});

/**
 * @type {number}
 */
Key.prototype.BACKSPACE = 8;
Key.prototype.CAPSLOCK = 20;
Key.prototype.CONTROL = 17;
Key.prototype.DELETEKEY = 46;
Key.prototype.DOWN = 40;
Key.prototype.END = 35;
Key.prototype.ENTER = 13;
Key.prototype.ESCAPE = 27;
Key.prototype.HOME = 36;
Key.prototype.INSERT = 45;
Key.prototype.LEFT = 37;
Key.prototype.PGDN = 34;
Key.prototype.PGDN = 34;
Key.prototype.PGUP = 33;
Key.prototype.RIGHT = 39;
Key.prototype.SHIFT = 16;
Key.prototype.SPACE = 32;
Key.prototype.TAB = 9;
Key.prototype.UP = 38;

/**
 * @param name
 * @returns {*}
 */
Key.prototype.getProperty = function (name)
{
    return this.variables[name];
};

/**
 * @param name
 * @param value
 */
Key.prototype.setProperty = function (name, value)
{
    this.variables[String(name)] = value;
};

/**
 *
 * @param listener
 * @returns {boolean}
 */
Key.prototype.addListener = function (listener)
{
    var _this = this;
    var onKeyDown = listener.onKeyDown;
    if (onKeyDown) {
        _this.onKeyDown = onKeyDown;
    }
    var onKeyUp = listener.onKeyUp;
    if (onKeyUp) {
        _this.onKeyUp = onKeyUp;
    }
    return true;
};

/**
 * @param code
 * @returns {boolean}
 */
Key.prototype.isDown = function (code)
{
    return (this.getCode() === code);
};

Key.prototype.setEvent = function (event) {
    this.event = event;
};

/**
 * @returns {*}
 */
Key.prototype.getCode = function ()
{
    var keyCode = this.event && this.event.keyCode;
    if (96 <= keyCode && keyCode <= 105) {
        var n = keyCode - 96;
        switch (n) {
            case 0:
                keyCode = 48;
                break;
            case 1:
                keyCode = 49;
                break;
            case 2:
                keyCode = 50;
                break;
            case 3:
                keyCode = 51;
                break;
            case 4:
                keyCode = 52;
                break;
            case 5:
                keyCode = 53;
                break;
            case 6:
                keyCode = 54;
                break;
            case 7:
                keyCode = 55;
                break;
            case 8:
                keyCode = 56;
                break;
            case 9:
                keyCode = 57;
                break;
        }
    }
    return keyCode;
};

export const keyClass = new Key();

