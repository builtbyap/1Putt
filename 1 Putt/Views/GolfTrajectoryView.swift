import SwiftUI
import SceneKit

struct GolfTrajectoryView: View {
    var shot: ShotData?

    var body: some View {
        SceneView(
            scene: createScene(for: shot),
            pointOfView: nil,
            options: [.allowsCameraControl, .autoenablesDefaultLighting]
        )
        .frame(height: 260)
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color(.separator), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.06), radius: 10, x: 0, y: 5)
    }

    private func createScene(for shot: ShotData?) -> SCNScene {
        let scene = SCNScene()

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(x: 0, y: 4, z: -12)
        cameraNode.look(at: SCNVector3(0, 0, 40))
        scene.rootNode.addChildNode(cameraNode)

        let groundGeometry = SCNPlane(width: 80, height: 300)
        let groundNode = SCNNode(geometry: groundGeometry)
        groundNode.transform = SCNMatrix4MakeRotation(-.pi / 2, 1, 0, 0)
        groundNode.geometry?.firstMaterial?.diffuse.contents = UIColor(red: 0.15, green: 0.45, blue: 0.22, alpha: 1.0)
        scene.rootNode.addChildNode(groundNode)

        let teeNode = SCNNode(geometry: SCNSphere(radius: 0.25))
        teeNode.geometry?.firstMaterial?.diffuse.contents = UIColor.white
        teeNode.position = SCNVector3(0, 0.2, 0)
        scene.rootNode.addChildNode(teeNode)

        if let shot = shot {
            let trajectoryNode = createBallFlightNode(
                carryYards: CGFloat(shot.carryYards),
                launchAngle: CGFloat(shot.launchAngleDeg)
            )
            scene.rootNode.addChildNode(trajectoryNode)
        }

        return scene
    }

    private func createBallFlightNode(carryYards: CGFloat, launchAngle: CGFloat) -> SCNNode {
        let parentNode = SCNNode()

        let targetDistance = min(max(carryYards, 50.0), 320.0)
        let angleRad = Float(launchAngle) * .pi / 180.0

        let ballNode = SCNNode(geometry: SCNSphere(radius: 0.35))
        ballNode.geometry?.firstMaterial?.diffuse.contents = UIColor.white
        parentNode.addChildNode(ballNode)

        let animationDuration: TimeInterval = 2.2
        var keyframePositions: [NSValue] = []
        var keyframeTimes: [NSNumber] = []

        let steps = 40
        for i in 0...steps {
            let t = CGFloat(i) / CGFloat(steps)
            let z = Float(targetDistance) * Float(t)

            let peakHeight = Float(targetDistance) * 0.32 * sin(angleRad)
            let y = max(0.2, peakHeight * sin(Float(t) * .pi))

            keyframePositions.append(NSValue(scnVector3: SCNVector3(0, y, z)))
            keyframeTimes.append(NSNumber(value: Double(t) * animationDuration))
        }

        let positionAnimation = CAKeyframeAnimation(keyPath: "position")
        positionAnimation.values = keyframePositions
        positionAnimation.keyTimes = keyframeTimes
        positionAnimation.duration = animationDuration
        positionAnimation.repeatCount = .infinity

        ballNode.addAnimation(positionAnimation, forKey: "ballFlight")

        return parentNode
    }
}
