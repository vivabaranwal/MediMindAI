"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// Mock patients database
const mockPatients = [
  { id: 1, code: "MM-2026-00001", name: "Ramesh Sharma", age: 45, gender: "Male", mobile: "9876543210", email: "ramesh@domain.com" },
  { id: 2, code: "MM-2026-00002", name: "Sunita Gupta", age: 38, gender: "Female", mobile: "9123456789", email: "sunita@domain.com" },
  { id: 3, code: "MM-2026-00003", name: "Kabir Mehra", age: 29, gender: "Male", mobile: "9567890123", email: "kabir@domain.com" },
  { id: 4, code: "MM-2026-00004", name: "Ananya Deshmukh", age: 12, gender: "Female", mobile: "9890123456", email: "parent.ananya@domain.com" },
  { id: 5, code: "MM-2026-00005", name: "William D'Souza", age: 61, gender: "Male", mobile: "9765432109", email: "william@domain.com" },
];

export default function SearchPatients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState(mockPatients);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);

    if (!query) {
      setResults(mockPatients);
      return;
    }

    const filtered = mockPatients.filter(patient =>
      patient.name.toLowerCase().includes(query) ||
      patient.mobile.includes(query) ||
      patient.code.toLowerCase().includes(query)
    );
    setResults(filtered);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Structural Page Header */}
      <div className="border-b border-gray-200 pb-6 mb-6 flex justify-between items-end">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
            Registry Desk
          </span>
          <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">
            Existing Patient Registry
          </h2>
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

      {/* Search Input Bar */}
      <div>
        <Input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search by Patient Code (e.g. MM-2026-00001), Full Name, or 10-digit Mobile Number..."
          className="w-full px-6 py-4"
        />
      </div>

      {/* Results List */}
      <Card className="border border-gray-300">
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center -mx-6 -mt-6 rounded-t-[4px]">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
            Search Results ({results.length} Found)
          </span>
        </div>

        {results.length > 0 ? (
          <div className="divide-y divide-gray-200 -mx-6 -mb-6">
            {results.map(patient => (
              <div
                key={patient.id}
                className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-[4px] bg-gray-150 border border-gray-300 flex items-center justify-center font-bold text-gray-600 text-lg">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-gray-605 text-base">{patient.name}</h4>
                      <span className="text-[10px] bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-[4px] text-gray-500 font-bold tracking-wider font-mono">
                        {patient.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-2 font-semibold uppercase tracking-wider">
                      <span>Age: {patient.age}Y ({patient.gender})</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>
                        +91 {patient.mobile.substring(0, 3)}****{patient.mobile.substring(7)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
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
        ) : (
          <div className="text-center py-16 text-gray-450 font-semibold space-y-2">
            <p className="text-lg text-gray-450">No Patient Records Found</p>
            <p className="text-xs max-w-sm mx-auto leading-relaxed normal-case text-gray-405">
              Try searching with a different mobile number or spelling, or register a new record.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
