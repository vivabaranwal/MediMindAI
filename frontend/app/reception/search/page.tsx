"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import apiClient from "@/services/apiClient";
import { toApiError } from "@/lib/errors";

interface PatientRow {
  id: number;
  patient_code: string;
  name: string;
  age: number | null;
  gender: string | null;
  mobile: string;
}

const MIN_QUERY = 2;

const maskMobile = (mobile: string) => (mobile.length > 4 ? `${"•".repeat(mobile.length - 4)}${mobile.slice(-4)}` : mobile);

export default function SearchPatients() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientRow[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounced search against the real registry.
  useEffect(() => {
    const term = query.trim();
    if (term.length < MIN_QUERY) {
      setResults([]);
      setSearched(false);
      setError("");
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiClient.get("/patients", { params: { search: term } });
        if (!active) return;
        setResults(res.data?.data ?? []);
        setSearched(true);
      } catch (err) {
        if (active) setError(toApiError(err, "Search failed.").message);
      } finally {
        if (active) setLoading(false);
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Registry Desk</span>
          <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">Existing Patient Registry</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/reception/register">
            <Button variant="primary" size="sm">
              Add New Patient
            </Button>
          </Link>
          <Link href="/reception">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        </div>
      </div>

      <div>
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by patient code, full name or mobile number..."
          className="w-full px-6 py-4"
        />
      </div>

      {error && (
        <Alert type="error" titleText="Search failed">
          {error}
        </Alert>
      )}

      <Card className="border border-gray-300">
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center -mx-6 -mt-6 rounded-t-[4px]">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            {loading ? "Searching…" : searched ? `Search Results (${results.length} Found)` : "Search Results"}
          </span>
        </div>

        {!searched && !loading && (
          <div className="text-center py-16 text-gray-450 font-semibold">
            <p className="text-xs normal-case">Type at least {MIN_QUERY} characters to search the registry.</p>
          </div>
        )}

        {searched && results.length > 0 && (
          <div className="divide-y divide-gray-200 -mx-6 -mb-6">
            {results.map((patient) => (
              <div key={patient.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[4px] bg-gray-150 border border-gray-300 flex items-center justify-center font-bold text-gray-600 text-lg">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-gray-605 text-base">{patient.name}</h4>
                      <span className="text-[10px] bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-[4px] text-gray-500 font-bold tracking-wider font-mono">
                        {patient.patient_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 font-semibold uppercase tracking-wider">
                      <span>
                        Age: {patient.age ?? "—"}
                        {patient.gender ? ` (${patient.gender})` : ""}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{maskMobile(patient.mobile)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto justify-end">
                  <Link href={`/reception/patient/${patient.id}`}>
                    <Button variant="secondary" size="sm">
                      Open Profile
                    </Button>
                  </Link>
                  <Link href={`/reception/patient/${patient.id}`}>
                    <Button variant="primary" size="sm">
                      Send to Doctor
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {searched && results.length === 0 && (
          <div className="text-center py-16 text-gray-450 font-semibold space-y-2">
            <p className="text-lg text-gray-450">No Patient Records Found</p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed normal-case text-gray-405">
              Try a different spelling or mobile number, or register a new patient.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
