import SwiftUI

struct NightscoutOnboardingView: View {
    @Binding var nightscoutUrl: String
    @Binding var nightscoutApiToken: String
    @Binding var isManualMode: Bool
    @Binding var isTestingConnection: Bool
    @Binding var showingConnectionAlert: Bool
    @Binding var connectionAlertMessage: String
    @Binding var lowGlucose: Double
    @Binding var highGlucose: Double
    
    @State private var showApiToken = false
    @State private var showingValidationAlert = false
    @State private var validationMessage = ""
    
    let onComplete: () -> Void
    let onBack: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "cloud.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)
                
                VStack(spacing: 6) {
                    Text("Connect to Nightscout")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Sync your glucose data automatically")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Nightscout Configuration
            VStack(spacing: 18) {
                // Manual Mode Toggle
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Manual Mode")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Toggle("", isOn: $isManualMode)
                            .toggleStyle(SwitchToggleStyle())
                    }
                    
                    Text("Enable if you don't have Nightscout or prefer manual entry")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                if !isManualMode {
                    // URL Field
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Nightscout URL")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        TextField("https://your-nightscout.herokuapp.com", text: $nightscoutUrl)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .font(.subheadline)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.URL)
                            .foregroundColor(nightscoutUrl.isEmpty ? .secondary : .primary)
                        
                        Text("Enter your Nightscout URL")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    // API Token Field
                    VStack(alignment: .leading, spacing: 6) {
                        Text("API Token")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        HStack {
                            if showApiToken {
                                TextField("Enter your API token", text: $nightscoutApiToken)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .font(.subheadline)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            } else {
                                SecureField("Enter your API token", text: $nightscoutApiToken)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .font(.subheadline)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            
                            Button(action: {
                                showApiToken.toggle()
                            }) {
                                Image(systemName: showApiToken ? "eye.slash.fill" : "eye.fill")
                                    .foregroundColor(.blue)
                                    .font(.system(size: 14))
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                        
                        Text("Find this in Nightscout Settings > Security")
                            .font(.caption2)
                            .foregroundColor(.secondary)
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
                                
                                TextField("70", value: $lowGlucose, format: .number)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .font(.subheadline)
                                    .keyboardType(.numberPad)
                            }
                            
                            VStack(alignment: .leading, spacing: 6) {
                                Text("High (mg/dL)")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)
                                
                                TextField("180", value: $highGlucose, format: .number)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .font(.subheadline)
                                    .keyboardType(.numberPad)
                            }
                        }
                        
                        Text("Used for time-in-range calculations and statistics")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                    
                    // Test Connection Button
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.7)
                            } else {
                                Image(systemName: "wifi")
                            }
                            Text(isTestingConnection ? "Testing..." : "Test Connection")
                        }
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(canTestConnection ? Color.blue : Color.gray)
                        .cornerRadius(6)
                    }
                    .disabled(!canTestConnection || isTestingConnection)
                } else {
                    // Manual Mode Info
                    VStack(spacing: 12) {
                        Image(systemName: "hand.point.up.left.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.orange)
                        
                        Text("Manual Mode Enabled")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Text("You can still use all features. You'll enter glucose readings manually when needed.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.vertical, 20)
                    .padding(.horizontal, 16)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
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
                    
                    // Complete Button
                    Button(action: validateAndComplete) {
                        HStack {
                            Text("Get Started")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "checkmark")
                                .font(.subheadline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(canProceed ? Color.green : Color.gray)
                        .cornerRadius(8)
                    }
                    .disabled(!canProceed)
                }
                
                Text("Step 4 of 4")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 30)
        }
        .alert("Invalid Glucose Range", isPresented: $showingValidationAlert) {
            Button("OK") { }
        } message: {
            Text(validationMessage)
        }
    }
    
    private var canTestConnection: Bool {
        !nightscoutUrl.isEmpty && !nightscoutApiToken.isEmpty
    }
    
    private var canProceed: Bool {
        isManualMode || (!nightscoutUrl.isEmpty && !nightscoutApiToken.isEmpty)
    }
    
    private func testConnection() {
        guard canTestConnection else { return }
        
        isTestingConnection = true
        
        // First try header-based authentication
        NightscoutService.shared.testConnection(url: nightscoutUrl, token: nightscoutApiToken) { success, message in
            if success {
                DispatchQueue.main.async {
                    isTestingConnection = false
                    connectionAlertMessage = message
                    showingConnectionAlert = true
                }
            } else {
                // If header auth fails, try query parameter authentication
                NightscoutService.shared.testConnectionWithQueryParam(url: nightscoutUrl, token: nightscoutApiToken) { querySuccess, queryMessage in
                    DispatchQueue.main.async {
                        isTestingConnection = false
                        if querySuccess {
                            connectionAlertMessage = queryMessage
                        } else {
                            connectionAlertMessage = "Both authentication methods failed:\n\nHeader auth: \(message)\n\nQuery param auth: \(queryMessage)"
                        }
                        showingConnectionAlert = true
                    }
                }
            }
        }
    }
    
    private func validateAndComplete() {
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
        
        // If validation passes, proceed to complete
        onComplete()
    }
}

#Preview {
    NightscoutOnboardingView(
        nightscoutUrl: .constant(""),
        nightscoutApiToken: .constant(""),
        isManualMode: .constant(false),
        isTestingConnection: .constant(false),
        showingConnectionAlert: .constant(false),
        connectionAlertMessage: .constant(""),
        lowGlucose: .constant(70.0),
        highGlucose: .constant(180.0),
        onComplete: {},
        onBack: {}
    )
}
