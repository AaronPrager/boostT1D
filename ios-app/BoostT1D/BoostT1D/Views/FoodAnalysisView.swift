import SwiftUI

struct FoodAnalysisView: View {
    @StateObject private var apiService = APIService.shared
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingPhotoActionSheet = false
    @State private var isAnalyzing = false
    @State private var analysisResult: FoodAnalysis?
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.green)
                    }
                    .padding(.top, 20)
                    
                    // Image Selection
                    VStack(spacing: 16) {
                        if let selectedImage = selectedImage {
                            Image(uiImage: selectedImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxHeight: 300)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray, lineWidth: 1)
                                )
                        } else {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.systemGray5))
                                .frame(height: 200)
                                .overlay(
                                    VStack(spacing: 12) {
                                        Image(systemName: "camera")
                                            .font(.system(size: 40))
                                            .foregroundColor(.gray)
                                        
                                        Text("Tap to select a photo")
                                            .font(.headline)
                                            .foregroundColor(.gray)
                                    }
                                )
                        }
                        
                        Button(action: { showingPhotoActionSheet = true }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Select Photo")
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Analysis Button
                    if selectedImage != nil {
                        Button(action: analyzeFood) {
                            HStack {
                                if isAnalyzing {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "magnifyingglass")
                                }
                                
                                Text(isAnalyzing ? "Analyzing..." : "Analyze Food")
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(isAnalyzing ? Color.gray : Color.blue)
                            .cornerRadius(12)
                        }
                        .disabled(isAnalyzing)
                        .padding(.horizontal, 20)
                    }
                    
                    // Results
                    if let analysisResult = analysisResult {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Analysis Results")
                                .font(.headline)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Description:")
                                        .fontWeight(.medium)
                                    Spacer()
                                }
                                Text(analysisResult.description)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Text("Estimated Carbs:")
                                        .fontWeight(.medium)
                                    Spacer()
                                    Text("\(String(format: "%.1f", analysisResult.carbsGrams))g")
                                        .fontWeight(.bold)
                                        .foregroundColor(.blue)
                                }
                                
                                HStack {
                                    Text("Confidence:")
                                        .fontWeight(.medium)
                                    Spacer()
                                    Text(analysisResult.confidence)
                                        .fontWeight(.bold)
                                        .foregroundColor(confidenceColor(analysisResult.confidence))
                                }
                                
                                if !analysisResult.notes.isEmpty {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Notes:")
                                            .fontWeight(.medium)
                                        Text(analysisResult.notes)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    // Error Message
                    if let errorMessage = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 40))
                                .foregroundColor(.orange)
                            
                            Text("Analysis Failed")
                                .font(.headline)
                            
                            Text(errorMessage)
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button("Try Again") {
                                self.errorMessage = nil
                            }
                            .foregroundColor(.blue)
                        }
                        .padding()
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("Food Analysis")
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
        .sheet(isPresented: $showingCamera) {
            CameraView(selectedImage: $selectedImage)
        }
        .actionSheet(isPresented: $showingPhotoActionSheet) {
            ActionSheet(
                title: Text("Select Photo"),
                buttons: [
                    .default(Text("Camera")) {
                        showingCamera = true
                    },
                    .default(Text("Photo Library")) {
                        showingImagePicker = true
                    },
                    .cancel()
                ]
            )
        }
    }
    
    private func analyzeFood() {
        guard let image = selectedImage else { return }
        
        isAnalyzing = true
        errorMessage = nil
        analysisResult = nil
        
        apiService.analyzeFood(image: image) { result in
            DispatchQueue.main.async {
                isAnalyzing = false
                switch result {
                case .success(let analysis):
                    self.analysisResult = analysis
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func confidenceColor(_ confidence: String) -> Color {
        switch confidence.lowercased() {
        case "high":
            return .green
        case "medium":
            return .orange
        case "low":
            return .red
        default:
            return .gray
        }
    }
}

#Preview {
    FoodAnalysisView()
}
