/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { JCT11280 } from './JCT11280';
import { isXHR2 } from './utils';

const isArrayBuffer: boolean = (window as any).ArrayBuffer;

export type BitBoolean = 0 | 1;
export interface Data {
    readonly length: number;
    [index: number]: number; // uint8
}

function createArray(length: number): Data {
    return isArrayBuffer ? new Uint8Array(length) : [];
}

export type DataIO = Data | string;

function isData(d: DataIO): d is Data {
    return isXHR2;
}

export class BitIO {
    byte_offset = 0;
    bit_offset = 0;
    data?: Data;

    private bit_buffer?: number;

    constructor(data?: DataIO) {
        if (!data)
            return;

        if (isData(data))
            this.setData(new Uint8Array(data));
        else
            this.init(data);
    }

    init(data: string): void {
        const array = createArray(length);
        for (let i = 0; i < data.length; i++)
            array[i] = data.charCodeAt(i) & 0xff;
        this.data = array;
    }

    setData(data: Data): void {
        this.data = data;
    }

    decodeToShiftJis(str: string): string {
        return str.replace(/%(8[1-9A-F]|[9E][0-9A-F]|F[0-9A-C])(%[4-689A-F][0-9A-F]|%7[0-9A-E]|[@-~])|%([0-7][0-9A-F]|A[1-9A-F]|[B-D][0-9A-F])/ig,
            (s) => {
                var c = parseInt(s.substring(1, 3), 16);
                var l = s.length;
                return 3 === l ? String.fromCharCode(c < 160 ? c : c + 65216) : JCT11280.charAt((c < 160 ? c - 129 : c - 193) * 188 + (4 === l ? s.charCodeAt(3) - 64 : (c = parseInt(s.substring(4), 16)) < 127 ? c - 64 : c - 65));
            }
        );
    }

    unzip(compressed: Data, isDeCompress: boolean): Data {
        var sym = 0;
        var i = 0;
        var length = 0;
        var data = [];
        var bitLengths = [];
        var bitio = new BitIO();
        bitio.setData(compressed);

        var ORDER: Data = [
            16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15
        ];

        var LEXT: Data = [
            0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
            3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99
        ];

        var LENS: Data = [
            3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
            35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
        ];

        var DEXT: Data = [
            0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
            7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13
        ];

        var DISTS: Data = [
            1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
            257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
            8193, 12289, 16385, 24577
        ];

        if (isArrayBuffer) {
            ORDER = new Uint8Array(ORDER);
            LEXT = new Uint8Array(LEXT);
            LENS = new Uint16Array(LENS);
            DEXT = new Uint8Array(DEXT);
            DISTS = new Uint16Array(DISTS);
        }

        var startOffset = 2;
        if (isDeCompress) {
            startOffset = 10;
        }
        bitio.setOffset(startOffset, 8);

        for (var flag = 0; !flag;) {
            flag = bitio.readUB(1);
            var type = bitio.readUB(2);
            var distTable = {};
            var litTable = {};
            var fixedDistTable = false;
            var fixedLitTable = false;

            if (type) {
                if (type === 1) {
                    distTable = fixedDistTable;
                    litTable = fixedLitTable;

                    if (!distTable) {
                        bitLengths = [];
                        for (i = 32; i--;) {
                            bitLengths[bitLengths.length] = 5;
                        }
                        distTable = fixedDistTable = this.buildHuffTable(bitLengths);
                    }

                    if (!litTable) {
                        bitLengths = [];
                        i = 0;
                        while (i < 144) {
                            i++;
                            bitLengths[bitLengths.length] = 8;
                        }
                        while (i < 256) {
                            i++;
                            bitLengths[bitLengths.length] = 9;
                        }
                        while (i < 280) {
                            i++;
                            bitLengths[bitLengths.length] = 7;
                        }
                        while (i < 288) {
                            i++;
                            bitLengths[bitLengths.length] = 8;
                        }
                        litTable = fixedLitTable = this.buildHuffTable(bitLengths);
                    }
                } else {
                    var numLitLengths = bitio.readUB(5) + 257;
                    var numDistLengths = bitio.readUB(5) + 1;
                    var numCodeLengths = bitio.readUB(4) + 4;
                    var codeLengths: number[] | Uint8Array = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
                    if (isArrayBuffer) {
                        codeLengths = new Uint8Array(codeLengths);
                    }
                    for (i = 0; i < numCodeLengths; i++) {
                        codeLengths[ORDER[i]] = bitio.readUB(3);
                    }
                    var codeTable = this.buildHuffTable(codeLengths);
                    codeLengths = null;

                    var litLengths = [];
                    var prevCodeLen = 0;
                    var maxLengths = numLitLengths + numDistLengths;
                    while (litLengths.length < maxLengths) {
                        sym = bitio.decodeSymbol(codeTable);
                        switch (sym) {
                            case 16:
                                i = bitio.readUB(2) + 3;
                                while (i--) {
                                    litLengths[litLengths.length] = prevCodeLen;
                                }
                                break;
                            case 17:
                                i = bitio.readUB(3) + 3;
                                while (i--) {
                                    litLengths[litLengths.length] = 0;
                                }
                                break;
                            case 18:
                                i = bitio.readUB(7) + 11;
                                while (i--) {
                                    litLengths[litLengths.length] = 0;
                                }
                                break;
                            default:
                                if (sym <= 15) {
                                    litLengths[litLengths.length] = sym;
                                    prevCodeLen = sym;
                                }
                                break;
                        }
                    }
                    distTable = this.buildHuffTable(litLengths.splice(numLitLengths, numDistLengths));
                    litTable = this.buildHuffTable(litLengths);
                }

                sym = 0;
                while (sym !== 256) {
                    sym = bitio.decodeSymbol(litTable);
                    if (sym < 256) {
                        data[data.length] = sym;
                    } else if (sym > 256) {
                        var mapIdx = sym - 257;
                        length = LENS[mapIdx] + bitio.readUB(LEXT[mapIdx]);
                        var distMap = bitio.decodeSymbol(distTable);
                        var dist = DISTS[distMap] + bitio.readUB(DEXT[distMap]);
                        i = data.length - dist;
                        while (length--) {
                            data[data.length] = data[i++];
                        }
                    }
                }
            } else {
                bitio.bit_offset = 8;
                bitio.bit_buffer = null;
                length = bitio.readNumber(2);
                bitio.readNumber(2); // nlen
                while (length--) {
                    data[data.length] = bitio.readNumber(1);
                }
            }
        }
        return data;
    }

