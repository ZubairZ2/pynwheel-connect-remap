package com.pynwheel.tour.igloohomeble

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import co.igloo.core.ble.exception.IglooSdkException
import co.igloo.home.sdk.IglooPlugin
import co.igloo.home.sdk.exception.IglooHomeException
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeout

/**
 * The igloohome Bluetooth SDK 3.x (co.igloo.home:sdk) behind the Pynwheel Tour
 * app's igloohome v1 flow. The JavaScript contract (definitions.ts) is the
 * one the legacy SDK had - scan, connect with the guest key, unlock,
 * disconnect - and this SDK's shape is folded into it:
 *
 *   IglooPlugin(context).scanDevice()      → a Flow of every lock in range, by Bluetooth name
 *   connect(name, key)                     → no SDK call: the SDK connects when it unlocks, so the
 *                                            plugin only checks the lock was seen and keeps the key
 *   IglooPlugin.unlock(name, key, now)     → connects with the guest key, sets the time, opens the lock
 *   IglooPlugin.disconnect(name)           → drops the connection the unlock left open
 *
 * One scan, one lock, one unlock at a time ([LockSession]); every failure is
 * answered with a stable error code the app understands ([reject]). The
 * guest key is never logged. The SDK insists on a single IglooPlugin
 * instance per process, so it lives for the plugin's lifetime.
 */
@CapacitorPlugin(
    name = "IgloohomeBle",
    permissions = [
        Permission(alias = IgloohomeBlePlugin.ALIAS_BLUETOOTH, strings = [Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_CONNECT]),
        Permission(alias = IgloohomeBlePlugin.ALIAS_LOCATION, strings = [Manifest.permission.ACCESS_FINE_LOCATION])
    ]
)
class IgloohomeBlePlugin : Plugin() {

    companion object {
        const val ALIAS_BLUETOOTH = "bluetooth"
        const val ALIAS_LOCATION = "location"
        private const val DEFAULT_SCAN_TIMEOUT_MS = 60_000L
        private const val DEFAULT_UNLOCK_TIMEOUT_MS = 30_000L

        /** The stable code for an SDK failure. Status codes are the SDK's documented ones; names cover the lower layer. */
        internal fun codeOf(error: Throwable): String {
            if (error is TimeoutCancellationException) return "timeout"
            if (error is CancellationException) return "cancelled"
            val status = (error as? IglooHomeException)?.status ?: (error as? IglooSdkException)?.status
            when (status) {
                12 -> return "connect_failed"
                703 -> return "timeout"
                708 -> return "bluetooth_off"
                972 -> return "not_found"
            }
            val names = listOfNotNull(error.javaClass.simpleName, (error as? IglooHomeException)?.source?.javaClass?.simpleName, error.cause?.javaClass?.simpleName)
            for (name in names) {
                when {
                    name.contains("Timeout") -> return "timeout"
                    name.contains("Bluetooth") -> return "bluetooth_off"
                    name.contains("Connection") -> return "connect_failed"
                    name.contains("MaxScanAttempts") -> return "not_found"
                    name.contains("Permission") -> return "permission_denied"
                    name.contains("InvalidKey") || name.contains("InvalidRights") -> return "invalid_key"
                }
            }
            return "sdk_error"
        }

        /** The SDK's own words for a failure (its message, the status, or the class), for the app's banner; never a key. */
        internal fun describe(error: Throwable): String {
            val message = error.message?.takeIf { it.isNotBlank() } ?: (error as? IglooHomeException)?.source?.message?.takeIf { it.isNotBlank() }
            val status = (error as? IglooHomeException)?.status ?: (error as? IglooSdkException)?.status
            val text = message ?: error.javaClass.simpleName
            return if (status != null && !text.contains(status.toString())) "$text (status $status)" else text
        }
    }

    private val session = LockSession()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val foundLocks = LinkedHashMap<String, Int?>()

    private var sdk: IglooPlugin? = null
    private var scanJob: Job? = null
    private var unlockJob: Job? = null
    /** The lock `connect` chose and the key it was given; the SDK uses both when it unlocks. */
    private var selectedLock: String? = null
    private var selectedKey: String? = null
    /** The unlock call still waiting for the SDK: settled exactly once, by the SDK or by a cancel. */
    private var unlockCall: PluginCall? = null

