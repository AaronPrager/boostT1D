import SwiftUI

struct GlucoseChartView: View {
    let glucoseEntries: [NightscoutGlucoseEntry]
    let lowGlucose: Double
    let highGlucose: Double
    
    private var chartData: [GlucoseDataPoint] {
        glucoseEntries
            .sorted { $0.date < $1.date }
            .map { entry in
                GlucoseDataPoint(
                    timestamp: entry.date,
                    glucose: Double(entry.sgv),
                    direction: entry.direction
                )
            }
    }
    
    private var dailyData: [DailyGlucoseData] {
        // Group data by day
        let calendar = Calendar.current
        var dailyGroups: [String: [GlucoseDataPoint]] = [:]
        
        for point in chartData {
            let dayKey = calendar.dateInterval(of: .day, for: point.timestamp)?.start ?? point.timestamp
            let dayString = DateFormatter.dayFormatter.string(from: dayKey)
            
            if dailyGroups[dayString] == nil {
                dailyGroups[dayString] = []
            }
            dailyGroups[dayString]?.append(point)
        }
        
        // Convert to daily data with hourly breakdown
        return dailyGroups.compactMap { (dayString, points) in
            guard let dayDate = DateFormatter.dayFormatter.date(from: dayString) else { return nil }
            
            // Group points by hour within the day
            var hourlyGroups: [Int: [GlucoseDataPoint]] = [:]
            for point in points {
                let hour = calendar.component(.hour, from: point.timestamp)
                if hourlyGroups[hour] == nil {
                    hourlyGroups[hour] = []
                }
                hourlyGroups[hour]?.append(point)
            }
            
            // Create hourly data for this day
            let hourlyData = (0..<24).map { hour in
                if let hourPoints = hourlyGroups[hour], !hourPoints.isEmpty {
                    let averageGlucose = hourPoints.map { $0.glucose }.reduce(0, +) / Double(hourPoints.count)
                    return HourlyGlucoseData(hour: hour, glucose: averageGlucose, pointCount: hourPoints.count)
                } else {
                    return HourlyGlucoseData(hour: hour, glucose: nil, pointCount: 0)
                }
            }
            
            return DailyGlucoseData(day: dayDate, dayString: dayString, hourlyData: hourlyData)
        }.sorted { $0.day < $1.day }
    }
    
    private let dayColors: [Color] = [
        .blue, .red, .green, .orange, .purple, .pink, .cyan, .mint, .indigo, .brown
    ]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Glucose Chart")
                .font(.headline)
                .padding(.horizontal, 16)
            
            if dailyData.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 40))
                        .foregroundColor(.gray)
                    
                    Text("No Data Available")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text("No glucose readings found for the selected time range.")
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(40)
            } else {
                DailyOverlayChart(
                    dailyData: dailyData,
                    lowGlucose: lowGlucose,
                    highGlucose: highGlucose,
                    dayColors: dayColors
                )
                .frame(height: 300)
                .padding(.horizontal, 16)
                .background(Color(.systemBackground))
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
                
                // Days legend
                if dailyData.count > 1 {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 16) {
                            ForEach(Array(dailyData.enumerated()), id: \.element.day) { index, dayData in
                                LegendItem(
                                    color: dayColors[index % dayColors.count],
                                    label: dayData.dayString
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.horizontal, 16)
                }
            }
        }
    }
    
    private func getGlucoseColor(_ glucose: Double) -> Color {
        if glucose < lowGlucose { return .red }
        if glucose > highGlucose { return .orange }
        return .blue
    }
}

struct DailyOverlayChart: View {
    let dailyData: [DailyGlucoseData]
    let lowGlucose: Double
    let highGlucose: Double
    let dayColors: [Color]
    
    private var yMin: Double {
        min(50, lowGlucose - 20) // Show below low range with some padding
    }
    
    private var yMax: Double {
        max(300, highGlucose + 50) // Show above high range with some padding
    }
    private let chartWidth: CGFloat = 1200 // 24 hours * 50 points per hour
    private let chartHeight: CGFloat = 300 // Compact height to fit vertically
    
