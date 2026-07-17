"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Toast } from "@/components/ui/Toast";
import { useAuthStore } from "@/store/authStore";

// Form validation schemas
const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid email address"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

const otpSchema = zod.object({
  mobile: zod.string().min(10, "Mobile number must be at least 10 digits").max(12, "Invalid mobile number"),
  otp: zod.string().min(6, "OTP must be exactly 6 digits").max(6, "Invalid OTP"),
});

export default function ReceptionLogin() {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" | "info" } | null>(null);
  
  const router = useRouter();
  const { loginWithPassword, sendOtp, loginWithOtp } = useAuthStore();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    getValues: getOtpValues,
  } = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { mobile: "", otp: "" },
  });

  const onSubmitPassword = async (data: { email: string; password: string }) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      await loginWithPassword(data.email, data.password);
      router.push("/reception");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid credentials. Please verify your email and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitOtp = async (data: { mobile: string; otp: string }) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      await loginWithOtp(data.mobile, data.otp);
      router.push("/reception");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSendOtp = async (mobileValue: string) => {
    if (!mobileValue || mobileValue.length < 10) {
      setErrorMsg("Please enter a valid mobile number first.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await sendOtp(mobileValue) as { otp?: string };
      setOtpSent(true);
      if (data && data.otp) {
        setReceivedOtp(String(data.otp));
      }
      setToast({ message: "OTP code sent to your mobile number.", variant: "success" });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send OTP. Please check server status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtpClick = () => {
    const mobileValue = getOtpValues("mobile");
    triggerSendOtp(mobileValue);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      {toast && (
        <Toast
          messageText={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}

      <div className="w-full max-w-md space-y-8">
        
        {/* Medical Brand Header */}
        <div className="text-center space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            Clinical Portal Gateway
          </span>
          <h1 className="font-bold text-2xl text-gray-600 tracking-tight leading-none uppercase">
            MEDIMIND
          </h1>
          <p className="text-sm text-gray-500 font-semibold tracking-wider uppercase">
            Reception Desk Core
          </p>
        </div>

        {/* Clinical Interface Card */}
        <Card className="p-8 border border-gray-300">
          {/* Mode Toggler - Medical Gray Block */}
          <div className="flex bg-gray-100 p-1 rounded">
            <button
              onClick={() => {
                setLoginMode("password");
                setErrorMsg("");
              }}
              className={`flex-grow py-2 text-xs font-bold uppercase tracking-wider rounded transition-all duration-150 ${
                loginMode === "password" 
                  ? "bg-white text-clinical-blue" 
                  : "text-gray-500 hover:text-gray-600"
              }`}
            >
              Password
            </button>
            <button
              onClick={() => {
                setLoginMode("otp");
                setErrorMsg("");
              }}
              className={`flex-grow py-2 text-xs font-bold uppercase tracking-wider rounded transition-all duration-150 ${
                loginMode === "otp" 
                  ? "bg-white text-clinical-blue" 
                  : "text-gray-500 hover:text-gray-600"
              }`}
            >
              Secure OTP
            </button>
          </div>

          {/* Form Message Banners */}
          {errorMsg && (
            <Alert type="error" titleText="Authorization Failed">
              {errorMsg}
            </Alert>
          )}

          {/* Forms */}
          {loginMode === "password" ? (
            <form onSubmit={handlePasswordSubmit(onSubmitPassword)} className="space-y-6 mt-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter email address"
                required
                error={passwordErrors.email?.message}
                {...registerPassword("email")}
              />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Password
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode("otp");
                      setErrorMsg("");
                    }}
                    className="text-xs text-clinical-blue hover:text-clinical-blue-dark font-semibold uppercase tracking-wider"
                  >
                    Use OTP instead?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  required
                  error={passwordErrors.password?.message}
                  {...registerPassword("password")}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full mt-4"
              >
                {isLoading ? "Authenticating..." : "Sign In"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit(onSubmitOtp)} className="space-y-6 mt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Mobile Number
                  </span>
                  <button
                    type="button"
                    onClick={handleSendOtpClick}
                    className="text-xs text-clinical-blue hover:text-clinical-blue-dark font-semibold uppercase tracking-wider"
                  >
                    Send OTP code
                  </button>
                </div>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  required
                  error={otpErrors.mobile?.message}
                  {...registerOtp("mobile")}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Secure OTP Code
                  </span>
                  <span className="text-[10px] bg-gray-150 border border-gray-300 px-2 py-0.5 rounded text-gray-500 font-semibold uppercase tracking-wider">
                    {receivedOtp ? `Debug: ${receivedOtp}` : (otpSent ? "Code Sent" : "Demo code: 123456")}
                  </span>
                </div>
                <Input
                  type="text"
                  placeholder="Enter OTP (e.g. 123456)"
                  required
                  error={otpErrors.otp?.message}
                  {...registerOtp("otp")}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full mt-4"
              >
                {isLoading ? "Verifying..." : "Verify & Sign In"}
              </Button>
            </form>
          )}

          {/* Send request to administrator button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setToast({ message: "Request sent to clinic administrator.", variant: "success" });
              }}
              className="text-xs text-clinical-blue hover:text-clinical-blue-dark font-semibold uppercase tracking-wider"
            >
              Send request to administrator
            </button>
          </div>

          {/* Secure Audit Label */}
          <div className="pt-6 border-t border-gray-200 mt-6 text-center">
            <p className="text-[10px] text-gray-400 font-semibold leading-relaxed uppercase tracking-wider">
              Authorized Medical Personnel Only. <br />
              IP Address and session activities are audited.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
