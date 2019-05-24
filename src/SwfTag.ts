/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { ActionScript } from './ActionScript';
import { ActionScript3 } from './ActionScript3';
import { BitIO } from './BitIO';
import {
    BevelFilter, BlurFilter, ColorMatrixFilter,
    ConvolutionFilter, DropShadowFilter, GradientBevelFilter,
    GradientGlowFilter, GlowFilter
} from './BitmapFilter';
import { cacheStore } from './CacheStore';
import { PlaceObject } from './PlaceObject';
import { MovieClip } from './MovieClip';
import { Shape } from './Shape';
import { SimpleButton } from './SimpleButton';
import { TextRecord, StaticText } from './StaticText';
import { TextField } from './TextField';
import { vtc } from './VectorToCanvas';
import {
    Bounds, Matrix,
    isAlphaBug
} from './utils';

const isBtoa = ('btoa' in window);

/**
 * @param stage
 * @param bitio
 * @constructor
 */
export var SwfTag = function (stage, bitio?)
{
    var _this = this;
    _this.stage = stage;
    _this.bitio = bitio;
    _this.currentPosition = {x: 0, y: 0};
    _this.jpegTables = null;
};

/**
 * @param mc
 * @returns {Array}
 */
SwfTag.prototype.parse = function (mc)
{
    var _this = this;
    var length = _this.bitio.data.length;
    return _this.parseTags(length, mc.characterId);
};

/**
 * @param tags
 * @param parent
 */
SwfTag.prototype.build = function (tags, parent)
{
    var _this = this;
    var length = tags.length;
    if (length) {
        var _showFrame = _this.showFrame;
        var originTags = [];
        for (var frame in tags) {
            if (!tags.hasOwnProperty(frame)) {
                continue;
            }
            var tag = tags[frame];
            _showFrame.call(_this, tag, parent, originTags);
        }
    }
};

/**
 * @param obj
 * @param mc
 * @param originTags
 */
SwfTag.prototype.showFrame = function (obj, mc, originTags)
{
    var _this = this;
    var _buildTag = _this.buildTag;
    var newDepth = [];
    var i;
    var tag;
    var frame = obj.frame;
    var stage = _this.stage;

    if (!(frame in originTags)) {
        originTags[frame] = [];
    }
    mc.setTotalFrames(Math.max(mc.getTotalFrames(), frame));

    // add ActionScript
    var actions = obj.actionScript;
    if (actions.length) {
        for (i in actions) {
            if (!actions.hasOwnProperty(i)) {
                continue;
            }
            mc.setActions(frame, actions[i]);
        }
    }

    // add label
    var labels = obj.labels;
    if (labels.length) {
        for (i in labels) {
            if (!labels.hasOwnProperty(i)) {
                continue;
            }
            var label = labels[i];
            mc.addLabel(label.frame, label.name);
        }
    }

    // add sounds
    var sounds = obj.sounds;
    if (sounds.length) {
        for (i in sounds) {
            if (!sounds.hasOwnProperty(i)) {
                continue;
            }
            mc.addSound(frame, sounds[i]);
        }
    }

    var cTags = obj.cTags;
    if (cTags.length) {
        for (i in cTags) {
            if (!cTags.hasOwnProperty(i)) {
                continue;
            }
            tag = cTags[i];
            newDepth[tag.Depth] = true;
            _buildTag.call(_this, frame, tag, mc, originTags);
        }
    }

    // remove tag
    var tags = obj.removeTags;
    if (tags.length) {
        mc.setRemoveTag(frame, tags);
        for (i in tags) {
            if (!tags.hasOwnProperty(i)) {
                continue;
            }
            var rTag = tags[i];
            newDepth[rTag.Depth] = true;
        }
    }

    // copy
    if (frame > 1) {
        var prevFrame = frame - 1;
        var container = mc.container;
        if (prevFrame in container) {
            var prevTags = container[prevFrame];
            if (!(frame in container)) {
                container[frame] = [];
            }

            var length = prevTags.length;
            if (length) {
                var parentId = mc.instanceId;
                for (var d in prevTags) {
                    if (!prevTags.hasOwnProperty(d)) {
                        continue;
                    }
                    if (d in newDepth) {
                        continue;
                    }
                    container[frame][d] = prevTags[d];
                    stage.copyPlaceObject(parentId, d, frame);
                    originTags[frame][d] = originTags[prevFrame][d];
                }
            }
        }
    }
};

/**
 * @param frame
 * @param tag
 * @param parent
 * @param originTags
 */
SwfTag.prototype.buildTag = function (frame, tag, parent, originTags)
{
    var _this = this;
    var container = parent.container;
    if (!(frame in container)) {
        container[frame] = [];
    }

    var isCopy = true;
    if (tag.PlaceFlagMove) {
        var oTag = originTags[frame - 1][tag.Depth];
        if (oTag !== undefined) {
            if (tag.PlaceFlagHasCharacter) {
                if (tag.CharacterId !== oTag.CharacterId) {
                    isCopy = false;
                }
            } else {
                tag.PlaceFlagHasCharacter = oTag.PlaceFlagHasCharacter;
                tag.CharacterId = oTag.CharacterId;
            }

            if (!tag.PlaceFlagHasMatrix && oTag.PlaceFlagHasMatrix) {
                tag.PlaceFlagHasMatrix = oTag.PlaceFlagHasMatrix;
                tag.Matrix = oTag.Matrix;
            }

            if (!tag.PlaceFlagHasColorTransform && oTag.PlaceFlagHasColorTransform) {
                tag.PlaceFlagHasColorTransform = oTag.PlaceFlagHasColorTransform;
                tag.ColorTransform = oTag.ColorTransform;
            }

            if (!tag.PlaceFlagHasClipDepth && oTag.PlaceFlagHasClipDepth) {
                tag.PlaceFlagHasClipDepth = oTag.PlaceFlagHasClipDepth;
                tag.ClipDepth = oTag.ClipDepth;
            }

            if (!tag.PlaceFlagHasClipActions && oTag.PlaceFlagHasClipActions) {
                tag.PlaceFlagHasClipActions = oTag.PlaceFlagHasClipActions;
                tag.ClipActionRecords = oTag.ClipActionRecords;
            }

            if (!tag.PlaceFlagHasRatio && !isCopy) {
                tag.PlaceFlagHasRatio = 1;
                tag.Ratio = frame - 1;
            }

            if (!tag.PlaceFlagHasFilterList && oTag.PlaceFlagHasFilterList) {
                tag.PlaceFlagHasFilterList = oTag.PlaceFlagHasFilterList;
                tag.SurfaceFilterList = oTag.SurfaceFilterList;
            }

            if (!tag.PlaceFlagHasBlendMode && oTag.PlaceFlagHasBlendMode) {
                tag.PlaceFlagHasBlendMode = oTag.PlaceFlagHasBlendMode;
                tag.BlendMode = oTag.BlendMode;
            }
        }
    }

    originTags[frame][tag.Depth] = tag;
    var buildObject = _this.buildObject(tag, parent, isCopy, frame);
    if (buildObject) {
        var stage = _this.stage;
        var placeObject = _this.buildPlaceObject(tag);
        stage.setPlaceObject(placeObject, parent.instanceId, tag.Depth, frame);
        container[frame][tag.Depth] = buildObject.instanceId;
    }
};

/**
 * @param tag
 * @param parent
 * @param isCopy
 * @param frame
 * @returns {*}
 */
SwfTag.prototype.buildObject = function (tag, parent, isCopy, frame)
{
    var _this = this;
    var stage = _this.stage;
    var char = stage.getCharacter(tag.CharacterId);
    var tagType = char.tagType;
    var isMorphShape = false;
    if (tagType === 46 || tagType === 84) {
        isMorphShape = true;
    }

    var obj = {} as any;
    if (!isMorphShape && tag.PlaceFlagMove && isCopy) {
        var id = parent.container[frame - 1][tag.Depth];
        obj = stage.getInstance(id);
    } else {
        if (char instanceof Array) {
            obj = _this.buildMovieClip(tag, char, parent);
        } else {
            switch (tagType) {
                case 11: // DefineText
                case 33: // DefineText2
                    obj = _this.buildText(tag, char);
                    break;
                case 37: // DefineEditText
                    obj = _this.buildTextField(tag, char, parent);
                    break;
                case 2:  // DefineShape
                case 22: // DefineShape2
                case 32: // DefineShape3
                case 83: // DefineShape4
                    obj = _this.buildShape(tag, char);
                    break;
                case 46: // MorphShape
                case 84: // MorphShape2
                    var MorphShape = _this.buildMorphShape(char, tag.Ratio);
                    MorphShape.tagType = tagType;
                    obj = _this.buildShape(tag, MorphShape);
                    break;
                case 7: // DefineButton
                case 34: // DefineButton2
                    obj = _this.buildButton(char, tag, parent);
                    break;
                default:
                    return 0;
            }
        }
        obj.setParent(parent);
        obj.setStage(stage);
        obj.setCharacterId(tag.CharacterId);
        obj.setRatio(tag.Ratio || 0);
        obj.setLevel(tag.Depth);
    }

    if (tag.PlaceFlagHasClipDepth) {
        obj.isClipDepth = true;
        obj.clipDepth = tag.ClipDepth;
    }

    return obj;
};

/**
 * @param tag
 * @returns {PlaceObject}
 */
SwfTag.prototype.buildPlaceObject = function (tag)
{
    var placeObject = new PlaceObject();
    // Matrix
    if (tag.PlaceFlagHasMatrix) {
        placeObject.setMatrix(tag.Matrix);
    }
    // ColorTransform
    if (tag.PlaceFlagHasColorTransform) {
        placeObject.setColorTransform(tag.ColorTransform);
    }
    // Filter
    if (tag.PlaceFlagHasFilterList) {
        placeObject.setFilters(tag.SurfaceFilterList);
    }
    // BlendMode
    if (tag.PlaceFlagHasBlendMode) {
        placeObject.setBlendMode(tag.BlendMode);
    }
    return placeObject;
};


/**
 * @param tag
 * @param character
 * @param parent
 * @returns {MovieClip}
 */
SwfTag.prototype.buildMovieClip = function (tag, character, parent)
{
    var _this = this;
    var stage = _this.stage;
    var mc = new MovieClip();
    mc.setStage(stage);
    mc._url = parent._url;
    var target = "instance" + mc.instanceId;
    if (tag.PlaceFlagHasName) {
        mc.setName(tag.Name);
        target = tag.Name;
    }
    mc.setTarget(parent.getTarget() + "/" + target);
    _this.build(character, mc);

    if (tag.PlaceFlagHasClipActions) {
        var ClipActionRecords = tag.ClipActionRecords;
        var length = ClipActionRecords.length;
        var eventName;
        for (var i = 0; i < length; i++) {
            var actionRecord = ClipActionRecords[i];
            var eventFlag = actionRecord.EventFlags;
            for (eventName in eventFlag) {
                if (!eventFlag.hasOwnProperty(eventName)) {
                    continue;
                }
                if (!eventFlag[eventName]) {
                    continue;
                }
                var action = mc.createActionScript(actionRecord.Actions);
                mc.addEventListener(eventName, action);
            }
        }
    }

    return mc;
};

/**
 * @param tag
 * @param character
 * @param parent
 * @returns {TextField}
 */
SwfTag.prototype.buildTextField = function (tag, character, parent)
{
    var _this = this;
    var stage = _this.stage;

    var textField = new TextField();
    textField.setStage(stage);
    textField.setParent(parent);
    textField.setInitParams();
    textField.setTagType(character.tagType);
    textField.setBounds(character.bounds);
    var target = "instance" + textField.instanceId;
    if (tag.PlaceFlagHasName) {
        textField.setName(tag.Name);
        target = tag.Name;
    }
    textField.setTarget(parent.getTarget() + "/" + target);

    var data = character.data;
    var obj = {} as any;
    var fontData = null;
    var fontId = data.FontID;
    if (data.HasFont) {
        fontData = stage.getCharacter(fontId);
    }

    textField.fontId = fontId;
    textField.fontScale = data.FontHeight / 1024;
    if (fontData && fontData.ZoneTable) {
        textField.fontScale /= 20;
    }
    textField.initialText = data.InitialText;
    obj.autoSize = data.AutoSize;
    obj.border = data.Border;
    if (obj.border) {
        obj.background = 1;
    }
    obj.bottomScroll = 1;
    obj.condenseWhite = 0;
    obj.embedFonts = (data.HasFont && data.UseOutlines && fontData.FontFlagsHasLayout && !data.Password) ? 1 : 0;
    obj.hscroll = 0;
    obj.maxscroll = 0;
    obj.scroll = 0;
    obj.maxhscroll = 0;
    obj.html = data.HTML;
    obj.htmlText = (data.HTML) ? data.InitialText : null;
    obj.length = 0;
    obj.maxChars = 0;
    obj.multiline = data.Multiline;
    obj.password = data.Password;
    obj.selectable = data.NoSelect;
    obj.tabEnabled = 0;
    obj.tabIndex = 0;
    obj.text = data.InitialText;
    obj.textColor = data.TextColor;
    obj.textHeight = 0;
    obj.textWidth = 0;
    obj.type = data.ReadOnly ? "dynamic" : "input";

    var variable = data.VariableName;
    obj.variable = variable;
    if (variable) {
        parent.setVariable(variable, data.InitialText);
    }

    obj.wordWrap = data.WordWrap;

    // TextFormat
    obj.blockIndent = 0;
    obj.bullet = 0;

    if (fontData) {
        obj.bold = fontData.FontFlagsBold;
        var font = textField.getVariable("font");
        obj.font = "'" + fontData.FontName + "', " + font;
        obj.italic = fontData.FontFlagsItalic;
    }

    if (data.HasLayout) {
        switch (data.Align) {
            case 1:
                obj.align = "right";
                break;
            case 2:
                obj.align = "center";
                break;
            case 3:
                obj.align = "justify";
                break;
        }
        obj.leftMargin = data.LeftMargin;
        obj.rightMargin = data.RightMargin;
        obj.indent = data.Indent;
        obj.leading = (14400 > data.Leading) ? data.Leading : data.Leading - 65535;
    }

    obj.size = data.FontHeight / 20;
    obj.tabStops = [];
    obj.target = null;
    obj.underline = 0;
    obj.url = null;

    for (var name in obj) {
        if (!obj.hasOwnProperty(name)) {
            continue;
        }
        textField.setProperty(name, obj[name]);
    }

    if (obj.type === "input") {
        textField.setInputElement();
    }

    return textField;
};

/**
 * @param tag
 * @param character
 * @returns {StaticText}
 */
SwfTag.prototype.buildText = function (tag, character)
{
    var _this = this;
    var stage = _this.stage;
    var staticText = new StaticText();
    staticText.setTagType(character.tagType);
    staticText.setBounds(character.bounds);

    var records = character.textRecords;
    var length = records.length;
    var offsetX = 0;
    var offsetY = 0;
    var scale = 1;
    var textHeight = 0;
    var ShapeTable = null;
    var cMatrix = character.matrix;
    var color = null;
    var isZoneTable = false;
    for (var i = 0; i < length; i++) {
        var record = records[i];
        if ("FontId" in record) {
            var fontId = record.FontId;
            var fontData = stage.getCharacter(fontId);
            ShapeTable = fontData.GlyphShapeTable;
            isZoneTable = false;
            if ("ZoneTable" in fontData) {
                isZoneTable = true;
            }
        }
        if ("XOffset" in record) {
            offsetX = record.XOffset;
        }
        if ("YOffset" in record) {
            offsetY = record.YOffset;
        }
        if ("TextColor" in record) {
            color = record.TextColor;
        }
        if ("TextHeight" in record) {
            textHeight = record.TextHeight;
            if (isZoneTable) {
                textHeight /= 20;
            }
        }

        var entries = record.GlyphEntries;
        var count = record.GlyphCount;
        scale = textHeight / 1024;
        for (var idx = 0; idx < count; idx++) {
            var entry = entries[idx];
            var shapes = ShapeTable[entry.GlyphIndex];
            var data = vtc.convert(shapes);
            var matrix: Matrix = [scale, cMatrix[1], cMatrix[2], scale, cMatrix[4] + offsetX, cMatrix[5] + offsetY];
            var textRecode = new TextRecord();
            textRecode.setData(data);
            textRecode.setColor(color);
            textRecode.setMatrix(matrix);
            staticText.addRecord(textRecode);
            offsetX += entry.GlyphAdvance;
        }
    }

    return staticText;
};

/**
 * @param tag
 * @param character
 * @returns {Shape}
 */
SwfTag.prototype.buildShape = function (tag, character)
{
    var shape = new Shape();
    shape.setTagType(character.tagType);
    shape.setBounds(character.bounds);
    shape.setData(character.data);
    return shape;
};

/**
 * @param character
 * @param tag
 * @param parent
 * @returns {SimpleButton}
 */
