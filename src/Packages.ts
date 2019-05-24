/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { clipEvent, EventDispatcher } from './EventDispatcher';
import { DisplayObject } from './DisplayObject';
import { DisplayObjectContainer } from './DisplayObjectContainer';
import { InteractiveObject } from './InteractiveObject';
import { Graphics } from './Graphics';
import { MovieClip } from './MovieClip';
import { Sprite } from './Sprite';
import { Sound } from './Sound';
import { StaticText } from './StaticText';
import { Stage } from './utils';

export class Packages {
    readonly flash = FLASH;

    constructor(readonly stage: Stage) {
    }
}

const FLASH = {
    "display": {
        "MovieClip": MovieClip,
        "Sprite": Sprite,
        "DisplayObjectContainer": DisplayObjectContainer,
        "InteractiveObject": InteractiveObject,
        "DisplayObject": DisplayObject,
        "Graphics": Graphics
    },
    "events": {
        "EventDispatcher": EventDispatcher,
        "MouseEvent": clipEvent
    },
    "text": {
        "StaticText": StaticText
    },
    "media": {
        "Sound": Sound
    },
    "system": {
        "fscommand": function ()
        {
            var command = arguments[0];
            var args = arguments[1];
            if (args === undefined) {
                args = "";
            }

            switch (command) {
                case "quit":
                case "fullscreen":
                case "allowscale":
                case "showmenu":
                case "exec":
                case "trapallkeys":
                    break;
                default:
                    if (command) {
                        var _this = this;
                        var method = (_this.tagId) ? _this.tagId : _this.getName();
                        var body = method +"_DoFSCommand(command, args);";
                        var fscommand = new Function("command", "args", body);
                        fscommand(command, args);
                    }
                    break;
            }

            return true;
        }
    }
};