    buildHuffTable(data: Data): any {
        var length = data.length;
        var blCount = [];
        var nextCode = [];
        var table = {};
        var code = 0;
        var len = 0;
        var maxBits = 0;
        for (var i = 0; i < length; i++) {
            maxBits = Math.max(maxBits, data[i]);
        }
        maxBits++;

        i = length;
        while (i--) {
            len = data[i];
            blCount[len] = (blCount[len] || 0) + (len > 0);
        }

        for (i = 1; i < maxBits; i++) {
            len = i - 1;
            if (!(len in blCount)) {
                blCount[len] = 0;
            }
            code = (code + blCount[len]) << 1;
            nextCode[i] = code|0;
        }

        for (i = 0; i < length; i++) {
            len = data[i];
            if (len) {
                table[nextCode[len]] = {length: len, symbol: i};
                nextCode[len]++;
            }
        }
        return table;
    }

    decodeSymbol(table: any): number {
        let code = 0;
        let len = 0;
        while (true) {
            code = (code << 1) | this.readUB(1);
            len++;

            if (!(code in table)) {
                continue;
            }

            const entry = table[code];
            if (entry.length === len) {
                return entry.symbol;
            }
        }
    }

    getHeaderSignature(): string {
        let str = "";
        while (str.length < 3) {
            const code = this.getUI8();
            switch (code) { // trim
                case 32:
                case 96:
                case 127:
                    continue;
                default:
                    break;
            }
            str += String.fromCharCode(code);
        }
        return str;
    }

    byteAlign(): void {
        if (!this.bit_offset) {
            return;
        }
        this.byte_offset += ((this.bit_offset + 7) / 8) | 0;
        this.bit_offset = 0;
    }

    getData(length: number): Data {
        this.byteAlign();

        const array = createArray(length);
        for (let i = 0; i < length; i++)
            array[i] = this.data[this.byte_offset++];
        return array;
    };

