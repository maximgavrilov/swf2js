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
import { Sound } from './Sound';
import { Stage } from './Stage';

class Activation {
}

/**
 * @param data
 * @param id
 * @param ns
 * @param stage
 * @constructor
 */
export var ActionScript3 = function (data, id, ns, stage: Stage)
{
    var _this = this;

    // params
    _this.id = id;
    _this.caller = null;
    _this.parent = null;
    _this.activation = null;
    _this.scopeStack = [];
    _this.currentIndex = 0;
    _this.stage = stage;
    _this.args = [];
    _this.variables = {};

    // ABC code and info
    var methodBody = data.methodBody[id];
    _this.body = methodBody;
    _this.codes = methodBody.codes;
    _this.info = data.method[methodBody.method];

    // pool and data
    _this.names = data.names;
    _this.data = data;

    // ns
    _this.ns = ns;

    // register
    _this.AVM2 = _this.getAVM2();
    _this.register = _this.AVM2["__swf2js__:"+ns].register;
    _this.register[0] = _this.AVM2;

    // trait
    var trait = methodBody.trait;
    var length = trait.length;
    for (var i = 0; i < length; i++) {
        var obj = trait[i];
        var kind = obj.kind;
        switch (kind) {
            case 0:
                // var key = _this.names[obj.name];

                break;
        }
    }
};

/**
 * @type {{}}
 */
ActionScript3.prototype.methods = {
    gotoAndStop: 1,
    gotoAndPlay: 1,
    play: 1,
    stop: 1,
    duplicateMovieClip: 1,
    getProperty: 1,
    removeMovieClip: 1,
    setProperty: 1,
    startDrag: 1,
    stopDrag: 1,
    targetPath: 1,
    updateAfterEvent: 1,
    nextFrame: 1,
    nextScene: 1,
    prevFrame: 1,
    prevScene: 1,
    stopAllSounds: 1,
    setMask: 1,
    getURL: 1,
    loadMovie: 1,
    loadMovieNum: 1,
    loadVariables: 1,
    loadVariablesNum: 1,
    unloadMovie: 1,
    unloadMovieNum: 1,
    swapDepths: 1,
    getInstanceAtDepth: 1,
    attachMovie: 1,
    attachAudio: 1,
    attachBitmap: 1,
    getNextHighestDepth: 1,
    getBytesLoaded: 1,
    getBytesTotal: 1,
    ASSetPropFlags: 1,
    lineStyle: 1,
    lineGradientStyle: 1,
    beginFill: 1,
    beginGradientFill: 1,
    beginBitmapFill: 1,
    graphics: 1,
    buttonMode: 1,
    clear: 1,
    moveTo: 1,
    lineTo: 1,
    curveTo: 1,
    endFill: 1,
    hitTest: 1,
    getDepth: 1,
    createEmptyMovieClip: 1,
    createTextField: 1,
    getBounds: 1,
    getRect: 1,
    getSWFVersion: 1,
    getTextSnapshot: 1,
    globalToLocal: 1,
    localToGlobal: 1,
    addFrameScript: 1,
    trace: 1,
    addEventListener: 1,
    removeEventListener: 1,
    x: 1,
    y: 1,
    alpha: 1,
    name: 1,
    blendMode: 1,
    filters: 1,
    visible: 1,
    rotation: 1,
    height: 1,
    width: 1,
    scaleX: 1,
    scaleY: 1,
    mouseX: 1,
    mouseY: 1,
    mask: 1,
    mouseEnabled: 1
};

/**
 * @returns {*}
 */
ActionScript3.prototype.getAVM2 = function ()
{
    var _this = this;
    var ns = _this.ns;
    var stage = _this.stage as Stage;
    var values = ns.split(":");
    var className = values.pop();
    var nLen = values.length;
    var classObj = stage.avm2;
    for (var i = 0; i < nLen; i++) {
        classObj = classObj[values[i]];
    }
    return classObj[className];
};

/**
 * @returns {*}
 */
ActionScript3.prototype.getBuilder = function ()
{
    return this.AVM2["__swf2js__::builder"];
};

/**
 * @returns {*}
 */
ActionScript3.prototype.getSuperClass = function ()
{
    var _this = this;
    return _this.AVM2["__swf2js__:"+_this.ns].superClass;
};

/**
 * @param superClass
 */
ActionScript3.prototype.setSuperClass = function (superClass)
{
    var _this = this;
    _this.AVM2["__swf2js__:"+_this.ns].superClass = superClass;
};

/**
 * @returns {*}
 */
ActionScript3.prototype.getParent = function ()
{
    return this.parent;
};

/**
 * @param name
 * @returns {*}
 */
ActionScript3.prototype.getProperty = function (name)
{
    var _this = this;
    var stage = _this.stage as Stage;
    var value;

    // local1
    if (_this.activation) {
        value = _this.activation[name];
    }

    // parent
    if (value === undefined) {
        var parent = _this.getParent();
        if (parent) {
            value = parent.getProperty(name);
        }
    }

    // property
    if (value === undefined) {
        var builder = _this.getBuilder();
        if (builder) {
            if (name in _this.methods) {
                value = builder[name];
            }
            if (value === undefined) {
                value = builder.getProperty(name);
            }
        }
    }

    // local2
    if (value === undefined && name.indexOf("::") !== -1) {
        var values = name.split("::");
        var className = values.pop();
        var path = values.pop();
        if (path !== "private") {
            var pathArr = path.split(".");
            var pLen = pathArr.length;
            var classObj = stage.avm2;
            for (var pIdx = 0; pIdx < pLen; pIdx++) {
                classObj = classObj[pathArr[pIdx]];
            }
            value = classObj[className];

            if (value === undefined) {
                value = _this.AVM2[className];
            }
        } else {
            value = _this.AVM2["private::"+ className];
        }
    }

    // global
    if (value === undefined) {
        value = stage.avm2[name];
    }

    return value;
};

