/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { cacheStore } from './CacheStore';
import { ClipEvent } from './EventDispatcher';
import { CLS } from './DisplayObject';
import { InteractiveObject } from './InteractiveObject';
import { Stage } from './Stage';
import { DefineFont } from './SwfTag';
import { vtc } from './VectorToCanvas';
import {
    Bounds, ColorTransform, FontData, Color, Matrix,
    generateColorTransform, intToRGBA, multiplicationColor, multiplicationMatrix
} from './utils';

export type TextFormatAlign = 'center'
                            | 'end'
                            | 'justify'
                            | 'left'
                            | 'right'
                            | 'start';
export type TextFieldAutoSize = 'center' | 'left' | 'none' | 'right';
export type TextFieldType = 'dynamic' | 'input';

export class TextFormat {
    public align: TextFormatAlign = "left";
    public blockIndent = 0;
    public bold = false;
    public bullet = false;
    public color: Color = {R: 0, G: 0, B: 0, A: 1};
    public font: string = "sans-serif";
    public indent = 0;
    public italic = false;
    public kerning = false;
    public leading = 0;
    public leftMargin = 0;
    public letterSpacing = 0;
    public rightMargin = 0;
    public size = 12;
    public tabStops: number[] = [];
    public target = '';
    public underline = false;
    public url = '';
}

export class TextField extends InteractiveObject {
    public fontId = 0;
    public fontScale = 1;
    public inputActive = false;
    public initialText: string = '';

    public input?: HTMLTextAreaElement;

    protected variables: { [type: string]: any } = {};

    private bounds = new Bounds(0, 0, 0, 0);

    get text(): string {
        return this.variables.text;
    }

    set text(text: string) {
        this.variables.text = text;
    }

    get htmlText(): string {
        return this.variables.text;
    }

    set htmlText(text: string) {
        this.variables.text = text;
    }

    get size(): number {
        return this.variables.size;
    }

    set size(size: number) {
        this.variables.size = size;
    }

    get font(): string {
        return this.variables.font;
    }

    set font(font: string) {
        this.variables.font = font;
    }

    get type(): TextFieldType {
        return this.variables.type;
    }

    set type(type: TextFieldType) {
        this.variables.type = type;
        if (type === "input") {
            this.setInputElement();
        }
    }

    get multiline(): boolean {
        return this.variables.multiline;
    }

    set multiline(multiline: boolean) {
        this.variables.multiline = multiline;
        if (multiline) {
            this.wordWrap = multiline;
        }
        if (this.type === "input") {
            this.setInputElement();
        }
    }

    get wordWrap(): boolean {
        return this.variables.wordWrap;
    }

    set wordWrap(wordWrap: boolean) {
        this.variables.wordWrap = wordWrap;
        if (this.type === "input") {
            this.setInputElement();
        }
    }

    get border(): boolean {
        return this.variables.border;
    }

    set border(border: boolean) {
        this.variables.border = border;
    }

    get borderColor(): Color {
        return this.variables.borderColor;
    }

    set borderColor(color: Color) {
        this.variables.borderColor = color;
    }

    get background(): boolean {
        return this.variables.background;
    }

    set background(background: boolean) {
        this.variables.background = background;
    }

    get backgroundColor(): Color {
        return this.variables.backgroundColor;
    }

    set backgroundColor(color: Color) {
        this.variables.backgroundColor = color;
    }

    get textColor(): Color {
        return this.variables.textColor;
    }

    set textColor(color: Color) {
        this.variables.textColor = color;
    }

    get align(): TextFormatAlign {
        return this.variables.align;
    }

    set align(align: TextFormatAlign) {
        this.variables.align = align;
    }

    get autoSize(): TextFieldAutoSize {
        return this.variables.autoSize;
    }

    set autoSize(autoSize: TextFieldAutoSize) {
        this.variables.autoSize = autoSize;
    }

    get onChanged(): Function {
        return this.variables.onChanged;
    }

    set onChange(onChanged: Function) {
        this.variables.onChanged = onChanged;
    }

    reset(): void {
        super.reset();

        var _this = this;
        var input = _this.input;
        if (_this.inputActive) {
            _this.inputActive = false;
            input.onchange = null;
            var stage = _this.getStage();
            var div = document.getElementById(stage.getName());
            if (div) {
                var el = document.getElementById(_this.getTagName());
                if (el) {
                    try {
                        div.removeChild(el);
                    } catch (e) {

                    }
                }
            }
        }
        _this.text = _this.initialText;
    }

