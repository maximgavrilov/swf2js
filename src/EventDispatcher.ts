/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

import { Stage } from './utils';

const enum EventPhase {
    CAPTURING_PHASE = 1,
    AT_TARGET = 2,
    BUBBLING_PHASE = 3,
};

export class ClipEvent {
    target: Object;
    currentTarget: Object;
    eventPhase: EventPhase;

    constructor(public type?: string,
                public bubbles: boolean = false,
                public cancelable: boolean = false)
    { }

    get ACTIVATE(): string { return "activate"; }
    get CLICK(): string { return "press"; }
    get CONTEXT_MENU(): string { return "contextMenu"; }
    get DOUBLE_CLICK(): string { return "doubleClick"; }
    get MIDDLE_CLICK(): string { return "middleClick"; }
    get MIDDLE_MOUSE_DOWN(): string { return "middleMouseDown"; }
    get MIDDLE_MOUSE_UP(): string { return "middleMouseUp"; }
    get MOUSE_DOWN(): string { return "mouseDown"; }
    get MOUSE_MOVE(): string { return "mouseMove"; }
    get MOUSE_OUT(): string { return "rollOut"; }
    get MOUSE_OVER(): string { return "rollOver"; }
    get MOUSE_UP(): string { return "mouseUp"; }
    get MOUSE_WHEEL(): string { return "mouseWheel"; }
    get RIGHT_CLICK(): string { return "rightClick"; }
    get RIGHT_MOUSE_DOWN(): string { return "rightMouseDown"; }
    get RIGHT_MOUSE_UP(): string { return "rightMouseUp"; }
    get ROLL_OUT(): string { return "rollOut"; }
    get ROLL_OVER(): string { return "rollOver"; }
}

type EventListener = (event: ClipEvent) => void;
type EventListenerU = EventListener | undefined;

export class EventDispatcher {
    private events: { [type: string]: EventListener[] } = {};
    private isLoad = false;
    private active = false;
    protected variables: { [type: string]: EventListenerU } = {};

    get onEnterFrame(): EventListenerU {
        return this.getOnEvent('onEnterFrame');
    }

    set onEnterFrame(onEnterFrame: EventListenerU) {
        this.setOnEvent('onEnterFrame', onEnterFrame);
    }

    get onPress(): EventListenerU {
        return this.getOnEvent('onPress');
    }

    set onPress(onPress: EventListenerU) {
        this.setOnEvent('onPress', onPress);
    }

    get onRelease(): EventListenerU {
        return this.getOnEvent('onRelease');
    }

    set onRelease(onRelease: EventListenerU) {
        this.setOnEvent('onRelease', onRelease);
    }

    get onReleaseOutside(): EventListenerU {
        return this.getOnEvent("onReleaseOutside");
    }

    set onReleaseOutside(onReleaseOutside: EventListenerU) {
        this.setOnEvent("onReleaseOutside", onReleaseOutside);
    }

    get onRollOver(): EventListenerU {
        return this.getOnEvent("onRollOver");
    }

    set onRollOver(onRollOver: EventListenerU) {
        this.setOnEvent("onRollOver", onRollOver);
    }

    get onRollOut(): EventListenerU {
        return this.getOnEvent("onRollOut");
    }

    set onRollOut(onRollOut: EventListenerU) {
        this.setOnEvent("onRollOut", onRollOut);
    }

    get onData(): EventListenerU {
        return this.getOnEvent("onData");
    }

    set onData(onData: EventListenerU) {
        this.setOnEvent("onData", onData);
    }

    get onMouseDown(): EventListenerU {
        return this.getOnEvent("onMouseDown");
    }

    set onMouseDown(onMouseDown: EventListenerU) {
        this.setOnEvent("onMouseDown", onMouseDown);
    }

    get onMouseUp(): EventListenerU {
        return this.getOnEvent("onMouseUp");
    }

    set onMouseUp(onMouseUp: EventListenerU) {
        this.setOnEvent("onMouseUp", onMouseUp);
    }

    get onMouseMove(): EventListenerU {
        return this.getOnEvent("onMouseMove");
    }

    set onMouseMove(onMouseMove: EventListenerU) {
        this.setOnEvent("onMouseMove", onMouseMove);
    }

    get onDragOut(): EventListenerU {
        return this.getOnEvent("onDragOut");
    }

    set onDragOut(onDragOut: EventListenerU) {
        this.setOnEvent("onDragOut", onDragOut);
    }

    get onDragOver(): EventListenerU {
        return this.getOnEvent("onDragOver");
    }

    set onDragOver(onDragOver: EventListenerU) {
        this.setOnEvent("onDragOver", onDragOver);
    }

    get onKeyDown(): EventListenerU {
        return this.getOnEvent("onKeyDown");
    }

    set onKeyDown(onKeyDown: EventListenerU) {
        this.setOnEvent("onKeyDown", onKeyDown);
    }

    get onKeyUp(): EventListenerU {
        return this.getOnEvent("onKeyUp");
    }

    set onKeyUp(onKeyUp: EventListenerU) {
        this.setOnEvent("onKeyUp", onKeyUp);
    }

    get onLoad(): EventListenerU {
        return this.getOnEvent("onLoad");
    }

    set onLoad(onLoad: EventListenerU) {
        this.setOnEvent("onLoad", onLoad);
    }

    get onUnLoad(): EventListenerU {
        return this.getOnEvent("onUnLoad");
    }

    set onUnLoad(onUnLoad: EventListenerU) {
        this.setOnEvent("onUnLoad", onUnLoad);
    }

    private getOnEvent(type: string): EventListenerU {
        return this.variables[type];
    }

    private setOnEvent(type: string, as: EventListenerU) {
        this.variables[type] = as;
    }

    addEventListener(type: string,
                     listener: EventListener,
                     useCapture: boolean = false,
                     priority: number = 0,
                     useWeakReference: boolean = false): void
    {
        if (!this.events[type])
            this.events[type] = [];

        this.events[type].push(listener);
    }

    dispatchEvent(event: ClipEvent, stage: Stage): void {
        const type = event.type;
        if (!this.hasEventListener(type))
            return;

        const events = this.events[type];

        const cEvent = new ClipEvent();
        cEvent.type = type;
        cEvent.target = this;

        this.setActionQueue(events, stage, [ cEvent ]);
    }

    hasEventListener(type: string): boolean {
        return (type in this.events);
    }

    removeEventListener(type: string, listener: EventListener, useCapture: boolean = false): void {
        if (!this.hasEventListener(type))
            return;

        const listeners = this.events[type];
        for (let i = 0; i < listeners.length; i++) {
            if (listeners[i] !== listener)
                continue;

            listeners.slice(i, 0);
            break;
        }
    }

    willTrigger(type: string): boolean {
        return this.hasEventListener(type);
    }

    protected setActionQueue(as: EventListener[], stage: Stage, args: any[]): void {
        stage.actions.push({ as, mc: this, args });
    }
}