    private fun sdk(): IglooPlugin = sdk ?: IglooPlugin(context).also { sdk = it }

    // ------------------------------------------------------------------ state

    @PluginMethod
    fun initialize(call: PluginCall) {
        val out = JSObject()
        out.put("platform", "android")
        out.put("supported", hasBluetoothLe())
        out.put("enabled", adapterEnabled())
        call.resolve(out)
    }

    /** The permission the running Android version needs: Bluetooth on 12+, fine location below (a BLE scan needs it there). */
    private fun neededAlias(): String = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) ALIAS_BLUETOOTH else ALIAS_LOCATION

    @PluginMethod
    override fun checkPermissions(call: PluginCall) {
        call.resolve(permissionStatus())
    }

    @PluginMethod
    override fun requestPermissions(call: PluginCall) {
        val alias = neededAlias()
        if (getPermissionState(alias) == PermissionState.GRANTED) {
            call.resolve(permissionStatus())
        } else {
            requestPermissionForAlias(alias, call, "permissionsCallback")
        }
    }

    @PermissionCallback
    private fun permissionsCallback(call: PluginCall) {
        call.resolve(permissionStatus())
    }

    private fun permissionStatus(): JSObject {
        val out = JSObject()
        out.put("bluetooth", getPermissionState(neededAlias()).toString())
        return out
    }

    // ------------------------------------------------------------------- scan

    @PluginMethod
    fun startScan(call: PluginCall) {
        if (!hasBluetoothLe()) {
            reject(call, "unsupported", "This device has no Bluetooth LE.")
            return
        }
        if (!adapterEnabled()) {
            reject(call, "bluetooth_off", "Bluetooth is switched off.")
            return
        }
        if (getPermissionState(neededAlias()) != PermissionState.GRANTED) {
            reject(call, "permission_denied", "Bluetooth permission was not granted.")
            return
        }
        if (session.beginScan() != LockSession.Refusal.NONE) {
            reject(call, "busy", "Another scan or connection is in progress.")
            return
        }
        val timeoutMs = call.getLong("timeoutMs", DEFAULT_SCAN_TIMEOUT_MS) ?: DEFAULT_SCAN_TIMEOUT_MS
        foundLocks.clear()
        val sdk = try {
            sdk()
        } catch (error: Throwable) {
            session.endScan()
            reject(call, codeOf(error), describe(error))
            return
        }
        scanJob = scope.launch {
            try {
                withTimeout(timeoutMs) {
                    sdk.scanDevice().collect { result ->
                        val name = result.deviceId
                        if (name.isNullOrEmpty()) return@collect
                        foundLocks[name] = result.rssi
                        val event = JSObject()
                        event.put("name", name)
                        event.put("rssi", result.rssi)
                        notifyListeners("lockFound", event)
                    }
                }
                finishScan("stopped", null, cancelJob = false)
            } catch (error: TimeoutCancellationException) {
                finishScan("timeout", null, cancelJob = false)
            } catch (error: CancellationException) {
                // stopScan / reset / connect already reported the stop.
            } catch (error: Throwable) {
                finishScan("error", describe(error), cancelJob = false)
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun stopScan(call: PluginCall) {
        finishScan("stopped", null)
        call.resolve()
    }

    private fun finishScan(reason: String, message: String?, cancelJob: Boolean = true) {
        val wasScanning = session.isScanning
        val job = scanJob
        scanJob = null
        if (cancelJob) job?.cancel()
        session.endScan()
        if (wasScanning) {
            val event = JSObject()
            event.put("reason", reason)
            if (message != null) event.put("message", message)
            notifyListeners("scanStopped", event)
        }
    }

    // ---------------------------------------------------------------- connect

    /**
     * This SDK has no connect step of its own (it connects inside `unlock`), so
     * `connect` only settles which lock the next unlock targets and with which
     * key: the lock must have been seen by the scan, and nothing else may be
     * in progress. The scan is stopped, as the legacy SDK required.
     */
    @PluginMethod
    fun connect(call: PluginCall) {
        val name = call.getString("name")
        val key = call.getString("key")
        if (name.isNullOrEmpty() || key.isNullOrEmpty()) {
            reject(call, "sdk_error", "A lock name and a guest key are required.")
            return
        }
        if (!foundLocks.containsKey(name)) {
            reject(call, "not_found", "The lock $name was not seen by the scan.")
            return
        }
        if (session.beginConnect() != LockSession.Refusal.NONE) {
            reject(call, "busy", "A connection is already in progress.")
            return
        }
        finishScan("stopped", null)
        selectedLock = name
        selectedKey = key
        session.connected(name)
        val out = JSObject()
        out.put("name", name)
        call.resolve(out)
    }

    // ----------------------------------------------------------------- unlock

    @PluginMethod
    fun unlock(call: PluginCall) {
        val refusal = session.beginUnlock()
        val name = selectedLock
        val key = selectedKey
        if (refusal == LockSession.Refusal.NOT_CONNECTED || name == null || key == null) {
            reject(call, "not_connected", "No lock is connected.")
            return
        }
        if (refusal == LockSession.Refusal.BUSY) {
            reject(call, "busy", "An unlock is already in progress.")
            return
        }
        val timeoutMs = call.getLong("timeoutMs", DEFAULT_UNLOCK_TIMEOUT_MS) ?: DEFAULT_UNLOCK_TIMEOUT_MS
        unlockCall = call
        unlockJob = scope.launch {
            try {
                withTimeout(timeoutMs) {
                    // The SDK connects with the key, sets the lock's clock to now and unlocks.
                    sdk().unlock(name, key, System.currentTimeMillis() / 1000, null)
                }
                val pending = takeUnlockCall()
                session.endUnlock()
                if (pending == null) return@launch // cancelled meanwhile
                val out = JSObject()
                out.put("unlocked", true)
                pending.resolve(out)
            } catch (error: Throwable) {
                val pending = takeUnlockCall()
                session.endUnlock()
                if (pending == null) return@launch
                val code = codeOf(error)
                // A connection failure inside the unlock is an unlock failure to the app, as it was with the legacy SDK.
                reject(pending, if (code == "sdk_error" || code == "connect_failed") "unlock_failed" else code, describe(error))
            }
        }
    }

    @Synchronized
    private fun takeUnlockCall(): PluginCall? {
        val pending = unlockCall
        unlockCall = null
        return pending
    }

    // --------------------------------------------------------------- cleanup

    @PluginMethod
    fun disconnect(call: PluginCall) {
        disconnectNow { call.resolve() }
    }

    @PluginMethod
    fun reset(call: PluginCall) {
        finishScan("stopped", null)
        foundLocks.clear()
        disconnectNow { call.resolve() }
    }

    /** Drops the connection; an unlock still waiting is answered `cancelled` so its promise settles. */
    private fun disconnectNow(then: () -> Unit) {
        val unlocking = takeUnlockCall()
        unlockJob?.cancel()
        unlockJob = null
        val name = selectedLock
        selectedLock = null
        selectedKey = null
        session.disconnected()
        if (unlocking != null) reject(unlocking, "cancelled", "The unlock was cancelled.")
        val sdk = sdk
        if (sdk == null || name == null) {
            then()
            return
        }
        scope.launch {
            try {
                sdk.disconnect(name)
            } catch (_: Throwable) {
                // nothing was connected, or the SDK already dropped it
            }
            then()
        }
    }

    override fun handleOnDestroy() {
        finishScan("stopped", null)
        disconnectNow {}
        scope.coroutineContext[Job]?.cancel()
        super.handleOnDestroy()
    }

    // --------------------------------------------------------------- helpers

    private fun hasBluetoothLe(): Boolean = context.packageManager.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH_LE)

    private fun adapterEnabled(): Boolean {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        val adapter: BluetoothAdapter? = manager?.adapter
        return adapter?.isEnabled == true
    }

    private fun reject(call: PluginCall, code: String, message: String) {
        call.reject(message, code)
    }
}
