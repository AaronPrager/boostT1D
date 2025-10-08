import SwiftUI

struct HeartBloodDropIcon: View {
    let size: CGFloat
    
    init(size: CGFloat = 100) {
        self.size = size
    }
    
    var body: some View {
        ZStack {
            // Blue Heart - more prominent
            HeartShape()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.0, green: 0.5, blue: 1.0),  // Bright blue
                            Color(red: 0.0, green: 0.3, blue: 0.8)   // Darker blue
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .shadow(color: .blue.opacity(0.4), radius: 6, x: 0, y: 3)
            
            // Red Blood Drop - more vibrant
            BloodDropShape()
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 1.0, green: 0.2, blue: 0.2),  // Bright red
                            Color(red: 0.8, green: 0.1, blue: 0.1)   // Darker red
                        ]),
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: size * 0.35, height: size * 0.45)
                .offset(x: size * 0.12, y: -size * 0.08)
                .shadow(color: .red.opacity(0.4), radius: 4, x: 0, y: 2)
        }
    }
}

struct HeartShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        
        // Heart shape using two circles and a triangle
        let centerX = width / 2
        let centerY = height / 2
        
        // Left circle
        let leftCircleCenter = CGPoint(x: centerX - width * 0.12, y: centerY - height * 0.12)
        let leftCircleRadius = width * 0.28
        
        // Right circle
        let rightCircleCenter = CGPoint(x: centerX + width * 0.12, y: centerY - height * 0.12)
        let rightCircleRadius = width * 0.28
        
        // Left circle
        path.addArc(center: leftCircleCenter, radius: leftCircleRadius, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)
        
        // Right circle
        path.addArc(center: rightCircleCenter, radius: rightCircleRadius, startAngle: .degrees(0), endAngle: .degrees(360), clockwise: false)
        
        // Triangle point
        let triangleTop = CGPoint(x: centerX, y: centerY + height * 0.25)
        let triangleLeft = CGPoint(x: centerX - width * 0.18, y: centerY + height * 0.08)
        let triangleRight = CGPoint(x: centerX + width * 0.18, y: centerY + height * 0.08)
        
        path.move(to: triangleTop)
        path.addLine(to: triangleLeft)
        path.addLine(to: triangleRight)
        path.closeSubpath()
        
        return path
    }
}

struct BloodDropShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        
        // Blood drop shape - teardrop
        let centerX = width / 2
        let centerY = height / 2
        let topY = height * 0.1
        let bottomY = height * 0.9
        
        // Start from the top point
        path.move(to: CGPoint(x: centerX, y: topY))
        
        // Left curve
        path.addCurve(
            to: CGPoint(x: centerX - width * 0.3, y: centerY),
            control1: CGPoint(x: centerX - width * 0.2, y: topY + height * 0.2),
            control2: CGPoint(x: centerX - width * 0.35, y: topY + height * 0.4)
        )
        
        // Bottom curve
        path.addCurve(
            to: CGPoint(x: centerX + width * 0.3, y: centerY),
            control1: CGPoint(x: centerX - width * 0.1, y: bottomY),
            control2: CGPoint(x: centerX + width * 0.1, y: bottomY)
        )
        
        // Right curve back to top
        path.addCurve(
            to: CGPoint(x: centerX, y: topY),
            control1: CGPoint(x: centerX + width * 0.35, y: topY + height * 0.4),
            control2: CGPoint(x: centerX + width * 0.2, y: topY + height * 0.2)
        )
        
        path.closeSubpath()
        
        return path
    }
}

#Preview {
    VStack(spacing: 20) {
        HeartBloodDropIcon(size: 100)
        HeartBloodDropIcon(size: 60)
        HeartBloodDropIcon(size: 40)
    }
    .padding()
}
