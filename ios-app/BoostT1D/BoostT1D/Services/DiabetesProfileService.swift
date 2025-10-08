import Foundation

class DiabetesProfileService: ObservableObject {
    static let shared = DiabetesProfileService()
    
    private let nightscoutService = NightscoutService.shared
    
    private init() {}
    
    func fetchProfile(completion: @escaping (Result<DiabetesProfile, Error>) -> Void) {
        let settings = nightscoutService.getSettings()
        
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(DiabetesProfileError.notConfigured))
            return
        }
        
        // Use the same endpoint as web app: /api/v1/profile.json
        guard let url = URL(string: "\(settings.url)/api/v1/profile.json") else {
            completion(.failure(DiabetesProfileError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        // Use SHA1 hashed token like web app
        request.setValue(sha1(settings.apiToken), forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        print("Fetching diabetes profile from: \(url)")
        print("Using token: [HIDDEN]")
        print("Settings URL: \(settings.url)")
        print("Settings token length: \(settings.apiToken.count)")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    print("Profile API Error: \(error)")
                    completion(.failure(error))
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(.failure(DiabetesProfileError.invalidResponse))
                    return
                }
                
                if httpResponse.statusCode == 401 {
                    print("Profile API 401 - Unauthorized")
                    completion(.failure(DiabetesProfileError.unauthorized))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(DiabetesProfileError.noData))
                    return
                }
                
                // Debug: Print the raw response
                if let jsonString = String(data: data, encoding: .utf8) {
                    print("Profile API Response: \(String(jsonString.prefix(500)))...")
                }
                
                do {
                    // Web app expects an array of profiles, take the first one
                    let profiles = try JSONDecoder().decode([DiabetesProfile].self, from: data)
                    
                    if profiles.isEmpty {
                        completion(.failure(DiabetesProfileError.noProfiles))
                        return
                    }
                    
                    print("Successfully decoded \(profiles.count) profiles, using first one")
                    completion(.success(profiles[0]))
                } catch {
                    print("JSON Decoding Error: \(error)")
                    if let decodingError = error as? DecodingError {
                        switch decodingError {
                        case .typeMismatch(let type, let context):
                            print("Type mismatch: expected \(type), context: \(context)")
                        case .valueNotFound(let type, let context):
                            print("Value not found: \(type), context: \(context)")
                        case .keyNotFound(let key, let context):
                            print("Key not found: \(key), context: \(context)")
                        case .dataCorrupted(let context):
                            print("Data corrupted: \(context)")
                        @unknown default:
                            print("Unknown decoding error")
                        }
                    }
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

enum DiabetesProfileError: Error, LocalizedError {
    case notConfigured
    case invalidURL
    case noData
    case invalidResponse
    case unauthorized
    case noProfiles
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Nightscout is not configured"
        case .invalidURL:
            return "Invalid Nightscout URL"
        case .noData:
            return "No data received from Nightscout"
        case .invalidResponse:
            return "Invalid response from Nightscout"
        case .unauthorized:
            return "Unauthorized access to Nightscout. Please check your API token."
        case .noProfiles:
            return "No diabetes profiles found in Nightscout"
        }
    }
}
