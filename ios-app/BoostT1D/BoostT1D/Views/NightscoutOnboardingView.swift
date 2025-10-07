import SwiftUI

struct NightscoutOnboardingView: View {
    @Binding var nightscoutUrl: String
    @Binding var nightscoutApiToken: String
    @Binding var isManualMode: Bool
    @Binding var isTestingConnection: Bool
    @Binding var showingConnectionAlert: Bool
    @Binding var connectionAlertMessage: String
    
    let onComplete: () -> Void
    let onBack: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 20) {
                Image(systemName: "cloud.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                VStack(spacing: 8) {
                    Text("Connect to Nightscout")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Sync your glucose data automatically")
                        .font(.body)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 60)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Nightscout Configuration
            VStack(spacing: 24) {
                // Manual Mode Toggle
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text("Manual Mode")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                        
                        Toggle("", isOn: $isManualMode)
                            .toggleStyle(SwitchToggleStyle())
                    }
                    
                    Text("Enable if you don't have Nightscout or prefer manual entry")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if !isManualMode {
                    // URL Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Nightscout URL")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("https://your-nightscout.herokuapp.com", text: $nightscoutUrl)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .font(.body)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .keyboardType(.URL)
                            .foregroundColor(nightscoutUrl.isEmpty ? .secondary : .primary)
                        
                        Text("Enter your Nightscout URL")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // API Token Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("API Token")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        SecureField("Enter your API token", text: $nightscoutApiToken)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .font(.body)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                        
                        Text("Find this in Nightscout Settings > Security")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Test Connection Button
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
                } else {
                    // Manual Mode Info
                    VStack(spacing: 16) {
                        Image(systemName: "hand.point.up.left.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        
                        Text("Manual Mode Enabled")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Text("You can still use all features. You'll enter glucose readings manually when needed.")
                            .font(.body)
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
                    
                    // Complete Button
                    Button(action: onComplete) {
                        HStack {
                            Text("Get Started")
                                .font(.headline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "checkmark")
                                .font(.headline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(canProceed ? Color.green : Color.gray)
                        .cornerRadius(12)
                    }
                    .disabled(!canProceed)
                }
                
                Text("Step 4 of 4")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
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
        
        NightscoutService.shared.testConnection(url: nightscoutUrl, token: nightscoutApiToken) { success, message in
            DispatchQueue.main.async {
                isTestingConnection = false
                connectionAlertMessage = message
                showingConnectionAlert = true
            }
        }
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
        onComplete: {},
        onBack: {}
    )
}