SwfTag.prototype.buildButton = function (character, tag, parent)
{
    var _this = this;
    var stage = _this.stage;
    var characters = character.characters;
    var button = new SimpleButton();
    button.setStage(stage);
    button.setParent(parent);
    button.setLevel(tag.Depth);

    if ("actions" in character) {
        button.setActions(character.actions);
    }

    var target = "instance" + button.instanceId;
    if (tag.PlaceFlagHasName) {
        button.setName(tag.Name);
        target = tag.Name;
    }
    button.setTarget(parent.getTarget() + "/" + target);

    var downState = button.getSprite("down");
    if (character.ButtonStateDownSoundId) {
        downState.soundId = character.ButtonStateDownSoundId;
        downState.soundInfo = character.ButtonStateDownSoundInfo;
    }

    var hitState = button.getSprite("hit");
    if (character.ButtonStateHitTestSoundId) {
        hitState.soundId = character.ButtonStateHitTestSoundId;
        hitState.soundInfo = character.ButtonStateHitTestSoundInfo;
    }

    var overState = button.getSprite("over");
    if (character.ButtonStateOverSoundId) {
        overState.soundId = character.ButtonStateOverSoundId;
        overState.soundInfo = character.ButtonStateOverSoundInfo;
    }

    var upState = button.getSprite("up");
    if (character.ButtonStateUpSoundId) {
        upState.soundId = character.ButtonStateUpSoundId;
        upState.soundInfo = character.ButtonStateUpSoundInfo;
    }

    for (var depth in characters) {
        if (!characters.hasOwnProperty(depth)) {
            continue;
        }

        var tags = characters[depth];
        for (var idx in tags) {
            if (!tags.hasOwnProperty(idx)) {
                continue;
            }

            var bTag = tags[idx];
            var obj = _this.buildObject(bTag, button, false, 1);
            var placeObject = _this.buildPlaceObject(bTag);
            var Depth = bTag.Depth;
            if (bTag.ButtonStateDown) {
                downState.addTag(Depth, obj);
                stage.setPlaceObject(placeObject, downState.instanceId, Depth, 0);
            }
            if (bTag.ButtonStateHitTest) {
                hitState.addTag(Depth, obj);
                stage.setPlaceObject(placeObject, hitState.instanceId, Depth, 0);
            }
            if (bTag.ButtonStateOver) {
                overState.addTag(Depth, obj);
                stage.setPlaceObject(placeObject, overState.instanceId, Depth, 0);
            }
            if (bTag.ButtonStateUp) {
                upState.addTag(Depth, obj);
                stage.setPlaceObject(placeObject, upState.instanceId, Depth, 0);
            }
        }
    }

    button.setSprite("down", downState);
    button.setSprite("hit", hitState);
    button.setSprite("over", overState);
    button.setSprite("up", upState);
    button.setTagType(character.tagType);
    return button;
};

/**
 * @param frame
 * @param characterId
 * @returns {{ }}
 */
SwfTag.prototype.generateDefaultTagObj = function (frame, characterId)
{
    return {
        frame: frame,
        characterId: characterId,
        cTags: [],
        removeTags: [],
        actionScript: [],
        labels: [],
        sounds: []
    };
};

/**
 * @param dataLength
 * @param characterId
 * @returns {Array}
 */
SwfTag.prototype.parseTags = function (dataLength, characterId)
{
    var _this = this;
    var _parseTag = _this.parseTag;
    var _addTag = _this.addTag;
    var _generateDefaultTagObj = _this.generateDefaultTagObj;
    var frame = 1;
    var tags = [];
    var tagType = 0;
    var bitio = _this.bitio;

    // default set
    tags[frame] = _generateDefaultTagObj.call(_this, frame, characterId);

    while (bitio.byte_offset < dataLength) {
        var tagStartOffset = bitio.byte_offset;
        if (tagStartOffset + 2 > dataLength) {
            break;
        }

        var tagLength = bitio.getUI16();
        tagType = tagLength >> 6;

        // long
        var length = tagLength & 0x3f;
        if (length === 0x3f) {
            if (tagStartOffset + 6 > dataLength) {
                bitio.byte_offset = tagStartOffset;
                bitio.bit_offset = 0;
                break;
            }
            length = bitio.getUI32();
        }

        var tagDataStartOffset = bitio.byte_offset;
        if (tagType === 1) {
            frame++;
            if (dataLength > tagDataStartOffset + 2) {
                tags[frame] = _generateDefaultTagObj.call(_this, frame, characterId);
            }
        }

        var tag = _parseTag.call(_this, tagType, length);

        var o = bitio.byte_offset - tagDataStartOffset;
        if (o !== length) {
            if (o > length)
                throw new Error('Tag overflow');

            if (o < length) {
                var eat = (length - o);
                if (eat > 0) {
                    bitio.byte_offset += eat;
                }
            }
        }

        if (tag) {
            tags = _addTag.call(_this, tagType, tags, tag, frame);
        }

        bitio.bit_offset = 0;
    }

    return tags;
};

/**
 * @param tagType
 * @param length
 * @returns {*}
 */
SwfTag.prototype.parseTag = function (tagType, length)
{
    var _this = this;
    var obj = null;
    var bitio = _this.bitio;
    var stage = _this.stage;

    switch (tagType) {
        default: // null
            console.log('ERROR UNKNOWN TAG ' + tagType);
            break;
        case 0: // End
            break;
        case 1: // ShowFrame
            break;
        case 2:  // DefineShape
        case 22: // DefineShape2
        case 32: // DefineShape3
        case 83: // DefineShape4
            if (length < 10) {
                bitio.byte_offset += length;
            } else {
                _this.parseDefineShape(tagType);
            }
            break;
        case 9: // BackgroundColor
            if (stage.bgcolor) {
                stage.backgroundColor = stage.bgcolor;
            } else {
                stage.setBackgroundColor(
                    bitio.getUI8(),
                    bitio.getUI8(),
                    bitio.getUI8()
                );
            }
            break;
        case 10: // DefineFont
        case 48: // DefineFont2
        case 75: // DefineFont3
            _this.parseDefineFont(tagType, length);
            break;
        case 13: // DefineFontInfo
        case 62: // DefineFontInfo2
            _this.parseDefineFontInfo(tagType, length);
            break;
        case 11: // DefineText
        case 33: // DefineText2
            _this.parseDefineText(tagType);
            break;
        case 4: // PlaceObject
        case 26: // PlaceObject2
        case 70: //PlaceObject3
            obj = _this.parsePlaceObject(tagType, length);
            break;
        case 37: // DefineEditText
            _this.parseDefineEditText(tagType);
            break;
        case 39: // DefineSprite
            _this.parseDefineSprite(bitio.byte_offset + length);
            break;
        case 12: // DoAction
            obj = _this.parseDoAction(length);
            break;
        case 59: // DoInitAction
            _this.parseDoInitAction(length);
            break;
        case 5: // RemoveObject
        case 28: // RemoveObject2
            obj = _this.parseRemoveObject(tagType);
            break;
        case 7: // DefineButton
        case 34: // DefineButton2
            obj = _this.parseDefineButton(tagType, length);
            break;
        case 43: // FrameLabel
            obj = _this.parseFrameLabel();
            break;
        case 88: // DefineFontName
            _this.parseDefineFontName();
            break;
        case 20: // DefineBitsLossless
        case 36: // DefineBitsLossless2
            _this.parseDefineBitsLossLess(tagType, length);
            break;
        case 6: // DefineBits
        case 21: // DefineBitsJPEG2
        case 35: // DefineBitsJPEG3
        case 90: // DefineBitsJPEG4
            _this.parseDefineBits(tagType, length, _this.jpegTables);
            _this.jpegTables = null;
            break;
        case 8: // JPEGTables
            _this.jpegTables = _this.parseJPEGTables(length);
            break;
        case 56: // ExportAssets
            _this.parseExportAssets();
            break;
        case 46: // DefineMorphShape
        case 84: // DefineMorphShape2
            _this.parseDefineMorphShape(tagType);
            break;
        case 40: // NameCharacter
            bitio.getDataUntil("\0"); // NameCharacter
            break;
        case 24: // Protect
            bitio.byteAlign();
            break;
        case 63: // DebugID
            bitio.getUI8(); // UUID
            break;
        case 64: // EnableDebugger2
            bitio.getUI16(); // Reserved
            bitio.getDataUntil("\0"); // Password
            break;
        case 65: // ScriptLimits
            bitio.getUI16(); // MaxRecursionDepth
            bitio.getUI16(); // ScriptTimeoutSeconds
            break;
        case 69: // FileAttributes
            _this.parseFileAttributes();
            break;
        case 77: // MetaData
            bitio.getDataUntil("\0"); // MetaData
            break;
        case 86: // DefineSceneAndFrameLabelData
            obj = _this.parseDefineSceneAndFrameLabelData();
            break;
        case 18: // SoundStreamHead
        case 45: // SoundStreamHead2
            obj = _this.parseSoundStreamHead(tagType);
            break;
        case 72: // DoABC
        case 82: // DoABC2
            _this.parseDoABC(tagType, length);
            break;
        case 76: // SymbolClass
            _this.parseSymbolClass();
            break;
        case 14: // DefineSound
            _this.parseDefineSound(tagType, length);
            break;
        case 15: // StartSound
        case 89: // StartSound2
            obj = _this.parseStartSound(tagType);
            break;
        case 17: // DefineButtonSound
            _this.parseDefineButtonSound();
            break;
        case 73: // DefineFontAlignZones
            _this.parseDefineFontAlignZones();
            break;
        case 74: // CSMTextSettings
            _this.parseCSMTextSettings(tagType);
            break;
        case 19: // SoundStreamBlock
            _this.parseSoundStreamBlock(tagType, length);
            break;
        case 60: // DefineVideoStream
            _this.parseDefineVideoStream(tagType);
            break;
        case 61: // VideoFrame
            _this.parseVideoFrame(tagType, length);
            break;
        case 78: // DefineScalingGrid
            _this.parseDefineScalingGrid();
            break;
        case 41: // ProductInfo
            bitio.getUI32(); // ProductID
            bitio.getUI32(); // Edition
            bitio.getUI8(); // MajorVersion
            bitio.getUI8(); // MinorVersion
            bitio.getUI32(); // BuildLow
            bitio.getUI32(); // BuildHigh
            bitio.getUI32(); // CompilationDate
            bitio.getUI32(); // TODO
            break;
        case 3:  // FreeCharacter
        case 16: // StopSound
        case 23: // DefineButtonCxform
        case 25: // PathsArePostScript
        case 29: // SyncFrame
        case 31: // FreeAll
        case 38: // DefineVideo
        case 42: // DefineTextFormat
        case 44: // DefineBehavior
        case 47: // FrameTag
        case 49: // GeProSet
        case 52: // FontRef
        case 53: // DefineFunction
        case 54: // PlaceFunction
        case 55: // GenTagObject
        case 57: // ImportAssets
        case 58: // EnableDebugger
        case 66: // SetTabIndex
        case 71: // ImportAssets2
        case 87: // DefineBinaryData
        case 91: // DefineFont4
        case 93: // EnableTelemetry
            console.log("[base] tagType -> " + tagType);
            break;
        case 27: // 27 (invalid)
        case 30: // 30 (invalid)
        case 67: // 67 (invalid)
        case 68: // 68 (invalid)
        case 79: // 79 (invalid)
        case 80: // 80 (invalid)
        case 81: // 81 (invalid)
        case 85: // 85 (invalid)
        case 92: // 92 (invalid)
            console.log("ERROR TAG" + tagType);
            break;
    }

    return obj;
};

/**
 * @param tagType
 * @param tags
 * @param tag
 * @param frame
 * @returns {*}
 */
SwfTag.prototype.addTag = function (tagType, tags, tag, frame)
{
    var tagsArray = tags[frame];
    switch (tagType) {
        case 4:  // PlaceObject
        case 26: // PlaceObject2
        case 70: // PlaceObject3
            var cTags = tagsArray.cTags;
            tagsArray.cTags[cTags.length] = tag;
            break;
        case 12: // DoAction
            var as = tagsArray.actionScript;
            tagsArray.actionScript[as.length] = tag;
            break;
        case 5: // RemoveObject
        case 28: // RemoveObject2
            var removeTags = tagsArray.removeTags;
            tagsArray.removeTags[removeTags.length] = tag;
            break;
        case 43: // FrameLabel
            var labels = tagsArray.labels;
            tag.frame = frame;
            tagsArray.labels[labels.length] = tag;
            break;
        case 15: // StartSound
        case 89: // StartSound2
            var sounds = tagsArray.sounds;
            tagsArray.sounds[sounds.length] = tag;
            break;
    }

    return tags;
};

/**
 * @param tagType
 */
SwfTag.prototype.parseDefineShape = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var characterId = bitio.getUI16();
    var bounds = _this.rect();

    if (tagType === 83) {
        var obj = {} as any;
        obj.EdgeBounds = _this.rect();
        bitio.getUIBits(5); // Reserved
        obj.UsesFillWindingRule = bitio.getUIBits(1);
        obj.UsesNonScalingStrokes = bitio.getUIBits(1);
        obj.UsesScalingStrokes = bitio.getUIBits(1);
    }

    var shapes = _this.shapeWithStyle(tagType);
    _this.appendShapeTag(characterId, bounds, shapes, tagType);
};

/**
 * @returns {{xMin: number, xMax: number, yMin: number, yMax: number}}
 */
SwfTag.prototype.rect = function ()
{
    var bitio = this.bitio;
    bitio.byteAlign();

    var nBits = bitio.getUIBits(5);
    const xMin = bitio.getSIBits(nBits);
    const xMax = bitio.getSIBits(nBits);
    const yMin = bitio.getSIBits(nBits);
    const yMax = bitio.getSIBits(nBits);
    return new Bounds(xMin, yMin, xMax, yMax);
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.shapeWithStyle = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var fillStyles;
    var lineStyles;

    if (tagType === 46 || tagType === 84) {
        fillStyles = {fillStyleCount: 0, fillStyles: []};
        lineStyles = {lineStyleCount: 0, lineStyles: []};
    } else {
        fillStyles = _this.fillStyleArray(tagType);
        lineStyles = _this.lineStyleArray(tagType);
    }

    var numBits = bitio.getUI8();
    var NumFillBits = numBits >> 4;
    var NumLineBits = numBits & 0x0f;
    var ShapeRecords = _this.shapeRecords(tagType, {
        FillBits: NumFillBits,
        LineBits: NumLineBits
    });

    return {
        fillStyles: fillStyles,
        lineStyles: lineStyles,
        ShapeRecords: ShapeRecords
    };
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.fillStyleArray = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var fillStyleCount = bitio.getUI8();
    if ((tagType > 2) && (fillStyleCount === 0xff)) {
        fillStyleCount = bitio.getUI16();
    }

    var fillStyles = [];
    for (var i = fillStyleCount; i--;) {
        fillStyles[fillStyles.length] = _this.fillStyle(tagType);
    }

    return {
        fillStyleCount: fillStyleCount,
        fillStyles: fillStyles
    };
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.fillStyle = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    var bitType = bitio.getUI8();
    obj.fillStyleType = bitType;
    switch (bitType) {
        case 0x00:
            if (tagType === 32 || tagType === 83) {
                obj.Color = _this.rgba();
            } else if (tagType === 46 || tagType === 84) {
                obj.StartColor = _this.rgba();
                obj.EndColor = _this.rgba();
            } else {
                obj.Color = _this.rgb();
            }
            break;
        case 0x10:
        case 0x12:
            if (tagType === 46 || tagType === 84) {
                obj.startGradientMatrix = _this.matrix();
                obj.endGradientMatrix = _this.matrix();
                obj.gradient = _this.gradient(tagType);
            } else {
                obj.gradientMatrix = _this.matrix();
                obj.gradient = _this.gradient(tagType);
            }
            break;
        case 0x13:
            obj.gradientMatrix = _this.matrix();
            obj.gradient = _this.focalGradient(tagType);
            break;
        case 0x40:
        case 0x41:
        case 0x42:
        case 0x43:
            obj.bitmapId = bitio.getUI16();
            if (tagType === 46 || tagType === 84) {
                obj.startBitmapMatrix = _this.matrix();
                obj.endBitmapMatrix = _this.matrix();
            } else {
                obj.bitmapMatrix = _this.matrix();
            }
            break;
    }
    return obj;
};

/**
 * @returns {{}}
 */
SwfTag.prototype.rgb = function ()
{
    var bitio = this.bitio;
    return {
        R: bitio.getUI8(),
        G: bitio.getUI8(),
        B: bitio.getUI8(),
        A: 1
    };
};

/**
 * @returns {{}}
 */
SwfTag.prototype.rgba = function ()
{
    var bitio = this.bitio;
    return {
        R: bitio.getUI8(),
        G: bitio.getUI8(),
        B: bitio.getUI8(),
        A: bitio.getUI8() / 255
    };
};

/**
 * @returns {Array}
 */
SwfTag.prototype.matrix = function ()
{
    var bitio = this.bitio;
    bitio.byteAlign();

    var result = [1, 0, 0, 1, 0, 0];
    if (bitio.getUIBit()) {
        var nScaleBits = bitio.getUIBits(5);
        result[0] = bitio.getSIBits(nScaleBits) / 0x10000;
        result[3] = bitio.getSIBits(nScaleBits) / 0x10000;
    }

    if (bitio.getUIBit()) {
        var nRotateBits = bitio.getUIBits(5);
        result[1] = bitio.getSIBits(nRotateBits) / 0x10000;
        result[2] = bitio.getSIBits(nRotateBits) / 0x10000;
    }

    var nTranslateBits = bitio.getUIBits(5);
    result[4] = bitio.getSIBits(nTranslateBits);
    result[5] = bitio.getSIBits(nTranslateBits);

    return result;
};

