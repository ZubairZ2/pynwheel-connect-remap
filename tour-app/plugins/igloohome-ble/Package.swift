// swift-tools-version: 5.9
import PackageDescription

// The iOS half of the plugin.
//
// It compiles without any igloohome SDK: every Bluetooth operation then answers `unavailable` and the app shows
// "Bluetooth unlock is not available in this build of the app". The legacy IgloohomeSDK.xcframework wiring
// (RxSwift, igloohome's RxBluetoothKit fork, Nordic DFU 4.11) is gone: no 4.x release of the Nordic library ships
// the `iOSDFULibrary` product the framework's module interface needs, so it never resolved under Xcode 27, and the
// framework is the same generation as the Android aar that refused the developer API's 32-byte guest keys.
//
// The real implementation is igloohome's SDK 3.x for iOS, the counterpart of the Android `co.igloo.home:sdk`:
//   https://gitlab.com/igloohome/iglooaccess-ios-sdk.git  (from 3.5.0; products IgloohomeSDK and IglooSDKCore;
//   deployment target iOS 15; Swift 6)
// The repository is private. See README.md for the access token and the dependency lines to add here.
let package = Package(
    name: "PynwheelIgloohomeBle",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "PynwheelIgloohomeBle", targets: ["IgloohomeBlePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "IgloohomeBlePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/IgloohomeBlePlugin"
        )
    ]
)
