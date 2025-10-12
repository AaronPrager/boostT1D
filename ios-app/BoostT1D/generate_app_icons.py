#!/usr/bin/env python3

from PIL import Image, ImageDraw
import math

def draw_heart(draw, center_x, center_y, size, color):
    """Draw a heart shape"""
    # Scale factor for the heart
    scale = size * 0.35
    
    # Heart shape using curves
    points = []
    for i in range(360):
        t = math.radians(i)
        # Parametric heart equation
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2*t) - 2 * math.cos(3*t) - math.cos(4*t))
        
        # Scale and translate
        px = center_x + x * scale / 16
        py = center_y + y * scale / 16
        points.append((px, py))
    
    draw.polygon(points, fill=color)

def draw_blood_drop(draw, center_x, center_y, size, color):
    """Draw a blood drop shape"""
    # Water drop shape
    points = []
    for i in range(180):
        t = math.radians(i)
        x = center_x + size * 0.05 + math.sin(t) * size * 0.08
        y = center_y - size * 0.1 + i / 180 * size * 0.15
        points.append((x, y))
    
    # Complete the drop with a curve back to start
    for i in range(180, 0, -1):
        t = math.radians(i)
        x = center_x + size * 0.05 - math.sin(t) * size * 0.08
        y = center_y - size * 0.1 + i / 180 * size * 0.15
        points.append((x, y))
    
    draw.polygon(points, fill=color)

def create_app_icon(size):
    """Create app icon at specified size"""
    # Create image with blue background circle
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Blue circle background
    blue = (0, 122, 255)  # iOS blue
    draw.ellipse([0, 0, size, size], fill=blue)
    
    # White heart in center
    white = (255, 255, 255)
    heart_size = size * 0.5
    draw_heart(draw, size // 2, size // 2, heart_size, white)
    
    # Red blood drop on heart
    red = (255, 59, 48)  # iOS red
    drop_size = size * 0.2
    draw_blood_drop(draw, size // 2, size // 2, drop_size, red)
    
    return img

# Icon sizes needed for iOS
icon_sizes = [
    ("20", 20),
    ("29", 29),
    ("40", 40),
    ("58", 58),
    ("60", 60),
    ("76", 76),
    ("80", 80),
    ("87", 87),
    ("120", 120),
    ("152", 152),
    ("167", 167),
    ("180", 180),
    ("1024", 1024)
]

print("🎨 Generating app icons...")

for name, size in icon_sizes:
    icon = create_app_icon(size)
    filename = f"AppIcon-{name}x{name}.png"
    icon.save(filename)
    print(f"✅ Generated: {filename}")

print("\n🎉 All app icons generated successfully!")
print("\nNext steps:")
print("1. Open Xcode")
print("2. Navigate to BoostT1D/Assets.xcassets/AppIcon")
print("3. Drag and drop the generated PNG files into the corresponding slots")
print("4. Build and run to see your new app icon!")



