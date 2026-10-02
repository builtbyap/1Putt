import Foundation
import SceneKit

struct ShotData: Codable, Identifiable {
    let id = UUID()
    let ballSpeedMph: Double
    let clubSpeedMph: Double
    let launchAngleDeg: Double
    let azimuthDeg: Double
    let spinRateRpm: Int
    let spinAxisDeg: Double
    let carryYards: Double
    let totalYards: Double?
    let curveYards: Double?
    let attackAngleDeg: Double?
    let clubPathDeg: Double?
    let faceToPathDeg: Double?

    enum CodingKeys: String, CodingKey {
        case ballSpeedMph
        case clubSpeedMph
        case launchAngleDeg
        case azimuthDeg
        case spinRateRpm
        case spinAxisDeg
        case carryYards
        case totalYards
        case curveYards
        case attackAngleDeg
        case clubPathDeg
        case faceToPathDeg
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ballSpeedMph = try container.decodeIfPresent(Double.self, forKey: .ballSpeedMph) ?? 0
        clubSpeedMph = try container.decodeIfPresent(Double.self, forKey: .clubSpeedMph) ?? 0
        launchAngleDeg = try container.decodeIfPresent(Double.self, forKey: .launchAngleDeg) ?? 0
        azimuthDeg = try container.decodeIfPresent(Double.self, forKey: .azimuthDeg) ?? 0
        spinRateRpm = try container.decodeIfPresent(Int.self, forKey: .spinRateRpm) ?? 0
        spinAxisDeg = try container.decodeIfPresent(Double.self, forKey: .spinAxisDeg) ?? 0
        carryYards = try container.decodeIfPresent(Double.self, forKey: .carryYards) ?? 0
        totalYards = try container.decodeIfPresent(Double.self, forKey: .totalYards)
        curveYards = try container.decodeIfPresent(Double.self, forKey: .curveYards)
        attackAngleDeg = try container.decodeIfPresent(Double.self, forKey: .attackAngleDeg)
        clubPathDeg = try container.decodeIfPresent(Double.self, forKey: .clubPathDeg)
        faceToPathDeg = try container.decodeIfPresent(Double.self, forKey: .faceToPathDeg)
    }

    var smashFactor: Double {
        guard clubSpeedMph > 0 else { return 0 }
        return ballSpeedMph / clubSpeedMph
    }

    var displayedTotalYards: Double {
        totalYards ?? carryYards * 1.09
    }

    var hasRecordedFlight: Bool {
        carryYards > 0 && (ballSpeedMph > 0 || clubSpeedMph > 0)
    }

    var curveLabel: String {
        let value = curveYards ?? 0
        if abs(value) < 0.5 { return "0" }
        let side = value > 0 ? "L" : "R"
        return "\(Int(abs(value).rounded()))\(side)"
    }

    var trajectoryPoints: [SCNVector3] {
        guard hasRecordedFlight else { return [] }
        let distance = carryYards
        let maxApexYards = distance * 0.22 * tan(launchAngleDeg * .pi / 180.0)
        let segments = 30

        return (0...segments).map { i in
            let t = Double(i) / Double(segments)
            let z = Float(t * distance)
            let y = Float(4.0 * maxApexYards * (t - t * t))
            let x = Float(0.0)
            return SCNVector3(x, y, z)
        }
    }
}
