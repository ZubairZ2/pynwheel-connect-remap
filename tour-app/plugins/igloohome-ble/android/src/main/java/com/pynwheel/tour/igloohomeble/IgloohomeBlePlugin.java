package com.pynwheel.tour.igloohomeble;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.ScanSettings;
import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

import co.igloohome.ble.lock.BleManager;
import co.igloohome.ble.lock.IglooLock;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;

/**
 * The igloohome Bluetooth SDK (ble-sdk-release.aar) behind the Pynwheel Tour
 * app's igloohome v1 flow, exactly as the legacy React Native module
 * (pyn-tour-old/android/.../igloo/IglooModule.java) drove it:
 *
 *   BleManager(context).scan(...)            → every lock in range, by Bluetooth name
 *   IglooLock.connectByStringKey(ctx, key)   → the guest key the backend issued
 *   IglooLock.unlock(now, now)               → the lock opens
 *   dispose the connection                   → disconnect
 *
 * One scan, one connection, one unlock at a time ({@link LockSession});
 * every failure is answered with a stable error code the app understands
 * ({@link #reject}). The guest key is never logged.
 */
@CapacitorPlugin(
    name = "IgloohomeBle",
    permissions = {
        @Permission(alias = IgloohomeBlePlugin.ALIAS_BLUETOOTH, strings = { Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT }),
        @Permission(alias = IgloohomeBlePlugin.ALIAS_LOCATION, strings = { Manifest.permission.ACCESS_FINE_LOCATION })
    }
)
public class IgloohomeBlePlugin extends Plugin {

    static final String ALIAS_BLUETOOTH = "bluetooth";
    static final String ALIAS_LOCATION = "location";

    private static final long DEFAULT_SCAN_TIMEOUT_MS = 60_000;
    private static final long DEFAULT_CONNECT_TIMEOUT_MS = 30_000;
    private static final long DEFAULT_UNLOCK_TIMEOUT_MS = 30_000;

    private final LockSession session = new LockSession();
    private final List<IglooLock> foundLocks = new ArrayList<>();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Nullable private BleManager bleManager;
    @Nullable private Disposable scanDisposable;
    @Nullable private Disposable connectDisposable;
    @Nullable private Disposable unlockDisposable;
    @Nullable private IglooLock selectedLock;
    @Nullable private Runnable scanTimeout;

    // ------------------------------------------------------------------ state

    @PluginMethod
    public void initialize(PluginCall call) {
        JSObject out = new JSObject();
        out.put("platform", "android");
        out.put("supported", hasBluetoothLe());
        out.put("enabled", adapterEnabled());
        if (bleManager == null && hasBluetoothLe()) bleManager = new BleManager(getContext());
        call.resolve(out);
    }

