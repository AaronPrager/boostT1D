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
            VStack(spacing: 20) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                VStack(spacing: 8) {
                    Text("Add a photo")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("This helps personalize your experience")
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 60)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Photo Section
            VStack(spacing: 24) {
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
                                VStack(spacing: 12) {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 60))
                                        .foregroundColor(.gray)
                                    
                                    Text("Tap to add photo")
                                        .font(.headline)
                                        .foregroundColor(.gray)
                                }
                            )
                    }
                    
                    // Edit Icon
                    if selectedImage != nil {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 40, height: 40)
                            .overlay(
                                Image(systemName: "pencil")
                                    .font(.system(size: 20, weight: .medium))
                                    .foregroundColor(.white)
                            )
                            .offset(x: 70, y: 70)
                    }
                }
                .onTapGesture {
                    showingPhotoActionSheet = true
                }
                
                VStack(spacing: 8) {
                    Text("Optional")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text("You can always add or change your photo later")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Navigation Buttons
            VStack(spacing: 16) {
                HStack(spacing: 16) {
                    // Back Button
                    Button(action: onBack) {
                        HStack {
                            Image(systemName: "arrow.left")
                                .font(.headline)
                            
                            Text("Back")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        .foregroundColor(.blue)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                    }
                    
                    // Next Button
                    Button(action: onNext) {
                        HStack {
                            Text("Continue")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "arrow.right")
                                .font(.headline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(Color.blue)
                        .cornerRadius(12)
                    }
                }
                
                Text("Step 2 of 4")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
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