    var body: some View {
        GeometryReader { geometry in
            if geometry.size.width > 0 && geometry.size.height > 0 {
                ScrollView(.horizontal, showsIndicators: true) {
                    ZStack {
                        // Background zones
                        glucoseZones(in: geometry)
                        
                        // Grid lines
                        gridLines(in: geometry)
                        
                        // Daily glucose lines
                        ForEach(Array(dailyData.enumerated()), id: \.element.day) { index, dayData in
                            dailyGlucoseLine(dayData: dayData, color: dayColors[index % dayColors.count], in: geometry)
                        }
                        
                        // Data points for each day
                        ForEach(Array(dailyData.enumerated()), id: \.element.day) { index, dayData in
                            dailyDataPoints(dayData: dayData, color: dayColors[index % dayColors.count], in: geometry)
                        }
                        
                        // Y-axis labels
                        yAxisLabels(in: geometry)
                        
                        // X-axis labels (all 24 hours)
                        xAxisLabels(in: geometry)
                    }
                    .frame(width: chartWidth, height: chartHeight)
                }
            } else {
                // Fallback view when geometry is not ready
                Color.clear
            }
        }
    }
    
    private func glucoseZones(in geometry: GeometryProxy) -> some View {
        ZStack(alignment: .top) {
            let lowY = yPosition(for: lowGlucose)
            let highY = yPosition(for: highGlucose)
            
            // Below range zone (white) - from top to low glucose line
            Rectangle()
                .fill(Color.white.opacity(0.3))
                .frame(width: chartWidth, height: lowY)
                .offset(y: 0)
            
            // In range zone (white) - from low to high glucose line
            Rectangle()
                .fill(Color.white.opacity(0.3))
                .frame(width: chartWidth, height: highY - lowY)
                .offset(y: lowY)
            
            // Above range zone (white) - from high glucose line to bottom
            Rectangle()
                .fill(Color.white.opacity(0.3))
                .frame(width: chartWidth, height: chartHeight - highY)
                .offset(y: highY)
        }
        .frame(width: chartWidth, height: chartHeight)
    }
    
    private func gridLines(in geometry: GeometryProxy) -> some View {
        ZStack {
            // Horizontal grid lines
            VStack(spacing: 0) {
                ForEach(0..<5, id: \.self) { i in
                    Rectangle()
                        .fill(Color.gray.opacity(0.15))
                        .frame(height: 0.5)
                        .frame(maxWidth: .infinity)
                    
                    if i < 4 {
                        Spacer()
                    }
                }
            }
            
            // Low glucose line (gray)
            Rectangle()
                .fill(Color.gray.opacity(0.6))
                .frame(height: 1.0)
                .frame(maxWidth: .infinity)
                .offset(y: yPosition(for: lowGlucose) - chartHeight/2)
            
            // High glucose line (gray)
            Rectangle()
                .fill(Color.gray.opacity(0.6))
                .frame(height: 1.0)
                .frame(maxWidth: .infinity)
                .offset(y: yPosition(for: highGlucose) - chartHeight/2)
            
            // Vertical grid lines for hours
            HStack(spacing: 0) {
                ForEach(0..<24, id: \.self) { hour in
                    Rectangle()
                        .fill(hour % 6 == 0 ? Color.gray.opacity(0.2) : Color.gray.opacity(0.1))
                        .frame(width: hour % 6 == 0 ? 1 : 0.5)
                        .frame(maxHeight: .infinity)
                    
                    if hour < 23 {
                        Spacer()
                    }
                }
            }
        }
        .frame(width: chartWidth, height: chartHeight)
    }
    
