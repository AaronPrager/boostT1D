import SwiftUI


struct BloodGlucoseDataView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @StateObject private var profileService = UserProfileService.shared
    @State private var glucoseEntries: [NightscoutGlucoseEntry] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedTimeRange: Int = 3
    @State private var statistics = GlucoseStatistics()
    @State private var lastFetchTime: Date?
    @State private var activeTab: TabSelection = .chart
    
    private let timeRangeOptions = [1, 3, 7, 30]
    private let timeRangeLabels = ["1 day", "3 days", "7 days", "1 month"]
    
    private var filteredGlucoseEntries: [NightscoutGlucoseEntry] {
        let calendar = Calendar.current
        let now = Date()
        let startDate = calendar.date(byAdding: .day, value: -selectedTimeRange, to: now) ?? now
        
        return glucoseEntries.filter { entry in
            let entryDate = Date(timeIntervalSince1970: Double(entry.date) / 1000)
            return entryDate >= startDate && entryDate <= now
        }
    }
    
    enum TabSelection {
        case chart
        case data
    }
    
    struct GlucoseStatistics {
        var estimatedA1C: Double = 0.0
        var averageGlucose: Double = 0.0
        var standardDeviation: Double = 0.0
        var coefficientOfVariation: Double = 0.0
        var gmi: Double = 0.0
        var totalReadings: Int = 0
        var timeInRange: Double = 0.0
        var timeAboveRange: Double = 0.0
        var timeBelowRange: Double = 0.0
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 30))
                        .foregroundColor(.red)
                }
                .padding(.top, 20)
                
                // Current Glucose Status Card
                if !glucoseEntries.isEmpty {
                    let nightscoutSettings = nightscoutService.getSettings()
                    CurrentGlucoseCard(
                        glucoseEntries: glucoseEntries, 
                        lastFetchTime: lastFetchTime,
                        lowGlucose: nightscoutSettings.lowGlucose,
                        highGlucose: nightscoutSettings.highGlucose
                    )
                    .padding(.horizontal, 20)
                }
                
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
                
                // Content
                if isLoading {
                    ProgressView("Loading glucose data...")
                        .padding()
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Data")
                            .font(.headline)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Retry") {
                            loadGlucoseData()
                        }
                        .foregroundColor(.blue)
                    }
                    .padding()
                } else if !glucoseEntries.isEmpty {
                    VStack(spacing: 24) {
                        // Statistics Section
                        StatisticsSection(statistics: statistics, totalReadings: filteredGlucoseEntries.count)
                            .padding(.horizontal, 20)
                        
                        // Tab Navigation
                        VStack(spacing: 0) {
                            HStack(spacing: 8) {
                                TabButton(
                                    title: "Chart",
                                    icon: "chart.line.uptrend.xyaxis",
                                    isSelected: activeTab == .chart
                                ) {
                                    activeTab = .chart
                                }
                                
                                TabButton(
                                    title: "Raw Data",
                                    icon: "table",
                                    isSelected: activeTab == .data
                                ) {
                                    activeTab = .data
                                }
                            }
                            .background(Color(.systemGray6))
                            
                            // Tab Content
                            if activeTab == .chart {
                                GlucoseChartView(
                                    glucoseEntries: filteredGlucoseEntries,
                                    lowGlucose: nightscoutService.getSettings().lowGlucose,
                                    highGlucose: nightscoutService.getSettings().highGlucose
                                )
                                .padding()
                            } else if activeTab == .data {
                                RawDataView(glucoseEntries: glucoseEntries)
                                    .padding()
                            }
                        }
                        .background(Color(.systemBackground))
                        .cornerRadius(12)
                        .padding(.horizontal, 20)
                    }
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        
                        Text("No Glucose Data")
                            .font(.headline)
                        
                        Text("No glucose readings found for the selected time range.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Glucose Data")
        .navigationBarItems(trailing: Button(action: {
            loadGlucoseData()
        }) {
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.blue)
        })
        .onAppear {
            loadGlucoseData()
        }
        .onChange(of: selectedTimeRange) { _ in
            updateStatisticsForCurrentTimeRange()
        }
    }
    
    private func loadGlucoseData() {
        isLoading = true
        errorMessage = nil
        
        nightscoutService.fetchGlucoseEntries(hours: selectedTimeRange * 24) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let entries):
                    self.glucoseEntries = entries
                    self.lastFetchTime = Date()
                    self.calculateStatistics(entries: entries)
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
    
    private func calculateStatistics(entries: [NightscoutGlucoseEntry]) {
        guard !entries.isEmpty else { return }
        
        let glucoseValues = entries.map { Double($0.sgv) }
        let averageGlucose = glucoseValues.reduce(0, +) / Double(glucoseValues.count)
        
        // Calculate standard deviation
        let variance = glucoseValues.map { pow($0 - averageGlucose, 2) }.reduce(0, +) / Double(glucoseValues.count)
        let standardDeviation = sqrt(variance)
        
        // Calculate coefficient of variation
        let coefficientOfVariation = (standardDeviation / averageGlucose) * 100
        
        // Calculate estimated A1C (using the same formula as web app)
        let estimatedA1C = (averageGlucose + 46.7) / 28.7
        
        // Calculate GMI
        let gmi = 3.31 + (0.02392 * averageGlucose)
        
        // Get glucose range from settings
        let nightscoutSettings = nightscoutService.getSettings()
        let lowGlucose = nightscoutSettings.lowGlucose
        let highGlucose = nightscoutSettings.highGlucose
        
        // Calculate time in range
        let inRange = glucoseValues.filter { $0 >= lowGlucose && $0 <= highGlucose }.count
        let aboveRange = glucoseValues.filter { $0 > highGlucose }.count
        let belowRange = glucoseValues.filter { $0 < lowGlucose }.count
        
        let timeInRange = Double(inRange) / Double(glucoseValues.count) * 100
        let timeAboveRange = Double(aboveRange) / Double(glucoseValues.count) * 100
        let timeBelowRange = Double(belowRange) / Double(glucoseValues.count) * 100
        
        statistics = GlucoseStatistics(
            estimatedA1C: estimatedA1C,
            averageGlucose: averageGlucose,
            standardDeviation: standardDeviation,
            coefficientOfVariation: coefficientOfVariation,
            gmi: gmi,
            totalReadings: entries.count,
            timeInRange: timeInRange,
            timeAboveRange: timeAboveRange,
            timeBelowRange: timeBelowRange
        )
    }
    
    private func updateStatisticsForCurrentTimeRange() {
        calculateStatistics(entries: filteredGlucoseEntries)
    }
}

