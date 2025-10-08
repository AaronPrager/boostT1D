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
    @State private var age = 0
    @State private var yearsSinceDiagnosis = 0
    @State private var selectedImage: UIImage?
    
    // Nightscout editing states
    @State private var nightscoutUrl = ""
    @State private var nightscoutApiToken = ""
    @State private var isManualMode = false
    @State private var lowGlucose = 70.0
    @State private var highGlucose = 180.0
    
    // UI states
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingPhotoActionSheet = false
    @State private var isTestingConnection = false
    @State private var showingConnectionAlert = false
    @State private var connectionAlertMessage = ""
    @State private var showApiToken = false
    @State private var hasLoadedInitialValues = false
    @State private var showingDeleteAlert = false
    @State private var showingValidationAlert = false
    @State private var validationMessage = ""
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
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
                        // Photo
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Photo")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if isEditingProfile {
                                Button(action: {
                                    showingPhotoActionSheet = true
                                }) {
                                    HStack {
                                        if let photo = profileService.currentProfile?.photo {
                                            Image(uiImage: photo)
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: 60, height: 60)
                                                .clipShape(Circle())
                                        } else {
                                            Image(systemName: "person.circle.fill")
                                                .font(.system(size: 60))
                                                .foregroundColor(.gray)
                                        }
                                        
                                        Text("Tap to change photo")
                                            .foregroundColor(.blue)
                                        
                                        Spacer()
                                    }
                                }
                            } else {
                                HStack {
                                    if let photo = profileService.currentProfile?.photo {
                                        Image(uiImage: photo)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 60, height: 60)
                                            .clipShape(Circle())
                                    } else {
                                        Image(systemName: "person.circle.fill")
                                            .font(.system(size: 60))
                                            .foregroundColor(.gray)
                                    }
                                    
                                    Text(profileService.currentProfile?.photo != nil ? "Profile photo" : "No photo set")
                                        .font(.body)
                                        .foregroundColor(.primary)
                                    
                                    Spacer()
                                }
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
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
                        
                        // Age
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Age")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if isEditingProfile {
                                TextField("Enter your age", value: $age, format: .number)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.numberPad)
                                    .toolbar {
                                        ToolbarItemGroup(placement: .keyboard) {
                                            Spacer()
                                            Button("Done") {
                                                hideKeyboard()
                                            }
                                        }
                                    }
                            } else {
                                Text("\(profileService.currentProfile?.currentAge ?? 0) years old")
                                    .font(.body)
                                    .foregroundColor(.primary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        
                        // Years Since Diagnosis
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Years Since Diagnosis")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            
                            if isEditingProfile {
                                TextField("How many years have you had diabetes?", value: $yearsSinceDiagnosis, format: .number)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.numberPad)
                                    .toolbar {
                                        ToolbarItemGroup(placement: .keyboard) {
                                            Spacer()
                                            Button("Done") {
                                                hideKeyboard()
                                            }
                                        }
                                    }
                            } else {
                                Text("\(profileService.currentProfile?.yearsSinceDiagnosis ?? 0) years")
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
                                NavigationLink(destination: CountryPickerView(selectedCountry: $country)) {
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
                                    NavigationLink(destination: StatePickerView(selectedState: $state)) {
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
                                    HStack {
                                        if showApiToken {
                                            TextField("Enter your API token", text: $nightscoutApiToken)
                                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                        } else {
                                            SecureField("Enter your API token", text: $nightscoutApiToken)
                                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                        }
                                        
                                        Button(action: {
                                            showApiToken.toggle()
                                        }) {
                                            Image(systemName: showApiToken ? "eye.slash.fill" : "eye.fill")
                                                .foregroundColor(.blue)
                                                .font(.system(size: 16))
                                        }
                                        .buttonStyle(PlainButtonStyle())
                                    }
                                } else {
                                    HStack {
                                        Text(nightscoutService.settings.apiToken.isEmpty ? "Not configured" : (showApiToken ? nightscoutService.settings.apiToken : "••••••••"))
                                            .font(.body)
                                            .foregroundColor(.primary)
                                        
                                        if !nightscoutService.settings.apiToken.isEmpty {
                                            Button(action: {
                                                showApiToken.toggle()
                                            }) {
                                                Image(systemName: showApiToken ? "eye.slash.fill" : "eye.fill")
                                                    .foregroundColor(.blue)
                                                    .font(.system(size: 16))
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        }
                                        
                                        Spacer()
                                    }
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
                        
                        // Glucose Range Fields
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Glucose Range")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Low (mg/dL)")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    
                                    if isEditingNightscout {
                                        TextField("70", value: $lowGlucose, format: .number)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .font(.subheadline)
                                            .keyboardType(.numberPad)
                                    } else {
                                        Text("\(Int(nightscoutService.settings.lowGlucose))")
                                            .font(.body)
                                            .foregroundColor(.primary)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                                
                                VStack(alignment: .leading, spacing: 6) {
                                    Text("High (mg/dL)")
                                        .font(.caption)
                                        .fontWeight(.medium)
                                        .foregroundColor(.primary)
                                    
                                    if isEditingNightscout {
                                        TextField("180", value: $highGlucose, format: .number)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .font(.subheadline)
                                            .keyboardType(.numberPad)
                                    } else {
                                        Text("\(Int(nightscoutService.settings.highGlucose))")
                                            .font(.body)
                                            .foregroundColor(.primary)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                    }
                                }
                            }
                            
                            Text("Used for time-in-range calculations and statistics")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Delete Profile Section
                VStack(alignment: .leading, spacing: 16) {
                    Text("Account Management")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Button(action: {
                        showingDeleteAlert = true
                    }) {
                        HStack {
                            Image(systemName: "trash")
                                .foregroundColor(.red)
                            Text("Delete Profile")
                                .foregroundColor(.red)
                            Spacer()
                        }
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                Spacer(minLength: 40)
            }
        }
        .onAppear {
            // Only load values on first appearance
            if !hasLoadedInitialValues {
                loadCurrentValues()
                hasLoadedInitialValues = true
            }
        }
        .alert("Connection Test", isPresented: $showingConnectionAlert) {
            Button("OK") { }
        } message: {
            Text(connectionAlertMessage)
        }
        .alert("Delete Profile", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                deleteProfile()
            }
        } message: {
            Text("Are you sure you want to delete your profile? This action cannot be undone and you will be returned to the onboarding process.")
        }
        .alert("Invalid Information", isPresented: $showingValidationAlert) {
            Button("OK") { }
        } message: {
            Text(validationMessage)
        }
        .navigationTitle("Profile & Settings")
        .navigationBarItems(
            trailing: Group {
                if isEditingProfile {
                    HStack {
                        Button("Cancel") {
                            isEditingProfile = false
                            loadCurrentValues()
                        }
                        Button("Save") {
                            saveProfile()
                        }
                        .fontWeight(.semibold)
                    }
                } else if isEditingNightscout {
                    HStack {
                        Button("Cancel") {
                            isEditingNightscout = false
                            loadCurrentValues()
                        }
                        Button("Save") {
                            saveNightscoutSettings()
                        }
                        .fontWeight(.semibold)
                    }
                } else {
                    Button("Edit") {
                        startEditingProfile()
                    }
                }
            }
        )
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
        .actionSheet(isPresented: $showingPhotoActionSheet) {
            ActionSheet(
                title: Text("Select Photo"),
                message: Text("Choose an option to select your profile photo"),
                buttons: [
                    .default(Text("Take Photo")) { showingCamera = true },
                    .default(Text("Choose from Library")) { showingImagePicker = true },
                    .cancel()
                ]
            )
        }
        .fullScreenCover(isPresented: $showingCamera) {
            CameraView(selectedImage: $selectedImage)
        }
        .onTapGesture {
            hideKeyboard()
        }
    }
    
    private func loadCurrentValues() {
        if let profile = profileService.currentProfile {
            name = profile.name
            country = profile.country
            state = profile.state ?? ""
            age = profile.currentAge
            yearsSinceDiagnosis = profile.yearsSinceDiagnosis
            selectedImage = profile.photo
        }
        
        let settings = nightscoutService.settings
        nightscoutUrl = settings.url
        nightscoutApiToken = settings.apiToken
        isManualMode = settings.isManualMode
        lowGlucose = settings.lowGlucose
        highGlucose = settings.highGlucose
    }
    
    private func startEditingProfile() {
        isEditingProfile = true
        loadCurrentValues()
    }
    
    private func saveProfile() {
        // Validate age
        if age <= 13 {
            validationMessage = "You must be at least 14 years old to use this app."
            showingValidationAlert = true
            return
        }
        
        // Validate years since diagnosis is not more than age
        if yearsSinceDiagnosis > age {
            validationMessage = "Years with diabetes cannot be more than your age. Please check your information."
            showingValidationAlert = true
            return
        }
        
        // Convert age to date of birth
        let calendar = Calendar.current
        let currentDate = Date()
        let birthYear = calendar.component(.year, from: currentDate) - age
        var dateComponents = DateComponents()
        dateComponents.year = birthYear
        dateComponents.month = 1
        dateComponents.day = 1
        let dateOfBirth = calendar.date(from: dateComponents) ?? currentDate
        
        // Convert years since diagnosis to date of diagnosis
        let diagnosisYear = calendar.component(.year, from: currentDate) - yearsSinceDiagnosis
        var diagnosisComponents = DateComponents()
        diagnosisComponents.year = diagnosisYear
        diagnosisComponents.month = 1
        diagnosisComponents.day = 1
        let dateOfDiagnosis = calendar.date(from: diagnosisComponents) ?? currentDate
        
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
        // Validate low glucose range (60-110)
        if lowGlucose < 60 || lowGlucose > 110 {
            validationMessage = "Low glucose must be between 60 and 110 mg/dL."
            showingValidationAlert = true
            return
        }
        
        // Validate high glucose range (110-200)
        if highGlucose < 110 || highGlucose > 200 {
            validationMessage = "High glucose must be between 110 and 200 mg/dL."
            showingValidationAlert = true
            return
        }
        
        // Validate low is less than high
        if lowGlucose >= highGlucose {
            validationMessage = "Low glucose must be less than high glucose."
            showingValidationAlert = true
            return
        }
        
        // If validation passes, save settings
        nightscoutService.saveSettings(url: nightscoutUrl, token: nightscoutApiToken, isManualMode: isManualMode, lowGlucose: lowGlucose, highGlucose: highGlucose)
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
    
    private func deleteProfile() {
        // Clear the profile data
        profileService.resetProfile()
        
        // Clear Nightscout settings
        nightscoutService.saveSettings(url: "", token: "", isManualMode: true)
        
        // Reset all editing states
        isEditingProfile = false
        isEditingNightscout = false
        hasLoadedInitialValues = false
        
        // The ContentView will automatically detect that isProfileComplete is false
        // and show the onboarding flow instead of the main app
    }
    
    private func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

#Preview {
    ProfileView()
}
