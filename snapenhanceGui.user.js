// ==UserScript==
// @name         Sharrafona SnapEnhance Web
// @namespace    https://github.com/sharrafona/snapenhance-web-gui
// @description  Sharrafona's maintained SnapEnhance Web fork with a settings GUI
// @version      1.3.0
// @author       sharrafona (fork maintainer), appelmoesGG, SnapEnhance
// @match        https://snapchat.com/web
// @match        https://snapchat.com/web?*
// @match        https://snapchat.com/web/*
// @match        https://www.snapchat.com/web
// @match        https://www.snapchat.com/web?*
// @match        https://www.snapchat.com/web/*
// @match        https://web.snapchat.com/*
// @source       https://github.com/sharrafona/snapenhance-web-gui
// @supportURL   https://github.com/sharrafona/snapenhance-web-gui/issues
// @downloadURL  https://raw.githubusercontent.com/sharrafona/snapenhance-web-gui/main/snapenhanceGui.user.js
// @updateURL    https://raw.githubusercontent.com/sharrafona/snapenhance-web-gui/main/snapenhanceGui.user.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=snapchat.com
// @require      https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.9/dat.gui.min.js
// @license      GPL-3.0-only
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

/*
Fork maintained by sharrafona. Original work by appelmoesGG and SnapEnhance.
Modified 2026-11-10: fork branding, install/update URLs, and document-start observer fallback.

TODO FOR ME:
- Make this code better organized

CURRENT KNOWN BUGS:
- No typing indication is not working when "Hide Bitmoji" is off
*/

