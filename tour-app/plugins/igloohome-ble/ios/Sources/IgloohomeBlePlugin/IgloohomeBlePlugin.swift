import Foundation
import Capacitor
import CoreBluetooth
import IgloohomeSDK

/**
 * igloohome's SDK 3.x for iOS (IgloohomeSDK, over the prebuilt IglooSDKCore)
 * behind the Pynwheel Tour app's igloohome v1 flow: the same method set,
 * events and error codes as the Android plugin (IgloohomeBlePlugin.kt over
 * co.igloo.home:sdk), and the same folding of this SDK's shape into the
 * JavaScript contract (definitions.ts):
 *
 *   IglooPlugin().scansLock()            → a stream of every lock in range, by Bluetooth name
 *   connect(name, key)                   → no SDK call: the SDK connects when it unlocks, so the
 *                                          plugin only checks the lock was seen and keeps the key
 *   IglooPlugin.unlock(name, key:, now)  → connects with the guest key, sets the clock, opens the lock
 *   IglooPlugin.disconnect(name)         → drops the connection the unlock left open
 *
 * The SDK has no view of the radio, so Core Bluetooth is asked directly: one
 * central manager, created only once the visitor has been asked for the
 * Bluetooth permission (creating it is what shows the system prompt, and,
 * with the radio off, the system's "turn on Bluetooth" alert). Its state
 * answers `initialize`, `enableBluetooth` and the guard before a scan.
 *
 * `IglooPlugin` is a main-actor type and Capacitor calls plugin methods on
 * its own queue, so every method hops to the main queue first and all state
 * lives there; SDK calls run in main-actor tasks. Every timeout is a
 * cancellable `DispatchWorkItem` on the main queue (Capacitor's queue has
 * no run loop for a `Timer`). An unlock call still waiting for the SDK is
 * kept in a field and settled exactly once: by the SDK, by its timeout, or
 * with `cancelled` when `reset` / `disconnect` drop the connection. The
 * guest key is never logged.
 */
