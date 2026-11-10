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
