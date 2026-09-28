import SwiftUI

struct AlignmentOverlayView: View {
    var cameraImage: LiveCameraImage?

    var body: some View {
        ZStack {
            if let image = cameraImage {
                platformImage(image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 380)
                    .clipped()
                    .cornerRadius(20)
            } else {
                ZStack {
                    Color.black
                    VStack(spacing: 8) {
                        ProgressView()
                            .tint(.white)
                        Text("Connecting to Alignment Camera...")
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
                .frame(height: 380)
                .cornerRadius(20)
            }

            RoundedRectangle(cornerRadius: 16)
                .stroke(style: StrokeStyle(lineWidth: 3, dash: [8, 6]))
                .foregroundColor(.yellow)
                .frame(width: 180, height: 180)
                .overlay(
                    VStack {
                        Rectangle()
                            .fill(Color.yellow)
                            .frame(width: 2, height: 16)
                        Spacer()
                        Rectangle()
                            .fill(Color.yellow)
                            .frame(width: 2, height: 16)
                    }
                )
                .overlay(
                    HStack {
                        Rectangle()
                            .fill(Color.yellow)
                            .frame(width: 16, height: 2)
                        Spacer()
                        Rectangle()
                            .fill(Color.yellow)
                            .frame(width: 16, height: 2)
                    }
                )

            VStack {
                Spacer()
                Text("PLACE GOLF BALL INSIDE TARGET BOX")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.black.opacity(0.75))
                    .foregroundColor(.yellow)
                    .cornerRadius(8)
                    .padding(.bottom, 16)
            }
        }
        .padding(.horizontal)
        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
    }

    private func platformImage(_ image: LiveCameraImage) -> Image {
        #if os(iOS)
        Image(uiImage: image)
        #else
        Image(nsImage: image)
        #endif
    }
}