/**
 * setOptions
 */
ActionScript3.prototype.setOptions = function ()
{
    var _this = this;
    var info = _this.info;
    var paramCount = info.paramCount;
    if (paramCount) {
        var data = _this.data;
        var options = info.options;
        var paramType = info.paramType;
        var stage = _this.stage as Stage;

        for (var i = 0; i < paramCount; i++) {
            var value = undefined;

            if (i in options) {
                var option = options[i];
                var val = option.val;
                switch (option.kind) {
                    case 0x01: // string
                        value = data.string[val];
                        break;
                    default:
                        console.log("options", option);
                        break;
                }
            }

            if (i in paramType) {
                var pType = paramType[i];
                if (pType) {
                    var mName = data.multiname_info[pType];
                    var className = null;
                    var path = "";
                    switch (mName.kind) {
                        case 0x07: // QName
                            var ns = data.namespace[mName.ns];
                            switch (ns.kind) {
                                case 0x16:
                                    path = data.string[ns.name];
                                    break;
                                default:
                                    console.log("SetOptions", ns);
                                    break;
                            }

                            className = data.string[mName.name];
                            break;
                    }

                    if (path) {
                        var values = path.split(".");
                        var pLen = values.length;
                        var classObj = stage.avm2;
                        for (var idx = 0; idx < pLen; idx++) {
                            classObj = classObj[values[idx]];
                        }
                        value = classObj[className];
                    }
                }
            }

            if (_this.args[i] === undefined) {
                _this.args[i] = value;
            }
        }
    }
};

/**
 * execute
 */
