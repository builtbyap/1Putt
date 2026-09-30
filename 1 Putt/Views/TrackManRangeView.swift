import SwiftUI

private enum TrackManTheme {
    static let compare = Color(red: 0.92, green: 0.42, blue: 0.16)
}

struct TrackManRangeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var manager = LaunchMonitorManager()
    @State private var showsAlignment = false
    @State private var alignmentDismissed = false

    private var recordedShots: [ShotData] {
        manager.shotHistory.filter(\.hasRecordedFlight)
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            TrackManWebRangeView(shots: recordedShots) {
                dismiss()
            }
            .ignoresSafeArea()

            if showsAlignment && !alignmentDismissed {
                alignmentOverlay
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        #if os(iOS)
        .statusBarHidden(true)
        #endif
        .onAppear {
            manager.connect()
            #if os(iOS)
            InterfaceOrientationLock.lock(to: .landscape)
            #endif
            Task {
                try? await Task.sleep(for: .seconds(5))
                guard !alignmentDismissed else { return }
                withAnimation(.easeInOut(duration: 0.35)) {
                    showsAlignment = true
                }
            }
        }
        .onDisappear {
            manager.disconnect()
            #if os(iOS)
            InterfaceOrientationLock.lock(to: .portrait)
            #endif
        }
    }

    private var alignmentOverlay: some View {
        ZStack {
            Color.black.opacity(0.55).ignoresSafeArea()
            VStack(spacing: 16) {
                Text("CAMERA ALIGNMENT")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white.opacity(0.7))
                AlignmentOverlayView(cameraImage: manager.liveCameraImage)
                Button("Continue to Range") {
                    withAnimation {
                        alignmentDismissed = true
                        showsAlignment = false
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(TrackManTheme.compare)
            }
            .padding(.vertical, 20)
        }
        .transition(.opacity)
    }
}
