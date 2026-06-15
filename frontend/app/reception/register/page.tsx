"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";

// Validation schema
const registerSchema = zod.object({
  name: zod.string().min(3, "Name must be at least 3 characters"),
  dob: zod.string().min(1, "Date of Birth is required"),
  gender: zod.string().min(1, "Select gender"),
  mobile: zod.string().min(10, "Mobile must be 10 digits").max(10, "Mobile must be 10 digits"),
  email: zod.string().email("Invalid email").optional().or(zod.literal("")),
  address: zod.string().optional(),
  blood_group: zod.string().optional(),
  abha_id: zod.string().optional(),
  emergency_name: zod.string().min(3, "Emergency contact name required"),
  emergency_mobile: zod.string().min(10, "Emergency mobile must be 10 digits").max(10, "Emergency mobile must be 10 digits"),
  consent: zod.boolean().refine(val => val === true, "Patient consent is mandatory"),
  doctor_id: zod.string().min(1, "Please assign a doctor"),
});

export default function RegisterPatient() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      dob: "",
      gender: "Male",
      mobile: "",
      email: "",
      address: "",
      blood_group: "Unknown",
      abha_id: "",
      emergency_name: "",
      emergency_mobile: "",
      consent: false,
      doctor_id: "",
    },
  });

  const onSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate API registration delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Generate a mock patient code
      const code = `MM-2026-${Math.floor(10000 + Math.random() * 90000)}`;
      setCreatedCode(code);
      setIsSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <Card className="border border-gray-300 p-8 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-650 uppercase tracking-tight">
              Patient Registered
            </h2>
            <p className="text-sm text-gray-400">
              The patient has been added to the consultation queue.
            </p>
          </div>

          <div className="bg-gray-100 p-6 rounded border border-gray-200 max-w-sm mx-auto">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
              Patient Registry Code
            </span>
            <span className="text-2xl font-extrabold text-clinical-blue tracking-wider font-mono">
              {createdCode}
            </span>
          </div>

          <div className="flex justify-center gap-4 pt-4">
            <Link href="/reception">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
            <Button variant="primary" onClick={() => setIsSuccess(false)}>
              Register Another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Structural Page Header */}
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Registry Desk
          </span>
          <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
            Patient Intake Form
          </h2>
        </div>
        <Link href="/reception">
          <Button variant="secondary" size="sm">
            Cancel & Return
          </Button>
        </Link>
      </div>

      <Card className="border border-gray-300 p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Section 1: Demographics */}
          <div className="space-y-6">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wider border-b border-gray-250 pb-2">
              1. Demographics & Biological Info
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Patient Full Name"
                placeholder="e.g. Ramesh Kumar"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <Input
                label="Date of Birth"
                type="date"
                required
                error={errors.dob?.message}
                {...register("dob")}
              />

              <Select
                label="Gender"
                required
                error={errors.gender?.message}
                {...register("gender")}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="10-digit number"
                required
                error={errors.mobile?.message}
                {...register("mobile")}
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                error={errors.email?.message}
                {...register("email")}
              />

              <Select
                label="Blood Group"
                {...register("blood_group")}
              >
                <option value="Unknown">Select / Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Address Details"
                placeholder="Apartment, Street, Locality"
                {...register("address")}
              />

              <Input
                label="ABHA Health ID (Ayushman Bharat)"
                placeholder="14-digit Health ID or Address"
                {...register("abha_id")}
              />
            </div>
          </div>

          {/* Section 2: Emergency Contact */}
          <div className="space-y-6">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wider border-b border-gray-250 pb-2">
              2. Emergency Contacts
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Contact Person Name"
                placeholder="e.g. Anjali Kumar (Spouse)"
                required
                error={errors.emergency_name?.message}
                {...register("emergency_name")}
              />

              <Input
                label="Emergency Contact Mobile"
                type="tel"
                placeholder="10-digit emergency number"
                required
                error={errors.emergency_mobile?.message}
                {...register("emergency_mobile")}
              />
            </div>
          </div>

          {/* Section 3: Queue Assignment */}
          <div className="space-y-6">
            <div className="text-sm font-bold text-gray-600 uppercase tracking-wider border-b border-gray-250 pb-2">
              3. Consult Queue Assignment
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Select Assigned Doctor"
                required
                error={errors.doctor_id?.message}
                {...register("doctor_id")}
              >
                <option value="">-- Choose Consultation Doctor --</option>
                <option value="1">Dr. Alok Verma (ENT Spec. - General)</option>
                <option value="2">Dr. Neha Shah (Otology Spec. - Ear)</option>
              </Select>
            </div>
          </div>

          {/* Consent Checkbox Area */}
          <div className="bg-gray-50 p-6 border border-gray-200 rounded-[4px] space-y-4">
            <Checkbox
              label="I hereby verify that the patient has provided explicit consent to store demographic information, upload diagnostic reports, and allow AI-assisted processing of clinical voice dictations/intakes under DPDP compliance regulations."
              error={errors.consent?.message}
              required
              {...register("consent")}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
            <Link href="/reception">
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? "Saving Record..." : "Register & Queue"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
