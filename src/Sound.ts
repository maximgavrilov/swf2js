/**
 * swf2js (version 0.7.8)
 * Develop: https://github.com/ienaga/swf2js
 * ReadMe: https://github.com/ienaga/swf2js/blob/master/README.md
 * Web: https://swf2js.wordpress.com
 * Contact: ienaga@tvon.jp
 * Copyright (c) 2013 Toshiyuki Ienaga. Licensed under the MIT License.
 */

/**
 * @constructor
 */
export var Sound = function (...args) // any
{
    var _this = this;
    _this.variables = {};
    _this.sounds = [];
    _this.volume = 100;
    _this.pan = 0;
    _this.transform = {ll: 100, lr: 100, rl: 100, rr: 100};
    _this.isStreamin = false;
    _this.movieClip = null;
};

/**
 * properties
 */
Object.defineProperties(Sound.prototype,
{
    onLoad: {
        get: function () {
            return this.getProperty("onLoad");
        },
        set: function (onLoad) {
            this.setProperty("onLoad", onLoad);
        }
    },
    onSoundComplete: {
        get: function () {
            return this.getProperty("onSoundComplete");
        },
        set: function (onSoundComplete) {
            this.setProperty("onSoundComplete", onSoundComplete);
        }
    }
});

/**
 * @param name
 * @returns {*}
 */
Sound.prototype.getProperty = function (name)
{
    return this.variables[name];
};

/**
 * @param name
 * @param value
 */
Sound.prototype.setProperty = function (name, value)
{
    this.variables[String(name)] = value;
};

/**
 * @param currentTime
 * @param loopCount
 */
Sound.prototype.start = function (currentTime, loopCount)
{
    var _this = this;
    var sounds = _this.sounds;

    var init = function (audio, time)
    {
        return function ()
        {
            audio.currentTime = time;
        };
    };

    var end = function (audio, sound)
    {
        return function ()
        {
            var volume = sound.volume;
            audio.loopCount--;
            if (audio.loopCount > 0) {
                audio.volume = volume / 100;
                audio.currentTime = 0;
                audio.play();
            }

            var onSoundComplete = sound.onSoundComplete;
            if (onSoundComplete) {
                onSoundComplete.apply(sound, [true]);
            }
        };
    };

    var audio;
    for (var id in sounds) {
        if (!sounds.hasOwnProperty(id)) {
            continue;
        }
        audio = sounds[id];
        audio.load();

        if (currentTime) {
            audio.addEventListener("canplay", init(audio, currentTime));
        }
        if (typeof loopCount === "number" && loopCount > 0) {
            audio.loopCount = loopCount;
            audio.addEventListener("ended", end(audio, _this));
        }

        audio.play();
    }
};

/**
 * stop
 */
Sound.prototype.stop = function (id)
{
    var sounds = this.sounds;
    var audio;
    if (id) {
        audio = sounds[id];
        if (audio) {
            audio.pause();
        }
    } else {
        for (var key in sounds) {
            if (!sounds.hasOwnProperty(key)) {
                continue;
            }
            audio = sounds[key];
            audio.pause();
        }
    }
};

/**
 * @param url
 * @param bool
 */
Sound.prototype.loadSound = function (url, bool)
{
    var _this = this;
    _this.isStreamin = bool;

    var sounds = _this.sounds;
    var audio = document.createElement("audio");
    audio.src = url;
    sounds[0] = audio;

    var onLoad = (function (audio, sound)
    {
        return function() {
            audio.load();
            audio.preload = "auto";
            audio.autoplay = false;
            audio.loop = false;
            var onLoad = sound.onLoad;
            if (typeof onLoad === "function") {
                onLoad.apply(sound, [true]);
            }
        };
    })(audio, _this);
    audio.addEventListener("canplaythrough", onLoad);

    var onError = (function (audio, sound)
    {
        return function() {
            var onLoad = sound.onLoad;
            if (typeof onLoad === "function") {
                onLoad.apply(sound, [false]);
            }
        };
    })(audio, _this);
    audio.addEventListener("error", onError);
};

/**
 * @param id
 */
Sound.prototype.attachSound = function (id)
{
    var _this = this;
    var sounds = _this.sounds;
    if (!(id in sounds)) {
        var movieClip = _this.movieClip;
        var stage = movieClip.getStage();
        var exportAssets = stage.exportAssets;
        if (id in exportAssets) {
            var characterId = exportAssets[id];
            var tag = stage.sounds[characterId];
            if (tag) {
                var audio = document.createElement("audio");
                audio.onload = function ()
                {
                    audio.load();
                    audio.preload = "auto";
                    audio.autoplay = false;
                    audio.loop = false;
                };
                audio.src = tag.base64;
                sounds[id] = audio;
            }
        }
    }
};

/**
 *
 * @returns {number}
 */
Sound.prototype.getVolume = function ()
{
    return this.volume;
};

/**
 *
 * @param volume
 */
Sound.prototype.setVolume = function (volume)
{
    var _this = this;
    var sounds = _this.sounds;
    _this.volume = volume;
    for (var id in sounds) {
        if (!sounds.hasOwnProperty(id)) {
            continue;
        }
        var audio = sounds[id];
        audio.volume = volume / 100;
    }
};

/**
 * @returns {number|*}
 */
Sound.prototype.getPan = function ()
{
    return this.pan;
};

/**
 * @param pan
 */
Sound.prototype.setPan = function (pan)
{
    this.pan = pan;
};

/**
 * @param object
 */
Sound.prototype.setTransform = function (object)
{
    var transform = this.transform;
    for (var name in object) {
        if (!object.hasOwnProperty(name)) {
            continue;
        }
        switch (name) {
            case "ll":
            case "lr":
            case "rl":
            case "rr":
                transform[name] = object[name];
                break;
        }
    }
};

/**
 * @returns {{ll: number, lr: number, rl: number, rr: number}|*}
 */
Sound.prototype.getTransform = function ()
{
    return this.transform;
};

/**
 * @returns {number}
 */
Sound.prototype.getBytesLoaded = function ()
{
    return 1;
};

/**
 * @returns {number}
 */
Sound.prototype.getBytesTotal = function ()
{
    return 1;
};

