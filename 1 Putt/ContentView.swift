import SwiftUI
#if os(iOS)
import UIKit
#endif

struct ContentView: View {
    @State private var selectedTab = 1

    init() {
        #if os(iOS)
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = .white
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
        UITabBar.appearance().unselectedItemTintColor = UIColor.systemGray
        #endif
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeTabView()
                .tabItem {
                    Image(systemName: "chart.xyaxis.line")
                    Text("HOME")
                }
                .tag(0)

            PlayHomeView()
                .tabItem {
                    Image(systemName: "flag.fill")
                    Text("PLAY")
                }
                .tag(1)

            ProfileTabView()
                .tabItem {
                    Image(systemName: "person.crop.circle")
                    Text("PROFILE")
                }
                .tag(2)
        }
        .tint(AppTheme.red)
        .preferredColorScheme(.light)
    }
}

#Preview {
    ContentView()
}
