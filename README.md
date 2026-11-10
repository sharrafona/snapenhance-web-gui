# Sharrafona SnapEnhance Web

My maintained fork of [SnapEnhance Web GUI](https://github.com/appelmoesgg/snapenhance-web-gui), originally created by appelmoesGG and SnapEnhance.

## Install
1. Install [Tampermonkey for Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Tampermonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).
2. Follow [Tampermonkey's browser setup instructions](https://www.tampermonkey.net/faq.php#Q209).
3. [Install Sharrafona SnapEnhance Web](https://raw.githubusercontent.com/sharrafona/snapenhance-web-gui/main/snapenhanceGui.user.js).
4. Disable other SnapEnhance userscripts to avoid conflicting hooks, then reload [Snapchat Web](https://web.snapchat.com/).

Updates are served from this repository.

## Experimental local camera (v1.3.0)
1. Update/install the userscript, then reload Snapchat Web.
2. Expand **Sharrafona · Local camera** in the bottom-right corner.
3. Choose an image or video and check the local preview.
4. Click **Use as camera**, then close and reopen Snapchat's camera.
5. Check Snapchat's preview before capturing. Sending remains a manual Snapchat action.
6. Click **Reset to real camera**, then reopen Snapchat's camera to restore it.

Video loops silently; video replacement requests do not access the real camera or microphone. Audio-only requests retain normal browser behavior. The source applies to new video camera requests, including calls, while enabled. Existing camera sessions must be reopened. File selection is temporary and resets on page reload. No automatic sending or posting is implemented.

This is an experimental canvas camera stream, not a promise that Snapchat will accept it or remove source labels. Live Snapchat capture and recipient-side labeling have not been verified.

## Features
Inherited features include media downloading through the context menu, upload-size hooks, focus blur controls, read receipt controls, Bitmoji visibility controls, typing notification controls, and a settings GUI. Compatibility depends on Snapchat's current implementation; these features have not all been verified against the live service.

## Known limitations
- Upstream reports that “No Typing Indication” does not work when “Hide Bitmoji” is off.
- Snapchat interface selectors and request hooks can change.
- The script loads dat.GUI 0.7.9 from cdnjs.

## Development
The installable script is `snapenhanceGui.user.js`. Edit the camera feature in `camera-source.js`, then run `node scripts/build.mjs` to bundle it. Run `node --test tests/camera-source.test.cjs` and `node --check snapenhanceGui.user.js` before publishing. The old TypeScript file is retained as historical source.
Report issues in [this fork](https://github.com/sharrafona/snapenhance-web-gui/issues).

## Credits and license
Maintained by **sharrafona**. Original work by **appelmoesGG and SnapEnhance**.
Distributed under [GPL-3.0-only](LICENSE). Original license and commit history are preserved.

