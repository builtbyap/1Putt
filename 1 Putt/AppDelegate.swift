import SwiftUI
#if os(iOS)
import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    static var orientationLock: UIInterfaceOrientationMask = .portrait

    func application(
        _ application: UIApplication,
        supportedInterfaceOrientationsFor window: UIWindow?
    ) -> UIInterfaceOrientationMask {
        AppDelegate.orientationLock
    }
}

enum InterfaceOrientationLock {
    static func lock(to mask: UIInterfaceOrientationMask) {
        AppDelegate.orientationLock = mask

        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
        guard let scene else { return }

        scene.requestGeometryUpdate(.iOS(interfaceOrientations: mask)) { _ in }

        DispatchQueue.main.async {
            UIViewController.attemptRotationToDeviceOrientation()
        }
    }
}
#endif
