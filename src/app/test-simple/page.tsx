export default function TestSimplePage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Simple Test Page</h1>
        <p className="text-gray-600">If you can see this, the basic Next.js setup is working.</p>
        <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded">
          <p className="text-green-800">✅ Basic rendering works!</p>
        </div>
      </div>
    </div>
  );
}

