import SwiftUI

struct Trajectory2DView: View {
    let shot: ShotData?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("2D SIDE PROFILE TRACER")
                .font(.caption).bold()
                .foregroundColor(.gray)

            Canvas { context, size in
                guard let shot = shot, shot.hasRecordedFlight else { return }

                let width = size.width
                let height = size.height

                var ground = Path()
                ground.move(to: CGPoint(x: 0, y: height - 10))
                ground.addLine(to: CGPoint(x: width, y: height - 10))
                context.stroke(ground, with: .color(.gray.opacity(0.4)), lineWidth: 1)

                let startPoint = CGPoint(x: 10, y: height - 10)
                let endPoint = CGPoint(x: width - 10, y: height - 10)

                let apexHeight = min(height * 0.7, height * (shot.launchAngleDeg / 45.0))
                let controlPoint = CGPoint(x: width / 2, y: height - 10 - (apexHeight * 1.8))

                var arc = Path()
                arc.move(to: startPoint)
                arc.addQuadCurve(to: endPoint, control: controlPoint)

                context.stroke(
                    arc,
                    with: .linearGradient(
                        Gradient(colors: [.orange, .yellow, .red]),
                        startPoint: startPoint,
                        endPoint: endPoint
                    ),
                    lineWidth: 4
                )
            }
            .frame(height: 140)
            .background(Color(white: 0.08))
            .cornerRadius(12)
        }
    }
}
