"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { SeniorDoctorService } from "@/services/seniorDoctor.service";

export default function SeniorDoctorLogin() {
  const [employeeId, setEmployeeId] = useState("SD-1001");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      await SeniorDoctorService.login(employeeId, password);
      router.push("/senior-doctor/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            Clinical Specialist Gateway
          </span>
          <h1 className="font-bold text-2xl text-gray-600 tracking-tight leading-none uppercase">
            MEDIMIND
          </h1>
          <p className="text-sm text-gray-500 font-semibold tracking-wider uppercase">
            Senior Consultant Suite
          </p>
        </div>

        {/* Card for login */}
        <Card className="p-8 border border-gray-300">
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold text-gray-650 uppercase tracking-wider">
              Specialist Sign-In
            </h3>
            <p className="text-xs text-gray-405 mt-1 leading-normal">
              Enter your assigned Consultant ID to access the EMR workspace.
            </p>
          </div>

          {errorMsg && (
            <Alert type="error" titleText="Authorization Failed" className="mb-4">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Consultant Employee ID"
              type="text"
              placeholder="e.g. SD-1001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />

            <Input
              label="Security Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full mt-4"
            >
              {isLoading ? "Authenticating..." : "Sign In"}
            </Button>
          </form>

          {/* Secure Audit Label */}
          <div className="pt-6 border-t border-gray-200 mt-6 text-center">
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed uppercase tracking-wider">
              Authorized Senior Medical Staff Only. <br />
              All consultation activities are logged under clinical audits.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
