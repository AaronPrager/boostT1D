import SwiftUI

struct AppIconView: View {
    let size: CGFloat
    
    init(size: CGFloat = 100) {
        self.size = size
    }
    
    var body: some View {
        Image("AppIconImage")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
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