    setInitParams(): void {
        // this.antiAliasType = null;
        this.autoSize = "none";
        this.background = false;
        this.backgroundColor = {R: 255, G: 255, B: 255, A: 1};
        this.border = false;
        this.borderColor = {R: 0, G: 0, B: 0, A: 1};
        // this.condenseWhite = 0;
        this.htmlText = '';
        // this.password = 0;
        // this.embedFonts = 0;
        // this.gridFitType = "none";
        // this.maxChars = null;
        // this.mouseWheelEnabled = 0;
        this.multiline = false;
        // this.selectable = 0;
        // this.sharpness = 0;
        this.textColor = {R: 0, G: 0, B: 0, A: 1};
        // this.thickness = 0;
        this.type = "dynamic";
        this.wordWrap = false;
        this.text = "";
        this.setTextFormat(new TextFormat());
    }

    getTagName(): string {
        return "__swf2js_input_element_" + this.instanceId;
    }

    setTextFormat(format: TextFormat): void {
        for (var name in format) {
            if (!format.hasOwnProperty(name)) {
                continue;
            }
            this.setProperty(name, format[name]);
        }
    }

    getBounds(matrix?: Matrix): Bounds {
        if (matrix) {
            var bounds = this.bounds.transform(matrix);
            bounds.divide(20);
            return bounds;
        } else {
            return this.bounds;
        }
    }

    setBounds(bounds: Bounds): void {
        this.bounds = bounds;
    }

    setInputElement(): void {
        var _this = this;
        var variables = _this.variables;
        var _root = _this.getDisplayObject("_root");
        var stage = _root.getParentStage();
        var element = document.createElement("textarea");
        var multiline = variables.multiline;
        var align = variables.align;
        var text: any = _this.initialText;
        if (!text) {
            text = variables.text;
        }

        element.onkeypress = null;
        if (!multiline) {
            element.onkeypress = function (e)
            {
                if (e.keyCode === 13) {
                    return false;
                }
            };
        }

        element.style.position = "absolute";
        element.style.webkitBorderRadius = "0px";
        element.style.padding = "1px";
        element.style.margin = "0px";
        element.style.webkitAppearance = "none";
        element.style.resize = "none";
        element.style.border = "none";
        element.style.overflow = "hidden";
        element.style.backgroundColor = "transparent";
        element.style.zIndex = '' + 0x7fffffff;
        element.style.textAlign = align;

        element.value = text;
        if (typeof text !== "string") {
            var str = "";
            var length = text.length;
            for (var i = 0; i < length; i++) {
                var txt = text[i];
                str += txt.innerText;
                if ((i + 1) !== length) {
                    str += "\n";
                }
            }
            element.value = str;
        }

        element.id = _this.getTagName();
        var onBlur = function (stage, textField, el)
        {
            return function ()
            {
                textField.setProperty("text", el.value);
                textField.inputActive = false;
                var div = document.getElementById(stage.getName());
                if (div) {
                    var element = document.getElementById(textField.getTagName());
                    if (element) {
                        try {
                            div.removeChild(element);
                        } catch (e) {}
                    }
                }
            };
        };

        element.onblur = onBlur(stage, _this, element);
        _this.input = element;
    }

    setHitRange(matrix: Matrix, stage: Stage, visible: boolean): void {
        var _this = this;
        var type = _this.variables.type;
        var isVisible = _this.getVisible() && visible;
        if (type === "input" && isVisible) {
            var buttonHits = stage.buttonHits;
            var m2 = multiplicationMatrix(matrix, _this.getMatrix());
            var bounds = _this.getBounds(m2);
            buttonHits[buttonHits.length] = {
                xMax: bounds.xMax,
                xMin: bounds.xMin,
                yMax: bounds.yMax,
                yMin: bounds.yMin,
                parent: _this
            };
        }
    }

    render(ctx: CanvasRenderingContext2D,
           matrix: Matrix,
           colorTransform: ColorTransform,
           stage: Stage,
           visible: boolean): string
    {
        var _this = this;
        stage.doneTags.unshift(_this);

        // colorTransform
        var rColorTransform = multiplicationColor(colorTransform, _this.getColorTransform());
        var isVisible = _this.getVisible() && visible;
        var stageClip = stage.clipMc || stage.isClipDepth;
        var alpha = rColorTransform[3] + (rColorTransform[7] / 255);
        if (!stageClip && (!alpha || !isVisible)) {
            return '0';
        }

        // matrix
        var m2 = multiplicationMatrix(matrix, _this.getMatrix());

        // pre render
        var obj = _this.preRender(ctx, m2, rColorTransform, stage, visible);
        var preCtx = obj.preCtx;
        var preMatrix = obj.preMatrix;
        var m3 = multiplicationMatrix(stage.getMatrix(), preMatrix);
        preCtx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);

        var textCacheKey = ["TextField"];
        var variables = _this.variables;
        var text = variables.text;
        var variable = variables.variable;
        if (variable) {
            var parent = _this.getParent();
            text = parent.getProperty(variable);
            if (text === undefined) {
                text = variables.text;
            }
        }

        if (typeof text === "number") {
            text = "" + text;
        }

