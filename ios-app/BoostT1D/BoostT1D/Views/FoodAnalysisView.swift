import SwiftUI

struct FoodAnalysisView: View {
    @StateObject private var apiService = APIService.shared
    @StateObject private var nightscoutService = NightscoutService.shared
    @StateObject private var diabetesProfileService = DiabetesProfileService.shared
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var showingCamera = false
    @State private var showingPhotoActionSheet = false
    @State private var isAnalyzing = false
    @State private var analysisResult: FoodAnalysis?
    @State private var errorMessage: String?
    @State private var insulinRecommendation: InsulinRecommendation?
    @State private var isCalculatingInsulin = false
    @State private var showingCalculationDetails = false
    
    var body: some View {
        ScrollView {
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 30))
                            .foregroundColor(.green)
                    }
                    .padding(.top, 20)
                    
                    // Image Selection
                    VStack(spacing: 16) {
                        if let selectedImage = selectedImage {
                            Image(uiImage: selectedImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxHeight: 300)
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray, lineWidth: 1)
                                )
                        } else {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(.systemGray5))
                                .frame(height: 200)
                                .overlay(
                                    VStack(spacing: 12) {
                                        Image(systemName: "camera")
                                            .font(.system(size: 40))
                                            .foregroundColor(.gray)
                                        
                                        Text("Tap to select a photo")
                                            .font(.headline)
                                            .foregroundColor(.gray)
                                    }
                                )
                        }
                        
                        Button(action: { showingPhotoActionSheet = true }) {
                            HStack {
                                Image(systemName: "camera.fill")
                                Text("Select Photo")
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.green)
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    // Analysis Button
                    if selectedImage != nil {
                        Button(action: analyzeFood) {
                            HStack {
                                if isAnalyzing {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "magnifyingglass")
                                }
                                
                                Text(isAnalyzing ? "Analyzing..." : "Analyze Food")
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(isAnalyzing ? Color.gray : Color.blue)
                            .cornerRadius(12)
                        }
                        .disabled(isAnalyzing)
                        .padding(.horizontal, 20)
                    }
                    
                    // Results
                    if let analysisResult = analysisResult {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Analysis Results")
                                .font(.headline)
                            
                            VStack(alignment: .leading, spacing: 12) {
                                HStack {
                                    Text("Description:")
                                        .fontWeight(.medium)
                                    Spacer()
                                }
                                Text(analysisResult.description)
                                    .foregroundColor(.secondary)
                                
                                HStack {
                                    Text("Estimated Carbs:")
                                        .fontWeight(.medium)
                                    Spacer()
                                    Text("\(String(format: "%.1f", analysisResult.carbsGrams))g")
                                        .fontWeight(.bold)
                                        .foregroundColor(.blue)
                                }
                                
                                HStack {
                                    Text("Confidence:")
                                        .fontWeight(.medium)
                                    Spacer()
                                    Text(analysisResult.confidence)
                                        .fontWeight(.bold)
                                        .foregroundColor(confidenceColor(analysisResult.confidence))
                                }
                                
                                if !analysisResult.notes.isEmpty {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Notes:")
                                            .fontWeight(.medium)
                                        Text(analysisResult.notes)
                                            .foregroundColor(.secondary)
                                    }
                                }
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                            
                            // Insulin Calculation (only if Nightscout is configured)
                            if !nightscoutService.settings.isManualMode && !nightscoutService.settings.url.isEmpty {
                                if isCalculatingInsulin {
                                    // Loading state
                                    HStack {
                                        ProgressView()
                                            .scaleEffect(0.8)
                                        Text("Calculating insulin dose...")
                                            .foregroundColor(.secondary)
                                    }
                                    .padding()
                                } else if let insulin = insulinRecommendation {
                                    insulinRecommendationView(insulin)
                                }
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                    
                    // Error Message
                    if let errorMessage = errorMessage {
                        VStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle")
                                .font(.system(size: 40))
                                .foregroundColor(.orange)
                            
                            Text("Analysis Failed")
                                .font(.headline)
                            
                            Text(errorMessage)
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                            
                            Button("Try Again") {
                                self.errorMessage = nil
                            }
                            .foregroundColor(.blue)
                        }
                        .padding()
                    }
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("Food Analysis")
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker(selectedImage: $selectedImage)
        }
        .sheet(isPresented: $showingCamera) {
            CameraView(selectedImage: $selectedImage)
        }
        .actionSheet(isPresented: $showingPhotoActionSheet) {
            ActionSheet(
                title: Text("Select Photo"),
                buttons: [
                    .default(Text("Camera")) {
                        showingCamera = true
                    },
                    .default(Text("Photo Library")) {
                        showingImagePicker = true
                    },
                    .cancel()
                ]
            )
        }
    }
    
    private func analyzeFood() {
        guard let image = selectedImage else { return }
        
        isAnalyzing = true
        errorMessage = nil
        analysisResult = nil
        insulinRecommendation = nil
        
        apiService.analyzeFood(image: image) { result in
            DispatchQueue.main.async {
                isAnalyzing = false
                switch result {
                case .success(let analysis):
                    self.analysisResult = analysis
                    // Automatically calculate insulin if Nightscout is enabled
                    if !self.nightscoutService.settings.isManualMode && !self.nightscoutService.settings.url.isEmpty {
                        self.calculateInsulin()
                    }
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func confidenceColor(_ confidence: String) -> Color {
        switch confidence.lowercased() {
        case "high":
            return .green
        case "medium":
            return .orange
        case "low":
            return .red
        default:
            return .gray
        }
    }
    
    private func calculateInsulin() {
        guard let analysis = analysisResult else { return }
        
        isCalculatingInsulin = true
        insulinRecommendation = nil
        
        // Fetch all required data in parallel
        let group = DispatchGroup()
        
        var currentGlucose: Int?
        var currentIOB: Double = 0
        var currentCOB: Double = 0
        var profile: DiabetesProfile?
        var fetchError: String?
        
        // Fetch current glucose
        group.enter()
        nightscoutService.fetchGlucoseEntries(hours: 1, completion: { result in
            defer { group.leave() }
            if case .success(let entries) = result, let latest = entries.first {
                currentGlucose = latest.sgv
            }
        })
        
        // Fetch IOB
        group.enter()
        nightscoutService.fetchIOB { result in
            defer { group.leave() }
            if case .success(let iobResult) = result {
                currentIOB = iobResult.iob
            }
        }
        
        // Fetch COB
        group.enter()
        nightscoutService.fetchCOB { result in
            defer { group.leave() }
            if case .success(let cobResult) = result {
                currentCOB = cobResult.cob
            }
        }
        
        // Fetch profile
        group.enter()
        diabetesProfileService.fetchProfile { result in
            defer { group.leave() }
            switch result {
            case .success(let fetchedProfile):
                profile = fetchedProfile
            case .failure(let error):
                fetchError = error.localizedDescription
            }
        }
        
        group.notify(queue: .main) {
            self.isCalculatingInsulin = false
            
            guard let profile = profile,
                  let defaultProfileName = profile.defaultProfile,
                  let store = profile.store,
                  let profileData = store[defaultProfileName] else {
                self.errorMessage = fetchError ?? "Unable to fetch diabetes profile"
                return
            }
            
            // Get current time-based carb ratio
            guard let carbRatios = profileData.carbratio ?? profileData.carb_ratio,
                  !carbRatios.isEmpty else {
                self.errorMessage = "No carb ratio found in profile"
                return
            }
            
            let currentCarbRatio = self.getCurrentTimeValue(carbRatios)
            
            // Calculate insulin recommendation
            if let glucose = currentGlucose,
               let sensitivities = profileData.sens ?? profileData.sensitivity,
               let sensitivity = sensitivities.first,
               let targetHighs = profileData.target_high,
               let targetHigh = targetHighs.first {
                
                // Calculate carb bolus
                let carbBolusUnits = analysis.carbsGrams / currentCarbRatio.value
                
                // Calculate correction bolus
                let correctionUnits = glucose > Int(targetHigh.value) ? 
                    (Double(glucose) - targetHigh.value) / sensitivity.value : 0
                
                // Total insulin needed
                let totalUnits = carbBolusUnits + correctionUnits
                
                // Calculate IOB needed for existing COB
                let iobNeededForCOB = currentCOB / currentCarbRatio.value
                
                // Available IOB for new dose
                let availableIOB = max(0, currentIOB - iobNeededForCOB)
                
                // Safe bolus
                let safeBolus = max(0, totalUnits - availableIOB)
                
                // Build calculation note
                var calculationNote = "🍎 CARB CALCULATION:\n"
                calculationNote += "   \(String(format: "%.1f", analysis.carbsGrams))g ÷ \(String(format: "%.1f", currentCarbRatio.value)) = \(String(format: "%.1f", carbBolusUnits))u\n"
                
                if correctionUnits > 0 {
                    calculationNote += "\n📊 CORRECTION CALCULATION:\n"
                    calculationNote += "   (\(glucose) - \(Int(targetHigh.value))) ÷ \(String(format: "%.1f", sensitivity.value)) = \(String(format: "%.1f", correctionUnits))u\n"
                }
                
                calculationNote += "\n🎯 TOTAL INSULIN NEEDED:\n"
                if correctionUnits > 0 {
                    calculationNote += "   \(String(format: "%.1f", carbBolusUnits))u + \(String(format: "%.1f", correctionUnits))u = \(String(format: "%.1f", totalUnits))u\n"
                } else {
                    calculationNote += "   \(String(format: "%.1f", carbBolusUnits))u\n"
                }
                
                if currentCOB > 0 {
                    calculationNote += "\n🍞 CARBS ON BOARD (COB):\n"
                    calculationNote += "   \(String(format: "%.1f", currentCOB))g ÷ \(String(format: "%.1f", currentCarbRatio.value)) = \(String(format: "%.1f", iobNeededForCOB))u needed\n"
                }
                
                calculationNote += "\n💉 INSULIN ON BOARD (IOB):\n"
                calculationNote += "   Total IOB: \(String(format: "%.1f", currentIOB))u\n"
                if currentCOB > 0 {
                    calculationNote += "   IOB for COB: \(String(format: "%.1f", iobNeededForCOB))u\n"
                    calculationNote += "   Available IOB: \(String(format: "%.1f", currentIOB))u - \(String(format: "%.1f", iobNeededForCOB))u = \(String(format: "%.1f", availableIOB))u\n"
                }
                
                calculationNote += "\n✅ SAFE BOLUS CALCULATION:\n"
                if currentCOB > 0 {
                    calculationNote += "   \(String(format: "%.1f", totalUnits))u needed - \(String(format: "%.1f", availableIOB))u available = \(String(format: "%.1f", safeBolus))u\n"
                } else {
                    calculationNote += "   \(String(format: "%.1f", totalUnits))u needed - \(String(format: "%.1f", currentIOB))u IOB = \(String(format: "%.1f", safeBolus))u\n"
                }
                
                // Safety warnings
                var warnings: [String] = []
                if safeBolus > 10 {
                    warnings.append("Large bolus recommended - double-check carb estimate and IOB")
                }
                if currentIOB > 5 && safeBolus > 5 {
                    warnings.append("High IOB with large recommended bolus - high risk of hypoglycemia")
                }
                if currentGlucose ?? 0 < 70 {
                    warnings.append("Current glucose is low - consider treating low before eating")
                }
                
                self.insulinRecommendation = InsulinRecommendation(
                    carbBolusUnits: carbBolusUnits,
                    correctionUnits: correctionUnits,
                    totalUnits: totalUnits,
                    safeBolus: safeBolus,
                    currentIOB: currentIOB,
                    currentCOB: currentCOB,
                    iobReduction: min(availableIOB, totalUnits),
                    carbRatio: currentCarbRatio.value,
                    carbRatioTime: currentCarbRatio.time,
                    currentGlucose: glucose,
                    insulinSensitivity: sensitivity.value,
                    targetGlucose: Int(targetHigh.value),
                    calculationNote: calculationNote,
                    safetyWarnings: warnings
                )
            } else {
                // Fallback: carb bolus only (no correction)
                let carbBolusUnits = analysis.carbsGrams / currentCarbRatio.value
                let safeBolus = max(0, carbBolusUnits - currentIOB)
                
                var calculationNote = "🍎 CARB CALCULATION:\n"
                calculationNote += "   \(String(format: "%.1f", analysis.carbsGrams))g ÷ \(String(format: "%.1f", currentCarbRatio.value)) = \(String(format: "%.1f", carbBolusUnits))u\n"
                calculationNote += "\n💉 INSULIN ON BOARD (IOB):\n"
                calculationNote += "   Total IOB: \(String(format: "%.1f", currentIOB))u\n"
                calculationNote += "\n✅ SAFE BOLUS CALCULATION:\n"
                calculationNote += "   \(String(format: "%.1f", carbBolusUnits))u needed - \(String(format: "%.1f", currentIOB))u IOB = \(String(format: "%.1f", safeBolus))u\n"
                
                self.insulinRecommendation = InsulinRecommendation(
                    carbBolusUnits: carbBolusUnits,
                    correctionUnits: 0,
                    totalUnits: carbBolusUnits,
                    safeBolus: safeBolus,
                    currentIOB: currentIOB,
                    currentCOB: currentCOB,
                    iobReduction: min(currentIOB, carbBolusUnits),
                    carbRatio: currentCarbRatio.value,
                    carbRatioTime: currentCarbRatio.time,
                    currentGlucose: currentGlucose,
                    insulinSensitivity: nil,
                    targetGlucose: nil,
                    calculationNote: calculationNote,
                    safetyWarnings: []
                )
            }
        }
    }
    
    private func getCurrentTimeValue(_ timeValues: [TimeValue]) -> TimeValue {
        let now = Date()
        let calendar = Calendar.current
        let currentMinutes = calendar.component(.hour, from: now) * 60 + calendar.component(.minute, from: now)
        
        let sorted = timeValues.sorted { timeToMinutes($0.time) < timeToMinutes($1.time) }
        
        var applicable = sorted.first!
        for tv in sorted {
            let tvMinutes = timeToMinutes(tv.time)
            if currentMinutes >= tvMinutes {
                applicable = tv
            } else {
                break
            }
        }
        
        return applicable
    }
    
    private func timeToMinutes(_ timeStr: String) -> Int {
        let components = timeStr.split(separator: ":").compactMap { Int($0) }
        guard components.count == 2 else { return 0 }
        return components[0] * 60 + components[1]
    }
    
    @ViewBuilder
    private func insulinRecommendationView(_ insulin: InsulinRecommendation) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("💉 Insulin Recommendation")
                    .font(.headline)
                Spacer()
                Button(action: { showingCalculationDetails.toggle() }) {
                    Image(systemName: showingCalculationDetails ? "chevron.up.circle.fill" : "info.circle.fill")
                        .foregroundColor(.blue)
                        .font(.title3)
                }
            }
            
            // Safe Bolus (Primary)
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Recommended Bolus")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(String(format: "%.1f", insulin.safeBolus))
                            .font(.system(size: 36, weight: .bold))
                            .foregroundColor(.orange)
                        Text("units")
                            .font(.headline)
                            .foregroundColor(.secondary)
                    }
                }
                Spacer()
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .cornerRadius(12)
            
            // Breakdown
            VStack(spacing: 12) {
                HStack {
                    Text("Carb Coverage:")
                        .font(.subheadline)
                    Spacer()
                    Text("\(String(format: "%.1f", insulin.carbBolusUnits))u")
                        .fontWeight(.medium)
                }
                
                if insulin.correctionUnits > 0 {
                    HStack {
                        Text("Correction:")
                            .font(.subheadline)
                        Spacer()
                        Text("\(String(format: "%.1f", insulin.correctionUnits))u")
                            .fontWeight(.medium)
                    }
                }
                
                Divider()
                
                HStack {
                    Text("Total Needed:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Spacer()
                    Text("\(String(format: "%.1f", insulin.totalUnits))u")
                        .fontWeight(.bold)
                }
                
                HStack {
                    Text("Active IOB:")
                        .font(.subheadline)
                    Spacer()
                    Text("-\(String(format: "%.1f", insulin.iobReduction))u")
                        .foregroundColor(.blue)
                        .fontWeight(.medium)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
            
            // Current Values
            VStack(spacing: 8) {
                HStack {
                    Text("Settings Used:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Spacer()
                }
                
                HStack {
                    Text("Carb Ratio:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("1:\(String(format: "%.1f", insulin.carbRatio)) (at \(insulin.carbRatioTime))")
                        .font(.caption)
                }
                
                if let isf = insulin.insulinSensitivity {
                    HStack {
                        Text("Correction Factor:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("1:\(String(format: "%.1f", isf)) mg/dL")
                            .font(.caption)
                    }
                }
                
                if let target = insulin.targetGlucose {
                    HStack {
                        Text("Target Glucose:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(target) mg/dL")
                            .font(.caption)
                    }
                }
                
                if let glucose = insulin.currentGlucose {
                    HStack {
                        Text("Current Glucose:")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Text("\(glucose) mg/dL")
                            .font(.caption)
                    }
                }
                
                HStack {
                    Text("Current IOB:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(String(format: "%.1f", insulin.currentIOB))u")
                        .font(.caption)
                }
                
                HStack {
                    Text("Current COB:")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("\(String(format: "%.1f", insulin.currentCOB))g")
                        .font(.caption)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .cornerRadius(8)
            
            // Safety Warnings
            if !insulin.safetyWarnings.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text("Safety Warnings")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    
                    ForEach(insulin.safetyWarnings, id: \.self) { warning in
                        Text("• \(warning)")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Detailed Calculation
            if showingCalculationDetails {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Detailed Calculation")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Text(insulin.calculationNote)
                        .font(.system(.caption, design: .monospaced))
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange, lineWidth: 2)
        )
        .cornerRadius(12)
    }
}

// MARK: - Data Models

struct InsulinRecommendation {
    let carbBolusUnits: Double
    let correctionUnits: Double
    let totalUnits: Double
    let safeBolus: Double
    let currentIOB: Double
    let currentCOB: Double
    let iobReduction: Double
    let carbRatio: Double
    let carbRatioTime: String
    let currentGlucose: Int?
    let insulinSensitivity: Double?
    let targetGlucose: Int?
    let calculationNote: String
    let safetyWarnings: [String]
}

#Preview {
    FoodAnalysisView()
}
