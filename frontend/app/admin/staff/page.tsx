"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import { Modal } from "@/components/ui/Modal";
import apiClient from "@/services/apiClient";

interface StaffUser {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  status: string;
  created_at: string;
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffMobile, setNewStaffMobile] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffRole, setNewStaffRole] = useState("doctor");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchStaffList = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await apiClient.get("/admin/users");
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setStaff(res.data.data);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setErrorMsg(e.response?.data?.message || e.message || "Failed to load staff list.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffMobile.trim() || !newStaffPassword) return;

    setSubmitting(true);
    setErrorMsg(null);
    setSubmitSuccess(false);

    try {
      await apiClient.post("/admin/users", {
        name: newStaffName,
        email: newStaffEmail,
        mobile: newStaffMobile,
        password: newStaffPassword,
        role: newStaffRole,
        status: "active",
      });

      setSubmitSuccess(true);
      setNewStaffName("");
      setNewStaffEmail("");
      setNewStaffMobile("");
      setNewStaffPassword("");
      setNewStaffRole("doctor");
      setIsModalOpen(false);

      // Re-fetch list
      await fetchStaffList();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      alert(e.response?.data?.message || e.message || "Failed to register new staff member.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this staff member? This action is irreversible.")) return;

    try {
      await apiClient.delete(`/admin/users/${id}`);
      setStaff((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      alert(e.response?.data?.message || e.message || "Failed to remove staff member.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Personnel Directory
          </span>
          <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">
            Staff User Management
          </h2>
          <p className="text-sm text-gray-400 mt-1 leading-normal">
            Configure system roles, register consulting specialists, and manage front desk registry credentials.
          </p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)} className="tracking-wider font-bold text-xs py-3 px-5">
          + ADD NEW STAFF
        </Button>
      </div>

      {submitSuccess && (
        <Alert type="success" titleText="Staff Registered" className="animate-fade-in-up">
          New staff member was successfully registered and standard Spatie RBAC role permissions assigned.
        </Alert>
      )}

      {/* Main Staff Directory Card */}
      <Card titleText={`Staff Members Directory (${staff.length})`} className="border border-gray-300">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Spinner />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Fetching staff rosters...
            </span>
          </div>
        ) : errorMsg ? (
          <Alert type="error" titleText="Staff List Unreachable">
            {errorMsg}
          </Alert>
        ) : staff.length === 0 ? (
          <p className="text-xs text-gray-450 uppercase font-semibold text-center py-12 border border-dashed border-gray-300 rounded">
            No staff records found in the database. Use &quot;+ ADD NEW STAFF&quot; to create one.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Email Address</TableHeaderCell>
                <TableHeaderCell>Mobile</TableHeaderCell>
                <TableHeaderCell>Designated Role</TableHeaderCell>
                <TableHeaderCell>System Status</TableHeaderCell>
                <TableHeaderCell className="text-right w-[100px]">Action</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((user) => {
                let badgeVariant: BadgeVariant = "blue";
                if (user.role === "super_admin") badgeVariant = "maroon";
                else if (user.role === "doctor") badgeVariant = "green";
                else if (user.role === "front_desk") badgeVariant = "amber";

                let roleName = user.role;
                if (user.role === "front_desk") roleName = "Receptionist";
                else if (user.role === "clinic_admin") roleName = "Clinic Admin";
                else if (user.role === "super_admin") roleName = "Super Admin";
                else if (user.role === "doctor") roleName = "Doctor Specialist";

                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-bold text-gray-650">{user.name}</TableCell>
                    <TableCell className="font-medium text-gray-600 normal-case">{user.email}</TableCell>
                    <TableCell className="font-mono text-gray-500">{user.mobile || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant}>
                        {roleName.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${user.status === "active" ? "bg-clinical-green" : "bg-gray-350"}`} />
                      <span className="font-semibold text-xs text-gray-500 uppercase">{user.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteStaff(user.id)}
                        className="text-clinical-red hover:bg-clinical-red-light border-clinical-red/20 px-2 min-w-0"
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        titleText="Register New Staff Member"
        footerActions={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddStaffSubmit} disabled={submitting}>
              {submitting ? "Registering..." : "Add Staff"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-left">
          <p className="text-xs text-gray-450 uppercase font-semibold">
            Input credentials and select Spatie authorization roles for the new healthcare provider.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
              Full Name <span className="text-clinical-red">*</span>
            </label>
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="e.g. Dr. Ramesh Kumar"
              required
              className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Email Address <span className="text-clinical-red">*</span>
              </label>
              <input
                type="email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                placeholder="email@medimind.ai"
                required
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Mobile Number <span className="text-clinical-red">*</span>
              </label>
              <input
                type="text"
                value={newStaffMobile}
                onChange={(e) => setNewStaffMobile(e.target.value)}
                placeholder="e.g. +919876543210"
                required
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">
                Default Password <span className="text-clinical-red">*</span>
              </label>
              <input
                type="password"
                value={newStaffPassword}
                onChange={(e) => setNewStaffPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full text-sm text-gray-650 bg-white border border-gray-300 rounded px-3 py-2.5 focus:outline-none focus:border-clinical-blue"
              />
            </div>

            <Select
              label="Assigned System Role"
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
              required
            >
              <option value="doctor">Doctor Specialist</option>
              <option value="front_desk">Reception Desk</option>
              <option value="clinic_admin">Clinic Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
