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
import { BitBoolean, BitIO, Data } from './BitIO';
import {
    BevelFilter, BitmapFilter, BlurFilter, ColorMatrixFilter,
    ConvolutionFilter, DropShadowFilter, GradientBevelFilter,
    GradientGlowFilter, GlowFilter
} from './BitmapFilter';
import { cacheStore } from './CacheStore';
import { CLS, DisplayObject } from './DisplayObject';
import { PlaceObject } from './PlaceObject';
import { MovieClip } from './MovieClip';
import { Shape } from './Shape';
import { SimpleButton } from './SimpleButton';
import { Stage } from './Stage';
import { TextRecord, StaticText } from './StaticText';
import { TextField } from './TextField';
import { StyleObj, vtc } from './VectorToCanvas';
import {
    Bounds, Color, ColorTransform, Matrix,
    isAlphaBug,
    base64Encode
} from './utils';

type BitFlag<N extends string, T> = { [P in N]: 0 } | ({ [P in N]: 1 } & T);
type BitFlagU<N extends string, T> = ({ [P in N]: 0 } & { [P in keyof T]: undefined })
                                   | ({ [P in N]: 1 } & T);

type SwfHeader = {
    version: number;
    fileSize: number;
    bounds: Bounds;
    frameRate: number;
    frameCount: number;
    bgcolor?: Color;
};

// tags
type ClipActionRecord = any;
type ClipEventFlags = any;
type CSMTextSettings = any;

type DefineButton = {
    ButtonId: number;
    characters: ButtonCharacters;
} & ({
    tagType: TAG.DefineButton;
    actions: ActionScript
} | {
    tagType: TAG.DefineButton2;
    actions: ButtonCondAction[];
    ReservedFlags: number;
    TrackAsMenu: BitBoolean;
});

type ButtonCharacters = { [depth: number]: ButtonRecord[] };
type ButtonRecord = PlaceObjectTag & { // ANY: should be PlaceObjectData
    ButtonStateHitTest: BitBoolean;
    ButtonStateDown: BitBoolean;
    ButtonStateOver: BitBoolean;
    ButtonStateUp: BitBoolean;
    CharacterId: number;
    Depth: number;

    PlaceFlagHasRatio: 0;
    PlaceFlagHasClipDepth: 0;
    Sound: null;
};

type ButtonCondAction = {
    CondIdleToOverDown: BitBoolean;
    CondOutDownToIdle: BitBoolean;
    CondOutDownToOverDown: BitBoolean;
    CondOverDownToOutDown: BitBoolean;
    CondOverDownToOverUp: BitBoolean;
    CondOverUpToOverDown: BitBoolean;
    CondOverUpToIdle: BitBoolean;
    CondIdleToOverUp: BitBoolean;
    CondKeyPress: number;
    CondOverDownToIdle: BitBoolean;

    ActionScript: ActionScript;
}

type DefineButtonSound = {
    ButtonStateUpSoundInfo?: SoundInfo;
    ButtonStateUpSoundId?: number;
    ButtonStateOverSoundInfo?: SoundInfo;
    ButtonStateOverSoundId?: number;
    ButtonStateDownSoundInfo?: SoundInfo;
    ButtonStateDownSoundId?: number;
    ButtonStateHitTestSoundInfo?: SoundInfo;
    ButtonStateHitTestSoundId?: number;
};

type DefineEditText = {
    CharacterId: number;

    HasText: BitBoolean;
    WordWrap: BitBoolean;
    Multiline: BitBoolean;
    Password: BitBoolean;
    ReadOnly: BitBoolean;
    HasTextColor: BitBoolean;
    AutoSize: BitBoolean;
    NoSelect: BitBoolean;
    Border: BitBoolean;
    WasStatic: BitBoolean;
    HTML: BitBoolean;
    UseOutlines: BitBoolean;

    VariableName: string | null;
    InitialText: string | HTMLParagraphElement[];
} & BitFlag<'HasFont', {
    FontID: number;
    FontHeight: number;
    } & BitFlag<'HasFontClass', {
        FontClass: string;
    }>
> & BitFlag<'HasTextColor', {
    TextColor: Color;
}> & BitFlag<'HasMaxLength', {
    MaxLength: number;
}> & BitFlag<'HasLayout', {
    Align: number;
    LeftMargin: number;
    RightMargin: number;
    Indent: number;
    Leading: number;
}>;

type DefineFont_123 = {
    FontId: number;
    GlyphShapeTable: ShapeWithStyle[];
};
type DefineFont_23 = DefineFont_123 & {
    FontFlagsShiftJIS: BitBoolean;
    FontFlagsSmallText: BitBoolean;
    FontFlagsANSI: BitBoolean;
    FontFlagsWideOffsets: BitBoolean;
    FontFlagsWideCodes: BitBoolean;
    FontFlagsItalic: BitBoolean;
    FontFlagsBold: BitBoolean;

    LanguageCode: number;
    FontNameLen: number;
    FontName?: string;

    NumGlyphs: number;
    CodeTableOffset: number;
    CodeTable: number[];
};
type DefineFont_Layout23 = {
    FontAscent: number;
    FontDescent: number;
    FontLeading: number;

    FontAdvanceTable: number[];
    FontBoundsTable: Bounds[];
};
type DefineFont_Layout3 = {
    FontFlagsHasLayout: 1;
    KerningCount: number;
    KerningRecord: Array<{
        FontKerningCode1: number;
        FontKerningCode2: number;
        FontKerningAdjustment: number;
    }>;
};

export type DefineFont = ({ tagType: TAG.DefineFont; } & DefineFont_123)
| ({ tagType: TAG.DefineFont2; }
    & DefineFont_23
    & BitFlag<'FontFlagsHasLayout', DefineFont_Layout23>)
| ({ tagType: TAG.DefineFont3; }
    & DefineFont_23
    & BitFlag<'FontFlagsHasLayout', DefineFont_Layout23 & DefineFont_Layout3>);

type DefineFontAlignZones = {
    CSMTableHint: number;
    ZoneTable: Array<{
        ZoneData: number[];
        Mask: number;
    }>
};

type DefineFontInfo = any;

type DefineMorphShape_12 = {
    CharacterId: number;
    StartBounds: Bounds;
    EndBounds: Bounds;
    MorphFillStyles: MorphFillStyle[];
    MorphLineStyles: MorphLineStyle[];
    StartEdges: ShapeRecord[];
    EndEdges: ShapeRecord[];
};
type DefineMorphShape = ({ tagType: TAG.DefineMorphShape; } & DefineMorphShape_12)
| ({ tagType: TAG.DefineMorphShape2; } & DefineMorphShape_12 & {
    StartEdgeBounds: Bounds;
    EndEdgeBounds: Bounds;
    UsesNonScalingStrokes: BitBoolean;
    UsesScalingStrokes: BitBoolean;
});

type DefineScalingGrid = any;
type DefineSceneAndFrameLabelData = {
    tagType: TAG.DefineSceneAndFrameLabelData;
    SceneCount: number;
    sceneInfo: Array<{
        offset: number;
        name: string;
    }>;

    FrameLabelCount: number;
    frameInfo: Array<{
        num: number;
        label: string;
    }>;
};
const enum SoundRate {
    snd5_5khz = 0,
    snd11khz = 1,
    snd22khz = 2,
    snd44khz = 3
};
const enum SoundSize {
    snd8Bit = 0,
    snd16Bit = 1
};
const enum SoundType {
    sndMono = 0,
    sndStereo = 1
};
const enum SoundFormat {
    RawNativeEndian = 0,
    ADPCM = 1,
    MP3 = 2,
    RawLittleEndian = 3,
    Nellymoser16 = 4,
    Nellymoser8 = 5,
    Nellymoser = 6,
    Speex = 11,
    XAiff = 15
};
type DefineSound = {
    tagType: number;
    SoundId: number;
    SoundFormat: SoundFormat;
    SoundRate: number;
    SoundSize: SoundSize;
    SoundType: SoundType;
    SoundSampleCount: number;
    base64: string;
};
type DefineSprite = {
    tagType: TAG.DefineSprite;
    SpriteId: number;
    FrameCount: number;
    ControlTags: Tags;
};
type DefineText = {
    tagType: TAG_DefineText;
    characterId: number;
    bounds: Bounds;
    matrix: Matrix;
    textRecords: TextRecordData[];
};

const enum CodecID {
    H263 = 2,
    ScreenVideo = 3,
    VP6 = 4,
    VP6Alpha = 5
};
type DefineVideoStream = {
    tagType: TAG.DefineVideoStream;
    CharacterId: number;
    NumFrames: number;
    Width: number;
    Height: number;
    _Reserved: number;
    VideoFlagsDeblocking: number;
    VideoFlagsSmoothing: number;
    CodecID: CodecID;
};
type DoABC = any;
    type Code = any;
    type ClassInfo = {
        cinit: number;
        trait: Trait[];
    };
    type Exception = any;
    type InstanceInfo = any;
    type MethodBodyInfo = any;
    type MethodInfo = any;
    type MetadataInfo = any;
    type MultiNameInfo = {
        kind: 0x07 | 0x0d;
        ns: number;
        name: number;
    } | {
        kind: 0x0F | 0x10;
        name: number;
    } | {
        kind: 0x09 | 0x0E;
        name: number;
        ns_set: number;
    } | {
        kind: 0x1B | 0x1C;
        ns_set: number;
    } | {
        kind: 0x1D;
        param1: number;
        param2: number;
        param3: number;
    };
    type ScriptInfo = {
        init: number;
        trait: Trait[];
    };
    type Trait = any;
type FileAttributes = any;
type FrameLabel = {
    tagType: TAG.FrameLabel;
    name: string;
    frame: number;
};
export type RemoveObject = {
    tagType: TAG.RemoveObject;
    CharacterId: number;
    Depth: number;
} | {
    tagType: TAG.RemoveObject2;
    Depth: number;
};

type PlaceObjectTag_1 = {
    CharacterId: number;
    Depth: number;

    PlaceFlagHasClipActions: false;
    PlaceFlagHasClipDepth: false;
    PlaceFlagHasName: false;
    PlaceFlagHasRatio: false;
    PlaceFlagMove: false;
};

type PlaceObjectTag_23 = {
    PlaceFlagMove: BitBoolean;
    Depth: number;
    ClassName?: string;
} & BitFlagU<'PlaceFlagHasCharacter', {
    CharacterId: number;
}> & BitFlagU<'PlaceFlagHasRatio', {
    Ratio: number;
}> & BitFlag<'PlaceFlagHasName', {
    Name: string;
}> & BitFlagU<'PlaceFlagHasClipDepth', {
    ClipDepth: number;
}> & BitFlagU<'PlaceFlagHasClipActions', {
    AllEventFlags: ClipEventFlags;
    ClipActionRecords: ClipActionRecord;
}>;

type PlaceObjectTag_3 = {
    PlaceFlagOpaqueBackground: BitBoolean;
    PlaceFlagHasImage: BitBoolean;
    PlaceFlagHasClassName: BitBoolean;
} & BitFlag<'PlaceFlagHasCacheAsBitmap', {
    BitmapCache: number;
}> & BitFlag<'PlaceFlagHasVisible', {
    Visible: number;
    BackgroundColor: Color;
}>;

export type PlaceObjectTag = any & PlaceObjectData & // ANY: for speed up compilation
    (({ tagType: TAG.PlaceObject; } & PlaceObjectTag_1)
  | ({ tagType: TAG.PlaceObject2; } & PlaceObjectTag_23)
  | ({ tagType: TAG.PlaceObject3; } & PlaceObjectTag_23 & PlaceObjectTag_3));

type PlaceObjectData = {
} & BitFlagU<'PlaceFlagHasMatrix', {
    Matrix: Matrix;
}> & BitFlagU<'PlaceFlagHasColorTransform', {
    ColorTransform: ColorTransform;
}> & BitFlagU<'PlaceFlagHasBlendMode', {
    BlendMode: number;
}> & BitFlagU<'PlaceFlagHasFilterList', {
    SurfaceFilterList: BitmapFilter[];
}>;

type PlaceObjectTags = {
    [frame: number]: {
        [depth: number]: PlaceObjectTag;
    }
};

export type SoundInfo = {
    SyncStop: BitBoolean;
    SyncNoMultiple: BitBoolean;
} & BitFlag<'HasInPoint', {
    InPoint: number;
}> & BitFlag<'HasOutPoint', {
    OutPoint: number;
}> & BitFlag<'HasLoops', {
    LoopCount: number;
}> & BitFlag<'HasEnvelope', {
    EnvPoints: number;
    EnvelopeRecords: Array<{
        Pos44: number;
        LeftLevel: number;
        RightLevel: number;
    }>;
}>;
type SoundStreamHead = {
    tagType: TAG_SoundStreamHead;
    PlaybackSoundRate: SoundRate;
    PlaybackSoundSize: SoundSize;
    PlaybackSoundType: SoundType;

    StreamSoundCompression: SoundFormat;
    StreamSoundRate: SoundRate;
    StreamSoundSize: SoundSize;
    StreamSoundType: SoundType;
    StreamSoundSampleCount: number;

    LatencySeek?: number;
};

