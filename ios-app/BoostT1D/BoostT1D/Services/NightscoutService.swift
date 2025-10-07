import Foundation

class NightscoutService: ObservableObject {
    static let shared = NightscoutService()
    
    @Published var settings: NightscoutSettings = NightscoutSettings()
    
    private let userDefaults = UserDefaults.standard
    private let settingsKey = "nightscoutSettings"
    
    private init() {
        loadSettings()
    }
    
    func loadSettings() {
        guard let data = userDefaults.data(forKey: settingsKey),
              let settings = try? JSONDecoder().decode(NightscoutSettings.self, from: data) else {
            return
        }
        self.settings = settings
    }
    
    func saveSettings(url: String, token: String) {
        settings = NightscoutSettings(url: url, apiToken: token, isManualMode: false)
        if let data = try? JSONEncoder().encode(settings) {
            userDefaults.set(data, forKey: settingsKey)
        }
    }
    
    func saveSettings(url: String, token: String, isManualMode: Bool) {
        settings = NightscoutSettings(url: url, apiToken: token, isManualMode: isManualMode)
        if let data = try? JSONEncoder().encode(settings) {
            userDefaults.set(data, forKey: settingsKey)
        }
    }
    
    func getSettings() -> NightscoutSettings {
        return settings
    }
    
    func testConnection(url: String, token: String, completion: @escaping (Bool, String) -> Void) {
        guard !url.isEmpty && !token.isEmpty else {
            completion(false, "Please enter both URL and API token")
            return
        }
        
        let testURL = URL(string: "\(url)/api/v1/status")!
        var request = URLRequest(url: testURL)
        request.setValue(token, forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(false, "Connection failed: \(error.localizedDescription)")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        completion(true, "Connection successful!")
                    } else {
                        completion(false, "Connection failed with status: \(httpResponse.statusCode)")
                    }
                } else {
                    completion(false, "Invalid response from server")
                }
            }
        }.resume()
    }
    
    func fetchGlucoseEntries(hours: Int = 24, completion: @escaping (Result<[NightscoutGlucoseEntry], Error>) -> Void) {
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(NightscoutError.notConfigured))
            return
        }
        
        let endTime = Int(Date().timeIntervalSince1970 * 1000)
        let startTime = endTime - (hours * 60 * 60 * 1000)
        
        var urlComponents = URLComponents(string: "\(settings.url)/api/v1/entries/sgv")
        urlComponents?.queryItems = [
            URLQueryItem(name: "find[date][$gte]", value: "\(startTime)"),
            URLQueryItem(name: "find[date][$lte]", value: "\(endTime)"),
            URLQueryItem(name: "count", value: "1000")
        ]
        
        guard let url = urlComponents?.url else {
            completion(.failure(NightscoutError.invalidURL))
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
                    completion(.failure(NightscoutError.noData))
                    return
                }
                
                do {
                    let glucoseEntries = try JSONDecoder().decode([NightscoutGlucoseEntry].self, from: data)
                    completion(.success(glucoseEntries))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    func fetchTreatments(settings: NightscoutSettings, hours: Int = 24, completion: @escaping (Result<[NightscoutTreatment], Error>) -> Void) {
        self.fetchTreatmentsNoFilter(settings: settings) { result in
            switch result {
            case .success(let allTreatments):
                let endDate = Date()
                let startDate = Calendar.current.date(byAdding: .hour, value: -hours, to: endDate) ?? endDate
                
                let filteredTreatments = allTreatments.filter { treatment in
                    if let mills = treatment.mills, mills > 0 {
                        let treatmentDate = Date(timeIntervalSince1970: Double(mills) / 1000)
                        return treatmentDate >= startDate && treatmentDate <= endDate
                    } else if let created_at = treatment.created_at {
                        let formatter = DateFormatter()
                        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
                        formatter.timeZone = TimeZone(abbreviation: "UTC")
                        if let treatmentDate = formatter.date(from: created_at) {
                            return treatmentDate >= startDate && treatmentDate <= endDate
                        }
                    }
                    return false
                }
                print("Fetched \(allTreatments.count) total treatments, filtered to \(filteredTreatments.count) for \(hours) hours")
                completion(.success(filteredTreatments))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    private func fetchTreatmentsNoFilter(settings: NightscoutSettings, completion: @escaping (Result<[NightscoutTreatment], Error>) -> Void) {
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(NightscoutError.notConfigured))
            return
        }
        
        var urlComponents = URLComponents(string: "\(settings.url)/api/v1/treatments")
        urlComponents?.queryItems = [
            URLQueryItem(name: "count", value: "5000")
        ]
        
        guard let url = urlComponents?.url else {
            completion(.failure(NightscoutError.invalidURL))
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
                    completion(.failure(NightscoutError.noData))
                    return
                }
                
                do {
                    let treatments = try JSONDecoder().decode([NightscoutTreatment].self, from: data)
                    completion(.success(treatments))
                } catch {
                    print("JSON Decoding Error: \(error)")
                    if let responseString = String(data: data, encoding: .utf8) {
                        print("Response: \(responseString)")
                    }
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    func fetchIOB(completion: @escaping (Result<IOBResult, Error>) -> Void) {
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(NightscoutError.notConfigured))
            return
        }
        
        guard let url = URL(string: "\(settings.url)/api/v1/iob") else {
            completion(.failure(NightscoutError.invalidURL))
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
                    completion(.failure(NightscoutError.noData))
                    return
                }
                
                do {
                    let iobResult = try JSONDecoder().decode(IOBResult.self, from: data)
                    completion(.success(iobResult))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
    
    func fetchCOB(completion: @escaping (Result<COBResult, Error>) -> Void) {
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(NightscoutError.notConfigured))
            return
        }
        
        guard let url = URL(string: "\(settings.url)/api/v1/cob") else {
            completion(.failure(NightscoutError.invalidURL))
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
                    completion(.failure(NightscoutError.noData))
                    return
                }
                
                do {
                    let cobResult = try JSONDecoder().decode(COBResult.self, from: data)
                    completion(.success(cobResult))
                } catch {
                    completion(.failure(error))
                }
            }
        }.resume()
    }
}

enum NightscoutError: Error, LocalizedError {
    case notConfigured
    case invalidURL
    case noData
    case connectionFailed
    
    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Nightscout is not configured"
        case .invalidURL:
            return "Invalid Nightscout URL"
        case .noData:
            return "No data received from Nightscout"
        case .connectionFailed:
            return "Failed to connect to Nightscout"
        }
    }
}