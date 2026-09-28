import SwiftUI
import SceneKit

struct Trajectory3DView: UIViewRepresentable {
    let shot: ShotData?

    func makeUIView(context: Context) -> SCNView {
        let scnView = SCNView()
        let scene = SCNScene()
        scnView.scene = scene
        scnView.backgroundColor = UIColor(white: 0.05, alpha: 1.0)
        scnView.allowsCameraControl = true
        scnView.autoenablesDefaultLighting = true

        let cameraNode = SCNNode()
        cameraNode.camera = SCNCamera()
        cameraNode.position = SCNVector3(-15, 20, -30)
        cameraNode.look(at: SCNVector3(0, 10, 100))
        scene.rootNode.addChildNode(cameraNode)

        let groundGeo = SCNPlane(width: 200, height: 400)
        groundGeo.firstMaterial?.diffuse.contents = UIColor(white: 0.15, alpha: 1.0)
        let groundNode = SCNNode(geometry: groundGeo)
        groundNode.eulerAngles.x = -.pi / 2
        groundNode.position = SCNVector3(0, 0, 150)
        scene.rootNode.addChildNode(groundNode)

        TrajectorySceneBuilder.update(scene: scene, with: shot)
        return scnView
    }

    func updateUIView(_ uiView: SCNView, context: Context) {
        if let scene = uiView.scene {
            TrajectorySceneBuilder.update(scene: scene, with: shot)
        }
    }
}

enum TrajectorySceneBuilder {
    static func update(scene: SCNScene, with shot: ShotData?) {
        scene.rootNode.childNode(withName: "TracerLine", recursively: false)?.removeFromParentNode()
        scene.rootNode.childNode(withName: "GolfBall", recursively: false)?.removeFromParentNode()

        guard let shot = shot, !shot.trajectoryPoints.isEmpty else { return }

        let points = shot.trajectoryPoints
        let tracerParent = SCNNode()
        tracerParent.name = "TracerLine"

        for i in 0..<(points.count - 1) {
            let p1 = points[i]
            let p2 = points[i + 1]

            let distance = sqrt(
                pow(p2.x - p1.x, 2) + pow(p2.y - p1.y, 2) + pow(p2.z - p1.z, 2)
            )
            let cylinder = SCNCylinder(radius: 0.3, height: CGFloat(distance))
            cylinder.firstMaterial?.diffuse.contents = UIColor.systemOrange
            cylinder.firstMaterial?.emission.contents = UIColor.systemYellow

            let node = SCNNode(geometry: cylinder)
            node.position = SCNVector3((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, (p1.z + p2.z) / 2)
            node.look(at: p2, up: scene.rootNode.worldUp, localFront: SCNVector3(0, 1, 0))

            tracerParent.addChildNode(node)
        }

        scene.rootNode.addChildNode(tracerParent)

        let ballGeo = SCNSphere(radius: 0.8)
        ballGeo.firstMaterial?.diffuse.contents = UIColor.white
        let ballNode = SCNNode(geometry: ballGeo)
        ballNode.name = "GolfBall"
        if let lastPoint = points.last {
            ballNode.position = lastPoint
        }
        scene.rootNode.addChildNode(ballNode)
    }
}
