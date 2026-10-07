"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/LoadingState";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";
import apiClient from "@/services/apiClient";
import { toApiError } from "@/lib/errors";

interface Overview {
  active_users: number;
  staff_by_role: Record<string, number>;
  patients: number;
  appointments_today: number;
  reports_by_status: Record<string, number>;
  reports_needing_attention: number;
  audit_events_24h: number;
}

interface AuditRow {
  id: number;
  time: string | null;
  user: string | null;
  role: string | null;
  action: string;
  resource: string | null;
  resource_id: number | null;
  fields: string[] | null;
  ip: string | null;
}

const REPORT_STATUS_LABEL: Record<string, string> = {
  pending_analysis: "Queued",
  analyzing: "Analysing",
  analyzed: "Analysed",
  failed: "Failed",
  not_analyzed: "Not analysed (no AI consent)",
};

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [o, l] = await Promise.all([apiClient.get("/admin/overview"), apiClient.get("/admin/audit-logs", { params: { per_page: 25 } })]);
        if (!active) return;
        setOverview(o.data.data);
        setLogs(l.data.data);
      } catch (err) {
        if (active) setError(toApiError(err, "Could not load the admin overview.").message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading system overview...</span>
      </div>
    );
  }

  const kpis: [string, number | string, string][] = overview
    ? [
        ["Active Users", overview.active_users, "text-gray-600"],
        ["Registered Patients", overview.patients, "text-gray-600"],
        ["Appointments Today", overview.appointments_today, "text-clinical-blue"],
        ["Reports Needing Attention", overview.reports_needing_attention, overview.reports_needing_attention > 0 ? "text-clinical-amber" : "text-clinical-green"],
      ]
    : [];

  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-6 mb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Operations</span>
        <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">System Overview &amp; Audit Trail</h2>
      </div>

      {error && (
        <Alert type="error" titleText="Could not load data">
          {error}
        </Alert>
      )}

      {overview && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {kpis.map(([label, value, color]) => (
              <Card key={label} className="border border-gray-300">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">{label}</span>
                  <p className={`text-4xl font-bold leading-none ${color}`}>{value}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card titleText="Reports by status" className="border border-gray-300">
              <ul className="space-y-2 text-sm text-gray-600">
                {Object.entries(overview.reports_by_status).length === 0 && <li className="text-gray-400 text-xs">No reports uploaded.</li>}
                {Object.entries(overview.reports_by_status).map(([status, total]) => (
                  <li key={status} className="flex justify-between border-b border-gray-150 pb-1.5 last:border-0">
                    <span>{REPORT_STATUS_LABEL[status] ?? status}</span>
                    <span className="font-bold">{total}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card titleText="Active staff by role" className="border border-gray-300">
              <ul className="space-y-2 text-sm text-gray-600">
                {Object.entries(overview.staff_by_role).map(([role, total]) => (
                  <li key={role} className="flex justify-between border-b border-gray-150 pb-1.5 last:border-0">
                    <span className="uppercase tracking-wider text-xs font-semibold">{role.replace("_", " ")}</span>
                    <span className="font-bold">{total}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}

      <Card titleText={`Recent write activity${overview ? ` (${overview.audit_events_24h} in the last 24h)` : ""}`} className="border border-gray-300">
        <p className="text-[11px] text-gray-400 mb-3 normal-case">
          Every create, update and delete is recorded with who did it and which fields were submitted. Field values are never logged.
        </p>
        {logs.length === 0 ? (
          <p className="text-xs text-gray-450 text-center py-6 font-semibold uppercase tracking-wider">No activity recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Time</TableHeaderCell>
                <TableHeaderCell>User</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
                <TableHeaderCell>Fields</TableHeaderCell>
                <TableHeaderCell>IP</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-gray-500">{l.time}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-gray-600">{l.user ?? "—"}</span>
                    <span className="block text-[10px] text-gray-400 uppercase">{l.role?.replace("_", " ")}</span>
                  </TableCell>
                  <TableCell className="normal-case font-mono text-[11px]">{l.action}</TableCell>
                  <TableCell className="normal-case text-gray-500 text-[11px]">{l.fields?.join(", ") ?? "—"}</TableCell>
                  <TableCell className="text-gray-400">{l.ip ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