// LOCAL_CAMERA_SOURCE_START
// Experimental local media camera source. No media is sent by this module.
function installLocalCameraSource(page) {
    const devices = page.navigator.mediaDevices;
    if (!devices?.getUserMedia) return;
    const originalGetUserMedia = devices.getUserMedia;
    const create = page.document.createElement.bind(page.document);
    const listen = page.EventTarget.prototype.addEventListener;
    const on = (el, type, handler) => listen.call(el, type, handler);
    let source = null;
    let generation = 0;
    let enabled = false;
    const streams = new Set();
    let status;
    let enableButton;
    let resetButton;
    const report = (message) => { if (status) status.textContent = message; };

    function release(item) {
        if (!item) return;
        page.clearInterval(item.timer);
        item.stream?.getTracks().forEach(track => track.stop());
        if (item.video) {
            item.media.pause();
            item.media.removeAttribute('src');
            item.media.load();
        }
        page.URL.revokeObjectURL(item.url);
    }

    function reset() {
        generation++;
        enabled = false;
        streams.forEach(stream => stream.getTracks().forEach(track => track.stop()));
        streams.clear();
        release(source);
        source = null;
        if (enableButton) enableButton.disabled = true;
        if (resetButton) resetButton.disabled = true;
        report('Real camera selected. Close and reopen Snapchat’s camera.');
    }

    async function prepare(file, preview) {
        reset();
        const token = generation;
        if (!file || !/^(image|video)\//.test(file.type)) {
            report('Choose an image or video file.');
            return;
        }
        const video = file.type.startsWith('video/');
        const media = create(video ? 'video' : 'img');
        const canvas = create('canvas');
        const item = {media, canvas, video, url: page.URL.createObjectURL(file)};
        // Capture only pixels: selected videos and replacement camera output are silent.
        if (video) { media.muted = true; media.loop = true; media.playsInline = true; }
        report('Loading local preview…');
        try {
            await new Promise((resolve, reject) => {
                let timeout;
                const finish = (error) => {
                    page.clearTimeout(timeout);
                    media.onload = media.onloadeddata = media.onerror = null;
                    error ? reject(error) : resolve();
                };
                media[video ? 'onloadeddata' : 'onload'] = () => finish();
                media.onerror = () => finish(new Error('This media format could not be opened.'));
                timeout = page.setTimeout(() => finish(new Error('Media loading timed out.')), 15000);
                media.src = item.url;
            });
            if (token !== generation) { release(item); return; }
            if (video) await media.play();
            if (token !== generation) { release(item); return; }
            const width = video ? media.videoWidth : media.naturalWidth;
            const height = video ? media.videoHeight : media.naturalHeight;
            if (!width || !height) throw new Error('The selected media has no video frame.');
            const scale = Math.min(1, 1920 / Math.max(width, height));
            canvas.width = Math.max(1, Math.round(width * scale));
            canvas.height = Math.max(1, Math.round(height * scale));
            const context = canvas.getContext('2d');
            if (!context || !canvas.captureStream) throw new Error('Canvas camera capture is unavailable in this browser.');
            const draw = () => context.drawImage(media, 0, 0, canvas.width, canvas.height);
            draw();
            item.stream = canvas.captureStream(30);
            item.timer = page.setInterval(draw, 1000 / 30);
            canvas.style.cssText = 'display:block;width:100%;max-height:180px;object-fit:contain;background:#000;margin:8px 0';
            preview.replaceChildren(canvas);
            source = item;
            enableButton.disabled = false;
            resetButton.disabled = false;
            report('Preview only. Click Use as camera, then reopen Snapchat’s camera.');
        } catch (error) {
            release(item);
            if (token === generation) report(error.message || 'Could not load this file.');
        }
    }

    devices.getUserMedia = async function (constraints) {
        if (!enabled || !source || !constraints?.video) {
            return originalGetUserMedia.call(this, constraints);
        }
        // Do not request the real camera or microphone in replacement mode.
        const stream = new page.MediaStream(source.stream.getVideoTracks().map(track => track.clone()));
        streams.add(stream);
        stream.getTracks().forEach(track => on(track, 'ended', () => streams.delete(stream)));
        report('Local media camera active (silent). Use Snapchat’s preview before sending.');
        return stream;
    };

    function mount() {
        if (!page.document.body || page.document.getElementById('sharrafona-local-camera')) return;
        const panel = create('details');
        panel.id = 'sharrafona-local-camera';
        panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:290px;max-height:75vh;overflow:auto;background:#202124;color:white;padding:12px;border:1px solid #777;border-radius:12px;font:13px/1.5 system-ui;box-shadow:0 4px 24px #0008;color-scheme:dark';
        const heading = create('summary');
        heading.textContent = 'Sharrafona · Local camera';
        heading.style.cursor = 'pointer';
        const note = create('p');
        note.textContent = 'Experimental photo/video camera input. Video loops without sound. Snapchat may label or reject it. Selecting a file only previews it; using it as camera makes it available to Snapchat, including calls.';
        const input = create('input');
        input.type = 'file';
        input.accept = 'image/*,video/*';
        input.setAttribute('aria-label', 'Choose a local camera image or video');
        input.style.width = '100%';
        const preview = create('div');
        enableButton = create('button');
        enableButton.textContent = 'Use as camera';
        enableButton.disabled = true;
        resetButton = create('button');
        resetButton.textContent = 'Reset to real camera';
        resetButton.disabled = true;
        for (const button of [enableButton, resetButton]) button.style.cssText = 'margin:6px 6px 0 0;padding:6px;cursor:pointer';
        status = create('p');
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.textContent = 'Real camera selected. Choose a file to preview.';
        on(input, 'change', () => { preview.replaceChildren(); prepare(input.files?.[0], preview); input.value = ''; });
        on(enableButton, 'click', () => {
            if (!source) return;
            enabled = true;
            enableButton.disabled = true;
            report('Local camera enabled (silent). Close and reopen Snapchat’s camera.');
        });
        on(resetButton, 'click', () => { reset(); preview.replaceChildren(); });
        panel.append(heading, note, input, preview, enableButton, resetButton, status);
        page.document.body.append(panel);
    }
    if (page.document.body) mount();
    else on(page.document, 'DOMContentLoaded', mount);
    on(page, 'pagehide', reset);
}
installLocalCameraSource(window.unsafeWindow || window);
// LOCAL_CAMERA_SOURCE_END

const SEversion = "1.3.0";
let snapEnhanceSettings = null;
let haveRemovedBluePopup = false;

if (!"SEversion" in localStorage){ // Save current version so we can add settings in future versions of SE (if that makes sense)
    localStorage.setItem("SEversion", SEversion);
}

if (localStorage.getItem("SEversion") != SEversion){
    localStorage.setItem("SEversion", SEversion);
}

const bc = new BroadcastChannel("settingsBroadcast");

bc.onmessage = (ev) => {
    console.log("%cSending the current settings to the Snapchat service worker! \nIf you see this message multiple times, please contact a dev", "color: #FF6F61");
    bc.postMessage(JSON.stringify(snapEnhanceSettings));
}

const baseSnapEnhanceSettings = {"Anti Unfocus Blur": false,
    "Disable Read Receipts": false,
    "Hide Bitmoji": false,
    "No Typing Indication": false,
    "No Distraction": false
};

