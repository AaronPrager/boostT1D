import SwiftUI

struct BasicInfoOnboardingView: View {
    @Binding var name: String
    @Binding var age: String
    @Binding var gender: String
    @Binding var yearsSinceDiagnosis: String
    
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
    }
    
    private var canProceed: Bool {
        !name.isEmpty && !age.isEmpty && !gender.isEmpty && !yearsSinceDiagnosis.isEmpty
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
