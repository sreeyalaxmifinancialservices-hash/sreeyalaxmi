"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        const role = data.user?.role;
        switch (role) {
          case "admin":
            router.push("/admin/dashboard");
            break;
          case "staff":
            router.push("/staff/dashboard");
            break;
          case "leader":
            router.push("/leader/dashboard");
            break;
          default:
            router.push("/admin/dashboard");
        }
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center bg-white px-4">
      <style>{`
        @keyframes fade-slide-up {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes line-grow {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        @keyframes grid-drift {
          0% { background-position: 0px 0px; }
          100% { background-position: 56px 56px; }
        }
        @keyframes scan-sweep {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes cell-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        .fade-in-up { animation: fade-slide-up 0.55s cubic-bezier(0.16,1,0.3,1) both; }
        .fade-in-up-d1 { animation: fade-slide-up 0.55s cubic-bezier(0.16,1,0.3,1) 0.08s both; }
        .fade-in-up-d2 { animation: fade-slide-up 0.55s cubic-bezier(0.16,1,0.3,1) 0.16s both; }
        .fade-in-up-d3 { animation: fade-slide-up 0.55s cubic-bezier(0.16,1,0.3,1) 0.24s both; }
        .shake-once { animation: shake 0.4s ease-in-out; }
        .underline-grow { animation: line-grow 0.7s cubic-bezier(0.65,0,0.35,1) 0.5s both; }
        .grid-drift { animation: grid-drift 6s linear infinite; }
        .scan-line { animation: scan-sweep 7s ease-in-out infinite; }
        .cell-pulse { animation: cell-pulse 4s ease-in-out infinite; }
      `}</style>

      {/* Animated moving grid */}
      <div
        className="grid-drift absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.055) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.055) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Soft vertical scan line sweeping down through the grid */}
      <div
        className="scan-line absolute left-0 right-0 h-40 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(0,0,0,0.05), transparent)",
        }}
      />

      {/* A handful of grid cells that quietly pulse, like a live dashboard */}
      {[
        { top: "18%", left: "12%", delay: "0s" },
        { top: "70%", left: "20%", delay: "1.3s" },
        { top: "30%", left: "82%", delay: "2.1s" },
        { top: "78%", left: "78%", delay: "0.7s" },
        { top: "50%", left: "6%", delay: "2.8s" },
      ].map((cell, i) => (
        <div
          key={i}
          className="cell-pulse absolute w-14 h-14 border border-black/10 bg-black/[0.02] pointer-events-none hidden sm:block"
          style={{ top: cell.top, left: cell.left, animationDelay: cell.delay }}
        />
      ))}

      {/* Vignette so the grid fades softly at the very edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 40%, rgba(255,255,255,0.9) 90%)",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="fade-in-up text-center mb-8">
          <img src="/logo.png" alt="Sreeyalakshmi Logo" className="w-20 h-20 rounded-full object-cover mb-4 mx-auto" />
          <h1 className="text-2xl font-bold text-black tracking-tight">SREEYALAXMI FINANCIAL SERVICES PVT. LTD.</h1>
          <div className="w-10 h-[2px] bg-black mx-auto mt-2 underline-grow" />
          <p className="text-sm text-gray-500 mt-3">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="fade-in-up-d1 bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]"
        >
          {error && (
            <div className="shake-once mb-5 flex items-center gap-2.5 rounded-lg bg-black/[0.03] border border-black/10 px-4 py-3 text-sm text-black">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="fade-in-up-d2 mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg bg-white border border-gray-300 pl-10 pr-4 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="fade-in-up-d2 mb-6">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full rounded-lg bg-white border border-gray-300 pl-10 pr-11 py-3 text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="fade-in-up-d3 w-full flex items-center justify-center gap-2 rounded-lg bg-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98]"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="fade-in-up-d3 text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} SREEYALAXMI FINANCIAL SERVICES PVT. LTD. All rights reserved.
        </p>
      </div>
    </div>
  );
}