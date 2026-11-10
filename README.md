# Sharrafona SnapEnhance Web

My maintained fork of [SnapEnhance Web GUI](https://github.com/appelmoesgg/snapenhance-web-gui), originally created by appelmoesGG and SnapEnhance.

## Install
1. Install [Tampermonkey for Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Tampermonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).
2. Follow [Tampermonkey's browser setup instructions](https://www.tampermonkey.net/faq.php#Q209).
3. [Install Sharrafona SnapEnhance Web](https://raw.githubusercontent.com/sharrafona/snapenhance-web-gui/main/snapenhanceGui.user.js).
4. Disable other SnapEnhance userscripts to avoid conflicting hooks, then reload [Snapchat Web](https://web.snapchat.com/).

Updates are served from this repository.

## Features
Inherited features include media downloading through the context menu, upload-size hooks, focus blur controls, read receipt controls, Bitmoji visibility controls, typing notification controls, and a settings GUI. Compatibility depends on Snapchat's current implementation; these features have not all been verified against the live service.

## Known limitations
- Upstream reports that “No Typing Indication” does not work when “Hide Bitmoji” is off.
- Snapchat interface selectors and request hooks can change.
- The script loads dat.GUI 0.7.9 from cdnjs.

## Development
The active script is `snapenhanceGui.user.js`. The old TypeScript file is retained as historical source.
Report issues in [this fork](https://github.com/sharrafona/snapenhance-web-gui/issues).

## Credits and license
Maintained by **sharrafona**. Original work by **appelmoesGG and SnapEnhance**.
Distributed under [GPL-3.0-only](LICENSE). Original license and commit history are preserved.
