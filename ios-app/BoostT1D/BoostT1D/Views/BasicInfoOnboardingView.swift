import SwiftUI

struct BasicInfoOnboardingView: View {
    @Binding var name: String
    @Binding var age: String
    @Binding var gender: String
    @Binding var yearsSinceDiagnosis: String
    
    @State private var showingValidationAlert = false
    @State private var validationMessage = ""
    
    let onNext: () -> Void
    
    private let genderOptions = ["Male", "Female", "Prefer not to say"]
    private let yearsSinceDiagnosisOptions = ["<1", "1-2", "3-10", "10+"]
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 16) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                VStack(spacing: 6) {
                    Text("Let's get to know you")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Tell us a bit about yourself")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.top, 40)
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Form Fields
            VStack(spacing: 32) {
                // Name Field
                VStack(alignment: .leading, spacing: 12) {
                    Text("What's your name?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    TextField("Enter your name", text: $name)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .font(.subheadline)
                        .autocapitalization(.words)
                        .toolbar {
                            ToolbarItemGroup(placement: .keyboard) {
                                Spacer()
                                Button("Done") {
                                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                }
                            }
                        }
                }
                
                // Age Field
                VStack(alignment: .leading, spacing: 12) {
                    Text("How old are you?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    TextField("Enter your age", text: $age)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .font(.subheadline)
                        .keyboardType(.numberPad)
                        .toolbar {
                            ToolbarItemGroup(placement: .keyboard) {
                                Spacer()
                                Button("Done") {
                                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                                }
                            }
                        }
                }
                
                // Gender Field
                VStack(alignment: .leading, spacing: 12) {
                    Text("Gender")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Picker("Gender", selection: $gender) {
                        Text("Select gender").tag("")
                        ForEach(genderOptions, id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
                
                // Years Since Diagnosis Field
                VStack(alignment: .leading, spacing: 12) {
                    Text("How many years have you had diabetes?")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                    
                    Picker("Years since diagnosis", selection: $yearsSinceDiagnosis) {
                        Text("Select duration").tag("")
                        ForEach(yearsSinceDiagnosisOptions, id: \.self) { option in
                            Text(option).tag(option)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 20)
            
            Spacer()
            
            // Next Button
            VStack(spacing: 12) {
                Button(action: validateAndProceed) {
                    HStack {
                        Text("Continue")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Image(systemName: "arrow.right")
                            .font(.subheadline)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(canProceed ? Color.blue : Color.gray)
                    .cornerRadius(10)
                }
                .disabled(!canProceed)
                
                Text("Step 1 of 4")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
        .onTapGesture {
            // Dismiss keyboard when tapping outside text fields
            UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        }
        .alert("Invalid Information", isPresented: $showingValidationAlert) {
            Button("OK") { }
        } message: {
            Text(validationMessage)
        }
    }
    
    private var canProceed: Bool {
        !name.isEmpty && !age.isEmpty && !gender.isEmpty && !yearsSinceDiagnosis.isEmpty
    }
    
    private func validateAndProceed() {
        guard let ageValue = Int(age) else {
            validationMessage = "Please enter a valid age."
            showingValidationAlert = true
            return
        }
        
        // Validate age is greater than 13
        if ageValue <= 13 {
            validationMessage = "You must be at least 14 years old to use this app."
            showingValidationAlert = true
            return
        }
        
        // Validate years since diagnosis is not more than age
        let yearsSinceDiagnosisValue = getYearsSinceDiagnosisValue()
        if yearsSinceDiagnosisValue > ageValue {
            validationMessage = "Years with diabetes cannot be more than your age. Please check your information."
            showingValidationAlert = true
            return
        }
        
        // If validation passes, proceed to next step
        onNext()
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
    BasicInfoOnboardingView(
        name: .constant(""),
        age: .constant(""),
        gender: .constant(""),
        yearsSinceDiagnosis: .constant(""),
        onNext: {}
    )
}
