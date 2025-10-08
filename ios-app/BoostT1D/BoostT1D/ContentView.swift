import SwiftUI

struct ContentView: View {
    @StateObject private var profileService = UserProfileService.shared
    
    var body: some View {
        Group {
            if profileService.isProfileComplete {
                // User has completed profile, show main app
                NavigationView {
                    WelcomeView()
                }
            } else {
                // First time user, show onboarding
                MainLandingView()
            }
        }
        .onChange(of: profileService.isProfileComplete) { isComplete in
            print("Profile completion status changed: \(isComplete)")
        }
    }
}

#Preview {
    ContentView()
}
