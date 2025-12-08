'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OvertimeRequest {
  id: string;
  userId: string;
  start_at: string;
  end_at: string;
  duration_min: number;
  status: string;
  reason?: string;
  submitted_at: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  approvalSteps?: any[];
  row_version: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OvertimeRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN' && parsedUser.role !== 'HR' && parsedUser.role !== 'MANAGER') {
      router.push('/employee/dashboard');
      return;
    }
    setUser(parsedUser);
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const params = filter !== 'all' ? `?status=${filter.toUpperCase()}` : '';
      const response = await fetch(`/api/v1/overtime-requests${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setRequests(data.data || []);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
            <p className="text-gray-600">Halo, {user?.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Total Pengajuan</p>
            <p className="text-3xl font-bold text-gray-900">{requests.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Disetujui</p>
            <p className="text-3xl font-bold text-green-600">
              {requests.filter((r) => r.status === 'APPROVED').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Ditolak</p>
            <p className="text-3xl font-bold text-red-600">
              {requests.filter((r) => r.status === 'REJECTED').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600 text-sm">Menunggu</p>
            <p className="text-3xl font-bold text-yellow-600">
              {requests.filter((r) => r.status === 'SUBMITTED').length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Daftar Pengajuan
                  </h2>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: 'Semua', value: 'all' },
                    { label: 'Menunggu', value: 'submitted' },
                    { label: 'Disetujui', value: 'approved' },
                    { label: 'Ditolak', value: 'rejected' },
                  ].map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilter(f.value)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        filter === f.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="px-6 py-4 text-center text-gray-600">
                    Loading...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="px-6 py-4 text-center text-gray-600">
                    Tidak ada pengajuan
                  </div>
                ) : (
                  requests.map((request) => (
                    <button
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className={`w-full px-6 py-4 hover:bg-gray-50 transition text-left ${
                        selectedRequest?.id === request.id
                          ? 'bg-indigo-50 border-l-4 border-indigo-600'
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {request.user?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(request.start_at).toLocaleDateString(
                              'id-ID'
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {request.duration_min} menit lembur
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            request.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : request.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {request.status === 'APPROVED'
                            ? 'Disetujui'
                            : request.status === 'REJECTED'
                            ? 'Ditolak'
                            : 'Menunggu'}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Detail & Action */}
          {selectedRequest ? (
            <AdminDetailPanel
              request={selectedRequest}
              onUpdate={() => {
                setSelectedRequest(null);
                fetchRequests();
              }}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 flex items-center justify-center">
              <p className="text-gray-500 text-center">
                Pilih pengajuan untuk melihat detail
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function AdminDetailPanel({
  request,
  onUpdate,
}: {
  request: OvertimeRequest;
  onUpdate: () => void;
}) {
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApprove = async () => {
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/v1/overtime-requests/${request.id}/approvals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: 'APPROVED',
            row_version: request.row_version,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Gagal menyetujui pengajuan');
        return;
      }

      setDecision(null);
      onUpdate();
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(
        `/api/v1/overtime-requests/${request.id}/approvals`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            decision: 'REJECTED',
            reason: rejectionReason,
            row_version: request.row_version,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Gagal menolak pengajuan');
        return;
      }

      setDecision(null);
      setRejectionReason('');
      onUpdate();
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const calculateWages = () => {
    // Rumus: Total Jam × 30% × Gaji Pokok per Jam
    const hours = request.duration_min / 60;
    const baseWagePerHour = 50000; // Example base wage per hour
    return Math.round(hours * 0.3 * baseWagePerHour);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Detail Pengajuan</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div>
          <p className="text-sm text-gray-600">Karyawan</p>
          <p className="font-semibold text-gray-900">{request.user?.name}</p>
          <p className="text-xs text-gray-500">{request.user?.email}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Tanggal</p>
          <p className="font-semibold text-gray-900">
            {new Date(request.start_at).toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Jam Mulai</p>
            <p className="font-semibold text-gray-900">
              {new Date(request.start_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Jam Selesai</p>
            <p className="font-semibold text-gray-900">
              {new Date(request.end_at).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-gray-600">Durasi</p>
          <p className="font-semibold text-gray-900">
            {Math.floor(request.duration_min / 60)} jam{' '}
            {request.duration_min % 60} menit
          </p>
        </div>

        {request.reason && (
          <div>
            <p className="text-sm text-gray-600">Alasan</p>
            <p className="font-semibold text-gray-900">{request.reason}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-gray-600">Status</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
              request.status === 'APPROVED'
                ? 'bg-green-100 text-green-700'
                : request.status === 'REJECTED'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {request.status === 'APPROVED'
              ? 'Disetujui'
              : request.status === 'REJECTED'
              ? 'Ditolak'
              : 'Menunggu'}
          </span>
        </div>
      </div>

      {request.status === 'SUBMITTED' && (
        <div className="border-t pt-6">
          {!decision ? (
            <div className="space-y-3">
              <button
                onClick={() => setDecision('approve')}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
              >
                ✓ Setujui Pengajuan
              </button>
              <button
                onClick={() => setDecision('reject')}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                ✕ Tolak Pengajuan
              </button>
            </div>
          ) : decision === 'approve' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 font-semibold">
                Konfirmasi: Setujui pengajuan ini?
              </p>
              <div className="bg-blue-50 p-4 rounded-lg mb-4">
                <p className="text-xs text-gray-600 mb-1">
                  Perhitungan Upah Lembur:
                </p>
                <p className="text-sm font-bold text-blue-900">
                  Rp {calculateWages().toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  ({Math.floor(request.duration_min / 60)} jam × 30% × Rp 50.000/jam)
                </p>
              </div>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Memproses...' : 'Konfirmasi Persetujuan'}
              </button>
              <button
                onClick={() => setDecision(null)}
                className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Batal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alasan Penolakan (Wajib)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              <button
                onClick={handleReject}
                disabled={loading || !rejectionReason.trim()}
                className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition font-semibold"
              >
                {loading ? 'Memproses...' : 'Konfirmasi Penolakan'}
              </button>
              <button
                onClick={() => setDecision(null)}
                className="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
