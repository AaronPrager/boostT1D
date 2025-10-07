import SwiftUI

struct BoostT1DLogo: View {
    let size: CGFloat
    
    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.blue.opacity(0.8), Color.purple.opacity(0.6)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
            
            // Heart icon
            Image(systemName: "heart.fill")
                .font(.system(size: size * 0.4))
                .foregroundColor(.white)
            
            // Small plus icon
            Image(systemName: "plus")
                .font(.system(size: size * 0.15, weight: .bold))
                .foregroundColor(.white)
                .offset(x: size * 0.25, y: -size * 0.25)
        }
    }
}

struct BoostT1DLogoIcon: View {
    let size: CGFloat
    
    var body: some View {
        ZStack {
            // Background circle
            Circle()
                .fill(Color.blue)
                .frame(width: size, height: size)
            
            // Heart icon
            Image(systemName: "heart.fill")
                .font(.system(size: size * 0.4))
                .foregroundColor(.white)
            
            // Small plus icon
            Image(systemName: "plus")
                .font(.system(size: size * 0.15, weight: .bold))
                .foregroundColor(.white)
                .offset(x: size * 0.25, y: -size * 0.25)
        }
    }
}

struct BoostT1DAnimatedLogo: View {
    let size: CGFloat
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Background circle with animation
            Circle()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.blue.opacity(0.8), Color.purple.opacity(0.6)]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .scaleEffect(isAnimating ? 1.1 : 1.0)
                .animation(
                    Animation.easeInOut(duration: 2.0)
                        .repeatForever(autoreverses: true),
                    value: isAnimating
                )
            
            // Heart icon
            Image(systemName: "heart.fill")
                .font(.system(size: size * 0.4))
                .foregroundColor(.white)
                .scaleEffect(isAnimating ? 1.05 : 1.0)
                .animation(
                    Animation.easeInOut(duration: 1.5)
                        .repeatForever(autoreverses: true),
                    value: isAnimating
                )
            
            // Small plus icon
            Image(systemName: "plus")
                .font(.system(size: size * 0.15, weight: .bold))
                .foregroundColor(.white)
                .offset(x: size * 0.25, y: -size * 0.25)
                .rotationEffect(.degrees(isAnimating ? 360 : 0))
                .animation(
                    Animation.linear(duration: 3.0)
                        .repeatForever(autoreverses: false),
                    value: isAnimating
                )
        }
        .onAppear {
            isAnimating = true
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        BoostT1DLogo(size: 80)
        BoostT1DLogoIcon(size: 60)
        BoostT1DAnimatedLogo(size: 100)
    }
}
