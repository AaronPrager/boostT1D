import Foundation

class DiabetesProfileService: ObservableObject {
    static let shared = DiabetesProfileService()
    
    private let nightscoutService = NightscoutService.shared
    private let userDefaults = UserDefaults.standard
    private let localProfileKey = "localDiabetesProfile"
    
    @Published var localProfile: DiabetesProfile?
    
    private init() {
        loadLocalProfile()
    }
    
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
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(.failure(error))
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(.failure(DiabetesProfileError.invalidResponse))
                    return
                }
                
                if httpResponse.statusCode == 401 {
                    completion(.failure(DiabetesProfileError.unauthorized))
                    return
                }
                
                guard let data = data else {
                    completion(.failure(DiabetesProfileError.noData))
                    return
                }
                
                do {
                    // Web app expects an array of profiles, take the first one
                    let profiles = try JSONDecoder().decode([DiabetesProfile].self, from: data)
                    
                    if profiles.isEmpty {
                        completion(.failure(DiabetesProfileError.noProfiles))
                        return
                    }
                    
                    completion(.success(profiles[0]))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    // Local Profile Management
    func saveLocalProfile(_ profile: DiabetesProfile) {
        localProfile = profile
        if let data = try? JSONEncoder().encode(profile) {
            userDefaults.set(data, forKey: localProfileKey)
        }
    }
    
    func loadLocalProfile() {
        guard let data = userDefaults.data(forKey: localProfileKey),
              let profile = try? JSONDecoder().decode(DiabetesProfile.self, from: data) else {
            return
        }
        localProfile = profile
    }
    
    func getLocalProfile() -> DiabetesProfile? {
        return localProfile
    }
    
    func clearLocalProfile() {
        localProfile = nil
        userDefaults.removeObject(forKey: localProfileKey)
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
