import SwiftUI

struct WelcomeView: View {
    @StateObject private var profileService = UserProfileService.shared
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Welcome Message - positioned at top
                VStack(spacing: 4) {
                    Text("Welcome back, \(profileService.currentProfile?.name ?? "User")!")
                        .font(.title)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)
                    
                    Text("Your diabetes management companion")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
                
                // Menu List
                ScrollView {
                    VStack(spacing: 8) {
                        // Group 1: Core Diabetes Management
                        VStack(spacing: 8) {
                            // Diabetes Profile
                            NavigationLink(destination: DiabetesProfileView()) {
                                MenuButtonContent(
                                    icon: "person.circle.fill",
                                    title: "Diabetes Profile",
                                    subtitle: "Configure your diabetes settings",
                                    color: .blue
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                            
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
                        }
                        
                        // Divider
                        Divider()
                            .padding(.vertical, 8)
                        
                        // Group 2: AI-Powered Features
                        VStack(spacing: 8) {
                            // Therapy Adjustment
                            NavigationLink(destination: TherapyAdjustmentView()) {
                                MenuButtonContent(
                                    icon: "slider.horizontal.3",
                                    title: "Therapy Adjustment",
                                    subtitle: "AI dose recommendations",
                                    color: .orange
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        // Divider
                        Divider()
                            .padding(.vertical, 8)
                        
                        // Group 3: Additional Tools
                        VStack(spacing: 8) {
                            // Food Analysis
                            NavigationLink(destination: FoodAnalysisView()) {
                                MenuButtonContent(
                                    icon: "camera.fill",
                                    title: "Food Analysis",
                                    subtitle: "AI carb estimation",
                                    color: .green
                                )
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer(minLength: 5)
                    }
                }
            }
            .navigationTitle("BoostT1D")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                trailing: NavigationLink(destination: ProfileView()) {
                    Group {
                        if let photo = profileService.currentProfile?.photo {
                            Image(uiImage: photo)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 32, height: 32)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: 2)
                                )
                        } else {
                            Image(systemName: "person.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                        }
                    }
                }
            )
        }
    }

struct MenuButtonContent: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundColor(color)
            
            VStack(spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                
                Text(subtitle)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

#Preview {
    WelcomeView()
}
