/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */


export class SharedObject {
    public data: any;
    public name: string;

    getLocal(name: string): this {
        const data = window.localStorage.getItem(name) || '{}';

        this.name = name;
        this.data = JSON.parse(data);
        return this;
    }

    flush(): boolean {
        window.localStorage.setItem(this.name, JSON.stringify(this.data));
        return true;
    }
}
