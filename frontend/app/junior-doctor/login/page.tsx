"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { JuniorDoctorService } from "@/services/juniorDoctor.service";

export default function JuniorDoctorLogin() {
  const [employeeId, setEmployeeId] = useState("JD-9021");
  const [passcode, setPasscode] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      await JuniorDoctorService.login(employeeId, passcode);
      router.push("/junior-doctor/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid Employee ID or Passcode.";
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
            Clinical Portal Gateway
          </span>
          <h1 className="font-bold text-2xl text-gray-600 tracking-tight leading-none uppercase">
            MEDIMIND
          </h1>
          <p className="text-sm text-gray-500 font-semibold tracking-wider uppercase">
            Junior Doctor Core
          </p>
        </div>

        {/* Card for login credentials */}
        <Card className="p-8 border border-gray-300">
          <div className="text-center mb-6">
            <h3 className="text-sm font-bold text-gray-650 uppercase tracking-wider">
              Staff Authentication
            </h3>
            <p className="text-xs text-gray-405 mt-1 leading-normal">
              Enter your assigned EMR credentials to log in.
            </p>
          </div>

          {errorMsg && (
            <Alert type="error" titleText="Authorization Failed" className="mb-4">
              {errorMsg}
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              label="Employee ID"
              type="text"
              placeholder="e.g. JD-9021"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              required
            />

            <Input
              label="Security Passcode"
              type="password"
              placeholder="••••••••"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
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
              Authorized Residency Personnel Only. <br />
              IP Address and session activities are audited.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
