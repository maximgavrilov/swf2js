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
import { SimpleButton } from './SimpleButton';
import { Shape } from './Shape';
import { Sprite } from './Sprite';
import { MovieClip } from './MovieClip';
import { Stage } from './Stage';
import { TextFormat, TextField } from './TextField';

import { Color } from './Color';
import { Global } from './Global';
import { MovieClipLoader } from './MovieClipLoader';
import { Sound } from './Sound';
import { LoadVars } from './LoadVars';
import { Xml } from './Xml';

const StartDate = new Date();

/**
 * @param data
 * @param constantPool
 * @param register
 * @param initAction
 * @constructor
 */
export type ActionScript = any;
export var ActionScript = function (data, constantPool?, register?, initAction?)
{
    var _this = this;
    _this.cache = [];
    _this.params = [];
    _this.constantPool = constantPool || [];
    _this.register = register || [];
    _this.variables = {};
    _this.initAction = (initAction) ? true : false;
    _this.scope = null;
    _this.parent = null;
    _this.arg = null;
    _this.version = 7;
    _this.superClass = null;
    if (data.length) {
        _this.initialize(data);
    }
    _this.initParam();
};

/**
 * reset
 */
ActionScript.prototype.reset = function ()
{
    var _this = this;
    _this.arg = null;
    _this.variables = {};
    _this.initParam();
};

/**
 * initParam
 */
ActionScript.prototype.initParam = function ()
{
    var _this = this;
    var register = _this.register;
    var length = register.length;
    var params = [];
    for (var i = 0; i < length; i++) {
        var obj = register[i];
        if (obj.name === null) {
            params[obj.register] = obj.value;
        } else {
            params[obj.register] = obj.name;
        }
    }
    _this.params = params;
};

/**
 * @param values
 */
ActionScript.prototype.initVariable = function (values)
{
    var _this = this;
    _this.arg = values;
    var register = _this.register;
    var length = register.length;
    var variables = _this.variables;
    var key = 0;
    for (var i = 0; i < length; i++) {
        var obj = register[i];
        if (obj.name === null) {
            continue;
        }
        variables[obj.name] = values[key++];
    }
    _this.variables = variables;
    _this.initParam();
};

/**
 * @returns {{}}
 */
ActionScript.prototype.getSuperClass = function ()
{
    var _this = this;
    var superClass = _this.superClass;
    if (!superClass) {
        var parent = _this.parent;
        if (parent) {
            superClass = parent.getSuperClass();
        }
    }
    return superClass;
};

/**
 * @param name
 * @param value
 */
ActionScript.prototype.setVariable = function (name, value)
{
    var _this = this;
    var finish = false;
    if (name in _this.variables) {
        _this.variables[name] = value;
        finish = true;
    }
    if (!finish) {
        var parent = _this.parent;
        if (parent) {
            finish = parent.setVariable(name, value);
        }
    }
    return finish;
};

/**
 * @param name
 * @returns {*}
 */
ActionScript.prototype.getVariable = function (name)
{
    var _this = this;
    var value, parent;
    switch (name) {
        case "this":
            value = _this.variables["this"];
            break;
        case "arguments":
            value = _this.arg;
            break;
        default:
            value = _this.variables[name];
            if (value === undefined) {
                parent = _this.parent;
                if (parent) {
                    value = parent.getVariable(name);
                }
            }
            break;
    }
    return value;
};

/**
 * @param value
 * @returns {string}
 */
ActionScript.prototype.valueToString = function (value)
{
    if (typeof value !== "string") {
        value += "";
    }
    return value;
};

/**
 * @param str
 * @param mc
 * @returns {*}
 */
ActionScript.prototype.stringToObject = function(str, mc)
{
    var object = this.getVariable(str);
    if (object === undefined) {
        object = mc.getProperty(str);
    }
    return object;
};

/**
 * @param data
 */
