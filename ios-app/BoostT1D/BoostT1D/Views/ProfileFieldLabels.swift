import SwiftUI

struct ProfileFieldLabels {
    
    static let basalRatesTitle = "Basal Rates"
    static let basalRatesDescription = "Configure basal rates by time intervals"
    static let basalRatesUnits = "U/hr"
    
    static let carbRatioTitle = "Insulin to Carb Ratio (I:C)"
    static let carbRatioDescription = "1 unit of insulin covers X grams of carbs"
    static let carbRatioUnits = "grams (g)"
    static let carbRatioFormat = "1:%.0f"
    
    static let isfTitle = "Insulin Sensitivity Factor (ISF)"
    static let isfDescription = "1 unit of insulin lowers glucose by X mg/dL"
    static let isfUnits = "mg/dL"
    static let isfFormat = "1:%.0f"
    
    static let targetRangeTitle = "Target Glucose Range"
    static let targetRangeDescription = "Typical range: 80-120 mg/dL"
    static let targetRangeUnits = "mg/dL"
    static let targetRangeFormat = "%.0f - %.0f mg/dl"
    
    static let diaTitle = "Duration of Insulin Action"
    static let diaDescription = "How long insulin remains active in your body"
    static let diaUnits = "hours"
    static let diaFormat = "%.1f hours"
    
    static let overridePresetsTitle = "Override Presets"
    static let overridePresetsDescription = "Temporary profile adjustments for special situations"
    
    static let notesTitle = "Notes"
    static let notesDescription = "Additional information about your profile"
}

struct ProfileFieldRow: View {
    let title: String
    let value: String
    let description: String?
    let units: String?
    
    init(title: String, value: String, description: String? = nil, units: String? = nil) {
        self.title = title
        self.value = value
        self.description = description
        self.units = units
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(title)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Text(value)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    if let units = units {
                        Text(units)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            if let description = description {
                Text(description)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct ProfileSectionHeader: View {
    let title: String
    let description: String?
    
    init(title: String, description: String? = nil) {
        self.title = title
        self.description = description
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.headline)
            
            if let description = description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}
