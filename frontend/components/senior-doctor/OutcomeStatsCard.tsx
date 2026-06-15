import React from "react";
import { OutcomeStatistic } from "@/types/senior-doctor";
import { Card } from "@/components/ui/Card";

interface OutcomeStatsCardProps {
  statistics: OutcomeStatistic[];
  className?: string;
}

export const OutcomeStatsCard: React.FC<OutcomeStatsCardProps> = ({ statistics, className = "" }) => {
  return (
    <Card className={`border border-gray-300 ${className}`}>
      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">
            COHORT INSIGHTS
          </span>
          <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider">
            AI Outcome Projections
          </h4>
        </div>

        <div className="space-y-4">
          {statistics.map((stat, idx) => (
            <div key={idx} className="border-b border-gray-150 pb-3 last:border-0 last:pb-0 text-left font-semibold uppercase tracking-wider text-xs">
              <div className="flex justify-between items-baseline">
                <span className="text-gray-450 text-[10px] font-bold block">{stat.metricName}</span>
                <span className="text-sm font-bold text-clinical-blue">{stat.value}</span>
              </div>
              <p className="normal-case font-normal text-xs text-gray-500 mt-1 leading-relaxed">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
