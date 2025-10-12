import Foundation

struct Config {
    // API Keys
    static let geminiAPIKey: String = {
        // Try to get from environment variable first (for development)
        if let envKey = ProcessInfo.processInfo.environment["GEMINI_API_KEY"] {
            return envKey
        }
        
        // Fallback to hardcoded key (replace with your actual key)
        // TODO: Move this to a secure configuration file or keychain
        return "REDACTED_API_KEY"
    }()
    
    // API URLs
    static let geminiBaseURL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    
    // SApp Configuration
    static let appName = "BoostT1D"
    static let appVersion = "1.0.0"
}