ActionScript.prototype.initialize = function (data)
{
    var _this = this;
    var isEnd = false;
    var obj = {} as any;
    var i = 0;
    var idx = 0;
    var cache = [];
    var indexes = [];
    var asData;
    var register;
    var values;
    var NumParams;
    var payloadLength;
    var withEndPoint = 0;
    var bitio = new BitIO();
    bitio.setData(data);

    var pBitio = new BitIO();
    var endPoint = data.length;

    _this.initParam();
    while (bitio.byte_offset < endPoint) {
        var startOffset = bitio.byte_offset;
        obj = {};

        if (withEndPoint && withEndPoint === bitio.byte_offset) {
            withEndPoint = 0;
            obj.actionCode = 0x94;
            obj.Size = 0;
            cache[cache.length] = obj;
            continue;
        }

        var actionCode = bitio.getUI8();
        obj.actionCode = actionCode;

        var payload = null;
        if (actionCode >= 0x80) {
            payloadLength = bitio.getUI16();
            payload = bitio.getData(payloadLength);
            pBitio.setData(payload);
            pBitio.setOffset(0, 0);
        }

        switch (actionCode) {
            // GotoFrame
            case 0x81:
                obj.frame = (pBitio.getUI16()|0) + 1;
                break;
            // WaitForFrame
            case 0x8A:
                obj.frame = pBitio.getUI16();
                obj.skipCount = pBitio.getUI8();
                break;
            // SetTarget
            case 0x8B:
                obj.targetName = pBitio.getDataUntil("\0");
                break;
            // GoToLabel
            case 0x8C:
                obj.label = pBitio.getDataUntil("\0");
                break;
            case 0x83:
                var len = payload.length - 1;
                var urls = [ '' ];
                idx = 0;
                for (i = 0; i < len; i++) {
                    var str = String.fromCharCode(payload[i]);
                    if (payload[i] === 0) {
                        idx++;
                        urls[idx] = '';
                        continue;
                    }
                    urls[idx] += str;
                }

                var urlString = urls[0];
                if (typeof urlString === "string") {
                    var splitUrl = urlString.split("?");
                    if (2 in splitUrl) {
                        urlString = splitUrl[0];
                        urlString += "?" + splitUrl[1];
                        var paramLength = splitUrl.length;
                        for (i = 2; i < paramLength; i++) {
                            urlString += "&" + splitUrl[i];
                        }
                    }
                }

                obj.url = urlString;
                obj.target = urls[1];
                break;
            // Push
            case 0x96:
                values = [];
                while (pBitio.byte_offset < payloadLength) {
                    var type = pBitio.getUI8();
                    switch (type) {
                        case 0: // String
                            values[values.length] = String(pBitio.getDataUntil("\0"));
                            break;
                        case 1: // Float
                            values[values.length] = pBitio.getFloat32();
                            break;
                        case 2: // null
                            values[values.length] = null;
                            break;
                        case 3: // undefined
                            values[values.length] = undefined;
                            break;
                        case 4: // RegisterNumber
                            values[values.length] = {"key": pBitio.getUI8()};
                            break;
                        case 5: // Boolean
                            values[values.length] = (pBitio.getUI8()) ? true : false;
                            break;
                        case 6: // Double
                            values[values.length] = pBitio.getFloat64();
                            break;
                        case 7: // Integer
                            values[values.length] = pBitio.getUI32();
                            break;
                        case 8: // Constant8
                            values[values.length] = _this.constantPool[pBitio.getUI8()];
                            break;
                        case 9: // Constant16
                            values[values.length] = _this.constantPool[pBitio.getUI16()];
                            break;
                        default:
                            break;
                    }
                }
                obj.values = values;
                break;
            // If
            case 0x9D:
                obj.offset = bitio.byte_offset + bitio.toSI16LE(payload);
                break;
            // Jump
            case 0x99:
                obj.offset = bitio.byte_offset + bitio.toSI16LE(payload);
                break;
            // GetURL2
            case 0x9A:
                obj.LoadVariablesFlag = pBitio.getUIBits(1); // 0=none, 1=LoadVariables
                obj.LoadTargetFlag = pBitio.getUIBits(1);// 0=web, 1=Sprite
                pBitio.getUIBits(4); // Reserved
                obj.SendVarsMethod = pBitio.getUIBits(2);// 0=NONE, 1=GET, 2=POST
                break;
            // GoToFrame2
            case 0x9F:
                pBitio.getUIBits(6); // Reserved
                obj.SceneBiasFlag = pBitio.getUIBit();
                obj.PlayFlag = pBitio.getUIBit();// 0=stop, 1=play
                if (obj.SceneBiasFlag === 1) {
                    obj.SceneBias = pBitio.getUI16();
                }
                break;
            // WaitForFrame2
            case 0x8D:
                obj.skipCount = pBitio.getUI8();
                break;
            // ConstantPool
            case 0x88:
                var count = pBitio.getUI16();
                var constantPool = [];
                if (count > 0) {
                    while (count--) {
                        constantPool[constantPool.length] = pBitio.getDataUntil("\0");
                    }
                }
                obj.constantPool = constantPool;
                _this.constantPool = constantPool;
                break;
            // ActionDefineFunction
            case 0x9b:
                obj.FunctionName = pBitio.getDataUntil("\0");
                NumParams = pBitio.getUI16();
                register = [];
                if (NumParams > 0) {
                    idx = 1;
                    while (NumParams--) {
                        register[register.length] = {
                            register: idx,
                            name: pBitio.getDataUntil("\0"),
                            value: null
                        };
                    }
                }

                asData = bitio.getData(pBitio.getUI16());
                obj.ActionScript = new ActionScript(asData, _this.constantPool, register, _this.initAction);

                break;
            // ActionWith
            case 0x94:
                obj.Size = pBitio.getUI16();
                withEndPoint = obj.Size + bitio.byte_offset;
                break;
            // ActionStoreRegister
            case 0x87:
                obj.RegisterNumber = pBitio.getUI8();
                break;
            // SWF 7 ***********************************
            // ActionDefineFunction2
            case 0x8e:
                register = [];
                values = [];

                obj.FunctionName = pBitio.getDataUntil("\0");
                NumParams = pBitio.getUI16();
                var RegisterCount = pBitio.getUI8();
                obj.PreloadParentFlag = pBitio.getUIBits(1);
                obj.PreloadRootFlag = pBitio.getUIBits(1);
                obj.SuppressSuperFlag = pBitio.getUIBits(1);
                obj.PreloadSuperFlag = pBitio.getUIBits(1);
                obj.SuppressArgumentsFlag = pBitio.getUIBits(1);
                obj.PreloadArgumentsFlag = pBitio.getUIBits(1);
                obj.SuppressThisFlag = pBitio.getUIBits(1);
                obj.PreloadThisFlag = pBitio.getUIBits(1);
                pBitio.getUIBits(7); // Reserved
                obj.PreloadGlobalFlag = pBitio.getUIBits(1);

                if (obj.PreloadThisFlag) {
                    values[values.length] = "this";
                }
                if (obj.PreloadArgumentsFlag) {
                    values[values.length] = "arguments";
                }
                if (obj.PreloadSuperFlag) {
                    values[values.length] = "super";
                }
                if (obj.PreloadRootFlag) {
                    values[values.length] = "_root";
                }
                if (obj.PreloadParentFlag) {
                    values[values.length] = "_parent";
                }
                if (obj.PreloadGlobalFlag) {
                    values[values.length] = "_global";
                }
                for (idx = 1; idx < RegisterCount; idx++) {
                    var rIdx = idx - 1;
                    if (!(rIdx in values)) {
                        continue;
                    }
                    register[register.length] = {
                        register: idx,
                        name: null,
                        value: values[rIdx]
                    };
                }

                if (NumParams > 0) {
                    while (NumParams--) {
                        var Register = pBitio.getUI8();
                        var ParamName = pBitio.getDataUntil("\0");
                        register[register.length] = {
                            register: Register,
                            name: ParamName,
                            value: null
                        };
                    }
                }

                asData = bitio.getData(pBitio.getUI16());
                obj.ActionScript = new ActionScript(asData, _this.constantPool, register, _this.initAction);
                break;
            // ActionTry
            case 0x8f:
                pBitio.getUIBits(5); // Reserved
                var CatchInRegisterFlag = pBitio.getUIBits(1);
                obj.FinallyBlockFlag = pBitio.getUIBits(1);
                obj.CatchBlockFlag = pBitio.getUIBits(1);
                var TrySize = pBitio.getUI16();
                var CatchSize = pBitio.getUI16();
                var FinallySize = pBitio.getUI16();

                var CatchName;
                if (!CatchInRegisterFlag) {
                    CatchName = pBitio.getDataUntil("\0");
                } else {
                    CatchName = pBitio.getUI8();
                }

                i = 0;
                var TryBody = [];
                if (TrySize) {
                    while (TrySize) {
                        TryBody[TryBody.length] = bitio.getUI8();
                        TrySize--;
                    }
                }

                obj.try = (function (data)
                {
                    var as = new ActionScript(data);
                    return function ()
                    {
                        as.reset();
                        as.variables["this"] = this;
                        return as.execute(this);
                    };
                })(TryBody);

                if (obj.CatchBlockFlag) {
                    var CatchBody = [];
                    if (CatchSize) {
                        while (CatchSize) {
                            CatchBody[CatchBody.length] = bitio.getUI8();
                            CatchSize--;
                        }
                    }

                    obj.catch = (function (data, catchName)
                    {
                        var as = new ActionScript(data);
                        return function ()
                        {
                            as.reset();
                            as.variables["this"] = this;
                            as.variables[catchName] = arguments[0];
                            return as.execute(this);
                        };
                    })(CatchBody, CatchName);
                }

                if (obj.FinallyBlockFlag) {
                    var FinallyBody = [];
                    if (FinallySize) {
                        while (FinallySize) {
                            FinallyBody[FinallyBody.length] = bitio.getUI8();
                            FinallySize--;
                        }
                    }

                    obj.finally = (function (data)
                    {
                        var as = new ActionScript(data);
                        return function ()
                        {
                            as.reset();
                            as.variables["this"] = this;
                            return as.execute(this);
                        };
                    })(FinallyBody);
                }

                break;
            case 0x00:
                isEnd = true;
                break;
        }

        indexes[startOffset] = cache.length;
        cache[cache.length] = obj;

        if (isEnd) {
            break;
        }
    }

    // If and Jump
    var length = cache.length;
    for (i = 0; i < length; i++) {
        obj = cache[i];
        var code = obj.actionCode;
        if (code === 0x9D || code === 0x99) {
            var index = indexes[obj.offset];
            if (index !== undefined) {
                obj.offset = index - 1;
            } else {
                obj.offset = cache.length - 1;
            }
        }
    }
    _this.cache = cache;
};

/**
 * @param value
 * @returns {*}
 */
ActionScript.prototype.calc = function (value)
{
    var calc;
    switch (typeof value) {
        case "boolean":
            calc = (value) ? 1 : 0;
            break;
        case "object":
            if (value === null) {
                calc = 0;
            } else if (value instanceof Array) {
                calc = value.length;
            } else if (value instanceof Object) {
                calc = 1;
            }
            break;
        default:
            calc = +value;
            break;
    }

    if (isNaN(calc)) {
        calc = 0;
    }

    return calc;
};

/**
 * @param value
 * @returns {*}
 */
ActionScript.prototype.logicValue = function (value)
{
    var calc;
    switch (typeof value) {
        case "boolean":
            calc = (value) ? 1 : 0;
            break;
        case "object":
            if (value === null) {
                calc = 0;
            } else if (value instanceof Array) {
                calc = value.length;
            } else if (value instanceof Object) {
                calc = 1;
            }
            break;
        case "string":
            if (value === "") {
                calc = 0;
            } else {
                calc = 1;
            }
            break;
        case "function":
            calc = 1;
            break;
        default:
            calc = +value;
            if (isNaN(calc)) {
                calc = 0;
            }
            break;
    }
    return calc;
};

