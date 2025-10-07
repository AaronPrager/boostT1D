import SwiftUI

struct BloodGlucoseDataView: View {
    @StateObject private var nightscoutService = NightscoutService.shared
    @State private var glucoseEntries: [NightscoutGlucoseEntry] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedTimeRange: Int = 3
    
    private let timeRangeOptions = [1, 3, 7, 30]
    private let timeRangeLabels = ["1 day", "3 days", "7 days", "1 month"]
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "heart.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.red)
                    
                    Text("Blood Glucose Data")
                        .font(.title)
                        .fontWeight(.semibold)
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
                } else if glucoseEntries.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "heart.slash")
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
                } else {
                    // Glucose Chart Placeholder
                    VStack(spacing: 16) {
                        Text("Glucose Chart")
                            .font(.headline)
                        
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color(.systemGray5))
                            .frame(height: 200)
                            .overlay(
                                VStack {
                                    Image(systemName: "chart.line.uptrend.xyaxis")
                                        .font(.system(size: 40))
                                        .foregroundColor(.gray)
                                    Text("Chart will be implemented here")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                            )
                    }
                    .padding(16)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
                    .padding(.horizontal, 20)
                    
                    // Statistics Placeholder
                    VStack(spacing: 16) {
                        Text("Statistics")
                            .font(.headline)
                        
                        HStack(spacing: 20) {
                            StatCard(title: "Average", value: "120", unit: "mg/dL", color: .blue)
                            StatCard(title: "Range", value: "80-180", unit: "mg/dL", color: .green)
                        }
                        
                        HStack(spacing: 20) {
                            StatCard(title: "Time in Range", value: "75", unit: "%", color: .orange)
                            StatCard(title: "Est. A1C", value: "6.2", unit: "%", color: .purple)
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
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
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

#Preview {
    BloodGlucoseDataView()
}
