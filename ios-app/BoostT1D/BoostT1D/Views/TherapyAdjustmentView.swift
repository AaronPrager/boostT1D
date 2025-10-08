import SwiftUI

struct TherapyAdjustmentView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @State private var selectedTimeRange: Int = 3
    @State private var suggestions: [AdjustmentSuggestion] = []
    @State private var metrics: AnalysisMetrics = AnalysisMetrics()
    @State private var glucoseEntries: [NightscoutGlucoseEntry] = []
    @State private var treatments: [NightscoutTreatment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    private let timeRangeOptions = [3, 7]
    private let timeRangeLabels = ["3 days", "7 days"]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 50))
                        .foregroundColor(.orange)
                    
                    Text("Therapy Dose Adjustments")
                        .font(.title)
                        .fontWeight(.semibold)
                }
                .padding(.top, 20)
                
                // Time Range Selection
                VStack(spacing: 12) {
                    HStack {
                        Text("Analysis Period")
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
                
                // Analysis Metrics
                VStack(spacing: 16) {
                    Text("Analysis Metrics")
                        .font(.headline)
                    
                    HStack(spacing: 20) {
                        MetricCard(title: "Average BG", value: "\(metrics.averageGlucose)", unit: "mg/dL", color: .blue)
                        MetricCard(title: "Time in Range", value: "\(metrics.timeInRange)", unit: "%", color: .green)
                    }
                    
                    HStack(spacing: 20) {
                        MetricCard(title: "Est. A1C", value: String(format: "%.1f", estimatedA1C), unit: "%", color: .orange)
                        MetricCard(title: "Data Points", value: "\(metrics.dataPoints)", unit: "readings", color: .purple)
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Safety Warnings
                if !safetyWarnings.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Safety Warnings")
                            .font(.headline)
                            .foregroundColor(.red)
                        
                        ForEach(safetyWarnings, id: \.self) { warning in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.red)
                                    .font(.caption)
                                
                                Text(warning)
                                    .font(.caption)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color.red.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }
                
                // Adjustment Suggestions
                VStack(spacing: 16) {
                    Text("Adjustment Suggestions")
                        .font(.headline)
                    
                    if isLoading {
                        VStack(spacing: 12) {
                            ProgressView()
                                .scaleEffect(1.2)
                            
                            Text("Analyzing your data...")
                                .font(.headline)
                            
                            Text("Please wait while we analyze your glucose patterns and generate personalized suggestions.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    } else if let errorMessage = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 40))
                                .foregroundColor(.orange)
                            
                            Text("Analysis Error")
                                .font(.headline)
                            
                            Text(errorMessage)
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    } else if suggestions.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "lightbulb")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            
                            Text("No Suggestions Available")
                                .font(.headline)
                            
                            Text("Your glucose control looks good! No adjustments needed based on the current data.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(suggestions, id: \.id) { suggestion in
                                AdjustmentCard(suggestion: suggestion)
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // Important Disclaimer
                VStack(alignment: .leading, spacing: 8) {
                    Text("Important Disclaimer")
                        .font(.headline)
                        .foregroundColor(.orange)
                    
                    Text("These suggestions are for informational purposes only and should not replace professional medical advice. Always consult with your healthcare provider before making any changes to your diabetes management.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding(16)
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Therapy Adjustments")
        .navigationBarItems(trailing: Button(action: {
            loadSuggestions()
        }) {
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.blue)
        })
        .onAppear {
            loadSuggestions()
        }
        .onChange(of: selectedTimeRange) {
            loadSuggestions()
        }
    }
    
    private var estimatedA1C: Double {
        return (Double(metrics.averageGlucose) + 46.7) / 28.7
    }
    
    private var safetyWarnings: [String] {
        var warnings: [String] = []
        
        if metrics.averageGlucose > 200 {
            warnings.append("Average glucose is high. Consider consulting your healthcare provider.")
        }
        
        if metrics.timeInRange < 70 {
            warnings.append("Time in range is below target. Review your diabetes management plan.")
        }
        
        if metrics.dataPoints < 50 {
            warnings.append("Limited data available. More readings needed for reliable analysis.")
        }
        
        return warnings
    }
    
    private func loadSuggestions() {
        isLoading = true
        errorMessage = nil
        
        // Load glucose data
        nightscoutService.fetchGlucoseEntries(hours: selectedTimeRange * 24) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let glucoseData):
                    self.glucoseEntries = glucoseData
                    self.loadTreatments()
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    private func loadTreatments() {
        // Load treatment data
        nightscoutService.fetchTreatments(settings: nightscoutService.settings, hours: selectedTimeRange * 24) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let treatmentData):
                    self.treatments = treatmentData
                    self.analyzeDataAndGenerateSuggestions()
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    private func analyzeDataAndGenerateSuggestions() {
        // Calculate real metrics from glucose data
        let settings = nightscoutService.settings
        metrics = calculateRealMetrics(glucoseEntries: glucoseEntries, lowGlucose: settings.lowGlucose, highGlucose: settings.highGlucose)
        
        // Generate real suggestions based on analysis
        suggestions = generateRealSuggestions(glucoseEntries: glucoseEntries, treatments: treatments, lowGlucose: settings.lowGlucose, highGlucose: settings.highGlucose)
        
        isLoading = false
    }
    
    private func calculateRealMetrics(glucoseEntries: [NightscoutGlucoseEntry], lowGlucose: Double, highGlucose: Double) -> AnalysisMetrics {
        guard !glucoseEntries.isEmpty else {
            return AnalysisMetrics()
        }
        
        let glucoseValues = glucoseEntries.map { Double($0.sgv) }
        let averageGlucose = glucoseValues.reduce(0, +) / Double(glucoseValues.count)
        
        // Calculate time in range
        let inRangeCount = glucoseValues.filter { $0 >= lowGlucose && $0 <= highGlucose }.count
        let timeInRange = Double(inRangeCount) / Double(glucoseValues.count) * 100
        
        return AnalysisMetrics(
            averageGlucose: Int(averageGlucose),
            timeInRange: Int(timeInRange),
            dataPoints: glucoseValues.count,
            analysisPeriod: "\(selectedTimeRange) days"
        )
    }
    
    private func generateRealSuggestions(glucoseEntries: [NightscoutGlucoseEntry], treatments: [NightscoutTreatment], lowGlucose: Double, highGlucose: Double) -> [AdjustmentSuggestion] {
        var suggestions: [AdjustmentSuggestion] = []
        
        // Analyze glucose patterns by time of day
        let timeSlotAnalysis = analyzeTimeSlots(glucoseEntries: glucoseEntries, lowGlucose: lowGlucose, highGlucose: highGlucose)
        
        // Analyze treatment patterns
        let treatmentAnalysis = analyzeTreatmentPatterns(treatments: treatments)
        
        // Generate suggestions based on glucose patterns
        for (timeSlot, analysis) in timeSlotAnalysis {
            if analysis.dataPoints < 5 {
                continue // Skip time slots with insufficient data
            }
            
            if analysis.averageGlucose > highGlucose + 15 {
                // High glucose pattern - suggest small basal increase
                let adjustmentPercent = min(5, max(2, Int((analysis.averageGlucose - highGlucose) / 20)))
                suggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .basalRate,
                    timeSlot: timeSlot,
                    currentValue: 1.0, // Default - would need to get from user profile
                    suggestedValue: 1.0 * (1.0 + Double(adjustmentPercent) / 100.0),
                    priority: .medium,
                    reasoning: "Average glucose \(Int(analysis.averageGlucose)) mg/dL is \(Int(analysis.averageGlucose - highGlucose)) points above target. Consider a small basal rate increase of \(adjustmentPercent)% (0.02-0.05 U/hr) during this period."
                ))
            } else if analysis.averageGlucose < lowGlucose - 8 {
                // Low glucose pattern - suggest small basal decrease
                let adjustmentPercent = min(5, max(2, Int((lowGlucose - analysis.averageGlucose) / 20)))
                suggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .basalRate,
                    timeSlot: timeSlot,
                    currentValue: 1.0,
                    suggestedValue: 1.0 * (1.0 - Double(adjustmentPercent) / 100.0),
                    priority: .medium,
                    reasoning: "Average glucose \(Int(analysis.averageGlucose)) mg/dL is \(Int(lowGlucose - analysis.averageGlucose)) points below target. Consider a small basal rate decrease of \(adjustmentPercent)% (0.02-0.05 U/hr) during this period."
                ))
            }
            
            if analysis.timeInRange < 60 && analysis.dataPoints >= 10 {
                suggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .correctionFactor,
                    timeSlot: timeSlot,
                    currentValue: 50.0, // Default - would need to get from user profile
                    suggestedValue: 48.0, // Small 4% decrease
                    priority: .low,
                    reasoning: "Time in range is \(Int(analysis.timeInRange))% during this period (\(analysis.dataPoints) readings). Consider a small correction factor adjustment of 2-3 points for better control."
                ))
            }
        }
        
        // Generate suggestions based on treatment patterns with insulin timing consideration
        if treatmentAnalysis.frequentCorrections {
            suggestions.append(AdjustmentSuggestion(
                id: UUID(),
                type: .correctionFactor,
                timeSlot: "All Day",
                currentValue: 50.0,
                suggestedValue: 47.0, // Small 6% decrease
                priority: .low,
                reasoning: "Frequent correction doses detected (\(treatmentAnalysis.correctionCount) in \(selectedTimeRange) days). Consider a small correction factor decrease of 2-3 points. Remember insulin takes ~20 minutes to start working."
            ))
        }
        
        if treatmentAnalysis.frequentCarbs {
            suggestions.append(AdjustmentSuggestion(
                id: UUID(),
                type: .carbRatio,
                timeSlot: "Meal Times",
                currentValue: 15.0,
                suggestedValue: 14.0, // Small 7% decrease
                priority: .low,
                reasoning: "Frequent carb treatments detected (\(treatmentAnalysis.carbCount) in \(selectedTimeRange) days). Consider a small carb ratio adjustment of 1-2 points. Pre-bolus 15-20 minutes before meals for better control."
            ))
        }
        
        // Add insulin timing-specific suggestions
        let timingAnalysis = analyzeInsulinTiming(glucoseEntries: glucoseEntries, treatments: treatments)
        if timingAnalysis.needsPreBolus {
            suggestions.append(AdjustmentSuggestion(
                id: UUID(),
                type: .targetGlucose,
                timeSlot: "Meal Times",
                currentValue: 100.0,
                suggestedValue: 100.0,
                priority: .low,
                reasoning: "Post-meal glucose spikes detected. Consider pre-bolusing 15-20 minutes before meals to account for insulin onset time."
            ))
        }
        
        return suggestions
    }
    
    private func analyzeTreatmentPatterns(treatments: [NightscoutTreatment]) -> TreatmentAnalysis {
        let correctionCount = treatments.filter { $0.eventType == "Correction Bolus" || $0.eventType == "Bolus" }.count
        let carbCount = treatments.filter { $0.eventType == "Carb" || $0.eventType == "Meal Bolus" }.count
        let tempBasalCount = treatments.filter { $0.eventType == "Temp Basal" }.count
        
        return TreatmentAnalysis(
            correctionCount: correctionCount,
            carbCount: carbCount,
            tempBasalCount: tempBasalCount,
            frequentCorrections: correctionCount > selectedTimeRange * 3, // More than 3 per day (more conservative)
            frequentCarbs: carbCount > selectedTimeRange * 4, // More than 4 per day (more conservative)
            frequentTempBasals: tempBasalCount > selectedTimeRange * 2 // More than 2 per day (more conservative)
        )
    }
    
    private func analyzeInsulinTiming(glucoseEntries: [NightscoutGlucoseEntry], treatments: [NightscoutTreatment]) -> InsulinTimingAnalysis {
        var postMealSpikes = 0
        var totalMeals = 0
        
        // Look for carb treatments and check glucose response 1-2 hours later
        for treatment in treatments {
            if treatment.eventType == "Carb" || treatment.eventType == "Meal Bolus" {
                totalMeals += 1
                let treatmentTime = Date(timeIntervalSince1970: Double(treatment.date) / 1000)
                
                // Check glucose levels 60-120 minutes after meal
                let checkStartTime = treatmentTime.addingTimeInterval(60 * 60) // 1 hour
                let checkEndTime = treatmentTime.addingTimeInterval(120 * 60) // 2 hours
                
                let postMealReadings = glucoseEntries.filter { entry in
                    let entryTime = Date(timeIntervalSince1970: Double(entry.date) / 1000)
                    return entryTime >= checkStartTime && entryTime <= checkEndTime
                }
                
                if let maxGlucose = postMealReadings.map({ Double($0.sgv) }).max(),
                   maxGlucose > 180 { // Significant post-meal spike
                    postMealSpikes += 1
                }
            }
        }
        
        let spikeRate = totalMeals > 0 ? Double(postMealSpikes) / Double(totalMeals) : 0
        
        return InsulinTimingAnalysis(
            postMealSpikes: postMealSpikes,
            totalMeals: totalMeals,
            spikeRate: spikeRate,
            needsPreBolus: spikeRate > 0.3 // More than 30% of meals cause spikes
        )
    }
    
    private func analyzeTimeSlots(glucoseEntries: [NightscoutGlucoseEntry], lowGlucose: Double, highGlucose: Double) -> [String: TimeSlotAnalysis] {
        var timeSlotData: [String: [Double]] = [:]
        
        // Group glucose readings by time slots
        for entry in glucoseEntries {
            let date = Date(timeIntervalSince1970: Double(entry.date) / 1000)
            let calendar = Calendar.current
            let hour = calendar.component(.hour, from: date)
            
            let timeSlot = getTimeSlot(for: hour)
            if timeSlotData[timeSlot] == nil {
                timeSlotData[timeSlot] = []
            }
            timeSlotData[timeSlot]?.append(Double(entry.sgv))
        }
        
        // Analyze each time slot
        var analysis: [String: TimeSlotAnalysis] = [:]
        for (timeSlot, glucoseValues) in timeSlotData {
            let averageGlucose = glucoseValues.reduce(0, +) / Double(glucoseValues.count)
            let inRangeCount = glucoseValues.filter { $0 >= lowGlucose && $0 <= highGlucose }.count
            let timeInRange = Double(inRangeCount) / Double(glucoseValues.count) * 100
            
            analysis[timeSlot] = TimeSlotAnalysis(
                averageGlucose: averageGlucose,
                timeInRange: timeInRange,
                dataPoints: glucoseValues.count
            )
        }
        
        return analysis
    }
    
    private func getTimeSlot(for hour: Int) -> String {
        switch hour {
        case 0..<6: return "00:00-06:00"
        case 6..<12: return "06:00-12:00"
        case 12..<18: return "12:00-18:00"
        default: return "18:00-24:00"
        }
    }
    
    private func createMockSuggestions(for days: Int) -> [AdjustmentSuggestion] {
        let baseSuggestions = [
            AdjustmentSuggestion(
                id: UUID(),
                type: .basalRate,
                timeSlot: "00:00-06:00",
                currentValue: 0.8,
                suggestedValue: 0.9,
                priority: .medium,
                reasoning: "Nighttime glucose levels tend to rise. Consider increasing basal rate by 0.1U/hr during this period."
            ),
            AdjustmentSuggestion(
                id: UUID(),
                type: .carbRatio,
                timeSlot: "12:00-14:00",
                currentValue: 15.0,
                suggestedValue: 12.0,
                priority: .high,
                reasoning: "Post-lunch glucose spikes observed. Reduce carb ratio to better match insulin needs."
            )
        ]
        
        if days >= 7 {
            return baseSuggestions + [
                AdjustmentSuggestion(
                    id: UUID(),
                    type: .correctionFactor,
                    timeSlot: "18:00-22:00",
                    currentValue: 50.0,
                    suggestedValue: 45.0,
                    priority: .low,
                    reasoning: "Evening correction factor may be too conservative based on 7-day analysis."
                )
            ]
        }
        
        return baseSuggestions
    }
    
    private func createMockMetrics(for days: Int) -> AnalysisMetrics {
        return AnalysisMetrics(
            averageGlucose: days >= 7 ? 145 : 152,
            timeInRange: days >= 7 ? 78 : 72,
            dataPoints: days >= 7 ? 168 : 72,
            analysisPeriod: "\(days) days"
        )
    }
}