    getDataUntil(value: any, isJis: boolean = false): string {
        this.byteAlign();

        const bo = this.byte_offset;
        let offset = 0;
        if (value === null) {
            offset = -1;
        } else {
            var length = this.data.length;
            while (true) {
                var val = this.data[bo + offset];
                offset++;
                if (val === 0 || (bo + offset) >= length) {
                    break;
                }
            }
        }

        var n = (offset === -1) ? this.data.length - bo : offset;
        var array = [];
        var ret = "";
        var _join = Array.prototype.join;
        var i = 0;
        if (value !== null) {
            for (i = 0; i < n; i++) {
                var code = this.data[bo + i];
                if (code === 10 || code === 13) {
                    array[array.length] = "\n";
                }
                if (code < 32) {
                    continue;
                }
                array[array.length] = "%" + code.toString(16);
            }

            if (array.length) {
                var str = _join.call(array, "");
                if (str.length > 5 && str.substr(-5) === "\n") {
                    str = str.slice(0, -5);
                }

                if (isJis) {
                    ret = this.decodeToShiftJis(str);
                } else {
                    try {
                        ret = decodeURIComponent(str);
                    } catch (e) {
                        ret = this.decodeToShiftJis(str);
                    }
                }
            }
        } else {
            for (i = 0; i < n; i++) {
                ret += String.fromCharCode(this.data[bo + i]);
            }
        }
        this.byte_offset = bo + n;
        return ret;
    }

    private byteCarry() {
        if (this.bit_offset > 7) {
            this.byte_offset += ((this.bit_offset + 7) / 8) | 0;
            this.bit_offset &= 0x07;
        } else {
            while (this.bit_offset < 0) {
                this.byte_offset--;
                this.bit_offset += 8;
            }
        }
    }

    getUIBits(n: 1): BitBoolean;
    getUIBits(n: number): number;
    getUIBits(n: number): number {
        let value = 0;
        while (n--) {
            value <<= 1;
            value |= this.getUIBit();
        }
        return value;
    }

    getUIBit(): BitBoolean {
        this.byteCarry();
        return ((this.data[this.byte_offset] >> (7 - this.bit_offset++)) & 0x1) as BitBoolean;
    }

    getSIBits(n: number): number {
        const value = this.getUIBits(n);
        const msb = value & (0x1 << (n - 1));
        if (msb) {
            const bitMask = (2 * msb) - 1;
            return -(value ^ bitMask) - 1;
        }
        return value;
    }

    getUI8(): number {
        this.byteAlign();
        return this.data[this.byte_offset++];
    }

    getUI16(): number {
        this.byteAlign();
        return (this.data[this.byte_offset++] | (this.data[this.byte_offset++]) << 8);
    }

    getUI24(): number {
        this.byteAlign();
        return (this.data[this.byte_offset++] | (this.data[this.byte_offset++]
            | (this.data[this.byte_offset++]) << 8) << 8);
    }

    getUI32(): number {
        this.byteAlign();
        return (this.data[this.byte_offset++] | (this.data[this.byte_offset++]
            | (this.data[this.byte_offset++] | (this.data[this.byte_offset++]) << 8) << 8) << 8);
    }

    getUI16BE(): number {
        this.byteAlign();
        return (((this.data[this.byte_offset++]) << 8) | (this.data[this.byte_offset++]));
    }

    getFloat16(): number {
        const data = this.getData(2);
        let float = 0;
        for (var i = 2; i--;) {
            float |= data[i] << (i * 8);
        }
        return float;
    }

    getFloat32(): number {
        const data = this.getData(4);
        let rv = 0;
        for (var i = 4; i--;) {
            rv |= data[i] << (i * 8);
        }

        const sign = rv & 0x80000000;
        const exp = (rv >> 23) & 0xff;
        const fraction = rv & 0x7fffff;
        if (!rv || rv === 0x80000000) {
            return 0;
        }

        return (sign ? -1 : 1) * (fraction | 0x800000) * Math.pow(2, (exp - 127 - 23));
    };

    getFloat64(): number {
        const upperBits = this.getUI32();
        const lowerBits = this.getUI32();
        const sign = upperBits >>> 31 & 0x1;
        const exp = upperBits >>> 20 & 0x7FF;
        const upperFraction = upperBits & 0xFFFFF;

        return (!upperBits && !lowerBits) ? 0 : ((sign === 0) ? 1 : -1) *
            (upperFraction / 1048576 + lowerBits / 4503599627370496 + 1) *
                Math.pow(2, exp - 1023);
    }

