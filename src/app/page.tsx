/**
 * src/app/page.tsx
 * Home page - Displays API documentation and system status
 */

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Overtime Management System
          </h1>
          <p className="text-xl text-gray-700">
            Production-grade backend API for managing employee overtime requests with concurrent safety
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">System Status</h2>
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              Online
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-sm text-gray-600 mb-1">API Version</p>
              <p className="text-2xl font-bold text-gray-900">v1</p>
            </div>
            <div className="border-l-4 border-indigo-500 pl-4">
              <p className="text-sm text-gray-600 mb-1">Database</p>
              <p className="text-2xl font-bold text-gray-900">PostgreSQL</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-sm text-gray-600 mb-1">Environment</p>
              <p className="text-2xl font-bold text-gray-900">Development</p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Features</h2>
          <ul className="space-y-3">
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              JWT Authentication with refresh token rotation
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Role-Based Access Control (5-tier hierarchy)
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Concurrency Control with overlap prevention
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Multi-level approval workflow
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Audit trail with SHA256 hash chain
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Optimistic locking for concurrent safety
            </li>
            <li className="flex items-center text-gray-700">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
              Idempotency key support for safe retries
            </li>
          </ul>
        </div>

        {/* API Endpoints */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">API Endpoints</h2>
          
          <div className="space-y-6">
            {/* Authentication */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Authentication</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
                <p className="text-green-700"><span className="font-bold">POST</span> /api/v1/auth/login</p>
                <p className="text-blue-700"><span className="font-bold">PATCH</span> /api/v1/auth/refresh</p>
                <p className="text-red-700"><span className="font-bold">DELETE</span> /api/v1/auth/logout</p>
              </div>
            </div>

            {/* Overtime Requests */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Overtime Requests</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
                <p className="text-blue-700"><span className="font-bold">GET</span> /api/v1/overtime-requests</p>
                <p className="text-green-700"><span className="font-bold">POST</span> /api/v1/overtime-requests</p>
                <p className="text-blue-700"><span className="font-bold">GET</span> /api/v1/overtime-requests/[id]</p>
                <p className="text-yellow-700"><span className="font-bold">PUT</span> /api/v1/overtime-requests/[id]</p>
              </div>
            </div>

            {/* Approvals */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Approval Workflow</h3>
              <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
                <p className="text-blue-700"><span className="font-bold">GET</span> /api/v1/overtime-requests/[id]/approvals</p>
                <p className="text-green-700"><span className="font-bold">POST</span> /api/v1/overtime-requests/[id]/approvals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Documentation</h2>
          <div className="space-y-3 mb-6 text-gray-700">
            <p>📖 <strong>README.md</strong> - Complete project overview and setup instructions</p>
            <p>🔧 <strong>TESTING.md</strong> - Integration test setup and database configuration</p>
            <p>📋 <strong>API_REFERENCE.md</strong> - Detailed endpoint documentation with examples</p>
            <p>🏗️ <strong>ARCHITECTURE.md</strong> - System design and technical details</p>
            <p>✅ <strong>IMPLEMENTATION_SUMMARY.md</strong> - Feature checklist and deployment guide</p>
          </div>
          <p className="text-sm text-gray-600">
            All documentation is available in the project root directory. For API details, refer to API_REFERENCE.md.
          </p>
        </div>

        {/* Quick Start */}
        <div className="mt-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
          <div className="space-y-2 font-mono text-sm">
            <p className="opacity-90"># Test login endpoint</p>
            <p className="bg-black bg-opacity-20 p-2 rounded">curl -X POST http://localhost:3000/api/v1/auth/login \</p>
            <p className="bg-black bg-opacity-20 p-2 rounded ml-4">-H "Content-Type: application/json" \</p>
            <p className="bg-black bg-opacity-20 p-2 rounded ml-4">-d '{"{"}email":"admin@example.com","password":"password123"{"}"}'</p>
          </div>
          <p className="text-sm opacity-75 mt-4">
            💡 Use Postman or cURL to test the API endpoints above. Authentication is required for most endpoints.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>Overtime Management System v1.0 • Built with Next.js, Prisma & PostgreSQL</p>
          <p className="mt-2">
            <a href="https://github.com/badlightr/DES" className="text-blue-600 hover:underline">GitHub Repository</a>
          </p>
        </footer>
      </div>
    </main>
  );
}
