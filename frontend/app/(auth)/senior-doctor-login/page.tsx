import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SeniorDoctorLogin() {
  return (
    <div className="min-h-screen bg-[rgb(11,15,26)] text-[rgb(241,245,249)] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 shadow-2xl backdrop-blur-md text-center space-y-6">
        <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 text-amber-400 inline-block">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-100">Senior Doctor Console</h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Phase 2 — Locked</p>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          The Senior Doctor Console is scheduled for implementation in Phase 2 of the MediMind platform.
        </p>
        <Link
          href="/"
          className="block w-full py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-sm transition-all"
        >
          Return to Portal Hub
        </Link>
      </div>
    </div>
  );
}
