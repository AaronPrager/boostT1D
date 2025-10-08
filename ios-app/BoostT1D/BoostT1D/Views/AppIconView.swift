import SwiftUI

struct AppIconView: View {
    let size: CGFloat
    
    init(size: CGFloat = 100) {
        self.size = size
    }
    
    var body: some View {
        ZStack {
            // Blue circle background
            Circle()
                .fill(Color.blue)
                .frame(width: size, height: size)
            
            // White heart cutout
            AppIconHeartShape()
                .fill(Color.white)
                .frame(width: size * 0.6, height: size * 0.6)
            
            // Red blood drop on heart
            AppIconBloodDropShape()
                .fill(Color.red)
                .frame(width: size * 0.15, height: size * 0.2)
                .offset(x: size * 0.05, y: -size * 0.1)
        }
    }
}

struct AppIconHeartShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        
        // Heart shape using two circles and a triangle
        let centerX = width / 2
        let centerY = height / 2
        
        // Left circle of heart
        let leftCircle = Circle()
            .frame(width: width * 0.4, height: width * 0.4)
            .offset(x: -width * 0.1, y: -height * 0.05)
        
        // Right circle of heart
        let rightCircle = Circle()
            .frame(width: width * 0.4, height: width * 0.4)
            .offset(x: width * 0.1, y: -height * 0.05)
        
        // Heart point (triangle)
        path.move(to: CGPoint(x: centerX, y: height * 0.7))
        path.addLine(to: CGPoint(x: width * 0.2, y: height * 0.4))
        path.addQuadCurve(
            to: CGPoint(x: centerX, y: height * 0.2),
            control: CGPoint(x: width * 0.1, y: height * 0.1)
        )
        path.addQuadCurve(
            to: CGPoint(x: width * 0.8, y: height * 0.4),
            control: CGPoint(x: width * 0.9, y: height * 0.1)
        )
        path.addLine(to: CGPoint(x: centerX, y: height * 0.7))
        path.closeSubpath()
        
        return path
    }
}

struct AppIconBloodDropShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        
        // Blood drop shape - teardrop
        let centerX = width / 2
        let topY = height * 0.2
        let bottomY = height * 0.8
        
        // Start from top point
        path.move(to: CGPoint(x: centerX, y: topY))
        
        // Left curve
        path.addQuadCurve(
            to: CGPoint(x: width * 0.2, y: height * 0.5),
            control: CGPoint(x: width * 0.1, y: height * 0.3)
        )
        
        // Bottom curve
        path.addQuadCurve(
            to: CGPoint(x: centerX, y: bottomY),
            control: CGPoint(x: width * 0.1, y: height * 0.7)
        )
        
        // Right curve
        path.addQuadCurve(
            to: CGPoint(x: width * 0.8, y: height * 0.5),
            control: CGPoint(x: width * 0.9, y: height * 0.7)
        )
        
        // Top curve back to start
        path.addQuadCurve(
            to: CGPoint(x: centerX, y: topY),
            control: CGPoint(x: width * 0.9, y: height * 0.3)
        )
        
        path.closeSubpath()
        
        return path
    }
}

#Preview {
    VStack(spacing: 20) {
        // Different sizes for preview
        AppIconView(size: 60)
        AppIconView(size: 100)
        AppIconView(size: 150)
    }
    .padding()
}