@objc(IgloohomeBlePlugin)
public class IgloohomeBlePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IgloohomeBlePlugin"
    public let jsName = "IgloohomeBle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enableBluetooth", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reset", returnType: CAPPluginReturnPromise)
    ]

    private static let defaultScanTimeout: TimeInterval = 60
    private static let defaultUnlockTimeout: TimeInterval = 30
    /// How long the system Bluetooth prompt may stay unanswered before `requestPermissions` answers with what it has.
    private static let permissionPromptTimeout: TimeInterval = 120
    /// How long a freshly created central manager may take to report the radio's state.
    private static let stateTimeout: TimeInterval = 3

    // ------------------------------------------------------------ main-queue state

    /// The one central manager; `nil` until the permission prompt may be shown.
    private var central: CBCentralManager?
    private var centralState: CBManagerState = .unknown
    private var stateWaiters: [(CBManagerState) -> Void] = []
    private var pendingPermissionCall: CAPPluginCall?
    private var permissionTimeout: DispatchWorkItem?

    private var sdk: IglooPlugin?
    /// The locks the current / last scan saw, by Bluetooth name (this SDK reports no RSSI).
    private var foundLocks: Set<String> = []
    private var scanning = false
    private var scanTask: Task<Void, Never>?
    private var scanTimeout: DispatchWorkItem?
    /// The lock `connect` chose and the key it was given; the SDK uses both when it unlocks.
    private var selectedLock: String?
    private var selectedKey: String?
    private var unlocking = false
    private var unlockTask: Task<Void, Never>?
    private var unlockTimeout: DispatchWorkItem?
    /// The unlock call still waiting for the SDK: settled exactly once.
    private var unlockCall: CAPPluginCall?

    private func onMain(_ body: @escaping () -> Void) {
        if Thread.isMainThread { body() } else { DispatchQueue.main.async(execute: body) }
    }

    private func reject(_ call: CAPPluginCall, _ code: String, _ message: String) {
        call.reject(message, code, nil, ["code": code])
    }

    private func sdkPlugin() -> IglooPlugin {
        MainActor.assumeIsolated {
            if let existing = sdk { return existing }
            let created = IglooPlugin()
            sdk = created
            return created
        }
    }

    // ------------------------------------------------------------------ radio

    private var authorized: Bool { CBCentralManager.authorization == .allowedAlways }

    private func permissionValue() -> String {
        switch CBCentralManager.authorization {
        case .allowedAlways: return "granted"
        case .denied, .restricted: return "denied"
        default: return "prompt"
        }
    }

    /// Creates the central manager if needed. With the permission undecided this shows the system prompt; with the
    /// radio off, the system's "turn on Bluetooth" alert.
    private func ensureCentral(recreate: Bool = false) {
        if recreate { central = nil; centralState = .unknown }
        if central == nil {
            central = CBCentralManager(delegate: self, queue: .main, options: [CBCentralManagerOptionShowPowerAlertKey: true])
        }
    }

    /// Runs `completion` with the radio's state once the manager has reported it (or after `stateTimeout`).
    private func withCentralState(_ completion: @escaping (CBManagerState) -> Void) {
        if centralState != .unknown && centralState != .resetting {
            completion(centralState)
            return
        }
        let waiter: (CBManagerState) -> Void = { completion($0) }
        stateWaiters.append(waiter)
        let timeout = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            self.flushStateWaiters()
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + IgloohomeBlePlugin.stateTimeout, execute: timeout)
    }

    private func flushStateWaiters() {
        let waiters = stateWaiters
        stateWaiters = []
        let state = centralState
        waiters.forEach { $0(state) }
    }

    /// Answers the waiting `requestPermissions` call with the authorization as it stands now (once).
    private func settlePermission() {
        permissionTimeout?.cancel()
        permissionTimeout = nil
        guard let call = pendingPermissionCall else { return }
        pendingPermissionCall = nil
        call.resolve(["bluetooth": permissionValue()])
    }

    // ------------------------------------------------------------------ state

    @objc func initialize(_ call: CAPPluginCall) {
        onMain { [self] in
            #if targetEnvironment(simulator)
            call.resolve(["platform": "ios", "supported": false, "enabled": false])
            return
            #else
            guard authorized else {
                // Not asked yet (or refused): the radio cannot be read without showing the prompt, which is
                // `requestPermissions`' job. Every iPhone on iOS 15 has Bluetooth LE; the state is read after.
                call.resolve(["platform": "ios", "supported": true, "enabled": true])
                return
            }
            ensureCentral()
            withCentralState { state in
                call.resolve(["platform": "ios", "supported": state != .unsupported, "enabled": state == .poweredOn])
            }
            #endif
        }
    }

    /// iOS offers no API to switch Bluetooth on from an app. Creating a central manager while the radio is off shows
    /// the system's "Turn On Bluetooth" alert (Settings / Control Centre), so the manager is recreated to show it
    /// again; the answer is the radio's state afterwards.
    @objc func enableBluetooth(_ call: CAPPluginCall) {
        onMain { [self] in
            guard authorized else {
                call.resolve(["enabled": false])
                return
            }
            ensureCentral(recreate: centralState == .poweredOff)
            withCentralState { state in call.resolve(["enabled": state == .poweredOn]) }
        }
    }

    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["bluetooth": permissionValue()])
    }

    /// iOS asks for Bluetooth on first use of a central manager (NSBluetoothAlwaysUsageDescription); the answer arrives
    /// in `centralManagerDidUpdateState`, so the call is kept until then (or until the prompt has waited long enough).
    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        onMain { [self] in
            if CBCentralManager.authorization != .notDetermined {
                call.resolve(["bluetooth": permissionValue()])
                return
            }
            if let previous = pendingPermissionCall {
                pendingPermissionCall = nil
                reject(previous, "cancelled", "A newer permission request replaced this one.")
            }
            pendingPermissionCall = call
            let timeout = DispatchWorkItem { [weak self] in self?.settlePermission() }
            permissionTimeout?.cancel()
            permissionTimeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + IgloohomeBlePlugin.permissionPromptTimeout, execute: timeout)
            ensureCentral()
            if CBCentralManager.authorization != .notDetermined { settlePermission() }
        }
    }

    // ------------------------------------------------------------------- scan

    @objc func startScan(_ call: CAPPluginCall) {
        onMain { [self] in
            guard authorized else { return reject(call, "permission_denied", "Bluetooth permission was not granted.") }
            ensureCentral()
            withCentralState { [self] state in
                guard state != .unsupported else { return reject(call, "unsupported", "This device has no Bluetooth LE.") }
                guard state == .poweredOn else { return reject(call, "bluetooth_off", "Bluetooth is switched off.") }
                guard !scanning && !unlocking else { return reject(call, "busy", "Another scan or connection is in progress.") }
                let timeoutMs = call.getDouble("timeoutMs") ?? IgloohomeBlePlugin.defaultScanTimeout * 1000
                foundLocks = []
                scanning = true
                let plugin = sdkPlugin()
                scanTask = Task { @MainActor [weak self] in
                    do {
                        for try await result in plugin.scansLock() {
                            guard let self = self, !Task.isCancelled else { return }
                            let name = result.bluetoothDeviceName
                            guard !name.isEmpty else { continue }
                            self.foundLocks.insert(name)
                            self.notifyListeners("lockFound", data: ["name": name, "rssi": NSNull()])
                        }
                        guard !Task.isCancelled else { return } // stopScan / reset / connect already reported the stop
                        self?.finishScan(reason: "stopped", message: nil)
                    } catch is CancellationError {
                        // reported by whoever cancelled
                    } catch {
                        guard !Task.isCancelled else { return }
                        self?.finishScan(reason: "error", message: IgloohomeBlePlugin.describe(error))
                    }
                }
                let timeout = DispatchWorkItem { [weak self] in self?.finishScan(reason: "timeout", message: nil) }
                scanTimeout = timeout
                DispatchQueue.main.asyncAfter(deadline: .now() + timeoutMs / 1000, execute: timeout)
                call.resolve()
            }
        }
    }

    @objc func stopScan(_ call: CAPPluginCall) {
        onMain { [self] in
            finishScan(reason: "stopped", message: nil)
            call.resolve()
        }
    }

    /// Main queue. Stops the SDK's scan and tells the app why, once per scan.
    private func finishScan(reason: String, message: String?) {
        let wasScanning = scanning
        scanTimeout?.cancel()
        scanTimeout = nil
        scanning = false
        let task = scanTask
        scanTask = nil
        task?.cancel()
        if let plugin = sdk { MainActor.assumeIsolated { plugin.stopScan() } }
        if wasScanning {
            var data: [String: Any] = ["reason": reason]
            if let message = message { data["message"] = message }
            notifyListeners("scanStopped", data: data)
        }
    }

    // ---------------------------------------------------------------- connect

    /// This SDK has no connect step of its own (it connects inside `unlock`), so `connect` only settles which lock the
    /// next unlock targets and with which key: the lock must have been seen by the scan, and nothing else may be in
    /// progress. The scan is stopped, as the legacy SDK required.
    @objc func connect(_ call: CAPPluginCall) {
        onMain { [self] in
            guard let name = call.getString("name"), !name.isEmpty, let key = call.getString("key"), !key.isEmpty else {
                return reject(call, "sdk_error", "A lock name and a guest key are required.")
            }
            guard foundLocks.contains(name) else { return reject(call, "not_found", "The lock \(name) was not seen by the scan.") }
            guard !unlocking && selectedLock == nil else { return reject(call, "busy", "A connection is already in progress.") }
            finishScan(reason: "stopped", message: nil)
            selectedLock = name
            selectedKey = key
            call.resolve(["name": name])
        }
    }

    // ----------------------------------------------------------------- unlock

    @objc func unlock(_ call: CAPPluginCall) {
        onMain { [self] in
            guard let name = selectedLock, let key = selectedKey else { return reject(call, "not_connected", "No lock is connected.") }
            guard !unlocking else { return reject(call, "busy", "An unlock is already in progress.") }
            let timeoutMs = call.getDouble("timeoutMs") ?? IgloohomeBlePlugin.defaultUnlockTimeout * 1000
            unlocking = true
            unlockCall = call
            let plugin = sdkPlugin()
            let timeout = DispatchWorkItem { [weak self] in
                guard let self = self, let pending = self.takeUnlockCall() else { return }
                self.unlocking = false
                self.unlockTask?.cancel()
                self.unlockTask = nil
                self.reject(pending, "timeout", "The lock did not answer in time.")
                Task { @MainActor in try? await plugin.disconnect(name) }
            }
            unlockTimeout?.cancel()
            unlockTimeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + timeoutMs / 1000, execute: timeout)
            unlockTask = Task { @MainActor [weak self] in
                do {
                    // The SDK connects with the key, sets the lock's clock to now and unlocks.
                    try await plugin.unlock(name, key: key, timeInSeconds: Int(Date().timeIntervalSince1970))
                    guard let self = self else { return }
                    self.unlockTimeout?.cancel()
                    self.unlockTimeout = nil
                    self.unlocking = false
                    guard let pending = self.takeUnlockCall() else { return } // cancelled or timed out meanwhile
                    pending.resolve(["unlocked": true])
                } catch {
                    guard let self = self else { return }
                    self.unlockTimeout?.cancel()
                    self.unlockTimeout = nil
                    self.unlocking = false
                    guard let pending = self.takeUnlockCall() else { return }
                    let code = IgloohomeBlePlugin.code(of: error)
                    // A connection failure inside the unlock is an unlock failure to the app, as on Android.
                    self.reject(pending, code == "sdk_error" || code == "connect_failed" ? "unlock_failed" : code, IgloohomeBlePlugin.describe(error))
                }
            }
        }
    }

    /// Main queue. The waiting unlock call, once: a second caller (the SDK after a cancel, a cancel after the SDK) gets nil.
    private func takeUnlockCall() -> CAPPluginCall? {
        let pending = unlockCall
        unlockCall = nil
        return pending
    }

    // --------------------------------------------------------------- cleanup

    @objc func disconnect(_ call: CAPPluginCall) {
        onMain { [self] in disconnectNow { call.resolve() } }
    }

    @objc func reset(_ call: CAPPluginCall) {
        onMain { [self] in
            finishScan(reason: "stopped", message: nil)
            foundLocks = []
            disconnectNow { call.resolve() }
        }
    }

    /// Main queue. Drops the connection; an unlock still waiting is answered `cancelled` so its promise settles.
    private func disconnectNow(then: @escaping () -> Void) {
        let pending = takeUnlockCall()
        unlockTimeout?.cancel()
        unlockTimeout = nil
        unlockTask?.cancel()
        unlockTask = nil
        unlocking = false
        let name = selectedLock
        selectedLock = nil
        selectedKey = nil
        if let pending = pending { reject(pending, "cancelled", "The unlock was cancelled.") }
        guard let plugin = sdk, let name = name else {
            then()
            return
        }
        Task { @MainActor in
            try? await plugin.disconnect(name)
            then()
        }
    }

    // --------------------------------------------------------------- errors

    /// The stable code for an SDK failure: the SDK's own cases first, then its words.
    static func code(of error: Error) -> String {
        if error is CancellationError { return "cancelled" }
        if let sdkError = error as? IgloohomeError {
            switch sdkError {
            case .bluetoothIsTurnedOff: return "bluetooth_off"
            case .lockNotFound, .maxScanAttempts: return "not_found"
            case .timeout: return "timeout"
            case .connection, .bluetooth, .pairingFailed: return "connect_failed"
            case .genericError(_, _, let message): return codeFromText(message ?? "", fallback: "sdk_error")
            default: return "sdk_error"
            }
        }
        return codeFromText("\(error) \(error.localizedDescription)", fallback: "sdk_error")
    }

    private static func codeFromText(_ text: String, fallback: String) -> String {
        let lower = text.lowercased()
        if lower.contains("invalid rights") || lower.contains("guest key") || lower.contains("invalidkey") || lower.contains("invalid key") { return "invalid_key" }
        if lower.contains("in progress") { return "busy" }
        if lower.contains("turned off") || lower.contains("bluetoothisturnedoff") { return "bluetooth_off" }
        if lower.contains("no lock found") || lower.contains("nolockfound") { return "not_found" }
        if lower.contains("timeout") || lower.contains("timed out") { return "timeout" }
        if lower.contains("disconnected") || lower.contains("connection") { return "connect_failed" }
        return fallback
    }

    /// The SDK's own words for a failure, for the app's banner; never a key.
    static func describe(_ error: Error) -> String {
        let text = error.localizedDescription
        return text.isEmpty ? "\(type(of: error))" : text
    }
}

extension IgloohomeBlePlugin: CBCentralManagerDelegate {
    /// The radio's state changed, or the system prompt was answered: the waiting calls get their answers.
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        centralState = central.state
        if CBCentralManager.authorization != .notDetermined { settlePermission() }
        flushStateWaiters()
    }
}
