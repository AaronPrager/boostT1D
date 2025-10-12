#!/usr/bin/env swift

import SwiftUI
import UIKit

// AppIconView definition
struct AppIconView: View {
    let size: CGFloat

    var body: some View {
        ZStack {
            // Blue circle background
            Circle()
                .fill(Color.blue)
                .frame(width: size, height: size)

            // White heart cutout
            AppIconHeartShape()
                .fill(Color.white)
                .frame(width: size * 0.7, height: size * 0.7)

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

        path.move(to: CGPoint(x: width / 2, y: 0))
        path.addQuadCurve(to: CGPoint(x: width / 2, y: height),
                          control: CGPoint(x: width, y: height * 0.75))
        path.addQuadCurve(to: CGPoint(x: width / 2, y: 0),
                          control: CGPoint(x: 0, y: height * 0.75))
        return path
    }
}

// Icon sizes needed
let iconSizes: [(String, CGFloat)] = [
    ("20x20", 20),
    ("29x29", 29),
    ("40x40", 40),
    ("58x58", 58),
    ("60x60", 60),
    ("76x76", 76),
    ("80x80", 80),
    ("87x87", 87),
    ("120x120", 120),
    ("152x152", 152),
    ("167x167", 167),
    ("180x180", 180),
    ("1024x1024", 1024)
]

// Generate icons
for (name, size) in iconSizes {
    let iconView = AppIconView(size: size)
    let renderer = ImageRenderer(content: iconView)
    renderer.scale = 1.0
    
    if let uiImage = renderer.uiImage,
       let pngData = uiImage.pngData() {
        let filename = "AppIcon-\(name).png"
        let url = URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent(filename)
        try? pngData.write(to: url)
        print("Generated: \(filename)")
    }
}

print("✅ All app icons generated!")



