import SwiftUI

struct TreatmentsView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @State private var treatments: [NightscoutTreatment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedTimeRange: Int = 3
    @State private var selectedTreatmentType: String = "All"
    
    private let timeRangeOptions = [1, 3, 7, 30]
    private let timeRangeLabels = ["1 day", "3 days", "7 days", "1 month"]
    
    enum TreatmentType: String, CaseIterable {
        case all = "All"
        case insulin = "Insulin"
        case carbs = "Carbs"
        case tempBasal = "Temp Basal"
        case exercise = "Profile"
        case other = "Other"
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "syringe.fill")
                        .font(.system(size: 30))
                        .foregroundColor(.purple)
                }
                .padding(.top, 20)
                
                // Time Range Selection
                VStack(spacing: 12) {
                    HStack {
                        Text("Time Range")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                        Picker("Time Range", selection: $selectedTimeRange) {
                            ForEach(0..<timeRangeOptions.count, id: \.self) { index in
                                Text(timeRangeLabels[index]).tag(timeRangeOptions[index])
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Treatment Type Filter
                VStack(spacing: 12) {
                    HStack {
                        Text("Treatment Type")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                        Picker("Treatment Type", selection: $selectedTreatmentType) {
                            ForEach(TreatmentType.allCases, id: \.self) { type in
                                Text(type.rawValue).tag(type.rawValue)
                            }
                        }
                        .pickerStyle(MenuPickerStyle())
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Content
                if isLoading {
                    ProgressView("Loading treatments...")
                        .padding()
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 12) {
                        if !isNightscoutConfigured() {
                            // Nightscout not configured - show helpful suggestion
                            Image(systemName: "link.circle")
                                .font(.system(size: 40))
                                .foregroundColor(.blue)
                            
                            Text("Connect to Nightscout")
                                .font(.headline)
                            
                            Text("To view your treatment history, you need to connect to your Nightscout server. This will allow you to see insulin doses, carb entries, and other treatments.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            NavigationLink(destination: ProfileView()) {
                                Text("Configure Nightscout")
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 10)
                                    .background(Color.blue)
                                    .cornerRadius(8)
                            }
                        } else {
                            // Nightscout configured but error occurred
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 40))
                                .foregroundColor(.orange)
                            
                            Text("Error Loading Treatments")
                                .font(.headline)
                            
                            Text(errorMessage)
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button("Retry") {
                                loadTreatments()
                            }
                            .foregroundColor(.blue)
                        }
                    }
                    .padding()
                } else if filteredTreatments.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "syringe")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        
                        Text("No Treatments")
                            .font(.headline)
                        
                        Text("No treatments found for the selected time range and type.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    // Treatments List
                    VStack(spacing: 16) {
                        LazyVStack(spacing: 8) {
                            ForEach(Array(filteredTreatments.enumerated()), id: \.offset) { index, treatment in
                                TreatmentRow(treatment: treatment)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Treatments")
        .navigationBarItems(trailing: Button(action: {
            loadTreatments()
        }) {
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.blue)
        })
        .onAppear {
            loadTreatments()
        }
        .onChange(of: selectedTimeRange) { _ in
            // Reset treatment type to "All" when time range changes to avoid confusion
            selectedTreatmentType = "All"
            loadTreatments()
        }
        .onChange(of: selectedTreatmentType) { _ in
            // Filtering is handled by computed property
        }
    }
    
    private var filteredTreatments: [NightscoutTreatment] {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .hour, value: -selectedTimeRange * 24, to: endDate) ?? endDate
        
        let filtered = treatments.filter { treatment in
            let treatmentDate = getTreatmentDate(treatment)
            let isInDateRange = treatmentDate >= startDate && treatmentDate <= endDate
            let matchesType = filterTreatmentByType(treatment, selectedType: selectedTreatmentType)
            return isInDateRange && matchesType
        }
        
        return filtered.sorted { getTreatmentDate($0) > getTreatmentDate($1) }
    }
    
    private func getTreatmentDate(_ treatment: NightscoutTreatment) -> Date {
        if let mills = treatment.mills, mills > 0 {
            return Date(timeIntervalSince1970: Double(mills) / 1000)
        } else if let created_at = treatment.created_at {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            formatter.timeZone = TimeZone(abbreviation: "UTC")
            return formatter.date(from: created_at) ?? Date.distantPast
        }
        return Date.distantPast
    }
    
    private func filterTreatmentByType(_ treatment: NightscoutTreatment, selectedType: String) -> Bool {
        guard selectedType != "All" else { return true }
        
        if selectedType == "Insulin" { return treatment.insulin != nil && treatment.insulin! > 0 }
        if selectedType == "Carbs" { return treatment.carbs != nil && treatment.carbs! > 0 }
        if selectedType == "Temp Basal" { return treatment.eventType == "Temp Basal" }
        if selectedType == "Profile" { return treatment.eventType == "Exercise" }
        if selectedType == "Other" {
            let hasInsulin = treatment.insulin != nil && treatment.insulin! > 0
            let hasCarbs = treatment.carbs != nil && treatment.carbs! > 0
            let isTempBasal = treatment.eventType == "Temp Basal"
            let isProfile = treatment.eventType == "Exercise"
            return !hasInsulin && !hasCarbs && !isTempBasal && !isProfile
        }
        return false
    }
    
    private func loadTreatments() {
        isLoading = true
        errorMessage = nil
        
        nightscoutService.fetchTreatments(settings: nightscoutService.settings, hours: selectedTimeRange * 24) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let fetchedTreatments):
                    self.treatments = fetchedTreatments.sorted { treatment1, treatment2 in
                        let date1 = self.getTreatmentDate(treatment1)
                        let date2 = self.getTreatmentDate(treatment2)
                        return date1 > date2
                    }
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func isNightscoutConfigured() -> Bool {
        let settings = nightscoutService.getSettings()
        return !settings.url.isEmpty && !settings.apiToken.isEmpty
    }
}

struct TreatmentRow: View {
    let treatment: NightscoutTreatment
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: treatmentIcon)
                .font(.title2)
                .foregroundColor(treatmentColor)
                .frame(width: 30)
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                Text(treatmentDescription)
                    .font(.body)
                    .foregroundColor(.primary)
                
                Text(formatTimeFromTreatment(treatment))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
    
    private var treatmentIcon: String {
        if let insulin = treatment.insulin, insulin > 0 {
            return "syringe.fill"
        } else if let carbs = treatment.carbs, carbs > 0 {
            return "fork.knife"
        } else if treatment.eventType == "Temp Basal" {
            return "timer"
        } else if treatment.eventType == "Exercise" {
            return "person.circle.fill"
        } else {
            return "pills.fill"
        }
    }
    
    private var treatmentColor: Color {
        if let insulin = treatment.insulin, insulin > 0 {
            return .blue
        } else if let carbs = treatment.carbs, carbs > 0 {
            return .green
        } else if treatment.eventType == "Temp Basal" {
            return .orange
        } else if treatment.eventType == "Exercise" {
            return .purple
        } else {
            return .gray
        }
    }
    
    private var treatmentDescription: String {
        var parts: [String] = []
        
        if let insulin = treatment.insulin, insulin > 0 {
            parts.append("\(String(format: "%.1f", insulin))U insulin")
        }
        
        if let carbs = treatment.carbs, carbs > 0 {
            parts.append("\(String(format: "%.0f", carbs))g carbs")
        }
        
        // Handle Temp Basal treatments
        if treatment.eventType == "Temp Basal" {
            if let rate = treatment.rate, let duration = treatment.duration {
                parts.append("\(String(format: "%.1f", rate))U/hr for \(duration)min")
            } else if let rate = treatment.rate {
                parts.append("\(String(format: "%.1f", rate))U/hr")
            } else if let duration = treatment.duration {
                parts.append("Temp Basal for \(duration)min")
            } else {
                parts.append("Temp Basal")
            }
        }
        // Handle Profile treatments (Exercise)
        else if treatment.eventType == "Exercise" {
            if let notes = treatment.notes, !notes.isEmpty {
                parts.append("Profile: \(notes)")
            } else {
                parts.append("Profile")
            }
        }
        // Handle other event types
        else if let eventType = treatment.eventType {
            parts.append(displayEventType(eventType))
        }
        
        // Add notes for other treatments if available
        if let notes = treatment.notes, !notes.isEmpty, treatment.eventType != "Exercise" {
            parts.append(notes)
        }
        
        return parts.joined(separator: " • ")
    }
    
    private func displayEventType(_ eventType: String) -> String {
        return eventType == "Exercise" ? "Profile" : eventType
    }
    
    private func formatTimeFromTreatment(_ treatment: NightscoutTreatment) -> String {
        if let mills = treatment.mills, mills > 0 {
            let date = Date(timeIntervalSince1970: Double(mills) / 1000)
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d, HH:mm"
            return formatter.string(from: date)
        } else if let created_at = treatment.created_at {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            dateFormatter.timeZone = TimeZone(abbreviation: "UTC")
            if let date = dateFormatter.date(from: created_at) {
                let formatter = DateFormatter()
                formatter.dateFormat = "MMM d, HH:mm"
                return formatter.string(from: date)
            }
        }
        return "Unknown"
    }
}

#Preview {
    TreatmentsView()
}
