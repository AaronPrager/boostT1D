import Foundation
import UIKit

class UserProfileService: ObservableObject {
    static let shared = UserProfileService()
    
    @Published var currentProfile: UserProfile?
    
    private let userDefaults = UserDefaults.standard
    private let profileKey = "userProfile"
    private let isFirstTimeUserKey = "isFirstTimeUser"
    
    private init() {
        loadProfile()
    }
    
    var isFirstTimeUser: Bool {
        get {
            userDefaults.bool(forKey: isFirstTimeUserKey)
        }
        set {
            userDefaults.set(newValue, forKey: isFirstTimeUserKey)
        }
    }
    
    func loadProfile() {
        guard let data = userDefaults.data(forKey: profileKey),
              let profile = try? JSONDecoder().decode(UserProfile.self, from: data) else {
            currentProfile = nil
            return
        }
        currentProfile = profile
    }
    
    func saveProfile(_ profile: UserProfile) {
        currentProfile = profile
        if let data = try? JSONEncoder().encode(profile) {
            userDefaults.set(data, forKey: profileKey)
        }
    }
    
    func updateProfile(name: String, photo: UIImage?, country: String, dateOfBirth: Date, dateOfDiagnosis: Date, state: String?) {
        var profile = currentProfile ?? UserProfile()
        profile.name = name
        profile.photo = photo
        profile.country = country
        profile.state = state
        profile.dateOfBirth = dateOfBirth
        profile.dateOfDiagnosis = dateOfDiagnosis
        profile.updatedAt = Date()
        saveProfile(profile)
    }
    
    func completeProfile() {
        guard var profile = currentProfile else { return }
        profile.isProfileComplete = true
        profile.updatedAt = Date()
        saveProfile(profile)
        isFirstTimeUser = false
    }
    
    var isProfileComplete: Bool {
        guard let profile = currentProfile else { return false }
        return profile.isProfileComplete && !profile.name.isEmpty && !profile.country.isEmpty
    }
    
    func resetProfile() {
        currentProfile = nil
        userDefaults.removeObject(forKey: profileKey)
        isFirstTimeUser = true
    }
}
