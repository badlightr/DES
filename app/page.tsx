'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store tokens
      localStorage.setItem('accessToken', data.data.access_token);
      localStorage.setItem('refreshToken', data.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testLogins = [
    { email: 'admin@example.com', password: 'password123', role: 'ADMIN' },
    { email: 'manager@example.com', password: 'password123', role: 'MANAGER' },
    { email: 'employee@example.com', password: 'password123', role: 'EMPLOYEE' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Overtime Management
          </h1>
          <p className="text-indigo-100">Sistem Manajemen Lembur Terpadu</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-lg shadow-xl p-8 mb-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Login</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="bg-white rounded-lg shadow-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Test Accounts
          </h3>
          <div className="space-y-2">
            {testLogins.map((account) => (
              <button
                key={account.email}
                onClick={() => {
                  setEmail(account.email);
                  setPassword(account.password);
                }}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{account.email}</p>
                    <p className="text-xs text-gray-600">{account.role}</p>
                  </div>
                  <span className="text-indigo-600">→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
