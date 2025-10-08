import SwiftUI

struct PhotoOnboardingView: View {
    @Binding var selectedImage: UIImage?
    @Binding var showingImagePicker: Bool
    @Binding var showingCamera: Bool
    @Binding var showingPhotoActionSheet: Bool
    
    let onNext: () -> Void
    let onBack: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)
                
                VStack(spacing: 6) {
                    Text("Add a photo")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("This helps personalize your experience")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Photo Section
            VStack(spacing: 18) {
                ZStack {
                    if let selectedImage = selectedImage {
                        Image(uiImage: selectedImage)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 200, height: 200)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.blue, lineWidth: 4))
                    } else {
                        Circle()
                            .fill(Color(.systemGray5))
                            .frame(width: 200, height: 200)
                            .overlay(
                                VStack(spacing: 8) {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray)
                                    
                                    Text("Tap to add photo")
                                        .font(.subheadline)
                                        .foregroundColor(.gray)
                                }
                            )
                    }
                    
                    // Edit Icon
                    if selectedImage != nil {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 32, height: 32)
                            .overlay(
                                Image(systemName: "pencil")
                                    .font(.system(size: 16, weight: .medium))
                                    .foregroundColor(.white)
                            )
                            .offset(x: 60, y: 60)
                    }
                }
                .onTapGesture {
                    showingPhotoActionSheet = true
                }
                
                VStack(spacing: 6) {
                    Text("Optional")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    Text("You can always add or change your photo later")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Navigation Buttons
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    // Back Button
                    Button(action: onBack) {
                        HStack {
                            Image(systemName: "arrow.left")
                                .font(.subheadline)
                            
                            Text("Back")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                    
                    // Next Button
                    Button(action: onNext) {
                        HStack {
                            Text("Continue")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "arrow.right")
                                .font(.subheadline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(Color.blue)
                        .cornerRadius(8)
                    }
                }
                
                Text("Step 2 of 4")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 30)
        }
    }
}

#Preview {
    PhotoOnboardingView(
        selectedImage: .constant(nil),
        showingImagePicker: .constant(false),
        showingCamera: .constant(false),
        showingPhotoActionSheet: .constant(false),
        onNext: {},
        onBack: {}
    )
}
