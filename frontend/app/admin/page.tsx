"use client";

import { Card } from "@/components/ui/Card";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/Table";

const initialAuditLogs = [
  { id: 1, time: "2026-06-15 12:40", user: "Viva Baranwal", role: "Reception", action: "Registered patient Ramesh Sharma (MM-2026-00045)", ip: "192.168.10.45", security: "green" },
  { id: 2, time: "2026-06-15 12:42", user: "Viva Baranwal", role: "Reception", action: "Uploaded diagnostic report Audiology_Report_2026.pdf", ip: "192.168.10.45", security: "green" },
  { id: 3, time: "2026-06-15 12:44", user: "Dr. Amit Pathak", role: "Junior Resident", action: "Transcribed clinical dictation brief (Whisper AI)", ip: "192.168.10.51", security: "green" },
  { id: 4, time: "2026-06-15 12:45", user: "Dr. Alok Verma", role: "Senior Otologist", action: "Finalized consult SOAP & Prescription for Ramesh Sharma", ip: "192.168.10.104", security: "green" },
];

export default function AdminDashboardPage() {
  const logs = initialAuditLogs;

  return (
    <div className="space-y-8">
      {/* Structural Page Header */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
          Infrastructure Operations
        </span>
        <h2 className="text-2xl font-bold text-gray-600 uppercase tracking-tight">
          System Diagnostics & Audits
        </h2>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-gray-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Active Users
            </span>
            <p className="text-4xl font-bold text-gray-600 leading-none">14</p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              System CPU Load
            </span>
            <p className="text-4xl font-bold text-clinical-blue leading-none">12%</p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              API Errors (24h)
            </span>
            <p className="text-4xl font-bold text-clinical-green leading-none">0</p>
          </div>
        </Card>

        <Card className="border border-gray-300">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Database Status
            </span>
            <p className="text-xl font-bold text-clinical-green uppercase leading-tight mt-1">
              HEALTHY / ONLINE
            </p>
          </div>
        </Card>
      </div>

      {/* Main Structural Layout */}
      <div className="clinical-grid">
        {/* Left Column (8 cols): Activity Audit Logs */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <Card titleText="System Session Audit Logs" className="border border-gray-300">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell className="w-[140px]">Timestamp</TableHeaderCell>
                  <TableHeaderCell className="w-[120px]">User</TableHeaderCell>
                  <TableHeaderCell className="w-[120px]">Role</TableHeaderCell>
                  <TableHeaderCell>Action Performed</TableHeaderCell>
                  <TableHeaderCell className="w-[110px]">IP Address</TableHeaderCell>
                  <TableHeaderCell className="w-[80px] text-right">Audit</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs font-bold text-gray-400">{log.time}</TableCell>
                    <TableCell className="font-bold text-gray-650">{log.user}</TableCell>
                    <TableCell className="font-semibold text-xs text-gray-500 uppercase tracking-wider">{log.role}</TableCell>
                    <TableCell className="text-sm font-medium">{log.action}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-gray-500">{log.ip}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={log.security as BadgeVariant}>Passed</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Right Column (4 cols): System health alerts & maintenance schedules */}
        <div className="col-span-12 lg:col-span-4 space-y-8 text-left">
          {/* Infrastructure Alerts */}
          <Card titleText="Infrastructure Alerts" className="border border-gray-300">
            <div className="space-y-4">
              <div className="border-l-4 border-clinical-blue bg-[#F0EDFF] p-4 rounded-[4px] space-y-1">
                <span className="text-[10px] text-clinical-blue font-bold uppercase tracking-wider block">
                  STORAGE NODE CHECK
                </span>
                <p className="text-xs font-bold text-gray-650">S3 MinIO Bucket: Healthy</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Available space: 840 GB. Backup configurations validated successfully.
                </p>
              </div>

              <div className="border-l-4 border-clinical-green bg-[#F0F8F4] p-4 rounded-[4px] space-y-1">
                <span className="text-[10px] text-clinical-green font-bold uppercase tracking-wider block">
                  FASTAPI GATEWAY RUNNING
                </span>
                <p className="text-xs font-bold text-gray-650">LangGraph Agents Gateway</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  All 9 LangGraph agents loaded. Average inference latency: 420ms.
                </p>
              </div>
            </div>
          </Card>

          {/* Maintenance schedules */}
          <Card titleText="Upcoming Schedules" className="border border-gray-300">
            <div className="space-y-4 text-xs text-gray-600 leading-relaxed uppercase font-semibold tracking-wide">
              <div className="border-b border-gray-200 pb-3">
                <span className="text-gray-450 block text-[10px] mb-1">WEEKLY BACKUP RUNS</span>
                <p className="text-gray-650 normal-case font-normal text-sm">
                  Full PostgreSQL & S3 MinIO storage dump scheduled for Sunday at 02:00 AM IST.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-3">
                <span className="text-gray-450 block text-[10px] mb-1">SECURITY ENGINE PATCHES</span>
                <p className="text-gray-650 normal-case font-normal text-sm">
                  Laravel 12 point security upgrades slated for implementation next Tuesday.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
