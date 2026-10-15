/**
 * Monkey-patch react-native-camera's takePictureAsync to use
 * fastMode + onPictureSaved event, bypassing the broken Promise bridge.
 *
 * Import this file ONCE in App.js before any camera usage.
 */
import { Platform } from 'react-native';
import { RNCamera } from 'react-native-camera';

const originalTakePicture = RNCamera.prototype.takePictureAsync;

RNCamera.prototype.takePictureAsync = async function(options = {}) {
  if (!options.quality) options.quality = 1;
  if (options.pauseAfterCapture === undefined) options.pauseAfterCapture = false;

  if (!this._cameraHandle) {
    throw new Error('Camera handle cannot be null');
  }

  const captureId = '' + Date.now() + Math.random();
  options.fastMode = true;
  options.id = captureId;

  return await new Promise((resolve, reject) => {
    this._pendingCaptureResolve = resolve;
    this._pendingCaptureId = captureId;

    // Call native - return value doesn't matter (Promise bridge is broken)
    try {
      originalTakePicture.call(this, options).catch(() => {});
    } catch (e) {
      // Ignore - we're using onPictureSaved event instead
    }

    setTimeout(() => {
      if (this._pendingCaptureId === captureId) {
        this._pendingCaptureResolve = null;
        this._pendingCaptureId = null;
        reject(new Error('Camera capture timed out after 30s'));
      }
    }, 30000);
  });
};

// Patch _onPictureSaved to resolve pending captures
const originalOnPictureSaved = RNCamera.prototype._onPictureSaved;

RNCamera.prototype._onPictureSaved = function(event) {
  if (this._pendingCaptureResolve) {
    const nativeEvent = event && event.nativeEvent ? event.nativeEvent : event;
    const data = nativeEvent && nativeEvent.data ? nativeEvent.data : nativeEvent;
    this._pendingCaptureResolve(data);
    this._pendingCaptureResolve = null;
    this._pendingCaptureId = null;
  }
  if (originalOnPictureSaved) {
    originalOnPictureSaved.call(this, event);
  }
};

console.log('Camera patch applied: fastMode + onPictureSaved');