type SoundStreamBlock = any;
export type StartSound = {
    tagType: TAG.StartSound;
    SoundId: number;
    SoundInfo: SoundInfo
} | {
    tagType: TAG.StartSound2;
    SoundId: number;
    SoundClassName: string;
    SoundInfo: SoundInfo
};
type VideoFrame = {
    tagType: TAG.VideoFrame;
    StreamID: number;
    FrameNum: number;
};
type Vp6SwfVideoPacket = string;


export const enum TAG {
    End = 0,
    ShowFrame = 1,
    DefineShape = 2,
    FreeCharacter = 3,
    PlaceObject = 4,
    RemoveObject = 5,
    DefineBits = 6,
    DefineButton = 7,
    JPEGTables = 8,
    SetBackgroundColor = 9,
    DefineFont = 10,
    DefineText = 11,
    DoAction = 12,
    DefineFontInfo = 13,
    DefineSound = 14,
    StartSound = 15,
    StopSound = 16,
    DefineButtonSound = 17,
    SoundStreamHead = 18,
    SoundStreamBlock = 19,
    DefineBitsLossless = 20,
    DefineBitsJPEG2 = 21,
    DefineShape2 = 22,
    DefineButtonCxform = 23,
    Protect = 24,
    PathsArePostScript = 25,
    PlaceObject2 = 26,
    Invalid27 = 27,
    RemoveObject2 = 28,
    SyncFrame = 29,
    Invalid30 = 30,
    FreeAll = 31,
    DefineShape3 = 32,
    DefineText2 = 33,
    DefineButton2 = 34,
    DefineBitsJPEG3 = 35,
    DefineBitsLossless2 = 36,
    DefineEditText = 37,
    DefineVideo = 38,
    DefineSprite = 39,
    NameCharacter = 40,
    ProductInfo = 41,
    DefineTextFormat = 42,
    FrameLabel = 43,
    DefineBehavior = 44,
    SoundStreamHead2 = 45,
    DefineMorphShape = 46,
    FrameTag = 47,
    DefineFont2 = 48,
    GeProSet = 49,
    FontRef = 52,
    DefineFunction = 53,
    PlaceFunction = 54,
    GenTagObject = 55,
    ExportAssets = 56,
    ImportAssets = 57,
    EnableDebugger = 58,
    DoInitAction = 59,
    DefineVideoStream = 60,
    VideoFrame = 61,
    DefineFontInfo2 = 62,
    DebugID = 63,
    EnableDebugger2 = 64,
    ScriptLimits = 65,
    SetTabIndex = 66,
    Invalid67 = 67,
    Invalid68 = 68,
    FileAttributes = 69,
    PlaceObject3 = 70,
    ImportAssets2 = 71,
    DoABC = 72,
    DefineFontAlignZones = 73,
    CSMTextSettings = 74,
    DefineFont3 = 75,
    SymbolClass = 76,
    Metadata = 77,
    DefineScalingGrid = 78,
    Invalid79 = 79,
    Invalid80 = 80,
    Invalid81 = 81,
    DoABC2 = 82,
    DefineShape4 = 83,
    DefineMorphShape2 = 84,
    Invalid85 = 85,
    DefineSceneAndFrameLabelData = 86,
    DefineBinaryData = 87,
    DefineFontName = 88,
    StartSound2 = 89,
    DefineBitsJPEG4 = 90,
    DefineFont4 = 91,
    Invalid92 = 92,
    EnableTelemetry = 93
};

type TAG_DefineBits = TAG.DefineBits
                    | TAG.DefineBitsJPEG2
                    | TAG.DefineBitsJPEG3
                    | TAG.DefineBitsJPEG4;

type TAG_DefineBitsLossless = TAG.DefineBitsLossless
                            | TAG.DefineBitsLossless2;
type TAG_DefineButton = TAG.DefineButton | TAG.DefineButton2;
type TAG_DefineFont = TAG.DefineFont | TAG.DefineFont2 | TAG.DefineFont3;
type TAG_DefineFontInfo = TAG.DefineFontInfo | TAG.DefineFontInfo2;
type TAG_DefineMorphShape = TAG.DefineMorphShape | TAG.DefineMorphShape2;
type TAG_DefineShape = TAG.DefineShape
                     | TAG.DefineShape2
                     | TAG.DefineShape3
                     | TAG.DefineShape4;
type TAG_DefineText = TAG.DefineText | TAG.DefineText2;
type TAG_PlaceObject = TAG.PlaceObject | TAG.PlaceObject2 | TAG.PlaceObject3;
type TAG_RemoveObject = TAG.RemoveObject | TAG.RemoveObject2;
type TAG_SoundStreamHead = TAG.SoundStreamHead | TAG.SoundStreamHead2;
type TAG_StartSound = TAG.StartSound | TAG.StartSound2;

type ActionScript3 = () => any;
type MorphShape = {
    tagType: TAG_DefineMorphShape;
    data: StyleObj[];
    bounds: Bounds;
};

export const enum FillStyleType {
    Solid = 0x00,
    LinearGradient = 0x10,
    RadialGradient = 0x12,
    FocalRadialGradient = 0x13,
    RepeatingBitmap = 0x40,
    ClippedBitmap = 0x41,
    NonSmoothedRepeatingBitmap = 0x42,
    NonSmoothedClippedBitmap = 0x43
};

export type FillStyle = {
    type: FillStyleType.Solid;
    Color: Color;
} | {
    type: FillStyleType.LinearGradient | FillStyleType.RadialGradient;
    gradientMatrix: Matrix;
    gradient: Gradient;
} | {
    type: FillStyleType.FocalRadialGradient;
    gradientMatrix: Matrix;
    gradient: FocalGradient;
} | {
    type: FillStyleType.RepeatingBitmap
        | FillStyleType.ClippedBitmap
        | FillStyleType.NonSmoothedRepeatingBitmap
        | FillStyleType.NonSmoothedClippedBitmap;
    bitmapId: number;
    bitmapMatrix: Matrix;
};

type MorphFillStyle = {
    type: FillStyleType.Solid;
    StartColor: Color;
    EndColor: Color;
} | {
    type: FillStyleType.LinearGradient | FillStyleType.RadialGradient;
    startGradientMatrix: Matrix;
    endGradientMatrix: Matrix;
    gradient: MorphGradient;
} | {
    type: FillStyleType.FocalRadialGradient;
    dump: never;
} | {
    type: FillStyleType.RepeatingBitmap
        | FillStyleType.ClippedBitmap
        | FillStyleType.NonSmoothedRepeatingBitmap
        | FillStyleType.NonSmoothedClippedBitmap;
    bitmapId: number;
    startBitmapMatrix: Matrix;
    endBitmapMatrix: Matrix;
};

export const enum LineStyleType {
   Type1 = 1,
   Type2 = 2
};

const enum CapStyle {
    Round = 0,
    No = 1,
    Square = 2
};

const enum JoinStyle {
    Round = 0,
    Bevel = 1,
    Miter = 2
};

export type LineStyle = {
    type: LineStyleType.Type1;

    Width: number;
    Color: Color;
} | {
    type: LineStyleType.Type2;

    Width: number;
    StartCapStyle: CapStyle;
    JoinStyle: JoinStyle;
    HasFillFlag: BitBoolean;
    NoHScaleFlag: BitBoolean;
    NoVScaleFlag: BitBoolean;
    PixelHintingFlag: BitBoolean;
    _Reserved: number;
    NoClose: BitBoolean;
    EndCapStyle: CapStyle;

    MiterLimitFactor?: number;
    FillType?: FillStyle;
    Color?: Color;
};

type MorphLineStyle = {
    type: LineStyleType.Type1;

    StartWidth: number;
    EndWidth: number;
    StartColor: Color;
    EndColor: Color;
} | {
    type: LineStyleType.Type2;

    StartWidth: number;
    EndWidth: number;

    StartCapStyle: CapStyle;
    JoinStyle: JoinStyle;
    HasFillFlag: BitBoolean;
    NoHScaleFlag: BitBoolean;
    NoVScaleFlag: BitBoolean;
    PixelHintingFlag: BitBoolean;
    _Reserved: number;
    NoClose: BitBoolean;
    EndCapStyle: CapStyle;

    MiterLimitFactor?: number;

    FillType?: MorphFillStyle;
    StartColor?: Color;
    EndColor?: Color;
};

export type CurvedEdgeRecord = {
    isChange: false;
    isCurved: true;

    ControlX: number;
    ControlY: number;
    AnchorX: number;
    AnchorY: number;
};

export type StraightEdgeRecord = {
    isChange: false;
    isCurved: false;

    ControlX: 0;
    ControlY: 0;
    AnchorX: number;
    AnchorY: number;
};

export type StyleChangeRecord = {
    isChange: true;

    StateLineStyle: BitBoolean;
    StateFillStyle1: BitBoolean;
    StateFillStyle0: BitBoolean;
    StateMoveTo: BitBoolean;
    StateNewStyles: BitBoolean;

    FillStyle0: number;
    FillStyle1: number;
    LineStyle: number;

    NumFillBits: number;
    NumLineBits: number;

    MoveX: number;
    MoveY: number;

    FillStyles: FillStyle[];
    LineStyles: LineStyle[];
};

export type ShapeRecord = CurvedEdgeRecord | StraightEdgeRecord | StyleChangeRecord;

export type ShapeWithStyle = {
    fillStyles: FillStyle[];
    lineStyles: LineStyle[];
    ShapeRecords: ShapeRecord[];
};

type GradRecord = {
    Ratio: number;
    Color: Color;
};
type Gradient = {
    SpreadMode: number;
    InterpolationMode: number;
    GradientRecords: GradRecord[];
};

type FocalGradient = Gradient & {
    FocalPoint: number;
};

type MorphGradRecord = {
    StartRatio: number;
    StartColor: Color;
    EndRatio: number;
    EndColor: Color;
};
type MorphGradient = {
    GradientRecords: MorphGradRecord[];
};

type GlyphEntry = {
    GlyphIndex: number;
    GlyphAdvance: number;
};
type TextRecordData = any;


type DefineButtonCharacter = DefineButton & Partial<DefineButtonSound>;
type DefineEditTextCharacter = {
    data: DefineEditText;
    bounds: Bounds;
    tagType: TAG.DefineEditText;
};
type DefineFontCharacter = DefineFont & Partial<DefineFontAlignZones>;
type DefineMorphShapeCharacter = DefineMorphShape;
export type DefineSpriteCharacter = DefineSprite;
type DefineTextCharacter = DefineText;
type DefineVideoStreamCharacter = DefineVideoStream;
type DefineShapeCharacter = {
    tagType: TAG_DefineShape,
    data: StyleObj[];
    bounds: Bounds;
};
type StartSoundCharacter = StartSound;
export type Character = DefineButtonCharacter
                      | DefineEditTextCharacter
                      | DefineFontCharacter
                      | DefineMorphShapeCharacter
                      | DefineSpriteCharacter
                      | DefineTextCharacter
                      | DefineVideoStreamCharacter
                      | DefineShapeCharacter
                      | StartSoundCharacter
                      | CanvasRenderingContext2D;

export type StartSoundTag = {
    tagType: TAG.StartSound | TAG.StartSound2;
    SoundId: number;
    Audio: HTMLAudioElement;
};

export type Tag = ActionScript
                | DefineButton
                | DefineSceneAndFrameLabelData
                | FrameLabel
                | PlaceObjectTag
                | RemoveObject
                | SoundStreamHead
                | StartSoundTag;

type TagObj = {
    characterId: number;
    frame: number;
    cTags: PlaceObjectTag[];
    actionScript: ActionScript[];
    removeTags: RemoveObject[];
    labels: FrameLabel[];
    sounds: StartSoundTag[];
};
type Tags = { [frame: number]: TagObj };

export class SwfTag {
    private static swfId = 0;

    swfId = SwfTag.swfId++;

    private jpegTables?: Data;

    // Stage
    private characters: { [id: number]: Character } = {};
    readonly sounds: { [characterId: number]: DefineSound } = {};
    readonly videos: { [streamId: number]: VideoFrame } = {};
    readonly fonts: { [face: string]: DefineFont } = {};
    readonly symbols: { [characterId: number]: string } = {};
    readonly exportAssets: { [id: string]: number } = {};
    readonly loadSounds: HTMLAudioElement[] = [];
    readonly packages: { [spriteId: number]: 1 } = {};
    readonly registerClass: { [characterId: number]: any }  = {};
    private readonly stageInit: Array<(stage: Stage) => void> = [];

