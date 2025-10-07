import SwiftUI

struct MainLandingView: View {
    @State private var showingProfileSetup = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 40) {
                Spacer()
                
                // App Logo and Title
                VStack(spacing: 20) {
                    // Custom BoostT1D Logo
                    BoostT1DAnimatedLogo(size: 120)
                    
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                }
                .padding(.horizontal, 40)
                
                Spacer()
                
                // Footer
                VStack(spacing: 8) {
                    Text("Welcome to BoostT1D")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("Tap Get Started to begin your diabetes management journey")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.bottom, 20)
            }
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color(.systemBackground), Color(.systemGray6)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .fullScreenCover(isPresented: $showingProfileSetup) {
                OnboardingView()
            }
        }
    }
}

#Preview {
    MainLandingView()
}
