import SwiftUI

struct TherapyAdjustmentView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @StateObject private var apiService = APIService.shared
    @StateObject private var localDataService = LocalDataService.shared
    @State private var selectedTimeRange: Int = 3
    @State private var suggestions: [AdjustmentSuggestion] = []
    @State private var metrics: AnalysisMetrics = AnalysisMetrics()
    @State private var glucoseEntries: [NightscoutGlucoseEntry] = []
    @State private var treatments: [NightscoutTreatment] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var analysisMethod: AnalysisMethod = .ruleBased
    @State private var aiConfidence: Double = 0.0
    @State private var keyFindings: [String] = []
    @State private var safetyNotes: [String] = []
    @State private var showDisclaimer = true
    @State private var useAIAnalysis = false // Start with manual mode by default
    @State private var isClosedLoopSystem = false
    
    private let timeRangeOptions = [3, 7]
    private let timeRangeLabels = ["3 days", "7 days"]
    
    var body: some View {
        ZStack {
            if showDisclaimer {
                // Disclaimer Popup
                Color.black.opacity(0.8)
                    .ignoresSafeArea()
                
                VStack(spacing: 16) {
                    // Warning Icon
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.red)
                    
                    // Title
                    Text("⚠️ MEDICAL DISCLAIMER")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                    
                    // Scrollable Disclaimer Text
                    ScrollView {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("The therapy adjustment suggestions provided by this app are:")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.primary)
                            
                            VStack(alignment: .leading, spacing: 6) {
                                HStack(alignment: .top, spacing: 6) {
                                    Text("•")
                                        .foregroundColor(.red)
                                        .fontWeight(.bold)
                                    Text("FOR INFORMATIONAL PURPOSES ONLY")
                                        .fontWeight(.semibold)
                                        .foregroundColor(.red)
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top, spacing: 6) {
                                    Text("•")
                                        .foregroundColor(.red)
                                        .fontWeight(.bold)
                                    Text("NOT a substitute for professional medical advice")
                                        .foregroundColor(.primary)
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top, spacing: 6) {
                                    Text("•")
                                        .foregroundColor(.red)
                                        .fontWeight(.bold)
                                    Text("NOT intended to replace consultation with your healthcare provider")
                                        .foregroundColor(.primary)
                                        .font(.caption)
                                }
                                
                                HStack(alignment: .top, spacing: 6) {
                                    Text("•")
                                        .foregroundColor(.red)
                                        .fontWeight(.bold)
                                    Text("Based on general patterns and may not apply to your specific situation")
                                        .foregroundColor(.primary)
                                        .font(.caption)
                                }
                            }
                            
                            Text("Always consult with your healthcare provider before making any changes to your diabetes management plan.")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                                .multilineTextAlignment(.center)
                                .padding(.top, 8)
                        }
                        .padding(16)
                    }
                    .frame(maxHeight: 300)
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(radius: 10)
                    
                    // Action Buttons
                    VStack(spacing: 10) {
                        Button(action: {
                            showDisclaimer = false
                            loadSuggestions()
                        }) {
                            Text("I UNDERSTAND AND AGREE")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color.red)
                                .cornerRadius(8)
                        }
                        
                        Button(action: {
                            // Dismiss the view
                            if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                               let window = windowScene.windows.first {
                                window.rootViewController?.dismiss(animated: true)
                            }
                        }) {
                            Text("CANCEL")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundColor(.red)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .background(Color(.systemGray5))
                                .cornerRadius(8)
                        }
                    }
                }
                .padding(20)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(radius: 20)
                .padding(.horizontal, 20)
            } else {
                // Main Content
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 30))
                        .foregroundColor(.orange)
                }
                .padding(.top, 20)
                
                // Analysis Settings
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
                    
                    Divider()
                    
                    // Closed Loop System Toggle
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Closed Loop System")
                                .font(.headline)
                                .foregroundColor(.primary)
                            Text(isClosedLoopSystem ? "Loop/OpenAPS/AAPS active" : "Manual insulin management")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Toggle("", isOn: $isClosedLoopSystem)
                            .labelsHidden()
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
                        MetricCard(title: "Variability", value: String(format: "%.0f", metrics.coefficientOfVariation), unit: "% CV", color: glucoseVariabilityColor)
                    }
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
                .padding(.horizontal, 20)
                
                // AI Key Findings
                if analysisMethod == .ai && !keyFindings.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "sparkles")
                                .foregroundColor(.blue)
                            Text("AI Key Findings")
                            .font(.headline)
                                .foregroundColor(.blue)
                        }
                        
                        ForEach(keyFindings, id: \.self) { finding in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.blue)
                                    .font(.caption)
                                
                                Text(finding)
                                    .font(.caption)
                                    .foregroundColor(.primary)
                            }
                        }
                    }
                    .padding(16)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }
                
                // Safety Notes
                if !safetyWarnings.isEmpty || (analysisMethod == .ai && !safetyNotes.isEmpty) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Safety Notes")
                            .font(.headline)
                            .foregroundColor(.orange)
                        
                        ForEach(safetyWarnings, id: \.self) { warning in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.orange)
                                    .font(.caption)
                                
                                Text(warning)
                                    .font(.caption)
                                    .foregroundColor(.orange)
                            }
                        }
                        
                        if analysisMethod == .ai {
                            ForEach(safetyNotes, id: \.self) { note in
                                HStack(alignment: .top, spacing: 8) {
                                    Image(systemName: "info.circle.fill")
                                        .foregroundColor(.orange)
                                        .font(.caption)
                                    
                                    Text(note)
                                        .font(.caption)
                                        .foregroundColor(.orange)
                                }
                            }
                        }
                    }
                    .padding(16)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }
                
                // Closed Loop Info Banner
                if isClosedLoopSystem {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .foregroundColor(.blue)
                            Text("Closed Loop System Active")
                                .font(.headline)
                                .foregroundColor(.blue)
                        }
                        
                        Text("Suggestions focus on baseline profile adjustments. Frequent basal changes from your Loop/OpenAPS/AAPS algorithm are normal and not flagged for adjustment.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(16)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                }
                
                // Adjustment Suggestions
                VStack(spacing: 16) {
                    
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
                            if !isNightscoutConfigured() {
                                // Nightscout not configured - show helpful suggestion
                                Image(systemName: "link.circle")
                                    .font(.system(size: 40))
                                    .foregroundColor(.blue)
                                
                                Text("Connect to Nightscout")
                                    .font(.headline)
                                
                                Text("To get AI-powered therapy recommendations, you need to connect to your Nightscout server. This will allow us to analyze your glucose patterns and suggest personalized adjustments.")
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
                                
                                Text("Analysis Error")
                                    .font(.headline)
                                
                                Text(errorMessage)
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
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
                        LazyVStack(spacing: 20) {
                            // Group suggestions by type
                            ForEach(groupedSuggestions, id: \.type) { group in
                                VStack(alignment: .leading, spacing: 12) {
                                    // Type header
                                    HStack {
                                        Image(systemName: iconForType(group.type))
                                            .foregroundColor(colorForType(group.type))
                                        Text(group.type.displayName)
                                            .font(.subheadline)
                                            .fontWeight(.semibold)
                                            .foregroundColor(colorForType(group.type))
                                        Spacer()
                                        Text("\(group.suggestions.count)")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    .padding(.bottom, 4)
                                    
                                    // Suggestions for this type
                                    ForEach(group.suggestions, id: \.id) { suggestion in
                                AdjustmentCard(suggestion: suggestion)
                                    }
                                }
                                .padding(12)
                                .background(Color(.systemBackground))
                                .cornerRadius(8)
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
                    if !showDisclaimer {
            loadSuggestions()
                    }
        }
        .onChange(of: selectedTimeRange) {
                    if !showDisclaimer {
            loadSuggestions()
                    }
                }
        .onChange(of: isClosedLoopSystem) {
                    if !showDisclaimer {
            loadSuggestions()
                    }
                }
            }
        }
    }
    
    private var groupedSuggestions: [SuggestionGroup] {
        let grouped = Dictionary(grouping: suggestions) { $0.type }
        
        // Sort groups by priority: basal, correction, carb ratio, timing
        let order: [AdjustmentType] = [.basalRate, .correctionFactor, .carbRatio, .targetGlucose]
        
        return order.compactMap { type in
            guard let suggestions = grouped[type], !suggestions.isEmpty else { return nil }
            return SuggestionGroup(type: type, suggestions: suggestions.sorted { $0.priority.rawValue < $1.priority.rawValue })
        }
    }
    
    private func iconForType(_ type: AdjustmentType) -> String {
        switch type {
        case .basalRate: return "drop.fill"
        case .carbRatio: return "fork.knife"
        case .correctionFactor: return "waveform.path.ecg"
        case .targetGlucose: return "clock.fill"
        }
    }
    
    private func colorForType(_ type: AdjustmentType) -> Color {
        switch type {
        case .basalRate: return .blue
        case .carbRatio: return .green
        case .correctionFactor: return .purple
        case .targetGlucose: return .orange
        }
    }
    
    private func confidenceColor(_ confidence: Double) -> Color {
        if confidence >= 0.8 {
            return .green
        } else if confidence >= 0.6 {
            return .orange
        } else {
            return .red
        }
    }
    
    private var estimatedA1C: Double {
        return (Double(metrics.averageGlucose) + 46.7) / 28.7
    }
    
    private var glucoseVariabilityColor: Color {
        let cv = metrics.coefficientOfVariation
        if cv <= 36 {
            return .green // Stable glucose
        } else if cv <= 42 {
            return .orange // Moderate variability
        } else {
            return .red // High variability
        }
    }
    
    private var safetyWarnings: [String] {
        var warnings: [String] = []
        
        if metrics.averageGlucose > 200 {
            warnings.append("Average glucose is high. Consider consulting your healthcare provider.")
        }
        
        if metrics.timeInRange < 70 {
            warnings.append("Time in range is below target. Review your diabetes management plan.")
        }
        
        if metrics.timeBelowRange > 4 {
            warnings.append("Time below range is \(metrics.timeBelowRange)%. Target is <4%. Risk of hypoglycemia - consider reducing insulin doses.")
        }
        
        if metrics.coefficientOfVariation > 36 {
            warnings.append("Glucose variability is high (\(Int(metrics.coefficientOfVariation))% CV). Target is <36%. This indicates unstable glucose control.")
        }
        
        if metrics.dataPoints < 50 {
            warnings.append("Limited data available (\(metrics.dataPoints) readings). More data needed for reliable analysis.")
        }
        
        return warnings
    }
    
    private func loadSuggestions() {
        // Check if in manual mode
        if nightscoutService.settings.isManualMode {
            // Load local data
            glucoseEntries = localDataService.getGlucoseEntriesForTimeRange(hours: selectedTimeRange * 24)
            treatments = localDataService.getTreatmentsForTimeRange(hours: selectedTimeRange * 24)
            analyzeDataAndGenerateSuggestions()
            return
        }
        
        // Otherwise, fetch from Nightscout
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
        
        // Check if user wants AI analysis
        if useAIAnalysis {
            // Try AI first with automatic fallback
            apiService.analyzeTherapyAdjustments(
                glucoseEntries: glucoseEntries,
                treatments: treatments,
                lowGlucose: settings.lowGlucose,
                highGlucose: settings.highGlucose,
                timeRangeDays: selectedTimeRange,
                isClosedLoop: isClosedLoopSystem
            ) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let aiSuggestions):
                        self.suggestions = self.convertAISuggestionsToAdjustments(aiSuggestions.suggestions)
                        self.analysisMethod = .ai
                        self.aiConfidence = aiSuggestions.overallConfidence
                        self.keyFindings = aiSuggestions.keyFindings
                        self.safetyNotes = aiSuggestions.safetyNotes
                    case .failure(let error):
                        // Automatic fallback to rule-based analysis
                        print("AI analysis failed: \(error), using rule-based analysis")
                        self.suggestions = self.generateRealSuggestions(
                            glucoseEntries: self.glucoseEntries,
                            treatments: self.treatments,
                            lowGlucose: settings.lowGlucose,
                            highGlucose: settings.highGlucose,
                            isClosedLoop: self.isClosedLoopSystem
                        )
                        self.analysisMethod = .ruleBased
                        self.aiConfidence = 0.0
                        self.keyFindings = []
                        self.safetyNotes = []
                    }
                    self.isLoading = false
                }
            }
        } else {
            // Use manual rule-based analysis directly
            self.suggestions = self.generateRealSuggestions(
                glucoseEntries: self.glucoseEntries,
                treatments: self.treatments,
                lowGlucose: settings.lowGlucose,
                highGlucose: settings.highGlucose,
                isClosedLoop: self.isClosedLoopSystem
            )
            self.analysisMethod = .ruleBased
            self.aiConfidence = 0.0
            self.keyFindings = []
            self.safetyNotes = []
            self.isLoading = false
        }
    }
    
    private func convertAISuggestionsToAdjustments(_ aiSuggestions: [AISuggestion]) -> [AdjustmentSuggestion] {
        let rawSuggestions = aiSuggestions.map { aiSuggestion in
            let adjustmentType: AdjustmentType
            switch aiSuggestion.type.lowercased() {
            case "basal_rate": adjustmentType = .basalRate
            case "correction_factor": adjustmentType = .correctionFactor
            case "carb_ratio": adjustmentType = .carbRatio
            case "timing": adjustmentType = .targetGlucose
            default: adjustmentType = .basalRate
            }
            
            let priority: Priority
            switch aiSuggestion.priority.lowercased() {
            case "high": priority = .high
            case "medium": priority = .medium
            default: priority = .low
            }
            
            return AdjustmentSuggestion(
                id: UUID(),
                type: adjustmentType,
                timeSlot: aiSuggestion.timeSlot,
                currentValue: aiSuggestion.currentValue,
                suggestedValue: aiSuggestion.suggestedValue,
                priority: priority,
                reasoning: aiSuggestion.reasoning
            )
        }
        
        // Combine consecutive AI suggestions as well
        return combineConsecutiveSuggestions(rawSuggestions)
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
        
        // Calculate time below range
        let belowRangeCount = glucoseValues.filter { $0 < lowGlucose }.count
        let timeBelowRange = Double(belowRangeCount) / Double(glucoseValues.count) * 100
        
        // Calculate coefficient of variation (CV) - measure of glucose variability
        let variance = glucoseValues.map { pow($0 - averageGlucose, 2) }.reduce(0, +) / Double(glucoseValues.count)
        let standardDeviation = sqrt(variance)
        let coefficientOfVariation = (standardDeviation / averageGlucose) * 100
        
        return AnalysisMetrics(
            averageGlucose: Int(averageGlucose),
            timeInRange: Int(timeInRange),
            timeBelowRange: Int(timeBelowRange),
            coefficientOfVariation: coefficientOfVariation,
            dataPoints: glucoseValues.count,
            analysisPeriod: "\(selectedTimeRange) days"
        )
    }
    
    private func generateRealSuggestions(glucoseEntries: [NightscoutGlucoseEntry], treatments: [NightscoutTreatment], lowGlucose: Double, highGlucose: Double, isClosedLoop: Bool = false) -> [AdjustmentSuggestion] {
        var rawSuggestions: [AdjustmentSuggestion] = []
        
        // Analyze glucose patterns by time of day
        let timeSlotAnalysis = analyzeTimeSlots(glucoseEntries: glucoseEntries, lowGlucose: lowGlucose, highGlucose: highGlucose)
        
        // Analyze treatment patterns
        let treatmentAnalysis = analyzeTreatmentPatterns(treatments: treatments)
        
        // Generate suggestions based on glucose patterns
        for (timeSlot, analysis) in timeSlotAnalysis {
            if analysis.dataPoints < 3 {
                continue // Skip time slots with insufficient data (lower threshold for 2-hour windows)
            }
            
            // For closed loop systems, be much more conservative with basal suggestions
            // Only suggest if pattern is very clear and persistent
            let basalThreshold = isClosedLoop ? 25.0 : 15.0 // Higher threshold for closed loop
            let basalMinDataPoints = isClosedLoop ? 10 : 3 // More data required for closed loop
            
            if analysis.averageGlucose > highGlucose + basalThreshold && analysis.dataPoints >= basalMinDataPoints {
                // High glucose pattern - suggest small basal increase
                let adjustmentPercent = min(5, max(2, Int((analysis.averageGlucose - highGlucose) / 20)))
                let pointsAboveTarget = Int(analysis.averageGlucose - highGlucose)
                
                // Determine priority based on severity
                let priority: Priority
                if pointsAboveTarget > 50 {
                    priority = .high // Very high BG
                } else if pointsAboveTarget > 30 {
                    priority = .medium // Moderately high BG
                } else {
                    priority = .low // Slightly high BG
                }
                
                var reasoning = "\(priorityText(priority))\n\n"
                reasoning += "📊 PATTERN ANALYSIS:\n"
                reasoning += "   • Average BG: \(Int(analysis.averageGlucose)) mg/dL\n"
                reasoning += "   • Target: \(Int(highGlucose)) mg/dL\n"
                reasoning += "   • Difference: +\(pointsAboveTarget) mg/dL\n"
                reasoning += "   • Data points: \(analysis.dataPoints) readings\n"
                if isClosedLoop {
                    reasoning += "   • Closed loop active: Only baseline profile adjustment suggested\n"
                }
                reasoning += "\n💉 RECOMMENDATION:\n"
                reasoning += "   Increase basal rate by \(adjustmentPercent)% (approximately 0.02-0.05 U/hr).\n\n"
                reasoning += "📝 WHY THIS WORKS:\n"
                if isClosedLoop {
                    reasoning += "   Your closed loop system is making temporary adjustments, but the persistent pattern suggests your baseline basal profile needs adjustment. This will help the algorithm work more effectively.\n\n"
                } else {
                    reasoning += "   Basal insulin provides background coverage. Since BG is consistently elevated during this time, increasing basal helps maintain stable levels without food.\n\n"
                }
                reasoning += "⚠️ IMPLEMENTATION:\n"
                reasoning += "   Make one small change at a time. Wait 2-3 days to observe the effect before making another adjustment. Always consult your healthcare provider."
                
                rawSuggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .basalRate,
                    timeSlot: timeSlot,
                    currentValue: 1.0, // Default - would need to get from user profile
                    suggestedValue: 1.0 * (1.0 + Double(adjustmentPercent) / 100.0),
                    priority: priority,
                    reasoning: reasoning
                ))
            } else if analysis.averageGlucose < lowGlucose - (isClosedLoop ? 15.0 : 8.0) && analysis.dataPoints >= basalMinDataPoints {
                // Low glucose pattern - suggest small basal decrease
                let adjustmentPercent = min(5, max(2, Int((lowGlucose - analysis.averageGlucose) / 20)))
                let pointsBelowTarget = Int(lowGlucose - analysis.averageGlucose)
                
                // HIGH priority for low BG - safety critical!
                let priority: Priority = pointsBelowTarget > 10 ? .high : .medium
                
                var reasoning = "\(priorityText(priority))\n\n"
                reasoning += "📊 PATTERN ANALYSIS:\n"
                reasoning += "   • Average BG: \(Int(analysis.averageGlucose)) mg/dL\n"
                reasoning += "   • Target: \(Int(lowGlucose)) mg/dL\n"
                reasoning += "   • Difference: -\(pointsBelowTarget) mg/dL\n"
                reasoning += "   • Data points: \(analysis.dataPoints) readings\n"
                if isClosedLoop {
                    reasoning += "   • Closed loop active: Baseline profile adjustment needed\n"
                }
                reasoning += "\n💉 RECOMMENDATION:\n"
                reasoning += "   Decrease basal rate by \(adjustmentPercent)% (approximately 0.02-0.05 U/hr).\n\n"
                reasoning += "📝 WHY THIS WORKS:\n"
                if isClosedLoop {
                    reasoning += "   Your closed loop system is suspending or reducing insulin, but the persistent low pattern suggests your baseline basal profile is too aggressive. Lowering it will help prevent lows and reduce algorithm interventions.\n\n"
                } else {
                    reasoning += "   Your basal insulin may be too high during this period, causing BG to drift low. Reducing basal prevents unnecessary lows while maintaining coverage.\n\n"
                }
                reasoning += "⚠️ IMPLEMENTATION:\n"
                reasoning += "   Make one small change at a time. Wait 2-3 days to observe the effect before making another adjustment. Always consult your healthcare provider."
                
                rawSuggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .basalRate,
                    timeSlot: timeSlot,
                    currentValue: 1.0,
                    suggestedValue: 1.0 * (1.0 - Double(adjustmentPercent) / 100.0),
                    priority: priority,
                    reasoning: reasoning
                ))
            }
            
            if analysis.timeInRange < 60 && analysis.dataPoints >= 6 {
                var reasoning = "\(priorityText(.low))\n\n"
                reasoning += "📊 PATTERN ANALYSIS:\n"
                reasoning += "   • Time in range: \(Int(analysis.timeInRange))%\n"
                reasoning += "   • Target: 70%+\n"
                reasoning += "   • Data points: \(analysis.dataPoints) readings\n\n"
                reasoning += "💉 RECOMMENDATION:\n"
                reasoning += "   Adjust correction factor by 2-3 points (from 1:50 to 1:47-48).\n\n"
                reasoning += "📝 WHY THIS WORKS:\n"
                reasoning += "   Correction factor (ISF) determines how much 1 unit of insulin lowers BG. If you're spending too much time out of range during this period, your correction doses may not be strong enough.\n\n"
                reasoning += "⚠️ IMPLEMENTATION:\n"
                reasoning += "   Test this adjustment carefully with correction doses during this time window. Monitor for 2-3 days before making further changes."
                
                rawSuggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .correctionFactor,
                    timeSlot: timeSlot,
                    currentValue: 50.0, // Default - would need to get from user profile
                    suggestedValue: 48.0, // Small 4% decrease
                    priority: .low,
                    reasoning: reasoning
                ))
            }
        }
        
        // Combine consecutive time slots with same adjustment
        var suggestions = combineConsecutiveSuggestions(rawSuggestions)
        
        // Analyze correction effectiveness by time of day
        let correctionAnalysis = analyzeCorrectionEffectiveness(glucoseEntries: glucoseEntries, treatments: treatments)
        
        // Generate time-specific ISF suggestions based on actual correction effectiveness
        for (timeSlot, effectiveness) in correctionAnalysis {
            // Need at least 3 corrections in a time slot to make a suggestion
            guard effectiveness.correctionCount >= 3 else { continue }
            
            let avgActualISF = effectiveness.avgActualISF
            let assumedISF = 50.0 // Default assumption - ideally get from profile
            
            // If actual ISF is significantly different from assumed, suggest adjustment
            let difference = abs(avgActualISF - assumedISF)
            let percentDiff = (difference / assumedISF) * 100
            
            if percentDiff > 10 { // More than 10% difference
                let suggestedISF = avgActualISF * 0.95 // Be conservative, adjust by 95% of measured
                let adjustmentPercent = Int(abs((suggestedISF - assumedISF) / assumedISF * 100))
                
                // Assign priority based on severity
                let priority: Priority
                if percentDiff > 30 {
                    priority = .high // Large discrepancy
                } else if percentDiff > 20 {
                    priority = .medium // Moderate discrepancy
                } else {
                    priority = .low // Small discrepancy
                }
                
                var reasoning = "\(priorityText(priority))\n\n"
                reasoning += "📊 PATTERN ANALYSIS:\n"
                reasoning += "   • Corrections in this time: \(effectiveness.correctionCount)\n"
                reasoning += "   • Measured ISF: 1:\(Int(avgActualISF)) mg/dL per unit\n"
                reasoning += "   • Current setting: 1:\(Int(assumedISF)) mg/dL per unit\n"
                reasoning += "   • Difference: \(Int(percentDiff))%\n\n"
                reasoning += "💉 RECOMMENDATION:\n"
                if avgActualISF < assumedISF {
                    reasoning += "   Your insulin is MORE effective during this time.\n"
                    reasoning += "   Adjust ISF from 1:\(Int(assumedISF)) to 1:\(Int(suggestedISF)) (stronger).\n\n"
                } else {
                    reasoning += "   Your insulin is LESS effective during this time.\n"
                    reasoning += "   Adjust ISF from 1:\(Int(assumedISF)) to 1:\(Int(suggestedISF)) (weaker).\n\n"
                }
                reasoning += "📝 WHY THIS WORKS:\n"
                reasoning += "   Based on \(effectiveness.correctionCount) actual corrections, your insulin sensitivity varies by time of day. Dawn phenomenon, exercise, stress, and hormones all affect insulin action.\n\n"
                reasoning += "⏱️ TIMING TIP:\n"
                reasoning += "   Insulin peaks 60-90 minutes after dosing. We measured BG change 2-3 hours after corrections to get accurate ISF.\n\n"
                reasoning += "⚠️ IMPLEMENTATION:\n"
                reasoning += "   Test this carefully over 3-4 days. Monitor corrections during this time window before making further changes."
                
                rawSuggestions.append(AdjustmentSuggestion(
                    id: UUID(),
                    type: .correctionFactor,
                    timeSlot: timeSlot,
                    currentValue: assumedISF,
                    suggestedValue: suggestedISF,
                    priority: priority,
                    reasoning: reasoning
                ))
            }
        }
        
        // Re-combine with new correction factor suggestions
        suggestions = combineConsecutiveSuggestions(rawSuggestions)
        
        if treatmentAnalysis.frequentCarbs {
            let carbsPerDay = Double(treatmentAnalysis.carbCount) / Double(selectedTimeRange)
            
            // Assign priority based on frequency
            let priority: Priority
            if carbsPerDay > 6 {
                priority = .high // Very frequent carb treatments
            } else if carbsPerDay > 5 {
                priority = .medium // Moderately frequent
            } else {
                priority = .low // Less frequent
            }
            
            var reasoning = "\(priorityText(priority))\n\n"
            reasoning += "📊 PATTERN ANALYSIS:\n"
            reasoning += "   • Carb treatments: \(treatmentAnalysis.carbCount) in \(selectedTimeRange) days\n"
            reasoning += "   • Average: \(String(format: "%.1f", carbsPerDay)) per day\n\n"
            reasoning += "💉 RECOMMENDATION:\n"
            reasoning += "   Adjust carb ratio by 1-2 points (from 1:15 to 1:13-14).\n\n"
            reasoning += "📝 WHY THIS WORKS:\n"
            reasoning += "   Your carb ratio determines how much insulin covers your food. If you're frequently treating high BG after meals, your carb ratio may need strengthening.\n\n"
            reasoning += "⏱️ TIMING TIP:\n"
            reasoning += "   Pre-bolus 15-20 minutes before meals. This gives insulin time to start working when carbs hit your bloodstream, preventing post-meal spikes.\n\n"
            reasoning += "⚠️ IMPLEMENTATION:\n"
            reasoning += "   Change one meal at a time (breakfast, lunch, or dinner). Wait 3-4 days to see the pattern before adjusting other meals."
            
            suggestions.append(AdjustmentSuggestion(
                id: UUID(),
                type: .carbRatio,
                timeSlot: "Meal Times",
                currentValue: 15.0,
                suggestedValue: 14.0, // Small 7% decrease
                priority: priority,
                reasoning: reasoning
            ))
        }
        
        // Add insulin timing-specific suggestions
        let timingAnalysis = analyzeInsulinTiming(glucoseEntries: glucoseEntries, treatments: treatments)
        if timingAnalysis.needsPreBolus {
            // Assign priority based on spike frequency
            let priority: Priority
            if timingAnalysis.spikeRate > 0.6 {
                priority = .medium // Very frequent spikes
            } else {
                priority = .low // Occasional spikes
            }
            
            var reasoning = "\(priorityText(priority))\n\n"
            reasoning += "📊 PATTERN ANALYSIS:\n"
            reasoning += "   • Post-meal spikes: \(timingAnalysis.postMealSpikes) out of \(timingAnalysis.totalMeals) meals\n"
            reasoning += "   • Spike rate: \(Int(timingAnalysis.spikeRate * 100))%\n\n"
            reasoning += "⏱️ RECOMMENDATION:\n"
            reasoning += "   Pre-bolus 15-20 minutes before meals.\n\n"
            reasoning += "📝 WHY THIS WORKS:\n"
            reasoning += "   Insulin takes time to start working:\n"
            reasoning += "   • Onset: ~15-20 minutes\n"
            reasoning += "   • Peak effect: 60-90 minutes\n"
            reasoning += "   • Duration: 3-4 hours\n\n"
            reasoning += "   By dosing before eating, insulin starts working when carbs begin digesting, preventing the initial spike.\n\n"
            reasoning += "⚠️ IMPLEMENTATION:\n"
            reasoning += "   Start with 15 minutes for familiar meals. Adjust timing based on results. Be careful with high-protein or high-fat meals that digest slower."
            
            suggestions.append(AdjustmentSuggestion(
                id: UUID(),
                type: .targetGlucose,
                timeSlot: "Meal Times",
                currentValue: 100.0,
                suggestedValue: 100.0,
                priority: priority,
                reasoning: reasoning
            ))
        }
        
        return suggestions
    }
    
    private func combineConsecutiveSuggestions(_ rawSuggestions: [AdjustmentSuggestion]) -> [AdjustmentSuggestion] {
        guard !rawSuggestions.isEmpty else { return [] }
        
        // Define time slot order for consecutive detection
        let timeSlotOrder = [
            "00:00-02:00", "02:00-04:00", "04:00-06:00", "06:00-08:00",
            "08:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00",
            "16:00-18:00", "18:00-20:00", "20:00-22:00", "22:00-24:00"
        ]
        
        // Group by type, current value, suggested value, and priority
        var grouped: [String: [AdjustmentSuggestion]] = [:]
        for suggestion in rawSuggestions {
            let key = "\(suggestion.type)_\(suggestion.currentValue)_\(suggestion.suggestedValue)_\(suggestion.priority)"
            if grouped[key] == nil {
                grouped[key] = []
            }
            grouped[key]?.append(suggestion)
        }
        
        var combined: [AdjustmentSuggestion] = []
        
        for (_, suggestions) in grouped {
            // Sort by time slot
            let sorted = suggestions.sorted { s1, s2 in
                let idx1 = timeSlotOrder.firstIndex(of: s1.timeSlot) ?? 999
                let idx2 = timeSlotOrder.firstIndex(of: s2.timeSlot) ?? 999
                return idx1 < idx2
            }
            
            // Find consecutive sequences
            var i = 0
            while i < sorted.count {
                var consecutiveGroup: [AdjustmentSuggestion] = [sorted[i]]
                var j = i + 1
                
                // Check for consecutive time slots
                while j < sorted.count {
                    let currentIdx = timeSlotOrder.firstIndex(of: consecutiveGroup.last!.timeSlot) ?? -1
                    let nextIdx = timeSlotOrder.firstIndex(of: sorted[j].timeSlot) ?? -1
                    
                    if nextIdx == currentIdx + 1 {
                        consecutiveGroup.append(sorted[j])
                        j += 1
                    } else {
                        break
                    }
                }
                
                // Create combined suggestion
                if consecutiveGroup.count > 1 {
                    let firstSlot = consecutiveGroup.first!.timeSlot
                    let lastSlot = consecutiveGroup.last!.timeSlot
                    let startTime = firstSlot.components(separatedBy: "-")[0]
                    let endTime = lastSlot.components(separatedBy: "-")[1]
                    let combinedTimeSlot = "\(startTime)-\(endTime)"
                    
                    let first = consecutiveGroup.first!
                    combined.append(AdjustmentSuggestion(
                        id: UUID(),
                        type: first.type,
                        timeSlot: combinedTimeSlot,
                        currentValue: first.currentValue,
                        suggestedValue: first.suggestedValue,
                        priority: first.priority,
                        reasoning: "Consistent pattern across \(consecutiveGroup.count) consecutive 2-hour periods. \(first.reasoning)"
                    ))
                } else {
                    combined.append(consecutiveGroup[0])
                }
                
                i = j
            }
        }
        
        return combined
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
    
    private func analyzeCorrectionEffectiveness(glucoseEntries: [NightscoutGlucoseEntry], treatments: [NightscoutTreatment]) -> [String: CorrectionEffectiveness] {
        var timeSlotCorrections: [String: CorrectionEffectiveness] = [:]
        
        // Find correction boluses
        let corrections = treatments.filter { $0.eventType == "Correction Bolus" || ($0.eventType == "Bolus" && ($0.carbs ?? 0) == 0) }
        
        for correction in corrections {
            guard let correctionMills = correction.mills,
                  let insulinAmount = correction.insulin,
                  insulinAmount > 0 else { continue }
            
            let correctionTime = Date(timeIntervalSince1970: Double(correctionMills) / 1000)
            let calendar = Calendar.current
            let hour = calendar.component(.hour, from: correctionTime)
            let timeSlot = getTimeSlot(for: hour)
            
            // Find BG before correction (within 10 minutes before)
            let beforeStart = correctionTime.addingTimeInterval(-10 * 60)
            let beforeBG = glucoseEntries.filter { entry in
                let entryTime = Date(timeIntervalSince1970: Double(entry.date) / 1000)
                return entryTime >= beforeStart && entryTime <= correctionTime
            }.sorted { $0.date > $1.date }.first
            
            // Find BG after correction (2-3 hours after, to see effect)
            let afterStart = correctionTime.addingTimeInterval(120 * 60) // 2 hours
            let afterEnd = correctionTime.addingTimeInterval(180 * 60) // 3 hours
            let afterBG = glucoseEntries.filter { entry in
                let entryTime = Date(timeIntervalSince1970: Double(entry.date) / 1000)
                return entryTime >= afterStart && entryTime <= afterEnd
            }.sorted { $0.date < $1.date }.first
            
            if let before = beforeBG, let after = afterBG {
                let bgDrop = Double(before.sgv - after.sgv)
                let actualISF = bgDrop / insulinAmount
                
                if timeSlotCorrections[timeSlot] == nil {
                    timeSlotCorrections[timeSlot] = CorrectionEffectiveness(
                        timeSlot: timeSlot,
                        correctionCount: 0,
                        totalInsulin: 0,
                        avgBGDrop: 0,
                        avgActualISF: 0,
                        isfValues: []
                    )
                }
                
                timeSlotCorrections[timeSlot]!.correctionCount += 1
                timeSlotCorrections[timeSlot]!.totalInsulin += insulinAmount
                timeSlotCorrections[timeSlot]!.isfValues.append(actualISF)
            }
        }
        
        // Calculate averages
        for (timeSlot, _) in timeSlotCorrections {
            let isfValues = timeSlotCorrections[timeSlot]!.isfValues
            if !isfValues.isEmpty {
                let avgISF = isfValues.reduce(0, +) / Double(isfValues.count)
                timeSlotCorrections[timeSlot]!.avgActualISF = avgISF
            }
        }
        
        return timeSlotCorrections
    }
    
    private func analyzeInsulinTiming(glucoseEntries: [NightscoutGlucoseEntry], treatments: [NightscoutTreatment]) -> InsulinTimingAnalysis {
        var postMealSpikes = 0
        var totalMeals = 0
        
        // Look for carb treatments and check glucose response 1-2 hours later
        for treatment in treatments {
            if treatment.eventType == "Carb" || treatment.eventType == "Meal Bolus" {
                guard let treatmentMills = treatment.mills else { continue }
                
                totalMeals += 1
                let treatmentTime = Date(timeIntervalSince1970: Double(treatmentMills) / 1000)
                
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
        case 0..<2: return "00:00-02:00"
        case 2..<4: return "02:00-04:00"
        case 4..<6: return "04:00-06:00"
        case 6..<8: return "06:00-08:00"
        case 8..<10: return "08:00-10:00"
        case 10..<12: return "10:00-12:00"
        case 12..<14: return "12:00-14:00"
        case 14..<16: return "14:00-16:00"
        case 16..<18: return "16:00-18:00"
        case 18..<20: return "18:00-20:00"
        case 20..<22: return "20:00-22:00"
        default: return "22:00-24:00"
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
    
    private func isNightscoutConfigured() -> Bool {
        let settings = nightscoutService.getSettings()
        return !settings.url.isEmpty && !settings.apiToken.isEmpty
    }
    
    private func priorityText(_ priority: Priority) -> String {
        switch priority {
        case .high:
            return "🔴 HIGH PRIORITY - Critical adjustment needed for safety and control."
        case .medium:
            return "🟠 MEDIUM PRIORITY - Important adjustment that should be addressed soon."
        case .low:
            return "🟢 LOW PRIORITY - Optional improvement for better control."
        }
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
    let timeBelowRange: Int
    let coefficientOfVariation: Double
    let dataPoints: Int
    let analysisPeriod: String
    
    init(averageGlucose: Int = 0, timeInRange: Int = 0, timeBelowRange: Int = 0, coefficientOfVariation: Double = 0, dataPoints: Int = 0, analysisPeriod: String = "") {
        self.averageGlucose = averageGlucose
        self.timeInRange = timeInRange
        self.timeBelowRange = timeBelowRange
        self.coefficientOfVariation = coefficientOfVariation
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

struct CorrectionEffectiveness {
    let timeSlot: String
    var correctionCount: Int
    var totalInsulin: Double
    var avgBGDrop: Double
    var avgActualISF: Double
    var isfValues: [Double]
}

struct InsulinTimingAnalysis {
    let postMealSpikes: Int
    let totalMeals: Int
    let spikeRate: Double
    let needsPreBolus: Bool
}

struct SuggestionGroup: Identifiable {
    let id = UUID()
    let type: AdjustmentType
    let suggestions: [AdjustmentSuggestion]
}

enum AnalysisMethod {
    case ai
    case ruleBased
    case hybrid
}

#Preview {
    TherapyAdjustmentView()
}