    private header: SwfHeader;
    private tags: Tags;

    private _abcFlag = false;
    imgUnLoadCount = 0;

    constructor(private readonly bitio: BitIO)
    { }

    create(name: string): Stage {
        const stage = new Stage();
        DisplayObject.stages[stage.getId()] = stage;
        stage.build(this, name);
        stage.isLoad = true;
        stage.play();
        return stage;
    }

    get version(): number {
        return this.header.version;
    }

    get abcFlag(): boolean {
        return this._abcFlag;
    }

    parse(characterId: number = 0): void {
        this.header = this.parseSwfHeader();
        this.tags = this.parseTags(this.bitio!.data.length, characterId);
    }

    buildStage(stage: Stage, name?: string): void {
        if (name) {
            const id = this.exportAssets[name];
            if (!id)
                throw new Error(`No export asset with name ${name}`);

            const character = this.getCharacter<DefineSprite>(id);
            if (!character)
                throw new Error(`No character with name ${name} and id ${id}`);

            stage.setBaseWidth(32.40);
            stage.setBaseHeight(68.90);
            stage.setFrameRate(this.header.frameRate);
            stage.backgroundColor = 'transparent';

            for (const f of this.stageInit)
                f(stage);

            this.build(character.ControlTags, stage.getParent(), stage);

            if (!stage.canvas)
                stage.initCanvas();
        } else {
            stage.setBaseWidth(Math.ceil((this.header.bounds.xMax - this.header.bounds.xMin) / 20));
            stage.setBaseHeight(Math.ceil((this.header.bounds.yMax - this.header.bounds.yMin) / 20));
            stage.setFrameRate(this.header.frameRate);

            if (stage.bgcolor) {
                stage.backgroundColor = stage.bgcolor;
            } else {
                const c = this.header.bgcolor;
                const [R, G, B] = c;
                stage.setBackgroundColor(R, G, B);
            }

            for (const f of this.stageInit)
                f(stage);

            this.build(this.tags, stage.getParent(), stage);
        }
    }

    build(tags: Tags, parent: MovieClip, stage: Stage): void {
        const originTags: PlaceObjectTags = {};
        for (const frame in tags)
            this.showFrame(tags[frame], parent, originTags, stage);
    }

    private showFrame(obj: TagObj, mc: MovieClip, originTags: PlaceObjectTags, stage: Stage): void
    {
        const frame = obj.frame;
        const newDepth: { [depth: number]: true } = {};

        if (!(frame in originTags))
            originTags[frame] = [];

        mc.setTotalFrames(Math.max(mc.getTotalFrames(), frame));

        for (const action of obj.actionScript)
            mc.setActions(frame, action);

        for (const label of obj.labels)
            mc.addLabel(label.frame, label.name);

        for (const sound of obj.sounds)
            mc.addSound(frame, sound);

        for (const tag of obj.cTags) {
            newDepth[tag.Depth] = true;
            this.buildTag(frame, tag, mc, originTags, stage);
        }

        if (obj.removeTags.length) {
            mc.setRemoveTag(frame, obj.removeTags);

            for (const rTag of obj.removeTags)
                newDepth[rTag.Depth] = true;
        }

        // copy
        if (frame > 1) {
            const prevFrame = frame - 1;
            const container = mc.container;

            if (!container[prevFrame])
                return;

            const prevTags = container[prevFrame] || [];
            if (!(frame in container))
                container[frame] = [];

            const parentId = mc.instanceId;
            for (let depth in prevTags) {
                if (depth in newDepth)
                    continue;

                container[frame][depth] = prevTags[depth];
                stage.copyPlaceObject(parentId, +depth, frame);
                originTags[frame][depth] = originTags[prevFrame][depth];
            }
        }
    }

    private parseSwfHeader(): SwfHeader
    {
        const bitio = this.bitio;

        const signature = bitio.getHeaderSignature();

        const version = bitio.getUI8();
        const fileSize = bitio.getUI32();

        switch (signature) {
            case "FWS": // No ZIP
                break;
            case "CWS": // ZLIB
                bitio.deCompress(fileSize, "ZLIB");
                break;
            case "ZWS": // TODO LZMA
                alert("not support LZMA");
                //bitio.deCompress(fileSize, "LZMA");
                return undefined;
        }

        const bounds = this.rect();
        const frameRate = bitio.getUI16() / 0x100;
        const frameCount = bitio.getUI16();

        return {
            version,
            fileSize,
            bounds,
            frameRate,
            frameCount
        };
    }

