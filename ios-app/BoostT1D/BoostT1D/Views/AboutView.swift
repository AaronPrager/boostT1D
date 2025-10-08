import SwiftUI

struct AboutView: View {
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 30) {
                    // Header
                    VStack(spacing: 20) {
                        AppIconView(size: 100)
                        
                        Text("BoostT1D")
                            .font(.system(size: 32, weight: .heavy, design: .rounded))
                            .foregroundColor(.blue)
                        
                        Text("Your Personal Diabetes Management Assistant")
                            .font(.title3)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)
                    
                    // App Information
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("About the App")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("BoostT1D is a comprehensive diabetes management app designed to help you take control of your Type 1 diabetes. Our app provides personalized insights, AI-powered recommendations, and easy-to-use tools to track your glucose levels, manage treatments, and optimize your diabetes care.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .lineSpacing(4)
                        }
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Key Features")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                FeatureRow(icon: "heart.fill", text: "Real-time glucose monitoring and trends")
                                FeatureRow(icon: "chart.line.uptrend.xyaxis", text: "Interactive charts and data visualization")
                                FeatureRow(icon: "syringe.fill", text: "Treatment tracking and management")
                                FeatureRow(icon: "brain.head.profile", text: "AI-powered therapy recommendations")
                                FeatureRow(icon: "camera.fill", text: "Food analysis and carb estimation")
                                FeatureRow(icon: "person.2.fill", text: "Community support and buddy system")
                            }
                        }
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("About Aaron")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("BoostT1D was created by Aaron, a passionate developer who understands the daily challenges of living with Type 1 diabetes. Having experienced the complexities of diabetes management firsthand, Aaron built this app to provide others with the tools and insights needed to live a healthier, more confident life with diabetes.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .lineSpacing(4)
                            
                            Text("Aaron's vision is to make diabetes management more accessible, intuitive, and empowering for everyone in the diabetes community.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .lineSpacing(4)
                                .italic()
                        }
                        
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Our Mission")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            
                            Text("To empower people with diabetes to take control of their health through innovative technology, personalized insights, and a supportive community. We believe that with the right tools and support, managing diabetes can become a seamless part of your daily life.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .lineSpacing(4)
                        }
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationTitle("About")
            .navigationBarItems(trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            })
        }
    }
}

struct FeatureRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundColor(.blue)
                .frame(width: 20)
            
            Text(text)
                .font(.body)
                .foregroundColor(.secondary)
                .lineSpacing(2)
        }
    }
}

#Preview {
    AboutView()
}
