/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

export class Global {
    private variables = {};

    getVariable(name: string): any {
        return this.variables[name];
    }

    setVariable(name: string, value: any): void {
        this.variables[name] = value;
    }

    getProperty(name: string): any {
        return this.variables[name];
    }

    setProperty(name: string, value: any): void {
        this.variables[name] = value;
    }
}