    private buildTag(frame: number,
                     tag: PlaceObjectTag,
                     parent: MovieClip,
                     originTags: PlaceObjectTags,
                     stage: Stage): void
    {
        const container = parent.container;

        if (!(frame in container))
            container[frame] = [];

        let isCopy = true;
        if (tag.tagType !== TAG.PlaceObject && tag.PlaceFlagMove) {
            const oTag: PlaceObjectTag = originTags[frame - 1][tag.Depth];
            if (oTag.tagType === TAG.PlaceObject)
                throw new Error('Old tag has incorrect type');

            if (oTag) {
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

                if (tag.tagType === TAG.PlaceObject3 && oTag.tagType === TAG.PlaceObject3) {
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
        }

        originTags[frame][tag.Depth] = tag;
        var buildObject = this.buildObject(stage, tag, parent, isCopy, frame);
        if (buildObject) {
            var placeObject = this.buildPlaceObject(tag);
            stage.setPlaceObject(placeObject, parent.instanceId, tag.Depth, frame);
            container[frame][tag.Depth] = buildObject.instanceId;
        }
    }

    public buildObject(stage: Stage, tag: PlaceObjectTag, parent: DisplayObject, isCopy: boolean = false, frame?: number): DisplayObject | undefined
    {
        var _this = this;
        var char = this.getCharacter<any>(tag.CharacterId);
        var isMorphShape = false;
        if (char.tagType === TAG.DefineMorphShape || char.tagType === TAG.DefineMorphShape2) {
            isMorphShape = true;
        }

        let obj: DisplayObject;
        if (!isMorphShape && tag.PlaceFlagMove && isCopy) {
            if (!CLS.isDisplayObjectContainer(parent))
                throw new Error('Not a DisplayObjectContainer');
            var id = parent.container[frame - 1][tag.Depth];
            obj = stage.getInstance(id);
        } else {
            switch (char.tagType) {
                case TAG.DefineSprite:
                    obj = _this.buildMovieClip(stage, tag, char, parent);
                    break;
                case TAG.DefineText: // DefineText
                case TAG.DefineText2: // DefineText2
                    obj = _this.buildText(tag, char);
                    break;
                case TAG.DefineEditText: // DefineEditText
                    obj = _this.buildTextField(stage, tag, char, parent);
                    break;
                case TAG.DefineShape:  // DefineShape
                case TAG.DefineShape2: // DefineShape2
                case TAG.DefineShape3: // DefineShape3
                case TAG.DefineShape4: // DefineShape4
                    obj = _this.buildShape(tag, char);
                    break;
                case TAG.DefineMorphShape: // DefineMorphShape
                case TAG.DefineMorphShape2: // DefineMorphShape2
                    const ratio = tag.PlaceFlagHasRatio ? tag.Ratio : 0;
                    var MorphShape = _this.buildMorphShape(char.tagType, char, ratio);
                    obj = _this.buildShape(tag, MorphShape);
                    break;
                case TAG.DefineButton: // DefineButton
                case TAG.DefineButton2: // DefineButton2
                    obj = _this.buildButton(stage, char, tag, parent);
                    break;
                default:
                    return undefined;
            }
            obj.setParent(parent);
            obj.setStage(stage);
            obj.setCharacterId(tag.CharacterId);
            obj.setRatio(tag.PlaceFlagHasRatio ? tag.Ratio || 0 : 0);
            obj.setLevel(tag.Depth);
        }

        if (tag.PlaceFlagHasClipDepth) {
            obj.isClipDepth = true;
            obj.clipDepth = tag.ClipDepth;
        }

        return obj;
    }

    private buildPlaceObject(tag: PlaceObjectData): PlaceObject
    {
        const placeObject = new PlaceObject();

        if (tag.PlaceFlagHasMatrix)
            placeObject.setMatrix(tag.Matrix);

        if (tag.PlaceFlagHasColorTransform)
            placeObject.setColorTransform(tag.ColorTransform);

        if (tag.PlaceFlagHasFilterList)
            placeObject.setFilters(tag.SurfaceFilterList);

        if (tag.PlaceFlagHasBlendMode)
            placeObject.setBlendMode(tag.BlendMode);

        return placeObject;
    }


    private buildMovieClip(stage: Stage, tag: PlaceObjectTag, character: DefineSpriteCharacter, parent: DisplayObject): MovieClip
    {
        var mc = new MovieClip();
        mc.setStage(stage);
        mc._url = parent._url;
        var target = "instance" + mc.instanceId;
        if (tag.PlaceFlagHasName) {
            mc.setName(tag.Name);
            target = tag.Name;
        }
        mc.setTarget(parent.getTarget() + "/" + target);
        this.build(character.ControlTags, mc, stage);

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
    }

    private buildTextField(stage: Stage, tag: PlaceObjectTag, character: DefineEditTextCharacter, parent: DisplayObject): TextField
    {
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
        var fontId = 0;
        if (data.HasFont) {
            textField.fontId = data.FontID;
            textField.fontScale = data.FontHeight / 1024;

            fontData = this.getCharacter<DefineFontCharacter>(fontId);
            if (fontData && fontData.ZoneTable) {
                textField.fontScale /= 20;
            }
        }

        textField.initialText = data.InitialText as any;
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
        if (data.HasTextColor)
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

        if (data.HasFont)
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
    }

    private buildText(tag: PlaceObjectTag, character: DefineTextCharacter): StaticText
    {
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
                var fontData = this.getCharacter<DefineFontCharacter>(fontId);
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
    }

    private buildShape(tag: PlaceObjectTag,
                       character: DefineShapeCharacter | MorphShape): Shape
    {
        var shape = new Shape();
        shape.setTagType(character.tagType);
        shape.setBounds(character.bounds);
        shape.setData(character.data);
        return shape;
    }

    private buildButton(stage: Stage,
                        character: DefineButtonCharacter,
                        tag: PlaceObjectTag,
                        parent: DisplayObject): SimpleButton
    {
        var _this = this;
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
                var obj = _this.buildObject(stage, bTag, button, false, 1);
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
    }

    private generateDefaultTagObj(frame: number, characterId: number): TagObj
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
    }

    private parseTags(dataLength: number, characterId: number): Tags
    {
        const tags: Tags = {};
        const bitio = this.bitio;

        let frame = 1;
        // default set
        tags[frame] = this.generateDefaultTagObj(frame, characterId);

        while (bitio.byte_offset < dataLength) {
            var tagStartOffset = bitio.byte_offset;
            if (tagStartOffset + 2 > dataLength) {
                break;
            }

            var tagLength = bitio.getUI16();
            const tagType = tagLength >> 6;

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
            if (tagType === TAG.ShowFrame) {
                frame++;
                if (dataLength > tagDataStartOffset + 2) {
                    tags[frame] = this.generateDefaultTagObj(frame, characterId);
                }
            }

            var tag = this.parseTag(tagType, length);

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

            if (tag)
                this.addTag(tags[frame], tagType, tag, frame);

            bitio.bit_offset = 0;
        }

        return tags;
    }

    private parseTag(tagType: TAG, length: number): Tag
    {
        var _this = this;
        var obj = null;
        var bitio = _this.bitio;

        switch (tagType) {
            default: // null
                ((x: never) => {
                    console.log('ERROR UNKNOWN TAG ' + x);
                })(tagType);
                break;

            case TAG.End: // End
                break;

            case TAG.ShowFrame: // ShowFrame
                break;

            case TAG.DefineShape:  // DefineShape
            case TAG.DefineShape2: // DefineShape2
            case TAG.DefineShape3: // DefineShape3
            case TAG.DefineShape4: // DefineShape4
                if (length < 10) {
                    bitio.byte_offset += length;
                } else {
                    _this.parseDefineShape(tagType);
                }
                break;

            case TAG.SetBackgroundColor: // BackgroundColor
                this.header.bgcolor = this.rgb();
                break;

            case TAG.DefineFont: // DefineFont
            case TAG.DefineFont2: // DefineFont2
            case TAG.DefineFont3: // DefineFont3
                _this.parseDefineFont(tagType, length);
                break;

            case TAG.DefineFontInfo: // DefineFontInfo
            case TAG.DefineFontInfo2: // DefineFontInfo2
                _this.parseDefineFontInfo(tagType, length);
                break;

            case TAG.DefineText: // DefineText
            case TAG.DefineText2: // DefineText2
                _this.parseDefineText(tagType);
                break;

            case TAG.PlaceObject: // PlaceObject
            case TAG.PlaceObject2: // PlaceObject2
            case TAG.PlaceObject3: //PlaceObject3
                obj = _this.parsePlaceObject(tagType, length);
                break;

            case TAG.DefineEditText: // DefineEditText
                _this.parseDefineEditText(tagType);
                break;

            case TAG.DefineSprite: // DefineSprite
                _this.parseDefineSprite(tagType, bitio.byte_offset + length);
                break;

            case TAG.DoAction: // DoAction
                obj = _this.parseDoAction(length);
                break;

            case TAG.DoInitAction: // DoInitAction
                _this.parseDoInitAction(length);
                break;

            case TAG.RemoveObject: // RemoveObject
            case TAG.RemoveObject2: // RemoveObject2
                obj = _this.parseRemoveObject(tagType);
                break;

            case TAG.DefineButton: // DefineButton
            case TAG.DefineButton2: // DefineButton2
                obj = _this.parseDefineButton(tagType, length);
                break;

            case TAG.FrameLabel: // FrameLabel
                obj = _this.parseFrameLabel(tagType);
                break;

            case TAG.DefineFontName: // DefineFontName
                _this.parseDefineFontName();
                break;

            case TAG.DefineBitsLossless: // DefineBitsLossless
            case TAG.DefineBitsLossless2: // DefineBitsLossless2
                _this.parseDefineBitsLossLess(tagType, length);
                break;

            case TAG.DefineBits: // DefineBits
            case TAG.DefineBitsJPEG2: // DefineBitsJPEG2
            case TAG.DefineBitsJPEG3: // DefineBitsJPEG3
            case TAG.DefineBitsJPEG4: // DefineBitsJPEG4
                _this.parseDefineBits(tagType, length, _this.jpegTables);
                _this.jpegTables = null;
                break;

            case TAG.JPEGTables: // JPEGTables
                _this.jpegTables = _this.parseJPEGTables(length);
                break;

            case TAG.ExportAssets: // ExportAssets
                _this.parseExportAssets();
                break;

            case TAG.DefineMorphShape: // DefineMorphShape
            case TAG.DefineMorphShape2: // DefineMorphShape2
                _this.parseDefineMorphShape(tagType);
                break;

            case TAG.NameCharacter: // NameCharacter
                bitio.getDataUntil("\0"); // NameCharacter
                break;

            case TAG.Protect: // Protect
                bitio.byteAlign();
                break;

            case TAG.DebugID: // DebugID
                bitio.getUI8(); // UUID
                break;

            case TAG.EnableDebugger2: // EnableDebugger2
                bitio.getUI16(); // Reserved
                bitio.getDataUntil("\0"); // Password
                break;

            case TAG.ScriptLimits: // ScriptLimits
                bitio.getUI16(); // MaxRecursionDepth
                bitio.getUI16(); // ScriptTimeoutSeconds
                break;

            case TAG.FileAttributes: // FileAttributes
                _this.parseFileAttributes();
                break;

            case TAG.Metadata: // MetaData
                bitio.getDataUntil("\0"); // MetaData
                break;

            case TAG.DefineSceneAndFrameLabelData: // DefineSceneAndFrameLabelData
                obj = _this.parseDefineSceneAndFrameLabelData(tagType);
                break;

            case TAG.SoundStreamHead: // SoundStreamHead
            case TAG.SoundStreamHead2: // SoundStreamHead2
                obj = _this.parseSoundStreamHead(tagType);
                break;

            case TAG.DoABC: // DoABC
            case TAG.DoABC2: // DoABC2
                _this.parseDoABC(tagType, length);
                break;

            case TAG.SymbolClass: // SymbolClass
                _this.parseSymbolClass();
                break;

            case TAG.DefineSound: // DefineSound
                _this.parseDefineSound(tagType, length);
                break;

            case TAG.StartSound: // StartSound
            case TAG.StartSound2: // StartSound2
                obj = _this.parseStartSound(tagType);
                break;

            case TAG.DefineButtonSound: // DefineButtonSound
                _this.parseDefineButtonSound();
                break;

            case TAG.DefineFontAlignZones: // DefineFontAlignZones
                _this.parseDefineFontAlignZones();
                break;

            case TAG.CSMTextSettings: // CSMTextSettings
                _this.parseCSMTextSettings(tagType);
                break;

            case TAG.SoundStreamBlock: // SoundStreamBlock
                _this.parseSoundStreamBlock(tagType, length);
                break;

            case TAG.DefineVideoStream: // DefineVideoStream
                _this.parseDefineVideoStream(tagType);
                break;

            case TAG.VideoFrame: // VideoFrame
                _this.parseVideoFrame(tagType, length);
                break;

            case TAG.DefineScalingGrid: // DefineScalingGrid
                _this.parseDefineScalingGrid();
                break;

            case TAG.ProductInfo: // ProductInfo
                bitio.getUI32(); // ProductID
                bitio.getUI32(); // Edition
                bitio.getUI8(); // MajorVersion
                bitio.getUI8(); // MinorVersion
                bitio.getUI32(); // BuildLow
                bitio.getUI32(); // BuildHigh
                bitio.getUI32(); // CompilationDate
                bitio.getUI32(); // TODO
                break;

            case TAG.FreeCharacter:
            case TAG.StopSound:
            case TAG.DefineButtonCxform:
            case TAG.PathsArePostScript:
            case TAG.SyncFrame:
            case TAG.FreeAll:
            case TAG.DefineVideo:
            case TAG.DefineTextFormat:
            case TAG.DefineBehavior:
            case TAG.FrameTag:
            case TAG.GeProSet:
            case TAG.FontRef:
            case TAG.DefineFunction:
            case TAG.PlaceFunction:
            case TAG.GenTagObject:
            case TAG.ImportAssets:
            case TAG.EnableDebugger:
            case TAG.SetTabIndex:
            case TAG.ImportAssets2:
            case TAG.DefineBinaryData:
            case TAG.DefineFont4:
            case TAG.EnableTelemetry:
                console.log("[base] tagType -> " + tagType);
                break;

            case TAG.Invalid27: // 27 (invalid)
            case TAG.Invalid30: // 30 (invalid)
            case TAG.Invalid67: // 67 (invalid)
            case TAG.Invalid68: // 68 (invalid)
            case TAG.Invalid79: // 79 (invalid)
            case TAG.Invalid80: // 80 (invalid)
            case TAG.Invalid81: // 81 (invalid)
            case TAG.Invalid85: // 85 (invalid)
            case TAG.Invalid92: // 92 (invalid)
                console.log("ERROR TAG" + tagType);
                break;
        }

        return obj;
    }

    private addTag(tagObj: TagObj, tagType: Tag['tagType'], tag: Tag, frame: number): void
    {
        if (tag.tagType !== tagType) throw new Error(`Different tagType: ${tag.tagType} !== ${tagType}`);

        switch (tagType) {
            case TAG.PlaceObject:
            case TAG.PlaceObject2:
            case TAG.PlaceObject3:
                tagObj.cTags.push(tag);
                break;

            case TAG.DoAction:
                tagObj.actionScript.push(tag);
                break;

            case TAG.RemoveObject:
            case TAG.RemoveObject2:
                tagObj.removeTags.push(tag);
                break;

            case TAG.FrameLabel:
                tag.frame = frame; // ANY
                tagObj.labels.push(tag);
                break;

            case TAG.StartSound:
            case TAG.StartSound2:
                tagObj.sounds.push(tag);
                break;
        }
    }

    private parseDefineShape(tagType: TAG_DefineShape): void
    {
        const characterId = this.bitio.getUI16();
        const bounds = this.rect();

        if (tagType === TAG.DefineShape4) {
            this.rect();        // EdgeBounds
            this.bitio.getUIBits(5); // Reserved
            this.bitio.getUIBits(1); // UsesFillWindingRule
            this.bitio.getUIBits(1); // UsesNonScalingStrokes
            this.bitio.getUIBits(1); // UsesScalingStrokes
        }

        const shapes = this.shapeWithStyle(tagType);
        const data = vtc.convert(shapes, false);

        this.setCharacter<DefineShapeCharacter>(characterId, { tagType, data, bounds });
    }

    public rect(): Bounds
    {
        this.bitio.byteAlign();

        const nBits = this.bitio.getUIBits(5);
        const xMin = this.bitio.getSIBits(nBits);
        const xMax = this.bitio.getSIBits(nBits);
        const yMin = this.bitio.getSIBits(nBits);
        const yMax = this.bitio.getSIBits(nBits);
        return Bounds.new(xMin, yMin, xMax, yMax);
    }

    private fillStyleArray(tagType: TAG_DefineShape): FillStyle[]
    {
        let fillStyleCount = this.bitio.getUI8();
        if (tagType !== TAG.DefineShape && fillStyleCount === 0xff)
            fillStyleCount = this.bitio.getUI16();

        const fillStyles: FillStyle[] = [];
        while (fillStyleCount--)
            fillStyles.push(this.fillStyle(tagType));

        return fillStyles;
    }

    private morphFillStyleArray(): MorphFillStyle[]
    {
        let fillStyleCount = this.bitio.getUI8();
        if (fillStyleCount === 0xff)
            fillStyleCount = this.bitio.getUI16();

        const fillStyles: MorphFillStyle[] = [];
        while (fillStyleCount--)
            fillStyles.push(this.morphFillStyle());

        return fillStyles;
    }

    private fillStyle(tagType: TAG_DefineShape): FillStyle
    {
        const type = this.bitio.getUI8() as FillStyleType;
        switch (type) {
            case FillStyleType.Solid:
                if (tagType === TAG.DefineShape3 || tagType === TAG.DefineShape4)
                    return { type, Color: this.rgba() };

                return { type, Color: this.rgb() };

            case FillStyleType.LinearGradient:
            case FillStyleType.RadialGradient:
                return {
                    type,
                    gradientMatrix: this.matrix(),
                    gradient: this.gradient(tagType)
                };

            case FillStyleType.FocalRadialGradient:
                return {
                    type,
                    gradientMatrix: this.matrix(),
                    gradient: this.focalGradient(tagType)
                };

            case FillStyleType.RepeatingBitmap:
            case FillStyleType.ClippedBitmap:
            case FillStyleType.NonSmoothedRepeatingBitmap:
            case FillStyleType.NonSmoothedClippedBitmap:
                return {
                    type,
                    bitmapId: this.bitio.getUI16(),
                    bitmapMatrix: this.matrix()
                };

            default:
                ((x: never) => {})(type);
        }
    }

    private morphFillStyle(): MorphFillStyle
    {
        const type = this.bitio.getUI8() as FillStyleType;
        switch (type) {
            case FillStyleType.Solid:
                return {
                    type,
                    StartColor: this.rgba(),
                    EndColor: this.rgba()
                };

            case FillStyleType.LinearGradient:
            case FillStyleType.RadialGradient:
                return {
                    type,
                    startGradientMatrix: this.matrix(),
                    endGradientMatrix: this.matrix(),
                    gradient: this.morphGradient(),
                };

            case FillStyleType.RepeatingBitmap:
            case FillStyleType.ClippedBitmap:
            case FillStyleType.NonSmoothedRepeatingBitmap:
            case FillStyleType.NonSmoothedClippedBitmap:
                return {
                    type,
                    bitmapId: this.bitio.getUI16(),
                    startBitmapMatrix: this.matrix(),
                    endBitmapMatrix: this.matrix()
                };

            case FillStyleType.FocalRadialGradient:
                throw new Error('FocalRadialGradient in morphFillStyle');

            default:
                ((x: never) => {})(type);
        }
    }

    private rgb(): Color
    {
        const bitio = this.bitio;
        return [
            bitio.getUI8(),
            bitio.getUI8(),
            bitio.getUI8(),
            1
        ];
    }

    private rgba(): Color
    {
        const bitio = this.bitio;

        return [
            bitio.getUI8(),
            bitio.getUI8(),
            bitio.getUI8(),
            bitio.getUI8() / 255
        ];
    }

    private matrix(): Matrix
    {
        const bitio = this.bitio;
        const result: Matrix = [1, 0, 0, 1, 0, 0];

        bitio.byteAlign();

        if (this.bitio.getUIBit()) {
            const nScaleBits = bitio.getUIBits(5);
            result[0] = bitio.getSIBits(nScaleBits) / 0x10000;
            result[3] = bitio.getSIBits(nScaleBits) / 0x10000;
        }

        if (bitio.getUIBit()) {
            const nRotateBits = bitio.getUIBits(5);
            result[1] = bitio.getSIBits(nRotateBits) / 0x10000;
            result[2] = bitio.getSIBits(nRotateBits) / 0x10000;
        }

        const nTranslateBits = bitio.getUIBits(5);
        result[4] = bitio.getSIBits(nTranslateBits);
        result[5] = bitio.getSIBits(nTranslateBits);

        return result;
    }

    private gradient(tagType: TAG_DefineShape): Gradient
    {
        const bitio = this.bitio;

        bitio.byteAlign();

        const SpreadMode = bitio.getUIBits(2);
        const InterpolationMode = bitio.getUIBits(2);
        let NumGradients = bitio.getUIBits(4);

        const GradientRecords: GradRecord[] = [];
        while (NumGradients--)
            GradientRecords.push(this.gradRecord(tagType));

        return { SpreadMode, InterpolationMode, GradientRecords };
    }

    private gradRecord(tagType: TAG_DefineShape): GradRecord
    {
        if (tagType === TAG.DefineShape || tagType === TAG.DefineShape2) {
            return {
                Ratio: this.bitio.getUI8() / 255,
                Color: this.rgb()
            };
        }

        return {
            Ratio: this.bitio.getUI8() / 255,
            Color: this.rgba()
        };
    }

    private focalGradient(tagType: TAG_DefineShape): FocalGradient
    {
        const bitio = this.bitio;

        bitio.byteAlign();

        const SpreadMode = bitio.getUIBits(2);
        const InterpolationMode = bitio.getUIBits(2);
        let numGradients = bitio.getUIBits(4);

        const GradientRecords: GradRecord[] = [];
        while (numGradients--)
            GradientRecords.push(this.gradRecord(tagType));

        const FocalPoint = bitio.getFloat16();

        return { SpreadMode, InterpolationMode, GradientRecords, FocalPoint };
    }

    private morphGradient(): MorphGradient
    {
        const bitio = this.bitio;

        bitio.byteAlign();

        let NumGradients = bitio.getUI8();

        const GradientRecords: MorphGradRecord[] = [];
        while (NumGradients--)
            GradientRecords.push(this.morphGradRecord());

        return { GradientRecords };
    }

    private morphGradRecord(): MorphGradRecord
    {
        const bitio = this.bitio;
        return {
            StartRatio: bitio.getUI8() / 255,
            StartColor: this.rgba(),
            EndRatio: bitio.getUI8() / 255,
            EndColor: this.rgba()
        };
    }

    private lineStyleArray(tagType: TAG_DefineShape): LineStyle[]
    {
        const bitio = this.bitio;

        let LineStyleCount = bitio.getUI8();
        if ((tagType !== TAG.DefineShape) && (LineStyleCount === 0xff))
            LineStyleCount = bitio.getUI16();

        const LineStyles = [];
        while (LineStyleCount--)
            LineStyles.push(this.lineStyle(tagType));

        return LineStyles;
    }

    private morphLineStyleArray(tagType: TAG_DefineMorphShape): MorphLineStyle[]
    {
        const bitio = this.bitio;

        let LineStyleCount = bitio.getUI8();
        if (LineStyleCount === 0xff)
            LineStyleCount = bitio.getUI16();

        const LineStyles = [];
        while (LineStyleCount--)
            LineStyles.push(this.morphLineStyle(tagType));

        return LineStyles;
    }

    private lineStyle(tagType: TAG_DefineShape): LineStyle
    {
        const bitio = this.bitio;

        if (tagType !== TAG.DefineShape4) {
            return {
                type: LineStyleType.Type1,
                Width: bitio.getUI16(),
                Color: (tagType === TAG.DefineShape3) ? this.rgba() : this.rgb()
            };
        } else {
            let JoinStyle, HasFillFlag;

            return {
                type: LineStyleType.Type2,
                Width: bitio.getUI16(),
                StartCapStyle: bitio.getUIBits(2),
                JoinStyle: (JoinStyle = bitio.getUIBits(2)),
                HasFillFlag: (HasFillFlag = bitio.getUIBit()),
                NoHScaleFlag: bitio.getUIBit(),
                NoVScaleFlag: bitio.getUIBit(),
                PixelHintingFlag: bitio.getUIBit(),
                _Reserved: bitio.getUIBits(5),
                NoClose: bitio.getUIBit(),
                EndCapStyle: bitio.getUIBits(2),
                MiterLimitFactor: (JoinStyle === 2) ? bitio.getUI16() : undefined,
                FillType: HasFillFlag ? this.fillStyle(tagType) : undefined,
                Color: HasFillFlag ? undefined : this.rgba()
            };
        }
    }

    private morphLineStyle(tagType: TAG_DefineMorphShape): MorphLineStyle
    {
        const bitio = this.bitio;

        if (tagType === TAG.DefineMorphShape) {
            return {
                type: LineStyleType.Type1,
                StartWidth: bitio.getUI16(),
                EndWidth: bitio.getUI16(),
                StartColor: this.rgba(),
                EndColor: this.rgba()
            };
        } else {
            let JoinStyle, HasFillFlag;
            return {
                type: LineStyleType.Type2,
                StartWidth: bitio.getUI16(),
                EndWidth: bitio.getUI16(),

                StartCapStyle: bitio.getUIBits(2),
                JoinStyle: (JoinStyle = bitio.getUIBits(2)),
                HasFillFlag: (HasFillFlag = bitio.getUIBit()),
                NoHScaleFlag: bitio.getUIBit(),
                NoVScaleFlag: bitio.getUIBit(),
                PixelHintingFlag: bitio.getUIBit(),
                _Reserved: bitio.getUIBits(5),
                NoClose: bitio.getUIBit(),
                EndCapStyle: bitio.getUIBits(2),
                MiterLimitFactor: (JoinStyle === 2) ? bitio.getUI16() : undefined,
                FillType: HasFillFlag ? this.morphFillStyle() : undefined,
                StartColor: HasFillFlag ? undefined : this.rgba(),
                EndColor: HasFillFlag ? undefined : this.rgba()
            };
        }
    }

    private shapeWithStyle(tagType: TAG_DefineShape): ShapeWithStyle
    {
        return {
            fillStyles: this.fillStyleArray(tagType),
            lineStyles: this.lineStyleArray(tagType),
            ShapeRecords: this.shape(tagType)
        };
    }

    private shape(tagType: TAG_DefineShape): ShapeRecord[]
    {
        const numBits = this.bitio.getUI8();
        const currentNumBits = {
            FillBits: numBits >> 4,
            LineBits: numBits & 0x0f
        };

        return this.shapeRecords(tagType, currentNumBits);
    }

    private shapeRecords(tagType: TAG_DefineShape,
                         currentNumBits: {
                            FillBits: number;
                            LineBits: number;
                         }): ShapeRecord[]
    {
        const bitio = this.bitio;
        const shapeRecords = [];

        while (true) {
            const first6Bits = bitio.getUIBits(6);

            let shape;
            if (first6Bits & 0x20) {
                const numBits = first6Bits & 0x0f;
                if (first6Bits & 0x10) {
                    shape = this.straightEdgeRecord(numBits);
                } else {
                    shape = this.curvedEdgeRecord(numBits);
                }
            } else if (first6Bits) {
                shape = this.styleChangeRecord(tagType, first6Bits, currentNumBits);
            }

            shapeRecords.push(shape);

            if (!shape)
                break;
        }

        bitio.byteAlign();

        return shapeRecords;
    }

    private straightEdgeRecord(numBits: number): StraightEdgeRecord
    {
        const bitio = this.bitio;

        let DeltaX;
        let DeltaY;
        const GeneralLineFlag = bitio.getUIBit();
        if (GeneralLineFlag) {
            DeltaX = bitio.getSIBits(numBits + 2);
            DeltaY = bitio.getSIBits(numBits + 2);
        } else {
            const VertLineFlag = bitio.getUIBit();
            if (VertLineFlag) {
                DeltaX = 0;
                DeltaY = bitio.getSIBits(numBits + 2);
            } else {
                DeltaX = bitio.getSIBits(numBits + 2);
                DeltaY = 0;
            }
        }

        return {
            isChange: false,
            isCurved: false,
            ControlX: 0,
            ControlY: 0,
            AnchorX: DeltaX,
            AnchorY: DeltaY
        };
    }

    private curvedEdgeRecord(numBits: number): CurvedEdgeRecord
    {
        const bitio = this.bitio;

        const controlDeltaX = bitio.getSIBits(numBits + 2);
        const controlDeltaY = bitio.getSIBits(numBits + 2);
        const anchorDeltaX = bitio.getSIBits(numBits + 2);
        const anchorDeltaY = bitio.getSIBits(numBits + 2);

        return {
            isChange: false,
            isCurved: true,
            ControlX: controlDeltaX,
            ControlY: controlDeltaY,
            AnchorX: anchorDeltaX + controlDeltaX,
            AnchorY: anchorDeltaY + controlDeltaY
        };
    }

    private styleChangeRecord(tagType: TAG_DefineShape,
                              changeFlag: number,
                              currentNumBits: {
                                FillBits: number;
                                LineBits: number;
                              }): StyleChangeRecord
    {
        const bitio = this.bitio;
        const obj = { isChange: true } as StyleChangeRecord;

        obj.StateNewStyles = ((changeFlag >> 4) & 1) as BitBoolean;
        obj.StateLineStyle = ((changeFlag >> 3) & 1) as BitBoolean;
        obj.StateFillStyle1 = ((changeFlag >> 2) & 1) as BitBoolean;
        obj.StateFillStyle0 = ((changeFlag >> 1) & 1) as BitBoolean;
        obj.StateMoveTo = (changeFlag & 1) as BitBoolean;

        if (obj.StateMoveTo) {
            const moveBits = bitio.getUIBits(5);
            obj.MoveX = bitio.getSIBits(moveBits);
            obj.MoveY = bitio.getSIBits(moveBits);
        }

        obj.FillStyle0 = 0;
        if (obj.StateFillStyle0)
            obj.FillStyle0 = bitio.getUIBits(currentNumBits.FillBits);

        obj.FillStyle1 = 0;
        if (obj.StateFillStyle1)
            obj.FillStyle1 = bitio.getUIBits(currentNumBits.FillBits);

        obj.LineStyle = 0;
        if (obj.StateLineStyle)
            obj.LineStyle = bitio.getUIBits(currentNumBits.LineBits);

        if (obj.StateNewStyles) {
            obj.FillStyles = this.fillStyleArray(tagType);
            obj.LineStyles = this.lineStyleArray(tagType);

            const numBits = bitio.getUI8();
            currentNumBits.FillBits = obj.NumFillBits = numBits >> 4;
            currentNumBits.LineBits = obj.NumLineBits = numBits & 0x0f;
        }
        return obj;
    }

    private parseDefineBitsLossLess(tagType: TAG_DefineBitsLossless, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var startOffset = bitio.byte_offset;
        var CharacterId = bitio.getUI16();
        var format = bitio.getUI8();
        var width = bitio.getUI16();
        var height = bitio.getUI16();

        var isAlpha = (tagType === TAG.DefineBitsLossless2);
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
        this.setCharacter<CanvasRenderingContext2D>(CharacterId, imageContext);
    }

    private parseExportAssets(): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var count = bitio.getUI16();

        while (count--) {
            var id = bitio.getUI16();
            var name = bitio.getDataUntil("\0");
            if (name.substr(0, 10) === "__Packages") {
                this.packages[id] = 1;
            }
            this.exportAssets[name] = id;
        }
    };

