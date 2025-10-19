import Foundation
import UIKit

class APIService: ObservableObject {
    static let shared = APIService()
    
    private let baseURL = Config.geminiBaseURL
    private let apiKey = Config.geminiAPIKey
    
    private init() {}
    
    func analyzeTherapyAdjustments(glucoseEntries: [NightscoutGlucoseEntry], 
                                   treatments: [NightscoutTreatment],
                                   lowGlucose: Double,
                                   highGlucose: Double,
                                   timeRangeDays: Int,
                                   isClosedLoop: Bool = false,
                                   completion: @escaping (Result<AITherapySuggestions, Error>) -> Void) {
        
        // Check if API key is available
        guard !apiKey.isEmpty else {
            completion(.failure(NSError(domain: "APIService", code: 1001, userInfo: [NSLocalizedDescriptionKey: "AI features are not available. API key not configured."])))
            return
        }
        
        // Prepare glucose data summary
        let glucoseSummary = prepareGlucoseSummary(glucoseEntries: glucoseEntries, lowGlucose: lowGlucose, highGlucose: highGlucose)
        
        // Prepare treatment summary
        let treatmentSummary = prepareTreatmentSummary(treatments: treatments)
        
        let closedLoopNote = isClosedLoop ? """
        
        ⚠️ CLOSED LOOP SYSTEM ACTIVE (Loop/OpenAPS/AAPS):
        - This patient uses an automated insulin delivery system
        - IGNORE frequent basal rate changes - these are algorithm-driven micro-adjustments
        - Focus ONLY on baseline basal profile adjustments that persist across multiple days
        - Do NOT suggest basal changes for short-term patterns (< 3 days)
        - Prioritize carb ratio and correction factor suggestions over basal adjustments
        - Consider that the algorithm is already making real-time adjustments
        """ : ""
        
        let prompt = """
        You are a diabetes management AI expert specializing in insulin therapy optimization. Analyze this patient's glucose data and provide VERY CONSERVATIVE therapy adjustment suggestions.
        
        PATIENT DATA SUMMARY:
        \(glucoseSummary)
        
        TREATMENT SUMMARY:
        \(treatmentSummary)
        
        TARGET RANGE: \(Int(lowGlucose))-\(Int(highGlucose)) mg/dL
        ANALYSIS PERIOD: \(timeRangeDays) days\(closedLoopNote)
        
        CRITICAL REQUIREMENTS:
        1. Insulin onset time is 20 minutes - consider this for timing recommendations
        2. ONLY suggest adjustments of 2-5% (e.g., 0.02-0.05 U/hr for basal)
        3. Only suggest changes if patterns are CLEAR and CONSISTENT
        4. Prioritize safety over optimization
        5. Consider insulin action timing in all suggestions
        6. Recommend pre-bolusing 15-20 minutes before meals if post-meal spikes detected
        
        Please analyze by 2-HOUR time slots for more granular recommendations:
        - 00:00-02:00 (Early night)
        - 02:00-04:00 (Deep night)
        - 04:00-06:00 (Late night)
        - 06:00-08:00 (Early morning)
        - 08:00-10:00 (Mid morning)
        - 10:00-12:00 (Late morning)
        - 12:00-14:00 (Early afternoon/lunch)
        - 14:00-16:00 (Mid afternoon)
        - 16:00-18:00 (Late afternoon)
        - 18:00-20:00 (Early evening/dinner)
        - 20:00-22:00 (Mid evening)
        - 22:00-24:00 (Late evening)
        
        Respond in this EXACT JSON format:
        {
          "suggestions": [
            {
              "type": "basal_rate|correction_factor|carb_ratio|timing",
              "timeSlot": "HH:MM-HH:MM or description",
              "currentValue": number,
              "suggestedValue": number,
              "adjustmentPercent": number (2-5 only),
              "priority": "high|medium|low",
              "reasoning": "detailed explanation considering insulin timing"
            }
          ],
          "overallConfidence": number (0-1),
          "keyFindings": ["finding 1", "finding 2", ...],
          "safetyNotes": ["note 1", "note 2", ...]
        }
        
        Only include suggestions where there is CLEAR evidence. If control is good, suggest minimal or no changes.
        """
        
        let requestBody = GeminiRequest(
            contents: [
                Content(
                    parts: [
                        Part(text: prompt)
                    ]
                )
            ]
        )
        
        guard let url = URL(string: "\(baseURL)?key=\(apiKey)") else {
            completion(.failure(TherapyAnalysisError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(TherapyAnalysisError.noDataReceived))
                return
            }
            
            do {
                let geminiResponse = try JSONDecoder().decode(GeminiResponse.self, from: data)
                
                if let candidate = geminiResponse.candidates.first,
                   let text = candidate.content.parts.first?.text {
                    
                    // Extract JSON from the response text
                    if let jsonData = self.extractJSON(from: text) {
                        let aiSuggestions = try JSONDecoder().decode(AITherapySuggestions.self, from: jsonData)
                        completion(.success(aiSuggestions))
                    } else {
                        completion(.failure(TherapyAnalysisError.invalidResponse))
                    }
                } else {
                    completion(.failure(TherapyAnalysisError.invalidResponse))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    private func prepareGlucoseSummary(glucoseEntries: [NightscoutGlucoseEntry], lowGlucose: Double, highGlucose: Double) -> String {
        guard !glucoseEntries.isEmpty else { return "No glucose data available" }
        
        let glucoseValues = glucoseEntries.map { Double($0.sgv) }
        let average = glucoseValues.reduce(0, +) / Double(glucoseValues.count)
        let inRange = glucoseValues.filter { $0 >= lowGlucose && $0 <= highGlucose }.count
        let timeInRange = Double(inRange) / Double(glucoseValues.count) * 100
        let belowRange = glucoseValues.filter { $0 < lowGlucose }.count
        let aboveRange = glucoseValues.filter { $0 > highGlucose }.count
        
        // Analyze by 2-hour time slots
        var timeSlotData: [String: [Double]] = [
            "00:00-02:00": [],
            "02:00-04:00": [],
            "04:00-06:00": [],
            "06:00-08:00": [],
            "08:00-10:00": [],
            "10:00-12:00": [],
            "12:00-14:00": [],
            "14:00-16:00": [],
            "16:00-18:00": [],
            "18:00-20:00": [],
            "20:00-22:00": [],
            "22:00-24:00": []
        ]
        
        for entry in glucoseEntries {
            let date = Date(timeIntervalSince1970: Double(entry.date) / 1000)
            let hour = Calendar.current.component(.hour, from: date)
            let timeSlot = getTimeSlotKey(for: hour)
            timeSlotData[timeSlot]?.append(Double(entry.sgv))
        }
        
        var summary = """
        Total Readings: \(glucoseValues.count)
        Average Glucose: \(Int(average)) mg/dL
        Time in Range: \(Int(timeInRange))%
        Time Below Range: \(Int(Double(belowRange) / Double(glucoseValues.count) * 100))%
        Time Above Range: \(Int(Double(aboveRange) / Double(glucoseValues.count) * 100))%
        
        BY TIME SLOT:
        """
        
        for (slot, values) in timeSlotData.sorted(by: { $0.key < $1.key }) where !values.isEmpty {
            let slotAvg = values.reduce(0, +) / Double(values.count)
            let slotInRange = values.filter { $0 >= lowGlucose && $0 <= highGlucose }.count
            let slotTIR = Double(slotInRange) / Double(values.count) * 100
            summary += "\n\(slot): Avg \(Int(slotAvg)) mg/dL, TIR \(Int(slotTIR))%, \(values.count) readings"
        }
        
        return summary
    }
    
    private func prepareTreatmentSummary(treatments: [NightscoutTreatment]) -> String {
        let corrections = treatments.filter { $0.eventType == "Correction Bolus" || $0.eventType == "Bolus" }.count
        let carbs = treatments.filter { $0.eventType == "Carb" || $0.eventType == "Meal Bolus" }.count
        let tempBasals = treatments.filter { $0.eventType == "Temp Basal" }.count
        
        return """
        Total Treatments: \(treatments.count)
        Correction Boluses: \(corrections)
        Carb/Meal Entries: \(carbs)
        Temp Basals: \(tempBasals)
        """
    }
    
    private func getTimeSlotKey(for hour: Int) -> String {
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
    
    func analyzeFood(image: UIImage, completion: @escaping (Result<FoodAnalysis, Error>) -> Void) {
        // Check if API key is available
        guard !apiKey.isEmpty else {
            completion(.failure(NSError(domain: "APIService", code: 1001, userInfo: [NSLocalizedDescriptionKey: "AI features are not available. API key not configured."])))
            return
        }
        
        guard let imageData = image.jpegData(compressionQuality: 0.8) else {
            completion(.failure(CarbEstimationError.imageProcessingFailed))
            return
        }
        
        let base64Image = imageData.base64EncodedString()
        
        let requestBody = GeminiRequest(
            contents: [
                Content(
                    parts: [
                        Part(text: """
                        Analyze this food image and estimate the carbohydrate content. Please provide:
                        1. A brief description of the food items you see
                        2. An estimated total carbohydrates in grams
                        3. Your confidence level (High/Medium/Low)
                        4. Any important notes about the estimation
                        
                        Please be as accurate as possible and consider typical serving sizes. Respond in this exact JSON format:
                        {
                          "description": "description of food items",
                          "carbs_grams": number,
                          "confidence": "High/Medium/Low",
                          "notes": "relevant notes about the estimation"
                        }
                        """),
                        Part(inlineData: InlineData(mimeType: "image/jpeg", data: base64Image))
                    ]
                )
            ]
        )
        
        guard let url = URL(string: "\(baseURL)?key=\(apiKey)") else {
            completion(.failure(CarbEstimationError.unknownError))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        do {
            request.httpBody = try JSONEncoder().encode(requestBody)
        } catch {
            completion(.failure(error))
            return
        }
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(CarbEstimationError.unknownError))
                return
            }
            
            do {
                let geminiResponse = try JSONDecoder().decode(GeminiResponse.self, from: data)
                
                if let candidate = geminiResponse.candidates.first,
                   let text = candidate.content.parts.first?.text {
                    
                    // Extract JSON from the response text
                    if let jsonData = self.extractJSON(from: text) {
                        let foodAnalysis = try JSONDecoder().decode(FoodAnalysis.self, from: jsonData)
                        completion(.success(foodAnalysis))
                    } else {
                        completion(.failure(CarbEstimationError.noFoodDetected))
                    }
                } else {
                    completion(.failure(CarbEstimationError.noFoodDetected))
                }
            } catch {
                completion(.failure(error))
            }
        }.resume()
    }
    
    private func extractJSON(from text: String) -> Data? {
        // Look for JSON object in the response
        if let startIndex = text.range(of: "{")?.lowerBound,
           let endIndex = text.range(of: "}", options: .backwards)?.upperBound {
            let jsonString = String(text[startIndex..<endIndex])
            return jsonString.data(using: .utf8)
        }
        return nil
    }
}

struct GeminiRequest: Codable {
    let contents: [Content]
}

struct Content: Codable {
    let parts: [Part]
}

struct Part: Codable {
    let text: String?
    let inlineData: InlineData?
    
    init(text: String) {
        self.text = text
        self.inlineData = nil
    }
    
    init(inlineData: InlineData) {
        self.text = nil
        self.inlineData = inlineData
    }
}

struct InlineData: Codable {
    let mimeType: String
    let data: String
}

struct GeminiResponse: Codable {
    let candidates: [Candidate]
}

struct Candidate: Codable {
    let content: Content
}

struct AITherapySuggestions: Codable {
    let suggestions: [AISuggestion]
    let overallConfidence: Double
    let keyFindings: [String]
    let safetyNotes: [String]
}

struct AISuggestion: Codable {
    let type: String
    let timeSlot: String
    let currentValue: Double
    let suggestedValue: Double
    let adjustmentPercent: Double
    let priority: String
    let reasoning: String
}

enum TherapyAnalysisError: Error {
    case invalidURL
    case noDataReceived
    case invalidResponse
    case insufficientData
}
