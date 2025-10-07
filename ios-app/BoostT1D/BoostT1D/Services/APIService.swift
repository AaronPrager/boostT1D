import Foundation
import UIKit

class APIService: ObservableObject {
    static let shared = APIService()
    
    private let baseURL = Config.geminiBaseURL
    private let apiKey = Config.geminiAPIKey
    
    private init() {}
    
    func analyzeFood(image: UIImage, completion: @escaping (Result<FoodAnalysis, Error>) -> Void) {
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

// MARK: - Gemini API Models
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