struct StatCard: View {
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

// MARK: - Current Glucose Card
struct CurrentGlucoseCard: View {
    let glucoseEntries: [NightscoutGlucoseEntry]
    let lastFetchTime: Date?
    let lowGlucose: Double
    let highGlucose: Double
    
    private var currentReading: NightscoutGlucoseEntry? {
        glucoseEntries.sorted { $0.date > $1.date }.first
    }
    
    private func getDirectionArrow(_ direction: String?) -> String {
        switch direction {
        case "DoubleUp": return "⇈"
        case "SingleUp": return "↑"
        case "FortyFiveUp": return "↗"
        case "Flat": return "→"
        case "FortyFiveDown": return "↘"
        case "SingleDown": return "↓"
        case "DoubleDown": return "⇊"
        case "NONE": return "→"
        default: return "→"
        }
    }
    
    private func getGlucoseColor(_ value: Int, lowGlucose: Double, highGlucose: Double) -> (background: Color, text: Color) {
        if Double(value) < lowGlucose { return (.red.opacity(0.1), .red) }
        if Double(value) > highGlucose { return (.orange.opacity(0.1), .orange) }
        return (.green.opacity(0.1), .green)
    }
    
    private func formatRelativeTime(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
    
    var body: some View {
        VStack(spacing: 0) {
            if let reading = currentReading {
                HStack {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Current Glucose")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        HStack(spacing: 12) {
                            let colors = getGlucoseColor(reading.sgv, lowGlucose: lowGlucose, highGlucose: highGlucose)
                            
                            Text("\(reading.sgv)")
                                .font(.system(size: 36, weight: .bold))
                                .foregroundColor(colors.text)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(colors.background)
                                .cornerRadius(8)
                            
                            Text(getDirectionArrow(reading.direction))
                                .font(.system(size: 24))
                                .foregroundColor(.primary)
                        }
                        
                        if let lastFetchTime = lastFetchTime {
                            Text("Last updated \(formatRelativeTime(lastFetchTime))")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                }
            }
        }
        .padding(24)
        .background(
            LinearGradient(
                gradient: Gradient(colors: [Color(.systemGray6), Color(.systemBlue).opacity(0.1)]),
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.systemBlue).opacity(0.2), lineWidth: 1)
        )
    }
}

// MARK: - Statistics Section
struct StatisticsSection: View {
    let statistics: BloodGlucoseDataView.GlucoseStatistics
    let totalReadings: Int
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Statistics (\(totalReadings) readings)")
                .font(.headline)
            
