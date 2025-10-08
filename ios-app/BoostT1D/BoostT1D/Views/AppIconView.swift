import SwiftUI

struct AppIconView: View {
    let size: CGFloat
    
    init(size: CGFloat = 1024) {
        self.size = size
    }
    
    var body: some View {
        ZStack {
            // Background with rounded corners (iOS app icon style)
            RoundedRectangle(cornerRadius: size * 0.22)
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.2, green: 0.5, blue: 1.0), // Bright blue
                            Color(red: 0.1, green: 0.3, blue: 0.8)  // Darker blue
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: .black.opacity(0.2), radius: size * 0.05, x: 0, y: size * 0.02)
            
            // Heart shape
            HeartShape()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.white,
                            Color.white.opacity(0.9)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size * 0.6, height: size * 0.6)
                .shadow(color: .black.opacity(0.1), radius: size * 0.02, x: 0, y: size * 0.01)
            
            // Blood drop
            BloodDropShape()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.9, green: 0.1, blue: 0.1), // Bright red
                            Color(red: 0.7, green: 0.05, blue: 0.05) // Darker red
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size * 0.25, height: size * 0.3)
                .offset(x: size * 0.12, y: -size * 0.08)
                .shadow(color: .black.opacity(0.2), radius: size * 0.01, x: 0, y: size * 0.005)
        }
    }
}


#Preview {
    VStack(spacing: 20) {
        Text("App Icon Preview")
            .font(.headline)
        
        HStack(spacing: 20) {
            AppIconView(size: 60)
            AppIconView(size: 80)
            AppIconView(size: 120)
        }
        
        Text("Different sizes for different contexts")
            .font(.caption)
            .foregroundColor(.secondary)
    }
    .padding()
}
