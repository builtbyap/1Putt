import Foundation
import Observation

@MainActor
@Observable
class LaunchMonitorManager {
    var isConnected = false
    var latestShot: ShotData?
    var shotHistory: [ShotData] = []

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession = URLSession(configuration: .default)

    func connect() {
        guard let url = URL(string: "wss://fly-golf-server.fly.dev") else { return }
        webSocketTask = urlSession.webSocketTask(with: url)
        webSocketTask?.resume()
        isConnected = true
        receiveMessage()
        print("Connected to Fly.io WebSocket server.")
    }

    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
        print("Disconnected from WebSocket server.")
    }

    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.decodeAndPublish(text: text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.decodeAndPublish(text: text)
                    }
                @unknown default:
                    break
                }
                self.receiveMessage()

            case .failure(let error):
                print("WebSocket receive error: \(error)")
                Task { @MainActor in
                    self.isConnected = false
                }
            }
        }
    }

    private func decodeAndPublish(text: String) {
        if let data = text.data(using: .utf8) {
            do {
                let shot = try JSONDecoder().decode(ShotData.self, from: data)
                Task { @MainActor in
                    self.latestShot = shot
                    self.shotHistory.insert(shot, at: 0)
                    print("Successfully received and displayed shot payload!")
                }
            } catch {
                print("Failed to decode shot JSON: \(error)")
            }
        }
    }
}
