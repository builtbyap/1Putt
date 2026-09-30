import SwiftUI

struct SessionDashboardView: View {
    @State private var manager = LaunchMonitorManager()

    var body: some View {
        ZStack {
            Color(.systemGroupedBackground)
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    HStack {
                        Circle()
                            .fill(manager.isConnected ? Color.green : Color.red)
                            .frame(width: 12, height: 12)
                        Text(manager.isConnected ? "Live (Fly.io Cloud)" : "Disconnected")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Button(manager.isConnected ? "Disconnect" : "Connect") {
                            if manager.isConnected {
                                manager.disconnect()
                            } else {
                                manager.connect()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(manager.isConnected ? .red : .blue)
                    }
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("CAMERA ALIGNMENT")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        AlignmentOverlayView(cameraImage: manager.liveCameraImage)
                    }

                    VStack(spacing: 12) {
                        Text("CARRY YARDS")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)

                        Text(manager.latestShot != nil ? "\(Int(manager.latestShot!.carryYards))" : "---")
                            .font(.system(size: 72, weight: .heavy, design: .rounded))
                            .foregroundColor(.primary)

                        HStack(spacing: 40) {
                            MetricPill(
                                title: "Ball Speed",
                                value: manager.latestShot != nil ? "\(manager.latestShot!.ballSpeedMph) mph" : "--"
                            )
                            MetricPill(
                                title: "Launch Angle",
                                value: manager.latestShot != nil ? "\(manager.latestShot!.launchAngleDeg)°" : "--"
                            )
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(24)
                    .background(Color(.systemBackground))
                    .cornerRadius(20)
                    .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
                    .padding(.horizontal)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("SHOT TRACER")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)

                        GolfTrajectoryView(shot: manager.latestShot)
                            .padding(.horizontal)
                    }

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 15) {
                        SecondaryCard(
                            title: "Club Speed",
                            value: manager.latestShot != nil ? "\(manager.latestShot!.clubSpeedMph) mph" : "--"
                        )
                        SecondaryCard(
                            title: "Spin Rate",
                            value: manager.latestShot != nil ? "\(manager.latestShot!.spinRateRpm) rpm" : "--"
                        )
                    }
                    .padding(.horizontal)

                    HStack {
                        Text("Session History")
                            .font(.headline)
                        Spacer()
                        Text("\(manager.shotHistory.count) Shots")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal)

                    ForEach(manager.shotHistory) { shot in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Carry: \(Int(shot.carryYards)) yds")
                                    .fontWeight(.semibold)
                                Text("Speed: \(shot.ballSpeedMph) mph  |  Launch: \(shot.launchAngleDeg)°")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text("\(shot.spinRateRpm) rpm")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }
                .padding(.top)
            }
        }
        .navigationTitle("PiTrax Pro")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            manager.connect()
        }
        .onDisappear {
            manager.disconnect()
        }
    }
}

struct MetricPill: View {
    let title: String
    let value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.headline)
                .fontWeight(.bold)
        }
    }
}

struct SecondaryCard: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title.uppercased())
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.03), radius: 5, x: 0, y: 2)
    }
}
