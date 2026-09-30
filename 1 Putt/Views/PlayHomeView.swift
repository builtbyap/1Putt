import SwiftUI

enum AppTheme {
    static let red = Color(red: 0.78, green: 0.10, blue: 0.18)
    static let wedge = Color(red: 0.32, green: 0.32, blue: 0.33)
    static let pageBackground = Color(red: 0.96, green: 0.96, blue: 0.97)
}

enum PlayMode: String, CaseIterable, Identifiable, Hashable {
    case practice
    case combines
    case courses
    case range
    case speed
    case targetRange
    case closestToPin

    var id: String { rawValue }

    var title: String {
        switch self {
        case .practice: return "PRACTICE"
        case .combines: return "COMBINES"
        case .courses: return "COURSES"
        case .range: return "RANGE"
        case .speed: return "SPEED"
        case .targetRange: return "TARGET RANGE"
        case .closestToPin: return "CLOSEST TO THE PIN"
        }
    }

    var symbol: String {
        switch self {
        case .practice: return "basket.fill"
        case .combines: return "figure.golf"
        case .courses: return "flag.fill"
        case .range: return "baseball.fill"
        case .speed: return "figure.golf"
        case .targetRange: return "water.waves"
        case .closestToPin: return "flag.circle.fill"
        }
    }
}

struct PlayHomeView: View {
    @State private var selectedMode: PlayMode?

    var body: some View {
        NavigationStack {
            ZStack(alignment: .trailing) {
                AppTheme.pageBackground
                    .ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 10) {
                        ForEach(PlayMode.allCases) { mode in
                            Button {
                                selectedMode = mode
                            } label: {
                                PlayModeCard(mode: mode)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 24)
                }

                sideHandle
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("PLAY")
                        .font(.system(size: 17, weight: .bold))
                        .tracking(1.2)
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {}) {
                        Image(systemName: "bell")
                            .font(.system(size: 17, weight: .regular))
                            .foregroundStyle(.primary)
                    }
                }
            }
            .navigationDestination(item: $selectedMode) { mode in
                if mode == .range {
                    TrackManRangeView()
                } else {
                    SessionDashboardView()
                }
            }
        }
    }

    private var sideHandle: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Color(white: 0.18))
            .frame(width: 28, height: 64)
            .overlay {
                Image(systemName: "chevron.left")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white.opacity(0.85))
                    .offset(x: -2)
            }
            .offset(x: 14)
            .padding(.top, 70)
            .frame(maxHeight: .infinity, alignment: .top)
            .allowsHitTesting(false)
    }
}

struct PlayModeCard: View {
    let mode: PlayMode

    var body: some View {
        ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Color.white)

            DiagonalWedge()
                .fill(AppTheme.wedge)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            HStack(spacing: 16) {
                ZStack {
                    Circle()
                        .fill(Color.white)
                        .frame(width: 52, height: 52)
                    Circle()
                        .stroke(AppTheme.red, lineWidth: 2.5)
                        .frame(width: 52, height: 52)
                    Image(systemName: mode.symbol)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(Color(white: 0.18))
                }
                .frame(width: 52, height: 52)

                Text(mode.title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(Color(white: 0.12))
                    .tracking(0.4)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .frame(height: 76)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 3)
    }
}

struct DiagonalWedge: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: 0, y: rect.height))
        path.addLine(to: CGPoint(x: rect.height * 0.42, y: rect.height))
        path.addLine(to: CGPoint(x: rect.height * 0.92, y: 0))
        path.closeSubpath()
        return path
    }
}

struct HomeTabView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "chart.xyaxis.line")
                    .font(.system(size: 44, weight: .medium))
                    .foregroundStyle(AppTheme.red)
                Text("No recent activity")
                    .font(.title3.weight(.semibold))
                Text("Start a session from Play to see your latest shots here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(AppTheme.pageBackground.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("HOME")
                        .font(.system(size: 17, weight: .bold))
                        .tracking(1.2)
                }
            }
        }
    }
}

struct ProfileTabView: View {
    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack(spacing: 14) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 52))
                            .foregroundStyle(AppTheme.red)
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Golfer")
                                .font(.headline)
                            Text("PiTrax Pro")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                Section("Account") {
                    Label("Notifications", systemImage: "bell")
                    Label("Units", systemImage: "ruler")
                    Label("Connected Devices", systemImage: "wifi")
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("PROFILE")
                        .font(.system(size: 17, weight: .bold))
                        .tracking(1.2)
                }
            }
        }
    }
}