/**
 * gradient
 * @param tagType
 * @returns {{SpreadMode: number, InterpolationMode: number, GradientRecords: Array}}
 */
SwfTag.prototype.gradient = function (tagType)
{
    var _this = this;
    var SpreadMode = 0;
    var InterpolationMode = 0;
    var NumGradients;
    var bitio = this.bitio;

    bitio.byteAlign();

    if (tagType === 46 || tagType === 84) {
        NumGradients = bitio.getUI8();
    } else {
        SpreadMode = bitio.getUIBits(2);
        InterpolationMode = bitio.getUIBits(2);
        NumGradients = bitio.getUIBits(4);
    }

    var GradientRecords = [];
    for (var i = NumGradients; i--;) {
        GradientRecords[GradientRecords.length] = _this.gradientRecord(tagType);
    }

    return {
        SpreadMode: SpreadMode,
        InterpolationMode: InterpolationMode,
        GradientRecords: GradientRecords
    };
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.gradientRecord = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    if (tagType === 46 || tagType === 84) {
        return {
            StartRatio: bitio.getUI8() / 255,
            StartColor: _this.rgba(),
            EndRatio: bitio.getUI8() / 255,
            EndColor: _this.rgba()
        };
    } else {
        var Ratio = bitio.getUI8();
        var Color = (tagType < 32) ? _this.rgb() : _this.rgba();
        return {Ratio: Ratio / 255, Color: Color};
    }
};

/**
 * @param tagType
 * @returns {{SpreadMode: number, InterpolationMode: number, GradientRecords: Array, FocalPoint: number}}
 */
SwfTag.prototype.focalGradient = function (tagType)
{
    var bitio = this.bitio;
    bitio.byteAlign();
    var _this = this;
    var SpreadMode = bitio.getUIBits(2);
    var InterpolationMode = bitio.getUIBits(2);
    var numGradients = bitio.getUIBits(4);

    var gradientRecords = [];
    for (var i = numGradients; i--;) {
        gradientRecords[gradientRecords.length] =
            _this.gradientRecord(tagType);
    }
    var FocalPoint = bitio.getFloat16();

    return {
        SpreadMode: SpreadMode,
        InterpolationMode: InterpolationMode,
        GradientRecords: gradientRecords,
        FocalPoint: FocalPoint
    };
};

/**
 * @param tagType
 * @returns {{lineStyleCount: number, lineStyles: Array}}
 */
SwfTag.prototype.lineStyleArray = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var lineStyleCount = bitio.getUI8();
    if ((tagType > 2) && (lineStyleCount === 0xff)) {
        lineStyleCount = bitio.getUI16();
    }

    var array = [];
    for (var i = lineStyleCount; i--;) {
        array[array.length] = _this.lineStyles(tagType);
    }

    return {
        lineStyleCount: lineStyleCount,
        lineStyles: array
    };
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.lineStyles = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;

    obj.fillStyleType = 0;
    if (tagType === 46) {
        obj = {
            StartWidth: bitio.getUI16(),
            EndWidth: bitio.getUI16(),
            StartColor: _this.rgba(),
            EndColor: _this.rgba()
        };
    } else if (tagType === 84) {
        obj.StartWidth = bitio.getUI16();
        obj.EndWidth = bitio.getUI16();

        obj.StartCapStyle = bitio.getUIBits(2);
        obj.JoinStyle = bitio.getUIBits(2);
        obj.HasFillFlag = bitio.getUIBit();
        obj.NoHScaleFlag = bitio.getUIBit();
        obj.NoVScaleFlag = bitio.getUIBit();
        obj.PixelHintingFlag = bitio.getUIBit();
        bitio.getUIBits(5); // Reserved
        obj.NoClose = bitio.getUIBit();
        obj.EndCapStyle = bitio.getUIBits(2);

        if (obj.JoinStyle === 2) {
            obj.MiterLimitFactor = bitio.getUI16();
        }

        if (obj.HasFillFlag) {
            obj.FillType = _this.fillStyle(tagType);
        } else {
            obj.StartColor = _this.rgba();
            obj.EndColor = _this.rgba();
        }
    } else {
        obj.Width = bitio.getUI16();
        if (tagType === 83) {
            // DefineShape4
            obj.StartCapStyle = bitio.getUIBits(2);
            obj.JoinStyle = bitio.getUIBits(2);
            obj.HasFillFlag = bitio.getUIBit();
            obj.NoHScaleFlag = bitio.getUIBit();
            obj.NoVScaleFlag = bitio.getUIBit();
            obj.PixelHintingFlag = bitio.getUIBit();
            bitio.getUIBits(5); // Reserved
            obj.NoClose = bitio.getUIBit();
            obj.EndCapStyle = bitio.getUIBits(2);

            if (obj.JoinStyle === 2) {
                obj.MiterLimitFactor = bitio.getUI16();
            }

            if (obj.HasFillFlag) {
                obj.FillType = _this.fillStyle(tagType);
            } else {
                obj.Color = _this.rgba();
            }
        } else if (tagType === 32) {
            // DefineShape3
            obj.Color = _this.rgba();
        } else {
            // DefineShape1or2
            obj.Color = _this.rgb();
        }
    }

    return obj;
};

/**
 * @param tagType
 * @param currentNumBits
 * @returns {Array}
 */
SwfTag.prototype.shapeRecords = function (tagType, currentNumBits)
{
    var _this = this;
    var bitio = _this.bitio;
    var shapeRecords = [];
    _this.currentPosition = {x: 0, y: 0};
    var _straightEdgeRecord = _this.straightEdgeRecord;
    var _curvedEdgeRecord = _this.curvedEdgeRecord;
    var _styleChangeRecord = _this.styleChangeRecord;

    while (true) {
        var first6Bits = bitio.getUIBits(6);
        var shape = 0;
        if (first6Bits & 0x20) {
            var numBits = first6Bits & 0x0f;
            if (first6Bits & 0x10) {
                shape = _straightEdgeRecord.call(_this, tagType, numBits);
            } else {
                shape = _curvedEdgeRecord.call(_this, tagType, numBits);
            }
        } else if (first6Bits) {
            shape =
                _styleChangeRecord.call(_this, tagType, first6Bits, currentNumBits);
        }

        shapeRecords[shapeRecords.length] = shape;
        if (!shape) {
            bitio.byteAlign();
            break;
        }
    }
    return shapeRecords;
};

/**
 * @param tagType
 * @param numBits
 * @returns {{}}
 */
SwfTag.prototype.straightEdgeRecord = function (tagType, numBits)
{
    var _this = this;
    var bitio = _this.bitio;
    var deltaX = 0;
    var deltaY = 0;
    var GeneralLineFlag = bitio.getUIBit();
    if (GeneralLineFlag) {
        deltaX = bitio.getSIBits(numBits + 2);
        deltaY = bitio.getSIBits(numBits + 2);
    } else {
        var VertLineFlag = bitio.getUIBit();
        if (VertLineFlag) {
            deltaX = 0;
            deltaY = bitio.getSIBits(numBits + 2);
        } else {
            deltaX = bitio.getSIBits(numBits + 2);
            deltaY = 0;
        }
    }

    var AnchorX = deltaX;
    var AnchorY = deltaY;
    if (tagType !== 46 && tagType !== 84) {
        AnchorX = _this.currentPosition.x + deltaX;
        AnchorY = _this.currentPosition.y + deltaY;
        _this.currentPosition.x = AnchorX;
        _this.currentPosition.y = AnchorY;
    }

    return {
        ControlX: 0,
        ControlY: 0,
        AnchorX: AnchorX,
        AnchorY: AnchorY,
        isCurved: false,
        isChange: false
    };
};

/**
 * @param tagType
 * @param numBits
 * @returns {{}}
 */
SwfTag.prototype.curvedEdgeRecord = function (tagType, numBits)
{
    var _this = this;
    var bitio = _this.bitio;
    var controlDeltaX = bitio.getSIBits(numBits + 2);
    var controlDeltaY = bitio.getSIBits(numBits + 2);
    var anchorDeltaX = bitio.getSIBits(numBits + 2);
    var anchorDeltaY = bitio.getSIBits(numBits + 2);

    var ControlX = controlDeltaX;
    var ControlY = controlDeltaY;
    var AnchorX = anchorDeltaX;
    var AnchorY = anchorDeltaY;
    if (tagType !== 46 && tagType !== 84) {
        ControlX = _this.currentPosition.x + controlDeltaX;
        ControlY = _this.currentPosition.y + controlDeltaY;
        AnchorX = ControlX + anchorDeltaX;
        AnchorY = ControlY + anchorDeltaY;

        _this.currentPosition.x = AnchorX;
        _this.currentPosition.y = AnchorY;
    }

    return {
        ControlX: ControlX,
        ControlY: ControlY,
        AnchorX: AnchorX,
        AnchorY: AnchorY,
        isCurved: true,
        isChange: false
    };
};

/**
 * @param tagType
 * @param changeFlag
 * @param currentNumBits
 * @returns {{}}
 */
SwfTag.prototype.styleChangeRecord = function (tagType, changeFlag, currentNumBits)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    obj.StateNewStyles = (changeFlag >> 4) & 1;
    obj.StateLineStyle = (changeFlag >> 3) & 1;
    obj.StateFillStyle1 = (changeFlag >> 2) & 1;
    obj.StateFillStyle0 = (changeFlag >> 1) & 1;
    obj.StateMoveTo = changeFlag & 1;

    if (obj.StateMoveTo) {
        var moveBits = bitio.getUIBits(5);
        obj.MoveX = bitio.getSIBits(moveBits);
        obj.MoveY = bitio.getSIBits(moveBits);
        _this.currentPosition.x = obj.MoveX;
        _this.currentPosition.y = obj.MoveY;
    }

    obj.FillStyle0 = 0;
    if (obj.StateFillStyle0) {
        obj.FillStyle0 = bitio.getUIBits(currentNumBits.FillBits);
    }

    obj.FillStyle1 = 0;
    if (obj.StateFillStyle1) {
        obj.FillStyle1 = bitio.getUIBits(currentNumBits.FillBits);
    }

    obj.LineStyle = 0;
    if (obj.StateLineStyle) {
        obj.LineStyle = bitio.getUIBits(currentNumBits.LineBits);
    }

    if (obj.StateNewStyles) {
        obj.FillStyles = _this.fillStyleArray(tagType);
        obj.LineStyles = _this.lineStyleArray(tagType);
        var numBits = bitio.getUI8();
        currentNumBits.FillBits = obj.NumFillBits = numBits >> 4;
        currentNumBits.LineBits = obj.NumLineBits = numBits & 0x0f;
    }
    obj.isChange = true;
    return obj;
};

/**
 * @param characterId
 * @param bounds
 * @param shapes
 * @param tagType
 */
SwfTag.prototype.appendShapeTag = function (characterId, bounds, shapes, tagType)
{
    var stage = this.stage;
    stage.setCharacter(characterId, {
        tagType: tagType,
        data: vtc.convert(shapes, false),
        bounds: bounds
    });
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseDefineBitsLossLess = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var startOffset = bitio.byte_offset;
    var CharacterId = bitio.getUI16();
    var format = bitio.getUI8();
    var width = bitio.getUI16();
    var height = bitio.getUI16();

    var isAlpha = (tagType === 36);
    var colorTableSize = 0;
    if (format === 3) {
        colorTableSize = bitio.getUI8() + 1;
    }

    // unCompress
    var sub = bitio.byte_offset - startOffset;
    var compressed = bitio.getData(length - sub);
    var data = bitio.unzip(compressed, false);

    // canvas
    var canvas = cacheStore.getCanvas();
    canvas.width = width;
    canvas.height = height;
    var imageContext = canvas.getContext("2d");
    var imgData = imageContext.createImageData(width, height);
    var pxData = imgData.data;

    var idx = 0;
    var pxIdx = 0;
    var x = width;
    var y = height;
    if (format === 5 && !isAlpha) {
        idx = 0;
        pxIdx = 0;
        for (y = height; y--;) {
            for (x = width; x--;) {
                idx++;
                pxData[pxIdx++] = data[idx++];
                pxData[pxIdx++] = data[idx++];
                pxData[pxIdx++] = data[idx++];
                pxData[pxIdx++] = 255;
            }
        }
    } else {
        var bpp = (isAlpha) ? 4 : 3;
        var cmIdx = colorTableSize * bpp;
        var pad = 0;
        if (colorTableSize) {
            pad = ((width + 3) & ~3) - width;
        }

        for (y = height; y--;) {
            for (x = width; x--;) {
                idx = (colorTableSize) ? data[cmIdx++] * bpp : cmIdx++ * bpp;
                if (!isAlpha) {
                    pxData[pxIdx++] = data[idx++];
                    pxData[pxIdx++] = data[idx++];
                    pxData[pxIdx++] = data[idx++];
                    idx++;
                    pxData[pxIdx++] = 255;
                } else {
                    var alpha = (format === 3) ? data[idx + 3] : data[idx++];
                    if (!isAlphaBug) {
                        pxData[pxIdx++] = data[idx++] * 255 / alpha;
                        pxData[pxIdx++] = data[idx++] * 255 / alpha;
                        pxData[pxIdx++] = data[idx++] * 255 / alpha;
                    } else {
                        pxData[pxIdx++] = data[idx++];
                        pxData[pxIdx++] = data[idx++];
                        pxData[pxIdx++] = data[idx++];
                    }
                    pxData[pxIdx++] = alpha;

                    if (format === 3) {
                        idx++;
                    }
                }
            }
            cmIdx += pad;
        }
    }

    imageContext.putImageData(imgData, 0, 0);
    stage.setCharacter(CharacterId, imageContext);
};

/**
 * parseExportAssets
 */
SwfTag.prototype.parseExportAssets = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var count = bitio.getUI16();

    var exportAssets = stage.exportAssets;
    var packages = stage.packages;
    while (count--) {
        var id = bitio.getUI16();
        var name = bitio.getDataUntil("\0");
        if (name.substr(0, 10) === "__Packages") {
            packages[id] = 1;
        }
        exportAssets[name] = id;
    }
};

/**
 * @param length
 * @returns {string}
 */
SwfTag.prototype.parseJPEGTables = function (length)
{
    return this.bitio.getData(length);
};

/**
 * @param tagType
 * @param length
 * @param jpegTables
 */
SwfTag.prototype.parseDefineBits = function (tagType, length, jpegTables)
{
    var _this = this;
    var bitio = _this.bitio;
    var startOffset = bitio.byte_offset;
    var CharacterId = bitio.getUI16();
    var sub = bitio.byte_offset - startOffset;

    var ImageDataLen = length - sub;
    if (tagType === 35 || tagType === 90) {
        ImageDataLen = bitio.getUI32();
    }

    if (tagType === 90) {
        var DeblockParam = bitio.getUI16();
        console.log("DeblockParam", DeblockParam);
    }

    var JPEGData = bitio.getData(ImageDataLen);
    var BitmapAlphaData = false;
    if (tagType === 35 || tagType === 90) {
        BitmapAlphaData =
            bitio.getData(length - sub - ImageDataLen);
    }
    bitio.byte_offset = startOffset + length;

    // render
    var stage = _this.stage;
    stage.imgUnLoadCount++;
    var image = document.createElement("img");
    image.addEventListener("load", function()
    {
        var width = this.width;
        var height = this.height;
        var canvas = cacheStore.getCanvas();
        canvas.width = width;
        canvas.height = height;
        var imageContext = canvas.getContext("2d");
        imageContext.drawImage(this, 0, 0, width, height);

        if (BitmapAlphaData) {
            var data = bitio.unzip(BitmapAlphaData, false);
            var imgData = imageContext.getImageData(0, 0, width, height);
            var pxData = imgData.data;
            var pxIdx = 3;
            var len = width * height;
            for (var i = 0; i < len; i++) {
                pxData[pxIdx] = data[i];
                pxIdx += 4;
            }
            imageContext.putImageData(imgData, 0, 0);
        }

        stage.setCharacter(CharacterId, imageContext);
        stage.imgUnLoadCount--;
    });

    if (jpegTables !== null && jpegTables.length > 4) {
        var margeData = [];
        var len = jpegTables.length - 2;
        for (var idx = 0; idx < len; idx++) {
            margeData[margeData.length] = jpegTables[idx];
        }

        len = JPEGData.length;
        for (idx = 2; idx < len; idx++) {
            margeData[margeData.length] = JPEGData[idx];
        }

        JPEGData = margeData;
    }

    image.src = "data:image/jpeg;base64," +
        _this.base64encode(_this.parseJpegData(JPEGData));

    // for android bug
    setTimeout(function () {}, 0);
};

/**
 * @param JPEGData
 * @returns {string}
 */