    private func dailyGlucoseLine(dayData: DailyGlucoseData, color: Color, in geometry: GeometryProxy) -> some View {
        Path { path in
            let validPoints = dayData.hourlyData.compactMap { $0.glucose != nil ? $0 : nil }
            guard !validPoints.isEmpty else { return }
            
            // Find first valid point
            let firstValidPoint = validPoints.first { $0.glucose != nil }!
            let startX = xPosition(for: firstValidPoint.hour)
            let startY = yPosition(for: firstValidPoint.glucose!)
            
            path.move(to: CGPoint(x: startX, y: startY))
            
            // Connect all valid points
            for point in validPoints.dropFirst() {
                if let glucose = point.glucose {
                    let x = xPosition(for: point.hour)
                    let y = yPosition(for: glucose)
                    path.addLine(to: CGPoint(x: x, y: y))
                }
            }
        }
        .stroke(color, lineWidth: 1.5)
    }
    
    private func dailyDataPoints(dayData: DailyGlucoseData, color: Color, in geometry: GeometryProxy) -> some View {
        ForEach(dayData.hourlyData, id: \.hour) { hourData in
            if let glucose = hourData.glucose {
                Circle()
                    .fill(color)
                    .frame(width: 4, height: 4)
                    .position(
                        x: xPosition(for: hourData.hour),
                        y: yPosition(for: glucose)
                    )
            }
        }
    }
    
    private func yAxisLabels(in geometry: GeometryProxy) -> some View {
        VStack {
            HStack {
                Text("\(Int(yMax))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Spacer()
            }
            
            Spacer()
            
            HStack {
                Text("\(Int(highGlucose))")
                    .font(.caption2)
                    .foregroundColor(.primary)
                    .fontWeight(.semibold)
                Spacer()
            }
            
            Spacer()
            
            HStack {
                Text("\(Int(lowGlucose))")
                    .font(.caption2)
                    .foregroundColor(.primary)
                    .fontWeight(.semibold)
                Spacer()
            }
            
            Spacer()
            
            HStack {
                Text("\(Int(yMin))")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                Spacer()
            }
        }
        .padding(.leading, 4)
    }
    
    private func xAxisLabels(in geometry: GeometryProxy) -> some View {
        HStack(spacing: 0) {
            ForEach(0..<24, id: \.self) { hour in
                VStack {
                    Spacer()
                    if hour % 6 == 0 { // Show every 6th hour
                        Text("\(hour)")
                            .font(.caption2)
                            .foregroundColor(.primary)
                            .fontWeight(.medium)
                    } else if hour % 3 == 0 {
                        Text("\(hour)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    } else {
                        Text("\(hour)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .opacity(0.6)
                    }
                }
                .frame(width: chartWidth / 24, alignment: .center)
            }
        }
        .padding(.bottom, 2)
        .frame(width: chartWidth)
    }
    
    private func xPosition(for hour: Int) -> CGFloat {
        let clampedHour = max(0, min(23, hour))
        let ratio = Double(clampedHour) / 23.0
        return CGFloat(ratio) * chartWidth
    }
    
    private func yPosition(for glucose: Double) -> CGFloat {
        let clampedGlucose = max(yMin, min(yMax, glucose))
        let ratio = (clampedGlucose - yMin) / (yMax - yMin)
        let clampedRatio = max(0, min(1, ratio))
        return chartHeight - (CGFloat(clampedRatio) * chartHeight)
    }
}

struct GlucoseDataPoint {
    let timestamp: Date
    let glucose: Double
    let direction: String?
    
    init(timestamp: Int64, glucose: Double, direction: String?) {
        self.timestamp = Date(timeIntervalSince1970: Double(timestamp) / 1000)
        self.glucose = glucose
        self.direction = direction
    }
}

struct HourlyGlucoseData {
    let hour: Int
    let glucose: Double?
    let pointCount: Int
}

struct DailyGlucoseData {
    let day: Date
    let dayString: String
    let hourlyData: [HourlyGlucoseData]
}

extension DateFormatter {
    static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM dd"
        return formatter
    }()
}

struct LegendItem: View {
    let color: Color
    let label: String
    
    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

#Preview {
    GlucoseChartView(
        glucoseEntries: [],
        lowGlucose: 70,
        highGlucose: 180
    )
}
