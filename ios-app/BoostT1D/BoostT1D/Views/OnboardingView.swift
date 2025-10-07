import SwiftUI

struct OnboardingView: View {
    @StateObject private var profileService = UserProfileService.shared
    @State private var currentStep = 0
    @State private var showingMainApp = false
    
    // Step 1 data
    @State private var name = ""
    @State private var age = ""
    @State private var gender = ""
    @State private var yearsSinceDiagnosis = ""
    
    // Step 2 data
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingPhotoActionSheet = false
    
    // Step 3 data
    @State private var country = ""
    @State private var state = ""
    @State private var showingCountryPicker = false
    @State private var showingStatePicker = false
    
    // Step 4 data
    @State private var nightscoutUrl = ""
    @State private var nightscoutApiToken = ""
    @State private var isManualMode = false
    @State private var isTestingConnection = false
    @State private var showingConnectionAlert = false
    @State private var connectionAlertMessage = ""
    
    private let totalSteps = 4
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Progress Bar
                ProgressView(value: Double(currentStep + 1), total: Double(totalSteps))
                    .progressViewStyle(LinearProgressViewStyle(tint: .blue))
                    .padding(.horizontal, 20)
                    .padding(.top, 10)
                
                // Step Content
                TabView(selection: $currentStep) {
                    // Step 1: Basic Info
                    BasicInfoOnboardingView(
                        name: $name,
                        age: $age,
                        gender: $gender,
                        yearsSinceDiagnosis: $yearsSinceDiagnosis,
                        onNext: { currentStep = 1 }
                    )
                    .tag(0)
                    
                    // Step 2: Photo
                    PhotoOnboardingView(
                        selectedImage: $selectedImage,
                        showingImagePicker: $showingImagePicker,
                        showingCamera: $showingCamera,
                        showingPhotoActionSheet: $showingPhotoActionSheet,
                        onNext: { currentStep = 2 },
                        onBack: { currentStep = 0 }
                    )
                    .tag(1)
                    
                    // Step 3: Location
                    LocationOnboardingView(
                        country: $country,
                        state: $state,
                        showingCountryPicker: $showingCountryPicker,
                        showingStatePicker: $showingStatePicker,
                        onNext: { currentStep = 3 },
                        onBack: { currentStep = 1 }
                    )
                    .tag(2)
                    
                    // Step 4: Nightscout
                    NightscoutOnboardingView(
                        nightscoutUrl: $nightscoutUrl,
                        nightscoutApiToken: $nightscoutApiToken,
                        isManualMode: $isManualMode,
                        isTestingConnection: $isTestingConnection,
                        showingConnectionAlert: $showingConnectionAlert,
                        connectionAlertMessage: $connectionAlertMessage,
                        onComplete: completeOnboarding,
                        onBack: { currentStep = 2 }
                    )
                    .tag(3)
                }
                .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                .animation(.easeInOut, value: currentStep)
            }
            .navigationBarHidden(true)
        }
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
        .sheet(isPresented: $showingCamera) {
            CameraView(selectedImage: $selectedImage)
        }
        .sheet(isPresented: $showingCountryPicker) {
            CountryPickerView(selectedCountry: $country)
        }
        .sheet(isPresented: $showingStatePicker) {
            StatePickerView(selectedState: $state)
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
        .alert("Connection Test", isPresented: $showingConnectionAlert) {
            Button("OK") { }
        } message: {
            Text(connectionAlertMessage)
        }
        .fullScreenCover(isPresented: $showingMainApp) {
            WelcomeView()
        }
    }
    
    private func completeOnboarding() {
        // Calculate dates from age and years since diagnosis
        let calendar = Calendar.current
        let currentDate = Date()
        
        // Calculate date of birth from age
        let birthYear = calendar.component(.year, from: currentDate) - (Int(age) ?? 0)
        let dateOfBirth = calendar.date(from: DateComponents(year: birthYear, month: 1, day: 1)) ?? currentDate
        
        // Calculate date of diagnosis from years since diagnosis
        let diagnosisYear = calendar.component(.year, from: currentDate) - getYearsSinceDiagnosisValue()
        let dateOfDiagnosis = calendar.date(from: DateComponents(year: diagnosisYear, month: 1, day: 1)) ?? currentDate
        
        // Save personal profile
        profileService.updateProfile(
            name: name,
            photo: selectedImage,
            country: country,
            dateOfBirth: dateOfBirth,
            dateOfDiagnosis: dateOfDiagnosis,
            state: country == "United States" ? state : nil
        )
        
        // Save Nightscout settings
        if isManualMode {
            NightscoutService.shared.saveSettings(url: "", token: "")
        } else {
            NightscoutService.shared.saveSettings(url: nightscoutUrl, token: nightscoutApiToken)
        }
        
        // Mark profile as complete
        profileService.completeProfile()
        
        // Show main app
        showingMainApp = true
    }
    
    private func getYearsSinceDiagnosisValue() -> Int {
        switch yearsSinceDiagnosis {
        case "<1": return 0
        case "1-2": return 1
        case "3-10": return 5
        case "10+": return 10
        default: return 0
        }
    }
}

#Preview {
    OnboardingView()
}