    /** The permission the running Android version needs: Bluetooth on 12+, fine location below (a BLE scan needs it there). */
    private String neededAlias() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? ALIAS_BLUETOOTH : ALIAS_LOCATION;
    }

    @Override
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        call.resolve(permissionStatus());
    }

    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        String alias = neededAlias();
        if (getPermissionState(alias) == PermissionState.GRANTED) {
            call.resolve(permissionStatus());
        } else {
            requestPermissionForAlias(alias, call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        call.resolve(permissionStatus());
    }

    private JSObject permissionStatus() {
        JSObject out = new JSObject();
        out.put("bluetooth", getPermissionState(neededAlias()).toString());
        return out;
    }

    // ------------------------------------------------------------------- scan

    @PluginMethod
    public void startScan(PluginCall call) {
        if (!hasBluetoothLe()) {
            reject(call, "unsupported", "This device has no Bluetooth LE.");
            return;
        }
        if (!adapterEnabled()) {
            reject(call, "bluetooth_off", "Bluetooth is switched off.");
            return;
        }
        if (getPermissionState(neededAlias()) != PermissionState.GRANTED) {
            reject(call, "permission_denied", "Bluetooth permission was not granted.");
            return;
        }
        if (session.beginScan() != LockSession.Refusal.NONE) {
            reject(call, "busy", "Another scan or connection is in progress.");
            return;
        }
        long timeoutMs = call.getLong("timeoutMs", DEFAULT_SCAN_TIMEOUT_MS);
        foundLocks.clear();
        if (bleManager == null) bleManager = new BleManager(getContext());
        try {
            ScanSettings settings = new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build();
            scanDisposable = bleManager.scan(settings, mainHandler)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(lock -> {
                    if (!containsLock(lock.getName())) foundLocks.add(lock);
                    JSObject event = new JSObject();
                    event.put("name", lock.getName());
                    event.put("rssi", lock.getRssi());
                    notifyListeners("lockFound", event);
                }, error -> {
                    finishScan("error", describe(error));
                });
        } catch (Throwable error) {
            session.endScan();
            reject(call, codeOf(error), describe(error));
            return;
        }
        scanTimeout = () -> finishScan("timeout", null);
        mainHandler.postDelayed(scanTimeout, timeoutMs);
        call.resolve();
    }

    @PluginMethod
    public void stopScan(PluginCall call) {
        finishScan("stopped", null);
        call.resolve();
    }

    private void finishScan(String reason, @Nullable String message) {
        boolean wasScanning = session.isScanning();
        if (scanTimeout != null) {
            mainHandler.removeCallbacks(scanTimeout);
            scanTimeout = null;
        }
        if (scanDisposable != null && !scanDisposable.isDisposed()) scanDisposable.dispose();
        scanDisposable = null;
        session.endScan();
        if (wasScanning) {
            JSObject event = new JSObject();
            event.put("reason", reason);
            if (message != null) event.put("message", message);
            notifyListeners("scanStopped", event);
        }
    }

    // ---------------------------------------------------------------- connect

    @PluginMethod
    public void connect(PluginCall call) {
        String name = call.getString("name");
        String key = call.getString("key");
        if (name == null || name.isEmpty() || key == null || key.isEmpty()) {
            reject(call, "sdk_error", "A lock name and a guest key are required.");
            return;
        }
        IglooLock lock = lockByName(name);
        if (lock == null) {
            reject(call, "not_found", "The lock " + name + " was not seen by the scan.");
            return;
        }
        if (session.beginConnect() != LockSession.Refusal.NONE) {
            reject(call, "busy", "A connection is already in progress.");
            return;
        }
        // The SDK needs the scan stopped before it connects (the legacy module disposed it too).
        finishScan("stopped", null);
        long timeoutMs = call.getLong("timeoutMs", DEFAULT_CONNECT_TIMEOUT_MS);
        selectedLock = lock;
        disposeConnection();
        try {
            connectDisposable = lock.connectByStringKey(getContext(), key)
                .timeout(timeoutMs, TimeUnit.MILLISECONDS)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(connected -> {
                    if (session.state() != LockSession.State.CONNECTING) return; // cancelled meanwhile
                    session.connected(connected.getName());
                    JSObject out = new JSObject();
                    out.put("name", connected.getName());
                    call.resolve(out);
                }, error -> {
                    session.connectFailed();
                    disposeConnection();
                    reject(call, codeOf(error), describe(error));
                });
        } catch (Throwable error) {
            session.connectFailed();
            reject(call, codeOf(error), describe(error));
        }
    }

    // ----------------------------------------------------------------- unlock

    @PluginMethod
    public void unlock(PluginCall call) {
        LockSession.Refusal refusal = session.beginUnlock();
        if (refusal == LockSession.Refusal.NOT_CONNECTED || selectedLock == null) {
            reject(call, "not_connected", "No lock is connected.");
            return;
        }
        if (refusal == LockSession.Refusal.BUSY) {
            reject(call, "busy", "An unlock is already in progress.");
            return;
        }
        long timeoutMs = call.getLong("timeoutMs", DEFAULT_UNLOCK_TIMEOUT_MS);
        // The legacy module passed the current epoch seconds as both arguments; kept as is.
        int now = (int) (System.currentTimeMillis() / 1000);
        try {
            unlockDisposable = selectedLock.unlock((long) now, now)
                .timeout(timeoutMs, TimeUnit.MILLISECONDS)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(() -> {
                    session.endUnlock();
                    JSObject out = new JSObject();
                    out.put("unlocked", true);
                    call.resolve(out);
                }, error -> {
                    session.endUnlock();
                    String code = codeOf(error);
                    reject(call, "sdk_error".equals(code) || "connect_failed".equals(code) ? "unlock_failed" : code, describe(error));
                });
        } catch (Throwable error) {
            session.endUnlock();
            reject(call, "unlock_failed", describe(error));
        }
    }

    // --------------------------------------------------------------- cleanup

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectNow();
        call.resolve();
    }

    @PluginMethod
    public void reset(PluginCall call) {
        finishScan("stopped", null);
        disconnectNow();
        foundLocks.clear();
        call.resolve();
    }

    private void disconnectNow() {
        if (unlockDisposable != null && !unlockDisposable.isDisposed()) unlockDisposable.dispose();
        unlockDisposable = null;
        disposeConnection();
        selectedLock = null;
        session.disconnected();
    }

    private void disposeConnection() {
        if (connectDisposable != null && !connectDisposable.isDisposed()) connectDisposable.dispose();
        connectDisposable = null;
    }

    /** A scan in the background finds nothing useful and drains the battery: stop it; a connection is kept. */
    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (session.isScanning()) finishScan("paused", null);
    }

    @Override
    protected void handleOnDestroy() {
        finishScan("stopped", null);
        disconnectNow();
        foundLocks.clear();
        super.handleOnDestroy();
    }

    // --------------------------------------------------------------- helpers

    private boolean hasBluetoothLe() {
        return getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE);
    }

    private boolean adapterEnabled() {
        BluetoothManager manager = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
        BluetoothAdapter adapter = manager == null ? null : manager.getAdapter();
        return adapter != null && adapter.isEnabled();
    }

    private boolean containsLock(String name) {
        return lockByName(name) != null;
    }

    @Nullable
    private IglooLock lockByName(String name) {
        for (IglooLock lock : foundLocks) {
            if (name.equals(lock.getName())) return lock;
        }
        return null;
    }

    private void reject(PluginCall call, String code, String message) {
        JSObject data = new JSObject();
        data.put("code", code);
        call.reject(message, code, null, data);
    }

    /** The SDK's typed errors (co.igloohome.ble.error.Exception$…) and Rx's timeout, as the app's error codes. */
    static String codeOf(@NonNull Throwable error) {
        if (error instanceof java.util.concurrent.TimeoutException) return "timeout";
        String name = error.getClass().getSimpleName();
        if (name.contains("InvalidKey") || name.contains("InvalidRights")) return "invalid_key";
        if (name.contains("PermissionsNotGranted")) return "permission_denied";
        if (name.contains("BluetoothNotSupported")) return "unsupported";
        if (name.contains("Timeout")) return "timeout";
        if (name.contains("OperationInProgress")) return "busy";
        if (name.contains("Connection") || name.contains("Bluetooth")) return "connect_failed";
        return "sdk_error";
    }

    private static String describe(@NonNull Throwable error) {
        String message = error.getMessage();
        return message == null || message.isEmpty() ? error.getClass().getSimpleName() : message;
    }
}
