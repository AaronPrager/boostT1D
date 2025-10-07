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
        
        guard let url = URL(string: "\(settings.url)/api/v1/profile") else {
            completion(.failure(DiabetesProfileError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(settings.apiToken, forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(DiabetesProfileError.noData))
                    return
                }
                
                do {
                    let profile = try JSONDecoder().decode(DiabetesProfile.self, from: data)
                    completion(.success(profile))
                } catch {
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
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Nightscout is not configured"
        case .invalidURL:
            return "Invalid Nightscout URL"
        case .noData:
            return "No data received from Nightscout"
        }
    }
}
