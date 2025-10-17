import Foundation
import CryptoKit

// SHA1 hashing function to match web app
func sha1(_ string: String) -> String {
    let data = Data(string.utf8)
    let hash = Insecure.SHA1.hash(data: data)
    return hash.map { String(format: "%02hhx", $0) }.joined()
}

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
    
    func saveSettings(url: String, token: String, isManualMode: Bool, lowGlucose: Double = 70.0, highGlucose: Double = 180.0) {
        settings = NightscoutSettings(url: url, apiToken: token, isManualMode: isManualMode, lowGlucose: lowGlucose, highGlucose: highGlucose)
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
        
        // Clean up URL - remove trailing slash and ensure proper format
        var cleanURL = url.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanURL.hasSuffix("/") {
            cleanURL = String(cleanURL.dropLast())
        }
        
        let testURL = URL(string: "\(cleanURL)/api/v1/status")!
        
        // Try api-secret header first (most common)
        testConnectionWithHeader(url: testURL, token: token, headerField: "api-secret") { success, message in
            if success {
                completion(true, message)
            } else {
                // Try X-API-Key header if api-secret failed
                self.testConnectionWithHeader(url: testURL, token: token, headerField: "X-API-Key") { success, message in
                    if success {
                        completion(true, message)
                    } else {
                        // Try query parameter authentication as last resort
                        self.testConnectionWithQueryParam(url: cleanURL, token: token, completion: completion)
                    }
                }
            }
        }
    }
    
    private func testConnectionWithHeader(url: URL, token: String, headerField: String, completion: @escaping (Bool, String) -> Void) {
        var request = URLRequest(url: url)
        request.setValue(sha1(token), forHTTPHeaderField: headerField)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
                
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(false, "Connection failed: \(error.localizedDescription)")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        completion(true, "Connected!")
                    } else if httpResponse.statusCode == 401 {
                        completion(false, "Authentication failed with \(headerField)")
                    } else if httpResponse.statusCode == 404 {
                        completion(false, "API endpoint not found (404). Please check:\n• URL is correct\n• Nightscout instance is running\n• API is enabled")
                    } else {
                        completion(false, "Connection failed with status: \(httpResponse.statusCode)")
                    }
                } else {
                    completion(false, "Invalid response from server")
                }
            }
        }.resume()
    }
    
    func testConnectionWithQueryParam(url: String, token: String, completion: @escaping (Bool, String) -> Void) {
        guard !url.isEmpty && !token.isEmpty else {
            completion(false, "Please enter both URL and API token")
            return
        }
        
        // Clean up URL - remove trailing slash and ensure proper format
        var cleanURL = url.trimmingCharacters(in: .whitespacesAndNewlines)
        if cleanURL.hasSuffix("/") {
            cleanURL = String(cleanURL.dropLast())
        }
        
        // Try with query parameter authentication
        let testURL = URL(string: "\(cleanURL)/api/v1/status?token=\(token)")!
        var request = URLRequest(url: testURL)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
                
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(false, "Connection failed: \(error.localizedDescription)")
                    return
                }
                
                if let httpResponse = response as? HTTPURLResponse {
                    if httpResponse.statusCode == 200 {
                        completion(true, "Connected!")
                    } else {
                        completion(false, "Query parameter authentication failed with status: \(httpResponse.statusCode)")
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
        
        let startDate = Date(timeIntervalSince1970: Double(startTime) / 1000)
        let endDate = Date(timeIntervalSince1970: Double(endTime) / 1000)
        
        // Calculate appropriate count based on time range (matching web app logic)
        let timeDiffDays = Double(hours) / 24.0
        let queryLimit: Int
        if timeDiffDays >= 30 {
            queryLimit = 10000 // For month+ views
        } else if timeDiffDays >= 7 {
            queryLimit = 5000  // For week+ views
        } else {
            queryLimit = 1000  // For short periods
        }
        
        
        var urlComponents = URLComponents(string: "\(settings.url)/api/v1/entries/sgv")
        urlComponents?.queryItems = [
            URLQueryItem(name: "find[date][$gte]", value: "\(startTime)"),
            URLQueryItem(name: "find[date][$lte]", value: "\(endTime)"),
            URLQueryItem(name: "count", value: "\(queryLimit)")
        ]
        
        guard let url = urlComponents?.url else {
            completion(.failure(NightscoutError.invalidURL))
            return
        }
        
        
        // Try multiple authentication methods
        self.fetchGlucoseWithHeader(url: url, settings: settings, completion: completion)
    }
    
    private func fetchGlucoseWithHeader(url: URL, settings: NightscoutSettings, completion: @escaping (Result<[NightscoutGlucoseEntry], Error>) -> Void) {
        var request = URLRequest(url: url)
        // Use SHA1 hashed token like the web app
        let hashedToken = sha1(settings.apiToken)
        request.setValue(hashedToken, forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    // Try X-API-Key header
                    self.fetchGlucoseWithXAPIKey(url: url, settings: settings, completion: completion)
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(.failure(NightscoutError.connectionFailed))
                    return
                }
                
                if httpResponse.statusCode == 401 {
                    self.fetchGlucoseWithXAPIKey(url: url, settings: settings, completion: completion)
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
                    // Try parsing as TSV format
                    if let responseString = String(data: data, encoding: .utf8) {
                        let glucoseEntries = self.parseTSVGlucoseData(responseString)
                        if !glucoseEntries.isEmpty {
                            completion(.success(glucoseEntries))
                        } else {
                            completion(.failure(error))
                        }
                    } else {
                        completion(.failure(error))
                    }
                }
            }
        }.resume()
    }
    
    private func fetchGlucoseWithXAPIKey(url: URL, settings: NightscoutSettings, completion: @escaping (Result<[NightscoutGlucoseEntry], Error>) -> Void) {
        var request = URLRequest(url: url)
        // Try with SHA1 hashed token
        let hashedToken = sha1(settings.apiToken)
        request.setValue(hashedToken, forHTTPHeaderField: "X-API-Key")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    // Try query parameter
                    self.fetchGlucoseWithQueryParam(url: url, settings: settings, completion: completion)
                    return
                }
                
                guard let httpResponse = response as? HTTPURLResponse else {
                    completion(.failure(NightscoutError.connectionFailed))
                    return
                }
                
                if httpResponse.statusCode == 401 {
                    self.fetchGlucoseWithQueryParam(url: url, settings: settings, completion: completion)
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
                    // Try parsing as TSV format
                    if let responseString = String(data: data, encoding: .utf8) {
                        let glucoseEntries = self.parseTSVGlucoseData(responseString)
                        if !glucoseEntries.isEmpty {
                            completion(.success(glucoseEntries))
                        } else {
                            // Try query parameter
                            self.fetchGlucoseWithQueryParam(url: url, settings: settings, completion: completion)
                        }
                    } else {
                        // Try query parameter
                        self.fetchGlucoseWithQueryParam(url: url, settings: settings, completion: completion)
                    }
                }
            }
        }.resume()
    }
    
    private func fetchGlucoseWithQueryParam(url: URL, settings: NightscoutSettings, completion: @escaping (Result<[NightscoutGlucoseEntry], Error>) -> Void) {
        var urlComponents = URLComponents(url: url, resolvingAgainstBaseURL: false)
        // Try with SHA1 hashed token
        let hashedToken = sha1(settings.apiToken)
        urlComponents?.queryItems?.append(URLQueryItem(name: "token", value: hashedToken))
        
        guard let finalUrl = urlComponents?.url else {
            completion(.failure(NightscoutError.invalidURL))
            return
        }
        
        var request = URLRequest(url: finalUrl)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
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
                    // Try parsing as TSV format
                    if let responseString = String(data: data, encoding: .utf8) {
                        let glucoseEntries = self.parseTSVGlucoseData(responseString)
                        if !glucoseEntries.isEmpty {
                            completion(.success(glucoseEntries))
                        } else {
                            completion(.failure(error))
                        }
                    } else {
                        completion(.failure(error))
                    }
                }
            }
        }.resume()
    }
    
    private func parseTSVGlucoseData(_ tsvString: String) -> [NightscoutGlucoseEntry] {
        var glucoseEntries: [NightscoutGlucoseEntry] = []
        
        let lines = tsvString.components(separatedBy: .newlines)
        
        for line in lines {
            let trimmedLine = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if trimmedLine.isEmpty {
                continue
            }
            
            // Split by tab character
            let fields = trimmedLine.components(separatedBy: "\t")
            
            // Expected format: "2025-10-07T21:09:52.013Z"	1759871392013	181	"FortyFiveUp"	"unknown"
            // Fields: [0] = ISO date string, [1] = timestamp, [2] = sgv, [3] = direction, [4] = device/noise
            if fields.count >= 3 {
                let isoDateString = fields[0].trimmingCharacters(in: .whitespacesAndNewlines)
                let timestampString = fields[1].trimmingCharacters(in: .whitespacesAndNewlines)
                let sgvString = fields[2].trimmingCharacters(in: .whitespacesAndNewlines)
                
                // Parse timestamp
                guard let timestamp = Int64(timestampString) else {
                    continue
                }
                
                // Parse SGV value
                guard let sgv = Int(sgvString) else {
                    continue
                }
                
                // Parse direction (remove quotes if present)
                let direction = fields.count > 3 ? fields[3].trimmingCharacters(in: CharacterSet(charactersIn: "\"")) : nil
                
                // Parse device/noise (remove quotes if present)
                let device = fields.count > 4 ? fields[4].trimmingCharacters(in: CharacterSet(charactersIn: "\"")) : nil
                let noise = device == "unknown" ? nil : Int(device ?? "")
                
                let entry = NightscoutGlucoseEntry(
                    sgv: sgv,
                    direction: direction,
                    date: timestamp,
                    device: device,
                    noise: noise
                )
                
                glucoseEntries.append(entry)
            }
        }
        
        return glucoseEntries
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
                
                completion(.success(filteredTreatments))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    private func getTreatmentDate(_ treatment: NightscoutTreatment) -> Date {
        if let mills = treatment.mills, mills > 0 {
            return Date(timeIntervalSince1970: Double(mills) / 1000)
        } else if let created_at = treatment.created_at {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
            formatter.timeZone = TimeZone(abbreviation: "UTC")
            return formatter.date(from: created_at) ?? Date.distantPast
        }
        return Date.distantPast
    }
    
    private func fetchTreatmentsNoFilter(settings: NightscoutSettings, completion: @escaping (Result<[NightscoutTreatment], Error>) -> Void) {
        guard !settings.url.isEmpty && !settings.apiToken.isEmpty else {
            completion(.failure(NightscoutError.notConfigured))
            return
        }
        
        var urlComponents = URLComponents(string: "\(settings.url)/api/v1/treatments")
        urlComponents?.queryItems = [
            URLQueryItem(name: "count", value: "10000")
        ]
        
        guard let url = urlComponents?.url else {
            completion(.failure(NightscoutError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(sha1(settings.apiToken), forHTTPHeaderField: "api-secret")
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
                    if let responseString = String(data: data, encoding: .utf8) {
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
        
        // Try devicestatus endpoint first (where IOB is commonly stored)
        guard let url = URL(string: "\(settings.url)/api/v1/devicestatus.json?count=1") else {
            completion(.failure(NightscoutError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(sha1(settings.apiToken), forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
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
                    // Devicestatus returns an array
                    let devicestatusArray = try JSONDecoder().decode([DeviceStatus].self, from: data)
                    
                    if let latestStatus = devicestatusArray.first {
                        // Try to find IOB in various locations within devicestatus
                        var iob: Double = 0
                        var source = "not_found"
                        
                        // Check openaps.suggested.IOB
                        if let openaps = latestStatus.openaps,
                           let suggested = openaps["suggested"] as? [String: Any],
                           let iobValue = suggested["IOB"] as? Double {
                            iob = iobValue
                            source = "openaps.suggested.IOB"
                        }
                        // Check openaps.iob.iob
                        else if let openaps = latestStatus.openaps,
                                let iobData = openaps["iob"] as? [String: Any],
                                let iobValue = iobData["iob"] as? Double {
                            iob = iobValue
                            source = "openaps.iob.iob"
                        }
                        // Check pump.iob.bolusiob
                        else if let pump = latestStatus.pump,
                                let pumpIOB = pump["iob"] as? [String: Any],
                                let bolusIOB = pumpIOB["bolusiob"] as? Double {
                            iob = bolusIOB
                            source = "pump.iob.bolusiob"
                        }
                                                
                        let iobResult = IOBResult(
                            iob: iob,
                            activity: 0,
                            bolusinsulin: iob,
                            basaliob: 0,
                            time: latestStatus.created_at ?? ISO8601DateFormatter().string(from: Date())
                        )
                        completion(.success(iobResult))
                    } else {
                        completion(.failure(NightscoutError.noData))
                    }
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
        
        // Try devicestatus endpoint (where COB is commonly stored)
        guard let url = URL(string: "\(settings.url)/api/v1/devicestatus.json?count=1") else {
            completion(.failure(NightscoutError.invalidURL))
            return
        }
        
        var request = URLRequest(url: url)
        request.setValue(sha1(settings.apiToken), forHTTPHeaderField: "api-secret")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        
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
                    // Devicestatus returns an array
                    let devicestatusArray = try JSONDecoder().decode([DeviceStatus].self, from: data)
                    
                    if let latestStatus = devicestatusArray.first {
                        // Try to find COB in various locations within devicestatus
                        var cob: Double = 0
                        var source = "not_found"
                        
                        // Check openaps.suggested.COB
                        if let openaps = latestStatus.openaps,
                           let suggested = openaps["suggested"] as? [String: Any],
                           let cobValue = suggested["COB"] as? Double {
                            cob = cobValue
                            source = "openaps.suggested.COB"
                        }
                        // Check openaps.cob.cob
                        else if let openaps = latestStatus.openaps,
                                let cobData = openaps["cob"] as? [String: Any],
                                let cobValue = cobData["cob"] as? Double {
                            cob = cobValue
                            source = "openaps.cob.cob"
                        }
                                                
                        let cobResult = COBResult(
                            cob: cob,
                            time: latestStatus.created_at ?? ISO8601DateFormatter().string(from: Date())
                        )
                        completion(.success(cobResult))
                    } else {
                        completion(.failure(NightscoutError.noData))
                    }
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
