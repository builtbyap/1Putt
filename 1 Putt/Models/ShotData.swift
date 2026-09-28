import Foundation
import SceneKit

struct ShotData: Codable, Identifiable {
    let id = UUID()
    let ballSpeedMph: Double
    let clubSpeedMph: Double
    let launchAngleDeg: Double
    let spinRateRpm: Int
    let carryYards: Double

    enum CodingKeys: String, CodingKey {
        case ballSpeedMph
        case clubSpeedMph
        case launchAngleDeg
        case spinRateRpm
        case carryYards
    }

    var trajectoryPoints: [SCNVector3] {
        let totalYards = carryYards > 0 ? carryYards : 200.0
        let maxApexYards = totalYards * 0.22 * tan(launchAngleDeg * .pi / 180.0)
        let segments = 30

        return (0...segments).map { i in
            let t = Double(i) / Double(segments)
            let z = Float(t * totalYards)
            let y = Float(4.0 * maxApexYards * (t - t * t))
            let x = Float(0.0)
            return SCNVector3(x, y, z)
        }
    }
}
