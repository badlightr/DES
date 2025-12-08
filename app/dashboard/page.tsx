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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Selamat datang, {user.email}</p>
              <p className="text-sm text-gray-500">Role: {user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {(user.role === 'ADMIN' || user.role === 'HR') ? (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h2>
            <p className="text-gray-600">Manage overtime requests and approvals here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Employee Dashboard</h2>
            <p className="text-gray-600">Create and manage your overtime requests here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
