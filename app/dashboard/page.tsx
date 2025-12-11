'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      router.push('/');
      return;
    }
    setUser(JSON.parse(userStr));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-indigo-600">Overtime System</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-4xl font-bold text-gray-900">Welcome, {user.email}</h2>
              <p className="text-gray-600 mt-2">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                  {user.role}
                </span>
              </p>
            </div>
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {(user.role === 'ADMIN' || user.role === 'HR') ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h3>
              <div className="space-y-4">
                <p className="text-gray-700">Manage overtime requests and approvals here.</p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">0</p>
                    <p className="text-gray-600 text-sm">Pending Approvals</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-gray-600 text-sm">Approved</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition">
                  View Requests
                </button>
                <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm font-medium transition">
                  View Approvals
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Employee Dashboard</h3>
              <div className="space-y-4">
                <p className="text-gray-700">Create and manage your overtime requests here.</p>
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-600">0</p>
                    <p className="text-gray-600 text-sm">Pending</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-gray-600 text-sm">Approved</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                    <p className="text-2xl font-bold text-red-600">0</p>
                    <p className="text-gray-600 text-sm">Rejected</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition">
                  Create Request
                </button>
                <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 text-sm font-medium transition">
                  View My Requests
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
