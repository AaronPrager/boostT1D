import SwiftUI

struct ProfileView: View {
    @StateObject private var profileService = UserProfileService.shared
    @StateObject private var nightscoutService = NightscoutService.shared
    @State private var isEditingProfile = false
    @State private var isEditingNightscout = false
    
    // Profile editing states
    @State private var name = ""
    @State private var country = ""
    @State private var state = ""
    @State private var dateOfBirth = Date()
    @State private var dateOfDiagnosis = Date()
    @State private var selectedImage: UIImage?
    
    // Nightscout editing states
    @State private var nightscoutUrl = ""
    @State private var nightscoutApiToken = ""
    @State private var isManualMode = false
    
    // UI states
    @State private var showingCountryPicker = false
    @State private var showingStatePicker = false
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingPhotoActionSheet = false
    @State private var isTestingConnection = false
    @State private var showingConnectionAlert = false
    @State private var connectionAlertMessage = ""
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("Profile & Settings")
                        .font(.title)
                        .fontWeight(.semibold)
                }
                .padding(.top, 20)
                
                // Personal Information Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Personal Information")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(isEditingProfile ? "Save" : "Edit") {
                            if isEditingProfile {
                                saveProfile()
                            } else {
                                startEditingProfile()
                            }
                        }
                        .foregroundColor(.blue)
                    }
                    
                    VStack(spacing: 16) {
                        // Name
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Name")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if isEditingProfile {
                                TextField("Enter your name", text: $name)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                            } else {
                                Text(profileService.currentProfile?.name ?? "Not set")
                                    .font(.body)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        // Country
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Country")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if isEditingProfile {
                                Button(action: { showingCountryPicker = true }) {
                                    HStack {
                                        Text(country.isEmpty ? "Select Country" : country)
                                            .foregroundColor(country.isEmpty ? .secondary : .primary)
                                        Spacer()
                                        Image(systemName: "chevron.right")
                                            .foregroundColor(.secondary)
                                    }
                                    .padding()
                                    .background(Color(.systemGray6))
                                    .cornerRadius(8)
                                }
                            } else {
                                Text(profileService.currentProfile?.country ?? "Not set")
                                    .font(.body)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        // State (if USA)
                        if country == "United States" || profileService.currentProfile?.country == "United States" {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("State")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                if isEditingProfile {
                                    Button(action: { showingStatePicker = true }) {
                                        HStack {
                                            Text(state.isEmpty ? "Select State" : state)
                                                .foregroundColor(state.isEmpty ? .secondary : .primary)
                                            Spacer()
                                            Image(systemName: "chevron.right")
                                                .foregroundColor(.secondary)
                                        }
                                        .padding()
                                        .background(Color(.systemGray6))
                                        .cornerRadius(8)
                                    }
                                } else {
                                    Text(profileService.currentProfile?.state ?? "Not set")
                                        .font(.body)
                                        .foregroundColor(.primary)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Nightscout Integration Section
                VStack(alignment: .leading, spacing: 16) {
                    HStack {
                        Text("Nightscout Integration")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Button(isEditingNightscout ? "Save" : "Edit") {
                            if isEditingNightscout {
                                saveNightscoutSettings()
                            } else {
                                startEditingNightscout()
                            }
                        }
                        .foregroundColor(.blue)
                    }
                    
                    VStack(spacing: 16) {
                        // Manual Mode Toggle
                        HStack {
                            Text("Manual Mode")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                            
                            Spacer()
                            
                            Toggle("", isOn: $isManualMode)
                                .toggleStyle(SwitchToggleStyle())
                        }
                        
                        if !isManualMode {
                            // URL
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Nightscout URL")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                if isEditingNightscout {
                                    TextField("https://your-nightscout.herokuapp.com", text: $nightscoutUrl)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .foregroundColor(nightscoutUrl.isEmpty ? .secondary : .primary)
                                } else {
                                    Text(nightscoutService.settings.url.isEmpty ? "Not configured" : nightscoutService.settings.url)
                                        .font(.body)
                                        .foregroundColor(.primary)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            // API Token
                            VStack(alignment: .leading, spacing: 8) {
                                Text("API Token")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                
                                if isEditingNightscout {
                                    SecureField("Enter your API token", text: $nightscoutApiToken)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                } else {
                                    Text(nightscoutService.settings.apiToken.isEmpty ? "Not configured" : "••••••••")
                                        .font(.body)
                                        .foregroundColor(.primary)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            
                            // Test Connection Button
                            if isEditingNightscout {
                                Button(action: testConnection) {
                                    HStack {
                                        if isTestingConnection {
                                            ProgressView()
                                                .scaleEffect(0.8)
                                        } else {
                                            Image(systemName: "wifi")
                                        }
                                        Text(isTestingConnection ? "Testing..." : "Test Connection")
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(canTestConnection ? Color.blue : Color.gray)
                                    .cornerRadius(8)
                                }
                                .disabled(!canTestConnection || isTestingConnection)
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Profile")
        .onAppear {
            loadCurrentValues()
        }
        .sheet(isPresented: $showingCountryPicker) {
            CountryPickerView(selectedCountry: $country)
        }
        .sheet(isPresented: $showingStatePicker) {
            StatePickerView(selectedState: $state)
        }
        .alert("Connection Test", isPresented: $showingConnectionAlert) {
            Button("OK") { }
        } message: {
            Text(connectionAlertMessage)
        }
    }
    
    private func loadCurrentValues() {
        if let profile = profileService.currentProfile {
            name = profile.name
            country = profile.country
            state = profile.state ?? ""
            dateOfBirth = profile.dateOfBirth
            dateOfDiagnosis = profile.dateOfDiagnosis
            selectedImage = profile.photo
        }
        
        let settings = nightscoutService.settings
        nightscoutUrl = settings.url
        nightscoutApiToken = settings.apiToken
        isManualMode = settings.isManualMode
    }
    
    private func startEditingProfile() {
        isEditingProfile = true
        loadCurrentValues()
    }
    
    private func saveProfile() {
        profileService.updateProfile(
            name: name,
            photo: selectedImage,
            country: country,
            dateOfBirth: dateOfBirth,
            dateOfDiagnosis: dateOfDiagnosis,
            state: country == "United States" ? state : nil
        )
        isEditingProfile = false
    }
    
    private func startEditingNightscout() {
        isEditingNightscout = true
        loadCurrentValues()
    }
    
    private func saveNightscoutSettings() {
        nightscoutService.saveSettings(url: nightscoutUrl, token: nightscoutApiToken, isManualMode: isManualMode)
        isEditingNightscout = false
    }
    
    private var canTestConnection: Bool {
        !nightscoutUrl.isEmpty && !nightscoutApiToken.isEmpty
    }
    
    private func testConnection() {
        guard canTestConnection else { return }
        
        isTestingConnection = true
        
        nightscoutService.testConnection(url: nightscoutUrl, token: nightscoutApiToken) { success, message in
            DispatchQueue.main.async {
                isTestingConnection = false
                connectionAlertMessage = message
                showingConnectionAlert = true
            }
        }
    }
}

#Preview {
    ProfileView()
}