        var html = variables.html;
        if (html && typeof text === "string") {
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
            var domLength = tags.length;
            if (domLength) {
                var tagData = [];
                for (var d = 0; d < domLength; d++) {
                    tagData[d] = tags[d];
                }
                text = tagData;
            } else {
                text = span.innerText;
            }
        }
        preCtx.textBaseline = "top";
        if (text === undefined) {
            text = "";
        }

        var bounds = _this.getBounds();
        var xMax = bounds.xMax;
        var xMin = bounds.xMin;
        var yMax = bounds.yMax;
        var yMin = bounds.yMin;
        var W = Math.abs(Math.ceil(xMax - xMin));
        var H = Math.abs(Math.ceil(yMax - yMin));

        // auto size
        var scale = stage.getScale();
        var autoSize = variables.autoSize;
        var wordWrap = variables.wordWrap;
        var splitData = (typeof text === "string") ? text.split("\n") : text;
        var length = splitData.length;
        var i, txtObj, measureText;
        var txtTotalWidth = 0;
        var txtTotalHeight = 0;
        var isAutoSize = false;
        var autoMode = (typeof autoSize === "string") ? autoSize.toLowerCase() : autoSize;
        switch (autoMode) {
            default:
            case "none":
            case false:
            case 0:
                txtTotalWidth = W;
                txtTotalHeight = H;
                break;
            case true:
            case 1:
            case "left":
            case "center":
            case "right":
                isAutoSize = true;
                break;
        }

        var fontData = _this.getStage().getCharacter(_this.fontId) as DefineFont;
        if (isAutoSize) {
            if (variables.embedFonts) {
                var CodeTable = fontData.CodeTable;
                var FontAdvanceTable = fontData.FontAdvanceTable;
                var fontScale = _this.fontScale;
                txtTotalWidth = 0;
                txtTotalHeight = (fontData.FontAscent * fontScale) + variables.leading;
                for (i = 0; i < length; i++) {
                    txtObj = splitData[i];
                    if (typeof txtObj !== "string") {
                        var firstChild = txtObj.firstChild;
                        txtTotalWidth = _this.getDomWidth(firstChild, CodeTable, FontAdvanceTable);
                    } else {
                        var txtLength = txtObj.length;
                        for (var idx = 0; idx < txtLength; idx++) {
                            var index = CodeTable.indexOf(txtObj[idx].charCodeAt(0));
                            if (index === -1) {
                                continue;
                            }
                            txtTotalWidth += (FontAdvanceTable[index] * fontScale);
                        }
                    }
                }
            } else {
                var addH = (variables.size * 20) + variables.leading;
                txtTotalHeight = (bounds.yMin + 80);
                if (wordWrap) {
                    txtTotalWidth = W;
                    for (i = 0; i < length; i++) {
                        txtObj = splitData[i];
                        if (typeof txtObj === "string") {
                            measureText = preCtx.measureText(txtObj);
                            var checkW = Math.ceil(measureText.width * 20);
                            if (checkW > W) {
                                txtTotalHeight += Math.ceil(Math.ceil(checkW / W) * addH);
                            }
                        }
                    }
                } else {
                    for (i = 0; i < length; i++) {
                        txtObj = splitData[i];
                        if (typeof txtObj === "string") {
                            measureText = preCtx.measureText(txtObj);
                            txtTotalWidth = Math.max(txtTotalWidth, Math.ceil(measureText.width * 20));
                            txtTotalHeight += addH;
                        }
                    }
                }
                txtTotalWidth += 80;
            }
        }

        var offsetX = 40;
        switch (autoMode) {
            case "center":
                offsetX = Math.ceil((Math.max(txtTotalWidth, W) - Math.min(txtTotalWidth, W)) / 2);
                break;
            case "right":
                offsetX = Math.ceil(Math.max(txtTotalWidth, W) - Math.min(txtTotalWidth, W));
                break;
        }

        W = txtTotalWidth;
        H = txtTotalHeight;

        if (W > 0 && H > 0) {
            var isClipDepth = _this.isClipDepth || stageClip;
            var color;
            var rx = xMin;
            var ry = yMin;
            var m = _this._matrix;
            if (m) {
                rx = -xMin;
                ry = -yMin;
                var m4 = multiplicationMatrix(preMatrix, [1, 0, 0, 1, xMin, yMin]);
                m3 = multiplicationMatrix(stage.getMatrix(), m4);
                preCtx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);
            }

            // border
            var border = variables.border;
            if (border && !isClipDepth) {
                preCtx.beginPath();
                preCtx.rect(rx - offsetX, ry, W, H);
                color = generateColorTransform(variables.borderColor, rColorTransform);
                textCacheKey[textCacheKey.length] = color;
                preCtx.strokeStyle = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
                preCtx.lineWidth = Math.min(20, 1 / Math.min(m3[0], m3[3]));
                preCtx.globalAlpha = 1;
                preCtx.fillStyle = "rgba(0,0,0,0)";
                if (variables.background) {
                    color = generateColorTransform(variables.backgroundColor, rColorTransform);
                    textCacheKey[textCacheKey.length] = color;
                    preCtx.fillStyle = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
                }
                preCtx.fill();
                preCtx.stroke();
            }

