// swift-tools-version: 5.9
import PackageDescription

// The iOS half of the plugin: IgloohomeBlePlugin.swift over igloohome's SDK 3.x for iOS, the counterpart of the
// Android `co.igloo.home:sdk` the Kotlin plugin uses. The SDK package is private: Swift Package Manager needs a
// GitLab credential with access to it (a GitLab account in Xcode › Settings › Accounts, or `~/.netrc`); README.md
// has the steps. Its only dependency is Alamofire; the Bluetooth protocol lives in the prebuilt IglooSDKCore
// binary the package carries.
let package = Package(
    name: "PynwheelIgloohomeBle",
    platforms: [.iOS(.v15)],
    products: [
        .library(name: "PynwheelIgloohomeBle", targets: ["IgloohomeBlePlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        .package(url: "https://gitlab.com/igloohome/iglooaccess-ios-sdk.git", from: "3.5.0")
    ],
    targets: [
        .target(
            name: "IgloohomeBlePlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "IgloohomeSDK", package: "iglooaccess-ios-sdk")
            ],
            path: "ios/Sources/IgloohomeBlePlugin"
        )
    ]
)