    getFloat64LittleEndian(): number {
        const signBits = 1;
        const exponentBits = 11;
        const fractionBits = 52;
        const min = -1022;
        const max = 1023;

        let str = "";
        for (let i = 0; i < 8; i++) {
            let bits = this.data[this.byte_offset++].toString(2);
            while (bits.length < 8) {
                bits = "0" + bits;
            }
            str = bits + str;
        }

        const sign = (str.charAt(0) === "1") ? -1 : 1;
        let exponent = parseInt(str.substr(signBits, exponentBits), 2) - max;
        const significandBase = str.substr(signBits + exponentBits, fractionBits);
        let significandBin = "1"+ significandBase;

        let val = 1;
        let significand = 0;
        if (exponent === -max) {
            if (significandBase.indexOf("1") === -1) {
                return 0;
            } else {
                exponent = min;
                significandBin = "0"+ significandBase;
            }
        }

        let l = 0;
        while (l < significandBin.length) {
            const sb = significandBin.charAt(l);
            significand += val * +sb;
            val = val / 2;
            l++;
        }

        return sign * significand * Math.pow(2, exponent);
    }

    toUI16(data: Data): number {
        return data[0] + (data[1] << 8);
    }

    toSI16LE(data: Data): number {
        const value = this.toUI16(data);
        return (value < 0x8000) ? value : (value - 0x10000);
    }

    getSI8(): number {
        let value = this.getUI8();
        if (value >> 7) { // nBits = 8;
            value -= 256; // Math.pow(2, 8)
        }
        return value;
    }

    getSI24(): number {
        let value = this.getUI24();
        if (value >> 23) { // nBits = 24;
            value -= 16777216; // Math.pow(2, 24)
        }
        return value;
    }

    incrementOffset(byteInt: number, bitInt: number): void {
        this.byte_offset += byteInt;
        this.bit_offset += bitInt;
        this.byteCarry();
    }

    setOffset(byteInt: number, bitInt: number): void {
        this.byte_offset = byteInt;
        this.bit_offset = bitInt;
    }

    getU30(): number {
        let value = 0;
        for (let i = 0; i < 5; i++) {
            const num = this.data[this.byte_offset++];
            value |= ((num & 0x7f) << (7 * i));

            if (!(num & 0x80)) {
                break;
            }
        }

        return value;
    }

    getS30(): number {
        const startOffset = this.byte_offset;
        let value = this.getU30();
        const nBits = (this.byte_offset - startOffset) * 8;
        if (value >> (nBits - 1)) {
            value -= Math.pow(2, nBits);
        }
        return value;
    }

    abcReadString(): string {
        const length = this.getU30();
        const ret: string[] = [];
        for (let i = 0; i < length; i++) {
            const code = this.data[this.byte_offset++];
            if (code < 33)
                continue;

            switch (code) {
                default:
                    break;
                case 34:
                case 35:
                case 36:
                case 37:
                case 38:
                case 39:
                case 43:
                case 45:
                    continue;
            }

            const ch = String.fromCharCode(code);
            ret.push(ch);
        }
        return ret.join("");
    }

    private readUB(length: number): number {
        let value = 0;
        for (let i = 0; i < length; i++) {
            if (this.bit_offset === 8) {
                this.bit_buffer = this.readNumber(1);
                this.bit_offset = 0;
            }
            value |= (this.bit_buffer & (0x01 << this.bit_offset++) ? 1 : 0) << i;
        }
        return value;
    }

    private readNumber(n: number): number {
        let value = 0;
        const o = this.byte_offset;
        let i = o + n;
        while (i > o) {
            value = (value << 8) | this.data[--i];
        }
        this.byte_offset += n;
        return value;
    }

    deCompress(size: number, mode: 'ZLIB' | 'LZMA'): void {
        if (mode !== 'ZLIB')
            throw new Error('Only ZLIB is supported');

        const cacheOffset = this.byte_offset;
        this.byte_offset = 0;

        const data = this.getData(cacheOffset);
        const deCompress = this.unzip(this.data, true);

        var i = 0;
        var key = 0;
        var array = createArray(size);
        var length = data.length;
        while (i < length) {
            array[key++] = data[i];
            i++;
        }

        i = 0;
        length = deCompress.length;
        while (i < length) {
            array[key++] = deCompress[i];
            i++;
        }

        this.data = array;
        this.byte_offset = cacheOffset;
    }
}