ActionScript3.prototype.execute = function ()
{
    var _this = this;
    var stack = [];
    _this.scopeStack = [];

    var i = 0;
    var codes = _this.codes;

    _this.setOptions();

    while (true) {
        if (i >= codes.length)
            throw new Error('No return');

        var obj = codes[i];
        var offset = obj.len;

        switch (obj.code) {
            default:
                console.log("ERROR WRONG CODE:", obj);
                break;

            case 0xa0:
                _this.ActionAdd(stack);
                break;
            case 0xc5:
                _this.ActionAddI(stack);
                break;
            case 0x86:
                _this.ActionAsType(stack, obj.value1);
                break;
            case 0x87:
                _this.ActionAsTypeLate(stack);
                break;
            case 0xa8:
                _this.ActionBitAnd(stack);
                break;
            case 0x97:
                _this.ActionBitNot(stack);
                break;
            case 0xa9:
                _this.ActionBitOr(stack);
                break;
            case 0xaa:
                _this.ActionBitXOr(stack);
                break;
            case 0x41:
                _this.ActionCall(stack, obj.value1);
                break;
            case 0x43:
                _this.ActionCallMethod(stack, obj.value1, obj.value2);
                break;
            case 0x46:
                _this.ActionCallProperty(stack, obj.value1, obj.value2);
                break;
            case 0x4c:
                _this.ActionCallPropLex(stack, obj.value1, obj.value2);
                break;
            case 0x4f:
                _this.ActionCallPropVoid(stack, obj.value1, obj.value2);
                break;
            case 0x44:
                _this.ActionCallStatic(stack, obj.value1, obj.value2);
                break;
            case 0x45:
                _this.ActionCallSuper(stack, obj.value1, obj.value2);
                break;
            case 0x4e:
                _this.ActionCallSuperVoid(stack, obj.value1, obj.value2);
                break;
            case 0x78:
                _this.ActionCheckFilter(stack);
                break;
            case 0x80:
                _this.ActionCoerce(stack, obj.value1);
                break;
            case 0x82:
                _this.ActionCoerceA(stack);
                break;
            case 0x85:
                _this.ActionCoerceS(stack);
                break;
            case 0x42:
                _this.ActionConstruct(stack, obj.value1);
                break;
            case 0x4a:
                _this.ActionConstructProp(stack, obj.value1, obj.value2);
                break;
            case 0x49:
                _this.ActionConstructSuper(stack, obj.value1);
                break;
            case 0x76:
                _this.ActionConvertB(stack);
                break;
            case 0x73:
                _this.ActionConvertI(stack);
                break;
            case 0x75:
                _this.ActionConvertD(stack);
                break;
            case 0x77:
                _this.ActionConvertO(stack);
                break;
            case 0x74:
                _this.ActionConvertU(stack);
                break;
            case 0x70:
                _this.ActionConvertS(stack);
                break;
            case 0xef:
                _this.ActionDebug(stack, obj.type, obj.index, obj.reg, obj.extra);
                break;
            case 0xf1:
                _this.ActionDebugFile(stack, obj.value1);
                break;
            case 0xf0:
                _this.ActionDebugLine(stack);
                break;
            case 0x94:
                _this.ActionDecLocal(stack, obj.value1);
                break;
            case 0xc3:
                _this.ActionDecLocalI(stack, obj.value1);
                break;
            case 0x93:
                _this.ActionDecrement(stack);
                break;
            case 0xc1:
                _this.ActionDecrementI(stack);
                break;
            case 0x6a:
                _this.ActionDeleteProperty(stack, obj.value1);
                break;
            case 0xa3:
                _this.ActionDivide(stack);
                break;
            case 0x2a:
                _this.ActionDup(stack);
                break;
            case 0x06:
                _this.ActionDxns(stack, obj.value1);
                break;
            case 0x07:
                _this.ActionDxnsLate(stack);
                break;
            case 0xab:
                _this.ActionEquals(stack);
                break;
            case 0x72:
                _this.ActionEscXAttr(stack);
                break;
            case 0x71:
                _this.ActionEscXElem(stack);
                break;
            case 0x53:
                _this.ActionApplyType(stack, obj.value1);
                break;
            case 0x5e:
                _this.ActionFindProperty(stack, obj.value1);
                break;
            case 0x5d:
                _this.ActionFindPropStrict(stack, obj.value1);
                break;
            case 0x59:
                _this.ActionGetDescendAnts(stack, obj.value1);
                break;
            case 0x64:
                _this.ActionGetGlobalScope(stack);
                break;
            case 0x6e:
                _this.ActionGetGlobalsLot(stack, obj.value1);
                break;
            case 0x60:
                _this.ActionGetLex(stack, obj.value1);
                break;
            case 0x62:
                _this.ActionGetLocal(stack, obj.value1);
                break;
            case 0xd0:
                _this.ActionGetLocal0(stack);
                break;
            case 0xd1:
                _this.ActionGetLocal1(stack);
                break;
            case 0xd2:
                _this.ActionGetLocal2(stack);
                break;
            case 0xd3:
                _this.ActionGetLocal3(stack);
                break;
            case 0x66:
                _this.ActionGetProperty(stack, obj.value1);
                break;
            case 0x65:
                _this.ActionGetScopeObject(stack, obj.value1);
                break;
            case 0x6c:
                _this.ActionGetSlot(stack, obj.value1);
                break;
            case 0x04:
                _this.ActionGetSuper(stack, obj.value1);
                break;
            case 0xb0:
                _this.ActionGreaterEquals(stack);
                break;
            case 0xaf:
                _this.ActionGreaterThan(stack);
                break;
            case 0x1f:
                _this.ActionHasNext(stack);
                break;
            case 0x32:
                _this.ActionHasNext2(stack, obj.value1, obj.value2);
                break;
            case 0x12:
                offset += _this.ActionIfFalse(stack, obj.value1);
                break;
            case 0x18:
                offset += _this.ActionIfGe(stack, obj.value1);
                break;
            case 0x17:
                offset += _this.ActionIfGt(stack, obj.value1);
                break;
            case 0x16:
                offset += _this.ActionIfLe(stack, obj.value1);
                break;
            case 0x15:
                offset += _this.ActionIfLt(stack, obj.value1);
                break;
            case 0x0f:
                offset += _this.ActionIfNge(stack, obj.value1);
                break;
            case 0x0e:
                offset += _this.ActionIfNgt(stack, obj.value1);
                break;
            case 0x0d:
                offset += _this.ActionIfNle(stack, obj.value1);
                break;
            case 0x0c:
                offset += _this.ActionIfNlt(stack, obj.value1);
                break;
            case 0x14:
                offset += _this.ActionIfNe(stack, obj.value1);
                break;
            case 0x19:
                offset += _this.ActionIfStrictEq(stack, obj.value1);
                break;
            case 0x1a:
                offset += _this.ActionIfStrictNe(stack, obj.value1);
                break;
            case 0x11:
                offset += _this.ActionIfTrue(stack, obj.value1);
                break;
            case 0xb4:
                _this.ActionIn(stack, obj.value1);
                break;
            case 0x92:
                _this.ActionIncLocal(stack, obj.value1);
                break;
            case 0xc2:
                _this.ActionIncLocalI(stack, obj.value1);
                break;
            case 0x91:
                _this.ActionIncrement(stack);
                break;
            case 0xc0:
                _this.ActionIncrementI(stack);
                break;
            case 0x68:
                _this.ActionInitProperty(stack, obj.value1);
                break;
            case 0xb1:
                _this.ActionInstanceOf(stack);
                break;
            case 0xb2:
                _this.ActionIsType(stack, obj.value1);
                break;
            case 0xb3:
                _this.ActionIsTypeLate(stack);
                break;
            case 0x10: // ActionJump
                offset = obj.value1;
                break;
            case 0x08:
                _this.ActionKill(stack, obj.value1);
                break;
            case 0x09:
                _this.ActionLabel(stack);
                break;
            case 0xae:
                _this.ActionLessEquals(stack);
                break;
            case 0xad:
                _this.ActionLessThan(stack);
                break;
            case 0x1b:
                _this.ActionLookupSwitch(stack, obj.offset, obj.count, obj.array);
                break;
            case 0xa5:
                _this.ActionLShift(stack);
                break;
            case 0xa4:
                _this.ActionModulo(stack);
                break;
            case 0xa2:
                _this.ActionMultiply(stack);
                break;
            case 0xc7:
                _this.ActionMultiplyI(stack);
                break;
            case 0x90:
                _this.ActionNeGate(stack);
                break;
            case 0xc4:
                _this.ActionNeGateI(stack);
                break;
            case 0x57:
                _this.ActionNewActivation(stack);
                break;
            case 0x56:
                _this.ActionNewArray(stack, obj.value1);
                break;
            case 0x5a:
                _this.ActionNewCatch(stack, obj.value1);
                break;
            case 0x58:
                _this.ActionNewClass(stack, obj.value1);
                break;
            case 0x40:
                _this.ActionNewFunction(stack, obj.value1);
                break;
            case 0x55:
                _this.ActionNewObject(stack, obj.value1);
                break;
            case 0x1e:
                _this.ActionNextName(stack);
                break;
            case 0x23:
                _this.ActionNextValue(stack);
                break;
            case 0x02:
                _this.ActionNop(stack);
                break;
            case 0x96:
                _this.ActionNot(stack);
                break;
            case 0x29:
                _this.ActionPop(stack);
                break;
            case 0x1d:
                _this.ActionPopScope();
                break;
            case 0x24:
                _this.ActionPushByte(stack, obj.value1);
                break;
            case 0x2f:
                _this.ActionPushDouble(stack, obj.value1);
                break;
            case 0x27:
                _this.ActionPushFalse(stack, obj.value1);
                break;
            case 0x2d:
                _this.ActionPushInt(stack, obj.value1);
                break;
            case 0x31:
                _this.ActionPushNameSpace(stack, obj.value1);
                break;
            case 0x28:
                _this.ActionPushNan(stack);
                break;
            case 0x20:
                _this.ActionPushNull(stack);
                break;
            case 0x30:
                _this.ActionPushScope(stack);
                break;
            case 0x25:
                _this.ActionPushShort(stack, obj.value1);
                break;
            case 0x2c:
                _this.ActionPushString(stack, obj.value1);
                break;
            case 0x26:
                _this.ActionPushTrue(stack);
                break;
            case 0x2e:
                _this.ActionPushUInt(stack, obj.value1);
                break;
            case 0x21:
                _this.ActionPushUndefined(stack);
                break;
            case 0x1c:
                _this.ActionPushWith(stack);
                break;
            case 0x48: // ActionReturnValue
                return stack.pop();
            case 0x47: // ReturnVoid
                return undefined;
            case 0xa6:
                _this.ActionRShift(stack);
                break;
            case 0x63:
                _this.ActionSetLocal(stack, obj.value1);
                break;
            case 0xd4:
                _this.ActionSetLocal0(stack);
                break;
            case 0xd5:
                _this.ActionSetLocal1(stack);
                break;
            case 0xd6:
                _this.ActionSetLocal2(stack);
                break;
            case 0xd7:
                _this.ActionSetLocal3(stack);
                break;
            case 0x6f:
                _this.ActionSetGlobalSlot(stack, obj.value1);
                break;
            case 0x61:
                _this.ActionSetProperty(stack, obj.value1);
                break;
            case 0x6d:
                _this.ActionSetSlot(stack, obj.value1);
                break;
            case 0x05:
                _this.ActionSetSuper(stack, obj.value1);
                break;
            case 0xac:
                _this.ActionStrictEquals(stack);
                break;
            case 0xa1:
                _this.ActionSubtract(stack);
                break;
            case 0xc6:
                _this.ActionSubtractI(stack);
                break;
            case 0x2b:
                _this.ActionSwap(stack);
                break;
            case 0x03:
                _this.ActionThrow(stack);
                break;
            case 0x95:
                _this.ActionTypeof(stack);
                break;
            case 0xa7:
                _this.ActionURShift(stack);
                break;
        }

        i += offset;
    }
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionAdd = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 + value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionAddI = function (stack)
{
    var value2 = +stack.pop();
    var value1 = +stack.pop();
    stack[stack.length] = value1 + value2;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionAsType = function (stack, index)
{
    var type = this.names[index];
    var value = stack.pop();
    stack[stack.length] = (typeof value === type) ? true : null;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionAsTypeLate = function (stack)
{
    var cValue = stack.pop(); // class
    var value = stack.pop();
    stack[stack.length] = (typeof cValue === value) ? true : null;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionBitAnd = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 & value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionBitNot = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = ~value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionBitOr = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 | value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionBitXOr = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 ^ value2;
};

/**
 * @param stack
 * @param argCount
 */
ActionScript3.prototype.ActionCall = function (stack, argCount)
{
    var params = [];
    for (var i = argCount; i--;) {
        params[i] = stack.pop();
    }
    var receiver = stack.pop();
    var func = stack.pop();

    var value;
    if (typeof func === "function") {
        value = func.apply(receiver, params);
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallMethod = function (stack, index, argCount)
{
    var params = [];
    for (var i = 0; i < argCount; i++) {
        params[params.length] = stack.pop();
    }
    var receiver = stack.pop();
    var value;
    if (typeof receiver === "function") {
        value = receiver.apply(this.caller, params);
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallProperty = function (stack, index, argCount)
{
    var _this = this;
    var params = new Array(argCount);
    for (var i = argCount - 1; i >= 0; i--)
        params[i] = stack.pop();
    var prop = _this.names[index];
    var obj = stack.pop();

    var value;
    if (obj) {
        var func = null;
        if (obj instanceof DisplayObject) {
            if (prop in _this.methods) {
                func = obj[prop];
            }

            if (!func) {
                func = (obj as any).getProperty(prop);
            }
        } else {
            func = obj[prop];
        }

        if (func) {
            value = func.apply(_this.caller, params);
        }
    }

    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallPropLex = function (stack, index, argCount)
{
    var _this = this;
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }

    var prop = _this.names[index];
    var obj = stack.pop();

    var value;
    if (obj) {
        value = obj[prop].apply(_this.getBuilder(), params);
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallPropVoid = function (stack, index, argCount)
{
    var _this = this;
    var params = [];
    for (var i = argCount; i--;) {
        params[i] = stack.pop();
    }

    var obj = stack.pop();
    var name = _this.names[index];

    var values = name.split("::"); // implements
    var prop = values.pop();
    var ns = values.pop();
    if (ns) {
        // console.log(ns, obj, prop);
    }

    var func = obj[prop];
    if (!func && obj instanceof MovieClip) {
        obj = obj as any;
        var stage = obj.getStage() as Stage;
        var symbol = stage.swftag.symbols[obj.getCharacterId()];
        if (symbol) {
            var names = symbol.split(".");
            var classMethod = names.pop();
            var length = names.length;
            var classObj = stage.avm2;
            for (i = 0; i < length; i++) {
                classObj = classObj[names[i]];
            }

            if (classObj) {
                var AVM2 = classObj[classMethod];
                while (true) {
                    func = AVM2[prop];
                    if (func) {
                        break;
                    }
                    AVM2 = AVM2.super;
                    if (!AVM2 || AVM2 instanceof MovieClip) {
                        break;
                    }
                }
            }
        }
    }

    if (!func) {
        while (true) {
            var SuperClass = obj.super;
            if (!SuperClass) {
                break;
            }

            if (SuperClass instanceof MovieClip) {
                obj = _this.caller;
                func = obj[prop];
                break;
            }

            func = SuperClass[prop];
            if (func) {
                break;
            }

            obj = SuperClass;
        }
    }

    // fscommand
    if (prop === "fscommand") {
        obj = _this.stage as Stage;
    }

    if (func) {
        func.apply(obj, params);
    }
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallStatic = function (stack, index, argCount)
{
    console.log("ActionCallStatic");
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }
    // var receiver = stack.pop();
    // var value;
    // stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallSuper = function (stack, index, argCount)
{
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }
    // var _porp = this.names[index];
    stack.pop(); // receiver
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionCallSuperVoid = function (stack, index, argCount)
{
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }
    // var porp = this.names[index];
    stack.pop(); // receiver
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionCheckFilter = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionCoerce = function (stack, index)
{
    stack.pop(); // value
    var str = this.names[index];
    stack[stack.length] = str;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionCoerceA = function(stack)
{
    var value = stack.pop();
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionCoerceS = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = String(value);
};

/**
 * @param stack
 * @param argCount
 */
ActionScript3.prototype.ActionConstruct = function (stack, argCount)
{
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }
    var obj = stack.pop();
    stack[stack.length] = obj.construct.apply(obj, params);
};

/**
 * @param stack
 * @param index
 * @param argCount
 */
ActionScript3.prototype.ActionConstructProp = function (stack, index, argCount)
{
    var _this = this;
    var params = [];
    for (var i = argCount; i--;) {
        params[params.length] = stack.pop();
    }

    var prop = _this.names[index];
    var obj = stack.pop();

    var value;
    var stage = _this.stage as Stage;
    var DoABC = stage.abc[prop];
    if (DoABC) {
        var builder = _this.getBuilder();
        var AVM2 = new DoABC(builder);
        stage.avm2[prop] = AVM2;
        AVM2[prop].apply(builder, params);
        value = AVM2;
    } else {
        value = new (Function.prototype.bind.apply(obj[prop], params))();
    }

    stack[stack.length] = value;
};

/**
 * @param stack
 * @param argCount
 */
ActionScript3.prototype.ActionConstructSuper = function (stack, argCount)
{
    var _this = this;
    var params = [];
    for (var i = argCount; i--;) {
        params[i] = stack.pop();
    }

    var obj = stack.pop();
    var SuperClassName = obj["__swf2js__:"+_this.ns].extends;
    var values = SuperClassName.split("::");
    var prop = values.pop();
    var ns = values.pop();
    var stage = _this.stage as Stage;
    var abcObj = stage.abc;
    var avmObj = stage.avm2;

    if (ns) {
        var names = ns.split(".");
        var length = names.length;
        for (i = 0; i < length; i++) {
            abcObj = abcObj[names[i]];
            avmObj = avmObj[names[i]];
        }
    }

    var sClass = null;
    var SuperClass = abcObj[prop];
    var builder = _this.getBuilder();
    switch (SuperClass) {
        case MovieClip:
            sClass = new MovieClip();
            sClass.setStage(stage);
            sClass._extend = true;
            break;
        case Sound:
            sClass = new Sound();
            sClass.movieClip = builder;
            break;
        default:
            if (SuperClass in window) { // Object
                sClass = new (Function.prototype.bind.apply(window[SuperClassName], params))();
            } else {
                sClass = new SuperClass(builder);
                avmObj[prop] = sClass;
                sClass[prop].apply(builder, params);
            }
            break;
    }

    obj["super"] = sClass;
    obj["__swf2js__:"+_this.ns].superClass = sClass;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertB = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = (value) ? true : false;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertI = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = value|0;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertD = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = +value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertO = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = (typeof value === "object") ? value : null;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertU = function (stack)
{
    var value = stack.pop();
    value = value|0;
    if (value < 0) {
        value *= -1;
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionConvertS = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = String(value);
};

/**
 * @param stack
 * @param type
 * @param index
 * @param reg
 * @param extra
 */
ActionScript3.prototype.ActionDebug = function (stack, type, index, reg, extra)
{


};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionDebugFile = function (stack, index)
{


};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDebugLine = function (stack)
{


};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionDecLocal = function (stack, index)
{

};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionDecLocalI = function (stack, index)
{

};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDecrement = function (stack)
{
    var value = stack.pop();
    value -= 1;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDecrementI = function (stack)
{
    var value = stack.pop();
    value -= 1;
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionDeleteProperty = function (stack, index)
{
    var prop = this.name[index];
    var obj = stack.pop();
    if (obj) {
        if (prop in obj) {
            delete obj[prop];
        } else {
            // TODO
            console.log("ActionDeleteProperty");
        }
    }
    stack[stack.length] = true;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDivide = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 / value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDup = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = value;
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionDxns = function (stack, index)
{

};

/**
 * @param stack
 */
ActionScript3.prototype.ActionDxnsLate = function (stack)
{
    stack.pop(); // value
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionEquals = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = (value1 == value2);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionEscXAttr = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = String(value);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionEscXElem = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = String(value);
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionApplyType = function (stack, argCount)
{
    // TODO
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionFindProperty = function (stack, index)
{
    // var prop = this.names[index];
    var obj;
    stack[stack.length] = obj;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionFindPropStrict = function (stack, index)
{
    var _this = this;
    var name = _this.names[index];
    var values = name.split("::");
    var prop = values.pop();
    var ns = values.pop();
    var obj = null;

    // caller
    var caller = _this.caller;
    if (caller && !(caller instanceof MovieClip)) {
        if (name in caller) {
            obj = caller;
        }
    }

    if (!obj) {
        var AVM2 = _this.AVM2;
        if (ns) {
            var names = ns.split(".");
            var length = names.length;
            if (length > 1) {
                var avmObj = _this.stage.avm2;
                for (var i = 0; i < length; i++) {
                    avmObj = avmObj[names[i]];
                }
                AVM2 = avmObj;
            }
        }

        // local
        if (prop in AVM2) {
            obj = AVM2;
        }
    }

    // find avm
    if (!obj) {
        var avm2s = _this.stage.avm2;
        if (prop in avm2s) {
            obj = avm2s[prop];
        }
    }

    // builder
    if (!obj) {
        var builder = _this.getBuilder();
        if (builder) {
            if (builder instanceof MovieClip) {
                if (prop in _this.methods) {
                    obj = builder;
                } else if ((builder as any).getProperty(prop) !== undefined) {
                    obj = builder;
                }
            }
        }
    }

    if (!obj) {
        // console.log("ActionFindPropStrict::ERROR", name, AVM2, this);
    }

    stack[stack.length] = obj;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetDescendAnts = function (stack, index)
{
    console.log("ActionGetDescendAnts");
    // var porp = this.names[index];
    var obj;
    stack[stack.length] = obj;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGetGlobalScope = function (stack)
{
    var _this = this;
    var scopeStack = _this.scopeStack;
    stack[stack.length] = scopeStack[scopeStack.length - 1];
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetGlobalsLot = function (stack, index)
{
    console.log("ActionGetGlobalsLot");
    var value;
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetLex = function (stack, index)
{
    var _this = this;
    var name = _this.names[index];
    stack[stack.length] = _this.getProperty(name);
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetLocal = function (stack, index)
{
    var _this = this;
    var value = _this.args[index - 1];
    if (value === undefined) {
        value = _this.register[index];
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGetLocal0 = function (stack)
{
    stack[stack.length] = this.register[0];
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGetLocal1 = function (stack)
{
    var _this = this;
    var value = _this.args[0];
    if (value === undefined) {
        value = _this.register[1];
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGetLocal2 = function (stack)
{
    var _this = this;
    var value = _this.args[1];
    if (value === undefined) {
        value = _this.register[2];
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGetLocal3 = function (stack)
{
    var _this = this;
    var value = _this.args[2];
    if (value === undefined) {
        value = _this.register[3];
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetProperty = function (stack, index)
{
    var _this = this;
    var prop = _this.names[index];
    if (prop === null) {
        prop = stack.pop();
    }
    var obj = stack.pop();

    var value;
    if (obj && prop) {
        if (obj instanceof DisplayObject) {
            if (prop in _this.methods) {
                value = obj[prop];
            }
            if (!value && prop === "parent") {
                value = obj;
            }
            if (!value) {
                value = (obj as any).getProperty(prop);
            }
        } else {
            value = obj[prop];
        }

        if (value === undefined) {
            value = _this.getProperty(prop);
        }
    }
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetScopeObject = function (stack, index)
{
    var activation = this.activation;
    if (!index) {
        stack[stack.length] = activation;
    } else {
        stack[stack.length] = (index in activation) ? activation : null;
    }
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetSlot = function (stack, index)
{
    var obj = stack.pop();
    var name = obj[index];
    stack[stack.length] = this.activation[name];
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionGetSuper = function (stack, index)
{
    // var prop = this.prop;
    stack.pop(); // obj
    var value;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGreaterEquals = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = (value1 >= value2);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionGreaterThan = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = (value1 > value2);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionHasNext = function (stack)
{
    var currentIndex = stack.pop();
    var obj = stack.pop();

    currentIndex++;
    var result = 0;
    if (obj) {
        var index = 0;
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }

            if (index === currentIndex) {
                result = currentIndex;
                break;
            }
            index++;
        }
    }

    stack[stack.length] = result;
};

/**
 * @param stack
 * @param objectReg
 * @param indexReg
 */
ActionScript3.prototype.ActionHasNext2 = function (stack, objectReg, indexReg)
{
    var _this = this;
    var obj = _this.register[objectReg];
    var currentIndex = _this.currentIndex;

    var value = false;
    var index = 0;
    if (obj) {
        for (var key in obj) {
            if (!obj.hasOwnProperty(key)) {
                continue;
            }

            if (index === currentIndex) {
                value = true;
                currentIndex++;
                break;
            }

            index++;
        }
    }

    if (!value) {
        currentIndex = 0;
    }

    _this.currentIndex = currentIndex;
    _this.register[indexReg] = index;
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfFalse = function (stack, index)
{
    var value = stack.pop();
    return (value === false) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfGe = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 < value2) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfGt = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value2 < value1) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfLe = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value2 < value1) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfLt = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 < value2) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfNge = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 < value2) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfNgt = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value2 < value1) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfNle = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value2 < value1) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfNlt = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 < value2) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfNe = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 == value2) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfStrictEq  = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 === value2) ? index : 0;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfStrictNe  = function (stack, index)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    return (value1 === value2) ? 0 : index;
};

/**
 * @param stack
 * @param index
 * @returns {number}
 */
ActionScript3.prototype.ActionIfTrue = function (stack, index)
{
    var value = stack.pop();
    return (value === true) ? index : 0;
};


/**
 * @param stack
 */
ActionScript3.prototype.ActionIn = function (stack)
{
    var obj = stack.pop();
    var name = stack.pop();
    stack[stack.length] = (name in obj);
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionIncLocal = function (stack, index)
{
    this.register[index]+=1;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionIncLocalI = function (stack, index)
{
    this.register[index]+=1;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionIncrement = function (stack)
{
    var value = stack.pop();
    value++;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionIncrementI = function (stack)
{
    var value = stack.pop();
    value++;
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionInitProperty = function (stack, index)
{
    var value = stack.pop();
    var prop = this.names[index];
    var obj = stack.pop();
    if (obj) {
        if (obj instanceof DisplayObject) {
            (obj as any).setProperty(prop, value);
        } else {
            obj[prop] = value;
        }
    }
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionInstanceOf = function (stack)
{
    var type = stack.pop();
    var value = stack.pop();
    stack[stack.length] = (value instanceof type);
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionIsType = function (stack, index)
{
    var value = stack.pop();
    var type = this.name[index];
    stack[stack.length] = (value == type);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionIsTypeLate = function (stack)
{
    var type = stack.pop();
    var value = stack.pop();
    stack[stack.length] = (value == type);
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionKill = function (stack, index)
{
    delete this.register[index];
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionLabel = function (stack)
{

};

/**
 * @param stack
 */
ActionScript3.prototype.ActionLessEquals = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] =  (value1 <= value2);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionLessThan = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] =  (value1 < value2);
};

/**
 * @param stack
 * @param offset
 * @param count
 * @param array
 */
ActionScript3.prototype.ActionLookupSwitch = function (stack, offset, count, array)
{
    stack.pop(); // index
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionLShift = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 << value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionModulo = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 % value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionMultiply = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 * value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionMultiplyI = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 * value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNeGate = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = -value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNeGateI = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = -value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNewActivation = function (stack)
{
    var _this = this;
    var trait = _this.body.trait;
    var length = trait.length;
    var activation = new Activation();
    for (var i = 0; i < length; i++) {
        var obj = trait[i];
        var kind = obj.kind;
        switch (kind) {
            case 0:
                activation[i + 1] = _this.names[obj.name];
                break;
        }
    }

    _this.activation = activation;
    stack[stack.length] = activation;
};

/**
 * @param stack
 * @param argCount
 */
ActionScript3.prototype.ActionNewArray = function (stack, argCount)
{
    var array = [];
    for (var i = argCount; i--;) {
        array[i] = stack.pop();
    }
    stack[stack.length] = array;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionNewCatch = function (stack, index)
{
    var catchScope;
    stack[stack.length] = catchScope;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionNewClass = function (stack, index)
{
    var basetype = stack.pop();
    // var data = this.data;
    // var classInfo = data.class[index];
    // var id = classInfo.cinit;

    stack[stack.length] = basetype;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionNewFunction = function (stack, index)
{
    stack[stack.length] = (function (self, id)
    {
        return function ()
        {
            var as3 = new ActionScript3(self.data, id, self.ns, self.stage);
            as3.caller = this;
            as3.parent = self;
            as3.args = arguments;
            return as3.execute();
        };
    })(this, index);
};

/**
 * @param stack
 * @param argCount
 */
ActionScript3.prototype.ActionNewObject = function (stack, argCount)
{
    var obj = {};
    for (var i = argCount; i--;) {
        var value = stack.pop();
        var prop = stack.pop();
        obj[prop] = value;
    }
    stack[stack.length] = obj;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNextName = function (stack)
{
    var index = +stack.pop();
    var obj = stack.pop();

    var name;
    if (obj) {
        var count = 0;
        for (var prop in obj) {
            if (!obj.hasOwnProperty(prop)) {
                continue;
            }

            if (count === index) {
                name = prop;
                break;
            }
            count++;
        }
    }
    stack[stack.length] = name;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNextValue = function (stack)
{
    stack.pop(); // var index = stack.pop();
    stack.pop(); // var obj = stack.pop();
    var value;
    stack[stack.length] = value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNop = function (stack)
{


};

/**
 * @param stack
 */
ActionScript3.prototype.ActionNot = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = (!value);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPop = function (stack)
{
    stack.pop();
};

/**
 *
 */
ActionScript3.prototype.ActionPopScope = function ()
{
    this.scopeStack.pop();
};

/**
 * @param stack
 * @param value
 */
ActionScript3.prototype.ActionPushByte = function (stack, value)
{
    stack[stack.length] = value|0;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionPushDouble = function (stack, index)
{
    var data = this.data;
    var double = data.double;
    var value = double[index];
    stack[stack.length] = +value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushFalse = function (stack)
{
    stack[stack.length] = false;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionPushInt = function (stack, index)
{
    var data = this.data;
    var integer = data.integer;
    var value = integer[index];
    stack[stack.length] = +value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionPushNameSpace = function (stack, index)
{
    var data = this.data;
    var names = data.names;
    var value = names[index];
    stack[stack.length] = +value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushNan = function (stack)
{
    stack[stack.length] = NaN;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushNull = function (stack)
{
    stack[stack.length] = null;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushScope = function (stack)
{
    var scope = stack.pop();
    if (scope) {
        var scopeStack = this.scopeStack;
        scopeStack[scopeStack.length] = scope;
    }
};

/**
 * @param stack
 * @param value
 */
ActionScript3.prototype.ActionPushShort = function (stack, value)
{
    stack[stack.length] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionPushString = function (stack, index)
{
    var data = this.data;
    var string = data.string;
    stack[stack.length] = ""+string[index];
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushTrue = function (stack)
{
    stack[stack.length] = true;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionPushUInt = function (stack, index)
{
    var data = this.data;
    var uinteger = data.uinteger;
    stack[stack.length] = uinteger[index];
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushUndefined = function (stack)
{
    stack[stack.length] = undefined;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionPushWith = function (stack)
{
    stack.pop(); // var obj = stack.pop();
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionRShift = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 >> value2;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionSetLocal = function (stack, index)
{
    this.register[index] = stack.pop();
};


    /**
 * @param stack
 */
ActionScript3.prototype.ActionSetLocal0 = function (stack)
{
    this.register[0] = stack.pop();
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSetLocal1 = function (stack)
{
    this.register[1] = stack.pop();
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSetLocal2 = function (stack)
{
    this.register[2] = stack.pop();
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSetLocal3 = function (stack)
{
    this.register[3] = stack.pop();
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionSetGlobalSlot = function (stack, index)
{
    stack.pop(); // var value = stack.pop();
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionSetProperty = function (stack, index)
{
    var _this = this;
    var value = stack.pop();
    var prop = _this.names[index];
    var obj = stack.pop();

    if (obj) {
        if (obj instanceof DisplayObject) {
            if (prop in _this.methods) {
                obj[prop] = value;
            } else {
                console.log("ActionSetProperty", prop);
            }
        } else if (prop in obj) {
            obj[prop] = value;
        } else {
            var builder = _this.getBuilder();
            var caller = _this.caller;
            if (caller instanceof MovieClip) {
                builder = caller;
            }

            if (builder instanceof DisplayObject) {
                if (prop in _this.methods) {
                    builder[prop] = value;
                } else {
                    obj[prop] = value;
                }
            }
        }
    }
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionSetSlot = function (stack, index)
{
    var value = stack.pop();
    var obj = stack.pop();
    var name = obj[index];
    this.activation[name] = value;
};

/**
 * @param stack
 * @param index
 */
ActionScript3.prototype.ActionSetSuper = function (stack, index)
{
    stack.pop(); // var value = stack.pop();
    // var prop = this.names[index];
    stack.pop(); // var obj = stack.pop();

};

/**
 * @param stack
 */
ActionScript3.prototype.ActionStrictEquals = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = (value1 === value2);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSubtract = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value1 - value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSubtractI = function (stack)
{
    var value2 = +stack.pop();
    var value1 = +stack.pop();
    stack[stack.length] = value1 - value2;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionSwap = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value2;
    stack[stack.length] = value1;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionThrow = function (stack)
{
    var value = stack.pop();
    console.log(value);
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionTypeof = function (stack)
{
    var value = stack.pop();
    stack[stack.length] = typeof value;
};

/**
 * @param stack
 */
ActionScript3.prototype.ActionURShift = function (stack)
{
    var value2 = stack.pop();
    var value1 = stack.pop();
    stack[stack.length] = value2 >> value1;
};

