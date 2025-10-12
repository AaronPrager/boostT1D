import SwiftUI

struct TermsOfUseOnboardingView: View {
    @State private var hasScrolledToBottom = false
    @State private var hasAgreed = false
    
    let onComplete: () -> Void
    let onBack: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "doc.text.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)
                
                VStack(spacing: 6) {
                    Text("Terms of Use")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    Text("Please read and agree to continue")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 20)
            
            // Terms Content with Scroll Tracking
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Medical Disclaimer
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                Text("IMPORTANT MEDICAL DISCLAIMER")
                                    .font(.headline)
                                    .fontWeight(.bold)
                            }
                            
                            Text("BoostT1D is NOT a medical device and is NOT intended to replace professional medical advice, diagnosis, or treatment. This application is provided as an informational and educational tool only.")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        .padding(16)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(12)
                        
                        Divider()
                        
                        // Section 1: No Medical Advice
                        VStack(alignment: .leading, spacing: 8) {
                            Text("1. No Medical Advice")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("BoostT1D does not provide medical advice. All content, features, and suggestions are for informational purposes only and should not be considered medical advice. Always consult with your healthcare provider before making any changes to your diabetes management plan, insulin dosages, diet, or exercise routine.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 2: AI-Generated Content
                        VStack(alignment: .leading, spacing: 8) {
                            Text("2. AI-Generated Content")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("BoostT1D uses artificial intelligence to analyze glucose data and provide therapy adjustment suggestions. AI-generated content may contain errors, inaccuracies, or inappropriate recommendations. You acknowledge that AI suggestions are not a substitute for professional medical judgment and should always be reviewed by your healthcare provider.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 3: User Responsibility
                        VStack(alignment: .leading, spacing: 8) {
                            Text("3. User Responsibility")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("You are solely responsible for your diabetes management decisions. Any insulin dosing, medication changes, or treatment adjustments must be made in consultation with your qualified healthcare provider. Never make changes to your diabetes management based solely on this app.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 4: Data Accuracy
                        VStack(alignment: .leading, spacing: 8) {
                            Text("4. Data Accuracy")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("While we strive for accuracy, BoostT1D does not guarantee the accuracy, completeness, or reliability of any data, analysis, or suggestions provided. Technical errors, data transmission issues, or integration problems may occur. Always verify critical information with your medical devices and healthcare provider.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 5: No Emergency Services
                        VStack(alignment: .leading, spacing: 8) {
                            Text("5. Emergency Situations")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("BoostT1D is NOT designed for emergency use. In case of severe hypoglycemia, hyperglycemia, diabetic ketoacidosis (DKA), or any medical emergency, call emergency services (911 in the US) immediately and follow your emergency action plan.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 6: Third-Party Integrations
                        VStack(alignment: .leading, spacing: 8) {
                            Text("6. Third-Party Integrations")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("BoostT1D may integrate with third-party services like Nightscout. We are not responsible for the accuracy, availability, or security of third-party services. Integration issues may result in data delays, inaccuracies, or unavailability.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 7: Limitation of Liability
                        VStack(alignment: .leading, spacing: 8) {
                            Text("7. Limitation of Liability")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("To the maximum extent permitted by law, BoostT1D and its developers shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from your use of this application, including but not limited to health complications, medical emergencies, or financial losses.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 8: Privacy & Data
                        VStack(alignment: .leading, spacing: 8) {
                            Text("8. Privacy & Data Security")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("Your health data is sensitive. While we implement security measures, no system is completely secure. You acknowledge the risks of storing and transmitting health information electronically. Review our Privacy Policy for details on data handling.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 9: Healthcare Provider Consultation
                        VStack(alignment: .leading, spacing: 8) {
                            Text("9. Healthcare Provider Consultation")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("You must work with a qualified healthcare provider for diabetes management. Share all app-generated reports and suggestions with your healthcare team. Never adjust insulin doses, medications, or treatment plans without professional medical supervision.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 10: Age Requirements
                        VStack(alignment: .leading, spacing: 8) {
                            Text("10. Age Requirements")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("If you are under 18 years of age, you must have parental or guardian consent to use this application. Parents and guardians are responsible for supervising minors' use of BoostT1D.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 11: Changes to Terms
                        VStack(alignment: .leading, spacing: 8) {
                            Text("11. Changes to Terms")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("We may update these Terms of Use at any time. Your continued use of the app after changes constitutes acceptance of the updated terms. We recommend reviewing these terms periodically.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        // Section 12: Acceptance
                        VStack(alignment: .leading, spacing: 8) {
                            Text("12. Acceptance of Terms")
                                .font(.subheadline)
                                .fontWeight(.bold)
                            
                            Text("By clicking \"I Understand and Agree\" below, you acknowledge that you have read, understood, and agree to be bound by these Terms of Use. You understand that BoostT1D is not a medical device, does not provide medical advice, and should not be used as a substitute for professional medical care.")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Final Warning
                        VStack(alignment: .leading, spacing: 10) {
                            HStack {
                                Image(systemName: "heart.text.square.fill")
                                    .foregroundColor(.blue)
                                Text("Your Health is Priority")
                                    .font(.headline)
                                    .fontWeight(.bold)
                            }
                            
                            Text("Always consult your healthcare provider for medical decisions. Use BoostT1D as a tool to support—not replace—professional medical care.")
                                .font(.subheadline)
                                .foregroundColor(.primary)
                        }
                        .padding(16)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(12)
                        
                        // Bottom marker for scroll detection
                        Color.clear
                            .frame(height: 1)
                            .id("bottom")
                            .onAppear {
                                hasScrolledToBottom = true
                            }
                    }
                    .padding(.horizontal, 20)
                    .padding(.vertical, 20)
                }
            }
            
            // Agreement Checkbox and Buttons
            VStack(spacing: 12) {
                // Agreement Toggle
                Button(action: {
                    hasAgreed.toggle()
                }) {
                    HStack(spacing: 12) {
                        Image(systemName: hasAgreed ? "checkmark.square.fill" : "square")
                            .font(.title3)
                            .foregroundColor(hasAgreed ? .green : .gray)
                        
                        Text("I have read and agree to the Terms of Use")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                        
                        Spacer()
                    }
                }
                .padding(.horizontal, 20)
                
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
                    Button(action: onComplete) {
                        HStack {
                            Text("I Understand and Agree")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "checkmark.circle.fill")
                                .font(.subheadline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(hasAgreed ? Color.green : Color.gray)
                        .cornerRadius(8)
                    }
                    .disabled(!hasAgreed)
                }
                .padding(.horizontal, 20)
                
                Text("Step 5 of 5")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.bottom, 30)
        }
    }
}

#Preview {
    TermsOfUseOnboardingView(
        onComplete: {},
        onBack: {}
    )
}

