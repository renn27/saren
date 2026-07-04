"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, User, CheckCircle2 } from "lucide-react";
import { loginUser } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Username dan password tidak boleh kosong!");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    formData.append("rememberMe", rememberMe ? "true" : "false");

    try {
      const result = await loginUser(null, formData);
      if (result.success) {
        toast.success("Login berhasil! Selamat datang kembali.");
        router.push("/");
        router.refresh();
      } else {
        setErrorMsg(result.error || "Gagal masuk");
        toast.error(result.error || "Gagal masuk");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Terjadi kesalahan sistem. Silakan coba lagi.");
      toast.error("Terjadi kesalahan sistem.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-page px-4 relative overflow-hidden">
      {/* Decorative Blur Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-accent/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-danger/5 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-bg-surface border border-border-soft rounded-3xl shadow-xl p-8 relative z-10 backdrop-blur-xl transition-all duration-300">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-accent-soft border border-accent/20 flex items-center justify-center shadow-inner mb-4 overflow-hidden">
            <img
              src="/saren_logo_dark.png"
              alt="SAREN Logo"
              className="h-10 w-10 object-cover"
            />
          </div>
          <h2 className="text-[20px] font-semibold text-text-primary font-display tracking-tight">
            SAREN AUTH
          </h2>
          <p className="text-[12.5px] text-text-secondary mt-1">
            Super App Rendi - Silakan masuk untuk melanjutkan
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-danger-soft text-danger text-xs font-medium rounded-xl border border-danger/10 text-center">
            {errorMsg}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
          {/* Username Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-text-secondary uppercase tracking-wider pl-1">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 pl-10 pr-4 bg-bg-page border border-border-soft rounded-2xl text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11.5px] font-semibold text-text-secondary uppercase tracking-wider pl-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full h-11 pl-10 pr-10 bg-bg-page border border-border-soft rounded-2xl text-[13px] text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/40 transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
                title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between mt-1 px-1">
            <label className="flex items-center gap-2 text-[12.5px] text-text-primary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                disabled={isLoading}
                className="rounded border-border-soft text-accent focus:ring-accent h-4 w-4"
              />
              <span>Ingat Saya</span>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 font-semibold text-xs tracking-wide uppercase mt-4"
          >
            {isLoading ? "Memverifikasi..." : "Masuk ke SAREN"}
          </Button>
        </form>
      </div>
    </div>
  );
}
