/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { DisplayObject } from './DisplayObject';
import { isTouch } from './utils';

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

/**
 * @param event
 */
function keyUpAction(event)
{
    keyClass.setEvent(event);
    var onKeyUp = keyClass.onKeyUp;
    if (typeof onKeyUp === "function") {
        onKeyUp.apply(keyClass, [event]);
    }
}

/**
 * @param event
 */
function keyDownAction(event)
{
    keyClass.setEvent(event);
    var keyCode = keyClass.getCode();
    var i;
    var obj;
    var onKeyDown = keyClass.onKeyDown;
    if (typeof onKeyDown === "function") {
        onKeyDown.apply(keyClass, [event]);
    }

    var idx;
    for (var pIdx in DisplayObject.stages) {
        var stage = DisplayObject.stages[pIdx];
        var keyDownEventHits = stage.keyDownEventHits;
        var kLen = keyDownEventHits.length;
        if (kLen) {
            for (idx = 0; idx < kLen; idx++) {
                obj = keyDownEventHits[idx];
                stage.executeEventAction(obj.as, obj.mc);
            }
        }

        var buttonHits = stage.buttonHits;
        var len = buttonHits.length;
        var isEnd = false;
        for (i = len; i--;) {
            if (!(i in buttonHits)) {
                continue;
            }

            var hitObj = buttonHits[i];
            if (!hitObj) {
                continue;
            }

            var button = hitObj.button;
            if (!button) {
                continue;
            }

            var actions = button.getActions();
            if (!actions) {
                continue;
            }

            var aLen = actions.length;
            for (idx = 0; idx < aLen; idx++) {
                if (!(idx in actions)) {
                    continue;
                }

                var cond = actions[idx];
                var CondKeyPress = cond.CondKeyPress;
                switch (CondKeyPress) {
                    case 1: // left arrow
                        CondKeyPress = 37;
                        break;
                    case 2: // right arrow
                        CondKeyPress = 39;
                        break;
                    case 3: // home
                        CondKeyPress = 36;
                        break;
                    case 4: // end
                        CondKeyPress = 35;
                        break;
                    case 5: // insert
                        CondKeyPress = 45;
                        break;
                    case 6: // delete
                        CondKeyPress = 46;
                        break;
                    case 14: // up arrow
                        CondKeyPress = 38;
                        break;
                    case 15: // down arrow
                        CondKeyPress = 40;
                        break;
                    case 16: // page up
                        CondKeyPress = 33;
                        break;
                    case 17: // page down
                        CondKeyPress = 34;
                        break;
                    case 18: // tab
                        CondKeyPress = 9;
                        break;
                    case 19: // escape
                        CondKeyPress = 27;
                        break;
                }

                if (CondKeyPress !== keyCode) {
                    continue;
                }

                stage.buttonAction(hitObj.parent, cond.ActionScript);
                stage.touchRender();
                isEnd = true;
                break;
            }

            if (isEnd) {
                break;
            }
        }
    }
}

if (!isTouch) {
    window.addEventListener("keydown", keyDownAction);
    window.addEventListener("keyup", keyUpAction);
    window.addEventListener("keyup", (event) => {
        keyClass.setEvent(event);

        for (var pIdx in DisplayObject.stages) {
            var stage = DisplayObject.stages[pIdx];
            stage.touchEnd(event);
        }
    });
}

export const keyClass = new Key();

