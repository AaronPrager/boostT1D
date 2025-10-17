import SwiftUI

struct MainLandingView: View {
    @StateObject private var profileService = UserProfileService.shared
    @State private var showingProfileSetup = false
    @State private var showingAbout = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                Spacer()
                
                // App Logo
                VStack(spacing: 20) {
                    // Main Logo - Clickable
                    Button(action: {
                        showingAbout = true
                    }) {
                        Image("MainLogo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(width: 280, height: 280)
                    }
                    .buttonStyle(PlainButtonStyle())
                    
                    Text("Your Personal Diabetes Management Assistant")
                        .font(.title3)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .lineLimit(nil)
                        .minimumScaleFactor(0.8)
                        .padding(.horizontal, 20)
                }
                
                Spacer()
                
                // Action Button
                VStack(spacing: 16) {
                    // Get Started Button
                    Button(action: {
                        showingProfileSetup = true
                    }) {
                        HStack {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.title2)
                            
                            Text("Get Started")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        .padding(.horizontal, 40)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    
                    // Insulin Access Dashboard - Only show for US users
                    if profileService.currentProfile?.country == "United States" {
                        Button(action: {
                            if let url = URL(string: "https://cac-ia2.vercel.app") {
                                UIApplication.shared.open(url)
                            }
                        }) {
                            HStack {
                                Image(systemName: "map.fill")
                                    .font(.title2)
                                
                                VStack(spacing: 2) {
                                    Text("Insulin Access Dashboard")
                                        .font(.headline)
                                        .fontWeight(.semibold)
                                    
                                    Text("Congressional district risk analysis")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            .padding(.horizontal, 30)
                            .padding(.vertical, 12)
                            .background(Color.teal)
                            .foregroundColor(.white)
                            .cornerRadius(12)
                        }
                    }
                }
                
                Spacer()
            }
            .fullScreenCover(isPresented: $showingProfileSetup) {
                OnboardingView()
            }
            .sheet(isPresented: $showingAbout) {
                AboutView()
            }
        }
    }
}

#Preview {
    MainLandingView()
}
