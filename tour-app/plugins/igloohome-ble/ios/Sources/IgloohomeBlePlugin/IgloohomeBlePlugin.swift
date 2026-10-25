import Foundation
import Capacitor
import CoreBluetooth

/**
 * The iOS half of the Pynwheel Tour app's igloohome v1 (Bluetooth) flow:
 * the same method set, events and error codes as the Android plugin
 * (IgloohomeBlePlugin.kt over igloohome's SDK 3.x).
 *
 * This build carries no igloohome SDK (Package.swift explains why), so
 * `initialize` and every Bluetooth operation reject with `unavailable` and
 * the app says the Bluetooth unlock is not in this build. What works
 * already is the part the SDK does not own: the system Bluetooth permission
 * prompt (`requestPermissions`, answered through the Core Bluetooth
 * delegate, never before the visitor has replied) and the radio state.
 *
 * Porting to igloohome's SDK 3.x for iOS (gitlab.com/igloohome/iglooaccess-ios-sdk,
 * products IgloohomeSDK + IglooSDKCore) means replacing the `unavailable`
 * bodies below with the Android plugin's shape: the SDK's scan feeds
 * `lockFound` events by Bluetooth name; `connect` only settles the lock and
 * the guest key after the scan saw the lock; `unlock` runs the SDK's
 * unlock(deviceId, key, now) under the app's timeout (the SDK connects, sets
 * the clock and opens); `disconnect` drops what the unlock left open.
 *
 * Plugin methods run on Capacitor's dispatch queue, which has no run loop:
 * every timeout is a cancellable `DispatchWorkItem` on the main queue, never
 * a `Timer`.
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

    // The SDK is not in this build: `initialize` rejects with `unavailable` (the app then says the Bluetooth unlock is
    // not in this build) rather than answering `supported: false`, which would read as "this phone has no Bluetooth LE".
    @objc func initialize(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    /// iOS offers no API to switch Bluetooth on from an app; without the SDK there is no central manager to read either.
    @objc func enableBluetooth(_ call: CAPPluginCall) { call.resolve(["enabled": false]) }
    @objc public override func checkPermissions(_ call: CAPPluginCall) { call.resolve(["bluetooth": permissionValue()]) }
    @objc public override func requestPermissions(_ call: CAPPluginCall) { requestBluetoothPermission(call) }
    @objc func startScan(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func stopScan(_ call: CAPPluginCall) { call.resolve() }
    @objc func connect(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func unlock(_ call: CAPPluginCall) { reject(call, "unavailable", IgloohomeBlePlugin.unavailableMessage) }
    @objc func disconnect(_ call: CAPPluginCall) { call.resolve() }
    @objc func reset(_ call: CAPPluginCall) { call.resolve() }
}

extension IgloohomeBlePlugin: CBCentralManagerDelegate {
    /// The system prompt was answered (or Bluetooth's state changed): the waiting `requestPermissions` call gets the result.
    public func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if CBCentralManager.authorization != .notDetermined { settlePermission() }
    }
}