function checkForNewSettings(){
    let settingsChanged = false;

    for (let setting in snapEnhanceSettings){
        if (!(setting in baseSnapEnhanceSettings)){
            delete snapEnhanceSettings[setting];
            settingsChanged = true;
        }
    }

    for (let setting in baseSnapEnhanceSettings){
        if (!(setting in snapEnhanceSettings)){
            snapEnhanceSettings[setting] = baseSnapEnhanceSettings[setting];
            settingsChanged = true;
        }
    }

    if (settingsChanged){
        localStorage.setItem("snapEnhanceSettings", JSON.stringify(snapEnhanceSettings));
        console.log("Reloading page to add new setting(s)...")
        location.reload()
    }
}

function loadSettings(){
    if ("snapEnhanceSettings" in localStorage){
        console.log("%cLoading settings from localStorage...", "color:rgb(0, 255, 242)");
        snapEnhanceSettings = JSON.parse(localStorage.getItem("snapEnhanceSettings"));
        checkForNewSettings();
        bc.postMessage(snapEnhanceSettings);
    } else {
        snapEnhanceSettings = baseSnapEnhanceSettings;
        bc.postMessage(snapEnhanceSettings);
    }
}

// Thanks https://stackoverflow.com/a/61511955
function waitForElm(selector) {
    if (selector.includes("wHvEy") && haveRemovedBluePopup){
        console.log("waitForElemBypass")
        return new Promise((resolve) => {resolve("alreadyremoved")})
    }

    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    });
}

//reinject the gui when the user switches to another conversation/group
var oldHref = document.location.href;
var observer = new MutationObserver(function() {
        if (oldHref != document.location.href) {
            oldHref = document.location.href;
            injectGui();
            antiDistraction();
        }
});
observer.observe(document.body || document.documentElement, {childList: true,subtree: true});


//wait for the top bar to load then inject the GUI
function injectGui(){
    waitForElm('.k1IaM').then((elm) => {
    console.log('%c(Re)injecting gui...', "color:rgb(9, 255, 0)");
    elm.append(gui.domElement);
   });
}


function antiDistraction(){
    waitForElm("#root > div.Fpg8t > div.BL7do > div.wHvEy").then((elm) => {
        waitForElm("#root > div.Fpg8t > div.Vbjsg.WJjwl > div > div > div > div.k1IaM > div.kxqcc > button").then((elm) => {
            if (snapEnhanceSettings["No Distraction"] == true){
                if (!haveRemovedBluePopup){
                    document.getElementsByClassName("wHvEy")[0].remove();
                    haveRemovedBluePopup = true;
                }

                document.getElementsByClassName("WGPER")[0].disabled = true;
                document.getElementsByClassName("WGPER")[0].title = "No Distraction!!!";

            } else {
                document.getElementsByClassName("WGPER")[0].disabled = false;
                document.getElementsByClassName("WGPER")[0].title = "Spotlight"
            }
        })
    })
}