            var textColor = variables.textColor;
            var objRGBA = textColor;
            if (typeof  textColor === "number") {
                objRGBA = intToRGBA(textColor, 100);
            }

            color = generateColorTransform(objRGBA, rColorTransform);
            var fillStyle = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
            textCacheKey[textCacheKey.length] = fillStyle;
            preCtx.fillStyle = fillStyle;

            // font type
            var fontType = "";
            if (variables.italic) {
                fontType += "italic ";
            }
            if (variables.bold) {
                fontType += "bold ";
            }

            var fontStyle = fontType + variables.size + "px " + variables.font;
            textCacheKey[textCacheKey.length] = fontStyle;
            preCtx.font = fontStyle;

            if (_this.input !== null) {
                var input = _this.input;
                var fontSize = Math.ceil(variables.size * scale * Math.min(preMatrix[0], preMatrix[3]));
                input.style.font = fontType + fontSize + "px " + variables.font;
                input.style.color = "rgba(" + color.R + "," + color.G + "," + color.B + "," + color.A + ")";
                var as = variables.onChanged;
                if (as && !input.onchange) {
                    var onChanged = function (stage, origin, clip, el)
                    {
                        return function ()
                        {
                            if (clip.active) {
                                clip.setProperty("text", el.value);
                                origin.apply(clip, arguments);
                                stage.executeAction();
                            }
                        };
                    };
                    input.onchange = onChanged(stage, as, _this, input);
                }
            }

            if (text && !isClipDepth) {
                preCtx.save();
                preCtx.beginPath();
                preCtx.rect(rx - offsetX, ry, W, (H-40));
                preCtx.clip();

                if (_this.inputActive === false) {
                    if (variables.embedFonts) {
                        _this.renderOutLine(preCtx, fontData, splitData, m3, rx - offsetX, W, fillStyle);
                    } else {
                        _this.renderText(preCtx, splitData, m3, fontType, fillStyle);
                    }
                }

                preCtx.restore();
                preCtx.globalAlpha = 1;
            }

