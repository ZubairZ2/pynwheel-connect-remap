// swift-tools-version: 5.9
import PackageDescription

// The iOS half of the plugin: the vendored IgloohomeSDK.xcframework (Swift 5.6 module with library evolution,
// iOS 11+, arm64 device + arm64/x86_64 simulator) and the libraries its swiftinterface imports. The legacy app
// took them from CocoaPods: RxSwift ~> 5.1, igloohome's RxBluetoothKit fork (gitlab.com/igloohome/rxbluetoothkit,
// tag 6.1.2) and iOSDFULibrary ~> 4.11.1. The SDK's module interface names the modules `RxBluetoothKit` and
// `iOSDFULibrary`, so the packages below must produce exactly those module names for the link to succeed.
let package = Package(
    name: "PynwheelIgloohomeBle",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "PynwheelIgloohomeBle", targets: ["IgloohomeBlePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://github.com/ReactiveX/RxSwift.git", from: "5.1.0"),
        .package(url: "https://gitlab.com/igloohome/rxbluetoothkit.git", exact: "6.1.2"),
        // Pinned: releases >= 4.13 renamed the SPM product `iOSDFULibrary` to `NordicDFU`, which the SDK's module
        // interface (and the product name below) does not know. Only 4.11.x still ships the `iOSDFULibrary` product.
        .package(url: "https://github.com/NordicSemiconductor/IOS-DFU-Library.git", exact: "4.11.1")
    ],
    targets: [
        .binaryTarget(name: "IgloohomeSDK", path: "ios/IgloohomeSDK.xcframework"),
        .target(
            name: "IgloohomeBlePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "RxSwift", package: "RxSwift"),
                .product(name: "RxBluetoothKit", package: "rxbluetoothkit"),
                .product(name: "iOSDFULibrary", package: "IOS-DFU-Library"),
                "IgloohomeSDK"
            ],
            path: "ios/Sources/IgloohomeBlePlugin"
        )
    ]
)
