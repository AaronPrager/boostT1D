export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>This is a test page to check navigation rendering.</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold">Current Page Info:</h2>
        <p>Path: /test</p>
        <p>Layout: Root layout only</p>
      </div>
    </div>
  );
}
