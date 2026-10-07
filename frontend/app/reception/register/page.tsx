"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toLocalIsoDate } from "@/lib/dates";
import { Checkbox } from "@/components/ui/Checkbox";
import { Alert } from "@/components/ui/Alert";
import apiClient from "@/services/apiClient";

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
  allergies: zod.string().optional(),
  medical_history: zod.string().optional(),
  current_medications: zod.string().optional(),
  consent: zod.boolean().refine(val => val === true, "Consent to store records is mandatory"),
  ai_consent: zod.boolean().optional(),
});

interface RegisterFormData {
  name: string;
  dob: string;
  gender: string;
  mobile: string;
  email?: string;
  address?: string;
  blood_group?: string;
  abha_id?: string;
  emergency_name: string;
  emergency_mobile: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
  consent: boolean;
  ai_consent?: boolean;
}

/** "a, b\nc" -> ["a", "b", "c"] */
const splitList = (text?: string): string[] =>
  (text ?? "").split(/[,\n;]/).map((t) => t.trim()).filter(Boolean);

export default function RegisterPatient() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

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
      allergies: "",
      medical_history: "",
      current_medications: "",
      consent: false,
      ai_consent: false,
    },
  });


  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      // Calculate age from Date of Birth
      const dobDate = new Date(data.dob);
      const age = new Date().getFullYear() - dobDate.getFullYear();

      // 1. Register Patient via Laravel endpoint StorePatientRequest DTO
      const patientResponse = await apiClient.post("/patients", {
        name: data.name,
        date_of_birth: data.dob,
        age: isNaN(age) ? null : age,
        gender: data.gender,
        mobile: data.mobile,
        email: data.email || null,
        address: data.address || null,
        blood_group: data.blood_group === "Unknown" ? null : data.blood_group,
        abha_id: data.abha_id || null,
        emergency_contact_name: data.emergency_name || null,
        emergency_contact_mobile: data.emergency_mobile || null,
        allergies: splitList(data.allergies).map((allergen) => ({ allergen })),
        medical_history: splitList(data.medical_history),
        current_medications: splitList(data.current_medications),
        data_consent: data.consent,
        ai_consent: Boolean(data.ai_consent),
      });

      const newPatient = patientResponse.data.data;
      if (!newPatient || !newPatient.id) {
        throw new Error("Patient registration did not return a valid patient ID.");
      }

      // 2. Add the patient to the intake queue (the server assigns the junior doctor)
      const now = new Date();
      const appointment_date = toLocalIsoDate(now);
      const appointment_time = now.toTimeString().split(" ")[0].substring(0, 5); // Format: "HH:MM"

      await apiClient.post("/appointments", {
        patient_id: newPatient.id,
        appointment_date,
        appointment_time,
        type: "walk_in",
        triage_level: "green",
        chief_complaint: "General Walk-in Consultation",
      });

      // Navigate to Reception Dashboard queue
      router.push("/reception");
    } catch (err: unknown) {
      console.error(err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e.response?.data?.message || e.message || "Failed to register patient and schedule consultation.");
    } finally {
      setIsLoading(false);
    }
  };

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
          {errorMsg && (
            <Alert type="error" titleText="Intake Processing Failed">
              {errorMsg}
            </Alert>
          )}
          
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
            <div className="text-sm font-bold text-gray-650 uppercase tracking-wider border-b border-gray-250 pb-2">
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

          {/* Medical background: allergies drive the prescription safety check */}
          <div className="space-y-6">
            <div className="text-sm font-bold text-gray-650 uppercase tracking-wider border-b border-gray-250 pb-2">
              2b. Medical Background
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Known Allergies"
                placeholder="e.g. Penicillin, Sulfa (comma separated)"
                {...register("allergies")}
              />
              <Input
                label="Existing Conditions"
                placeholder="e.g. Asthma, Diabetes"
                {...register("medical_history")}
              />
              <Input
                label="Current Medications"
                placeholder="e.g. Metformin 500mg"
                {...register("current_medications")}
              />
            </div>
            <p className="text-[11px] text-gray-400 normal-case">
              Enter &quot;none&quot; in your own words if the patient reports no allergies; leaving it blank means not recorded.
            </p>
          </div>

          {/* Section 3: Queue Assignment */}
          <div className="space-y-6">
            <div className="text-sm font-bold text-gray-650 uppercase tracking-wider border-b border-gray-250 pb-2">
              3. Consult Queue Assignment
            </div>

            <p className="text-xs text-gray-450 leading-normal">
              New patients go to the junior doctor for intake assessment. The junior doctor chooses the senior doctor afterwards.
            </p>
          </div>

          {/* Consent Checkbox Area */}
          <div className="bg-gray-50 p-6 border border-gray-200 rounded-[4px] space-y-4">
            <Checkbox
              label="The patient has given explicit consent to store their demographic and clinical information and uploaded reports (required, DPDP)."
              error={errors.consent?.message}
              required
              {...register("consent")}
            />
            <Checkbox
              label="The patient also consents to AI-assisted processing of their data (intake questions, summaries, report reading, chat). Optional: without it, AI features stay off for this patient but allergy checks still apply."
              {...register("ai_consent")}
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