    private parseJPEGTables(length: number): Data
    {
        return this.bitio.getData(length);
    }

    private parseDefineBits(tagType: TAG_DefineBits, length: number, jpegTables: Data): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var startOffset = bitio.byte_offset;
        var CharacterId = bitio.getUI16();
        var sub = bitio.byte_offset - startOffset;

        var ImageDataLen = length - sub;
        if (tagType === TAG.DefineBitsJPEG3 || tagType === TAG.DefineBitsJPEG4) {
            ImageDataLen = bitio.getUI32();
        }

        if (tagType === TAG.DefineBitsJPEG4) {
            var DeblockParam = bitio.getUI16();
            console.log("DeblockParam", DeblockParam);
        }

        var JPEGData = bitio.getData(ImageDataLen);
        var BitmapAlphaData: Data;
        if (tagType === TAG.DefineBitsJPEG3 || tagType === TAG.DefineBitsJPEG4) {
            BitmapAlphaData =
                bitio.getData(length - sub - ImageDataLen);
        }
        bitio.byte_offset = startOffset + length;

        // render
        this.imgUnLoadCount++;
        var image = document.createElement("img");
        image.addEventListener("load", () => {
            var width = image.width;
            var height = image.height;
            var canvas = cacheStore.getCanvas();
            canvas.width = width;
            canvas.height = height;
            var imageContext = canvas.getContext("2d");
            imageContext.drawImage(image, 0, 0, width, height);

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

            this.setCharacter<CanvasRenderingContext2D>(CharacterId, imageContext);
            this.imgUnLoadCount--;
        });

