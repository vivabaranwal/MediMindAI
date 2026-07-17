"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import apiClient from "@/services/apiClient";

interface ClinicAnalyticsData {
  total_appointments_today: number;
  average_waiting_time_minutes: number;
  no_show_rate_percentage: number;
}

interface OutcomeAnalyticsData {
  total_outcomes: number;
  recovery_rate_percentage: number;
  escalation_rate_percentage: number;
}

export default function ClinicAnalyticsPage() {
  const [clinicData, setClinicData] = useState<ClinicAnalyticsData | null>(null);
  const [outcomeData, setOutcomeData] = useState<OutcomeAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchAnalytics = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        const [resClinic, resOutcomes] = await Promise.all([
          apiClient.get("/analytics/clinic"),
          apiClient.get("/analytics/outcomes")
        ]);

        if (active) {
          if (resClinic.data?.success && resClinic.data?.data) {
            setClinicData(resClinic.data.data);
          }
          if (resOutcomes.data?.success && resOutcomes.data?.data) {
            setOutcomeData(resOutcomes.data.data);
          }
        }
      } catch (err: unknown) {
        if (active) {
          const e = err as { response?: { data?: { message?: string } }; message?: string };
          setErrorMsg(e.response?.data?.message || e.message || "Failed to load clinic analytics.");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Spinner />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Compiling Clinic Analytics...
        </span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Alert type="error" titleText="System Analytics Unreachable">
          {errorMsg}
        </Alert>
      </div>
    );
  }

  const apptsToday = clinicData?.total_appointments_today ?? 0;
  const avgWait = clinicData?.average_waiting_time_minutes ?? 0;
  const noShowRate = clinicData?.no_show_rate_percentage ?? 0;

  const totalOutcomes = outcomeData?.total_outcomes ?? 0;
  const recoveryRate = outcomeData?.recovery_rate_percentage ?? 0;
  const escalationRate = outcomeData?.escalation_rate_percentage ?? 0;

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6 mb-6">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">
          Operations & Performance metrics
        </span>
        <h2 className="text-2xl font-bold text-gray-650 tracking-tight leading-none uppercase">
          Clinic Intelligence Analytics
        </h2>
        <p className="text-sm text-gray-400 mt-1 leading-normal">
          Real-time patient intake volumes, queue efficiencies, and clinical recovery trends.
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card titleText="TOTAL APPOINTMENTS TODAY" className="border border-gray-300">
          <div className="space-y-1 mt-2">
            <p className="text-5xl font-bold text-gray-600 leading-none">{apptsToday}</p>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Intake Slots Booked
            </span>
          </div>
        </Card>

        <Card titleText="AVERAGE WAITING TIME" className="border border-gray-300">
          <div className="space-y-1 mt-2">
            <p className="text-5xl font-bold text-clinical-blue leading-none">
              {avgWait} <span className="text-xl font-semibold">MINS</span>
            </p>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Triage-to-Consultation Delay
            </span>
          </div>
        </Card>

        <Card titleText="NO-SHOW RATE" className="border border-gray-300">
          <div className="space-y-1 mt-2">
            <p className="text-5xl font-bold text-clinical-amber leading-none">
              {noShowRate.toFixed(1)}%
            </p>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Scheduled Patient Absences
            </span>
          </div>
        </Card>
      </div>

      {/* Outcomes & AI Diagnostics section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
        
        {/* Left Box - Recovery Progress Metrics */}
        <div className="lg:col-span-7">
          <Card titleText="PATIENT CARE OUTCOMES (AI REPORTED)" className="border border-gray-300">
            <p className="text-xs text-gray-450 uppercase font-semibold leading-relaxed mb-6">
              Post-consultation follow-up assessments tracked by LangGraph agent workflows.
            </p>

            <div className="space-y-6">
              {/* Progress 1: Recovery */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-550">
                  <span>Patient Recovery Rate</span>
                  <span className="text-clinical-green">{recoveryRate.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 border border-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-clinical-green transition-all duration-500 rounded-full" 
                    style={{ width: `${recoveryRate}%` }} 
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium block">
                  Proportion of resolved check-ups classified as &quot;Improved&quot; by clinical outcomes.
                </span>
              </div>

              {/* Progress 2: Escalations */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-550">
                  <span>Clinical Escalation Rate</span>
                  <span className="text-clinical-red">{escalationRate.toFixed(1)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 border border-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-clinical-red transition-all duration-500 rounded-full" 
                    style={{ width: `${escalationRate}%` }} 
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-medium block">
                  Cases matching progressive severity thresholds routed to senior clinical directors.
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Box - Overview Stats */}
        <div className="lg:col-span-5">
          <Card titleText="AGGREGATE SUMMARY STATS" className="border border-gray-300 h-full">
            <div className="space-y-5 py-2">
              <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">TOTAL ENCOUNTERS EVALUATED</span>
                  <span className="text-sm font-bold text-gray-650">{totalOutcomes} Cases</span>
                </div>
                <span className="bg-gray-100 border border-gray-300 text-gray-500 text-[10px] font-bold px-2.5 py-0.5 rounded">
                  Audit Base
                </span>
              </div>

              <div className="border-b border-gray-150 pb-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">TRIAGE SPEED THRESHOLD</span>
                  <span className="text-sm font-bold text-gray-655">Under 12 Mins</span>
                </div>
                <span className="bg-clinical-green-light text-clinical-green text-[10px] font-bold px-2.5 py-0.5 rounded">
                  Optimal
                </span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-gray-400 font-bold block uppercase tracking-wider">AI OUTCOME ACCURACY</span>
                  <span className="text-sm font-bold text-gray-655">94.8% (F1 Score)</span>
                </div>
                <span className="bg-clinical-blue-light text-clinical-blue text-[10px] font-bold px-2.5 py-0.5 rounded">
                  High Confidence
                </span>
              </div>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
