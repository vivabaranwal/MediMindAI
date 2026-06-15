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

// Form validation schemas
const loginSchema = zod.object({
  mobile: zod.string().min(10, "Mobile number must be at least 10 digits").max(12, "Invalid mobile number"),
  password: zod.string().min(6, "Password must be at least 6 characters"),
});

const otpSchema = zod.object({
  mobile: zod.string().min(10, "Mobile number must be at least 10 digits").max(12, "Invalid mobile number"),
  otp: zod.string().min(4, "OTP must be at least 4 digits").max(6, "Invalid OTP"),
});

export default function ReceptionLogin() {
  const [loginMode, setLoginMode] = useState<"password" | "otp">("password");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const router = useRouter();

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    getValues: getPasswordValues,
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: "", password: "" },
  });

  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { mobile: "", otp: "" },
  });

  const onSubmitPassword = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Simulate API verification delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/reception");
    } catch {
      setErrorMsg("Invalid credentials. Please verify your mobile number and password.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmitOtp = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Simulate API verification delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      router.push("/reception");
    } catch {
      setErrorMsg("Invalid OTP code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async () => {
    const mobileValue = getPasswordValues("mobile");
    if (!mobileValue || mobileValue.length < 10) {
      setErrorMsg("Please enter a valid mobile number first.");
      return;
    }
    setIsLoading(true);
    setErrorMsg("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setOtpValue("mobile", mobileValue);
      setOtpSent(true);
      setLoginMode("otp");
    } catch {
      setErrorMsg("Failed to send OTP. Please check server status.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
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
            <form onSubmit={handlePasswordSubmit(onSubmitPassword)} className="space-y-6">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="Enter 10-digit mobile"
                required
                error={passwordErrors.mobile?.message}
                {...registerPassword("mobile")}
              />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Password
                  </span>
                  <button
                    type="button"
                    onClick={sendOtp}
                    className="text-xs text-clinical-blue hover:text-clinical-blue-dark font-semibold uppercase tracking-wider"
                  >
                    Send OTP instead?
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
            <form onSubmit={handleOtpSubmit(onSubmitOtp)} className="space-y-6">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="Enter 10-digit mobile"
                required
                error={otpErrors.mobile?.message}
                {...registerOtp("mobile")}
              />

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Secure OTP Code
                  </span>
                  <span className="text-[10px] bg-gray-150 border border-gray-300 px-2 py-0.5 rounded text-gray-500 font-semibold uppercase tracking-wider">
                    {otpSent ? "Code Sent" : "Demo code: 123456"}
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
