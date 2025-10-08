import SwiftUI

struct CountryPickerView: View {
    @Binding var selectedCountry: String
    @Environment(\.presentationMode) var presentationMode
    @State private var searchText = ""
    
    private let countries = [
        "United States", "Canada", "United Kingdom", "Australia", "Germany", "France", "Italy", "Spain",
        "Netherlands", "Sweden", "Norway", "Denmark", "Finland", "Switzerland", "Austria", "Belgium",
        "Ireland", "New Zealand", "Japan", "South Korea", "Singapore", "India", "Brazil", "Mexico",
        "Argentina", "Chile", "Colombia", "Peru", "South Africa", "Egypt", "Nigeria", "Kenya",
        "Israel", "Turkey", "Russia", "China", "Thailand", "Malaysia", "Philippines", "Indonesia",
        "Vietnam", "Taiwan", "Hong Kong", "Other"
    ]
    
    private var filteredCountries: [String] {
        if searchText.isEmpty {
            return countries
        } else {
            return countries.filter { $0.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        VStack {
            SearchBar(text: $searchText)
            
            List(filteredCountries, id: \.self) { country in
                Button(action: {
                    selectedCountry = country
                    presentationMode.wrappedValue.dismiss()
                }) {
                    HStack {
                        Text(country)
                            .foregroundColor(.primary)
                        Spacer()
                        if selectedCountry == country {
                            Image(systemName: "checkmark")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
        .navigationTitle("Select Country")
        .navigationBarItems(
            trailing: Button("Done") {
                presentationMode.wrappedValue.dismiss()
            }
        )
    }
}

struct SearchBar: View {
    @Binding var text: String
    
    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)
            
            TextField("Search countries", text: $text)
                .textFieldStyle(PlainTextFieldStyle())
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}

#Preview {
    CountryPickerView(selectedCountry: .constant(""))
}
