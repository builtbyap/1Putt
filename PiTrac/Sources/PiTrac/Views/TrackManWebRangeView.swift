import SwiftUI
import WebKit

struct RangeWebShot: Encodable {
    let id: Int
    let carry: String
    let total: String
    let curve: String
    let clubSpeed: String
    let ballSpeed: String
    let smash: String
    let spin: String
    let attack: String
    let path: String
    let faceToPath: String
    let apexYds: Double
    let offlineFt: Double
    let cameraAngle: Int
    let timestamp: String
}

struct RangeWebPayload: Encodable {
    let shots: [RangeWebShot]
    let selectedId: Int?
}

enum RangeWebSessionBuilder {
    static func jsonString(from shots: [ShotData]) -> String {
        let mapped = shots.enumerated().map { index, shot -> RangeWebShot in
            let number = shots.count - index
            let apex = max(8, shot.carryYards * 0.22 * tan(shot.launchAngleDeg * .pi / 180.0))
            let offline = (shot.curveYards ?? 0) * 3
            return RangeWebShot(
                id: number,
                carry: String(format: "%.1f", shot.carryYards),
                total: String(format: "%.1f", shot.displayedTotalYards),
                curve: shot.curveLabel,
                clubSpeed: String(format: "%.1f", shot.clubSpeedMph),
                ballSpeed: String(format: "%.1f", shot.ballSpeedMph),
                smash: String(format: "%.2f", shot.smashFactor),
                spin: "\(shot.spinRateRpm)",
                attack: shot.attackAngleDeg.map { String(format: "%.1f", $0) } ?? "—",
                path: shot.clubPathDeg.map { String(format: "%.1f", $0) } ?? "—",
                faceToPath: shot.faceToPathDeg.map { String(format: "%.1f", $0) } ?? "—",
                apexYds: apex,
                offlineFt: offline,
                cameraAngle: 2,
                timestamp: "Live shot"
            )
        }
        let payload = RangeWebPayload(shots: mapped, selectedId: mapped.first?.id)
        guard let data = try? JSONEncoder().encode(payload),
              let json = String(data: data, encoding: .utf8) else {
            return #"{"shots":[],"selectedId":null}"#
        }
        return json
    }
}

#if os(iOS)
struct TrackManWebRangeView: UIViewRepresentable {
    let shots: [ShotData]
    var onBack: () -> Void

    func makeCoordinator() -> TrackManWebCoordinator {
        TrackManWebCoordinator(onBack: onBack)
    }

    func makeUIView(context: Context) -> WKWebView {
        makeRangeWebView(coordinator: context.coordinator)
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onBack = onBack
        context.coordinator.pushSession(RangeWebSessionBuilder.jsonString(from: shots), to: webView)
    }
}
#else
struct TrackManWebRangeView: NSViewRepresentable {
    let shots: [ShotData]
    var onBack: () -> Void

    func makeCoordinator() -> TrackManWebCoordinator {
        TrackManWebCoordinator(onBack: onBack)
    }

    func makeNSView(context: Context) -> WKWebView {
        makeRangeWebView(coordinator: context.coordinator)
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        context.coordinator.onBack = onBack
        context.coordinator.pushSession(RangeWebSessionBuilder.jsonString(from: shots), to: webView)
    }
}
#endif

final class TrackManWebCoordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    var onBack: () -> Void
    var isReady = false
    var pendingJSON: String?

    init(onBack: @escaping () -> Void) {
        self.onBack = onBack
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isReady = true
        if let pendingJSON {
            inject(pendingJSON, into: webView)
            self.pendingJSON = nil
        }
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "pitrax", (message.body as? String) == "back" {
            DispatchQueue.main.async {
                self.onBack()
            }
        }
    }

    func pushSession(_ json: String, to webView: WKWebView) {
        if isReady {
            inject(json, into: webView)
        } else {
            pendingJSON = json
        }
    }

    private func inject(_ json: String, into webView: WKWebView) {
        webView.evaluateJavaScript("window.PITRAX && window.PITRAX.setSession(\(json));") { _, _ in }
    }
}

private func makeRangeWebView(coordinator: TrackManWebCoordinator) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.userContentController.add(coordinator, name: "pitrax")
    #if os(iOS)
    config.allowsInlineMediaPlayback = true
    #endif

    let webView = WKWebView(frame: .zero, configuration: config)
    webView.navigationDelegate = coordinator
    #if os(iOS)
    webView.isOpaque = false
    webView.backgroundColor = .black
    webView.scrollView.isScrollEnabled = false
    webView.scrollView.bounces = false
    #endif

    if let url = Bundle.module.url(forResource: "trackman_range", withExtension: "html") {
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
    return webView
}