struct MetricCard: View {
    let title: String
    let value: String
    let unit: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
            
            HStack(alignment: .bottom, spacing: 2) {
                Text(value)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(color)
                
                Text(unit)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct AdjustmentCard: View {
    let suggestion: AdjustmentSuggestion
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(suggestion.timeSlot)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                Text(suggestion.priority.rawValue.uppercased())
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(priorityColor(suggestion.priority))
            }
            
            HStack {
                Text(suggestion.type.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .frame(width: 100, alignment: .leading)
                
                Text("\(String(format: "%.2f", suggestion.currentValue)) → \(String(format: "%.2f", suggestion.suggestedValue))")
                    .font(.subheadline)
                    .foregroundColor(.primary)
                
                Spacer()
            }
            
            Text(suggestion.reasoning)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
    
    private func priorityColor(_ priority: Priority) -> Color {
        switch priority {
        case .high: return .red
        case .medium: return .orange
        case .low: return .green
        }
    }
}

// MARK: - Data Models
struct AdjustmentSuggestion {
    let id: UUID
    let type: AdjustmentType
    let timeSlot: String
    let currentValue: Double
    let suggestedValue: Double
    let priority: Priority
    let reasoning: String
}

enum AdjustmentType {
    case basalRate
    case carbRatio
    case correctionFactor
    case targetGlucose
    
    var displayName: String {
        switch self {
        case .basalRate: return "Basal Rate"
        case .carbRatio: return "Carb Ratio"
        case .correctionFactor: return "Correction Factor"
        case .targetGlucose: return "Target Glucose"
        }
    }
}

enum Priority: String, CaseIterable {
    case high = "High"
    case medium = "Medium"
    case low = "Low"
}

struct AnalysisMetrics {
    let averageGlucose: Int
    let timeInRange: Int
    let dataPoints: Int
    let analysisPeriod: String
    
    init(averageGlucose: Int = 0, timeInRange: Int = 0, dataPoints: Int = 0, analysisPeriod: String = "") {
        self.averageGlucose = averageGlucose
        self.timeInRange = timeInRange
        self.dataPoints = dataPoints
        self.analysisPeriod = analysisPeriod
    }
}

struct TimeSlotAnalysis {
    let averageGlucose: Double
    let timeInRange: Double
    let dataPoints: Int
}

struct TreatmentAnalysis {
    let correctionCount: Int
    let carbCount: Int
    let tempBasalCount: Int
    let frequentCorrections: Bool
    let frequentCarbs: Bool
    let frequentTempBasals: Bool
}

struct InsulinTimingAnalysis {
    let postMealSpikes: Int
    let totalMeals: Int
    let spikeRate: Double
    let needsPreBolus: Bool
}

#Preview {
    TherapyAdjustmentView()
}
