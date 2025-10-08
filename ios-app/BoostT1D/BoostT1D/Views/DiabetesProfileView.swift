import SwiftUI

struct DiabetesProfileView: View {
    @StateObject private var diabetesProfileService = DiabetesProfileService.shared
    @State private var profile: DiabetesProfile?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.green)
                }
                .padding(.top, 20)
                
                // Content
                if isLoading {
                    ProgressView("Loading diabetes profile...")
                        .padding()
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Profile")
                            .font(.headline)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Retry") {
                            loadProfile()
                        }
                        .foregroundColor(.blue)
                    }
                    .padding()
                } else if let profile = profile {
                    VStack(spacing: 16) {
                        // Detailed Profile Data
                        if let store = profile.store, let defaultProfileName = profile.defaultProfile,
                           let profileData = store[defaultProfileName] {
                            
                            // Basal Rates
                            if let basal = profileData.basal, !basal.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Basal Rates")
                                        .font(.headline)
                                    
                                    ForEach(basal, id: \.time) { rate in
                                        HStack {
                                            Text(rate.time)
                                                .font(.subheadline)
                                                .foregroundColor(.secondary)
                                            Spacer()
                                            Text(String(format: "%.2f U/hr", rate.value))
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Carb Ratios
                            if let carbRatio = profileData.carb_ratio ?? profileData.carbratio, !carbRatio.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Carb Ratios")
                                        .font(.headline)
                                    
                                    ForEach(carbRatio, id: \.time) { ratio in
                                        HStack {
                                            Text(ratio.time)
                                                .font(.subheadline)
                                                .foregroundColor(.secondary)
                                            Spacer()
                                            Text(String(format: "1:%.0f", ratio.value))
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Insulin Sensitivity Factors
                            if let sensitivity = profileData.sensitivity ?? profileData.sens, !sensitivity.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Insulin Sensitivity Factors")
                                        .font(.headline)
                                    
                                    ForEach(sensitivity, id: \.time) { sens in
                                        HStack {
                                            Text(sens.time)
                                                .font(.subheadline)
                                                .foregroundColor(.secondary)
                                            Spacer()
                                            Text(String(format: "%.0f mg/dl per U", sens.value))
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Target Ranges
                            if let targetLow = profileData.target_low, let targetHigh = profileData.target_high,
                               !targetLow.isEmpty && !targetHigh.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Target Ranges")
                                        .font(.headline)
                                    
                                    ForEach(Array(zip(targetLow, targetHigh)), id: \.0.time) { (low, high) in
                                        HStack {
                                            Text(low.time)
                                                .font(.subheadline)
                                                .foregroundColor(.secondary)
                                            Spacer()
                                            Text(String(format: "%.0f - %.0f mg/dl", low.value, high.value))
                                                .font(.subheadline)
                                                .fontWeight(.medium)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // DIA (Duration of Insulin Action)
                            if let dia = profileData.dia {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Duration of Insulin Action")
                                        .font(.headline)
                                    
                                    HStack {
                                        Text("DIA")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        Spacer()
                                        Text(String(format: "%.1f hours", dia))
                                            .font(.subheadline)
                                            .fontWeight(.medium)
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Override Presets
                            if let overrides = profile.overridePresets, !overrides.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Override Presets")
                                        .font(.headline)
                                    
                                    ForEach(overrides, id: \.name) { preset in
                                        VStack(alignment: .leading, spacing: 4) {
                                            HStack {
                                                Text(preset.name ?? "Unknown")
                                                    .font(.subheadline)
                                                    .fontWeight(.medium)
                                                Spacer()
                                                if let target = preset.target {
                                                    Text("Target: \(target)")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                            }
                                            
                                            HStack {
                                                if let percentage = preset.percentage {
                                                    Text("\(percentage)%")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                                if let duration = preset.duration {
                                                    Text("\(duration) min")
                                                        .font(.caption)
                                                        .foregroundColor(.secondary)
                                                }
                                                Spacer()
                                            }
                                        }
                                        .padding(8)
                                        .background(Color(.systemBackground))
                                        .cornerRadius(8)
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Notes
                            if let notes = profileData.notes, !notes.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    Text("Notes")
                                        .font(.headline)
                                    
                                    Text(notes)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                        }
                    }
                    .padding(.horizontal, 20)
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "person.circle")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        
                        Text("No Profile Data")
                            .font(.headline)
                        
                        Text("No diabetes profile data found. Make sure your Nightscout is configured correctly.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Diabetes Profile")
        .navigationBarItems(
            leading: AppIconView(size: 24),
            trailing: HStack(spacing: 12) {
                Button(action: {
                    loadProfile()
                }) {
                    Image(systemName: "arrow.clockwise")
                        .foregroundColor(.blue)
                }
                
                NavigationLink(destination: ProfileView()) {
                    Group {
                        if let photo = UserProfileService.shared.currentProfile?.photo {
                            Image(uiImage: photo)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 32, height: 32)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(Color.white, lineWidth: 2)
                                )
                        } else {
                            Image(systemName: "person.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        )
        .onAppear {
            loadProfile()
        }
    }
    
    private func loadProfile() {
        isLoading = true
        errorMessage = nil
        
        diabetesProfileService.fetchProfile { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let fetchedProfile):
                    self.profile = fetchedProfile
                case .failure(let error):
                    print("Diabetes Profile Error: \(error)")
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
}

struct ProfileInfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

struct ProfileDataCard: View {
    let name: String
    let data: ProfileData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(name)
                .font(.subheadline)
                .fontWeight(.semibold)
            
            if let timezone = data.timezone {
                ProfileInfoRow(title: "Timezone", value: timezone)
            }
            
            if let units = data.units {
                ProfileInfoRow(title: "Units", value: units)
            }
            
            if let dia = data.dia {
                ProfileInfoRow(title: "DIA", value: String(format: "%.1f hours", dia))
            }
            
            if let notes = data.notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.primary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

#Preview {
    DiabetesProfileView()
}
