#!/bin/bash

# Icon generation script for BoostT1D
# Requires a 1024x1024 source image named "icon-1024.png"

SOURCE_ICON="icon-1024.png"
IOS_DIR="ios-app/BoostT1D/BoostT1D/Assets.xcassets/AppIcon.appiconset"
WEB_DIR="public"

# Check if source icon exists
if [ ! -f "$SOURCE_ICON" ]; then
    echo "Error: Source icon '$SOURCE_ICON' not found!"
    echo "Please place your 1024x1024 icon in the project root and name it 'icon-1024.png'"
    exit 1
fi

echo "Generating iOS icons..."

# iOS App Icon sizes (based on Contents.json)
# 20x20 @2x = 40x40
sips -z 40 40 "$SOURCE_ICON" --out "$IOS_DIR/icon-20@2x.png"

# 20x20 @3x = 60x60
sips -z 60 60 "$SOURCE_ICON" --out "$IOS_DIR/icon-20@3x.png"

# 29x29 @2x = 58x58
sips -z 58 58 "$SOURCE_ICON" --out "$IOS_DIR/icon-29@2x.png"

# 29x29 @3x = 87x87
sips -z 87 87 "$SOURCE_ICON" --out "$IOS_DIR/icon-29@3x.png"

# 38x38 @2x = 76x76
sips -z 76 76 "$SOURCE_ICON" --out "$IOS_DIR/icon-38@2x.png"

# 38x38 @3x = 114x114
sips -z 114 114 "$SOURCE_ICON" --out "$IOS_DIR/icon-38@3x.png"

# 40x40 @2x = 80x80
sips -z 80 80 "$SOURCE_ICON" --out "$IOS_DIR/icon-40@2x.png"

# 40x40 @3x = 120x120
sips -z 120 120 "$SOURCE_ICON" --out "$IOS_DIR/icon-40@3x.png"

# 60x60 @2x = 120x120 (already created above)
cp "$IOS_DIR/icon-40@3x.png" "$IOS_DIR/icon-60@2x.png"

# 60x60 @3x = 180x180
sips -z 180 180 "$SOURCE_ICON" --out "$IOS_DIR/icon-60@3x.png"

# 64x64 @2x = 128x128
sips -z 128 128 "$SOURCE_ICON" --out "$IOS_DIR/icon-64@2x.png"

# 64x64 @3x = 192x192
sips -z 192 192 "$SOURCE_ICON" --out "$IOS_DIR/icon-64@3x.png"

# 68x68 @2x = 136x136
sips -z 136 136 "$SOURCE_ICON" --out "$IOS_DIR/icon-68@2x.png"

# 76x76 @2x = 152x152
sips -z 152 152 "$SOURCE_ICON" --out "$IOS_DIR/icon-76@2x.png"

# 83.5x83.5 @2x = 167x167
sips -z 167 167 "$SOURCE_ICON" --out "$IOS_DIR/icon-83.5@2x.png"

# 1024x1024 (App Store)
cp "$SOURCE_ICON" "$IOS_DIR/BoostT1D.png"

echo "Generating web app icons..."

# Create public directory if it doesn't exist
mkdir -p "$WEB_DIR"

# Web app icons
# 16x16 favicon
sips -z 16 16 "$SOURCE_ICON" --out "$WEB_DIR/favicon-16x16.png"

# 32x32 favicon
sips -z 32 32 "$SOURCE_ICON" --out "$WEB_DIR/favicon-32x32.png"

# 48x48 favicon
sips -z 48 48 "$SOURCE_ICON" --out "$WEB_DIR/favicon-48x48.png"

# 64x64 favicon
sips -z 64 64 "$SOURCE_ICON" --out "$WEB_DIR/favicon-64x64.png"

# 96x96 favicon
sips -z 96 96 "$SOURCE_ICON" --out "$WEB_DIR/favicon-96x96.png"

# 128x128 favicon
sips -z 128 128 "$SOURCE_ICON" --out "$WEB_DIR/favicon-128x128.png"

# 192x192 PWA icon
sips -z 192 192 "$SOURCE_ICON" --out "$WEB_DIR/icon-192x192.png"

# 512x512 PWA icon
sips -z 512 512 "$SOURCE_ICON" --out "$WEB_DIR/icon-512x512.png"

# Apple touch icons
# 57x57
sips -z 57 57 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-57x57.png"

# 60x60
sips -z 60 60 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-60x60.png"

# 72x72
sips -z 72 72 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-72x72.png"

# 76x76
sips -z 76 76 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-76x76.png"

# 114x114
sips -z 114 114 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-114x114.png"

# 120x120
sips -z 120 120 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-120x120.png"

# 144x144
sips -z 144 144 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-144x144.png"

# 152x152
sips -z 152 152 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-152x152.png"

# 180x180
sips -z 180 180 "$SOURCE_ICON" --out "$WEB_DIR/apple-touch-icon-180x180.png"

# Default apple-touch-icon (180x180)
cp "$WEB_DIR/apple-touch-icon-180x180.png" "$WEB_DIR/apple-touch-icon.png"

# Generate ICO file (favicon.ico) - this requires ImageMagick or similar
# For now, we'll use the 32x32 PNG as favicon
cp "$WEB_DIR/favicon-32x32.png" "$WEB_DIR/favicon.ico"

echo "✅ Icon generation complete!"
echo ""
echo "Generated files:"
echo "📱 iOS icons: $IOS_DIR/"
echo "🌐 Web icons: $WEB_DIR/"
echo ""
echo "Next steps:"
echo "1. Update Contents.json to reference the new icon files"
echo "2. Update your web app's manifest.json and HTML meta tags"
echo "3. Test the icons on different devices and platforms"