SwfTag.prototype.parseJpegData = function (JPEGData)
{
    var i = 0;
    var idx = 0;
    var str = "";
    var length = JPEGData.length;

    // erroneous
    if (JPEGData[0] === 0xFF && JPEGData[1] === 0xD9 && JPEGData[2] === 0xFF && JPEGData[3] === 0xD8) {
        for (i = 4; i < length; i++) {
            str += String.fromCharCode(JPEGData[i]);
        }
    } else if (JPEGData[i++] === 0xFF && JPEGData[i++] === 0xD8) {
        for (idx = 0; idx < i; idx++) {
            str += String.fromCharCode(JPEGData[idx]);
        }
        while (i < length) {
            if (JPEGData[i] === 0xFF) {
                if (JPEGData[i + 1] === 0xD9 && JPEGData[i + 2] === 0xFF && JPEGData[i + 3] === 0xD8) {
                    i += 4;
                    for (idx = i; idx < length; idx++) {
                        str += String.fromCharCode(JPEGData[idx]);
                    }
                    break;
                } else if (JPEGData[i + 1] === 0xDA) {
                    for (idx = i; idx < length; idx++) {
                        str += String.fromCharCode(JPEGData[idx]);
                    }
                    break;
                } else {
                    var segmentLength = (JPEGData[i + 2] << 8) + JPEGData[i + 3] + i + 2;
                    for (idx = i; idx < segmentLength; idx++) {
                        str += String.fromCharCode(JPEGData[idx]);
                    }
                    i += segmentLength - i;
                }
            }
        }
    }
    return str;
};

/**
 * @param data
 * @returns {*}
 */
SwfTag.prototype.base64encode = function (data)
{
    if (isBtoa) {
        return window.btoa(data);
    }

    var base64EncodeChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var out = [];
    var i = 0;
    var len = data.length;

    while (i < len) {
        var c1 = data.charCodeAt(i++) & 0xff;
        if (i === len) {
            out[out.length] = base64EncodeChars.charAt(c1 >> 2);
            out[out.length] = base64EncodeChars.charAt((c1 & 0x3) << 4);
            out[out.length] = "==";
            break;
        }

        var c2 = data.charCodeAt(i++);
        if (i === len) {
            out[out.length] = base64EncodeChars.charAt(c1 >> 2);
            out[out.length] = base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
            out[out.length] = base64EncodeChars.charAt((c2 & 0xF) << 2);
            out[out.length] = "=";
            break;
        }

        var c3 = data.charCodeAt(i++);
        out[out.length] = base64EncodeChars.charAt(c1 >> 2);
        out[out.length] = base64EncodeChars.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
        out[out.length] = base64EncodeChars.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
        out[out.length] = base64EncodeChars.charAt(c3 & 0x3F);
    }

    return out.join("");
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseDefineFont = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var endOffset = bitio.byte_offset + length;
    var i = 0;
    var len = 0;
    var obj = {} as any;
    obj.tagType = tagType;
    obj.FontId = bitio.getUI16();

    var numGlyphs = 0;
    if (tagType === 48 || tagType === 75) {
        var fontFlags = bitio.getUI8();
        obj.FontFlagsHasLayout = (fontFlags >>> 7) & 1;
        obj.FontFlagsShiftJIS = (fontFlags >>> 6) & 1;
        obj.FontFlagsSmallText = (fontFlags >>> 5) & 1;
        obj.FontFlagsANSI = (fontFlags >>> 4) & 1;
        obj.FontFlagsWideOffsets = (fontFlags >>> 3) & 1;
        obj.FontFlagsWideCodes = (fontFlags >>> 2) & 1;
        obj.FontFlagsItalic = (fontFlags >>> 1) & 1;
        obj.FontFlagsBold = (fontFlags) & 1;
        bitio.byteAlign();

        obj.LanguageCode = bitio.getUI8();
        obj.FontNameLen = bitio.getUI8();
        if (obj.FontNameLen) {
            var startOffset = bitio.byte_offset;
            var data = bitio.getData(obj.FontNameLen);
            var str = "";
            len = obj.FontNameLen;
            for (i = 0; i < len; i++) {
                if (data[i] > 127) {
                    continue;
                }
                str += String.fromCharCode(data[i]);
            }

            var fontName;
            if (obj.FontFlagsShiftJIS || obj.LanguageCode === 2) {
                fontName = bitio.decodeToShiftJis(str);
            } else {
                fontName = decodeURIComponent(str);
            }

            obj.FontName = _this.getFontName(fontName);
            bitio.byte_offset = startOffset + obj.FontNameLen;
        }

        numGlyphs = bitio.getUI16();
        obj.NumGlyphs = numGlyphs;
    }

    // offset
    var offset = bitio.byte_offset;
    if (tagType === 10) {
        numGlyphs = bitio.getUI16();
    }

    if (numGlyphs) {
        var OffsetTable = [];
        if (tagType === 10) {
            OffsetTable[0] = numGlyphs;
            numGlyphs /= 2;
            numGlyphs--;
        }

        if (obj.FontFlagsWideOffsets) {
            for (i = numGlyphs; i--;) {
                OffsetTable[OffsetTable.length] = bitio.getUI32();
            }
            if (tagType !== 10) {
                obj.CodeTableOffset = bitio.getUI32();
            }
        } else {
            for (i = numGlyphs; i--;) {
                OffsetTable[OffsetTable.length] = bitio.getUI16();
            }
            if (tagType !== 10) {
                obj.CodeTableOffset = bitio.getUI16();
            }
        }

        // Shape
        var GlyphShapeTable = [];
        if (tagType === 10) {
            numGlyphs++;
        }

        for (i = 0; i < numGlyphs; i++) {
            bitio.setOffset(OffsetTable[i] + offset, 0);

            var numBits = bitio.getUI8();
            var NumFillBits = numBits >> 4;
            var NumLineBits = numBits & 0x0f;

            var currentNumBits = {
                FillBits: NumFillBits,
                LineBits: NumLineBits
            };

            var shapes = {} as any;
            shapes.ShapeRecords = _this.shapeRecords(tagType, currentNumBits);
            shapes.lineStyles = {
                lineStyles: [{
                    Color: {R: 0, G: 0, B: 0, A: 1},
                    lineStyleType: 0
                }]
            };
            shapes.fillStyles = {
                fillStyles: [{
                    Color: {R: 0, G: 0, B: 0, A: 1},
                    fillStyleType: 0
                }]
            };

            GlyphShapeTable[GlyphShapeTable.length] = shapes;
        }
        obj.GlyphShapeTable = GlyphShapeTable;

        if (tagType === 48 || tagType === 75) {
            bitio.setOffset(obj.CodeTableOffset + offset, 0);
            var CodeTable = [];
            if (obj.FontFlagsWideCodes) {
                for (i = numGlyphs; i--;) {
                    CodeTable[CodeTable.length] = bitio.getUI16();
                }
            } else {
                for (i = numGlyphs; i--;) {
                    CodeTable[CodeTable.length] = bitio.getUI8();
                }
            }
            obj.CodeTable = CodeTable;

            if (obj.FontFlagsHasLayout) {
                obj.FontAscent = bitio.getUI16();
                obj.FontDescent = bitio.getUI16();
                obj.FontLeading = bitio.getUI16();

                var FontAdvanceTable = [];
                for (i = numGlyphs; i--;) {
                    FontAdvanceTable[FontAdvanceTable.length] = bitio.getUI16();
                }
                obj.FontAdvanceTable = FontAdvanceTable;

                var FontBoundsTable = [];
                for (i = numGlyphs; i--;) {
                    FontBoundsTable[FontBoundsTable.length] = _this.rect();
                }
                obj.FontBoundsTable = FontBoundsTable;

                if (tagType === 75) {
                    obj.KerningCount = bitio.getUI16();
                    obj.KerningRecord = [];
                    for (i = obj.KerningCount; i--;) {
                        var FontKerningCode1 = (obj.FontFlagsWideCodes) ? bitio.getUI16() : bitio.getUI8();
                        var FontKerningCode2 = (obj.FontFlagsWideCodes) ? bitio.getUI16() : bitio.getUI8();
                        var FontKerningAdjustment = bitio.getSIBits(16);
                        obj.KerningRecord[obj.KerningRecord.length] = {
                            FontKerningCode1: FontKerningCode1,
                            FontKerningCode2: FontKerningCode2,
                            FontKerningAdjustment: FontKerningAdjustment
                        };
                    }
                }
            }
        }
    }

    bitio.byte_offset = endOffset;
    stage.setCharacter(obj.FontId, obj);
    stage.fonts[obj.FontName] = obj;
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseDefineFontInfo = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var endOffset = bitio.byte_offset + length;

    var obj = {} as any;
    obj.tagType = tagType;
    obj.FontId = bitio.getUI16();
    var len = bitio.getUI8();
    var data = bitio.getData(len);
    var str = "";
    for (var i = 0; i < len; i++) {
        if (data[i] > 127) {
            continue;
        }
        str += String.fromCharCode(data[i]);
    }

    obj.FontFlagsReserved = bitio.getUIBits(2);
    obj.FontFlagsSmallText = bitio.getUIBits(1);
    obj.FontFlagsShiftJIS = bitio.getUIBits(1);
    obj.FontFlagsANSI = bitio.getUIBits(1);
    obj.FontFlagsItalic = bitio.getUIBits(1);
    obj.FontFlagsBold = bitio.getUIBits(1);
    obj.FontFlagsWideCodes = bitio.getUIBits(1);
    if (tagType === 62) {
        obj.LanguageCode = bitio.getUI8();
    }

    var fontName;
    if (obj.FontFlagsShiftJIS || obj.LanguageCode === 2) {
        fontName = bitio.decodeToShiftJis(str);
    } else {
        fontName = decodeURIComponent(str);
    }
    obj.FontName = _this.getFontName(fontName);

    var CodeTable = [];
    bitio.byteAlign();
    var tLen = endOffset - bitio.byte_offset;
    if (obj.FontFlagsWideCodes || tagType === 62) {
        while (tLen) {
            CodeTable[CodeTable.length] = bitio.getUI16();
            tLen -= 2;
        }
    } else {
        while (tLen) {
            CodeTable[CodeTable.length] = bitio.getUI8();
            tLen--;
        }
    }
    obj.CodeTable = CodeTable;
};

/**
 * @param fontName
 * @returns {string}
 */
SwfTag.prototype.getFontName = function (fontName)
{
    var length = fontName.length;
    var str = fontName.substr(length - 1);
    if (str.charCodeAt(0) === 0) {
        fontName = fontName.slice(0, -1);
    }

    switch (fontName) {
        case "_sans":
            return "sans-serif";
        case "_serif":
            return "serif";
        case "_typewriter":
            return "monospace";
        default:
            var ander = fontName.substr(0, 1);
            if (ander === "_") {
                return "sans-serif";
            }
            return fontName;
    }
};

/**
 * parseDefineFontName
 */
SwfTag.prototype.parseDefineFontName = function ()
{
    var bitio = this.bitio;
    bitio.getUI16(); // FontId
    bitio.getDataUntil("\0"); // FontName
    bitio.getDataUntil("\0"); // FontCopyright
};

/**
 * @param tagType
 */
SwfTag.prototype.parseDefineText = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var obj = {} as any;
    var characterId = bitio.getUI16();
    obj.tagType = tagType;
    obj.bounds = _this.rect();
    obj.matrix = _this.matrix();
    var GlyphBits = bitio.getUI8();
    var AdvanceBits = bitio.getUI8();
    obj.textRecords = _this.getTextRecords(tagType, GlyphBits, AdvanceBits);
    stage.setCharacter(characterId, obj);
};

/**
 * @param tagType
 * @param GlyphBits
 * @param AdvanceBits
 * @returns {Array}
 */
SwfTag.prototype.getTextRecords = function (tagType, GlyphBits, AdvanceBits)
{
    var _this = this;
    var bitio = _this.bitio;
    var array = [];
    while (bitio.getUI8() !== 0) {
        bitio.incrementOffset(-1, 0);

        var obj = {} as any;
        obj.TextRecordType = bitio.getUIBits(1);
        obj.StyleFlagsReserved = bitio.getUIBits(3);
        obj.StyleFlagsHasFont = bitio.getUIBits(1);
        obj.StyleFlagsHasColor = bitio.getUIBits(1);
        obj.StyleFlagsHasYOffset = bitio.getUIBits(1);
        obj.StyleFlagsHasXOffset = bitio.getUIBits(1);
        if (obj.StyleFlagsHasFont) {
            obj.FontId = bitio.getUI16();
        }

        if (obj.StyleFlagsHasColor) {
            if (tagType === 11) {
                obj.TextColor = _this.rgb();
            } else {
                obj.TextColor = _this.rgba();
            }
        }

        if (obj.StyleFlagsHasXOffset) {
            obj.XOffset = bitio.getUI16();
        }

        if (obj.StyleFlagsHasYOffset) {
            obj.YOffset = bitio.getUI16();
        }

        if (obj.StyleFlagsHasFont) {
            obj.TextHeight = bitio.getUI16();
        }

        obj.GlyphCount = bitio.getUI8();
        obj.GlyphEntries = _this.getGlyphEntries(
            obj.GlyphCount, GlyphBits, AdvanceBits
        );

        array[array.length] = obj;
    }

    return array;
};

/**
 * @param count
 * @param GlyphBits
 * @param AdvanceBits
 * @returns {Array}
 */
SwfTag.prototype.getGlyphEntries = function (count, GlyphBits, AdvanceBits)
{
    var bitio = this.bitio;
    var array = [];
    for (var i = count; i--;) {
        array[array.length] = {
            GlyphIndex: bitio.getUIBits(GlyphBits),
            GlyphAdvance: bitio.getSIBits(AdvanceBits)
        };
    }
    return array;
};

/**
 * @param tagType
 */
SwfTag.prototype.parseDefineEditText = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var obj = {} as any;
    var isJis = false;

    obj.CharacterId = bitio.getUI16();
    var bounds = _this.rect();

    var flag1 = bitio.getUI8();
    obj.HasText = (flag1 >>> 7) & 1;
    obj.WordWrap = (flag1 >>> 6) & 1;
    obj.Multiline = (flag1 >>> 5) & 1;
    obj.Password = (flag1 >>> 4) & 1;
    obj.ReadOnly = (flag1 >>> 3) & 1;
    obj.HasTextColor = (flag1 >>> 2) & 1;
    obj.HasMaxLength = (flag1 >>> 1) & 1;
    obj.HasFont = flag1 & 1;

    var flag2 = bitio.getUI8();
    obj.HasFontClass = (flag2 >>> 7) & 1;
    obj.AutoSize = (flag2 >>> 6) & 1;
    obj.HasLayout = (flag2 >>> 5) & 1;
    obj.NoSelect = (flag2 >>> 4) & 1;
    obj.Border = (flag2 >>> 3) & 1;
    obj.WasStatic = (flag2 >>> 2) & 1;
    obj.HTML = (flag2 >>> 1) & 1;
    obj.UseOutlines = flag2 & 1;

    if (obj.HasFont) {
        obj.FontID = bitio.getUI16();
        var fontData = stage.getCharacter(obj.FontID);
        isJis = (fontData.FontFlagsShiftJIS) ? true : false;
        if (obj.HasFontClass) {
            obj.FontClass = bitio.getDataUntil("\0");
        }
        obj.FontHeight = bitio.getUI16();
    }

    if (obj.HasTextColor) {
        obj.TextColor = _this.rgba();
    }

    if (obj.HasMaxLength) {
        obj.MaxLength = bitio.getUI16();
    }

    if (obj.HasLayout) {
        obj.Align = bitio.getUI8();
        obj.LeftMargin = bitio.getUI16();
        obj.RightMargin = bitio.getUI16();
        obj.Indent = bitio.getUI16();
        obj.Leading = bitio.getUI16();
    }

    var VariableName = bitio.getDataUntil("\0", isJis) + "";
    obj.VariableName = (VariableName === "") ? null : VariableName;
    obj.InitialText = "";
    if (obj.HasText) {
        var text = bitio.getDataUntil("\0", isJis);
        if (obj.HTML) {
            if (text.indexOf("<sbr />") !== -1) {
                text = text.replace(new RegExp("<sbr />", "gi"), "\n");
            }
            if (text.indexOf("<b>") !== -1) {
                text = text.replace(new RegExp("<b>", "gi"), "");
                text = text.replace(new RegExp("</b>", "gi"), "");
            }

            var span = document.createElement("span");
            span.innerHTML = text;

            var tags = span.getElementsByTagName("p");
            var length = tags.length;
            var tagData = [];
            for (var i = 0; i < length; i++) {
                tagData[i] = tags[i];
            }
            obj.InitialText = tagData;
        } else {
            obj.InitialText = text;
        }
    }

    stage.setCharacter(obj.CharacterId, {
        data: obj,
        bounds: bounds,
        tagType: tagType
    });
};

/**
 * @param tagType
 */
