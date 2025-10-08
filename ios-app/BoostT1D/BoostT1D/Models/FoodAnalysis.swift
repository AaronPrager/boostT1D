import Foundation

struct FoodAnalysis: Codable {
    let description: String
    let carbsGrams: Double
    let confidence: String
    let notes: String
    
    enum CodingKeys: String, CodingKey {
        case description
        case carbsGrams = "carbs_grams"
        case confidence
        case notes
    }
}

enum CarbEstimationError: Error, LocalizedError {
    case imageProcessingFailed
    case noFoodDetected
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .imageProcessingFailed:
            return "Failed to process the image. Please try again."
        case .noFoodDetected:
            return "No food was detected in the image. Please try a clearer photo."
        case .unknownError:
            return "An unknown error occurred. Please try again."
        }
    }
}
