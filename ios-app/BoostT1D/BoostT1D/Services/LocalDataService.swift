import Foundation

class LocalDataService: ObservableObject {
    static let shared = LocalDataService()
    
    @Published var localGlucoseEntries: [NightscoutGlucoseEntry] = []
    @Published var localTreatments: [NightscoutTreatment] = []
    
    private let userDefaults = UserDefaults.standard
    private let glucoseKey = "localGlucoseEntries"
    private let treatmentsKey = "localTreatments"
    private let maxDataAge: TimeInterval = 7 * 24 * 60 * 60 // 7 days in seconds
    
    private init() {
        loadLocalData()
    }
    
    // MARK: - Glucose Entries
    func addGlucoseEntry(value: Int, notes: String? = nil) {
        let entry = NightscoutGlucoseEntry(
            sgv: value,
            direction: nil,
            date: Int64(Date().timeIntervalSince1970 * 1000),
            device: "Manual Entry",
            noise: nil
        )
        
        localGlucoseEntries.append(entry)
        cleanupOldData()
        saveToUserDefaults()
    }
    
    func deleteGlucoseEntry(_ entry: NightscoutGlucoseEntry) {
        localGlucoseEntries.removeAll { $0.id == entry.id }
        saveToUserDefaults()
    }
    
    // MARK: - Treatments
    func addTreatment(type: String, insulin: Double? = nil, carbs: Double? = nil, notes: String? = nil) {
        let treatment = NightscoutTreatment(
            _id: UUID().uuidString,
            id: UUID().uuidString,
            eventType: type,
            created_at: ISO8601DateFormatter().string(from: Date()),
            timestamp: ISO8601DateFormatter().string(from: Date()),
            mills: Int64(Date().timeIntervalSince1970 * 1000),
            enteredBy: "Manual Entry",
            insulin: insulin,
            carbs: carbs,
            notes: notes,
            glucose: nil,
            glucoseType: nil,
            units: "mg/dl",
            duration: nil,
            rate: nil,
            absolute: nil,
            utcOffset: nil
        )
        
        localTreatments.append(treatment)
        cleanupOldData()
        saveToUserDefaults()
    }
    
    func deleteTreatment(_ treatment: NightscoutTreatment) {
        localTreatments.removeAll { $0.id == treatment.id }
        saveToUserDefaults()
    }
    
    // MARK: - Data Management
    private func cleanupOldData() {
        let cutoffDate = Date().timeIntervalSince1970 - maxDataAge
        
        localGlucoseEntries.removeAll { entry in
            Double(entry.date) / 1000 < cutoffDate
        }
        
        localTreatments.removeAll { treatment in
            if let mills = treatment.mills {
                return Double(mills) / 1000 < cutoffDate
            }
            return false
        }
    }
    
    private func loadLocalData() {
        // Load glucose entries
        if let glucoseData = userDefaults.data(forKey: glucoseKey),
           let entries = try? JSONDecoder().decode([NightscoutGlucoseEntry].self, from: glucoseData) {
            localGlucoseEntries = entries
        }
        
        // Load treatments
        if let treatmentData = userDefaults.data(forKey: treatmentsKey),
           let treatments = try? JSONDecoder().decode([NightscoutTreatment].self, from: treatmentData) {
            localTreatments = treatments
        }
        
        cleanupOldData()
    }
    
    private func saveToUserDefaults() {
        // Save glucose entries
        if let glucoseData = try? JSONEncoder().encode(localGlucoseEntries) {
            userDefaults.set(glucoseData, forKey: glucoseKey)
        }
        
        // Save treatments
        if let treatmentData = try? JSONEncoder().encode(localTreatments) {
            userDefaults.set(treatmentData, forKey: treatmentsKey)
        }
    }
    
    // MARK: - Data Access
    func getGlucoseEntriesForTimeRange(hours: Int) -> [NightscoutGlucoseEntry] {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .hour, value: -hours, to: endDate) ?? endDate
        
        return localGlucoseEntries.filter { entry in
            let entryDate = Date(timeIntervalSince1970: Double(entry.date) / 1000)
            return entryDate >= startDate && entryDate <= endDate
        }.sorted { $0.date > $1.date }
    }
    
    func getTreatmentsForTimeRange(hours: Int) -> [NightscoutTreatment] {
        let endDate = Date()
        let startDate = Calendar.current.date(byAdding: .hour, value: -hours, to: endDate) ?? endDate
        
        return localTreatments.filter { treatment in
            if let mills = treatment.mills {
                let treatmentDate = Date(timeIntervalSince1970: Double(mills) / 1000)
                return treatmentDate >= startDate && treatmentDate <= endDate
            }
            return false
        }.sorted { 
            let date1 = $0.mills ?? 0
            let date2 = $1.mills ?? 0
            return date1 > date2
        }
    }
    
    func getAllGlucoseEntries() -> [NightscoutGlucoseEntry] {
        return localGlucoseEntries.sorted { $0.date > $1.date }
    }
    
    func getAllTreatments() -> [NightscoutTreatment] {
        return localTreatments.sorted {
            let date1 = $0.mills ?? 0
            let date2 = $1.mills ?? 0
            return date1 > date2
        }
    }
    
    func clearAllData() {
        localGlucoseEntries.removeAll()
        localTreatments.removeAll()
        saveToUserDefaults()
    }
}