SwfTag.prototype.parseDefineMorphShape = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var obj = {} as any;
    obj.tagType = tagType;
    obj.CharacterId = bitio.getUI16();

    obj.StartBounds = _this.rect();
    obj.EndBounds = _this.rect();

    if (tagType === 84) {
        obj.StartEdgeBounds = _this.rect();
        obj.EndEdgeBounds = _this.rect();
        bitio.getUIBits(6); // Reserved
        obj.UsesNonScalingStrokes = bitio.getUIBits(1);
        obj.UsesScalingStrokes = bitio.getUIBits(1);
    }

    var offset = bitio.getUI32();
    var endOffset = bitio.byte_offset + offset;

    obj.MorphFillStyles = _this.fillStyleArray(tagType);
    obj.MorphLineStyles = _this.lineStyleArray(tagType);

    obj.StartEdges = _this.shapeWithStyle(tagType);
    if (bitio.byte_offset !== endOffset) {
        bitio.byte_offset = endOffset;
    }

    obj.EndEdges = _this.shapeWithStyle(tagType);

    // fill1 control
    var startPosition = {x: 0, y: 0};
    var endPosition = {x: 0, y: 0};
    var StartRecords = obj.StartEdges.ShapeRecords;
    var EndRecords = obj.EndEdges.ShapeRecords;
    var StartRecordLength = StartRecords.length;
    var EndRecordLength = EndRecords.length;
    var length = Math.max(StartRecordLength, EndRecordLength);
    for (var i = 0; i < length; i++) {
        var addRecode = {} as any;
        var StartRecord = StartRecords[i];
        var EndRecord = EndRecords[i];
        if (!StartRecord && !EndRecord) {
            continue;
        }

        if (!StartRecord.isChange && !EndRecord.isChange) {
            if (StartRecord.isCurved) {
                startPosition.x += StartRecord.ControlX + StartRecord.AnchorX;
                startPosition.y += StartRecord.ControlY + StartRecord.AnchorY;
            } else {
                startPosition.x += StartRecord.AnchorX;
                startPosition.y += StartRecord.AnchorY;
            }

            if (EndRecord.isCurved) {
                endPosition.x += EndRecord.ControlX + EndRecord.AnchorX;
                endPosition.y += EndRecord.ControlY + EndRecord.AnchorY;
            } else {
                endPosition.x += EndRecord.AnchorX;
                endPosition.y += EndRecord.AnchorY;
            }
            continue;
        }

        if (StartRecord.isChange && !EndRecord.isChange) {
            addRecode = {
                FillStyle0: StartRecord.FillStyle0,
                FillStyle1: StartRecord.FillStyle1,
                LineStyle: StartRecord.LineStyle,
                StateFillStyle0: StartRecord.StateFillStyle0,
                StateFillStyle1: StartRecord.StateFillStyle1,
                StateLineStyle: StartRecord.StateLineStyle,
                StateMoveTo: StartRecord.StateMoveTo,
                StateNewStyles: StartRecord.StateNewStyles,
                isChange: true
            };

            if (StartRecord.StateMoveTo) {
                addRecode.MoveX = endPosition.x;
                addRecode.MoveY = endPosition.y;
                startPosition.x = StartRecord.MoveX;
                startPosition.y = StartRecord.MoveY;
            }

            EndRecords.splice(i, 0, addRecode);
        } else if (!StartRecord.isChange && EndRecord.isChange) {
            addRecode = {
                FillStyle0: EndRecord.FillStyle0,
                FillStyle1: EndRecord.FillStyle1,
                LineStyle: EndRecord.LineStyle,
                StateFillStyle0: EndRecord.StateFillStyle0,
                StateFillStyle1: EndRecord.StateFillStyle1,
                StateLineStyle: EndRecord.StateLineStyle,
                StateMoveTo: EndRecord.StateMoveTo,
                StateNewStyles: EndRecord.StateNewStyles,
                isChange: true
            };

            if (EndRecord.StateMoveTo) {
                addRecode.MoveX = startPosition.x;
                addRecode.MoveY = startPosition.y;
                endPosition.x = EndRecord.MoveX;
                endPosition.y = EndRecord.MoveY;
            }

            StartRecords.splice(i, 0, addRecode);
        } else {
            if (StartRecord.StateMoveTo) {
                startPosition.x = StartRecord.MoveX;
                startPosition.y = StartRecord.MoveY;
            }

            if (EndRecord.StateMoveTo) {
                endPosition.x = EndRecord.MoveX;
                endPosition.y = EndRecord.MoveY;
            }
        }
    }

    var FillType = 0;
    var FillStyle = 0;
    length = obj.StartEdges.ShapeRecords.length;
    for (i = 0; i < length; i++) {
        var record = StartRecords[i];
        if (!record.isChange) {
            continue;
        }
        if (record.StateFillStyle0) {
            FillStyle = record.FillStyle0;
        }

        if (FillStyle) {
            record.StateFillStyle0 = 1;
            record.StateFillStyle1 = 1;
            if (FillType) {
                record.FillStyle0 = 0;
                record.FillStyle1 = FillStyle;
            } else {
                record.FillStyle0 = FillStyle;
                record.FillStyle1 = 0;
            }
        } else {
            record.StateFillStyle1 = 1;
            record.FillStyle1 = 0;
        }

        FillType = (FillType) ? 0 : 1;
    }

    stage.setCharacter(obj.CharacterId, obj);
};

/**
 * @param char
 * @param ratio
 * @returns {{data: Array, bounds: {xMax: number, xMin: number, yMax: number, yMin: number}}}
 */
SwfTag.prototype.buildMorphShape = function (char, ratio)
{
    var per = (ratio === undefined) ? 0 : ratio / 65535;
    var startPer = 1 - per;
    var newShapeRecords = [];

    var morphLineStyles = char.MorphLineStyles;
    var lineStyles = morphLineStyles.lineStyles;
    var lineStyleCount = morphLineStyles.lineStyleCount;

    var morphFillStyles = char.MorphFillStyles;
    var fillStyles = morphFillStyles.fillStyles;
    var fillStyleCount = morphFillStyles.fillStyleCount;

    var StartEdges = char.StartEdges;
    var StartShapeRecords = StartEdges.ShapeRecords;

    var EndEdges = char.EndEdges;
    var EndShapeRecords = EndEdges.ShapeRecords;

    var shapes = {
        lineStyles: {
            lineStyleCount: lineStyleCount,
            lineStyles: []
        },
        fillStyles: {
            fillStyleCount: fillStyleCount,
            fillStyles: []
        },
        ShapeRecords: []
    };

    var position = {x: 0, y: 0};
    var len = StartShapeRecords.length;
    for (var i = 0; i < len; i++) {
        var StartRecord = StartShapeRecords[i];
        if (!StartRecord) {
            continue;
        }

        var newRecord = {};
        var EndRecord = EndShapeRecords[i];
        if (StartRecord.isChange) {
            var MoveX = 0;
            var MoveY = 0;

            if (StartRecord.StateMoveTo === 1) {
                MoveX = StartRecord.MoveX * startPer + EndRecord.MoveX * per;
                MoveY = StartRecord.MoveY * startPer + EndRecord.MoveY * per;
                position.x = MoveX;
                position.y = MoveY;
            }

            newRecord = {
                FillStyle0: StartRecord.FillStyle0,
                FillStyle1: StartRecord.FillStyle1,
                LineStyle: StartRecord.LineStyle,
                MoveX: MoveX,
                MoveY: MoveY,
                StateFillStyle0: StartRecord.StateFillStyle0,
                StateFillStyle1: StartRecord.StateFillStyle1,
                StateLineStyle: StartRecord.StateLineStyle,
                StateMoveTo: StartRecord.StateMoveTo,
                StateNewStyles: StartRecord.StateNewStyles,
                isChange: true
            };
        } else {
            var AnchorX = 0;
            var AnchorY = 0;
            var ControlX = 0;
            var ControlY = 0;

            var startAnchorX = StartRecord.AnchorX;
            var startAnchorY = StartRecord.AnchorY;
            var endAnchorX = EndRecord.AnchorX;
            var endAnchorY = EndRecord.AnchorY;

            var startControlX = StartRecord.ControlX;
            var startControlY = StartRecord.ControlY;
            var endControlX = EndRecord.ControlX;
            var endControlY = EndRecord.ControlY;

            if (per > 0 && per < 1 && StartRecord.isCurved !== EndRecord.isCurved) {
                if (!StartRecord.isCurved) {
                    startAnchorX = StartRecord.AnchorX / 2;
                    startAnchorY = StartRecord.AnchorY / 2;
                    startControlX = startAnchorX;
                    startControlY = startAnchorY;
                }
                if (!EndRecord.isCurved) {
                    endAnchorX = EndRecord.AnchorX / 2;
                    endAnchorY = EndRecord.AnchorY / 2;
                    endControlX = endAnchorX;
                    endControlY = endAnchorY;
                }
            }

            ControlX = startControlX * startPer + endControlX * per + position.x;
            ControlY = startControlY * startPer + endControlY * per + position.y;
            AnchorX = startAnchorX * startPer + endAnchorX * per + ControlX;
            AnchorY = startAnchorY * startPer + endAnchorY * per + ControlY;

            position.x = AnchorX;
            position.y = AnchorY;

            newRecord = {
                AnchorX: AnchorX,
                AnchorY: AnchorY,
                ControlX: ControlX,
                ControlY: ControlY,
                isChange: false,
                isCurved: (StartRecord.isCurved || EndRecord.isCurved)
            };
        }

        newShapeRecords[i] = newRecord;
    }
    newShapeRecords[newShapeRecords.length] = 0;
    shapes.ShapeRecords = newShapeRecords;

    var EndColor;
    var StartColor;
    var color;
    for (i = 0; i < lineStyleCount; i++) {
        var lineStyle = lineStyles[i];
        EndColor = lineStyle.EndColor;
        StartColor = lineStyle.StartColor;
        color = {
            R: Math.floor(StartColor.R * startPer + EndColor.R * per),
            G: Math.floor(StartColor.G * startPer + EndColor.G * per),
            B: Math.floor(StartColor.B * startPer + EndColor.B * per),
            A: StartColor.A * startPer + EndColor.A * per
        };

        var EndWidth = lineStyles[i].EndWidth;
        var StartWidth = lineStyles[i].StartWidth;
        shapes.lineStyles.lineStyles[i] = {
            Width: Math.floor(StartWidth * startPer + EndWidth * per),
            Color: color,
            fillStyleType: 0
        };
    }

    for (i = 0; i < fillStyleCount; i++) {
        var fillStyle = fillStyles[i];
        var fillStyleType = fillStyle.fillStyleType;

        if (fillStyleType === 0x00) {
            EndColor = fillStyle.EndColor;
            StartColor = fillStyle.StartColor;
            color = {
                R: Math.floor(StartColor.R * startPer + EndColor.R * per),
                G: Math.floor(StartColor.G * startPer + EndColor.G * per),
                B: Math.floor(StartColor.B * startPer + EndColor.B * per),
                A: StartColor.A * startPer + EndColor.A * per
            };

            shapes.fillStyles.fillStyles[i] = {
                Color: color,
                fillStyleType: fillStyleType
            };
        } else {
            var EndGradientMatrix = fillStyle.endGradientMatrix;
            var StartGradientMatrix = fillStyle.startGradientMatrix;
            var matrix = [
                StartGradientMatrix[0] * startPer + EndGradientMatrix[0] * per,
                StartGradientMatrix[1] * startPer + EndGradientMatrix[1] * per,
                StartGradientMatrix[2] * startPer + EndGradientMatrix[2] * per,
                StartGradientMatrix[3] * startPer + EndGradientMatrix[3] * per,
                StartGradientMatrix[4] * startPer + EndGradientMatrix[4] * per,
                StartGradientMatrix[5] * startPer + EndGradientMatrix[5] * per
            ];

            var gRecords = [];
            var gradient = fillStyle.gradient;
            var GradientRecords = gradient.GradientRecords;
            var gLen = GradientRecords.length;
            for (var gIdx = 0; gIdx < gLen; gIdx++) {
                var gRecord = GradientRecords[gIdx];
                EndColor = gRecord.EndColor;
                StartColor = gRecord.StartColor;
                color = {
                    R: Math.floor(StartColor.R * startPer + EndColor.R * per),
                    G: Math.floor(StartColor.G * startPer + EndColor.G * per),
                    B: Math.floor(StartColor.B * startPer + EndColor.B * per),
                    A: StartColor.A * startPer + EndColor.A * per
                };

                gRecords[gIdx] = {
                    Color: color,
                    Ratio: gRecord.StartRatio * startPer + gRecord.EndRatio * per
                };
            }

            shapes.fillStyles.fillStyles[i] = {
                gradient: {GradientRecords: gRecords},
                gradientMatrix: matrix,
                fillStyleType: fillStyleType
            };
        }
    }

    var EndBounds = char.EndBounds;
    var StartBounds = char.StartBounds;
    var xMax = StartBounds.xMax * startPer + EndBounds.xMax * per;
    var xMin = StartBounds.xMin * startPer + EndBounds.xMin * per;
    var yMax = StartBounds.yMax * startPer + EndBounds.yMax * per;
    var yMin = StartBounds.yMin * startPer + EndBounds.yMin * per;

    return {
        data: vtc.convert(shapes, true),
        bounds: new Bounds(xMin, yMin, xMax, yMax)
    };
};

/**
 * @returns {{}}
 */
SwfTag.prototype.parseFrameLabel = function ()
{
    return {
        name: this.bitio.getDataUntil("\0"),
        frame: 0
    };
};

/**
 * @param tagType
 * @returns {*}
 */
SwfTag.prototype.parseRemoveObject = function (tagType)
{
    var bitio = this.bitio;
    if (tagType === 5) {
        console.log("RemoveObject");
        return {
            CharacterId: bitio.getUI16(),
            Depth: bitio.getUI16()
        };
    }
    return {Depth: bitio.getUI16()};
};

/**
 * @param tagType
 * @param length
 * @returns {{}}
 */
SwfTag.prototype.parseDefineButton = function (tagType, length)
{
    var obj = {} as any;
    obj.tagType = tagType;

    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var endOffset = bitio.byte_offset + length;
    obj.ButtonId = bitio.getUI16();

    var ActionOffset = 0;
    if (tagType !== 7) {
        obj.ReservedFlags = bitio.getUIBits(7);
        obj.TrackAsMenu = bitio.getUIBits(1);
        ActionOffset = bitio.getUI16();
    }

    obj.characters = _this.buttonCharacters();

    // actionScript
    if (tagType === 7) {
        obj.actions = _this.parseDoAction(endOffset - bitio.byte_offset);
    } else if (ActionOffset > 0) {
        obj.actions = _this.buttonActions(endOffset);
    }

    // set layer
    stage.setCharacter(obj.ButtonId, obj);
    if (bitio.byte_offset !== endOffset) {
        bitio.byte_offset = endOffset;
    }

    return obj;
};

/**
 * @returns {Array}
 */
SwfTag.prototype.buttonCharacters = function ()
{
    var characters = [];
    var _this = this;
    var bitio = _this.bitio;
    while (bitio.getUI8() !== 0) {
        bitio.incrementOffset(-1, 0);
        var record = _this.buttonRecord();
        var depth = record.Depth;
        if (!(record.Depth in characters)) {
            characters[depth] = [];
        }
        characters[depth].push(record);
    }
    return characters;
};

/**
 * @returns {{}}
 */
SwfTag.prototype.buttonRecord = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;

    bitio.getUIBits(2); // Reserved
    obj.PlaceFlagHasBlendMode = bitio.getUIBits(1);
    obj.PlaceFlagHasFilterList = bitio.getUIBits(1);
    obj.ButtonStateHitTest = bitio.getUIBits(1);
    obj.ButtonStateDown = bitio.getUIBits(1);
    obj.ButtonStateOver = bitio.getUIBits(1);
    obj.ButtonStateUp = bitio.getUIBits(1);
    obj.CharacterId = bitio.getUI16();
    obj.Depth = bitio.getUI16();
    obj.PlaceFlagHasMatrix = 1;
    obj.Matrix = _this.matrix();
    obj.ColorTransform = _this.colorTransform();
    obj.PlaceFlagHasColorTransform = (obj.ColorTransform === undefined) ? 0 : 1;
    if (obj.PlaceFlagHasBlendMode) {
        obj.BlendMode = bitio.getUI8();
    }
    if (obj.PlaceFlagHasFilterList) {
        obj.SurfaceFilterList = _this.getFilterList();
    }
    obj.PlaceFlagHasRatio = 0;
    obj.PlaceFlagHasClipDepth = 0;
    obj.Sound = null;
    return obj;
};

/**
 * @param endOffset
 * @returns {Array}
 */
SwfTag.prototype.buttonActions = function (endOffset)
{
    var _this = this;
    var bitio = _this.bitio;
    var results = [];

    while (true) {
        var obj = {} as any;
        var startOffset = bitio.byte_offset;
        var CondActionSize = bitio.getUI16();
        obj.CondIdleToOverDown = bitio.getUIBits(1);
        obj.CondOutDownToIdle = bitio.getUIBits(1);
        obj.CondOutDownToOverDown = bitio.getUIBits(1);
        obj.CondOverDownToOutDown = bitio.getUIBits(1);
        obj.CondOverDownToOverUp = bitio.getUIBits(1);
        obj.CondOverUpToOverDown = bitio.getUIBits(1);
        obj.CondOverUpToIdle = bitio.getUIBits(1);
        obj.CondIdleToOverUp = bitio.getUIBits(1);
        obj.CondKeyPress = bitio.getUIBits(7);
        obj.CondOverDownToIdle = bitio.getUIBits(1);

        // ActionScript
        var length = endOffset - bitio.byte_offset + 1;
        obj.ActionScript = _this.parseDoAction(length);
        results[results.length] = obj;

        if (!CondActionSize) {
            break;
        }
        bitio.byte_offset = startOffset + CondActionSize;
    }

    return results;
};

