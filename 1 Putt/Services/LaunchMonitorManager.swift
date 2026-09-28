import Foundation
import Observation
import UIKit

@Observable
class LaunchMonitorManager {
    var isConnected = false
    var latestShot: ShotData?
    var shotHistory: [ShotData] = []
    var liveCameraImage: UIImage?

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
            guard let self = self else { return }
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
                DispatchQueue.main.async {
                    self.isConnected = false
                }
            }
        }
    }

    private func decodeAndPublish(text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {

            if let shotData = text.data(using: .utf8),
               let shot = try? JSONDecoder().decode(ShotData.self, from: shotData) {
                DispatchQueue.main.async {
                    self.latestShot = shot
                    self.shotHistory.insert(shot, at: 0)
                }
            }
            return
        }

        if type == "camera_frame",
           let base64String = json["image"] as? String,
           let imageData = Data(base64Encoded: base64String),
           let image = UIImage(data: imageData) {
            DispatchQueue.main.async {
                self.liveCameraImage = image
            }
        } else if type == "shot" {
            publishShot(from: data, json: json)
        }
    }

    private func publishShot(from data: Data, json: [String: Any]) {
        if let shot = try? JSONDecoder().decode(ShotData.self, from: data) {
            DispatchQueue.main.async {
                self.latestShot = shot
                self.shotHistory.insert(shot, at: 0)
            }
            return
        }

        for key in ["shot", "data", "payload"] {
            if let nested = json[key],
               let nestedData = try? JSONSerialization.data(withJSONObject: nested),
               let shot = try? JSONDecoder().decode(ShotData.self, from: nestedData) {
                DispatchQueue.main.async {
                    self.latestShot = shot
                    self.shotHistory.insert(shot, at: 0)
                }
                return
            }
        }
    }
}
