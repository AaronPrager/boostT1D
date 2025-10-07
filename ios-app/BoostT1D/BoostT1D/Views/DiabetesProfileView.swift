import SwiftUI

struct DiabetesProfileView: View {
    @StateObject private var diabetesProfileService = DiabetesProfileService.shared
    @State private var profile: DiabetesProfile?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header
                VStack(spacing: 16) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.green)
                    
                    Text("Diabetes Profile")
                        .font(.title)
                        .fontWeight(.semibold)
                }
                .padding(.top, 20)
                
                // Content
                if isLoading {
                    ProgressView("Loading diabetes profile...")
                        .padding()
                } else if let errorMessage = errorMessage {
                    VStack(spacing: 12) {
                        Image(systemName: "exclamationmark.triangle")
                            .font(.system(size: 40))
                            .foregroundColor(.orange)
                        
                        Text("Error Loading Profile")
                            .font(.headline)
                        
                        Text(errorMessage)
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button("Retry") {
                            loadProfile()
                        }
                        .foregroundColor(.blue)
                    }
                    .padding()
                } else if let profile = profile {
                    VStack(spacing: 16) {
                        // Profile Info
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Profile Information")
                                .font(.headline)
                            
                            if let defaultProfile = profile.defaultProfile {
                                ProfileInfoRow(title: "Default Profile", value: defaultProfile)
                            }
                            
                            if let units = profile.units {
                                ProfileInfoRow(title: "Units", value: units)
                            }
                            
                            if let startDate = profile.startDate {
                                ProfileInfoRow(title: "Start Date", value: startDate)
                            }
                        }
                        .padding(16)
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        
                        // Store Data
                        if let store = profile.store {
                            VStack(alignment: .leading, spacing: 12) {
                                Text("Profile Data")
                                    .font(.headline)
                                
                                ForEach(Array(store.keys.sorted()), id: \.self) { key in
                                    if let profileData = store[key] {
                                        ProfileDataCard(name: key, data: profileData)
                                    }
                                }
                            }
                            .padding(16)
                            .background(Color(.systemGray6))
                            .cornerRadius(12)
                        }
                    }
                    .padding(.horizontal, 20)
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "person.circle")
                            .font(.system(size: 40))
                            .foregroundColor(.gray)
                        
                        Text("No Profile Data")
                            .font(.headline)
                        
                        Text("No diabetes profile data found. Make sure your Nightscout is configured correctly.")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                }
                
                Spacer(minLength: 40)
            }
        }
        .navigationTitle("Diabetes Profile")
        .navigationBarItems(trailing: Button(action: {
            loadProfile()
        }) {
            Image(systemName: "arrow.clockwise")
                .foregroundColor(.blue)
        })
        .onAppear {
            loadProfile()
        }
    }
    
    private func loadProfile() {
        isLoading = true
        errorMessage = nil
        
        diabetesProfileService.fetchProfile { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let fetchedProfile):
                    self.profile = fetchedProfile
                case .failure(let error):
                    self.errorMessage = error.localizedDescription
                }
            }
        }
    }
}

struct ProfileInfoRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.subheadline)
                .foregroundColor(.primary)
        }
    }
}

struct ProfileDataCard: View {
    let name: String
    let data: ProfileData
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(name)
                .font(.subheadline)
                .fontWeight(.semibold)
            
            if let timezone = data.timezone {
                ProfileInfoRow(title: "Timezone", value: timezone)
            }
            
            if let units = data.units {
                ProfileInfoRow(title: "Units", value: units)
            }
            
            if let dia = data.dia {
                ProfileInfoRow(title: "DIA", value: String(format: "%.1f hours", dia))
            }
            
            if let notes = data.notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.primary)
                }
            }
        }
        .padding(12)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

#Preview {
    DiabetesProfileView()
}