/**
 * @param tagType
 * @param length
 * @returns {{}}
 */
SwfTag.prototype.parsePlaceObject = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var obj = {} as any;
    obj.tagType = tagType;
    var startOffset = bitio.byte_offset;

    if (tagType === 4) {
        obj.CharacterId = bitio.getUI16();
        obj.Depth = bitio.getUI16();
        obj.Matrix = _this.matrix();
        obj.PlaceFlagHasMatrix = 1;

        bitio.byteAlign();
        if ((bitio.byte_offset - startOffset) < length) {
            obj.ColorTransform = _this.colorTransform();
            obj.PlaceFlagHasColorTransform = 1;
        }
    } else {
        obj.PlaceFlagHasClipActions = bitio.getUIBits(1);
        if (stage.getVersion() < 5) {
            obj.PlaceFlagHasClipActions = 0;
        }
        obj.PlaceFlagHasClipDepth = bitio.getUIBits(1);
        obj.PlaceFlagHasName = bitio.getUIBits(1);
        obj.PlaceFlagHasRatio = bitio.getUIBits(1);
        obj.PlaceFlagHasColorTransform = bitio.getUIBits(1);
        obj.PlaceFlagHasMatrix = bitio.getUIBits(1);
        obj.PlaceFlagHasCharacter = bitio.getUIBits(1);
        obj.PlaceFlagMove = bitio.getUIBits(1);

        // PlaceObject3
        if (tagType === 70) {
            bitio.getUIBits(1); // Reserved
            obj.PlaceFlagOpaqueBackground = bitio.getUIBits(1);
            obj.PlaceFlagHasVisible = bitio.getUIBits(1);
            obj.PlaceFlagHasImage = bitio.getUIBits(1);
            obj.PlaceFlagHasClassName = bitio.getUIBits(1);
            obj.PlaceFlagHasCacheAsBitmap = bitio.getUIBits(1);
            obj.PlaceFlagHasBlendMode = bitio.getUIBits(1);
            obj.PlaceFlagHasFilterList = bitio.getUIBits(1);
        }

        obj.Depth = bitio.getUI16();

        if (obj.PlaceFlagHasClassName ||
            (obj.PlaceFlagHasImage && obj.PlaceFlagHasCharacter)
        ) {
            obj.ClassName = bitio.getDataUntil("\0");
        }
        if (obj.PlaceFlagHasCharacter) {
            obj.CharacterId = bitio.getUI16();
        }
        if (obj.PlaceFlagHasMatrix) {
            obj.Matrix = _this.matrix();
        }
        if (obj.PlaceFlagHasColorTransform) {
            obj.ColorTransform = _this.colorTransform();
        }
        if (obj.PlaceFlagHasRatio) {
            obj.Ratio = bitio.getUI16();
        }
        if (obj.PlaceFlagHasName) {
            obj.Name = bitio.getDataUntil("\0");
        }
        if (obj.PlaceFlagHasClipDepth) {
            obj.ClipDepth = bitio.getUI16();
        }

        if (tagType === 70) {
            if (obj.PlaceFlagHasFilterList) {
                obj.SurfaceFilterList = _this.getFilterList();
            }
            if (obj.PlaceFlagHasBlendMode) {
                obj.BlendMode = bitio.getUI8();
            }
            if (obj.PlaceFlagHasCacheAsBitmap) {
                obj.BitmapCache = bitio.getUI8();
            }
            if (obj.PlaceFlagHasVisible) {
                obj.Visible = bitio.getUI8();
                obj.BackgroundColor = _this.rgba();
            }
        }

        if (obj.PlaceFlagHasClipActions) {
            bitio.getUI16(); // Reserved
            obj.AllEventFlags = _this.parseClipEventFlags();

            var endLength = startOffset + length;
            var actionRecords = [];
            while (bitio.byte_offset < endLength) {
                var clipActionRecord = _this.parseClipActionRecord(endLength);
                actionRecords[actionRecords.length] = clipActionRecord;
                if (endLength <= bitio.byte_offset) {
                    break;
                }
                var endFlag = (stage.getVersion() <= 5) ? bitio.getUI16() : bitio.getUI32();
                if (!endFlag) {
                    break;
                }
                if (stage.getVersion() <= 5) {
                    bitio.byte_offset -= 2;
                } else {
                    bitio.byte_offset -= 4;
                }

                if (clipActionRecord.KeyCode) {
                    bitio.byte_offset -= 1;
                }
            }
            obj.ClipActionRecords = actionRecords;
        }
    }

    bitio.byteAlign();
    bitio.byte_offset = startOffset + length;

    return obj;
};

/**
 * @returns {{}}
 */
SwfTag.prototype.parseClipActionRecord = function (endLength)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    var EventFlags = _this.parseClipEventFlags();
    if (endLength > bitio.byte_offset) {
        var ActionRecordSize = bitio.getUI32();
        if (EventFlags.keyPress) {
            obj.KeyCode = bitio.getUI8();
        }
        obj.EventFlags = EventFlags;
        obj.Actions = _this.parseDoAction(ActionRecordSize);
    }
    return obj;
};

/**
 * @returns {{}}
 */
SwfTag.prototype.parseClipEventFlags = function ()
{
    var _this = this;
    var obj = {} as any;
    var bitio = _this.bitio;
    var stage = _this.stage;

    obj.keyUp = bitio.getUIBits(1);
    obj.keyDown = bitio.getUIBits(1);
    obj.mouseUp = bitio.getUIBits(1);
    obj.mouseDown = bitio.getUIBits(1);
    obj.mouseMove = bitio.getUIBits(1);
    obj.unload = bitio.getUIBits(1);
    obj.enterFrame = bitio.getUIBits(1);
    obj.load = bitio.getUIBits(1);

    if (stage.getVersion() >= 6) {
        obj.dragOver = bitio.getUIBits(1);
        obj.rollOut = bitio.getUIBits(1);
        obj.rollOver = bitio.getUIBits(1);
        obj.releaseOutside = bitio.getUIBits(1);
        obj.release = bitio.getUIBits(1);
        obj.press = bitio.getUIBits(1);
        obj.initialize = bitio.getUIBits(1);
    }

    obj.data = bitio.getUIBits(1);

    if (stage.getVersion() >= 6) {
        bitio.getUIBits(5); // Reserved
        obj.construct = bitio.getUIBits(1);
        obj.keyPress = bitio.getUIBits(1);
        obj.dragOut = bitio.getUIBits(1);
        bitio.getUIBits(8); // Reserved
    }

    bitio.byteAlign();

    return obj;
};

/**
 * @returns {Array}
 */
SwfTag.prototype.getFilterList = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var result = [];
    var _getFilter = _this.getFilter;
    var NumberOfFilters = bitio.getUI8();
    for (var i = 0; i < NumberOfFilters; i++) {
        var filter = _getFilter.call(_this);
        if (filter) {
            result[result.length] = filter;
        }
    }
    return (result.length) ? result : null;
};

/**
 * @return {{}}
 */
SwfTag.prototype.getFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var filterId = bitio.getUI8();
    var filter;
    switch (filterId) {
        case 0:
            filter = _this.dropShadowFilter();
            break;
        case 1:
            filter = _this.blurFilter();
            break;
        case 2:
            filter = _this.glowFilter();
            break;
        case 3:
            filter = _this.bevelFilter();
            break;
        case 4:
            filter = _this.gradientGlowFilter();
            break;
        case 5:
            filter = _this.convolutionFilter();
            break;
        case 6:
            filter = _this.colorMatrixFilter();
            break;
        case 7:
            filter = _this.gradientBevelFilter();
            break;
    }
    return filter;
};

/**
 * @returns {DropShadowFilter}
 */
SwfTag.prototype.dropShadowFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var rgba = _this.rgba();
    var alpha = rgba.A;
    var color = rgba.R << 16 | rgba.G << 8 | rgba.B;
    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var angle = bitio.getUI32() / 0x10000 * 180 / Math.PI;
    var distance = bitio.getUI32() / 0x10000;
    var strength = bitio.getFloat16() / 256;
    var inner = (bitio.getUIBits(1)) ? true : false;
    var knockout = (bitio.getUIBits(1)) ? true : false;
    var hideObject = (bitio.getUIBits(1)) ? false : true;
    var quality = bitio.getUIBits(5);

    if (!strength) {
        return null;
    }

    return new DropShadowFilter(
        distance, angle, color, alpha, blurX, blurY,
        strength, quality, inner, knockout, hideObject
    );
};

/**
 * @returns {BlurFilter}
 */
SwfTag.prototype.blurFilter = function ()
{
    var bitio = this.bitio;
    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var quality = bitio.getUIBits(5);
    bitio.getUIBits(3); // Reserved

    return new BlurFilter(blurX, blurY, quality);
};

/**
 * @returns {GlowFilter}
 */
SwfTag.prototype.glowFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var rgba = _this.rgba();
    var alpha = rgba.A;
    var color = rgba.R << 16 | rgba.G << 8 | rgba.B;
    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var strength = bitio.getFloat16() / 256;
    var inner = (bitio.getUIBits(1)) ? true : false;
    var knockout = (bitio.getUIBits(1)) ? true : false;
    bitio.getUIBits(1); // CompositeSource
    var quality = bitio.getUIBits(5);

    if (!strength) {
        return null;
    }

    return new GlowFilter(
        color, alpha, blurX, blurY,
        strength, quality, inner, knockout
    );
};

/**
 * @returns {BevelFilter}
 */
SwfTag.prototype.bevelFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var rgba;
    rgba = _this.rgba();
    var highlightAlpha = rgba.A;
    var highlightColor = rgba.R << 16 | rgba.G << 8 | rgba.B;

    rgba = _this.rgba();
    var shadowAlpha = rgba.A;
    var shadowColor = rgba.R << 16 | rgba.G << 8 | rgba.B;

    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var angle = bitio.getUI32() / 0x10000 * 180 / Math.PI;
    var distance = bitio.getUI32() / 0x10000;
    var strength = bitio.getFloat16() / 256;
    var inner = (bitio.getUIBits(1)) ? true : false;
    var knockout = (bitio.getUIBits(1)) ? true : false;
    bitio.getUIBits(1); // CompositeSource
    var OnTop = bitio.getUIBits(1);
    var quality = bitio.getUIBits(4);

    var type = "inner";
    if (!inner) {
        if (OnTop) {
            type = "full";
        } else {
            type = "outer";
        }
    }

    if (!strength) {
        return null;
    }

    return new BevelFilter(
        distance, angle, highlightColor, highlightAlpha,
        shadowColor, shadowAlpha, blurX, blurY,
        strength, quality, type, knockout
    );
};

/**
 * @returns {GradientGlowFilter}
 */
SwfTag.prototype.gradientGlowFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var i;
    var NumColors = bitio.getUI8();

    var colors = [];
    var alphas = [];
    for (i = 0; i < NumColors; i++) {
        var rgba = _this.rgba();
        alphas[alphas.length] = rgba.A;
        colors[colors.length] = rgba.R << 16 | rgba.G << 8 | rgba.B;
    }

    var ratios = [];
    for (i = 0; i < NumColors; i++) {
        ratios[ratios.length] = bitio.getUI8();
    }

    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var angle = bitio.getUI32() / 0x10000 * 180 / Math.PI;
    var distance = bitio.getUI32() / 0x10000;
    var strength = bitio.getFloat16() / 256;
    var inner = (bitio.getUIBits(1)) ? true : false;
    var knockout = (bitio.getUIBits(1)) ? true : false;
    bitio.getUIBits(1); // CompositeSource
    var OnTop = bitio.getUIBits(1);
    var quality = bitio.getUIBits(4);

    var type = "inner";
    if (!inner) {
        if (OnTop) {
            type = "full";
        } else {
            type = "outer";
        }
    }

    if (!strength) {
        return null;
    }

    return new GradientGlowFilter(
        distance, angle, colors, alphas, ratios,
        blurX, blurY, strength, quality, type, knockout
    );
};

/**
 * @returns {ConvolutionFilter}
 */
SwfTag.prototype.convolutionFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;

    obj.MatrixX = bitio.getUI8();
    obj.MatrixY = bitio.getUI8();
    obj.Divisor = bitio.getFloat16() | bitio.getFloat16();
    obj.Bias = bitio.getFloat16() | bitio.getFloat16();

    var count = obj.MatrixX * obj.MatrixY;
    var MatrixArr = [];
    while (count--) {
        MatrixArr[MatrixArr.length] = bitio.getUI32();
    }
    obj.DefaultColor = _this.rgba();
    bitio.getUIBits(6); // Reserved
    obj.Clamp = bitio.getUIBits(1);
    obj.PreserveAlpha = bitio.getUIBits(1);

    return new ConvolutionFilter(
    );
};

/**
 * @returns {GradientBevelFilter}
 */
SwfTag.prototype.gradientBevelFilter = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var NumColors = bitio.getUI8();

    var i;
    var colors = [];
    var alphas = [];
    for (i = 0; i < NumColors; i++) {
        var rgba = _this.rgba();
        alphas[alphas.length] = rgba.A;
        colors[colors.length] = rgba.R << 16 | rgba.G << 8 | rgba.B;
    }

    var ratios = [];
    for (i = 0; i < NumColors; i++) {
        ratios[ratios.length] = bitio.getUI8();
    }

    var blurX = bitio.getUI32() / 0x10000;
    var blurY = bitio.getUI32() / 0x10000;
    var angle = bitio.getUI32() / 0x10000 * 180 / Math.PI;
    var distance = bitio.getUI32() / 0x10000;
    var strength = bitio.getFloat16() / 256;

    var inner = (bitio.getUIBits(1)) ? true : false;
    var knockout = (bitio.getUIBits(1)) ? true : false;
    bitio.getUIBits(1); // CompositeSource
    var OnTop = bitio.getUIBits(1);
    var quality = bitio.getUIBits(4);

    var type = "inner";
    if (!inner) {
        if (OnTop) {
            type = "full";
        } else {
            type = "outer";
        }
    }

    if (!strength) {
        return null;
    }

    return new GradientBevelFilter(
        distance, angle, colors, alphas, ratios,
        blurX, blurY, strength, quality, type, knockout
    );
};

/**
 * @returns {ColorMatrixFilter}
 */
SwfTag.prototype.colorMatrixFilter = function ()
{
    var bitio = this.bitio;
    var MatrixArr = [];
    for (var i = 0; i < 20; i++) {
        MatrixArr[MatrixArr.length] = bitio.getUI32();
    }

    return new ColorMatrixFilter(
    );
};

/**
 * @returns {Array}
 */
SwfTag.prototype.colorTransform = function ()
{
    var bitio = this.bitio;
    bitio.byteAlign();

    var result = [1, 1, 1, 1, 0, 0, 0, 0];
    var first6bits = bitio.getUIBits(6);
    var HasAddTerms = first6bits >> 5;
    var HasMultiTerms = (first6bits >> 4) & 1;
    var nbits = first6bits & 0x0f;

    if (HasMultiTerms) {
        result[0] = bitio.getSIBits(nbits) / 256;
        result[1] = bitio.getSIBits(nbits) / 256;
        result[2] = bitio.getSIBits(nbits) / 256;
        result[3] = bitio.getSIBits(nbits) / 256;
    }

    if (HasAddTerms) {
        result[4] = bitio.getSIBits(nbits);
        result[5] = bitio.getSIBits(nbits);
        result[6] = bitio.getSIBits(nbits);
        result[7] = bitio.getSIBits(nbits);
    }

    return result;
};

/**
 * @param dataLength
 */
SwfTag.prototype.parseDefineSprite = function (dataLength)
{
    var _this = this;
    var bitio = _this.bitio;
    var characterId = bitio.getUI16();
    bitio.getUI16(); // FrameCount
    var stage = _this.stage;
    stage.setCharacter(characterId, _this.parseTags(dataLength, characterId));
};

/**
 * @param length
 * @returns {ActionScript}
 */
SwfTag.prototype.parseDoAction = function (length)
{
    var _this = this;
    var bitio = _this.bitio;
    var data = bitio.getData(length);
    return new ActionScript(data);
};

/**
 * @param length
 */
SwfTag.prototype.parseDoInitAction = function (length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var spriteId = bitio.getUI16();

    var as = new ActionScript(bitio.getData(length - 2), undefined, undefined, true);
    var mc = stage.getParent();
    mc.variables = {};
    var action = mc.createActionScript2(as);
    var packages = stage.packages;
    if (spriteId in packages) {
        mc.active = true;
        action.apply(mc);
        mc.active = false;
    }
    stage.initActions[spriteId] = action;
};

/**
 * @returns {{}}
 */
SwfTag.prototype.parseDefineSceneAndFrameLabelData = function ()
{
    var i;
    var bitio = this.bitio;
    var obj = {} as any;
    obj.SceneCount = bitio.getU30();
    obj.sceneInfo = [];
    for (i = 0; i < obj.SceneCount; i++) {
        obj.sceneInfo[i] = {
            offset: bitio.getU30(),
            name: decodeURIComponent(bitio.getDataUntil("\0"))
        };
    }

    obj.FrameLabelCount = bitio.getU30();
    obj.frameInfo = [];
    for (i = 0; i < obj.FrameLabelCount; i++) {
        obj.frameInfo[i] = {
            num: bitio.getU30(),
            label: decodeURIComponent(bitio.getDataUntil("\0"))
        };
    }
    return obj;
};

