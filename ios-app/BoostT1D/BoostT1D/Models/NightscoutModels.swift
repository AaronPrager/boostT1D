import Foundation

// MARK: - Nightscout Settings
struct NightscoutSettings: Codable {
    var url: String
    var apiToken: String
    var isManualMode: Bool
    var lowGlucose: Double
    var highGlucose: Double
    
    init(url: String = "", apiToken: String = "", isManualMode: Bool = false, lowGlucose: Double = 70.0, highGlucose: Double = 180.0) {
        self.url = url
        self.apiToken = apiToken
        self.isManualMode = isManualMode
        self.lowGlucose = lowGlucose
        self.highGlucose = highGlucose
    }
}

// MARK: - Glucose Entry
struct NightscoutGlucoseEntry: Codable, Identifiable {
    let id = UUID()
    let sgv: Int
    let direction: String?
    let date: Int64
    let device: String?
    let noise: Int?
    
    enum CodingKeys: String, CodingKey {
        case sgv, direction, date, device, noise
    }
}

// MARK: - Treatment
struct NightscoutTreatment: Codable {
    let _id: String?
    let id: String?
    let eventType: String?
    let created_at: String?
    let timestamp: String?
    let mills: Int64?
    let enteredBy: String?
    let insulin: Double?
    let carbs: Double?
    let notes: String?
    let glucose: String?
    let glucoseType: String?
    let units: String?
    let duration: Int?
    let rate: Double?
    let absolute: Double?
    let utcOffset: Int?
    
    enum CodingKeys: String, CodingKey {
        case _id, id, insulin, carbs, notes, glucose, units, mills, duration, rate, absolute, utcOffset
        case eventType = "eventType"
        case created_at = "created_at"
        case timestamp = "timestamp"
        case enteredBy = "enteredBy"
        case glucoseType = "glucoseType"
    }
}

// MARK: - IOB/COB Results
struct IOBResult: Codable {
    let iob: Double
    let activity: Double
    let bolusinsulin: Double
    let basaliob: Double
    let time: String
}

struct COBResult: Codable {
    let cob: Double
    let time: String
}

// MARK: - Time Value
struct TimeValue: Codable, Identifiable {
    let id = UUID()
    let time: String
    let value: Double
}

extension TimeValue {
    var displayValue: String {
        return "\(time) - \(String(format: "%.1f", value))"
    }
    
    var timeFormatted: String {
        // Ensure time is in HH:MM format
        let components = time.components(separatedBy: ":")
        if components.count == 2 {
            let hour = String(format: "%02d", Int(components[0]) ?? 0)
            let minute = String(format: "%02d", Int(components[1]) ?? 0)
            return "\(hour):\(minute)"
        }
        return time
    }
}

// MARK: - Diabetes Profile
struct DiabetesProfile: Codable {
    let _id: String?
    let defaultProfile: String?
    let store: [String: ProfileData]?
    let startDate: String?
    let mills: Int64?
    let units: String?
    let created_at: String?
    let deviceToken: String?
    let overridePresets: [OverridePreset]?
    let enteredBy: String?
}

struct OverridePreset: Codable {
    let name: String?
    let target: Int?
    let percentage: Int?
    let duration: Int?
}

struct ProfileData: Codable {
    let timezone: String?
    let units: String?
    let dia: Double?
    let carbratio: [TimeValue]?
    let carb_ratio: [TimeValue]?
    let sens: [TimeValue]?
    let sensitivity: [TimeValue]?
    let basal: [TimeValue]?
    let target_low: [TimeValue]?
    let target_high: [TimeValue]?
    let startDate: String?
    let created_at: String?
    let notes: String?
    let pump: PumpSettings?
}

struct PumpSettings: Codable {
    let units: String?
    let activeProfile: String?
    let timezone: String?
    let reservoir: String?
    let status: String?
    let clock: String?
    let battery: String?
    let model: String?
    let serialNumber: String?
    let bolusing: Bool?
    let suspended: Bool?
    let delivering: Bool?
}
