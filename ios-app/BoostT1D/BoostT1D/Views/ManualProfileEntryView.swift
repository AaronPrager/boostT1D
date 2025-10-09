import SwiftUI

struct BasalInterval: Identifiable {
    let id = UUID()
    var time: String
    var rate: String
}

struct CarbRatioInterval: Identifiable {
    let id = UUID()
    var time: String
    var ratio: String
}

struct ISFInterval: Identifiable {
    let id = UUID()
    var time: String
    var sensitivity: String
}

struct ManualProfileEntryView: View {
    @Environment(\.presentationMode) var presentationMode
    @StateObject private var diabetesProfileService = DiabetesProfileService.shared
    
    @State private var dia: String = "5.0"
    @State private var basalIntervals: [BasalInterval] = [BasalInterval(time: "00:00", rate: "1.0")]
    @State private var carbRatioIntervals: [CarbRatioInterval] = [CarbRatioInterval(time: "00:00", ratio: "10")]
    @State private var isfIntervals: [ISFInterval] = [ISFInterval(time: "00:00", sensitivity: "50")]
    @State private var targetLow: String = "80"
    @State private var targetHigh: String = "120"
    @State private var notes: String = ""
    @State private var showingSuccess = false
    @State private var hasLoadedExistingProfile = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 20) {
                    // Info Banner
                    VStack(spacing: 8) {
                        Image(systemName: "info.circle.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                        
                        Text("Manual Profile Entry")
                            .font(.headline)
                            .foregroundColor(.blue)
                        
                        Text("Enter your basic diabetes profile settings. This will be stored locally on your device.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Profile Settings
                    VStack(spacing: 20) {
                        // Duration of Insulin Action (DIA)
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Duration of Insulin Action (DIA)")
                                .font(.headline)
                            
                            HStack {
                                TextField("Hours", text: $dia)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.decimalPad)
                                
                                Text("hours")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            Text("Typical range: 3-7 hours")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Basal Rate Schedule
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Basal Rate Schedule")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Button(action: addBasalInterval) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add")
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(.blue)
                                }
                            }
                            
                            Text("Configure basal rates by time intervals")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            // Basal intervals list
                            ForEach(basalIntervals.indices, id: \.self) { index in
                                HStack(spacing: 8) {
                                    // Time picker
                                    Menu {
                                        ForEach(availableTimeSlotsFor(index: index), id: \.self) { timeSlot in
                                            Button(timeSlot) {
                                                basalIntervals[index].time = timeSlot
                                                sortBasalIntervals()
                                            }
                                        }
                                    } label: {
                                        Text(basalIntervals[index].time)
                                            .font(.subheadline)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 6)
                                            .background(Color.gray.opacity(0.1))
                                            .cornerRadius(6)
                                    }
                                    
                                    // Rate input
                                    TextField("1.0", text: $basalIntervals[index].rate)
                                        .textFieldStyle(RoundedBorderTextFieldStyle())
                                        .keyboardType(.decimalPad)
                                        .frame(width: 60)
                                    
                                    Spacer()
                                    
                                    // Remove button
                                    if basalIntervals.count > 1 {
                                        Button(action: {
                                            removeBasalInterval(at: index)
                                        }) {
                                            Image(systemName: "minus.circle.fill")
                                                .foregroundColor(.red)
                                                .font(.system(size: 20))
                                        }
                                    }
                                }
                                .padding(.vertical, 2)
                            }
                            
                            Text("Units: U/hr")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Carb Ratio Schedule
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Insulin to Carb Ratio (I:C)")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Button(action: addCarbRatioInterval) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add")
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(.blue)
                                }
                            }
                            
                            Text("1 unit of insulin covers X grams of carbs")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            // Carb ratio intervals list
                            ForEach(carbRatioIntervals.indices, id: \.self) { index in
                                HStack(spacing: 8) {
                                    // Time picker
                                    Menu {
                                        ForEach(availableCarbRatioTimeSlotsFor(index: index), id: \.self) { timeSlot in
                                            Button(timeSlot) {
                                                carbRatioIntervals[index].time = timeSlot
                                                sortCarbRatioIntervals()
                                            }
                                        }
                                    } label: {
                                        Text(carbRatioIntervals[index].time)
                                            .font(.subheadline)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 6)
                                            .background(Color.gray.opacity(0.1))
                                            .cornerRadius(6)
                                    }
                                    
                                    // Ratio input
                                    HStack(spacing: 4) {
                                        Text("1:")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        
                                        TextField("10", text: $carbRatioIntervals[index].ratio)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .keyboardType(.decimalPad)
                                            .frame(width: 50)
                                    }
                                    
                                    Spacer()
                                    
                                    // Remove button
                                    if carbRatioIntervals.count > 1 {
                                        Button(action: {
                                            removeCarbRatioInterval(at: index)
                                        }) {
                                            Image(systemName: "minus.circle.fill")
                                                .foregroundColor(.red)
                                                .font(.system(size: 20))
                                        }
                                    }
                                }
                                .padding(.vertical, 2)
                            }
                            
                            Text("Units: grams (g)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Insulin Sensitivity Factor Schedule
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Insulin Sensitivity Factor (ISF)")
                                    .font(.headline)
                                
                                Spacer()
                                
                                Button(action: addISFInterval) {
                                    HStack(spacing: 4) {
                                        Image(systemName: "plus.circle.fill")
                                        Text("Add")
                                    }
                                    .font(.subheadline)
                                    .foregroundColor(.blue)
                                }
                            }
                            
                            Text("1 unit of insulin lowers glucose by X mg/dL")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            // ISF intervals list
                            ForEach(isfIntervals.indices, id: \.self) { index in
                                HStack(spacing: 8) {
                                    // Time picker
                                    Menu {
                                        ForEach(availableISFTimeSlotsFor(index: index), id: \.self) { timeSlot in
                                            Button(timeSlot) {
                                                isfIntervals[index].time = timeSlot
                                                sortISFIntervals()
                                            }
                                        }
                                    } label: {
                                        Text(isfIntervals[index].time)
                                            .font(.subheadline)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 6)
                                            .background(Color.gray.opacity(0.1))
                                            .cornerRadius(6)
                                    }
                                    
                                    // Sensitivity input
                                    HStack(spacing: 4) {
                                        Text("1:")
                                            .font(.subheadline)
                                            .foregroundColor(.secondary)
                                        
                                        TextField("50", text: $isfIntervals[index].sensitivity)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .keyboardType(.decimalPad)
                                            .frame(width: 50)
                                    }
                                    
                                    Spacer()
                                    
                                    // Remove button
                                    if isfIntervals.count > 1 {
                                        Button(action: {
                                            removeISFInterval(at: index)
                                        }) {
                                            Image(systemName: "minus.circle.fill")
                                                .foregroundColor(.red)
                                                .font(.system(size: 20))
                                        }
                                    }
                                }
                                .padding(.vertical, 2)
                            }
                            
                            Text("Units: mg/dL")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Target Range
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Target Glucose Range")
                                .font(.headline)
                            
                            HStack(spacing: 12) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Low")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    HStack {
                                        TextField("Low", text: $targetLow)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .keyboardType(.numberPad)
                                        
                                        Text("mg/dL")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                                
                                Text("-")
                                    .font(.headline)
                                    .padding(.top, 12)
                                
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("High")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    
                                    HStack {
                                        TextField("High", text: $targetHigh)
                                            .textFieldStyle(RoundedBorderTextFieldStyle())
                                            .keyboardType(.numberPad)
                                        
                                        Text("mg/dL")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            
                            Text("Typical range: 80-120 mg/dL")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                        
                        // Notes
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Notes (Optional)")
                                .font(.headline)
                            
                            TextField("Add any notes about your profile...", text: $notes)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                    }
                    .padding(.horizontal)
                    
                    // Save Button
                    Button(action: saveProfile) {
                        Text("Save Profile")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(canSave ? Color.blue : Color.gray)
                            .cornerRadius(12)
                    }
                    .disabled(!canSave)
                    .padding(.horizontal)
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("Enter Profile")
            .navigationBarItems(trailing: Button("Cancel") {
                presentationMode.wrappedValue.dismiss()
            })
            .alert("Profile Saved", isPresented: $showingSuccess) {
                Button("OK") {
                    presentationMode.wrappedValue.dismiss()
                }
            } message: {
                Text("Your diabetes profile has been saved successfully.")
            }
            .onAppear {
                loadExistingProfile()
            }
        }
    }
    
    private var canSave: Bool {
        // Check basic fields
        guard !dia.isEmpty && Double(dia) != nil,
              !targetLow.isEmpty && Int(targetLow) != nil,
              !targetHigh.isEmpty && Int(targetHigh) != nil else {
            return false
        }
        
        // Check all basal intervals have valid rates
        for interval in basalIntervals {
            if interval.rate.isEmpty || Double(interval.rate) == nil {
                return false
            }
        }
        
        // Check all carb ratio intervals have valid ratios
        for interval in carbRatioIntervals {
            if interval.ratio.isEmpty || Double(interval.ratio) == nil {
                return false
            }
        }
        
        // Check all ISF intervals have valid sensitivities
        for interval in isfIntervals {
            if interval.sensitivity.isEmpty || Double(interval.sensitivity) == nil {
                return false
            }
        }
        
        return true
    }
    
    private func saveProfile() {
        guard let diaValue = Double(dia),
              let lowValue = Int(targetLow),
              let highValue = Int(targetHigh) else {
            return
        }
        
        // Convert basal intervals to TimeValues
        var basalTimeValues: [TimeValue] = []
        for interval in basalIntervals {
            if let rateValue = Double(interval.rate) {
                basalTimeValues.append(TimeValue(time: interval.time, value: rateValue))
            }
        }
        
        // Convert carb ratio intervals to TimeValues
        var carbRatioTimeValues: [TimeValue] = []
        for interval in carbRatioIntervals {
            if let ratioValue = Double(interval.ratio) {
                carbRatioTimeValues.append(TimeValue(time: interval.time, value: ratioValue))
            }
        }
        
        // Convert ISF intervals to TimeValues
        var isfTimeValues: [TimeValue] = []
        for interval in isfIntervals {
            if let sensValue = Double(interval.sensitivity) {
                isfTimeValues.append(TimeValue(time: interval.time, value: sensValue))
            }
        }
        
        // Create target values
        let targetLowValue = TimeValue(time: "00:00", value: Double(lowValue))
        let targetHighValue = TimeValue(time: "00:00", value: Double(highValue))
        
        let profileData = ProfileData(
            timezone: TimeZone.current.identifier,
            units: "mg/dl",
            dia: diaValue,
            carbratio: carbRatioTimeValues,
            carb_ratio: carbRatioTimeValues,
            sens: isfTimeValues,
            sensitivity: isfTimeValues,
            basal: basalTimeValues,
            target_low: [targetLowValue],
            target_high: [targetHighValue],
            startDate: ISO8601DateFormatter().string(from: Date()),
            created_at: ISO8601DateFormatter().string(from: Date()),
            notes: notes.isEmpty ? nil : notes,
            pump: nil
        )
        
        let profile = DiabetesProfile(
            _id: UUID().uuidString,
            defaultProfile: "Manual Profile",
            store: ["Manual Profile": profileData],
            startDate: ISO8601DateFormatter().string(from: Date()),
            mills: Int64(Date().timeIntervalSince1970 * 1000),
            units: "mg/dl",
            created_at: ISO8601DateFormatter().string(from: Date()),
            deviceToken: nil,
            overridePresets: nil,
            enteredBy: "Manual Entry"
        )
        
        diabetesProfileService.saveLocalProfile(profile)
        showingSuccess = true
    }
    
    // MARK: - Basal Interval Management
    
    private func addBasalInterval() {
        // Find the next available time slot
        let usedTimes = Set(basalIntervals.map { $0.time })
        let allTimeSlots = generateAllTimeSlots()
        
        if let nextTime = allTimeSlots.first(where: { !usedTimes.contains($0) }) {
            basalIntervals.append(BasalInterval(time: nextTime, rate: "1.0"))
            sortBasalIntervals()
        }
    }
    
    private func removeBasalInterval(at index: Int) {
        guard basalIntervals.count > 1 else { return }
        basalIntervals.remove(at: index)
    }
    
    private func sortBasalIntervals() {
        basalIntervals.sort { timeToMinutes($0.time) < timeToMinutes($1.time) }
    }
    
    private func availableTimeSlotsFor(index: Int) -> [String] {
        let currentTime = basalIntervals[index].time
        let usedTimes = Set(basalIntervals.enumerated().compactMap { i, interval in
            i == index ? nil : interval.time
        })
        
        let allSlots = generateAllTimeSlots()
        return allSlots.filter { $0 == currentTime || !usedTimes.contains($0) }
    }
    
    private func generateAllTimeSlots() -> [String] {
        var slots: [String] = []
        for hour in 0..<24 {
            for minute in [0, 30] {
                slots.append(String(format: "%02d:%02d", hour, minute))
            }
        }
        return slots
    }
    
    private func timeToMinutes(_ time: String) -> Int {
        let components = time.split(separator: ":")
        guard components.count == 2,
              let hours = Int(components[0]),
              let minutes = Int(components[1]) else {
            return 0
        }
        return hours * 60 + minutes
    }
    
    // MARK: - Carb Ratio Interval Management
    
    private func addCarbRatioInterval() {
        let usedTimes = Set(carbRatioIntervals.map { $0.time })
        let allTimeSlots = generateAllTimeSlots()
        
        if let nextTime = allTimeSlots.first(where: { !usedTimes.contains($0) }) {
            carbRatioIntervals.append(CarbRatioInterval(time: nextTime, ratio: "10"))
            sortCarbRatioIntervals()
        }
    }
    
    private func removeCarbRatioInterval(at index: Int) {
        guard carbRatioIntervals.count > 1 else { return }
        carbRatioIntervals.remove(at: index)
    }
    
    private func sortCarbRatioIntervals() {
        carbRatioIntervals.sort { timeToMinutes($0.time) < timeToMinutes($1.time) }
    }
    
    private func availableCarbRatioTimeSlotsFor(index: Int) -> [String] {
        let currentTime = carbRatioIntervals[index].time
        let usedTimes = Set(carbRatioIntervals.enumerated().compactMap { i, interval in
            i == index ? nil : interval.time
        })
        
        let allSlots = generateAllTimeSlots()
        return allSlots.filter { $0 == currentTime || !usedTimes.contains($0) }
    }
    
    // MARK: - ISF Interval Management
    
    private func addISFInterval() {
        let usedTimes = Set(isfIntervals.map { $0.time })
        let allTimeSlots = generateAllTimeSlots()
        
        if let nextTime = allTimeSlots.first(where: { !usedTimes.contains($0) }) {
            isfIntervals.append(ISFInterval(time: nextTime, sensitivity: "50"))
            sortISFIntervals()
        }
    }
    
    private func removeISFInterval(at index: Int) {
        guard isfIntervals.count > 1 else { return }
        isfIntervals.remove(at: index)
    }
    
    private func sortISFIntervals() {
        isfIntervals.sort { timeToMinutes($0.time) < timeToMinutes($1.time) }
    }
    
    private func availableISFTimeSlotsFor(index: Int) -> [String] {
        let currentTime = isfIntervals[index].time
        let usedTimes = Set(isfIntervals.enumerated().compactMap { i, interval in
            i == index ? nil : interval.time
        })
        
        let allSlots = generateAllTimeSlots()
        return allSlots.filter { $0 == currentTime || !usedTimes.contains($0) }
    }
    
    // MARK: - Load Existing Profile
    
    private func loadExistingProfile() {
        guard !hasLoadedExistingProfile else { return }
        guard let existingProfile = diabetesProfileService.getLocalProfile() else { return }
        guard let defaultProfileName = existingProfile.defaultProfile,
              let profileData = existingProfile.store?[defaultProfileName] else { return }
        
        hasLoadedExistingProfile = true
        
        // Load DIA
        if let diaValue = profileData.dia {
            dia = String(format: "%.1f", diaValue)
        }
        
        // Load Basal Intervals
        if let basalArray = profileData.basal, !basalArray.isEmpty {
            basalIntervals = basalArray.map { timeValue in
                BasalInterval(time: timeValue.time, rate: String(format: "%.2f", timeValue.value))
            }
        }
        
        // Load Carb Ratio Intervals
        if let carbRatioArray = profileData.carbratio ?? profileData.carb_ratio, !carbRatioArray.isEmpty {
            carbRatioIntervals = carbRatioArray.map { timeValue in
                CarbRatioInterval(time: timeValue.time, ratio: String(format: "%.1f", timeValue.value))
            }
        }
        
        // Load ISF Intervals
        if let isfArray = profileData.sens ?? profileData.sensitivity, !isfArray.isEmpty {
            isfIntervals = isfArray.map { timeValue in
                ISFInterval(time: timeValue.time, sensitivity: String(format: "%.0f", timeValue.value))
            }
        }
        
        // Load Target Range
        if let targetLowArray = profileData.target_low, let firstLow = targetLowArray.first {
            targetLow = String(format: "%.0f", firstLow.value)
        }
        
        if let targetHighArray = profileData.target_high, let firstHigh = targetHighArray.first {
            targetHigh = String(format: "%.0f", firstHigh.value)
        }
        
        // Load Notes
        if let profileNotes = profileData.notes {
            notes = profileNotes
        }
    }
}

#Preview {
    ManualProfileEntryView()
}