/**
 * @param stack
 * @returns {Number}
 */
ActionScript.prototype.operationValue = function (stack)
{
    var value = +stack.pop();
    if (isNaN(value)) {
        value = 0;
    }
    return value;
};

/**
 * @param mc
 * @returns {*}
 */
ActionScript.prototype.execute = function (mc)
{
    var _this = this;
    var scope = _this.scope;
    var movieClip = (scope instanceof MovieClip) ? scope : mc;
    if (!movieClip.active) {
        return undefined;
    }
    var stage = movieClip.getStage() as Stage;
    if (stage) {
        _this.version = stage.getVersion();
    }

    var stack = [];
    var cache = _this.cache;
    var cLength = cache.length;
    var cIdx = 0;
    while(cIdx < cLength) {
        if (!(cIdx in cache)) {
            cIdx++;
            continue;
        }

        var aScript = cache[cIdx];
        var actionCode = aScript.actionCode;
        if (actionCode === 0) {
            break;
        }

        switch (actionCode) {
            // ********************************************
            // SWF 3
            // ********************************************
            case 0x81:
                _this.ActionGotoFrame(movieClip, aScript.frame);
                break;
            case 0x04:
                _this.ActionNextFrame(movieClip);
                break;
            case 0x05:
                _this.ActionPreviousFrame(movieClip);
                break;
            case 0x06:
                _this.ActionPlay(movieClip);
                break;
            case 0x07:
                _this.ActionStop(movieClip);
                break;
            case 0x08: // ActionToggleQuality
            case 0x8A: // ActionWaitForFrame
                break;
            case 0x09:
                _this.ActionStopSounds(movieClip);
                break;
            case 0x8B:
                movieClip = _this.ActionSetTarget(movieClip, mc, aScript.targetName);
                break;
            case 0x8C:
                _this.ActionGoToLabel(movieClip, aScript.label);
                break;
            case 0x83:
                _this.ActionGetURL(movieClip, aScript.url, aScript.target);
                break;

            // ********************************************
            // SWF 4
            // ********************************************
            case 0x0A: // ActionAdd
                _this.ActionOperation(stack, 0);
                break;
            case 0x0B: // ActionSubtract
                _this.ActionOperation(stack, 1);
                break;
            case 0x0C: // ActionMultiply
                _this.ActionOperation(stack, 2);
                break;
            case 0x0D: // ActionDivide
                _this.ActionOperation(stack, 3);
                break;
            case 0x0E:
                _this.ActionEquals(stack);
                break;
            case 0x0F:
                _this.ActionLess(stack);
                break;
            case 0x10:
                _this.ActionAnd(stack);
                break;
            case 0x11:
                _this.ActionOr(stack);
                break;
            case 0x12:
                _this.ActionNot(stack);
                break;
            case 0x13:
                _this.ActionStringEquals(stack);
                break;
            case 0x14: // ActionStringLength
            case 0x31: // ActionMBStringLength
                _this.ActionStringLength(stack);
                break;
            case 0x21:
                _this.ActionStringAdd(stack);
                break;
            case 0x15:// ActionStringExtract
            case 0x35:// ActionMBStringExtract
                _this.ActionStringExtract(stack);
                break;
            case 0x29:
                _this.ActionStringLess(stack);
                break;
            case 0x17: // ActionPop
                stack.pop();
                break;
            case 0x96:
                _this.ActionPush(stack, movieClip, aScript.values);
                break;
            case 0x33: // ActionAsciiToChar
            case 0x37: // ActionMBAsciiToChar
                _this.ActionAsciiToChar(stack);
                break;
            case 0x36: // ActionMBCharToAscii
            case 0x32: // ActionCharToAscii
                _this.ActionCharToAscii(stack);
                break;
            case 0x18:
                _this.ActionToInteger(stack);
                break;
            case 0x9E:
                _this.ActionCall(stack, movieClip);
                break;
            case 0x9D:
                cIdx = _this.ActionIf(stack, aScript.offset, cIdx);
                break;
            case 0x99: // ActionJump
                cIdx = aScript.offset;
                break;
            case 0x1C:
                _this.ActionGetVariable(stack, movieClip);
                break;
            case 0x1D:
                _this.ActionSetVariable(stack, movieClip);
                break;
            case 0x9A:
                _this.ActionGetURL2(stack, aScript, movieClip);
                break;
            case 0x22:
                _this.ActionGetProperty(stack, movieClip);
                break;
            case 0x9F:
                _this.ActionGoToFrame2(stack, aScript, movieClip);
                break;
            case 0x20:
                movieClip = _this.ActionSetTarget2(stack, movieClip, mc);
                break;
            case 0x23:
                _this.ActionSetProperty(stack, movieClip);
                break;
            case 0x27:
                _this.ActionStartDrag(stack, movieClip);
                break;
            case 0x8D: // ActionWaitForFrame2
                stack.pop();
                break;
            case 0x24:
                _this.ActionCloneSprite(stack, movieClip);
                break;
            case 0x25:
                _this.ActionRemoveSprite(stack, movieClip);
                break;
            case 0x28:
                _this.ActionEndDrag(movieClip);
                break;
            case 0x34:
                _this.ActionGetTime(stack);
                break;
            case 0x30:
                _this.ActionRandomNumber(stack);
                break;
            case 0x26:
                _this.ActionTrace(stack);
                break;
            case 0x00:
                break;
            case 0x2D:
                _this.ActionFsCommand2(stack, movieClip);
                break;

            // ********************************************
            // SWF 5
            // ********************************************
            case 0x52:
                _this.ActionCallMethod(stack, movieClip);
                break;
            case 0x88: // ActionConstantPool
                _this.constantPool = aScript.constantPool;
                break;
            case 0x3d:
                _this.ActionCallFunction(stack, movieClip);
                break;
            case 0x9b:
                _this.ActionDefineFunction(stack, aScript, movieClip);
                break;
            case 0x3c:
                _this.ActionDefineLocal(stack, movieClip);
                break;
            case 0x41:
                _this.ActionDefineLocal2(stack, movieClip);
                break;
            case 0x3a:
                _this.ActionDelete(stack, movieClip);
                break;
            case 0x3b:
                _this.ActionDelete2(stack, movieClip);
                break;
            case 0x46:
                _this.ActionEnumerate(stack, movieClip);
                break;
            case 0x49:
                _this.ActionEquals2(stack);
                break;
            case 0x4e:
                _this.ActionGetMember(stack, movieClip);
                break;
            case 0x42:
                _this.ActionInitArray(stack);
                break;
            case 0x43:
                _this.ActionInitObject(stack);
                break;
            case 0x53:
                _this.ActionNewMethod(stack, movieClip);
                break;
            case 0x40:
                _this.ActionNewObject(stack, movieClip);
                break;
            case 0x4f:
                _this.ActionSetMember(stack, movieClip);
                break;
            case 0x45:
                _this.ActionTargetPath(stack);
                break;
            case 0x94:
                movieClip = _this.ActionWith(stack, aScript.Size, mc);
                break;
            case 0x4a:
                _this.ActionToNumber(stack);
                break;
            case 0x4b:
                _this.ActionToString(stack);
                break;
            case 0x44:
                _this.ActionTypeOf(stack);
                break;
            case 0x47:
                _this.ActionAdd2(stack);
                break;
            case 0x48:
                _this.ActionLess2(stack);
                break;
            case 0x3f:
                _this.ActionModulo(stack);
                break;
            case 0x60:
                _this.ActionBitAnd(stack);
                break;
            case 0x63:
                _this.ActionBitLShift(stack);
                break;
            case 0x61:
                _this.ActionBitOr(stack);
                break;
            case 0x64:
                _this.ActionBitRShift(stack);
                break;
            case 0x65:
                _this.ActionBitURShift(stack);
                break;
            case 0x62:
                _this.ActionBitXor(stack);
                break;
            case 0x51:
                _this.ActionDecrement(stack);
                break;
            case 0x50:
                _this.ActionIncrement(stack);
                break;
            case 0x4c:
                _this.ActionPushDuplicate(stack);
                break;
            case 0x3e: // ActionReturn
                return stack.pop();
            case 0x4d:
                _this.ActionStackSwap(stack);
                break;
            case 0x87:
                _this.ActionStoreRegister(stack, aScript.RegisterNumber);
                break;

            // ********************************************
            // SWF 6
            // ********************************************
            case 0x54:
                _this.ActionInstanceOf(stack);
                break;
            case 0x55:
                _this.ActionEnumerate(stack, movieClip);
                break;
            case 0x66:
                _this.ActionStrictEquals(stack);
                break;
            case 0x67: // ActionGreater
            case 0x68: // ActionStringGreater
                _this.ActionGreater(stack);
                break;

            // ********************************************
            // SWF 7
            // ********************************************
            case 0x8e: // ActionDefineFunction2
                _this.ActionDefineFunction(stack, aScript, movieClip);
                break;
            case 0x69:
                _this.ActionExtends(stack);
                break;
            case 0x2b:
                _this.ActionCastOp(stack);
                break;
            case 0x2c:
                _this.ActionImplementsOp(stack);
                break;
            case 0x8f:
                _this.ActionTry(aScript, movieClip);
                break;
            case 0x2a:
                _this.ActionThrow(stack);
                break;

            default:
                console.log("[ActionScript Error] Code: " + actionCode);
                break;
        }
        cIdx++;
    }
};

