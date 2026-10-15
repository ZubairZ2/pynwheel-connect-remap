#!/usr/bin/env node
/**
 * Patches react-native-video to handle null RCTVideoInstance.Constants on Android
 * (e.g. when native module is not ready or not linked).
 */
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '../node_modules/react-native-video/Video.js');
if (!fs.existsSync(target)) {
  process.exit(0);
}

let content = fs.readFileSync(target, 'utf8');
const needPatch = content.includes("RCTVideoInstance.Constants.ScaleToFill") && !content.includes('Constants = RCTVideoInstance && RCTVideoInstance.Constants');

if (!needPatch) {
  process.exit(0);
}

const oldBlock = `    let nativeResizeMode;
    const RCTVideoInstance = this.getViewManagerConfig('RCTVideo');

    if (resizeMode === VideoResizeMode.stretch) {
      nativeResizeMode = RCTVideoInstance.Constants.ScaleToFill;
    } else if (resizeMode === VideoResizeMode.contain) {
      nativeResizeMode = RCTVideoInstance.Constants.ScaleAspectFit;
    } else if (resizeMode === VideoResizeMode.cover) {
      nativeResizeMode = RCTVideoInstance.Constants.ScaleAspectFill;
    } else {
      nativeResizeMode = RCTVideoInstance.Constants.ScaleNone;
    }`;

const newBlock = `    let nativeResizeMode;
    const RCTVideoInstance = this.getViewManagerConfig('RCTVideo');
    const Constants = RCTVideoInstance && RCTVideoInstance.Constants;
    const defaultResizeModes = { stretch: 1, contain: 2, cover: 3, none: 0 };

    if (Constants) {
      if (resizeMode === VideoResizeMode.stretch) {
        nativeResizeMode = Constants.ScaleToFill;
      } else if (resizeMode === VideoResizeMode.contain) {
        nativeResizeMode = Constants.ScaleAspectFit;
      } else if (resizeMode === VideoResizeMode.cover) {
        nativeResizeMode = Constants.ScaleAspectFill;
      } else {
        nativeResizeMode = Constants.ScaleNone;
      }
    } else {
      nativeResizeMode = defaultResizeModes[resizeMode] !== undefined ? defaultResizeModes[resizeMode] : defaultResizeModes.cover;
    }`;

content = content.replace(oldBlock, newBlock);
if (content.includes('Constants = RCTVideoInstance && RCTVideoInstance.Constants')) {
  fs.writeFileSync(target, content);
  console.log('Patched react-native-video for null RCTVideoInstance.Constants');
}
