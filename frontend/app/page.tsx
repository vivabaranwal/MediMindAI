import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-650 flex flex-col justify-between p-8 md:p-12">
      {/* Structural Page Header */}
      <header className="max-w-7xl mx-auto w-full border-b border-gray-300 pb-6 mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <span className="text-sm font-bold tracking-widest text-gray-500 uppercase block mb-1">
            Institutional Clinical Platform
          </span>
          <h1 className="text-2xl font-bold text-gray-600 tracking-tight leading-none">
            MEDIMIND
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-clinical-green" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            System Node: Active Staging
          </span>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="max-w-7xl mx-auto w-full flex-grow flex flex-col justify-center py-8">
        <div className="max-w-3xl space-y-6 mb-16 text-left">
          <h2 className="text-[40px] font-bold text-gray-600 tracking-tight leading-tight uppercase">
            Clinical Workflow <br />
            Orchestration Core
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl leading-relaxed">
            MediMind is a high-performance clinical workspace engineered for clinical operations, diagnostics summary assistance, and electronic medical record handoffs.
          </p>
        </div>

        {/* Dashboard Grid - Swiss Editorial Design */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          {/* Card 1: Reception Portal */}
          <Card 
            titleText="Reception Operations" 
            className="flex flex-col justify-between min-h-[300px]"
            footerActions={
              <Link href="/reception-login" className="w-full">
                <Button variant="primary" className="w-full">
                  Access Portal
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded uppercase">
                Active Node
              </span>
              <p className="text-sm text-gray-500 leading-relaxed">
                Register clinical cases, manage active patient consultation slots, audit check-ins, and upload clinical record files.
              </p>
            </div>
          </Card>

          {/* Card 2: Junior Doctor Portal */}
          <Card 
            titleText="Junior Doctor Desk" 
            className="flex flex-col justify-between min-h-[300px]"
            footerActions={
              <Link href="/junior-doctor" className="w-full">
                <Button variant="primary" className="w-full">
                  Access Desk
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded uppercase">
                Active Node
              </span>
              <p className="text-sm text-gray-500 leading-relaxed">
                Review assigned clinical queues, intake patient histories via form or dictation summary, and prepare preliminary charts.
              </p>
            </div>
          </Card>

          {/* Card 3: Senior Doctor Console */}
          <Card 
            titleText="Senior Doctor Console" 
            className="flex flex-col justify-between min-h-[300px]"
            footerActions={
              <Link href="/senior-doctor" className="w-full">
                <Button variant="primary" className="w-full">
                  Access Console
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded uppercase">
                Active Node
              </span>
              <p className="text-sm text-gray-500 leading-relaxed">
                Inspect AI pre-consultation patient briefs, review diagnostic summaries, draft clinical SOAP notes, and build prescriptions.
              </p>
            </div>
          </Card>

          {/* Card 4: Administrator Portal */}
          <Card 
            titleText="Administrator Audit" 
            className="flex flex-col justify-between min-h-[300px]"
            footerActions={
              <Link href="/admin" className="w-full">
                <Button variant="primary" className="w-full">
                  Access Audits
                </Button>
              </Link>
            }
          >
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 text-xs font-bold bg-gray-100 text-gray-500 rounded uppercase">
                Active Node
              </span>
              <p className="text-sm text-gray-500 leading-relaxed">
                Monitor system metrics, review clinical user session logs, audit error reports, and schedules maintenance parameters.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Structural Page Footer */}
      <footer className="max-w-7xl mx-auto w-full border-t border-gray-300 pt-8 mt-16 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400 font-semibold uppercase tracking-wider">
        <p>© {new Date().getFullYear()} MEDIMIND AI PLATFORM. SYSTEMS AND AUDITS ENFORCED.</p>
        <div className="flex gap-6">
          <a href="#" className="hover:text-gray-500 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-gray-500 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-gray-500 transition-colors">DPDP Compliance</a>
        </div>
      </footer>
    </main>
  );
}
