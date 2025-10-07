import SwiftUI

struct StatePickerView: View {
    @Binding var selectedState: String
    @Environment(\.presentationMode) var presentationMode
    @State private var searchText = ""
    
    private let states = [
        "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware",
        "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky",
        "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
        "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
        "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
        "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
        "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming", "District of Columbia"
    ]
    
    private var filteredStates: [String] {
        if searchText.isEmpty {
            return states
        } else {
            return states.filter { $0.localizedCaseInsensitiveContains(searchText) }
        }
    }
    
    var body: some View {
        NavigationView {
            VStack {
                SearchBar(text: $searchText)
                
                List(filteredStates, id: \.self) { state in
                    Button(action: {
                        selectedState = state
                        presentationMode.wrappedValue.dismiss()
                    }) {
                        HStack {
                            Text(state)
                                .foregroundColor(.primary)
                            Spacer()
                            if selectedState == state {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.blue)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Select State")
            .navigationBarItems(
                leading: Button("Cancel") {
                    presentationMode.wrappedValue.dismiss()
                }
            )
        }
    }
}

#Preview {
    StatePickerView(selectedState: .constant(""))
}
