import Foundation
import Capacitor
import CoreBluetooth
#if canImport(IgloohomeSDK)
import IgloohomeSDK
import RxSwift
#endif

/**
 * The igloohome Bluetooth SDK (IgloohomeSDK.xcframework) behind the Pynwheel
 * Tour app's igloohome v1 flow, as the legacy module
 * (pyn-tour-old/ios/IglooModule.swift) drove it: BleManager.scan → the
 * lock by name → connectByStringKey(guest key) → unlock(timestamp) → dispose.
 * Same method set, events and error codes as the Android plugin.
 *
 * Compiled against the SDK only when its module and the libraries its
 * interface imports (RxSwift, igloohome's RxBluetoothKit, iOSDFULibrary) are
 * resolved by Package.swift; otherwise `initialize` and every operation
 * reject with `unavailable` so the app can say the Bluetooth unlock is not
 * in this build.
 *
 * Plugin methods run on Capacitor's dispatch queue, which has no run loop:
 * every timeout is a cancellable `DispatchWorkItem` on the main queue, never
 * a `Timer`. A connect or unlock call still waiting for the SDK is kept in a
 * field and settled exactly once: by the SDK, by its timeout, or with
 * `cancelled` when `reset` / `disconnect` drop the connection.
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

    private static let unavailableMessage = "The igloohome Bluetooth SDK is not in this build."
    /// How long the system Bluetooth prompt may stay unanswered before `requestPermissions` answers with what it has.
    private static let permissionPromptTimeout: TimeInterval = 120

    /// The central manager created only to show the system Bluetooth prompt; its delegate reports the answer.
    private var permissionManager: CBCentralManager?
    private var pendingPermissionCall: CAPPluginCall?
    private var permissionTimeout: DispatchWorkItem?

    private func reject(_ call: CAPPluginCall, _ code: String, _ message: String) {
        call.reject(message, code, nil, ["code": code])
    }

    private func permissionValue() -> String {
        switch CBCentralManager.authorization {
        case .allowedAlways: return "granted"
        case .denied, .restricted: return "denied"
        default: return "prompt"
        }
    }

    /// Answers the waiting `requestPermissions` call with the authorization as it stands now (once).
    private func settlePermission() {
        permissionTimeout?.cancel()
        permissionTimeout = nil
        guard let call = pendingPermissionCall else { return }
        pendingPermissionCall = nil
        call.resolve(["bluetooth": permissionValue()])
    }

    /// iOS asks for Bluetooth on first use of a central manager (NSBluetoothAlwaysUsageDescription); the answer arrives
    /// in `centralManagerDidUpdateState`, so the call is kept until then (or until the prompt has waited long enough).
    private func requestBluetoothPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if CBCentralManager.authorization != .notDetermined {
                call.resolve(["bluetooth": self.permissionValue()])
                return
            }
            if let previous = self.pendingPermissionCall {
                self.pendingPermissionCall = nil
                self.reject(previous, "cancelled", "A newer permission request replaced this one.")
            }
            self.pendingPermissionCall = call
            let timeout = DispatchWorkItem { [weak self] in self?.settlePermission() }
            self.permissionTimeout?.cancel()
            self.permissionTimeout = timeout
            DispatchQueue.main.asyncAfter(deadline: .now() + IgloohomeBlePlugin.permissionPromptTimeout, execute: timeout)
            if self.permissionManager == nil {
                self.permissionManager = CBCentralManager(delegate: self, queue: .main)
            } else if CBCentralManager.authorization != .notDetermined {
                self.settlePermission()
            }
        }
    }

#if canImport(IgloohomeSDK)
    private var bleManager: BleManager?
    private var scanDisposable: Disposable?
    private var connectDisposable: Disposable?
    private var unlockDisposable: Disposable?
    private var foundLocks: [IglooLock] = []
    private var selectedLock: IglooLock?
    private var scanning = false
    private var connecting = false
    private var unlocking = false
    private var scanTimeout: DispatchWorkItem?
    private var connectTimeout: DispatchWorkItem?
    /// The connect / unlock call still waiting for the SDK: settled exactly once, by the SDK or by a cancel.
    private var connectCall: CAPPluginCall?
    private var unlockCall: CAPPluginCall?
    private let callLock = NSLock()

    private func manager() -> BleManager {
        if let existing = bleManager { return existing }
        BleManager.initialize()
        let created = BleManager()
        bleManager = created
        return created
    }

    private func poweredOn() -> Bool {
        return manager().getCentralManager().state == .poweredOn
    }

    /// The waiting connect call, once: a second caller (the SDK after a cancel, a cancel after the SDK) gets nil.
    private func takeConnectCall() -> CAPPluginCall? {
        callLock.lock()
        defer { callLock.unlock() }
        let pending = connectCall
        connectCall = nil
        return pending
    }

    private func takeUnlockCall() -> CAPPluginCall? {
        callLock.lock()
        defer { callLock.unlock() }
        let pending = unlockCall
        unlockCall = nil
        return pending
    }

    private func keep(connect call: CAPPluginCall) {
        callLock.lock()
        connectCall = call
        callLock.unlock()
    }

    private func keep(unlock call: CAPPluginCall) {
        callLock.lock()
        unlockCall = call
        callLock.unlock()
    }

    @objc func initialize(_ call: CAPPluginCall) {
        let state = manager().getCentralManager().state
        call.resolve(["platform": "ios", "supported": state != .unsupported, "enabled": state == .poweredOn])
    }

    /// iOS offers no API to switch Bluetooth on from an app (the system shows its own alert when a Core Bluetooth
    /// manager starts while the radio is off); the answer is the current state and the app points to Control Centre.
    @objc func enableBluetooth(_ call: CAPPluginCall) {
        call.resolve(["enabled": manager().getCentralManager().state == .poweredOn])
    }

    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["bluetooth": permissionValue()])
    }

    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        requestBluetoothPermission(call)
    }

    @objc func startScan(_ call: CAPPluginCall) {
        guard manager().getCentralManager().state != .unsupported else { return reject(call, "unsupported", "This device has no Bluetooth LE.") }
        guard poweredOn() else { return reject(call, "bluetooth_off", "Bluetooth is switched off.") }
        guard CBCentralManager.authorization == .allowedAlways else { return reject(call, "permission_denied", "Bluetooth permission was not granted.") }
        guard !scanning && !connecting && !unlocking else { return reject(call, "busy", "Another scan or connection is in progress.") }
        let timeoutMs = call.getDouble("timeoutMs") ?? 60_000
        foundLocks = []
        scanning = true
        scanDisposable = manager().scan(options: [CBCentralManagerScanOptionAllowDuplicatesKey: true as AnyObject])
            .subscribe(onNext: { [weak self] lock in
                guard let self = self else { return }
                if !self.foundLocks.contains(where: { $0.name == lock.name }) { self.foundLocks.append(lock) }
                self.notifyListeners("lockFound", data: ["name": lock.name, "rssi": NSNull()])
            }, onError: { [weak self] error in
                self?.finishScan(reason: "error", message: error.localizedDescription)
            })
        // Capacitor's plugin queue has no run loop, so a Timer scheduled here would never fire.
        let timeout = DispatchWorkItem { [weak self] in self?.finishScan(reason: "timeout", message: nil) }
        scanTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + timeoutMs / 1000, execute: timeout)
        call.resolve()
    }

    @objc func stopScan(_ call: CAPPluginCall) {
        finishScan(reason: "stopped", message: nil)
        call.resolve()
    }

    private func finishScan(reason: String, message: String?) {
        let wasScanning = scanning
        scanTimeout?.cancel()
        scanTimeout = nil
        scanDisposable?.dispose()
        scanDisposable = nil
        scanning = false
        if wasScanning {
            var data: [String: Any] = ["reason": reason]
            if let message = message { data["message"] = message }
            notifyListeners("scanStopped", data: data)
        }
    }

    @objc func connect(_ call: CAPPluginCall) {
        guard let name = call.getString("name"), !name.isEmpty, let key = call.getString("key"), !key.isEmpty else {
            return reject(call, "sdk_error", "A lock name and a guest key are required.")
        }
        guard let lock = foundLocks.first(where: { $0.name == name }) else { return reject(call, "not_found", "The lock \(name) was not seen by the scan.") }
        guard !connecting && !unlocking && selectedLock == nil else { return reject(call, "busy", "A connection is already in progress.") }
        finishScan(reason: "stopped", message: nil)
        let timeoutMs = call.getDouble("timeoutMs") ?? 30_000
        connecting = true
        connectDisposable?.dispose()
        keep(connect: call)
        // The Observable stays open for the connection's life (disposing it disconnects), so the timeout covers only
        // the connection itself, not the connection's life: an established connection is never torn down by it.
        let timeout = DispatchWorkItem { [weak self] in
            guard let self = self, let pending = self.takeConnectCall() else { return }
            self.connecting = false
            self.connectDisposable?.dispose()
            self.connectDisposable = nil
            self.reject(pending, "timeout", "The lock did not answer in time.")
        }
        connectTimeout?.cancel()
        connectTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + timeoutMs / 1000, execute: timeout)
        connectDisposable = lock.connectByStringKey(key)
            .subscribe(onNext: { [weak self] connected in
                guard let self = self, let pending = self.takeConnectCall() else { return } // cancelled meanwhile
                self.connectTimeout?.cancel()
                self.connectTimeout = nil
                self.connecting = false
                self.selectedLock = connected
                pending.resolve(["name": connected.name])
            }, onError: { [weak self] error in
                guard let self = self else { return }
                self.connectTimeout?.cancel()
                self.connectTimeout = nil
                if let pending = self.takeConnectCall() {
                    self.connecting = false
                    self.connectDisposable?.dispose()
                    self.connectDisposable = nil
                    self.reject(pending, IgloohomeBlePlugin.code(of: error), error.localizedDescription)
                    return
                }
                // The connection dropped after it was established: an unlock in flight cannot finish.
                let unlocking = self.takeUnlockCall()
                self.connectDisposable?.dispose()
                self.connectDisposable = nil
                self.selectedLock = nil
                self.connecting = false
                self.unlocking = false
                if let pending = unlocking { self.reject(pending, "not_connected", error.localizedDescription) }
            })
    }

    @objc func unlock(_ call: CAPPluginCall) {
        guard let lock = selectedLock, !connecting else { return reject(call, "not_connected", "No lock is connected.") }
        guard !unlocking else { return reject(call, "busy", "An unlock is already in progress.") }
        let timeoutMs = call.getDouble("timeoutMs") ?? 30_000
        unlocking = true
        keep(unlock: call)
        unlockDisposable = lock.unlock(timestamp: Int(Date().timeIntervalSince1970))
            .timeout(.milliseconds(Int(timeoutMs)), scheduler: MainScheduler.instance)
            .subscribe(onCompleted: { [weak self] in
                guard let self = self else { return }
                self.unlocking = false
                guard let pending = self.takeUnlockCall() else { return } // cancelled meanwhile
                pending.resolve(["unlocked": true])
            }, onError: { [weak self] error in
                guard let self = self else { return }
                self.unlocking = false
                guard let pending = self.takeUnlockCall() else { return }
                let code = IgloohomeBlePlugin.code(of: error)
                self.reject(pending, code == "sdk_error" || code == "connect_failed" ? "unlock_failed" : code, error.localizedDescription)
            })
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        disconnectNow()
        call.resolve()
    }

    @objc func reset(_ call: CAPPluginCall) {
        finishScan(reason: "stopped", message: nil)
        disconnectNow()
        foundLocks = []
        call.resolve()
    }

    /// Drops the connection; a connect or unlock still waiting is answered `cancelled` so its promise settles.
    private func disconnectNow() {
        let unlockPending = takeUnlockCall()
        let connectPending = takeConnectCall()
        connectTimeout?.cancel()
        connectTimeout = nil
        unlockDisposable?.dispose()
        unlockDisposable = nil
        connectDisposable?.dispose()
        connectDisposable = nil
        selectedLock = nil
        connecting = false
        unlocking = false
        if let pending = unlockPending { reject(pending, "cancelled", "The unlock was cancelled.") }
        if let pending = connectPending { reject(pending, "cancelled", "The connection was cancelled.") }
    }

    private static func code(of error: Error) -> String {
        if error is RxError { return "timeout" }
        let text = "\(error)".lowercased()
        if text.contains("invalidkey") || text.contains("invalidrights") { return "invalid_key" }
        if text.contains("timeout") { return "timeout" }
        if text.contains("permission") { return "permission_denied" }
        if text.contains("connect") || text.contains("bluetooth") { return "connect_failed" }
        return "sdk_error"
    }
#else
    // The SDK is not in this build: `initialize` rejects with `unavailable` (the app then says the Bluetooth unlock is
    // not in this build) rather than answering `supported: false`, which would read as "this phone has no Bluetooth LE".
    @objc func initialize(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func enableBluetooth(_ call: CAPPluginCall) { call.resolve(["enabled": false]) }
    @objc public override func checkPermissions(_ call: CAPPluginCall) { call.resolve(["bluetooth": permissionValue()]) }
    @objc public override func requestPermissions(_ call: CAPPluginCall) { requestBluetoothPermission(call) }
    @objc func startScan(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func stopScan(_ call: CAPPluginCall) { call.resolve() }
    @objc func connect(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func unlock(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func disconnect(_ call: CAPPluginCall) { call.resolve() }
    @objc func reset(_ call: CAPPluginCall) { call.resolve() }
#endif
}

extension IgloohomeBlePlugin: CBCentralManagerDelegate {
    /// The system prompt was answered (or Bluetooth's state changed): the waiting `requestPermissions` call gets the result.
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if CBCentralManager.authorization != .notDetermined { settlePermission() }
    }
}
