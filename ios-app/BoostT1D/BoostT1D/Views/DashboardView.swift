import SwiftUI

struct DashboardView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @StateObject private var localDataService = LocalDataService.shared
    @StateObject private var profileService = UserProfileService.shared
    
    @State private var currentGlucose: Int?
    @State private var previousGlucose: Int?
    @State private var glucoseDifference: Int?
    @State private var measurementTime: Date?
    @State private var currentIOB: Double?
    @State private var currentCOB: Double?
    @State private var glucoseTrend: String?
    @State private var lastUpdateTime: Date?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingProfileEdit = false
    @State private var showingMenuView = false
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Welcome Header
                VStack(spacing: 8) {
                    if let profile = profileService.currentProfile {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Hello, \(profile.name.split(separator: " ").first ?? "")")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                
                                if let lastUpdate = lastUpdateTime {
                                    Text("Updated \(timeAgoString(from: lastUpdate))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            
                            Spacer()
                            
                            Button(action: loadDashboardData) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.title3)
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding(.horizontal, 20)
                        .padding(.top, 20)
                    }
                }
                
                // Current Metrics Cards
                if isLoading {
                    ProgressView("Loading your data...")
                        .padding(.top, 40)
                } else if let error = errorMessage {
                    ErrorView(message: error, onRetry: loadDashboardData)
                        .padding(.horizontal, 20)
                } else {
                    VStack(spacing: 16) {
                        // Blood Glucose Card (Featured)
                        GlucoseCard(
                            glucose: currentGlucose,
                            trend: glucoseTrend,
                            lowGlucose: nightscoutService.settings.lowGlucose,
                            highGlucose: nightscoutService.settings.highGlucose,
                            previousGlucose: previousGlucose,
                            glucoseDifference: glucoseDifference,
                            measurementTime: measurementTime
                        )
                        .padding(.horizontal, 20)
                        
                        // IOB & COB Cards
                        HStack(spacing: 12) {
                            DashboardMetricCard(
                                title: "Active Insulin",
                                value: currentIOB != nil ? String(format: "%.1f", currentIOB!) : "--",
                                unit: "U",
                                icon: "syringe.fill",
                                color: .purple
                            )
                            
                            DashboardMetricCard(
                                title: "Active Carbs",
                                value: currentCOB != nil ? String(format: "%.0f", currentCOB!) : "--",
                                unit: "g",
                                icon: "fork.knife",
                                color: .orange
                            )
                        }
                        .padding(.horizontal, 20)
                    }
                }
                
                // Quick Actions
                VStack(alignment: .leading, spacing: 16) {
                    Text("Quick Actions")
                        .font(.title3)
                        .fontWeight(.bold)
                        .padding(.horizontal, 20)
                    
                    VStack(spacing: 12) {
                        // Core Actions
                        NavigationLink(destination: BloodGlucoseDataView()) {
                            QuickActionRow(
                                icon: "heart.fill",
                                title: "Blood Glucose",
                                subtitle: "View trends and history",
                                color: .red
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        NavigationLink(destination: TreatmentsView()) {
                            QuickActionRow(
                                icon: "syringe.fill",
                                title: "Treatments",
                                subtitle: "Log insulin and meals",
                                color: .purple
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        NavigationLink(destination: TherapyAdjustmentView()) {
                            QuickActionRow(
                                icon: "slider.horizontal.3",
                                title: "Therapy Adjustments",
                                subtitle: "AI-powered recommendations",
                                color: .orange
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        NavigationLink(destination: DiabetesProfileView()) {
                            QuickActionRow(
                                icon: "person.circle.fill",
                                title: "Diabetes Profile",
                                subtitle: "Configure your diabetes settings",
                                color: .blue
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        NavigationLink(destination: FoodAnalysisView()) {
                            QuickActionRow(
                                icon: "camera.fill",
                                title: "Food Analysis",
                                subtitle: "Estimate carbs and insulin",
                                color: .green
                            )
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .padding(.horizontal, 20)
                    
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("BoostT1D")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    // Profile Photo Button
                    Button(action: {
                        showingProfileEdit = true
                    }) {
                        if let profile = profileService.currentProfile {
                            if let photo = profile.photo {
                                Image(uiImage: photo)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 32, height: 32)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(Color.blue.opacity(0.3), lineWidth: 1.5)
                                    )
                            } else {
                                Image(systemName: "person.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                    
                    // Menu Button
                    Button(action: {
                        showingMenuView = true
                    }) {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .sheet(isPresented: $showingProfileEdit) {
            ProfileView()
        }
        .sheet(isPresented: $showingMenuView) {
            WelcomeView()
        }
        .onAppear {
            if currentGlucose == nil {
                loadDashboardData()
            }
        }
    }
    
    private func loadDashboardData() {
        isLoading = true
        errorMessage = nil
        
        if nightscoutService.settings.isManualMode {
            loadManualModeData()
        } else {
            loadNightscoutData()
        }
    }
    
    private func loadManualModeData() {
        let entries = localDataService.getGlucoseEntriesForTimeRange(hours: 24)
        
        if let latest = entries.first {
            currentGlucose = latest.sgv
            glucoseTrend = latest.direction
            measurementTime = Date(timeIntervalSince1970: Double(latest.date) / 1000)
            lastUpdateTime = measurementTime
            
            // Calculate previous glucose and difference
            if entries.count > 1 {
                let previous = entries[1]
                previousGlucose = previous.sgv
                glucoseDifference = latest.sgv - previous.sgv
            } else {
                previousGlucose = nil
                glucoseDifference = nil
            }
        }
        
        // IOB and COB not available in manual mode
        currentIOB = nil
        currentCOB = nil
        
        isLoading = false
    }
    
    private func loadNightscoutData() {
        guard !nightscoutService.settings.url.isEmpty else {
            errorMessage = "Please configure Nightscout in Profile & Settings"
            isLoading = false
            return
        }
        
        // Fetch latest glucose (last 1 hour to get most recent)
        nightscoutService.fetchGlucoseEntries(hours: 1) { result in
            DispatchQueue.main.async {
                switch result {
                case .success(let entries):
                    if let latest = entries.first {
                        self.currentGlucose = latest.sgv
                        self.glucoseTrend = latest.direction
                        self.measurementTime = Date(timeIntervalSince1970: Double(latest.date) / 1000)
                        self.lastUpdateTime = self.measurementTime
                        
                        // Calculate previous glucose and difference
                        if entries.count > 1 {
                            let previous = entries[1]
                            self.previousGlucose = previous.sgv
                            self.glucoseDifference = latest.sgv - previous.sgv
                        } else {
                            self.previousGlucose = nil
                            self.glucoseDifference = nil
                        }
                        
                        print("Dashboard: Glucose fetched successfully: \(latest.sgv)")
                    }
                    
                    // Fetch IOB/COB
                    self.fetchIOBAndCOB()
                    
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                    print("Dashboard: Failed to fetch glucose: \(error.localizedDescription)")
                }
            }
        }
    }
    
    private func fetchIOBAndCOB() {
        // Try to fetch IOB (may not be available on all Nightscout servers)
        nightscoutService.fetchIOB { result in
            switch result {
            case .success(let iobResult):
                DispatchQueue.main.async {
                    self.currentIOB = iobResult.iob
                    print("Dashboard: IOB fetched successfully: \(iobResult.iob)")
                }
            case .failure(let error):
                print("Dashboard: IOB not available (this is normal if IOB plugin isn't enabled): \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.currentIOB = nil
                }
            }
            
            // Try to fetch COB (may not be available on all Nightscout servers)
            self.nightscoutService.fetchCOB { result in
                switch result {
                case .success(let cobResult):
                    DispatchQueue.main.async {
                        self.currentCOB = cobResult.cob
                        print("Dashboard: COB fetched successfully: \(cobResult.cob)")
                    }
                case .failure(let error):
                    print("Dashboard: COB not available (this is normal if COB plugin isn't enabled): \(error.localizedDescription)")
                    DispatchQueue.main.async {
                        self.currentCOB = nil
                    }
                }
                
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            }
        }
    }
    
    private func timeAgoString(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        let minutes = Int(interval / 60)
        
        if minutes < 1 {
            return "just now"
        } else if minutes == 1 {
            return "1 min ago"
        } else if minutes < 60 {
            return "\(minutes) mins ago"
        } else {
            let hours = minutes / 60
            return hours == 1 ? "1 hour ago" : "\(hours) hours ago"
        }
    }
}

// MARK: - Glucose Card Component
struct GlucoseCard: View {
    let glucose: Int?
    let trend: String?
    let lowGlucose: Double
    let highGlucose: Double
    let previousGlucose: Int?
    let glucoseDifference: Int?
    let measurementTime: Date?
    
    var body: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: "heart.fill")
                    .font(.title3)
                    .foregroundColor(glucoseColor)
                
                Text("Current Glucose")
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Spacer()
                
                if let trend = trend {
                    Text(trendArrow(trend))
                        .font(.title2)
                        .foregroundColor(.secondary)
                }
            }
            
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                if let glucose = glucose {
                    Text("\(glucose)")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                        .foregroundColor(glucoseColor)
                } else {
                    Text("--")
                        .font(.system(size: 64, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }
                
                Text("mg/dL")
                    .font(.title3)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 8)
            }
            
            // Measurement details
            if measurementTime != nil || glucoseDifference != nil {
                VStack(spacing: 4) {
                    if let measurementTime = measurementTime {
                        Text("Measured \(formatRelativeTime(measurementTime))")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if let difference = glucoseDifference, let previous = previousGlucose {
                        let differenceText = difference > 0 ? "+\(difference)" : "\(difference)"
                        let trendSymbol = difference > 0 ? "↗" : difference < 0 ? "↘" : "→"
                        
                        Text("\(differenceText) from \(previous) \(trendSymbol)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            // Range indicator
            HStack(spacing: 16) {
                RangeIndicator(
                    label: "Low",
                    value: Int(lowGlucose),
                    isActive: glucose != nil && Double(glucose!) < lowGlucose
                )
                
                RangeIndicator(
                    label: "Target",
                    value: "\(Int(lowGlucose))-\(Int(highGlucose))",
                    isActive: glucose != nil && Double(glucose!) >= lowGlucose && Double(glucose!) <= highGlucose
                )
                
                RangeIndicator(
                    label: "High",
                    value: Int(highGlucose),
                    isActive: glucose != nil && Double(glucose!) > highGlucose
                )
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(glucoseColor.opacity(0.1))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(glucoseColor.opacity(0.3), lineWidth: 2)
        )
    }
    
    private var glucoseColor: Color {
        guard let glucose = glucose else { return .gray }
        let glucoseDouble = Double(glucose)
        
        if glucoseDouble < lowGlucose {
            return .red
        } else if glucoseDouble > highGlucose {
            return .orange
        } else {
            return .green
        }
    }
    
    private func trendArrow(_ trend: String) -> String {
        switch trend {
        case "DoubleUp": return "⇈"
        case "SingleUp": return "↑"
        case "FortyFiveUp": return "↗"
        case "Flat": return "→"
        case "FortyFiveDown": return "↘"
        case "SingleDown": return "↓"
        case "DoubleDown": return "⇊"
        default: return "→"
        }
    }
    
    private func formatRelativeTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Range Indicator Component
struct RangeIndicator: View {
    let label: String
    let value: Any
    let isActive: Bool
    
    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption2)
                .foregroundColor(isActive ? .primary : .secondary)
                .fontWeight(isActive ? .semibold : .regular)
            
            Text("\(value)")
                .font(.caption)
                .foregroundColor(isActive ? .primary : .secondary)
                .fontWeight(isActive ? .bold : .regular)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(isActive ? Color.blue.opacity(0.1) : Color.clear)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(isActive ? Color.blue.opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }
}

// MARK: - Dashboard Metric Card Component
struct DashboardMetricCard: View {
    let title: String
    let value: String
    let unit: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                
                Spacer()
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(value)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                    
                    Text(unit)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}

// MARK: - Quick Action Row Component
struct QuickActionRow: View {
    let icon: String
    let title: String
    let subtitle: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 48, height: 48)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(color)
                )
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color(.systemGray6))
        )
    }
}


// MARK: - Error View Component
struct ErrorView: View {
    let message: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.orange)
            
            Text("Unable to Load Data")
                .font(.headline)
            
            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button(action: onRetry) {
                Text("Try Again")
                    .font(.headline)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(10)
            }
        }
        .padding(40)
    }
}

#Preview {
    NavigationView {
        DashboardView()
    }
}

