export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-sm rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Use</h1>

        <div className="space-y-6 text-gray-600">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using BoostT1D, you accept and agree to be bound by these Terms of Use. 
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Service Description</h2>
            <p>
              BoostT1D is a platform designed to help individuals with Type 1 Diabetes track and analyze 
              their blood glucose data, insulin doses, and carbohydrate intake. We provide tools for data 
              visualization and pattern recognition.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account</li>
              <li>Not share your account credentials</li>
              <li>Use the service in compliance with all applicable laws</li>
              <li>Not attempt to interfere with the service's functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Medical Disclaimer</h2>
            <p>
              BoostT1D is not a substitute for professional medical advice, diagnosis, or treatment. 
              Always seek the advice of your physician or other qualified health provider with any 
              questions you may have regarding your medical condition.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Intellectual Property</h2>
            <p>
              All content, features, and functionality of BoostT1D, including but not limited to text, 
              graphics, logos, and software, are the exclusive property of BoostT1D and are protected 
              by intellectual property laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
            <p>
              BoostT1D and its affiliates shall not be liable for any indirect, incidental, special, 
              consequential, or punitive damages arising from your use of the service or any content 
              provided therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of any 
              material changes via email or through the service. Your continued use of BoostT1D after 
              such modifications constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact</h2>
            <p>
              For questions about these Terms of Use, please contact us at{' '}
              <a 
                href="mailto:support@boostt1d.com" 
                className="text-indigo-600 hover:text-indigo-800"
              >
                support@boostt1d.com
              </a>
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