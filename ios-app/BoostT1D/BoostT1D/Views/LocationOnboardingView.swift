import SwiftUI

struct LocationOnboardingView: View {
    @Binding var country: String
    @Binding var state: String
    @Binding var showingCountryPicker: Bool
    @Binding var showingStatePicker: Bool
    
    let onNext: () -> Void
    let onBack: () -> Void
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "location.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)
                
                VStack(spacing: 6) {
                    Text("Where are you located?")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("This helps us provide relevant information")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Location Fields
            VStack(spacing: 18) {
                // Country Field
                VStack(alignment: .leading, spacing: 6) {
                    Text("Country")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    Button(action: { showingCountryPicker = true }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Select Country")
                                    .font(.subheadline)
                                    .foregroundColor(country.isEmpty ? .secondary : .primary)
                                
                                if !country.isEmpty {
                                    Text(country)
                                        .font(.body)
                                        .foregroundColor(.primary)
                                }
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
                
                // State Field (only for USA)
                if country == "United States" {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("State")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Button(action: { showingStatePicker = true }) {
                            HStack {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Select State")
                                        .font(.subheadline)
                                        .foregroundColor(state.isEmpty ? .secondary : .primary)
                                    
                                    if !state.isEmpty {
                                        Text(state)
                                            .font(.body)
                                            .foregroundColor(.primary)
                                    }
                                }
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .foregroundColor(.secondary)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                        }
                    }
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
                    
                    // Next Button
                    Button(action: onNext) {
                        HStack {
                            Text("Continue")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                            
                            Image(systemName: "arrow.right")
                                .font(.subheadline)
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(canProceed ? Color.blue : Color.gray)
                        .cornerRadius(8)
                    }
                    .disabled(!canProceed)
                }
                
                Text("Step 3 of 4")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 30)
        }
    }
    
    private var canProceed: Bool {
        !country.isEmpty && (country != "United States" || !state.isEmpty)
    }
}

#Preview {
    LocationOnboardingView(
        country: .constant(""),
        state: .constant(""),
        showingCountryPicker: .constant(false),
        showingStatePicker: .constant(false),
        onNext: {},
        onBack: {}
    )
}
