import SwiftUI

struct TherapyAdjustmentView: View {
    @State private var selectedTimeRange: Int = 3
    @State private var suggestions: [AdjustmentSuggestion] = []
    @State private var metrics: AnalysisMetrics = AnalysisMetrics()
    
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
                    
                    if suggestions.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "lightbulb")
                                .font(.system(size: 40))
                                .foregroundColor(.gray)
                            
                            Text("No Suggestions Available")
                                .font(.headline)
                            
                            Text("Insufficient data for analysis. Please ensure you have glucose readings for the selected period.")
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
        .onChange(of: selectedTimeRange) { _ in
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
        // Generate mock suggestions based on time range
        suggestions = createMockSuggestions(for: selectedTimeRange)
        metrics = createMockMetrics(for: selectedTimeRange)
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

enum Priority {
    case high
    case medium
    case low
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

#Preview {
    TherapyAdjustmentView()
}