            // Main statistics grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                StatCard(
                    title: "Est. A1C",
                    value: String(format: "%.1f", statistics.estimatedA1C),
                    unit: "%",
                    color: .purple
                )
                
                StatCard(
                    title: "Average",
                    value: String(format: "%.0f", statistics.averageGlucose),
                    unit: "mg/dL",
                    color: .blue
                )
                
                StatCard(
                    title: "Std Dev",
                    value: String(format: "%.0f", statistics.standardDeviation),
                    unit: "mg/dL",
                    color: .gray
                )
            }
            
            // Time in Range section
            VStack(alignment: .leading, spacing: 12) {
                Text("Time in Range")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                HStack(spacing: 12) {
                    TimeInRangeCard(
                        title: "Below",
                        percentage: statistics.timeBelowRange,
                        color: .red
                    )
                    
                    TimeInRangeCard(
                        title: "In Range",
                        percentage: statistics.timeInRange,
                        color: .green
                    )
                    
                    TimeInRangeCard(
                        title: "Above",
                        percentage: statistics.timeAboveRange,
                        color: .orange
                    )
                }
            }
        }
        .padding(16)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// MARK: - Time in Range Card
struct TimeInRangeCard: View {
    let title: String
    let percentage: Double
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundColor(color)
                .fontWeight(.medium)
            
            Text(String(format: "%.0f", percentage))
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text("%")
                .font(.caption)
                .foregroundColor(color)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Tab Button
struct TabButton: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                
                Text(title)
                    .font(.system(size: 16, weight: .medium))
            }
            .foregroundColor(isSelected ? .white : .primary)
            .padding(.vertical, 16)
            .padding(.horizontal, 24)
            .background(isSelected ? Color.blue : Color.clear)
            .cornerRadius(8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Raw Data View
struct RawDataView: View {
    let glucoseEntries: [NightscoutGlucoseEntry]
    
    private func getDirectionArrow(_ direction: String?) -> String {
        switch direction {
        case "DoubleUp": return "⇈"
        case "SingleUp": return "↑"
        case "FortyFiveUp": return "↗"
        case "Flat": return "→"
        case "FortyFiveDown": return "↘"
        case "SingleDown": return "↓"
        case "DoubleDown": return "⇊"
        default: return "-"
        }
    }
    
    private func formatDate(_ timestamp: Int64) -> String {
        let date = Date(timeIntervalSince1970: Double(timestamp) / 1000)
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Raw Data")
                    .font(.headline)
                
                Spacer()
                
                Button("Export CSV") {
                    // TODO: Implement CSV export
                }
                .font(.caption)
                .foregroundColor(.blue)
            }
            
            ScrollView {
                LazyVStack(spacing: 8) {
                    ForEach(glucoseEntries.sorted { $0.date > $1.date }, id: \.date) { entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(formatDate(entry.date))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            
                            Spacer()
                            
                            Text("\(entry.sgv) mg/dL")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            
                            Text(getDirectionArrow(entry.direction))
                                .font(.title3)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
                .padding(.vertical, 8)
            }
            .frame(maxHeight: 400) // Limit height to make it scrollable
        }
    }
}

#Preview {
    BloodGlucoseDataView()
}