/**
 * @param tagType
 * @returns {{}}
 */
SwfTag.prototype.parseSoundStreamHead = function (tagType)
{
    var obj = {} as any;
    obj.tagType = tagType;
    var bitio = this.bitio;

    bitio.getUIBits(4); // Reserved

    // 0 = 5.5kHz, 1 = 11kHz, 2 = 22kHz, 3 = 44kHz
    obj.PlaybackSoundRate = bitio.getUIBits(2);

    // 0 = 8-bit, 1 = 16-bit
    obj.PlaybackSoundSize = bitio.getUIBits(1);

    // 0 = Mono, 1 = Stereo
    obj.PlaybackSoundType = bitio.getUIBits(1);

    // 0 = Uncompressed(native-endian)
    // 1 = ADPCM
    // 2 = MP3
    // 3 = Uncompressed(little-endian)
    // 4 = Nellymoser 16 kHz
    // 5 = Nellymoser 8 kHz
    // 6 = Nellymoser
    // 11 = Speex
    obj.StreamSoundCompression = bitio.getUIBits(4);

    // 0 = 5.5kHz, 1 = 11kHz, 2 = 22kHz, 3 = 44kHz
    obj.StreamSoundRate = bitio.getUIBits(2);

    // 0 = 8-bit, 1 = 16-bit
    obj.StreamSoundSize = bitio.getUIBits(1);

    // 0 = Mono, 1 = Stereo
    obj.StreamSoundType = bitio.getUIBits(1);

    obj.StreamSoundSampleCount = bitio.getUI16();

    if (obj.StreamSoundCompression === 2) {
        obj.LatencySeek = bitio.getSIBits(2);
    }

    return obj;
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseDoABC = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    stage.abcFlag = true;
    var startOffset = bitio.byte_offset;

    var obj = {} as any;
    obj.tagType = tagType;
    obj.Flags = bitio.getUI32();
    obj.Name = bitio.getDataUntil("\0");

    var offset = length - (bitio.byte_offset - startOffset);
    var ABCData = bitio.getData(offset);
    var ABCBitIO = new BitIO();
    ABCBitIO.setData(ABCData);

    // version
    obj.minorVersion = ABCBitIO.getUI16();
    obj.majorVersion = ABCBitIO.getUI16();

    // integer
    obj.integer = _this.ABCInteger(ABCBitIO);

    // uinteger
    obj.uinteger = _this.ABCUinteger(ABCBitIO);

    // double
    obj.double = _this.ABCDouble(ABCBitIO);

    // string_info
    obj.string = _this.ABCStringInfo(ABCBitIO);

    // namespace_info
    obj.namespace = _this.ABCNameSpaceInfo(ABCBitIO);

    // ns_set_info
    obj.nsSet = _this.ABCNsSetInfo(ABCBitIO);

    // multiname_info;
    obj.multiname_info = _this.ABCMultiNameInfo(ABCBitIO);

    // build names
    obj = _this.ABCMultinameToString(obj);

    var i = 0;

    // method_info
    obj.method = [];
    var methodCount = ABCBitIO.getU30();
    if (methodCount) {
        var method = [];
        for (i = 0; i < methodCount; i++) {
            method[i] = _this.ABCMethodInfo(ABCBitIO);
        }
        obj.method = method;
    }

    // metadata_info
    obj.metadata = [];
    var metadataCount = ABCBitIO.getU30();
    if (metadataCount) {
        var metadataInfo = [];
        for (i = 0; i < metadataCount; i++) {
            metadataInfo[i] = _this.ABCMetadataInfo(ABCBitIO);
        }
        obj.metadata = metadataInfo;
    }

    var classCount = ABCBitIO.getU30();
    obj.instance = [];
    obj.class = [];
    if (classCount) {
        // instance_info
        var instance = [];
        for (i = 0; i < classCount; i++) {
            instance[i] = _this.ABCInstanceInfo(ABCBitIO);
        }
        obj.instance = instance;

        // class_info
        var classInfo = [];
        for (i = 0; i < classCount; i++) {
            classInfo[i] = _this.ABCClassInfo(ABCBitIO);
        }
        obj.class = classInfo;
    }

    // script_info
    obj.script = [];
    var scriptCount = ABCBitIO.getU30();
    if (scriptCount) {
        var script = [];
        for (i = 0; i < scriptCount; i++) {
            script[i] = _this.ABCScriptInfo(ABCBitIO);
        }
        obj.script = script;
    }

    // method_body_info
    obj.methodBody = [];
    var methodBodyCount  = ABCBitIO.getU30();
    if (methodBodyCount) {
        var methodBody = [];
        for (i = 0; i < methodBodyCount; i++) {
            var mBody = _this.ABCMethodBodyInfo(ABCBitIO);
            methodBody[mBody.method] = mBody;
        }
        obj.methodBody = methodBody;
    }

    // build instance
    _this.ABCBuildInstance(obj);
};

/**
 * @param obj
 */
SwfTag.prototype.ABCBuildInstance = function (obj)
{
    var _this = this;
    var instances = obj.instance;
    var length = instances.length;
    var namespaces = obj.namespace;
    var string = obj.string;
    var stage = _this.stage;
    var names = obj.names;
    for (var i = 0; i < length; i++) {
        var instance = instances[i];
        var flag = instance.flags;

        var nsIndex = null;
        if (flag & 0x08) {
            nsIndex = instance.protectedNs;
        }

        var object = {} as any;
        if (nsIndex) {
            var nObj = namespaces[nsIndex];
            object = string[nObj.name];
        } else {
            object = names[instance.name];
        }

        var values = object.split(":");
        var className = values.pop();
        var ns = values.pop();

        // build parent
        var AVM2 = function (mc?) { this["__swf2js__::builder"] = mc; }; // any
        var prop = AVM2.prototype;

        // constructor
        prop[className] = _this.ABCCreateActionScript3(obj, instance.iinit, object);

        // prototype
        var traits = instance.trait;
        var tLength = traits.length;
        var register = [];
        var rCount = 1;
        if (tLength) {
            for (var idx = 0; idx < tLength; idx++) {
                var trait = traits[idx];
                var tName = names[trait.name];
                var tNames = tName.split("::");
                var pName =  tNames.pop();
                var kind = trait.kind;

                var val = undefined;
                switch (kind) {
                    case 0: // Slot
                        register[rCount++] = pName;
                        break;
                    case 1: // Method
                    case 2: // Getter
                    case 3: // Setter
                        val = _this.ABCCreateActionScript3(obj, trait.data.info, object);
                        break;
                    case 4: // Class
                        console.log("build: Class");
                        break;
                    case 5: // Function
                        console.log("build: Function");
                        break;
                    case 6: // Const
                        console.log("build: Const");
                        break;
                }
                prop[pName] = val;
            }
        }

        var localName = "__swf2js__:"+ object;
        prop[localName] = {};

        // extends
        var superName = instance.superName;
        prop[localName].extends = names[superName];

        // register
        prop[localName].register = register;

        // build
        var abc = stage.abc;
        var classObj = stage.avm2;
        if (ns) {
            var nss = ns.split(".");
            var nLen = nss.length;
            for (var nIdx = 0; nIdx < nLen; nIdx++) {
                if (!(nss[nIdx] in classObj)) {
                    classObj[nss[nIdx]] = {};
                    abc[nss[nIdx]] = {};
                }
                classObj = classObj[nss[nIdx]];
                abc = abc[nss[nIdx]];
            }
        }

        abc[className] = AVM2;
        classObj[className] = new AVM2();
    }
};

/**
 * @param obj
 * @param methodId
 * @param abcKey
 */
SwfTag.prototype.ABCCreateActionScript3 = function (obj, methodId, abcKey)
{
    var stage = this.stage;
    return (function (data, id, ns, stage)
    {
        return function ()
        {
            var as3 = new ActionScript3(data, id, ns, stage);
            as3.caller = this;
            as3.args = arguments;
            return as3.execute();
        };
    })(obj, methodId, abcKey, stage);
};

/**
 * @param obj
 * @returns {*}
 */
