import Foundation
import UIKit

struct UserProfile: Codable {
    let id: UUID
    var name: String
    var photoData: Data?
    var country: String
    var state: String?
    var dateOfBirth: Date
    var dateOfDiagnosis: Date
    var isProfileComplete: Bool
    var createdAt: Date
    var updatedAt: Date
    
    init(name: String = "", photoData: Data? = nil, country: String = "", state: String? = nil, dateOfBirth: Date = Date(), dateOfDiagnosis: Date = Date(), isProfileComplete: Bool = false) {
        self.id = UUID()
        self.name = name
        self.photoData = photoData
        self.country = country
        self.state = state
        self.dateOfBirth = dateOfBirth
        self.dateOfDiagnosis = dateOfDiagnosis
        self.isProfileComplete = isProfileComplete
        self.createdAt = Date()
        self.updatedAt = Date()
    }
    
    var photo: UIImage? {
        get {
            guard let photoData = photoData else { return nil }
            return UIImage(data: photoData)
        }
        set {
            photoData = newValue?.jpegData(compressionQuality: 0.8)
        }
    }
    
    var currentAge: Int {
        let calendar = Calendar.current
        let ageComponents = calendar.dateComponents([.year], from: dateOfBirth, to: Date())
        return ageComponents.year ?? 0
    }
    
    var yearsSinceDiagnosis: Int {
        let calendar = Calendar.current
        let yearsComponents = calendar.dateComponents([.year], from: dateOfDiagnosis, to: Date())
        return yearsComponents.year ?? 0
    }
}