        if (jpegTables && jpegTables.length > 4) {
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

        image.src = "data:image/jpeg;base64," + base64Encode(_this.parseJpegData(JPEGData));

        // for android bug
        setTimeout(function () {}, 0);
    }

    public parseJpegData(JPEGData: Data): string
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
    }

    private parseDefineFont(tagType: TAG_DefineFont, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var endOffset = bitio.byte_offset + length;
        var i = 0;
        var len = 0;
        var obj = {} as DefineFont;
        obj.tagType = tagType;
        obj.FontId = bitio.getUI16();

        var numGlyphs = 0;
        if (obj.tagType === TAG.DefineFont2 || obj.tagType === TAG.DefineFont3) {
            var fontFlags = bitio.getUI8();
            obj.FontFlagsHasLayout = ((fontFlags >>> 7) & 1) as BitBoolean;
            obj.FontFlagsShiftJIS = ((fontFlags >>> 6) & 1) as BitBoolean;
            obj.FontFlagsSmallText = ((fontFlags >>> 5) & 1) as BitBoolean;
            obj.FontFlagsANSI = ((fontFlags >>> 4) & 1) as BitBoolean;
            obj.FontFlagsWideOffsets = ((fontFlags >>> 3) & 1) as BitBoolean;
            obj.FontFlagsWideCodes = ((fontFlags >>> 2) & 1) as BitBoolean;
            obj.FontFlagsItalic = ((fontFlags >>> 1) & 1) as BitBoolean;
            obj.FontFlagsBold = ((fontFlags) & 1) as BitBoolean;
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
        if (obj.tagType === TAG.DefineFont) {
            numGlyphs = bitio.getUI16();
        }

        if (numGlyphs) {
            var OffsetTable = [];
            if (obj.tagType === TAG.DefineFont) {
                OffsetTable.push(numGlyphs);
                numGlyphs /= 2;
                numGlyphs--;
            }

            if (obj.tagType !== TAG.DefineFont && obj.FontFlagsWideOffsets) {
                for (i = numGlyphs; i--;) {
                    OffsetTable.push(bitio.getUI32());
                }

                obj.CodeTableOffset = bitio.getUI32();
            } else {
                for (i = numGlyphs; i--;) {
                    OffsetTable.push(bitio.getUI16());
                }
                if (obj.tagType !== TAG.DefineFont) {
                    obj.CodeTableOffset = bitio.getUI16();
                }
            }

            // Shape
            var GlyphShapeTable = [];
            if (obj.tagType === TAG.DefineFont) {
                numGlyphs++;
            }

            for (i = 0; i < numGlyphs; i++) {
                bitio.setOffset(OffsetTable[i] + offset, 0);

                var shapes = {} as ShapeWithStyle;
                shapes.ShapeRecords = _this.shape(TAG.DefineShape);
                shapes.lineStyles = [{
                    type: LineStyleType.Type1,
                    Color: [0, 0, 0, 1],
                    Width: 0
                }];
                shapes.fillStyles = [{
                    type: FillStyleType.Solid,
                    Color: [0, 0, 0, 1]
                }];

                GlyphShapeTable.push(shapes);
            }
            obj.GlyphShapeTable = GlyphShapeTable;

            if (obj.tagType === TAG.DefineFont2 || obj.tagType === TAG.DefineFont3) {
                bitio.setOffset(obj.CodeTableOffset + offset, 0);
                var CodeTable = [];
                if (obj.FontFlagsWideCodes) {
                    for (i = numGlyphs; i--;) {
                        CodeTable.push(bitio.getUI16());
                    }
                } else {
                    for (i = numGlyphs; i--;) {
                        CodeTable.push(bitio.getUI8());
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

                    if (obj.tagType === TAG.DefineFont3) {
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
        this.setCharacter<DefineFontCharacter>(obj.FontId, obj);

        if (obj.tagType !== TAG.DefineFont)
            this.fonts[obj.FontName] = obj;
    }

    private parseDefineFontInfo(tagType: TAG_DefineFontInfo, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var endOffset = bitio.byte_offset + length;

        var obj = {} as DefineFontInfo;
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
        if (tagType === TAG.DefineFontInfo2) {
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
        if (obj.FontFlagsWideCodes || tagType === TAG.DefineFontInfo2) {
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

        // not supported
    }

    private getFontName(fontName: string): string
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
    }

    private parseDefineFontName(): void
    {
        const bitio = this.bitio;
        bitio.getUI16(); // FontId
        bitio.getDataUntil("\0"); // FontName
        bitio.getDataUntil("\0"); // FontCopyright
    }

    private parseDefineText(tagType: TAG_DefineText): void
    {
        const bitio = this.bitio;

        const characterId = bitio.getUI16();
        const bounds = this.rect();
        const matrix = this.matrix();
        const GlyphBits = bitio.getUI8();
        const AdvanceBits = bitio.getUI8();
        const textRecords = this.getTextRecords(tagType, GlyphBits, AdvanceBits);

        this.setCharacter<DefineTextCharacter>(characterId, {
            tagType,
            characterId,
            bounds,
            matrix,
            textRecords
        });
    }

    private getTextRecords(tagType: TAG_DefineText, GlyphBits: number, AdvanceBits: number): TextRecordData[]
    {
        const bitio = this.bitio;
        const array: TextRecordData[] = [];

        while (bitio.getUI8() !== 0) {
            bitio.incrementOffset(-1, 0);

            var obj = {} as TextRecordData;
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
                if (tagType === TAG.DefineText) {
                    obj.TextColor = this.rgb();
                } else {
                    obj.TextColor = this.rgba();
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
            obj.GlyphEntries = this.getGlyphEntries(obj.GlyphCount, GlyphBits, AdvanceBits);

            array.push(obj);
        }

        return array;
    }

    private getGlyphEntries(count: number, GlyphBits: number, AdvanceBits: number): GlyphEntry[]
    {
        const bitio = this.bitio;
        const array: GlyphEntry[] = [];

        while (count--) {
            array.push({
                GlyphIndex: bitio.getUIBits(GlyphBits),
                GlyphAdvance: bitio.getSIBits(AdvanceBits)
            });
        }

        return array;
    }

    private parseDefineEditText(tagType: TAG.DefineEditText): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as DefineEditText;
        var isJis = false;

        obj.CharacterId = bitio.getUI16();
        var bounds = _this.rect();

        var flag1 = bitio.getUI8();
        obj.HasText = ((flag1 >>> 7) & 1) as BitBoolean;
        obj.WordWrap = ((flag1 >>> 6) & 1) as BitBoolean;
        obj.Multiline = ((flag1 >>> 5) & 1) as BitBoolean;
        obj.Password = ((flag1 >>> 4) & 1) as BitBoolean;
        obj.ReadOnly = ((flag1 >>> 3) & 1) as BitBoolean;
        obj.HasTextColor = ((flag1 >>> 2) & 1) as BitBoolean;
        obj.HasMaxLength = ((flag1 >>> 1) & 1) as BitBoolean;
        obj.HasFont = (flag1 & 1) as BitBoolean;

        var flag2 = bitio.getUI8();
        if (obj.HasFont)
            obj.HasFontClass = ((flag2 >>> 7) & 1) as BitBoolean;
        obj.AutoSize = ((flag2 >>> 6) & 1) as BitBoolean;
        obj.HasLayout = ((flag2 >>> 5) & 1) as BitBoolean;
        obj.NoSelect = ((flag2 >>> 4) & 1) as BitBoolean;
        obj.Border = ((flag2 >>> 3) & 1) as BitBoolean;
        obj.WasStatic = ((flag2 >>> 2) & 1) as BitBoolean;
        obj.HTML = ((flag2 >>> 1) & 1) as BitBoolean;
        obj.UseOutlines = (flag2 & 1) as BitBoolean;

        if (obj.HasFont) {
            obj.FontID = bitio.getUI16();
            var fontData = this.getCharacter<DefineFontCharacter>(obj.FontID);

            if (fontData.tagType === TAG.DefineFont)
                throw new Error('Unsupported font');

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

        this.setCharacter<DefineEditTextCharacter>(obj.CharacterId, {
            data: obj,
            bounds: bounds,
            tagType: tagType
        });
    }

    private parseDefineMorphShape(tagType: TAG_DefineMorphShape): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as DefineMorphShape;
        obj.tagType = tagType;
        obj.CharacterId = bitio.getUI16();

        obj.StartBounds = _this.rect();
        obj.EndBounds = _this.rect();

        if (obj.tagType === TAG.DefineMorphShape2) {
            obj.StartEdgeBounds = _this.rect();
            obj.EndEdgeBounds = _this.rect();
            bitio.getUIBits(6); // Reserved
            obj.UsesNonScalingStrokes = bitio.getUIBits(1);
            obj.UsesScalingStrokes = bitio.getUIBits(1);
        }

        var offset = bitio.getUI32();
        var endOffset = bitio.byte_offset + offset;

        obj.MorphFillStyles = _this.morphFillStyleArray();
        obj.MorphLineStyles = _this.morphLineStyleArray(tagType);

        obj.StartEdges = _this.shape(tagType as any);
        if (bitio.byte_offset !== endOffset) {
            bitio.byte_offset = endOffset;
        }

        obj.EndEdges = _this.shape(tagType as any);

        // fill1 control
        var startPosition = {x: 0, y: 0};
        var endPosition = {x: 0, y: 0};
        var StartRecords = obj.StartEdges;
        var EndRecords = obj.EndEdges;
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

            if (StartRecord.isChange === false && EndRecord.isChange === false) {
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

            if (StartRecord.isChange && EndRecord.isChange === false) {
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
            } else if (StartRecord.isChange === false && EndRecord.isChange) {
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
                if (!(StartRecord.isChange && EndRecord.isChange))
                    throw new Error('Should be changes');

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
        length = obj.StartEdges.length;
        for (i = 0; i < length; i++) {
            var record = StartRecords[i];
            if (!record || !record.isChange) {
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

        this.setCharacter<DefineMorphShapeCharacter>(obj.CharacterId, obj);
    }

    private buildMorphShape(tagType: TAG_DefineMorphShape,
                            char: DefineMorphShapeCharacter,
                            ratio: number = 0): MorphShape
    {
        var per = ratio / 65535;
        var startPer = 1 - per;
        var newShapeRecords = [];

        var morphLineStyles = char.MorphLineStyles;
        var lineStyles = morphLineStyles;
        var lineStyleCount = morphLineStyles.length;

        var fillStyles = char.MorphFillStyles;
        var fillStyleCount = fillStyles.length;

        var StartEdges = char.StartEdges;
        var StartShapeRecords = StartEdges;

        var EndEdges = char.EndEdges;
        var EndShapeRecords = EndEdges;

        const shapes: ShapeWithStyle = {
            lineStyles: new Array(lineStyleCount),
            fillStyles: new Array(fillStyleCount),
            ShapeRecords: []
        };

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
                    if (!(EndRecord.isChange && EndRecord.StateMoveTo))
                        throw new Error('Should be StyleChangeRecord');

                    MoveX = StartRecord.MoveX * startPer + EndRecord.MoveX * per;
                    MoveY = StartRecord.MoveY * startPer + EndRecord.MoveY * per;
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
                if (StartRecord.isChange !== false || EndRecord.isChange !== false)
                    throw new Error('Should be edge records');

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

                ControlX = startControlX * startPer + endControlX * per;
                ControlY = startControlY * startPer + endControlY * per;
                AnchorX = startAnchorX * startPer + endAnchorX * per;
                AnchorY = startAnchorY * startPer + endAnchorY * per;

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
            shapes.lineStyles[i] = {
                type: LineStyleType.Type1,
                Width: Math.floor(StartWidth * startPer + EndWidth * per),
                Color: color
            };
        }

        for (i = 0; i < fillStyleCount; i++) {
            var fillStyle = fillStyles[i];

            if (fillStyle.type === FillStyleType.Solid) {
                EndColor = fillStyle.EndColor;
                StartColor = fillStyle.StartColor;
                color = {
                    R: Math.floor(StartColor.R * startPer + EndColor.R * per),
                    G: Math.floor(StartColor.G * startPer + EndColor.G * per),
                    B: Math.floor(StartColor.B * startPer + EndColor.B * per),
                    A: StartColor.A * startPer + EndColor.A * per
                };

                shapes.fillStyles[i] = {
                    type: fillStyle.type,
                    Color: color
                };
            } else {
                if (fillStyle.type !== FillStyleType.LinearGradient &&
                    fillStyle.type !== FillStyleType.RadialGradient)
                        throw new Error(`Unknown fill style type: ${fillStyle.type}`);

                var EndGradientMatrix = fillStyle.endGradientMatrix;
                var StartGradientMatrix = fillStyle.startGradientMatrix;
                const matrix: Matrix = [
                    StartGradientMatrix[0] * startPer + EndGradientMatrix[0] * per,
                    StartGradientMatrix[1] * startPer + EndGradientMatrix[1] * per,
                    StartGradientMatrix[2] * startPer + EndGradientMatrix[2] * per,
                    StartGradientMatrix[3] * startPer + EndGradientMatrix[3] * per,
                    StartGradientMatrix[4] * startPer + EndGradientMatrix[4] * per,
                    StartGradientMatrix[5] * startPer + EndGradientMatrix[5] * per
                ];

                const gRecords: GradRecord[] = [];
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

                shapes.fillStyles[i] = {
                    type: fillStyle.type,
                    gradient: {
                        SpreadMode: 0,
                        InterpolationMode: 0,
                        GradientRecords: gRecords
                    },
                    gradientMatrix: matrix
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
            tagType,
            data: vtc.convert(shapes, true),
            bounds: Bounds.new(xMin, yMin, xMax, yMax)
        };
    }

    private parseFrameLabel(tagType: TAG.FrameLabel): FrameLabel
    {
        return {
            tagType,
            name: this.bitio.getDataUntil("\0"),
            frame: 0
        };
    }

    private parseRemoveObject(tagType: TAG_RemoveObject): RemoveObject
    {
        var bitio = this.bitio;
        switch (tagType) {
            case TAG.RemoveObject:
                return {
                    tagType,
                    CharacterId: bitio.getUI16(),
                    Depth: bitio.getUI16()
                };

            case TAG.RemoveObject2:
                return {
                    tagType,
                    Depth: bitio.getUI16()
                };

            default:
                ((x: never) => {})(tagType);
        }
    }

    private parseDefineButton(tagType: TAG_DefineButton, length: number): DefineButton
    {
        var obj = {} as DefineButton;
        obj.tagType = tagType;

        var _this = this;
        var bitio = _this.bitio;
        var endOffset = bitio.byte_offset + length;
        obj.ButtonId = bitio.getUI16();

        var ActionOffset = 0;
        if (obj.tagType !== TAG.DefineButton) {
            obj.ReservedFlags = bitio.getUIBits(7);
            obj.TrackAsMenu = bitio.getUIBits(1);
            ActionOffset = bitio.getUI16();
        }

        obj.characters = _this.buttonCharacters();

        // actionScript
        if (obj.tagType === TAG.DefineButton) {
            obj.actions = _this.parseDoAction(endOffset - bitio.byte_offset);
        } else if (ActionOffset > 0) {
            obj.actions = _this.buttonActions(endOffset);
        }

        // set layer
        this.setCharacter<DefineButtonCharacter>(obj.ButtonId, obj);
        if (bitio.byte_offset !== endOffset) {
            bitio.byte_offset = endOffset;
        }

        return obj;
    }

    private buttonCharacters(): ButtonCharacters
    {
        var characters: ButtonCharacters = {};
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
    }

    private buttonRecord(): ButtonRecord
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as ButtonRecord;

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
        if (obj.PlaceFlagHasFilterList) {
            obj.SurfaceFilterList = _this.getFilterList();
        }
        if (obj.PlaceFlagHasBlendMode) {
            obj.BlendMode = bitio.getUI8();
        }
        obj.PlaceFlagHasRatio = 0;
        obj.PlaceFlagHasClipDepth = 0;
        obj.Sound = null;
        return obj;
    }

    private buttonActions(endOffset: number): ButtonCondAction[]
    {
        var _this = this;
        var bitio = _this.bitio;
        var results = [];

        while (true) {
            var obj = {} as ButtonCondAction;
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
    }

    private parsePlaceObject(tagType: TAG_PlaceObject, length: number): PlaceObjectTag
    {
        const bitio = this.bitio;
        const obj = {} as PlaceObjectTag;
        obj.tagType = tagType;
        const startOffset = bitio.byte_offset;

        if (obj.tagType === TAG.PlaceObject) {
            obj.CharacterId = bitio.getUI16();
            obj.Depth = bitio.getUI16();
            obj.Matrix = this.matrix();
            obj.PlaceFlagHasMatrix = 1;
            obj.PlaceFlagHasBlendMode = 0;
            obj.PlaceFlagHasFilterList = 0;

            bitio.byteAlign();
            if ((bitio.byte_offset - startOffset) < length) {
                obj.ColorTransform = this.colorTransform();
                obj.PlaceFlagHasColorTransform = 1;
            }
        } else {
            obj.PlaceFlagHasClipActions = bitio.getUIBits(1);
            if (this.version < 5) {
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
            if (obj.tagType === TAG.PlaceObject3) {
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

            if (obj.tagType === TAG.PlaceObject3 &&
               (obj.PlaceFlagHasClassName || (obj.PlaceFlagHasImage && obj.PlaceFlagHasCharacter)))
            {
                obj.ClassName = bitio.getDataUntil("\0");
            }
            if (obj.PlaceFlagHasCharacter) {
                obj.CharacterId = bitio.getUI16();
            }
            if (obj.PlaceFlagHasMatrix) {
                obj.Matrix = this.matrix();
            }
            if (obj.PlaceFlagHasColorTransform) {
                obj.ColorTransform = this.colorTransform();
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

            if (obj.tagType === TAG.PlaceObject3) {
                if (obj.PlaceFlagHasFilterList) {
                    obj.SurfaceFilterList = this.getFilterList();
                }
                if (obj.PlaceFlagHasBlendMode) {
                    obj.BlendMode = bitio.getUI8();
                }
                if (obj.PlaceFlagHasCacheAsBitmap) {
                    obj.BitmapCache = bitio.getUI8();
                }
                if (obj.PlaceFlagHasVisible) {
                    obj.Visible = bitio.getUI8();
                    obj.BackgroundColor = this.rgba();
                }
            }

            if (obj.PlaceFlagHasClipActions) {
                bitio.getUI16(); // Reserved
                obj.AllEventFlags = this.parseClipEventFlags();

                var endLength = startOffset + length;
                var actionRecords = [];
                while (bitio.byte_offset < endLength) {
                    var clipActionRecord = this.parseClipActionRecord(endLength);
                    actionRecords[actionRecords.length] = clipActionRecord;
                    if (endLength <= bitio.byte_offset) {
                        break;
                    }
                    var endFlag = (this.version <= 5) ? bitio.getUI16() : bitio.getUI32();
                    if (!endFlag) {
                        break;
                    }
                    if (this.version <= 5) {
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
    }

    private parseClipActionRecord(endLength: number): ClipActionRecord
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as ClipActionRecord;
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
    }

    private parseClipEventFlags(): ClipEventFlags
    {
        var _this = this;
        var obj = {} as ClipEventFlags;
        var bitio = _this.bitio;

        obj.keyUp = bitio.getUIBits(1);
        obj.keyDown = bitio.getUIBits(1);
        obj.mouseUp = bitio.getUIBits(1);
        obj.mouseDown = bitio.getUIBits(1);
        obj.mouseMove = bitio.getUIBits(1);
        obj.unload = bitio.getUIBits(1);
        obj.enterFrame = bitio.getUIBits(1);
        obj.load = bitio.getUIBits(1);

        if (this.version >= 6) {
            obj.dragOver = bitio.getUIBits(1);
            obj.rollOut = bitio.getUIBits(1);
            obj.rollOver = bitio.getUIBits(1);
            obj.releaseOutside = bitio.getUIBits(1);
            obj.release = bitio.getUIBits(1);
            obj.press = bitio.getUIBits(1);
            obj.initialize = bitio.getUIBits(1);
        }

        obj.data = bitio.getUIBits(1);

        if (this.version >= 6) {
            bitio.getUIBits(5); // Reserved
            obj.construct = bitio.getUIBits(1);
            obj.keyPress = bitio.getUIBits(1);
            obj.dragOut = bitio.getUIBits(1);
            bitio.getUIBits(8); // Reserved
        }

        bitio.byteAlign();

        return obj;
    }

    private getFilterList(): BitmapFilter[] | null
    {
        const result: BitmapFilter[] = [];
        const NumberOfFilters = this.bitio.getUI8();
        for (let i = 0; i < NumberOfFilters; i++) {
            const filter = this.getFilter();
            if (filter)
                result.push(filter);
        }
        return (result.length) ? result : null;
    }

    private getFilter(): BitmapFilter | undefined
    {
        const filterId = this.bitio.getUI8();
        switch (filterId) {
            case 0: return this.dropShadowFilter();
            case 1: return this.blurFilter();
            case 2: return this.glowFilter();
            case 3: return this.bevelFilter();
            case 4: return this.gradientGlowFilter();
            case 5: return this.convolutionFilter();
            case 6: return this.colorMatrixFilter();
            case 7: return this.gradientBevelFilter();
        }
        return undefined;
    }

    private dropShadowFilter(): DropShadowFilter
    {
        var _this = this;
        var bitio = _this.bitio;
        var rgba = _this.rgba();
        const [R, G, B, A] = rgba;
        var alpha = A;
        var color = R << 16 | G << 8 | B;
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
    }

    private blurFilter(): BlurFilter
    {
        var bitio = this.bitio;
        var blurX = bitio.getUI32() / 0x10000;
        var blurY = bitio.getUI32() / 0x10000;
        var quality = bitio.getUIBits(5);
        bitio.getUIBits(3); // Reserved

        return new BlurFilter(blurX, blurY, quality);
    }

    private glowFilter(): GlowFilter
    {
        var _this = this;
        var bitio = _this.bitio;
        var rgba = _this.rgba();
        const [R, G, B, A] = rgba;
        var alpha = A;
        var color = R << 16 | G << 8 | B;
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
    }

    private bevelFilter(): BevelFilter
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
    }

    private gradientGlowFilter(): GradientGlowFilter
    {
        var _this = this;
        var bitio = _this.bitio;
        var i;
        var NumColors = bitio.getUI8();

        var colors = [];
        var alphas = [];
        for (i = 0; i < NumColors; i++) {
            const [R, G, B, A] = _this.rgba();
            alphas[alphas.length] = A;
            colors[colors.length] = R << 16 | G << 8 | B;
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
    }

    private convolutionFilter(): ConvolutionFilter
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
    }

    private gradientBevelFilter(): GradientBevelFilter
    {
        var _this = this;
        var bitio = _this.bitio;
        var NumColors = bitio.getUI8();

        var i;
        var colors = [];
        var alphas = [];
        for (i = 0; i < NumColors; i++) {
            const [R, G, B, A] = _this.rgba();
            alphas[alphas.length] = A;
            colors[colors.length] = R << 16 | G << 8 | B;
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
    }

    private colorMatrixFilter(): ColorMatrixFilter
    {
        var bitio = this.bitio;
        var MatrixArr = [];
        for (var i = 0; i < 20; i++) {
            MatrixArr[MatrixArr.length] = bitio.getUI32();
        }

        return new ColorMatrixFilter(
        );
    }

    private colorTransform(): ColorTransform
    {
        var bitio = this.bitio;
        bitio.byteAlign();

        var result: ColorTransform = [1, 1, 1, 1, 0, 0, 0, 0];
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
    }

    private parseDefineSprite(tagType: TAG.DefineSprite, dataLength: number): void
    {
        const bitio = this.bitio;
        const SpriteId = bitio.getUI16();
        const obj: DefineSprite = {
            tagType,
            SpriteId,
            FrameCount: bitio.getUI16(),
            ControlTags: this.parseTags(dataLength, SpriteId)
        };
        this.setCharacter<DefineSpriteCharacter>(SpriteId, obj);
    }

    private parseDoAction(length: number): ActionScript
    {
        var _this = this;
        var bitio = _this.bitio;
        var data = bitio.getData(length);
        return new ActionScript(data);
    }

    private parseDoInitAction(length: number): void
    {
        var spriteId = this.bitio.getUI16();

        var as = new ActionScript(this.bitio.getData(length - 2), undefined, undefined, true);

        this.stageInit.push((stage) => {
            var mc = stage.getParent();
            (mc as any).variables = {};
            var action = mc.createActionScript2(as);
            if (spriteId in this.packages) {
                mc.active = true;
                action.apply(mc);
                mc.active = false;
            }
            stage.initActions[spriteId] = action;
        });
    }

    private parseDefineSceneAndFrameLabelData(tagType: TAG.DefineSceneAndFrameLabelData): DefineSceneAndFrameLabelData
    {
        var i;
        var bitio = this.bitio;
        var obj = { tagType } as DefineSceneAndFrameLabelData;
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
    }

    private parseSoundStreamHead(tagType: TAG_SoundStreamHead): SoundStreamHead
    {
        var obj = {} as SoundStreamHead;
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
    }

    private parseDoABC(tagType: number, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var startOffset = bitio.byte_offset;

        this._abcFlag = true;

        var obj = {} as DoABC;
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

        this.stageInit.push((stage) => {
            // build instance
            _this.ABCBuildInstance(stage, obj);
        });
    }

    private ABCBuildInstance(stage: Stage, obj: DoABC): void
    {
        var _this = this;
        var instances = obj.instance;
        var length = instances.length;
        var namespaces = obj.namespace;
        var string = obj.string;
        var names = obj.names;
        for (var i = 0; i < length; i++) {
            var instance = instances[i];
            var flag = instance.flags;

            var nsIndex = null;
            if (flag & 0x08) {
                nsIndex = instance.protectedNs;
            }

            var object: string = '';
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
            prop[className] = _this.ABCCreateActionScript3(stage, obj, instance.iinit, object);

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
                            val = _this.ABCCreateActionScript3(stage, obj, trait.data.info, object);
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
    }

    private ABCCreateActionScript3(stage: Stage, data: DoABC, id: number, ns: string): ActionScript3
    {
        return function ()
        {
            var as3 = new ActionScript3(data, id, ns, stage);
            as3.caller = this;
            as3.args = arguments;
            return as3.execute();
        };
    }

    private ABCMultinameToString(obj: DoABC): DoABC
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
    }

    private ABCInteger(ABCBitIO: BitIO): number[]
    {
        var array = [ 0 ];
        var count = ABCBitIO.getU30();
        if (count) {
            for (var i = 1; i < count; i++) {
                array[i] = ABCBitIO.getS30();
            }
        }
        return array;
    }

    private ABCUinteger(ABCBitIO: BitIO): number[]
    {
        var array = [ 0 ];
        var count = ABCBitIO.getU30();
        if (count) {
            for (var i = 1; i < count; i++) {
                array[i] = ABCBitIO.getU30();
            }
        }
        return array;
    }

    private ABCDouble(ABCBitIO: BitIO): number[]
    {
        var array = [ 0 ];
        var count = ABCBitIO.getU30();
        if (count) {
            for (var i = 1; i < count; i++) {
                array[i] = ABCBitIO.getFloat64LittleEndian();
            }
        }
        return array;
    }

    private ABCStringInfo(ABCBitIO: BitIO): string[]
    {
        var array = [];
        var count = ABCBitIO.getU30();
        if (count) {
            for (var i = 1; i < count; i++) {
                array[i] = ABCBitIO.abcReadString();
            }
        }
        return array;
    }

    private ABCNameSpaceInfo(ABCBitIO: BitIO): number[]
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
    }

    private ABCNsSetInfo(ABCBitIO: BitIO): number[][]
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
    }

    private ABCMultiNameInfo(ABCBitIO: BitIO): MultiNameInfo[]
    {
        const count = ABCBitIO.getU30();
        if (!count)
            return [];

        const a: MultiNameInfo[] = new Array(count);
        for (let i = 1; i < count; i++) {
            const kind = ABCBitIO.getUI8();
            let obj: MultiNameInfo;
            switch (kind) {
                default:
                    console.log("ERROR MULTINAME:", kind, a);
                    break;

                case 0x07: // QName
                case 0x0D: // QNameA
                    obj = {
                        kind,
                        ns: ABCBitIO.getU30(),
                        name: ABCBitIO.getU30()
                    };
                    break;
                case 0x0F: // RTQName
                case 0x10: // RTQNameA
                    obj = {
                        kind,
                        name: ABCBitIO.getU30()
                    };
                    break;
                case 0x09: // Multiname
                case 0x0E: // MultinameA
                    obj = {
                        kind,
                        name: ABCBitIO.getU30(),
                        ns_set: ABCBitIO.getU30()
                    };
                    if (obj.ns_set === 0)
                        console.log("ERROR ZERO NS_SET");
                    break;
                case 0x1B: // MultinameL
                case 0x1C: // MultinameLA
                    obj = {
                        kind,
                        ns_set: ABCBitIO.getU30()
                    };
                    if (obj.ns_set === 0)
                        console.log("ERROR ZERO NS_SET");
                    break;
                case 0x11: // RTQNameL
                case 0x12: // RTQNameLA
                    break;
                case 0x1D: // Postfix
                    obj = {
                        kind,
                        param1: ABCBitIO.getU30(), // multiname
                        param2: ABCBitIO.getU30(), // counter?
                        param3: ABCBitIO.getU30()  // multiname
                    };
                    break;
            }

            a[i] = obj;
        }

        return a;
    }

    private ABCMethodInfo(ABCBitIO: BitIO): MethodInfo
    {
        var obj = {} as MethodInfo;
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
    }

    private ABCMetadataInfo(ABCBitIO: BitIO): MetadataInfo
    {
        var obj = {} as MetadataInfo;
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
    }

    private ABCInstanceInfo(ABCBitIO: BitIO): InstanceInfo
    {
        var obj = {} as InstanceInfo;
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
    }

    private ABCClassInfo(ABCBitIO: BitIO): ClassInfo
    {
        return {
            cinit: ABCBitIO.getU30(),
            trait: this.ABCTrait(ABCBitIO)
        };
    }

    private ABCScriptInfo(ABCBitIO: BitIO): ScriptInfo
    {
        return {
            init: ABCBitIO.getU30(),
            trait: this.ABCTrait(ABCBitIO)
        };
    }

    private ABCMethodBodyInfo(ABCBitIO: BitIO): MethodBodyInfo
    {
        var _this = this;
        var obj = {} as MethodBodyInfo;
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
    }

    private ABCBuildCode(ABCBitIO: BitIO, count: number): Code[]
    {
        var array: Code[] = [];
        var i = 0;
        while (i < count) {
            var obj = {} as Code;

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
    }

    private ABCException(ABCBitIO: BitIO): Exception
    {
        var obj = {} as Exception;
        obj.from = ABCBitIO.getU30();
        obj.to = ABCBitIO.getU30();
        obj.target = ABCBitIO.getU30();
        obj.excType = ABCBitIO.getU30();
        obj.varName = ABCBitIO.getU30();
        return obj;
    }

    private ABCTrait(ABCBitIO: BitIO): Trait[]
    {
        var count = ABCBitIO.getU30();
        var trait: Trait[] = [];
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
    }

    private parseSymbolClass(): void
    {
        var bitio = this.bitio;
        var count = bitio.getUI16();
        if (count) {
            while (count--) {
                var tagId = bitio.getUI16();
                var name = bitio.getDataUntil("\0");
                this.symbols[tagId] = name;
                this.exportAssets[name] = tagId;
            }
        }
    }

    private parseDefineSound(tagType: number, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var startOffset = bitio.byte_offset;

        const obj: DefineSound = {
            tagType: tagType,
            SoundId: bitio.getUI16(),
            SoundFormat: bitio.getUIBits(4),
            SoundRate: bitio.getUIBits(2),
            SoundSize: bitio.getUIBit(),
            SoundType: bitio.getUIBit(),
            SoundSampleCount: bitio.getUI32(),

            base64: ''
        };

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
            case SoundFormat.RawNativeEndian: // Uncompressed native-endian
            case SoundFormat.RawLittleEndian: // Uncompressed little-endian
                mimeType = "wave";
                break;
            case SoundFormat.ADPCM: // ADPCM ? 32KADPCM
                mimeType = "wave";
                break;
            case SoundFormat.MP3: // MP3
                mimeType = "mpeg";
                break;
            case SoundFormat.Nellymoser16: // Nellymoser 16
            case SoundFormat.Nellymoser8: // Nellymoser 8
            case SoundFormat.Nellymoser: //
                mimeType = "nellymoser";
                break;
            case SoundFormat.Speex: // Speex
                mimeType = "speex";
                break;
            case SoundFormat.XAiff:
                mimeType = "x-aiff";
                break;
            default: ((x: never) => {})(obj.SoundFormat);
        }

        obj.base64 = "data:audio/" + mimeType + ";base64," + base64Encode(SoundData);
        this.sounds[obj.SoundId] = obj;
    }

    private parseStartSound(tagType: TAG_StartSound): StartSoundTag
    {
        var _this = this;
        var bitio = _this.bitio;

        let obj: StartSound;
        if (tagType === TAG.StartSound) {
            obj = {
                tagType: tagType,
                SoundId: bitio.getUI16(),
                SoundInfo: _this.parseSoundInfo()
            };
        } else if (tagType === TAG.StartSound2) {
            obj = {
                tagType: tagType,
                SoundId: bitio.getUI16(),
                SoundClassName: bitio.getDataUntil("\0"),
                SoundInfo: _this.parseSoundInfo()
            };
        } else {
            ((x: never) => {})(tagType);
        }
        this.setCharacter<StartSoundCharacter>(obj.SoundId, obj);

        var sound = this.sounds[obj.SoundId];
        var audio = document.createElement("audio");
        audio.onload = function ()
        {
            audio.load();
            audio.preload = "auto";
            audio.autoplay = false;
            audio.loop = false;
        };
        audio.src = sound.base64;

        this.loadSounds.push(audio);

        return {
            SoundId: obj.SoundId,
            Audio: audio,
            tagType: tagType
        };
    }

    private parseDefineButtonSound(): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var buttonId = bitio.getUI16();
        var btnObj = this.getCharacter<DefineButtonCharacter>(buttonId);
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
        this.setCharacter<DefineButtonCharacter>(buttonId, btnObj);
    }

    private parseSoundInfo(): SoundInfo
    {
        var obj = {} as SoundInfo;
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
    }

    private parseDefineFontAlignZones(): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var FontId = bitio.getUI16();
        var tag = this.getCharacter<DefineFontCharacter>(FontId);

        if (tag.tagType === TAG.DefineFont)
            throw new Error('Unsupported font');

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
        this.setCharacter<DefineFontCharacter>(FontId, tag);
    }

    private parseCSMTextSettings(tagType: number): CSMTextSettings
    {
        var _this = this;
        var obj = {} as CSMTextSettings;
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

    private parseSoundStreamBlock(tagType: number, length: number): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as SoundStreamBlock;
        obj.tagType = tagType;
        obj.compressed = bitio.getData(length);
    };

    private parseDefineVideoStream(tagType: number): void
    {
        const bitio = this.bitio;
        const obj: DefineVideoStream = {
            tagType: tagType,
            CharacterId: bitio.getUI16(),
            NumFrames: bitio.getUI16(),
            Width: bitio.getUI16(),
            Height: bitio.getUI16(),
            _Reserved: bitio.getUIBits(4),
            VideoFlagsDeblocking: bitio.getUIBits(3),
            VideoFlagsSmoothing: bitio.getUIBits(1),
            CodecID: bitio.getUI8()
        };
        this.setCharacter<DefineVideoStreamCharacter>(obj.CharacterId, obj);
    }

    private parseVideoFrame(tagType: number, length: number): void
    {
        const bitio = this.bitio;
        var startOffset = bitio.byte_offset;
        const obj: VideoFrame = {
            tagType: tagType,
            StreamID: bitio.getUI16(),
            FrameNum: bitio.getUI16()
        };

        const StreamData = this.getCharacter<DefineVideoStream>(obj.StreamID);

        const sub = bitio.byte_offset - startOffset;
        const dataLength = length - sub;
        switch (StreamData.CodecID) {
            case CodecID.VP6:
                this.parseVp6SwfVideoPacket(dataLength);
                break;
        }

        bitio.byte_offset = startOffset + length;

        // obj.base64 = 'data:image/jpeg;base64,' + base64Encode(VideoData);
        this.videos[obj.StreamID] = obj;
    }

    private parseVp6SwfVideoPacket(length: number): Vp6SwfVideoPacket
    {
        var _this = this;
        var bitio = _this.bitio;
        var VideoData = "";
        var data = bitio.getData(length);

        console.log(data);

        return VideoData;
    }

    private parseFileAttributes(): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as FileAttributes;
        bitio.getUIBit(); // Reserved
        obj.UseDirectBlit = bitio.getUIBit();
        obj.UseGPU = bitio.getUIBit();
        obj.HasMetadata = bitio.getUIBit();
        obj.ActionScript3 = bitio.getUIBit();
        obj.Reserved2 = bitio.getUIBits(3);
        obj.UseNetwork = bitio.getUIBit();
        obj.Reserved3 = bitio.getUIBits(24);
    }

    private parseDefineScalingGrid(): void
    {
        var _this = this;
        var bitio = _this.bitio;
        var obj = {} as DefineScalingGrid;
        obj.CharacterId = bitio.getUI16();
        obj.Splitter = _this.rect();
    }

    getCharacter<T extends Character>(id: number): T {
        return this.characters[id] as T;
    }

    private setCharacter<T extends Character>(id: number, obj: T): void {
        this.characters[id] = obj;
    }
}