SwfTag.prototype.ABCMultinameToString = function (obj)
{
    var multinames = obj.multiname_info;
    var length = multinames.length;
    var string = obj.string;
    var ns = obj.namespace;
    var names = [];
    for (var i = 1; i < length; i++) {
        var info = multinames[i];
        var str = "";

        switch (info.kind) {
            case 0x07: // QName
            case 0x0D: // QNameA
                var namespace_info = ns[info.ns];
                switch (namespace_info.kind) {
                    default:
                        str += string[namespace_info.name];
                        break;
                    case 0x05:
                        str += "private";
                        break;
                }

                if (str !== "") {
                    str += "::";
                }

                str += string[info.name];
                break;
            case 0x0F: // RTQName
            case 0x10: // RTQNameA
                console.log("RTQName", i, info);
                break;
            case 0x09: // Multiname
            case 0x0E: // MultinameA
                str = string[info.name];
                break;
            case 0x1B: // MultinameL
            case 0x1C: // MultinameLA
                str = null;
                break;
            case 0x11: // RTQNameL
            case 0x12: // RTQNameLA
                console.log("RTQNameL", i, info);

                break;
        }
        names[i] = str;
    }
    obj.names = names;
    return obj;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCInteger = function (ABCBitIO)
{
    var array = [ 0 ];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            array[i] = ABCBitIO.getS30();
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCUinteger = function (ABCBitIO)
{
    var array = [ 0 ];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            array[i] = ABCBitIO.getU30();
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCDouble = function (ABCBitIO)
{
    var array = [ 0 ];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            array[i] = ABCBitIO.getFloat64LittleEndian();
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCStringInfo = function (ABCBitIO)
{
    var array = [];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            array[i] = ABCBitIO.abcReadString();
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCNameSpaceInfo = function (ABCBitIO)
{
    var array = [];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            var obj = {} as any;
            obj.kind = ABCBitIO.getUI8();
            switch (obj.kind) {
                default:
                    console.log("ERROR NS:" + obj.kind);
                    break;

                case 0x08: // CONSTANT_Namespace
                case 0x16: // CONSTANT_PackageNamespace
                case 0x17: // CONSTANT_PackageInternalNs
                case 0x18: // CONSTANT_ProtectedNamespace
                case 0x19: // CONSTANT_ExplicitNamespace
                case 0x1A: // CONSTANT_StaticProtectedNs
                case 0x05: // CONSTANT_PrivateNs
                    break;
            }
            obj.name = ABCBitIO.getU30();

            array[i] = obj;
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCNsSetInfo = function (ABCBitIO)
{
    var array = [];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            var nsCount = ABCBitIO.getU30();
            var ns = [];
            if (nsCount) {
                for (var j = 0; j < nsCount; j++) {
                    ns[j] = ABCBitIO.getU30();

                    if (ns[j] === 0)
                        console.log("ERROR ZERO NSSET");
                }
            }
            array[i] = ns;
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCMultiNameInfo = function (ABCBitIO)
{
    var array = [];
    var count = ABCBitIO.getU30();
    if (count) {
        for (var i = 1; i < count; i++) {
            var obj = {} as any;
            obj.kind = ABCBitIO.getUI8();
            switch (obj.kind) {
                default:
                    console.log("ERROR MULTINAME:", obj.kind, array);
                    break;

                case 0x07: // QName
                case 0x0D: // QNameA
                    obj.ns = ABCBitIO.getU30();
                    obj.name = ABCBitIO.getU30();
                    break;
                case 0x0F: // RTQName
                case 0x10: // RTQNameA
                    obj.name = ABCBitIO.getU30();
                    break;
                case 0x09: // Multiname
                case 0x0E: // MultinameA
                    obj.name = ABCBitIO.getU30();
                    obj.ns_set = ABCBitIO.getU30();
                    if (obj.ns_set === 0)
                        console.log("ERROR ZERO NS_SET");
                    break;
                case 0x1B: // MultinameL
                case 0x1C: // MultinameLA
                    obj.ns_set = ABCBitIO.getU30();
                    if (obj.ns_set === 0)
                        console.log("ERROR ZERO NS_SET");
                    break;
                case 0x11: // RTQNameL
                case 0x12: // RTQNameLA
                    break;
                case 0x1D: // Postfix
                    obj.param1 = ABCBitIO.getU30(); // multiname
                    obj.param2 = ABCBitIO.getU30(); // counter?
                    obj.param3 = ABCBitIO.getU30(); // multiname
                    break;
            }
            array[i] = obj;
        }
    }
    return array;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCMethodInfo = function (ABCBitIO)
{
    var obj = {} as any;
    var i;
    var count = ABCBitIO.getU30();
    obj.paramCount = count;
    obj.returnType = ABCBitIO.getU30();
    obj.paramType = [];
    if (count) {
        var paramType = [];
        for (i = 0; i < count; i++) {
            paramType[paramType.length] = ABCBitIO.getU30();
        }
        obj.paramType = paramType;
    }

    obj.name = ABCBitIO.getU30();
    obj.flags = ABCBitIO.getUI8();

    obj.options = [];
    if (obj.flags & 0x08) {
        var options = [];
        var optionCount = ABCBitIO.getU30();
        if (optionCount) {
            for (i = 0; i < optionCount; i++) {
                options[options.length] = {
                    val: ABCBitIO.getU30(),
                    kind: ABCBitIO.getUI8()
                };
            }
        }
        obj.options = options;
    }

    obj.paramName = [];
    if (obj.flags & 0x80) {
        var paramName = [];
        if (count) {
            for (i = 0; i < count; i++) {
                paramName[paramName.length] = ABCBitIO.getU30();
            }
        }
        obj.paramName = paramName;
    }

    return obj;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCMetadataInfo = function (ABCBitIO)
{
    var obj = {} as any;
    obj.name = ABCBitIO.getU30();
    obj.items = [];

    var count = ABCBitIO.getU30();
    if (count) {
        var items = [];
        for (var i = 0; i < count; i++) {
            items[items.length] = {
                key: ABCBitIO.getU30(),
                value: ABCBitIO.getU30()
            };
        }
        obj.items = items;
    }

    return obj;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCInstanceInfo = function (ABCBitIO)
{
    var obj = {} as any;
    obj.name = ABCBitIO.getU30();
    obj.superName = ABCBitIO.getU30();
    obj.flags = ABCBitIO.getUI8();
    if (obj.flags & 0x08) {
        obj.protectedNs = ABCBitIO.getU30();
    }

    var count = ABCBitIO.getU30();
    obj.interfaces = [];
    if (count) {
        var interfaces = [];
        for (var i = 0; i < count; i++) {
            interfaces[interfaces.length] = ABCBitIO.getU30();
        }
        obj.interfaces = interfaces;
    }

    obj.iinit = ABCBitIO.getU30();
    obj.trait = this.ABCTrait(ABCBitIO);

    return obj;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCClassInfo = function (ABCBitIO)
{
    var obj = {} as any;
    obj.cinit = ABCBitIO.getU30();
    obj.trait = this.ABCTrait(ABCBitIO);
    return obj;
};

/**
 * @param ABCBitIO
 */
SwfTag.prototype.ABCScriptInfo = function (ABCBitIO)
{
    var obj = {} as any;
    obj.init = ABCBitIO.getU30();
    obj.trait = this.ABCTrait(ABCBitIO);
    return obj;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCMethodBodyInfo = function (ABCBitIO)
{
    var _this = this;
    var obj = {} as any;
    obj.method = ABCBitIO.getU30();
    obj.maxStack = ABCBitIO.getU30();
    obj.localCount = ABCBitIO.getU30();
    obj.initScopeDepth = ABCBitIO.getU30();
    obj.maxScopeDepth = ABCBitIO.getU30();
    var i;
    var count = ABCBitIO.getU30();
    var codes = [];
    if (count) {
        codes = _this.ABCBuildCode(ABCBitIO, count);
    }
    obj.codes = codes;

    count = ABCBitIO.getU30();
    var exceptions = [];
    if (count) {
        for (i = 0; i < count; i++) {
            exceptions[exceptions.length] = _this.ABCException(ABCBitIO);
        }
    }
    obj.exceptions = exceptions;
    obj.trait = _this.ABCTrait(ABCBitIO);
    return obj;
};

/**
 * @param ABCBitIO
 * @param count
 * @returns {Array}
 */
SwfTag.prototype.ABCBuildCode = function (ABCBitIO, count)
{
    var array = [];
    var i = 0;
    while (i < count) {
        var obj = {} as any;

        var cacheOffset = ABCBitIO.byte_offset;
        var code = ABCBitIO.getUI8();

        obj.code = code;
        switch (code) {
            default:
                console.log('ERROR CODE: 0x' + (code && code.toString(16)));
                break;

            case 0x02: // nop
            case 0x03: // throw
            case 0x09: // label
            case 0x1c: // pushwith
            case 0x1d: // popscope
            case 0x1e: // nextname
            case 0x1f: // hasnext
            case 0x20: // pushnull
            case 0x21: // pushundefined
            case 0x23: // nextvalue
            case 0x26: // pushtrue
            case 0x27: // pushfalse
            case 0x28: // pushnan
            case 0x29: // pop
            case 0x2a: // dup
            case 0x2b: // swap
            case 0x30: // pushscope
            case 0x47: // returnvoid
            case 0x48: // returnvalue
            case 0x57: // newactivation
            case 0x64: // getglobalscope
            case 0x70: // convert_s
            case 0x71: // esc_xelem
            case 0x72: // esc_xattr
            case 0x73: // convert_i
            case 0x74: // convert_u
            case 0x75: // convert_d
            case 0x76: // convert_b
            case 0x77: // convert_o
            case 0x78: // checkfilter
            case 0x82: // coerce_a
            case 0x85: // coerce_s
            case 0x87: // astypelate
            case 0x90: // negate
            case 0x91: // increment
            case 0x93: // decrement
            case 0x95: // typeof
            case 0x96: // not
            case 0x97: // bitnot
            case 0xa0: // add
            case 0xa1: // subtract
            case 0xa2: // multiply
            case 0xa3: // divide
            case 0xa4: // modulo
            case 0xa5: // lshift
            case 0xa6: // rshift
            case 0xa7: // urshift
            case 0xa8: // bitand
            case 0xa9: // bitor
            case 0xaa: // bitxor
            case 0xab: // equals
            case 0xac: // strictequals
            case 0xad: // lessthan
            case 0xae: // lessequals
            case 0xaf: // greaterthan
            case 0xb0: // greaterequals
            case 0xb1: // instanceof
            case 0xb2: // istype
            case 0xb3: // istypelate
            case 0xb4: // in
            case 0xc0: // increment_i
            case 0xc1: // decrement_i
            case 0xc4: // negate_i
            case 0xc5: // add_i
            case 0xc6: // subtract_i
            case 0xc7: // multiply_i
            case 0xd0: // getlocal_0
            case 0xd1: // getlocal_1
            case 0xd2: // getlocal_2
            case 0xd3: // getlocal_3
            case 0xd4: // setlocal_0
            case 0xd5: // setlocal_1
            case 0xd6: // setlocal_2
            case 0xd7: // setlocal_3
                break;

            case 0x86: // astype
            case 0x41: // call
            case 0x80: // coerce
            case 0x42: // construct
            case 0x49: // constructsuper
            case 0xf1: // debugfile
            case 0xf0: // debugline
            case 0x94: // declocal
            case 0xc3: // declocal_i
            case 0x6a: // deleteproperty
            case 0x06: // dxns
            case 0x53: // applytype
            case 0x5e: // findproperty
            case 0x5d: // findpropstrict
            case 0x59: // getdescendants
            case 0x6e: // getglobalslot
            case 0x60: // getlex
            case 0x62: // getlocal
            case 0x66: // getproperty
            case 0x6c: // getslot
            case 0x04: // getsuper
            case 0x92: // inclocal
            case 0xc2: // inclocal_i
            case 0x68: // initproperty
            case 0xb2: // istype
            case 0x08: // kill
            case 0x56: // newarray
            case 0x5a: // newcatch
            case 0x58: // newclass
            case 0x40: // newfunction
            case 0x55: // newobject
            case 0x2f: // pushdouble
            case 0x2d: // pushint
            case 0x31: // pushnamespace
            case 0x25: // pushshort
            case 0x2c: // pushstring
            case 0x2e: // pushuint
            case 0x63: // setlocal
            case 0x6f: // setglobalslot
            case 0x61: // setproperty
            case 0x6d: // setslot
            case 0x05: // setsuper
                obj.value1 = ABCBitIO.getU30();
                break;

            case 0x1b: // lookupswitch
                obj.offset = ABCBitIO.getSI24();
                obj.count = ABCBitIO.getU30();
                obj.array = [];
                for (var j = 0; j <= obj.count; j++)
                    obj.array[j] = ABCBitIO.getSI24();
                break;

            case 0x65: // getscopeobject
            case 0x24: // pushbyte
                obj.value1 = ABCBitIO.getUI8();
                break;

            case 0x32: // hasnext2
                obj.value1 = ABCBitIO.getSI8();
                obj.value2 = ABCBitIO.getSI8();
                break;

            case 0x13: // ifeq
            case 0x12: // iffalse
            case 0x18: // ifge
            case 0x17: // ifgt
            case 0x16: // ifle
            case 0x15: // iflt
            case 0x0f: // ifnge
            case 0x0e: // ifngt
            case 0x0d: // ifnle
            case 0x0c: // ifnlt
            case 0x14: // ifne
            case 0x19: // ifstricteq
            case 0x1a: // ifstrictne
            case 0x11: // iftrue
            case 0x10: // jump
                obj.value1 = ABCBitIO.getSI24();
                break;

            case 0x43: // callmethod
            case 0x46: // callproperty
            case 0x4c: // callproplex
            case 0x4f: // callpropvoid
            case 0x44: // callstatic
            case 0x45: // callsuper
            case 0x4e: // callsupervoid
            case 0x4a: // constructprop
                obj.value1 = ABCBitIO.getU30();
                obj.value2 = ABCBitIO.getU30();
                break;

            case 0xef: // debug
                obj.type = ABCBitIO.getUI8();
                obj.index = ABCBitIO.getU30();
                obj.reg = ABCBitIO.getUI8();
                obj.extra = ABCBitIO.getU30();
                break;
        }

        obj.len = ABCBitIO.byte_offset - cacheOffset;
        array[i] = obj;

        i += obj.len;
    }

    if (i !== count)
        console.log("ERROR ABC OVERFLOW");

    return array;
};

/**
 * @param ABCBitIO
 * @returns {{}}
 */
SwfTag.prototype.ABCException = function (ABCBitIO)
{
    var obj = {} as any;
    obj.from = ABCBitIO.getU30();
    obj.to = ABCBitIO.getU30();
    obj.target = ABCBitIO.getU30();
    obj.excType = ABCBitIO.getU30();
    obj.varName = ABCBitIO.getU30();
    return obj;
};

/**
 * @param ABCBitIO
 * @returns {Array}
 */
SwfTag.prototype.ABCTrait = function (ABCBitIO)
{
    var count = ABCBitIO.getU30();
    var trait = [];
    if (count) {
        for (var i = 0; i < count; i++) {
            var tObj = {} as any;
            tObj.name = ABCBitIO.getU30();
            var tag = ABCBitIO.getUI8();
            var kind = tag & 0x0f;
            var attributes = (tag >> 4) & 0x0f;

            var data = {} as any;
            switch (kind) {
                default:
                    console.log("ERROR TRAIT:"+ kind);
                    break;
                case 0: // Trait_Slot
                case 6: // Trait_Const
                    data.id = ABCBitIO.getU30();
                    data.name = ABCBitIO.getU30();
                    data.index = ABCBitIO.getU30();
                    data.kind = null;
                    if (data.index !== 0) {
                        data.kind = ABCBitIO.getUI8();
                    }
                    break;
                case 1: // Trait_Method
                case 2: // Trait_Getter
                case 3: // Trait_Setter
                    data.id = ABCBitIO.getU30();
                    data.info = ABCBitIO.getU30();
                    break;
                case 4: // Trait_Class
                    data.id = ABCBitIO.getU30();
                    data.info = ABCBitIO.getU30();
                    break;
                case 5: // Trait_Function
                    data.id = ABCBitIO.getU30();
                    data.info = ABCBitIO.getU30();
                    break;
            }
            tObj.kind = kind;
            tObj.data = data;

            if (attributes & 0x04) {
                var metadataCount = ABCBitIO.getU30();
                var metadata = [];
                if (metadataCount) {
                    for (var j = 0; j < metadataCount; j++) {
                        metadata[metadata.length] = ABCBitIO.getU30();
                    }
                }
                tObj.metadata = metadata;
            }

            trait[trait.length] = tObj;
        }
    }

    return trait;
};

/**
 * parseSymbolClass
 */
SwfTag.prototype.parseSymbolClass = function ()
{
    var bitio = this.bitio;
    var stage = this.stage;
    var symbols = stage.symbols;
    var exportAssets = stage.exportAssets;
    var count = bitio.getUI16();
    if (count) {
        while (count--) {
            var tagId = bitio.getUI16();
            var name = bitio.getDataUntil("\0");
            symbols[tagId] = name;
            exportAssets[name] = tagId;
        }
    }
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseDefineSound = function (tagType, length)
{
    var obj = {} as any;
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var startOffset = bitio.byte_offset;

    obj.tagType = tagType;
    obj.SoundId = bitio.getUI16();
    obj.SoundFormat = bitio.getUIBits(4);
    obj.SoundRate = bitio.getUIBits(2);
    obj.SoundSize = bitio.getUIBit();
    obj.SoundType = bitio.getUIBit();
    obj.SoundSampleCount = bitio.getUI32();

    var sub = bitio.byte_offset - startOffset;
    var dataLength = length - sub;
    var data = bitio.getData(dataLength);
    var SoundData = "";
    for (var i = 0; i < dataLength; i++) {
        SoundData += String.fromCharCode(data[i]);
    }
    bitio.byte_offset = startOffset + length;

    var mimeType = "";
    switch (obj.SoundFormat) {
        case 0: // Uncompressed native-endian
        case 3: // Uncompressed little-endian
            mimeType = "wave";
            break;
        case 1: // ADPCM ? 32KADPCM
            mimeType = "wave";
            break;
        case 2: // MP3
            mimeType = "mpeg";
            break;
        case 4: // Nellymoser 16
        case 5: // Nellymoser 8
        case 6: //
            mimeType = "nellymoser";
            break;
        case 11: // Speex
            mimeType = "speex";
            break;
        case 15:
            mimeType = "x-aiff";
            break;
    }

    obj.base64 = "data:audio/" + mimeType + ";base64," + window.btoa(SoundData);
    stage.sounds[obj.SoundId] = obj;
};

/**
 * @param tagType
 */
SwfTag.prototype.parseStartSound = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    var stage = _this.stage;

    obj.tagType = tagType;
    obj.SoundId = bitio.getUI16();
    if (tagType === 89) {
        obj.SoundClassName = bitio.getDataUntil("\0");
    }

    obj.SoundInfo = _this.parseSoundInfo();
    stage.setCharacter(obj.SoundId, obj);

    var sound = stage.sounds[obj.SoundId];
    var audio = document.createElement("audio");
    audio.onload = function ()
    {
        audio.load();
        audio.preload = "auto";
        audio.autoplay = false;
        audio.loop = false;
    };
    audio.src = sound.base64;

    var loadSounds = stage.loadSounds;
    loadSounds[loadSounds.length] = audio;

    return {
        SoundId: obj.SoundId,
        Audio: audio,
        tagType: tagType
    };
};

/**
 * parseDefineButtonSound
 */
SwfTag.prototype.parseDefineButtonSound = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var buttonId = bitio.getUI16();
    var btnObj = stage.getCharacter(buttonId);
    for (var i = 0; i < 4; i++) {
        var soundId = bitio.getUI16();
        if (soundId) {
            var soundInfo = _this.parseSoundInfo();
            switch (i) {
                case 0:
                    btnObj.ButtonStateUpSoundInfo = soundInfo;
                    btnObj.ButtonStateUpSoundId = soundId;
                    break;
                case 1:
                    btnObj.ButtonStateOverSoundInfo = soundInfo;
                    btnObj.ButtonStateOverSoundId = soundId;
                    break;
                case 2:
                    btnObj.ButtonStateDownSoundInfo = soundInfo;
                    btnObj.ButtonStateDownSoundId = soundId;
                    break;
                case 3:
                    btnObj.ButtonStateHitTestSoundInfo = soundInfo;
                    btnObj.ButtonStateHitTestSoundId = soundId;
                    break;
            }
        }
    }
    stage.setCharacter(buttonId, btnObj);
};

/**
 * @returns {{}}
 */
SwfTag.prototype.parseSoundInfo = function ()
{
    var obj = {} as any;
    var bitio = this.bitio;
    bitio.getUIBits(2); // Reserved
    obj.SyncStop = bitio.getUIBit();
    obj.SyncNoMultiple = bitio.getUIBit();
    obj.HasEnvelope = bitio.getUIBit();
    obj.HasLoops = bitio.getUIBit();
    obj.HasOutPoint = bitio.getUIBit();
    obj.HasInPoint = bitio.getUIBit();

    if (obj.HasInPoint) {
        obj.InPoint = bitio.getUI32();
    }
    if (obj.HasOutPoint) {
        obj.OutPoint = bitio.getUI32();
    }
    if (obj.HasLoops) {
        obj.LoopCount = bitio.getUI16();
    }
    if (obj.HasEnvelope) {
        obj.EnvPoints = bitio.getUI8();
        obj.EnvelopeRecords = [];
        for (var i = 0; i < obj.EnvPoints; i++) {
            obj.EnvelopeRecords[i] = {
                Pos44: bitio.getUI32(),
                LeftLevel: bitio.getUI16(),
                RightLevel: bitio.getUI16()
            };
        }
    }

    return obj;
};

/**
 * parseDefineFontAlignZones
 */
SwfTag.prototype.parseDefineFontAlignZones = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var FontId = bitio.getUI16();
    var tag = stage.getCharacter(FontId);
    tag.CSMTableHint = bitio.getUIBits(2);
    bitio.getUIBits(6); // Reserved
    var NumGlyphs = tag.NumGlyphs;
    var ZoneTable = [];
    for (var i = 0; i < NumGlyphs; i++) {
        var NumZoneData = bitio.getUI8();
        var ZoneData = [];
        for (var idx = 0; idx < NumZoneData; idx++) {
            ZoneData[idx] = bitio.getUI32();
        }
        ZoneTable[i] = {
            ZoneData: ZoneData,
            Mask: bitio.getUI8()
        };
    }

    bitio.byteAlign();
    tag.ZoneTable = ZoneTable;
    stage.setCharacter(FontId, tag);
};

/**
 * @param tagType
 */
SwfTag.prototype.parseCSMTextSettings = function (tagType)
{
    var _this = this;
    var obj = {} as any;
    var bitio = _this.bitio;
    obj.tagType = tagType;
    obj.TextID = bitio.getUI16();
    obj.UseFlashType = bitio.getUIBits(2);
    obj.GridFit = bitio.getUIBits(3);
    bitio.getUIBits(3); // Reserved
    obj.Thickness = bitio.getUI32();
    obj.Sharpness = bitio.getUI32();
    bitio.getUI8(); // Reserved
};

/**
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseSoundStreamBlock = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    obj.tagType = tagType;
    obj.compressed = bitio.getData(length);
};

/**
 * @param tagType
 */
SwfTag.prototype.parseDefineVideoStream = function (tagType)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var obj = {} as any;
    obj.tagType = tagType;
    obj.CharacterId = bitio.getUI16();
    obj.NumFrames = bitio.getUI16();
    obj.Width = bitio.getUI16();
    obj.Height = bitio.getUI16();
    bitio.getUIBits(4); // Reserved
    obj.VideoFlagsDeblocking = bitio.getUIBits(3);
    obj.VideoFlagsSmoothing = bitio.getUIBits(1);
    obj.CodecID = bitio.getUI8();
    stage.setCharacter(obj.CharacterId, obj);
    console.log(obj);
};

/**
 *
 * @param tagType
 * @param length
 */
SwfTag.prototype.parseVideoFrame = function (tagType, length)
{
    var _this = this;
    var bitio = _this.bitio;
    var stage = _this.stage;
    var startOffset = bitio.byte_offset;
    var obj = {} as any;
    obj.tagType = tagType;
    obj.StreamID = bitio.getUI16();
    obj.FrameNum = bitio.getUI16();
    var StreamData = stage.getCharacter(obj.StreamID);
    var sub = bitio.byte_offset - startOffset;
    var dataLength = length - sub;
    switch (StreamData.CodecID) {
        case 4:
            _this.parseVp6SwfVideoPacket(dataLength);
            break;
    }

    bitio.byte_offset = startOffset + length;

    // obj.base64 = 'data:image/jpeg;base64,' + window.btoa(VideoData);
    stage.videos[obj.StreamID] = obj;
};

/**
 * @param length
 * @returns {string}
 */
SwfTag.prototype.parseVp6SwfVideoPacket = function (length)
{
    var _this = this;
    var bitio = _this.bitio;
    var VideoData = "";
    var data = bitio.getData(length);

    console.log(data);

    return VideoData;
};

/**
 * parseFileAttributes
 */
SwfTag.prototype.parseFileAttributes = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    bitio.getUIBit(); // Reserved
    obj.UseDirectBlit = bitio.getUIBit();
    obj.UseGPU = bitio.getUIBit();
    obj.HasMetadata = bitio.getUIBit();
    obj.ActionScript3 = bitio.getUIBit();
    obj.Reserved2 = bitio.getUIBits(3);
    obj.UseNetwork = bitio.getUIBit();
    obj.Reserved3 = bitio.getUIBits(24);
};

/**
 * parseDefineScalingGrid
 */
SwfTag.prototype.parseDefineScalingGrid = function ()
{
    var _this = this;
    var bitio = _this.bitio;
    var obj = {} as any;
    obj.CharacterId = bitio.getUI16();
    obj.Splitter = _this.rect();
};

