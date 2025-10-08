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
            
            // White heart cutout - proper size and centered
            AppIconHeartShape()
                .fill(Color.white)
                .frame(width: size * 0.7, height: size * 0.7)
            
            // Red blood drop in upper right corner of heart
            AppIconBloodDropShape()
                .fill(Color.red)
                .frame(width: size * 0.2, height: size * 0.25)
                .offset(x: size * 0.15, y: -size * 0.15)
        }
    }
}

struct AppIconHeartShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        let centerX = width / 2
        let centerY = height / 2
        
        // Create a proper heart shape using two circles and a triangle
        // Left circle of heart
        let leftCircleCenter = CGPoint(x: centerX - width * 0.15, y: centerY - height * 0.05)
        let leftCircleRadius = width * 0.2
        
        // Right circle of heart  
        let rightCircleCenter = CGPoint(x: centerX + width * 0.15, y: centerY - height * 0.05)
        let rightCircleRadius = width * 0.2
        
        // Start from the bottom point of the heart
        path.move(to: CGPoint(x: centerX, y: centerY + height * 0.25))
        
        // Left curve up to the left circle
        path.addQuadCurve(
            to: CGPoint(x: leftCircleCenter.x - leftCircleRadius, y: leftCircleCenter.y),
            control: CGPoint(x: centerX - width * 0.1, y: centerY + height * 0.1)
        )
        
        // Left circle arc
        path.addArc(
            center: leftCircleCenter,
            radius: leftCircleRadius,
            startAngle: .degrees(180),
            endAngle: .degrees(0),
            clockwise: false
        )
        
        // Right circle arc
        path.addArc(
            center: rightCircleCenter,
            radius: rightCircleRadius,
            startAngle: .degrees(180),
            endAngle: .degrees(0),
            clockwise: false
        )
        
        // Right curve down to the bottom
        path.addQuadCurve(
            to: CGPoint(x: centerX, y: centerY + height * 0.25),
            control: CGPoint(x: centerX + width * 0.1, y: centerY + height * 0.1)
        )
        
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