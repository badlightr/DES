"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Client-side validation
    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return;
    }

    try {
      console.log("[Login] Attempting login for:", email);
      
      // Try the login endpoint first, fall back to auth endpoint
      let response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      // If 404 on /login route, try parent /auth route
      if (response.status === 404) {
        console.warn("[Login] /api/v1/auth/login returned 404, trying /api/v1/auth");
        response = await fetch("/api/v1/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
      }

      console.log("[Login] Response status:", response.status);
      console.log("[Login] Content-Type:", response.headers.get("content-type"));
      
      const text = await response.text();
      console.log("[Login] Raw response (first 200 chars):", text.substring(0, 200));
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error("[Login] JSON parse failed. Response is likely HTML (404 or 500)");
        setError(`Server error (${response.status}). Check browser console for details.`);
        setLoading(false);
        return;
      }
      console.log("[Login] Response data:", data);

      if (!response.ok) {
        const errorMsg = data.message || data.error?.message || "Login failed";
        console.error("[Login] Error:", errorMsg);
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Store tokens
      const payload = data.data ?? data;
      if (!payload.access_token || !payload.user) {
        console.error("[Login] Invalid response payload:", payload);
        setError("Invalid server response. Please contact support.");
        setLoading(false);
        return;
      }

      console.log("[Login] Storing tokens and user data");
      localStorage.setItem("accessToken", payload.access_token);
      localStorage.setItem("refreshToken", payload.refresh_token || "");
      localStorage.setItem("user", JSON.stringify(payload.user));

      console.log("[Login] Success. Redirecting to dashboard...");
      router.push("/dashboard");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[Login] Exception:", errMsg);
      setError(`Network error: ${errMsg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const testLogins = [
    { 
      email: "admin@example.com", 
      password: "password123", 
      role: "Admin", 
      description: "Full system access"
    },
    { 
      email: "manager@example.com", 
      password: "password123", 
      role: "Manager", 
      description: "Team management access"
    },
    {
      email: "employee@example.com",
      password: "password123",
      role: "Employee",
      description: "Basic user access"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl mb-4 shadow-lg">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Overtime Management System
          </h1>
          <p className="text-slate-600 text-lg">
            Efficient overtime tracking for modern workplaces
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 auth-shell">
          {/* Login Form Section */}
          <div className="p-8 sm:p-10 lg:p-12 login-left">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Welcome Back</h2>
              <p className="text-slate-600">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                <p className="text-sm font-medium">⚠ Error</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6 login-form">
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
                      placeholder="name@company.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-slate-50/50"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5" />
                      ) : (
                        <EyeIcon className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-600">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Sign In
                    <ArrowRightIcon className="h-4 w-4" />
                  </div>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-200">
              <p className="text-center text-sm text-slate-600">
                Don't have an account?{" "}
                <button className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Contact administrator
                </button>
              </p>
            </div>
          </div>

          {/* Test Accounts Section */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-8 sm:p-10 lg:p-12 login-right">
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Quick Access</h3>
                <p className="text-slate-600 text-sm">
                  Use these test accounts for demonstration purposes
                </p>
              </div>
              
              <div className="flex-1 space-y-4">
                {testLogins.map((account, index) => (
                  <div
                    key={account.email}
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                      index === 0 
                        ? 'border-blue-200 bg-blue-50 hover:border-blue-300' 
                        : index === 1 
                          ? 'border-purple-200 bg-purple-50 hover:border-purple-300'
                          : 'border-green-200 bg-green-50 hover:border-green-300'
                    } hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-block w-3 h-3 rounded-full ${
                            index === 0 ? 'bg-blue-500' : 
                            index === 1 ? 'bg-purple-500' : 'bg-green-500'
                          }`}></span>
                          <p className="font-semibold text-slate-800 text-sm">
                            {account.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            index === 0 
                              ? 'bg-blue-100 text-blue-800' 
                              : index === 1 
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-green-100 text-green-800'
                          }`}>
                            {account.role}
                          </span>
                          <span className="text-xs text-slate-600">
                            {account.description}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <ArrowRightIcon className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200">
                <div className="flex items-center gap-3 text-slate-600">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-xs leading-relaxed">
                    These are demo credentials. Actual login requires valid company authentication.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            © 2025 Overtime Management System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}