(function (window) {
    console.log(`%cWelcome to Sharrafona SnapEnhance Web v${localStorage.getItem("SEversion")}!`, "font-size: 2em; background-color: black; font-style: bold;")


    function simpleHook(object, name, proxy) {
        const old = object[name];
        object[name] = proxy(old, object);
    }
    // Bypass upload size
    Object.defineProperty(File.prototype, "size", {
        get: function () {
            return 500;
        }
    });

    // hook main window requests
    const oldWindowFetch = window.fetch;
    window.fetch = (...args) => {
        const url = args[0].url;
        if (typeof url === "string") {
            if (url.endsWith("readreceipt-indexer/batchuploadreadreceipts") && snapEnhanceSettings["Disable Read Receipts"]) {
                console.log("bypassed story read receipt");
                return new Promise((resolve) => resolve(new Response(null, { status: 200 })));
            }
        }
        return oldWindowFetch(...args);
    };
    // Injected into worker
    function workerInjected() {
        workerInjected = () => {} //function should only be called once, even if the settings get updated

        function hookPreRequest(request) {
            if (request.url.endsWith("messagingcoreservice.MessagingCoreService/SendTypingNotification") && snapEnhanceSettings["No Typing Indication"]) {
                console.log("%cbypassed typing notification using PRE", "color:rgb(0, 255, 242)");
                return null;
            }
            if (request.url.endsWith("messagingcoreservice.MessagingCoreService/UpdateConversation") && snapEnhanceSettings["Disable Read Receipts"]) {
                console.log("%cbypassed conversation read receipt", "color:rgb(0, 255, 242)");
                return null;
            }
            return request;
        }
        async function hookPostRequest(request, response) {
            if (request.headers && request.headers.get("content-type") === "application/grpc-web+proto") {
                const arrayBuffer = await response.arrayBuffer();
                response.arrayBuffer = async () => arrayBuffer;
            }

            return response

        }

        // Hook websocket (hide bitmoji)
        WebSocket.prototype.send = new Proxy(WebSocket.prototype.send, {
            apply: function (target, thisArg, argumentsList) {
                //console.log("WebSocket send", argumentsList[0]);
                if (snapEnhanceSettings["Hide Bitmoji"] == false){
                    return target.apply(thisArg, argumentsList);
                }
            }
        });
        // Hook worker web requests
        const oldFetch = fetch;
        // @ts-ignore
        // eslint-disable-next-line no-implicit-globals
        fetch = async (...args) => {
            args[0] = hookPreRequest(args[0]);
            if (args[0] == null) {
                return new Promise((resolve) => resolve(new Response(null, { status: 200 })));
            }
            const requestBody = args[0].body;
            if (requestBody && !requestBody.locked) {
                const buffer = await requestBody.getReader().read();
                args[0] = new Request(args[0], {
                    body: buffer.value,
                    headers: args[0].headers
                });
            }
            // @ts-ignore
            if (args[0].url == "https://web.snapchat.com/messagingcoreservice.MessagingCoreService/SendTypingNotification"){
                console.log("bypass typing maybe maybe???")
                return new Promise(new Response(null, { status: 200 }));
            }

            const result = oldFetch(...args);
            return new Promise(async (resolve, reject) => {
                try {
                    resolve(await hookPostRequest(args[0], await result));
                }
                catch (e) {
                    console.info("Fetch error", e);
                    reject(e);
                }
            });
        };
    }

    function askSettings(){
        bc.postMessage("Settings pls");
    }

    const oldBlobClass = window.Blob;
    window.Blob = class HookedBlob extends Blob {
        constructor(...args) {
            const data = args[0][0];
            if (typeof data === "string" && data.startsWith("importScripts")) {
                args[0][0] += ` let snapEnhanceSettings;
                                ${askSettings.toString()};
                                ${workerInjected.toString()};

                                const bc = new BroadcastChannel("settingsBroadcast");
                                bc.onmessage = (ev) => {
                                    settings = JSON.parse(ev.data);
                                    snapEnhanceSettings = settings;
                                    workerInjected();
                                };

                                askSettings();`;
                window.Blob = oldBlobClass;
            }
            super(...args);
        }
    };
    simpleHook(document, "createElement", (proxy, instance) => (...args) => {
        const result = proxy.call(instance, ...args);
        // Allow audio note and image download
        if (args[0] === "audio" || args[0] === "video" || args[0] === "img") {
            simpleHook(result, "setAttribute", (proxy2, instance2) => (...args2) => {
                result.style = "pointer-events: auto;";
                if (args2[0] === "controlsList"){
                    return;
                }
                proxy2.call(instance2, ...args2);
            });
            result.addEventListener("load", (_) => {
                result.parentElement?.addEventListener("contextmenu", (event) => {
                    event.stopImmediatePropagation();
                });
            });
            result.addEventListener("contextmenu", (event) => {
                event.stopImmediatePropagation();
            });
        }
        return result;
    });
    // Always focused - Fixed now 24/3/25 17:44
    const oldFocus = document.hasFocus();
    document.hasFocus = () => {
        if (snapEnhanceSettings["Anti Unfocus Blur"]){
            return true;
        } else {
        return oldFocus;
        }
    }


    const oldAddEventListener = EventTarget.prototype.addEventListener;
    Object.defineProperty(EventTarget.prototype, "addEventListener", {
        value: function (...args) {
            const eventName = args[0];

            if (eventName === "keydown"){
                return;
        }

            if (eventName === "focus" && snapEnhanceSettings["Anti Unfocus Blur"]){
                return;
        }

            return oldAddEventListener.call(this, ...args);
        }
    });
}(window.unsafeWindow || window));

const gui = new dat.GUI({name: "Sharrafona SnapEnhance", autoPlace: false, closeOnTop: true})
gui.width = 300;
gui.domElement.style.zIndex = 100;
gui.domElement.style.marginTop = "auto"

loadSettings();

for (let [setting,value] of Object.entries(snapEnhanceSettings)){
    gui.add(snapEnhanceSettings, setting).onChange((val) => {
            antiDistraction();
            localStorage.setItem("snapEnhanceSettings", JSON.stringify(snapEnhanceSettings));
            bc.postMessage(JSON.stringify(snapEnhanceSettings));
        }
    );
}


antiDistraction()
injectGui();

