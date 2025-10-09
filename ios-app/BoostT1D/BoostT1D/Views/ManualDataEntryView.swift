import SwiftUI

struct ManualDataEntryView: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var localDataService = LocalDataService.shared
    @State private var glucoseValue = ""
    @State private var insulinAmount = ""
    @State private var carbAmount = ""
    @State private var notes = ""
    @State private var selectedEntryType: EntryType = .glucose
    @State private var showingSuccess = false
    
    enum EntryType: String, CaseIterable {
        case glucose = "Glucose Reading"
        case insulin = "Insulin Dose"
        case carbs = "Carb Entry"
        case combo = "Combo (Insulin + Carbs)"
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Warning Banner
                    VStack(spacing: 8) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.title2)
                            .foregroundColor(.orange)
                        
                        Text("Manual Mode Data Retention")
                            .font(.headline)
                            .foregroundColor(.orange)
                        
                        Text("In manual mode, only the last 7 days of data will be kept. Data older than 7 days will be automatically deleted to save storage space.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Entry Type Picker
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Entry Type")
                            .font(.headline)
                        
                        Picker("Entry Type", selection: $selectedEntryType) {
                            ForEach(EntryType.allCases, id: \.self) { type in
                                Text(type.rawValue).tag(type)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                    }
                    .padding(.horizontal)
                    
                    // Dynamic Form
                    VStack(spacing: 16) {
                        if selectedEntryType == .glucose {
                            glucoseEntryForm
                        } else if selectedEntryType == .insulin {
                            insulinEntryForm
                        } else if selectedEntryType == .carbs {
                            carbEntryForm
                        } else if selectedEntryType == .combo {
                            comboEntryForm
                        }
                        
                        // Notes Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes (Optional)")
                                .font(.headline)
                            
                            TextField("Add notes...", text: $notes)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        .padding(.horizontal)
                        
                        // Save Button
                        Button(action: saveEntry) {
                            Text("Save Entry")
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(canSave ? Color.blue : Color.gray)
                                .cornerRadius(12)
                        }
                        .disabled(!canSave)
                        .padding(.horizontal)
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("Manual Entry")
            .navigationBarItems(trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            })
            .alert("Entry Saved", isPresented: $showingSuccess) {
                Button("OK") {
                    clearForm()
                }
            } message: {
                Text("Your \(selectedEntryType.rawValue.lowercased()) has been saved successfully.")
            }
        }
    }
    
    // MARK: - Form Views
    private var glucoseEntryForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Glucose Reading (mg/dL)")
                .font(.headline)
            
            TextField("Enter glucose value", text: $glucoseValue)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.numberPad)
        }
        .padding(.horizontal)
    }
    
    private var insulinEntryForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Insulin Amount (units)")
                .font(.headline)
            
            TextField("Enter insulin units", text: $insulinAmount)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.decimalPad)
        }
        .padding(.horizontal)
    }
    
    private var carbEntryForm: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Carbohydrates (grams)")
                .font(.headline)
            
            TextField("Enter carbs", text: $carbAmount)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.decimalPad)
        }
        .padding(.horizontal)
    }
    
    private var comboEntryForm: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Insulin Amount (units)")
                    .font(.headline)
                
                TextField("Enter insulin units", text: $insulinAmount)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.decimalPad)
            }
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Carbohydrates (grams)")
                    .font(.headline)
                
                TextField("Enter carbs", text: $carbAmount)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.decimalPad)
            }
        }
        .padding(.horizontal)
    }
    
    // MARK: - Helper Properties
    private var canSave: Bool {
        switch selectedEntryType {
        case .glucose:
            return !glucoseValue.isEmpty && Int(glucoseValue) != nil
        case .insulin:
            return !insulinAmount.isEmpty && Double(insulinAmount) != nil
        case .carbs:
            return !carbAmount.isEmpty && Double(carbAmount) != nil
        case .combo:
            return (!insulinAmount.isEmpty && Double(insulinAmount) != nil) ||
                   (!carbAmount.isEmpty && Double(carbAmount) != nil)
        }
    }
    
    // MARK: - Actions
    private func saveEntry() {
        switch selectedEntryType {
        case .glucose:
            if let value = Int(glucoseValue) {
                localDataService.addGlucoseEntry(value: value, notes: notes.isEmpty ? nil : notes)
            }
        case .insulin:
            if let insulin = Double(insulinAmount) {
                localDataService.addTreatment(
                    type: "Correction Bolus",
                    insulin: insulin,
                    carbs: nil,
                    notes: notes.isEmpty ? nil : notes
                )
            }
        case .carbs:
            if let carbs = Double(carbAmount) {
                localDataService.addTreatment(
                    type: "Carb Correction",
                    insulin: nil,
                    carbs: carbs,
                    notes: notes.isEmpty ? nil : notes
                )
            }
        case .combo:
            let insulin = Double(insulinAmount)
            let carbs = Double(carbAmount)
            localDataService.addTreatment(
                type: "Meal Bolus",
                insulin: insulin,
                carbs: carbs,
                notes: notes.isEmpty ? nil : notes
            )
        }
        
        showingSuccess = true
    }
    
    private func clearForm() {
        glucoseValue = ""
        insulinAmount = ""
        carbAmount = ""
        notes = ""
    }
}

#Preview {
    ManualDataEntryView()
}

