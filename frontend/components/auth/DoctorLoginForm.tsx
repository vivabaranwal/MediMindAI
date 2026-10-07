"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { useAuthStore } from "@/store/authStore";

interface DoctorLoginFormProps {
  gatewayLabel: string;
  portalLabel: string;
  heading: string;
  redirectTo: string;
  footnote: string;
  allowedRoles?: string[];
  /** Only doctors of this level may sign in here. */
  requiredLevel?: "junior" | "senior";
}

const DOCTOR_ROLES = ["doctor", "super_admin"];

export function DoctorLoginForm({ gatewayLabel, portalLabel, heading, redirectTo, footnote, allowedRoles = DOCTOR_ROLES, requiredLevel }: DoctorLoginFormProps) {
  const router = useRouter();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      await loginWithPassword(email.trim(), password, allowedRoles, requiredLevel);
      router.push(redirectTo);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">{gatewayLabel}</span>
          <h1 className="font-bold text-2xl text-gray-600 tracking-tight leading-none uppercase">MEDIMIND</h1>
          <p className="text-sm text-gray-500 font-semibold tracking-wider uppercase">{portalLabel}</p>
        </div>

        <Card className="p-8 border border-gray-300">
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold text-gray-650 uppercase tracking-wider">{heading}</h3>
            <p className="text-xs text-gray-405 mt-1 leading-normal">Sign in with your clinic email and password.</p>
          </div>

          {errorMsg && (
            <Alert type="error" titleText="Sign-in failed" className="mb-4">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Email"
              type="email"
              autoComplete="username"
              placeholder="name@clinic.example"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" disabled={isLoading} className="w-full mt-4">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="pt-6 border-t border-gray-200 mt-6 text-center">
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed uppercase tracking-wider">{footnote}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
