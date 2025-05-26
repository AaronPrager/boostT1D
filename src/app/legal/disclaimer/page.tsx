export default function MedicalDisclaimer() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Medical Disclaimer</h1>

        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Not Medical Advice</h2>
            <p>
              BoostT1D is a data management and visualization tool. The information provided through 
              our service is for informational purposes only and is not intended to substitute 
              professional medical advice, diagnosis, or treatment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Consult Healthcare Providers</h2>
            <p>
              Always seek the advice of your physician or other qualified healthcare provider with any 
              questions you may have regarding:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Medical conditions</li>
              <li>Treatment decisions</li>
              <li>Insulin dosing</li>
              <li>Changes to your diabetes management plan</li>
              <li>Interpretation of blood glucose patterns</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Emergency Situations</h2>
            <p>
              Never delay seeking medical advice, disregard medical advice, or discontinue medical 
              treatment because of information provided by BoostT1D. If you think you may have a medical 
              emergency, call your doctor or emergency services immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Accuracy</h2>
            <p>
              While we strive to display accurate information, the data shown in BoostT1D depends on:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Accuracy of your input data</li>
              <li>Proper functioning of your monitoring devices</li>
              <li>Correct configuration of your Nightscout instance</li>
              <li>Proper synchronization between systems</li>
            </ul>
            <p className="mt-4">
              Always verify critical information and do not make medical decisions based solely on 
              the data displayed in BoostT1D.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Individual Differences</h2>
            <p>
              Every person with Type 1 Diabetes is different. What works for one person may not work 
              for another. Any patterns, trends, or insights shown by BoostT1D should be discussed 
              with your healthcare provider to determine their relevance to your specific situation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Healthcare Provider Relationship</h2>
            <p>
              BoostT1D does not create a physician-patient relationship. Your use of BoostT1D does not 
              constitute the practice of medicine or the provision of medical care by BoostT1D or its 
              creators.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Limitation of Liability</h2>
            <p>
              By using BoostT1D, you explicitly acknowledge and agree that BoostT1D is not liable for 
              any damage or injury that may result from your use of, or inability to use, the service 
              or the information contained within it.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Last Updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 