'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatDate, OVERTIME_RULES } from '@/lib/validation';

interface OvertimeRequest {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_minutes: number;
  reason: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submitted_at?: string;
  total_payment?: number;
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentRequests();
  }, []);

  const fetchRecentRequests = async () => {
    try {
      setLoading(true);
      const currentMonth = new Date().toISOString().slice(0, 7);
      const response = await apiClient.get<OvertimeRequest[]>(
        `/api/v1/overtime/mine?month=${currentMonth}`
      );

      if (response.success && response.data) {
        setRequests(response.data);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load requests';
      setError(message);
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === 'SUBMITTED');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const rejectedRequests = requests.filter((r) => r.status === 'REJECTED');

  const totalPendingHours = pendingRequests.reduce(
    (sum, r) => sum + r.total_minutes,
    0
  ) / 60;

  const totalApprovedPayment = approvedRequests.reduce(
    (sum, r) => sum + (r.total_payment || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user?.name}
          </h1>
          <p className="text-gray-600 mt-1">Employee #{user?.employee_no}</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* Pending */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {pendingRequests.length}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  {totalPendingHours.toFixed(1)} hours
                </p>
              </div>
              <span className="text-4xl">⏱️</span>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {approvedRequests.length}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  ₹{(totalApprovedPayment / 100).toFixed(2)}
                </p>
              </div>
              <span className="text-4xl">✅</span>
            </div>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {rejectedRequests.length}
                </p>
              </div>
              <span className="text-4xl">❌</span>
            </div>
          </div>

          {/* Max Daily Limit */}
          <div className="bg-white rounded-lg shadow p-6">
            <div>
              <p className="text-gray-600 text-sm font-medium">
                Daily Limit
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {OVERTIME_RULES.MAX_HOURS_PER_DAY}h
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Weekly: {OVERTIME_RULES.MAX_HOURS_PER_WEEK}h max
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <Link
                href="/overtime/create"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                aria-label="Submit new overtime request"
              >
                ➕ Ajukan Lembur
              </Link>

              <Link
                href="/overtime/history"
                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-4 py-3 rounded-lg hover:bg-gray-200 transition font-medium mt-3"
                aria-label="View all overtime requests"
              >
                → View All Requests
              </Link>
            </div>

            {/* Business Rules */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Business Rules
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ Max {OVERTIME_RULES.MAX_HOURS_PER_DAY} hours per day</li>
                <li>✓ Max {OVERTIME_RULES.MAX_HOURS_PER_WEEK} hours per week</li>
                <li>✓ Min {OVERTIME_RULES.MIN_HOURS_PER_REQUEST * 60} minutes per request</li>
                <li>✓ No overlapping requests</li>
                <li>✓ Attendance must be verified</li>
              </ul>
            </div>
          </div>

          {/* Recent Approvals */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Requests
              </h2>

              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No requests yet</p>
                  <Link
                    href="/overtime/create"
                    className="text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    Create your first request →
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-semibold text-gray-900">
                          Date
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-900">
                          Time
                        </th>
                        <th className="text-left py-3 px-3 font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="text-right py-3 px-3 font-semibold text-gray-900">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.slice(0, 5).map((req) => (
                        <tr
                          key={req.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition"
                        >
                          <td className="py-3 px-3">
                            {formatDate(new Date(req.date))}
                          </td>
                          <td className="py-3 px-3">
                            {req.start_time} - {req.end_time}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                req.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : req.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : req.status === 'SUBMITTED'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            {req.total_payment
                              ? `₹${(req.total_payment / 100).toFixed(2)}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
