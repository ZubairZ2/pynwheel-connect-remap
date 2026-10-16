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
 * resolved by Package.swift; otherwise every operation answers `unavailable`
 * so the app can say the Bluetooth unlock is not in this build.
 */
@objc(IgloohomeBlePlugin)
public class IgloohomeBlePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "IgloohomeBlePlugin"
    public let jsName = "IgloohomeBle"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "initialize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopScan", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unlock", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reset", returnType: CAPPluginReturnPromise)
    ]

    private func reject(_ call: CAPPluginCall, _ code: String, _ message: String) {
        call.reject(message, code, nil, ["code": code])
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
    private var scanTimer: Timer?

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

    @objc func initialize(_ call: CAPPluginCall) {
        let state = manager().getCentralManager().state
        call.resolve(["platform": "ios", "supported": state != .unsupported, "enabled": state == .poweredOn])
    }

    /// iOS asks for Bluetooth on first use of the central manager (NSBluetoothAlwaysUsageDescription); the state says how it went.
    @objc public override func checkPermissions(_ call: CAPPluginCall) {
        let value: String
        switch CBCentralManager.authorization {
        case .allowedAlways: value = "granted"
        case .denied, .restricted: value = "denied"
        default: value = "prompt"
        }
        call.resolve(["bluetooth": value])
    }

    @objc public override func requestPermissions(_ call: CAPPluginCall) {
        _ = manager() // creating the central manager triggers the system prompt
        checkPermissions(call)
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
        scanTimer = Timer.scheduledTimer(withTimeInterval: timeoutMs / 1000, repeats: false) { [weak self] _ in
            self?.finishScan(reason: "timeout", message: nil)
        }
        call.resolve()
    }

    @objc func stopScan(_ call: CAPPluginCall) {
        finishScan(reason: "stopped", message: nil)
        call.resolve()
    }

    private func finishScan(reason: String, message: String?) {
        let wasScanning = scanning
        scanTimer?.invalidate()
        scanTimer = nil
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
        connectDisposable = lock.connectByStringKey(key)
            .timeout(.milliseconds(Int(timeoutMs)), scheduler: MainScheduler.instance)
            .subscribe(onNext: { [weak self] connected in
                guard let self = self, self.connecting else { return }
                self.connecting = false
                self.selectedLock = connected
                call.resolve(["name": connected.name])
            }, onError: { [weak self] error in
                guard let self = self else { return }
                self.connecting = false
                self.connectDisposable?.dispose()
                self.connectDisposable = nil
                self.reject(call, IgloohomeBlePlugin.code(of: error), error.localizedDescription)
            })
    }

    @objc func unlock(_ call: CAPPluginCall) {
        guard let lock = selectedLock, !connecting else { return reject(call, "not_connected", "No lock is connected.") }
        guard !unlocking else { return reject(call, "busy", "An unlock is already in progress.") }
        let timeoutMs = call.getDouble("timeoutMs") ?? 30_000
        unlocking = true
        unlockDisposable = lock.unlock(timestamp: Int(Date().timeIntervalSince1970))
            .timeout(.milliseconds(Int(timeoutMs)), scheduler: MainScheduler.instance)
            .subscribe(onCompleted: { [weak self] in
                self?.unlocking = false
                call.resolve(["unlocked": true])
            }, onError: { [weak self] error in
                self?.unlocking = false
                let code = IgloohomeBlePlugin.code(of: error)
                self?.reject(call, code == "sdk_error" || code == "connect_failed" ? "unlock_failed" : code, error.localizedDescription)
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

    private func disconnectNow() {
        unlockDisposable?.dispose()
        unlockDisposable = nil
        connectDisposable?.dispose()
        connectDisposable = nil
        selectedLock = nil
        connecting = false
        unlocking = false
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
    @objc func initialize(_ call: CAPPluginCall) { call.resolve(["platform": "ios", "supported": false, "enabled": false]) }
    @objc public override func checkPermissions(_ call: CAPPluginCall) { call.resolve(["bluetooth": "denied"]) }
    @objc public override func requestPermissions(_ call: CAPPluginCall) { call.resolve(["bluetooth": "denied"]) }
    @objc func startScan(_ call: CAPPluginCall) { reject(call, "unavailable", "The igloohome Bluetooth SDK is not in this build.") }
    @objc func stopScan(_ call: CAPPluginCall) { call.resolve() }
    @objc func connect(_ call: CAPPluginCall) { reject(call, "unavailable", "The igloohome Bluetooth SDK is not in this build.") }
    @objc func unlock(_ call: CAPPluginCall) { reject(call, "unavailable", "The igloohome Bluetooth SDK is not in this build.") }
    @objc func disconnect(_ call: CAPPluginCall) { call.resolve() }
    @objc func reset(_ call: CAPPluginCall) { call.resolve() }
#endif
}