/**
 * @type {{}}
 */
ActionScript.prototype.methods = {
    gotoandstop: "gotoAndStop",
    gotoandplay: "gotoAndPlay",
    play: "play",
    stop: "stop",
    duplicatemovieclip: "duplicateMovieClip",
    getproperty: "getProperty",
    removemovieclip: "removeMovieClip",
    setproperty: "setProperty",
    startdrag: "startDrag",
    stopdrag: "stopDrag",
    targetpath: "targetPath",
    updateafterevent: "updateAfterEvent",
    nextframe: "nextFrame",
    nextscene: "nextScene",
    prevframe: "prevFrame",
    prevscene: "prevScene",
    stopallsounds: "stopAllSounds",
    setmask: "setMask",
    geturl: "getURL",
    loadmovie: "loadMovie",
    loadmovienum: "loadMovieNum",
    loadvariables: "loadVariables",
    loadvariablesnum: "loadVariablesNum",
    unloadmovie: "unloadMovie",
    unloadmovienum: "unloadMovieNum",
    swapdepths: "swapDepths",
    getinstanceatdepth: "getInstanceAtDepth",
    attachmovie: "attachMovie",
    attachaudio: "attachAudio",
    attachbitmap: "attachBitmap",
    getnexthighestdepth: "getNextHighestDepth",
    getbytesloaded: "getBytesLoaded",
    getbytestotal: "getBytesTotal",
    assetpropflags: "ASSetPropFlags",
    linestyle: "lineStyle",
    linegradientstyle: "lineGradientStyle",
    beginfill: "beginFill",
    begingradientfill: "beginGradientFill",
    beginbitmapfill: "beginBitmapFill",
    clear: "clear",
    moveto: "moveTo",
    lineto: "lineTo",
    curveto: "curveTo",
    endfill: "endFill",
    hittest: "hitTest",
    getdepth: "getDepth",
    createemptymovieclip: "createEmptyMovieClip",
    createtextfield: "createTextField",
    getbounds: "getBounds",
    getrect: "getRect",
    getswfversion: "getSWFVersion",
    gettextsnapshot: "getTextSnapshot",
    globaltolocal: "globalToLocal",
    localtoglobal: "localToGlobal"
};

/**
 * @param method
 * @returns {*}
 */
ActionScript.prototype.checkMethod = function (method)
{
    if (!method || typeof method !== "string") {
        return method;
    }
    var lowerMethod = method.toLowerCase();
    return this.methods[lowerMethod] || null;
};

/**
 * @param mc
 * @param frame
 */
ActionScript.prototype.ActionGotoFrame = function (mc, frame)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.stop();
        mc.setNextFrame(frame);
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionNextFrame = function (mc)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.nextFrame();
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionPreviousFrame = function (mc)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.prevFrame();
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionPlay = function (mc)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.play();
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionStop = function (mc)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.stop();
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionStopSounds = function (mc)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.stopAllSounds();
    }
};

/**
 * @param movieClip
 * @param mc
 * @param target
 * @returns {*}
 */
ActionScript.prototype.ActionSetTarget = function (movieClip, mc, target)
{
    if (target !== "") {
        var targetMc = movieClip;
        if (!targetMc) {
            targetMc = mc;
        }
        return targetMc.getDisplayObject(target);
    } else {
        if (mc.active) {
            return mc;
        } else {
            return undefined;
        }
    }
};

/**
 * @param mc
 * @param label
 */
ActionScript.prototype.ActionGoToLabel = function (mc, label)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        var frame = mc.getLabel(label);
        mc.stop();
        if (typeof frame === "number" && frame) {
            mc.setNextFrame(frame);
        }
    }
};

/**
 * @param mc
 * @param url
 * @param target
 */
ActionScript.prototype.ActionGetURL = function (mc, url, target)
{
    if (mc instanceof MovieClip) {
        mc = mc as any;
        mc.getURL(url, target);
    }
};

/**
 * @param stack
 * @param operation
 */
