import SwiftUI

struct WelcomeView: View {
    @StateObject private var profileService = UserProfileService.shared
    @State private var showingProfileSetup = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Header Section
                    VStack(spacing: 16) {
                        // Custom BoostT1D Logo
                        BoostT1DLogoIcon(size: 80)
                        
                        Text("AI-Powered Diabetes Management")
                            .font(.title2)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    
                    // Welcome Message
                    VStack(spacing: 12) {
                        Text("Welcome back, \(profileService.currentProfile?.name ?? "User")!")
                            .font(.title)
                            .fontWeight(.bold)
                            .multilineTextAlignment(.center)
                        
                        Text("Your diabetes management companion")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.horizontal, 20)
                    
                    // Menu Grid
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 16) {
                        // Blood Glucose Data
                        NavigationLink(destination: BloodGlucoseDataView()) {
                            MenuButtonContent(
                                icon: "heart.fill",
                                title: "Blood Glucose Data",
                                subtitle: "View your glucose readings and trends",
                                color: .red
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Treatments
                        NavigationLink(destination: TreatmentsView()) {
                            MenuButtonContent(
                                icon: "syringe.fill",
                                title: "Treatments",
                                subtitle: "Track insulin and medication doses",
                                color: .purple
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Therapy Adjustment
                        NavigationLink(destination: TherapyAdjustmentView()) {
                            MenuButtonContent(
                                icon: "slider.horizontal.3",
                                title: "Therapy Adjustment",
                                subtitle: "AI-powered dose recommendations",
                                color: .orange
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Profile
                        NavigationLink(destination: ProfileView()) {
                            MenuButtonContent(
                                icon: "person.circle.fill",
                                title: "Profile",
                                subtitle: "Manage your personal information",
                                color: .blue
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Diabetes Profile
                        NavigationLink(destination: DiabetesProfileView()) {
                            MenuButtonContent(
                                icon: "person.circle.fill",
                                title: "Diabetes Profile",
                                subtitle: "Configure your diabetes settings",
                                color: .green
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Settings
                        NavigationLink(destination: ProfileView()) {
                            MenuButtonContent(
                                icon: "gear",
                                title: "Settings",
                                subtitle: "App preferences and configuration",
                                color: .gray
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("BoostT1D")
            .navigationBarItems(
                trailing: Button(action: {
                    showingProfileSetup = true
                }) {
                    Image(systemName: "person.circle")
                        .font(.title2)
                }
            )
        }
        .sheet(isPresented: $showingProfileSetup) {
            OnboardingView()
        }
    }
}

struct MenuButtonContent: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 32))
                .foregroundColor(color)
            
            VStack(spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    WelcomeView()
}
