import SwiftUI

struct DiabetesProfileView: View {
    @StateObject private var diabetesProfileService = DiabetesProfileService.shared
    @StateObject private var nightscoutService = NightscoutService.shared
    @State private var profile: DiabetesProfile?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showManualModeWarning = false
    @State private var showingManualEntry = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 30))
                        .foregroundColor(.blue)
                }
                .padding(.top, 20)
                
                // Manual Mode Warning Banner (only show if no profile exists)
                if nightscoutService.settings.isManualMode && !showManualModeWarning && profile == nil {
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.title2)
                                .foregroundColor(.orange)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Manual Mode Active")
                                    .font(.headline)
                                    .foregroundColor(.orange)
                                
                                Text("You're in manual mode. Your diabetes profile will be stored locally on this device only.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                        }
                        
                        HStack(spacing: 12) {
                            NavigationLink(destination: ProfileView()) {
                                Text("Configure Nightscout")
                                    .font(.caption)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(Color.blue)
                                    .cornerRadius(6)
                            }
                            
                            Button("Continue in Manual Mode") {
                                showManualModeWarning = true
                            }
                            .font(.caption)
                            .foregroundColor(.blue)
                        }
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                // Edit Profile Banner (show if profile exists in manual mode)
                if nightscoutService.settings.isManualMode && profile != nil {
                    VStack(spacing: 12) {
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle.fill")
                                .font(.title2)
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Manual Mode")
                                    .font(.headline)
                                    .foregroundColor(.blue)
                                
                                Text("Your profile is stored locally on this device.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            Button(action: {
                                showingManualEntry = true
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "square.and.pencil")
                                    Text("Edit Profile")
                                }
                                .font(.caption)
                                .foregroundColor(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.blue)
                                .cornerRadius(6)
                            }
                        }
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }
                
                // Content
                if isLoading {
                    ProgressView("Loading diabetes profile...")
                        .padding()
                } else if let errorMessage = errorMessage, !nightscoutService.settings.isManualMode {
                    // Only show error message if NOT in manual mode
                    VStack(spacing: 12) {
                        if !isNightscoutConfigured() {
                            // Nightscout not configured - show helpful suggestion
                            Image(systemName: "link.circle")
                                .font(.system(size: 40))
                                .foregroundColor(.blue)
                            
                            Text("Connect to Nightscout")
                                .font(.headline)
                            
                            Text("To sync your diabetes profile from Nightscout, you need to connect to your Nightscout server. This will allow you to automatically sync your basal rates, carb ratios, and other diabetes settings.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            NavigationLink(destination: ProfileView()) {
                                Text("Configure Nightscout")
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(Color.blue)
                                    .cornerRadius(8)
                            }
                        } else {
                            // Nightscout configured but error occurred
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
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.basalRatesTitle,
                                        description: ProfileFieldLabels.basalRatesDescription
                                    )
                                    
                                    ForEach(basal, id: \.time) { rate in
                                        ProfileFieldRow(
                                            title: rate.time,
                                            value: String(format: "%.2f", rate.value),
                                            units: ProfileFieldLabels.basalRatesUnits
                                        )
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Carb Ratios
                            if let carbRatio = profileData.carb_ratio ?? profileData.carbratio, !carbRatio.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.carbRatioTitle,
                                        description: ProfileFieldLabels.carbRatioDescription
                                    )
                                    
                                    ForEach(carbRatio, id: \.time) { ratio in
                                        ProfileFieldRow(
                                            title: ratio.time,
                                            value: String(format: ProfileFieldLabels.carbRatioFormat, ratio.value)
                                        )
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Insulin Sensitivity Factors
                            if let sensitivity = profileData.sensitivity ?? profileData.sens, !sensitivity.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.isfTitle,
                                        description: ProfileFieldLabels.isfDescription
                                    )
                                    
                                    ForEach(sensitivity, id: \.time) { sens in
                                        ProfileFieldRow(
                                            title: sens.time,
                                            value: String(format: "%.0f", sens.value)
                                        )
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
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.targetRangeTitle,
                                        description: ProfileFieldLabels.targetRangeDescription
                                    )
                                    
                                    ForEach(Array(zip(targetLow, targetHigh)), id: \.0.time) { (low, high) in
                                        ProfileFieldRow(
                                            title: low.time,
                                            value: String(format: ProfileFieldLabels.targetRangeFormat, low.value, high.value)
                                        )
                                    }
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // DIA (Duration of Insulin Action)
                            if let dia = profileData.dia {
                                VStack(alignment: .leading, spacing: 12) {
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.diaTitle,
                                        description: ProfileFieldLabels.diaDescription
                                    )
                                    
                                    ProfileFieldRow(
                                        title: "DIA",
                                        value: String(format: "%.1f", dia)
                                    )
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                            
                            // Override Presets
                            if let overrides = profile.overridePresets, !overrides.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.overridePresetsTitle,
                                        description: ProfileFieldLabels.overridePresetsDescription
                                    )
                                    
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
                                    ProfileSectionHeader(
                                        title: ProfileFieldLabels.notesTitle,
                                        description: ProfileFieldLabels.notesDescription
                                    )
                                    
                                    Text(notes)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }
                                .padding(16)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                            }
                        }
                        
                        // Edit Profile Button
                        Button(action: {
                            showingManualEntry = true
                        }) {
                            HStack {
                                Image(systemName: "square.and.pencil")
                                Text("Edit Profile")
                            }
                            .font(.headline)
                            .foregroundColor(.white)
                            .padding(.horizontal, 24)
                            .padding(.vertical, 12)
                            .background(Color.blue)
                            .cornerRadius(10)
                        }
                        .padding(.top, 20)
                    }
                    .padding(.horizontal, 20)
                } else {
                    VStack(spacing: 20) {
                        Image(systemName: "person.circle")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        
                        if nightscoutService.settings.isManualMode {
                            Text("No Profile Data")
                                .font(.headline)
                            
                            Text("You can enter your diabetes profile settings manually.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button(action: {
                                showingManualEntry = true
                            }) {
                                HStack {
                                    Image(systemName: "square.and.pencil")
                                    Text("Enter Profile Data")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(Color.blue)
                                .cornerRadius(10)
                            }
                            .padding(.top, 8)
                        } else {
                            Text("No Profile Data")
                                .font(.headline)
                            
                            Text("No diabetes profile data found. Make sure your Nightscout is configured correctly.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding()
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Diabetes Profile")
        .navigationBarItems(trailing: Button(action: {
            loadProfile()
        }) {
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.blue)
        })
        .sheet(isPresented: $showingManualEntry) {
            ManualProfileEntryView()
        }
        .onChange(of: showingManualEntry) { isShowing in
            if !isShowing {
                // Refresh profile when sheet is dismissed
                loadProfile()
            }
        }
        .onAppear {
            loadProfile()
        }
        .onChange(of: diabetesProfileService.localProfile) { _ in
            // Reload profile when local profile changes
            if nightscoutService.settings.isManualMode {
                loadProfile()
            }
        }
    }
    
    private func loadProfile() {
        // Check if in manual mode
        if nightscoutService.settings.isManualMode {
            // Load local profile
            profile = diabetesProfileService.getLocalProfile()
            
            // If no local profile exists, allow user to continue anyway
            // The "No Profile Data" message will show with option to configure Nightscout
            if profile == nil {
                errorMessage = "No local profile found"
            }
            return
        }
        
        // Otherwise, fetch from Nightscout
        isLoading = true
        errorMessage = nil
        
        diabetesProfileService.fetchProfile { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let fetchedProfile):
                    self.profile = fetchedProfile
                    // Also save to local storage as backup
                    self.diabetesProfileService.saveLocalProfile(fetchedProfile)
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func isNightscoutConfigured() -> Bool {
        let settings = NightscoutService.shared.getSettings()
        return !settings.url.isEmpty && !settings.apiToken.isEmpty
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