            textCacheKey[textCacheKey.length] = text;
            var cacheKey = cacheStore.generateKey(
                textCacheKey.join("_"), '' + _this.getCharacterId(), m3, rColorTransform);
            obj.cacheKey = cacheKey;
            if (obj.isFilter || obj.isBlend) {
                _this.postRender(ctx, matrix, rColorTransform, stage, obj);
            }
            return cacheKey;
        }

        return null;
    }

    private renderOutLine(ctx: CanvasRenderingContext2D,
                          fontData: FontData,
                          splitData: any[],
                          matrix: Matrix,
                          offset: number,
                          width: number,
                          fillStyle: string): void
    {
        var _this = this;
        var variables = _this.variables;
        var fontScale = _this.fontScale;
        var leading = (fontData.FontAscent + fontData.FontDescent) * fontScale;
        var rightMargin = variables.rightMargin * fontScale;
        var leftMargin = variables.leftMargin * fontScale;
        var indent = variables.indent * fontScale;
        var align = variables.align;
        var txt = "";
        var CodeTable = fontData.CodeTable;
        var GlyphShapeTable = fontData.GlyphShapeTable;
        var FontAdvanceTable = fontData.FontAdvanceTable;
        var YOffset = (fontData.FontAscent * fontScale);
        var cacheYOffset = YOffset;
        var wordWrap = variables.wordWrap;
        var multiline = variables.multiline;
        var bounds = _this.getBounds();
        var areaWidth = (Math.ceil((bounds.xMax) - (bounds.xMin)) - leftMargin - rightMargin);
        var idx;
        var index;
        var length = splitData.length;
        for (var i = 0; i < length; i++) {
            var XOffset = offset;
            var textWidth = 0;
            var txtLength = 0;
            var obj = splitData[i];
            var firstChild;
            if (typeof obj !== "string") {
                firstChild = obj.firstChild;
                if (!firstChild) {
                    continue;
                }
                textWidth = _this.getDomWidth(firstChild, CodeTable, FontAdvanceTable);
                txt = obj.innerText;
                align = variables.align;
                if (obj.align) {
                    align = obj.align;
                }
            } else {
                txt = obj;
                txtLength = txt.length;
                for (idx = 0; idx < txtLength; idx++) {
                    index = CodeTable.indexOf(txt[idx].charCodeAt(0));
                    if (index === -1) {
                        continue;
                    }
                    textWidth += (FontAdvanceTable[index] * fontScale);
                }
            }

            if (align === "right") {
                XOffset += width - rightMargin - textWidth - 40;
            } else if (align === "center") {
                XOffset += indent + leftMargin + 40 + ((width - indent - leftMargin - rightMargin - textWidth) / 2);
            } else {
                XOffset += indent + leftMargin + 40;
            }

            var cacheXOffset = XOffset;
            var wordWidth = 0;
            if (typeof obj !== "string") {
                var gridData = {
                    XOffset: XOffset,
                    YOffset: YOffset,
                    cacheXOffset: cacheXOffset,
                    cacheYOffset: cacheYOffset,
                    wordWidth: wordWidth,
                    addXOffset: 0,
                    size: firstChild.size,
                    areaWidth: areaWidth,
                    matrix: matrix
                };

                _this.renderDomOutLine(
                    ctx, firstChild, gridData, fillStyle,
                    CodeTable, FontAdvanceTable, GlyphShapeTable
                );
            } else {
                for (idx = 0; idx < txtLength; idx++) {
                    index = CodeTable.indexOf(txt[idx].charCodeAt(0));
                    if (index === -1) {
                        continue;
                    }

                    var addXOffset = FontAdvanceTable[index] * fontScale;
                    if (wordWrap && multiline) {
                        if (wordWidth + addXOffset > areaWidth) {
                            XOffset = cacheXOffset;
                            YOffset += cacheYOffset;
                            wordWidth = 0;
                        }
                    }

                    var m2 = multiplicationMatrix(matrix, [fontScale, 0, 0, fontScale, XOffset, YOffset]);
                    ctx.setTransform(m2[0],m2[1],m2[2],m2[3],m2[4],m2[5]);
                    _this.renderGlyph(GlyphShapeTable[index], ctx);
                    XOffset += addXOffset;
                    wordWidth += addXOffset;
                }
            }

            YOffset += leading;
        }
    }

    renderDomOutLine(
        ctx, child, gridData, fillStyle,
        CodeTable, FontAdvanceTable, GlyphShapeTable
    ) {
        var _this = this;
        var variables = _this.variables;
        var wordWrap = variables.wordWrap;
        var multiline = variables.multiline;
        var stage = _this.getStage();
        var fonts = stage.fonts;
        var face = child.face;
        var fontData = fonts[face];
        var codeTable = CodeTable;
        var faTable = FontAdvanceTable;
        var shapeTable = GlyphShapeTable;
        var color = fillStyle;
        if (fontData) {
            codeTable = fontData.CodeTable;
            faTable = fontData.FontAdvanceTable;
            shapeTable = fontData.GlyphShapeTable;
        }

        if (child.color) {
            color = child.color;
        }

        if (child.size) {
            gridData.size = child.size;
        }

        var childNodes = child.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            var node = childNodes[i];
            if (node instanceof HTMLFontElement) {
                _this.renderDomOutLine(
                    ctx, node, gridData, color,
                    codeTable, faTable, shapeTable
                );
            } else {
                var size = gridData.size;
                var fontScale = size / 1024;
                var sTable;
                var values = node.nodeValue;
                if (!values) {
                    continue;
                }
                var vLength = values.length;
                for (var idx = 0; idx < vLength; idx++) {
                    var txt = values[idx];
                    var index = codeTable.indexOf(txt.charCodeAt(0));
                    if (index === -1) {
                        index = CodeTable.indexOf(txt.charCodeAt(0));
                        if (index === -1) {
                            continue;
                        }
                        color = fillStyle;
                        gridData.addXOffset = FontAdvanceTable[index] * fontScale;
                        sTable = GlyphShapeTable;
                    } else  {
                        gridData.addXOffset = faTable[index] * fontScale;
                        sTable = shapeTable;
                    }

                    if (wordWrap && multiline) {
                        if (gridData.wordWidth + gridData.addXOffset > gridData.areaWidth) {
                            gridData.XOffset = gridData.cacheXOffset;
                            gridData.YOffset += gridData.cacheYOffset;
                            gridData.wordWidth = 0;
                        }
                    }

                    var m2: Matrix = [fontScale, 0, 0, fontScale, gridData.XOffset, gridData.YOffset];
                    var m3 = multiplicationMatrix(gridData.matrix, m2);
                    ctx.setTransform(m3[0], m3[1], m3[2], m3[3], m3[4], m3[5]);
                    ctx.fillStyle = color;
                    _this.renderGlyph(sTable[index], ctx);
                    gridData.XOffset += gridData.addXOffset;
                    gridData.wordWidth += gridData.addXOffset;
                }
            }
        }
    }

    private getDomWidth(child, CodeTable, FontAdvanceTable): number {
        var _this = this;
        var fontScale = _this.fontScale;
        var stage = _this.getStage();
        var fonts = stage.fonts;
        var width = 0;
        var face = child.face;
        var fontData = fonts[face];
        var codeTable = CodeTable;
        var faTable = FontAdvanceTable;
        if (fontData) {
            codeTable = fontData.CodeTable;
            faTable = fontData.FontAdvanceTable;
        }

        var childNodes = child.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            var node = childNodes[i];
            if (node instanceof HTMLFontElement) {
                width += _this.getDomWidth(node, codeTable, faTable);
            } else {
                var values = node.nodeValue;
                if (!values) {
                    continue;
                }
                var vLength = values.length;
                for (var idx = 0; idx < vLength; idx++) {
                    var txt = values[idx];
                    var index = codeTable.indexOf(txt.charCodeAt(0));
                    if (index === -1) {
                        index = CodeTable.indexOf(txt.charCodeAt(0));
                        if (index === -1) {
                            continue;
                        }
                        width += (FontAdvanceTable[index] * fontScale);
                    } else  {
                        width += (faTable[index] * fontScale);
                    }
                }
            }
        }
        return width;
    }

    private renderGlyph(records, ctx): void {
        if (!records.data) {
            records.data = vtc.convert(records);
        }

        var shapes = records.data;
        var shapeLength = shapes.length;
        for (var idx = 0; idx < shapeLength; idx++) {
            var styleObj = shapes[idx];
            var cmd = styleObj.cmd;
            ctx.beginPath();
            cmd(ctx);
            ctx.fill();
        }
    }

    private renderText(ctx, splitData, matrix, fontType, fillStyle): void {
        var _this = this;
        var variables = _this.variables;
        var wordWrap = variables.wordWrap;
        var multiline = variables.multiline;
        var leading = variables.leading / 20;
        var rightMargin = variables.rightMargin / 20;
        var leftMargin = variables.leftMargin / 20;
        var indent = variables.indent / 20;
        var align = variables.align;
        var bounds = _this.getBounds();
        var xMax = bounds.xMax / 20;
        var xMin = bounds.xMin / 20;
        var width = Math.ceil(xMax - xMin);

        var m2: Matrix = [matrix[0] * 20, matrix[1] * 20, matrix[2] * 20, matrix[3] * 20, matrix[4], matrix[5]];
        var xScale = Math.sqrt(m2[0] * m2[0] + m2[1] * m2[1]);
        var yScale = Math.sqrt(m2[2] * m2[2] + m2[3] * m2[3]);
        var scale = Math.max(xScale, yScale);
        ctx.setTransform(scale,m2[1],m2[2],scale,m2[4],m2[5]);

        var dx = xMin;
        var dy = (bounds.yMin / 20) + 2;
        if (align === "right") {
            ctx.textAlign = "end";
            dx += width - rightMargin - 2;
        } else if (align === "center") {
            ctx.textAlign = "center";
            dx += leftMargin + indent + ((width - leftMargin - indent - rightMargin) / 2);
        } else {
            dx += 2 + leftMargin + indent;
        }

        bounds = _this.getBounds(m2);
        var areaWidth = (bounds.xMax - bounds.xMin) - ((leftMargin - rightMargin) * xScale);
        areaWidth /= scale;

        var size = variables.size;
        var length = splitData.length;
        for (var i = 0; i < length; i++) {
            var txt = "";
            var obj = splitData[i];
            if (typeof obj !== "string") {
                txt = obj.innerText;
            } else {
                txt = obj;
            }

            if (txt === "") {
                dy += leading + size;
                continue;
            }

            var measureText = ctx.measureText(txt);
            var txtTotalWidth = measureText.width;
            if (typeof obj === "string") {
                if (wordWrap || multiline) {
                    if (txtTotalWidth > areaWidth) {
                        var txtLength = txt.length;
                        var joinTxt = "";
                        var joinWidth = 2 * scale;
                        for (var t = 0; t < txtLength; t++) {
                            var txtOne = txt[t];
                            var textOne = ctx.measureText(txtOne);
                            joinWidth += textOne.width;
                            joinTxt += txtOne;
                            var nextOne = txt[t+1];
                            if (nextOne) {
                                textOne = ctx.measureText(nextOne);
                                joinWidth += textOne.width;
                            }
                            if (joinWidth > areaWidth || (t + 1) === txtLength) {
                                ctx.fillText(joinTxt, dx, dy, Math.ceil(joinWidth));
                                joinWidth = 2 * scale;
                                joinTxt = "";
                                dy += leading + size;
                            } else if (nextOne) {
                                joinWidth -= textOne.width;
                            }
                        }
                    } else {
                        ctx.fillText(txt, dx, dy, txtTotalWidth);
                        dy += leading + size;
                    }
                } else {
                    ctx.fillText(txt, dx, dy, txtTotalWidth);
                    dy += leading + size;
                }
            } else {
                var firstChild = obj.firstChild;
                var gridData = {
                    startDx: dx,
                    dx: dx,
                    cloneDy: dy,
                    dy: dy,
                    color: fillStyle,
                    fontType: fontType,
                    fillStyle: fillStyle,
                    size: size,
                    scale: scale,
                    originSize: size,
                    txtTotalWidth: txtTotalWidth,
                    areaWidth: areaWidth,
                    joinWidth: 0,
                    joinTxt: "",
                    offset: 0,
                    offsetArray: []
                };

                if (gridData.offsetArray.length === 0) {
                    _this.offsetDomText(ctx, firstChild, gridData);
                }

                // reset
                gridData.dx = dx;
                gridData.dy = dy;
                gridData.cloneDy = dy;
                gridData.size = size;
                gridData.joinWidth = 0;
                gridData.joinTxt = "";
                gridData.offset = 0;
                if (gridData.offsetArray.length > 0) {
                    var offsetY = gridData.offsetArray[0];
                    if (offsetY) {
                        gridData.dy += offsetY;
                        gridData.cloneDy = gridData.dy;
                    }
                }

                _this.renderDomText(ctx, firstChild, gridData);

                dy = gridData.dy;
            }
        }
    }

    private offsetDomText(ctx, child, gridData) {
        var _this = this;
        var variables = _this.variables;
        var wordWrap = variables.wordWrap;
        var multiline = variables.multiline;
        var leading = variables.leading / 20;
        if (child.face) {
            gridData.face = child.face;
        }

        if (child.size) {
            var size = child.size|0;
            var changeSize = gridData.originSize - size;
            if (changeSize) {
                gridData.dy += changeSize;
                if (changeSize > 0) {
                    gridData.dy -= 4;
                } else {
                    var offsetArray = gridData.offsetArray;
                    var offset = gridData.offset;
                    var offsetSize = offsetArray[offset];
                    if (offsetSize) {
                        offsetArray[offset] = Math.max(offsetSize, ~changeSize);
                    } else {
                        offsetArray[offset] = ~changeSize;
                    }
                    gridData.dy += 6;
                }
            }
            gridData.size = size;
        }

        var childNodes = child.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            var node = childNodes[i];
            if (node instanceof HTMLFontElement) {
                _this.offsetDomText(ctx, node, gridData);
            } else {
                var txt = node.nodeValue;
                if (wordWrap && multiline) {
                    if (gridData.txtTotalWidth > gridData.areaWidth) {
                        var txtLength = txt.length;
                        for (var t = 0; t < txtLength; t++) {
                            var textOne = ctx.measureText(txt[t]);
                            gridData.joinWidth += textOne.width;
                            gridData.joinTxt += txt[t];
                            var isOver = (gridData.joinWidth > gridData.areaWidth);
                            if (isOver || (t + 1) === txtLength) {
                                if ((gridData.dx + textOne.width) > gridData.areaWidth) {
                                    gridData.dx = gridData.startDx;
                                    gridData.dy += leading + gridData.size;
                                    gridData.cloneDy = gridData.dy;
                                    gridData.joinWidth = 2 * gridData.scale;
                                    isOver = false;
                                    gridData.offset++;
                                }

                                gridData.joinTxt = "";
                                if (isOver) {
                                    gridData.dx = gridData.startDx;
                                    gridData.joinWidth = 22 * gridData.scale;
                                    gridData.dy += leading + gridData.size;
                                    gridData.cloneDy = gridData.dy;
                                    gridData.offset++;
                                }
                            }
                        }
                    } else {
                        gridData.dy += leading + gridData.size;
                        gridData.cloneDy = gridData.dy;
                        gridData.offset++;
                    }
                } else {
                    gridData.dy += leading + gridData.size;
                    gridData.cloneDy = gridData.dy;
                    gridData.offset++;
                }

                var mText = ctx.measureText(txt);
                gridData.dx += mText.width;
                gridData.size = gridData.originSize;
                gridData.dy = gridData.cloneDy;
            }
        }
    }

    private renderDomText(ctx, child, gridData) {
        var _this = this;
        var variables = _this.variables;
        var wordWrap = variables.wordWrap;
        var multiline = variables.multiline;
        var leading = variables.leading / 20;

        if (child.face) {
            gridData.face = child.face;
        }

        if (child.color) {
            gridData.color = child.color;
        }

        if (child.size) {
            var size = child.size|0;
            var changeSize = gridData.originSize - size;
            if (changeSize) {
                gridData.dy += changeSize;
                if (changeSize > 0) {
                    gridData.dy -= 4;
                } else {
                    gridData.dy += 8;
                }
            }
            gridData.size = size;
        }

        var offsetY;
        var childNodes = child.childNodes;
        var length = childNodes.length;
        for (var i = 0; i < length; i++) {
            var node = childNodes[i];
            if (node instanceof HTMLFontElement) {
                _this.renderDomText(ctx, node, gridData);
            } else {
                ctx.fillStyle = gridData.color;
                ctx.font = gridData.fontType + gridData.size + "px " + gridData.face;

                var text = node.nodeValue;
                var splits = text.split("\n");
                var sLen= splits.length;
                for (var idx = 0; idx < sLen; idx++) {
                    gridData.dx = gridData.startDx;
                    var txt = splits[idx];

                    if (wordWrap && multiline) {
                        if (gridData.txtTotalWidth > gridData.areaWidth) {
                            var txtLength = txt.length;
                            for (var t = 0; t < txtLength; t++) {
                                var textOne = ctx.measureText(txt[t]);
                                gridData.joinWidth += textOne.width;
                                gridData.joinTxt += txt[t];
                                var isOver: boolean | 0 = (gridData.joinWidth > gridData.areaWidth);
                                if (isOver || (t + 1) === txtLength) {
                                    if ((gridData.dx + textOne.width) > gridData.areaWidth) {
                                        isOver = 0;
                                        gridData.joinWidth = gridData.size;
                                        gridData.dx = gridData.startDx;
                                        gridData.offset++;
                                        gridData.dy += leading + gridData.size;
                                        if (gridData.offsetArray.length > 0) {
                                            offsetY = gridData.offsetArray[gridData.offset];
                                            if (offsetY) {
                                                gridData.dy += offsetY;
                                            }
                                        }
                                        gridData.cloneDy = gridData.dy;
                                    }

                                    ctx.fillText(gridData.joinTxt, gridData.dx, gridData.dy, Math.ceil(gridData.joinWidth));
                                    gridData.joinTxt = "";
                                    if (isOver) {
                                        gridData.dx = gridData.startDx;
                                        gridData.joinWidth = gridData.size;
                                        gridData.offset++;
                                        gridData.dy += leading + gridData.size;
                                        if (gridData.offsetArray.length > 0) {
                                            offsetY = gridData.offsetArray[gridData.offset];
                                            if (offsetY) {
                                                gridData.dy += offsetY;
                                            }
                                        }
                                        gridData.cloneDy = gridData.dy;
                                    }
                                }
                            }
                        } else {
                            ctx.fillText(txt, gridData.dx, gridData.dy, Math.ceil(gridData.txtTotalWidth));
                            gridData.offset++;
                            gridData.dy += leading + gridData.size;
                            if (gridData.offsetArray.length > 0) {
                                offsetY = gridData.offsetArray[gridData.offset];
                                if (offsetY) {
                                    gridData.dy += offsetY;
                                }
                            }
                            gridData.cloneDy = gridData.dy;
                        }
                    } else {
                        ctx.fillText(txt, gridData.dx, gridData.dy, Math.ceil(gridData.txtTotalWidth));
                        gridData.offset++;
                        gridData.dy += leading + gridData.size;
                        if (gridData.offsetArray.length > 0) {
                            offsetY = gridData.offsetArray[gridData.offset];
                            if (offsetY) {
                                gridData.dy += offsetY;
                            }
                        }
                        gridData.cloneDy = gridData.dy;
                    }

                    var mText = ctx.measureText(txt);
                    gridData.dx += mText.width;
                    gridData.color = gridData.fillStyle;
                    gridData.size = gridData.originSize;
                    gridData.dy = gridData.cloneDy;
                }
            }
        }
    }

    putFrame(stage: Stage, clipEvent: ClipEvent): void {
        this.active = true;
        if (this.inputActive === false) {
            this.dispatchEvent(clipEvent, stage);
        }
    }

    renderHitTest(ctx: CanvasRenderingContext2D,
                  matrix: Matrix,
                  stage: Stage,
                  x: number,
                  y: number): boolean
    {
        var _this = this;
        var bounds = _this.getBounds();
        var xMax = bounds.xMax;
        var xMin = bounds.xMin;
        var yMax = bounds.yMax;
        var yMin = bounds.yMin;
        var width = Math.ceil(xMax - xMin);
        var height = Math.ceil(yMax - yMin);

        var m2 = multiplicationMatrix(matrix, _this.getMatrix());
        var m3 = multiplicationMatrix(stage.getMatrix(), m2);
        ctx.setTransform(m3[0],m3[1],m3[2],m3[3],m3[4],m3[5]);

        var m = _this._matrix;
        if (m) {
            xMin = -xMin;
            yMin = -yMin;
            var m4 = multiplicationMatrix(m2, [1, 0, 0, 1, xMin, yMin]);
            var m5 = multiplicationMatrix(stage.getMatrix(), m4);
            ctx.setTransform(m5[0],m5[1],m5[2],m5[3],m5[4],m5[5]);
        }

        ctx.beginPath();
        ctx.rect(xMin, yMin, width, height);
        return ctx.isPointInPath(x, y);
    }
}

CLS.TextField = TextField;

