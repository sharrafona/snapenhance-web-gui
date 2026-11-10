const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../camera-source.js'), 'utf8');

function setup(bodyReady = true) {
    const nodes = [], tracks = [], revoked = [], timers = new Set(), calls = [];
    class Target {
        addEventListener(name, callback) { (this.handlers ??= {})[name] = callback; }
        async fire(name) { return this.handlers?.[name]?.(); }
    }
    class Track extends Target {
        constructor() { super(); this.readyState = 'live'; tracks.push(this); }
        stop() { this.readyState = 'ended'; }
        clone() { return new Track(); }
    }
    class Stream {
        constructor(list = [new Track()]) { this.tracks = list; }
        getTracks() { return this.tracks; }
        getVideoTracks() { return this.tracks; }
    }
    class Element extends Target {
        constructor(tag) { super(); this.tag = tag; this.style = {}; this.children = []; nodes.push(this); }
        setAttribute() {}
        removeAttribute() {}
        append(...items) { this.children.push(...items); }
        replaceChildren(...items) { this.children = items; }
        set src(value) { this.url = value; queueMicrotask(() => {
            if (value.includes('broken')) this.onerror?.();
            else if (this.tag === 'video') this.onloadeddata?.();
            else this.onload?.();
        }); }
        naturalWidth = 4000; naturalHeight = 2000;
        videoWidth = 1080; videoHeight = 1920;
        play() { this.playing = true; return Promise.resolve(); }
        pause() { this.playing = false; }
        load() {}
        getContext() { return {drawImage() {}}; }
        captureStream() { return new Stream(); }
    }
    const body = new Element('body');
    const document = Object.assign(new Target(), {body: bodyReady ? body : null,
        createElement: tag => new Element(tag), getElementById: id => nodes.find(n => n.id === id)});
    const page = Object.assign(new Target(), {document, EventTarget: Target, MediaStream: Stream,
        navigator: {mediaDevices: {getUserMedia: async function(c) { calls.push({c, receiver:this}); return 'real'; }}},
        URL: {createObjectURL: f => 'blob:' + f.name, revokeObjectURL: u => revoked.push(u)},
        setInterval: fn => { timers.add(fn); return fn; }, clearInterval: fn => timers.delete(fn),
        setTimeout, clearTimeout});
    vm.runInNewContext(source + '\ninstallLocalCameraSource(page);', {page});
    const input = () => nodes.find(n => n.tag === 'input');
    const button = text => nodes.find(n => n.tag === 'button' && n.textContent === text);
    async function choose(type, name = 'file') {
        input().files = [{type, name}]; await input().fire('change');
        // The DOM event intentionally doesn't return its async file-loading task.
        await new Promise(resolve => setImmediate(resolve));
    }
    return {page, document, body, nodes, tracks, revoked, timers, calls, choose, button};
}

test('ordinary camera and audio-only requests preserve native receiver and constraints', async () => {
    const h = setup(); const c = {video:true, audio:true};
    assert.equal(await h.page.navigator.mediaDevices.getUserMedia(c), 'real');
    assert.equal(h.calls[0].c, c);
    assert.equal(h.calls[0].receiver, h.page.navigator.mediaDevices);
});

test('photo preview is opt-in; independent silent camera tracks stop on reset', async () => {
    const h = setup(); await h.choose('image/png');
    const canvas = h.nodes.find(n => n.tag === 'canvas');
    assert.equal(canvas.width, 1920); assert.equal(canvas.height, 960);
    assert.equal(await h.page.navigator.mediaDevices.getUserMedia({video:true}), 'real');
    await h.button('Use as camera').fire('click');
    const a = await h.page.navigator.mediaDevices.getUserMedia({video:true, audio:true});
    const b = await h.page.navigator.mediaDevices.getUserMedia({video:true});
    assert.notEqual(a.getTracks()[0], b.getTracks()[0]);
    assert.equal(h.calls.length, 1); // No camera or microphone access in replacement mode.
    a.getTracks()[0].stop(); assert.equal(b.getTracks()[0].readyState, 'live');
    assert.equal(await h.page.navigator.mediaDevices.getUserMedia({audio:true}), 'real');
    await h.button('Reset to real camera').fire('click');
    assert.ok(h.tracks.every(t => t.readyState === 'ended'));
    assert.equal(h.timers.size, 0); assert.deepEqual(h.revoked, ['blob:file']);
    assert.equal(await h.page.navigator.mediaDevices.getUserMedia({video:true}), 'real');
});

test('video loops muted and replacing it releases the previous source', async () => {
    const h = setup(); await h.choose('video/mp4', 'clip');
    const video = h.nodes.find(n => n.tag === 'video');
    assert.equal(video.muted, true); assert.equal(video.loop, true); assert.equal(video.playing, true);
    await h.choose('image/jpeg', 'photo');
    assert.equal(video.playing, false); assert.ok(h.revoked.includes('blob:clip'));
    await h.page.fire('pagehide'); assert.equal(h.timers.size, 0);
});

test('invalid and undecodable files leave replacement disabled', async () => {
    const h = setup(); await h.choose('text/plain');
    assert.equal(h.button('Use as camera').disabled, true);
    await h.choose('image/png', 'broken');
    assert.equal(h.button('Use as camera').disabled, true);
    assert.ok(h.revoked.includes('blob:broken'));
    assert.equal(await h.page.navigator.mediaDevices.getUserMedia({video:true}), 'real');
});

test('panel mounts after document-start and survives unrelated markup', async () => {
    const h = setup(false); assert.equal(h.body.children.length, 0);
    h.document.body = h.body; await h.document.fire('DOMContentLoaded');
    assert.equal(h.body.children[0].id, 'sharrafona-local-camera');
});