ActionScript.prototype.ActionOperation = function (stack, operation)
{
    var _this = this;
    var a = _this.operationValue(stack);
    var b = _this.operationValue(stack);
    var value;
    switch (operation) {
        case 0:
            value = b + a;
            break;
        case 1:
            value = b - a;
            break;
        case 2:
            value = b * a;
            break;
        case 3:
            value = b / a;
            break;
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionEquals = function (stack)
{
    var _this = this;
    var a = _this.calc(stack.pop());
    var b = _this.calc(stack.pop());
    if (_this.version > 4) {
        stack[stack.length] = (a === b);
    } else {
        stack[stack.length] = (a === b) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionLess = function (stack)
{
    var _this = this;
    var a = _this.calc(stack.pop());
    var b = _this.calc(stack.pop());
    if (_this.version > 4) {
        stack[stack.length] = (b < a);
    } else {
        stack[stack.length] = (b < a) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionAnd = function (stack)
{
    var _this = this;
    var a = stack.pop();
    var b = stack.pop();
    if (_this.version > 4) {
        a = _this.logicValue(a);
        b = _this.logicValue(b);
        stack[stack.length] = (a !== 0 && b !== 0);
    } else {
        a = _this.calc(a);
        b = _this.calc(b);
        stack[stack.length] = (a !== 0 && b !== 0) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionOr = function (stack)
{
    var _this = this;
    var a = stack.pop();
    var b = stack.pop();
    if (_this.version > 4) {
        a = _this.logicValue(a);
        b = _this.logicValue(b);
        stack[stack.length] = (a !== 0 || b !== 0);
    } else {
        a = _this.calc(a);
        b = _this.calc(b);
        stack[stack.length] = (a !== 0 || b !== 0) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionNot = function (stack)
{
    var _this = this;
    var a = stack.pop();
    if (_this.version > 4) {
        a = _this.logicValue(a);
        stack[stack.length] = (a === 0);
    } else {
        a = _this.calc(a);
        stack[stack.length] = (a === 0) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStringEquals = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();

    if (a instanceof MovieClip) {
        a = a as any;
        a = a.getTarget();
    } else {
        a += "";
    }

    if (b instanceof MovieClip) {
        b = b as any;
        b = b.getTarget();
    } else {
        b += "";
    }

    if (this.version > 4) {
        stack[stack.length] = (b === a);
    } else {
        stack[stack.length] = (b === a) ? 1 : 0;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStringLength = function (stack)
{
    var value = stack.pop();
    value = this.valueToString(value);
    var length = 0;
    var sLen = value.length;
    for (var i = 0; i < sLen; i++, length++) {
        var code = value.charCodeAt(i);
        if (code < 255) {
            continue;
        }
        length++;
    }
    stack[stack.length] = length;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStringAdd = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    if (a === null || a === undefined) {
        a = "";
    }
    if (b === null || b === undefined) {
        b = "";
    }
    stack[stack.length] = b + "" + a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStringExtract = function (stack)
{
    var count = stack.pop();
    var index = stack.pop();
    var string = stack.pop();
    string = this.valueToString(string);
    index--;
    if (index < 0) {
        index = 0;
    }
    stack[stack.length] = (count < 0) ? string.substr(index) : string.substr(index, count);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStringLess = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    if (this.version > 4) {
        stack[stack.length] = (b < a);
    } else {
        stack[stack.length] = (b < a) ? 1 : 0;
    }
};

/**
 * @param stack
 * @param mc
 * @param values
 */
ActionScript.prototype.ActionPush = function (stack, mc, values)
{
    var _this = this;
    var length = values.length;
    var params = _this.params;
    for (var i = 0; i < length; i++) {
        var value = values[i];
        if (value instanceof Object) {
            var key = value.key;
            value = undefined;
            if (key in params) {
                var name = params[key];
                if (typeof name === "string") {
                    value = _this.getVariable(name);
                    if (value === undefined && !(name in _this.variables)) {
                        value = name;
                    }
                } else {
                    value = name;
                }
            }
        }
        stack[stack.length] = value;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionAsciiToChar = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = String.fromCharCode(value);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionCharToAscii = function (stack)
{
    var value = stack.pop();
    value = this.valueToString(value);
    stack[stack.length] = value.charCodeAt(0);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionToInteger = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = value|0;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionCall = function (stack, mc)
{
    var value = stack.pop();
    if (mc) {
        value = this.valueToString(value);
        var splitData = value.split(":");
        var frame;
        var label = splitData[0];
        var targetMc = mc;
        if (splitData.length > 1) {
            targetMc = mc.getDisplayObject(splitData[0]);
            label = splitData[1];
        }
        if (targetMc instanceof MovieClip) {
            targetMc = targetMc as any;
            frame = (typeof label === "number") ? label : targetMc.getLabel(label);
            targetMc.executeActions(frame);
        }
    }
};

/**
 * @param stack
 * @param offset
 * @param index
 * @returns {*}
 */
ActionScript.prototype.ActionIf = function (stack, offset, index)
{
    var condition = stack.pop();
    switch (typeof condition) {
        case "boolean":
            break;
        case "string":
            if (!isNaN(condition as any)) {
                condition = +condition;
            }
            break;
    }
    if (condition) {
        return offset;
    }
    return index;
};

/**
 * @param stack
 * @param mc
 * @returns {undefined}
 */
ActionScript.prototype.ActionGetVariable = function (stack, mc)
{
    var _this = this;
    var name = stack.pop();
    var value;
    if (name instanceof MovieClip) {
        value = name;
    } else {
        value = _this.getNativeClass(name);
        if (value === undefined) {
            value = _this.getVariable(name);
            if (value === undefined && mc) {
                value = mc.getProperty(name);
            }
        }
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionSetVariable = function (stack, mc)
{
    var value = stack.pop();
    var name = stack.pop();
    if (!this.setVariable(name, value)) {
        mc.setProperty(name, value);
    }
};

/**
 * @param stack
 * @param aScript
 * @param mc
 */
ActionScript.prototype.ActionGetURL2 = function (stack, aScript, mc)
{
    var target = stack.pop();
    var value = stack.pop();
    var LoadVariablesFlag = aScript.LoadVariablesFlag; // 0=none, 1=LoadVariables
    var LoadTargetFlag = aScript.LoadTargetFlag; // 0=web, 1=Sprite
    var SendVarsMethod = aScript.SendVarsMethod; // 0=NONE, 1=GET, 2=POST
    var method = "GET";
    if (SendVarsMethod === 2) {
        method = "POST";
    }

    var url;
    if (mc instanceof MovieClip) {
        mc = mc as any;
        if (value) {
            value = this.valueToString(value);
            var urls = value.split("?");
            var uLen = urls.length;
            var query = "";
            if (uLen === 1) {
                query = "?";
            }

            if (uLen > 2) {
                url = urls[0] + "?";
                url = url + urls[1];
                for (var u = 2; u < uLen; u++) {
                    var params = urls[u];
                    url = url + "&" + params;
                }
            } else {
                url = value;
            }

            // local variables
            if (SendVarsMethod) {
                var variables = mc.variables;
                var queryString = "";
                for (var key in variables) {
                    if (!variables.hasOwnProperty(key)) {
                        continue;
                    }
                    var val = variables[key];
                    if (val === null) {
                        val = "";
                    }
                    if (typeof val !== "string") {
                        var typeText: string = typeof val;
                        typeText = typeText.replace(/^[a-z]/g, function (str)
                        {
                            return str.toUpperCase();
                        });
                        val = "%5Btype+" + typeText + "%5D";
                    }
                    queryString += "&" + key + "=" + val;
                }

                if (query !== "" && queryString !== "") {
                    queryString = query + queryString.slice(1);
                }
                url += queryString;
            }

            if (LoadVariablesFlag) {
                mc.loadVariables(url, target, method);
            } else if (LoadTargetFlag) {
                if (target instanceof MovieClip) {
                    target = target as any;
                    target.loadMovie(url, null, SendVarsMethod);
                } else {
                    mc.loadMovie(url, target, SendVarsMethod);
                }
            } else {
                mc.getURL(url, target, method);
            }
        } else {
            mc.unloadMovie(target);
        }
    }
};

/**
 * @param stack
 * @param mc
 * @returns {*}
 */
ActionScript.prototype.ActionGetProperty = function (stack, mc)
{
    var index = stack.pop();
    var target = stack.pop();
    if (!isNaN(index)) {
        index = Math.floor(index);
    }

    var _this = this;
    var value = _this.getVariable(index);
    if (value === undefined && mc) {
        var targetMc = mc;
        if (target) {
            if (typeof target !== "string") {
                target += "";
            }
            targetMc = mc.getDisplayObject(target);
        }
        if (targetMc instanceof MovieClip) {
            targetMc = targetMc as any;
            value = targetMc.getProperty(index);
        }
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param aScript
 * @param mc
 */
ActionScript.prototype.ActionGoToFrame2 = function (stack, aScript, mc)
{
    var SceneBiasFlag = aScript.SceneBiasFlag;
    var PlayFlag = aScript.PlayFlag; // 0=stop, 1=play
    if (SceneBiasFlag === 1) {
        var SceneBias = aScript.SceneBias;
        console.log("SceneBias", SceneBias);
    }

    var frame = stack.pop();
    if (frame && mc) {
        if (isNaN(frame)) {
            var splitData = frame.split(":");
            if (splitData.length > 1) {
                var targetMc = mc.getDisplayObject(splitData[0]);
                if (targetMc) {
                    frame = targetMc.getLabel(splitData[1]);
                }
            } else {
                frame = mc.getLabel(splitData[0]);
            }
        }

        if (typeof frame === "string") {
            frame = parseInt(frame);
        }

        if (typeof frame === "number" && frame > 0) {
            mc.setNextFrame(frame);
            if (PlayFlag) {
                mc.play();
            } else {
                mc.stop();
            }
        }
    }
};

/**
 * @param stack
 * @param movieClip
 * @param mc
 * @returns {*}
 */
ActionScript.prototype.ActionSetTarget2 = function (stack, movieClip, mc)
{
    var target = stack.pop();
    if (!movieClip) {
        movieClip = mc;
    }
    return movieClip.getDisplayObject(target);
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionSetProperty = function (stack, mc)
{
    var value = stack.pop();
    var index = stack.pop();
    var target = stack.pop();
    if (!isNaN(index)) {
        index = Math.floor(index);
    }

    if (mc) {
        var targetMc = mc;
        if (target !== undefined) {
            targetMc = mc.getDisplayObject(target);
        }
        if (targetMc instanceof MovieClip) {
            targetMc = targetMc as any;
            targetMc.setProperty(index, value);
        }
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionStartDrag = function (stack, mc)
{
    var target = stack.pop();
    var lock = stack.pop();
    var constrain = stack.pop();
    var y2 = null;
    var x2 = null;
    var y1 = null;
    var x1 = null;
    if (constrain) {
        y2 = stack.pop();
        x2 = stack.pop();
        y1 = stack.pop();
        x1 = stack.pop();
    }

    var targetMc = mc;
    if (target instanceof MovieClip) {
        targetMc = target;
    }

    if (typeof target === "string" && target) {
        targetMc = mc.getDisplayObject(target);
    }

    if (targetMc instanceof MovieClip) {
        targetMc = targetMc as any;
        targetMc.startDrag(lock, x1, y1, x2, y2);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionCloneSprite = function (stack, mc)
{
    var depth = +stack.pop();
    var target = stack.pop();
    var source = stack.pop();
    if (mc) {
        mc.duplicateMovieClip(target, source, depth);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionRemoveSprite = function (stack, mc)
{
    var target = stack.pop();
    if (mc) {
        mc.removeMovieClip(target);
    }
};

/**
 * @param mc
 */
ActionScript.prototype.ActionEndDrag = function (mc)
{
    if (mc) {
        mc.stopDrag();
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionGetTime = function (stack)
{
    var now = new Date();
    stack[stack.length] = now.getTime() - StartDate.getTime();
};

/**
 * @param stack
 */
ActionScript.prototype.ActionRandomNumber = function (stack)
{
    var maximum = stack.pop();
    stack[stack.length] = Math.floor(Math.random() * maximum);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionTrace = function (stack)
{
    var value = stack.pop();
    if (value instanceof DisplayObject && (value as any).removeFlag) {
        value = "";
    }
    if (value && typeof value === "object") {
        if ("callee" in value) {
            value = Array.prototype.slice.call(value);
        }
        value = value.toString();
    }
    console.log("[trace] " + value);
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionFsCommand2 = function (stack, mc)
{
    stack.pop(); // count
    var method = stack.pop();
    var now = new Date();
    switch (method.toLowerCase()) {
        case "getdateyear":
            stack[stack.length] = now.getFullYear();
            break;
        case "getdatemonth":
            stack[stack.length] = now.getMonth() + 1;
            break;
        case "getdateday":
            stack[stack.length] = now.getDate();
            break;
        case "getdateweekday":
            stack[stack.length] = now.getDay();
            break;
        case "gettimehours":
            stack[stack.length] = now.getHours();
            break;
        case "gettimeminutes":
            stack[stack.length] = now.getMinutes();
            break;
        case "gettimeseconds":
            stack[stack.length] = now.getSeconds();
            break;
        case "startvibrate":
            stack.pop();
            stack.pop();
            stack.pop();
            stack[stack.length] = -1;
            break;
        case "gettimezoneoffset":
            mc.setVariable(stack.pop(), now.toUTCString());
            mc.setVariable(stack.pop(), 0);
            break;
        case "getlocalelongdate":
            mc.setVariable(stack.pop(), now.toLocaleDateString());
            mc.setVariable(stack.pop(), 0);
            break;
        case "getlocaleshortdate":
            mc.setVariable(stack.pop(), now.toDateString());
            mc.setVariable(stack.pop(), 0);
            break;
        case "getlocaletime":
            mc.setVariable(stack.pop(), now.toLocaleTimeString());
            mc.setVariable(stack.pop(), 0);
            break;
        case "getnetworkname":
        case "getdevice":
        case "getdeviceid":
            mc.setVariable(stack.pop(), "");
            mc.setVariable(stack.pop(), -1);
            break;
        case "getlanguage":
            var language = (navigator as any).userLanguage ||
                navigator.language ||
                (navigator as any).browserLanguage ||
                "en-US";
            mc.setVariable(stack.pop(), language);
            mc.setVariable(stack.pop(), 0);
            break;
        case "setsoftkeys":
            stack.pop();
            stack.pop();
            stack[stack.length] = -1;
            break;
        case "fullscreen":
            stack.pop(); // bool
            stack[stack.length] = -1;
            break;
        case "setquality":
        case "getfreestagememory":
        case "gettotalstagememory":
            stack.pop();
            stack[stack.length] = -1;
            break;
        default:
            stack[stack.length] = -1;
            break;
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionCallMethod = function (stack, mc)
{
    var _this = this;
    var method = stack.pop();
    var object = stack.pop();
    var count = +stack.pop();
    var params = [];
    if (count > 0) {
        while (count) {
            count--;
            var param = stack.pop();
            if (param && typeof param === "object" && "callee" in param) {
                param = Array.prototype.slice.call(param);
            }
            params[params.length] = param;
        }
    }

    if (typeof object === "string" && object[method] === undefined) {
        var target = _this.stringToObject(object, mc);
        if (target) {
            object = target;
        }

        if (object === "super") {
            var caller = _this.variables["this"];
            var SuperClass = _this.getSuperClass();
            if (!method && SuperClass) {
                var sc = new SuperClass();
                switch (SuperClass) {
                    case MovieClip:
                        var loadStage = mc.getStage();
                        sc.setStage(loadStage);
                        sc.setParent(mc);
                        sc._extend = true;
                        break;
                }

                var proto = Object.getPrototypeOf(caller);
                proto.constructor = SuperClass;
                (Object as any).setPrototypeOf(proto, sc);
                (Object as any).setPrototypeOf(caller, proto);
            } else {
                object = caller;
            }
        }
    }

    var value;
    if (object && method) {
        var func;
        if (typeof object === "object") {
            var variables = object.variables;
            if (variables) {
                func = variables[method];
                if (!func && variables.registerClass) {
                    func = variables.registerClass[method];
                }
            }
        }

        if (!func) {
            var originMethod = _this.checkMethod(method);
            if (originMethod) {
                func = object[originMethod];
            }
        }

        if (!func) {
            func = object[method];
        }

        if (!func && object instanceof MovieClip) {
            func = (object as any).getVariable(method);
        }

        if (!func && object instanceof Global) {
            func = window[method];
            if (func) {
                params = _this.ActionNativeFunction(params, mc);
                object = window;
            }
        }

        if (method === "call" || method === "apply") {
            func = object;
            object = params.shift();
            if (method === "apply") {
                var args = params.shift();
                params = [];
                if (args) {
                    params = Array.prototype.slice.call(args);
                }
            }
        }

        if (func && typeof func === "function") {
            switch (true) {
                case object instanceof MovieClipLoader:
                    if (method === "loadClip" && typeof params[1] === "string") {
                        var targetStr = params[1];
                        params[1] = mc.getDisplayObject(targetStr);
                    }
                    break;
            }
            value = func.apply(object, params);
        }

        if (!func && object instanceof Object && typeof method === "string") {
            switch (method.toLowerCase()) {
                case "registerclass":
                    value = false;
                    var _root = mc.getDisplayObject("_root");
                    var stage = _root.getStage() as Stage;
                    var characterId = stage.swftag.exportAssets[params[0]];
                    if (characterId) {
                        stage.swftag.registerClass[characterId] = params[1];
                        value = true;
                    }
                    break;
                case "addproperty":
                    _this.addProperty(object, params);
                    break;
            }
        }
    } else {
        if (!method && typeof object === "function") {
            value = object.apply(_this.variables["this"], params);
        }
    }

    stack[stack.length] = value;
};

/**
 * @param target
 * @param params
 * @returns {boolean}
 */
ActionScript.prototype.addProperty = function (target, params)
{
    var property = params[0];
    if (typeof property !== "string" || property === "") {
        return false;
    }

    var getter = params[1];
    if (!getter) {
        getter = function () {};
    }
    var setter = params[2];
    if (!setter) {
        setter = function () {};
    }

    if (typeof getter !== "function" || typeof setter !== "function") {
        return false;
    }

    Object.defineProperty(target, property,
    {
        get: getter,
        set: setter
    });

    return true;
};

/**
 * @param args
 * @param mc
 * @returns {Array}
 */
ActionScript.prototype.ActionNativeFunction = function (args, mc)
{
    var targetMc = mc;
    var params = args;
    if (args[0] instanceof MovieClip) {
        // setInterval, setTimeout
        targetMc = args.shift();
        if (args.length > 0) {
            var obj = args.shift();
            var as;
            if (typeof obj === "string") {
                as = this.getVariable(obj);
                if (typeof as !== "function") {
                    as = targetMc.getVariable(obj);
                }
            }
            if (typeof as === "function") {
                var time = args.shift();
                var action = (function (script, mc, args)
                {
                    return function ()
                    {
                        script.apply(mc, args);
                    };
                })(as, targetMc, args);
                params = [];
                params[params.length] = action;
                params[params.length] = time;
            } else {
                console.log("DEBUG: ", params);
                args.unshift(obj);
                params = args;
            }
        }
    }
    return params;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionCallFunction = function (stack, mc)
{
    var _this = this;
    var name = stack.pop();
    var count = +stack.pop();
    var params = [];
    if (count > 0) {
        while (count) {
            count--;
            var param = stack.pop();
            if (param && typeof param === "object" && "callee" in param) {
                param = Array.prototype.slice.call(param);
            }
            params[params.length] = param;
        }
    }

    if (mc) {
        var caller = mc;
        var func;
        var method = _this.checkMethod(name);
        if (method) {
            func = mc[method];
        } else {
            func = mc.variables[name];
            if (!func) {
                var registerClass = mc.variables.registerClass;
                if (registerClass && typeof registerClass === "object") {
                    func = registerClass[name];
                }

                if (!func) {
                    if (window[name]) {
                        caller = window;
                        params = _this.ActionNativeFunction(params, mc);
                        func = window[name];
                    } else {
                        func = mc.getVariable(name);
                    }
                }
            }
        }
        stack[stack.length] = (func) ? func.apply(caller, params) : undefined;
    }
};

/**
 * @param stack
 * @param aScript
 * @param mc
 */
ActionScript.prototype.ActionDefineFunction = function (stack, aScript, mc)
{
    var action = mc.createActionScript2(aScript.ActionScript, this);
    var name = aScript.FunctionName;
    if (name !== "") {
        mc.setVariable(name, action);
    } else {
        stack[stack.length] = action;
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionDefineLocal = function (stack, mc)
{
    var _this = this;
    var value = stack.pop();
    var name = stack.pop();
    if (_this.parent) {
        _this.variables[name] = value;
    } else {
        mc.setVariable(name, value);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionDefineLocal2 = function (stack, mc)
{
    var _this = this;
    var name = stack.pop();
    if (_this.parent) {
        _this.variables[name] = undefined;
    } else {
        mc.setVariable(name, undefined);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionDelete = function (stack, mc)
{
    var name = stack.pop();
    var object = stack.pop();

    if (typeof object === "string") {
        var target = this.stringToObject(object, mc);
        if (target) {
            object = target;
        }
    }

    if (object instanceof MovieClip) {
        (object as any).setVariable(name, undefined);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionDelete2 = function (stack, mc)
{
    var name = stack.pop();
    if (mc) {
        mc.setVariable(name, undefined);
    }
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionEnumerate = function (stack, mc)
{
    var object = stack.pop();
    stack[stack.length] = null;

    if (typeof object === "string") {
        object = this.stringToObject(object, mc);
    }

    if (object instanceof Object) {
        var name;
        switch (true) {
            case object instanceof DisplayObject:
                var container = object.getTags();
                var stage = object.getStage() as Stage;
                for (name in container) {
                    if (!container.hasOwnProperty(name)) {
                        continue;
                    }
                    var id = container[name];
                    var instance = stage.getInstance(id);
                    var prop = "instance" + id;
                    if (instance.getName()) {
                        prop = instance.getName();
                    }
                    stack[stack.length] = prop;
                }
                var variables = object.variables;
                for (name in variables) {
                    if (!variables.hasOwnProperty(name)) {
                        continue;
                    }
                    stack[stack.length] = name;
                }
                break;
            default:
                for (name in object) {
                    if (!object.hasOwnProperty(name)) {
                        continue;
                    }
                    stack[stack.length] = name;
                }
                break;
        }
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionEquals2 = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    var A = a;
    var B = b;
    if (a instanceof MovieClip) {
        A = (a as any).getTarget();
    }
    if (b instanceof MovieClip) {
        B = (b as any).getTarget();
    }
    stack[stack.length] = (B == A);
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionGetMember = function (stack, mc)
{
    var _this = this;
    var property;
    var name = stack.pop();
    var object = stack.pop();
    if (typeof object === "string") {
        var target = _this.stringToObject(object, mc);
        if (target ) {
            object = target;
        }
    }

    if (object) {
        switch (true) {
            default:
                property = object[name];
                break;
            case object instanceof DisplayObject:
            case object instanceof Global:
                if (!object._extend) {
                    property = object.getProperty(name, false);
                    if (property === undefined &&
                        typeof name === "string" &&
                        name.substr(0, 8) === "instance"
                    ) {
                        var stage = object.getStage() as Stage;
                        var id = name.split("instance")[1];
                        property = stage.getInstance(+id);
                    }

                    if (property === undefined && _this.checkMethod(name)) {
                        property = object[name];
                    }

                } else {
                    property = object[name];
                }
                break;
            case object instanceof Element && name === "childNodes":
                var childNodes = object[name];
                var length = childNodes.length;
                property = [];
                if (length) {
                    for (var i = 0; i < length; i++) {
                        var node = childNodes[i];
                        if (node.nodeType !== 1) {
                            continue;
                        }
                        property[property.length] = node;
                    }
                }
                break;
            case object instanceof (window as any).NamedNodeMap:
                var item = object.getNamedItem(name);
                property = item.value;
                break;
        }
    }
    stack[stack.length] = property;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionInitArray = function (stack)
{
    var number = stack.pop();
    var array = [];
    if (number > 0) {
        while (number--) {
            array[array.length] = stack.pop();
        }
    }
    stack[stack.length] = array;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionInitObject = function (stack)
{
    var number = stack.pop();
    var object = {};
    if (number > 0) {
        while (number--) {
            var value = stack.pop();
            var property = stack.pop();
            object[property] = value;
        }
    }
    stack[stack.length] = object;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionNewMethod = function (stack, mc)
{
    var method = stack.pop();
    var object = stack.pop();
    var number = stack.pop();
    var params = [];
    if (number > 0) {
        while (number--) {
            var param = stack.pop();
            if (param && typeof param === "object" && "callee" in param) {
                param = Array.prototype.slice.call(param);
            }
            params[params.length] = param;
        }
    }

    var constructor;
    if (method === "") {
        constructor = object.apply(object, params);
    }
    if (!constructor && method in object) {
        constructor = this.CreateNewActionScript(object[method], mc, params);
    }
    if (!constructor && method in window) {
        if (method === "CSSStyleDeclaration") {
            constructor = undefined;
        } else {
            constructor = this.CreateNewActionScript(window[method], mc, params);
        }
    }
    stack[stack.length] = constructor;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionNewObject = function (stack, mc)
{
    var object = stack.pop();
    var numArgs = +stack.pop();
    var params = [];
    if (numArgs > 0) {
        while (numArgs) {
            numArgs--;
            var param = stack.pop();
            if (param && typeof param === "object" && "callee" in param) {
                param = Array.prototype.slice.call(param);
            }
            params[params.length] = param;
        }
    }

    var obj = {} as any;
    if (object in window) {
        params.unshift(window[object]);
        obj = new (Function.prototype.bind.apply(window[object], params))();
    } else {
        switch (object) {
            case "Object":
                obj = {};
                break;
            case "MovieClip":
                obj = new MovieClip();
                var stage = mc.getStage() as Stage;
                obj.setStage(stage);
                obj.setParent(mc);
                break;
            case "Sound":
                obj = new Sound(mc);
                obj.movieClip = mc;
                break;
            case "XML":
                obj = new Xml();
                break;
            case "LoadVars":
                obj = new LoadVars();
                break;
            case "Color":
                obj = new Color(params[0]);
                break;
            case "TextFormat":
                obj = new TextFormat();
                break;
            case "MovieClipLoader":
                obj = new MovieClipLoader();
                break;
            default:
                if (mc) {
                    var _this = this;
                    var func = _this.getVariable(object) || mc.getVariable(object);
                    obj = _this.CreateNewActionScript(func, mc, params);
                }
                break;
        }
    }
    stack[stack.length] = obj;
};

/**
 * @param name
 * @returns {*}
 */
ActionScript.prototype.getNativeClass = function (name)
{
    var value;
    switch (name) {
        case "MovieClip":
            value = MovieClip;
            break;
        case "Sprite":
            value = Sprite;
            break;
        case "SimpleButton":
            value = SimpleButton;
            break;
        case "TextField":
            value = TextField;
            break;
        case "Shape":
            value = Shape;
            break;
        case "Sound":
            value = Sound;
            break;
        case "XML":
            value = Xml;
            break;
        case "LoadVars":
            value = LoadVars;
            break;
        case "Color":
            value = Color;
            break;
        case "TextFormat":
            value = TextFormat;
            break;
        case "MovieClipLoader":
            value = MovieClipLoader;
            break;
    }
    return value;
};

/**
 * @param Constr
 * @param mc
 * @param params
 * @returns {*}
 */
ActionScript.prototype.CreateNewActionScript = function (Constr, mc, params)
{
    if (Constr) {
        params.unshift(Constr);
        return new (Function.prototype.bind.apply(Constr, params))();
    }
    return undefined;
};

/**
 * @param stack
 * @param mc
 */
ActionScript.prototype.ActionSetMember = function (stack, mc)
{
    var value = stack.pop();
    var name = stack.pop();
    var object = stack.pop();
    if (object) {
        if (typeof object === "string") {
            var target = this.stringToObject(object, mc);
            if (target) {
                object = target;
            }
        }

        if (typeof object === "object" || typeof object === "function") {
            switch (true) {
                default:
                case object === MovieClip.prototype:
                case object === TextField.prototype:
                case object === SimpleButton.prototype:
                case object === Sprite.prototype:
                case object === Shape.prototype:
                    object[name] = value;
                    break;
                case object instanceof DisplayObject:
                case object instanceof Global:
                    if (!object._extend) {
                        object.setProperty(name, value, false);
                    } else {
                        object[name] = value;
                    }
                    break;
            }
        }
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionTargetPath = function (stack)
{
    console.log("ActionTargetPath");
    var object = stack.pop();
    var path = null;
    if (object instanceof MovieClip) {
        object = object as any;
        path = object.getName();
        if (path !== null) {
            while (true) {
                var parent = object.getParent();
                if (parent === null) {
                    path = "/" + path;
                    break;
                }

                var name = parent.getName();
                if (name === null) {
                    path = null;
                    break;
                }

                path = name + "/" + path;
            }
        }
    }
    stack[stack.length] = path;
};

/**
 * @param stack
 * @param size
 * @param mc
 * @returns {*}
 */
ActionScript.prototype.ActionWith = function (stack, size, mc)
{
    var object = mc;
    if (size) {
        object = stack.pop();
    }
    return object;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionToNumber = function (stack)
{
    var object = +stack.pop();
    stack[stack.length] = object;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionToString = function (stack)
{
    var object = stack.pop();
    stack[stack.length] = this.valueToString(object);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionTypeOf = function (stack)
{
    var object = stack.pop();
    var str = "";
    switch (true) {
        case object instanceof MovieClip:
            str = "movieclip";
            break;
        default:
            str = typeof object;
            break;
    }
    stack[stack.length] = str;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionAdd2 = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b + a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionLess2 = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = (b < a);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionModulo = function (stack)
{
    var y = stack.pop();
    var x = stack.pop();
    stack[stack.length] = x % y;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitAnd = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b & a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitLShift = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b << a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitOr = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b | a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitRShift = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b >> a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitURShift = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = b >> a;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionBitXor = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = a ^ b;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionDecrement = function (stack)
{
    var value = +stack.pop();
    value--;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionIncrement = function (stack)
{
    var value = +stack.pop();
    value++;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionPushDuplicate = function (stack)
{
    var length = stack.length;
    stack[length] = stack[length - 1];
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStackSwap = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = a;
    stack[stack.length] = b;
};

/**
 * @param stack
 * @param number
 */
ActionScript.prototype.ActionStoreRegister = function (stack, number)
{
    this.params[number] = stack[stack.length - 1];
};

/**
 * @param stack
 */
ActionScript.prototype.ActionInstanceOf = function (stack)
{
    var constr = stack.pop();
    var object = stack.pop();
    stack[stack.length] = (object instanceof constr);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionStrictEquals = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = (b === a);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionGreater = function (stack)
{
    var a = stack.pop();
    var b = stack.pop();
    stack[stack.length] = (b > a);
};

/**
 * @param stack
 */
ActionScript.prototype.ActionExtends = function (stack)
{
    var SuperClass = stack.pop();
    var SubClass = stack.pop();
    if (SuperClass && SubClass) {
        this.superClass = SuperClass;
    }
};

/**
 * @param stack
 */
ActionScript.prototype.ActionCastOp = function (stack)
{
    var object = stack.pop();
    var func = stack.pop();
    stack[stack.length] = (typeof func === "function" &&
        object instanceof func.prototype.constructor) ? object : null;
};

/**
 * @param stack
 */
ActionScript.prototype.ActionImplementsOp = function (stack)
{
    console.log("ActionImplementsOp");
    var func = stack.pop();
    console.log(func);
    var count = stack.pop();
    var params = [];
    if (count > 0) {
        while (count--) {
            params[params.length] = stack.pop();
        }
    }
    stack[stack.length] = null;
};

/**
 * @param script
 * @param mc
 */
ActionScript.prototype.ActionTry = function (script, mc)
{

    try {
        script.try.apply(mc);
    } catch (e) {
        if (script.CatchBlockFlag) {
            script.catch.apply(mc,[e]);
        }
    } finally {
        if (script.FinallyBlockFlag) {
            script.finally.apply(mc);
        }
    }
};

/**
 * ActionThrow
 */
ActionScript.prototype.ActionThrow = function (stack)
{
    var value = stack.pop();
    throw value.message;
};

