import React, { useState } from 'react';
import { 
  X, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
  Terminal, 
  Lock, 
  Crown, 
  UserX, 
  Key, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';

interface AuthTestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'running';
  durationMs: number;
  details: string;
}

interface SuiteReport {
  timestamp: string;
  durationMs: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  results: TestResult[];
}

export const AuthTestSuiteModal: React.FC<AuthTestSuiteModalProps> = ({
  isOpen,
  onClose
}) => {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<SuiteReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSuite = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/tests/auth-suite', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || 'Test suite execution failed');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Execution error');
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white flex items-center gap-2">
                Automated Security & Invariant Verification Suite
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  10 Test Specs
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Verifies invariant constraints, role escalation guards, rate limiting, and session security
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runSuite}
              disabled={running}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing Invariants...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Suite</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Overview Banner */}
        {report && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {report.failedCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">
                    {report.failedCount === 0 ? 'ALL SECURITY INVARIANTS PASSED' : `${report.failedCount} TESTS FAILED`}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {report.passedCount} of {report.totalCount} passed in {report.durationMs}ms
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                ✓ {report.passedCount} Passed
              </span>
              {report.failedCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-300 font-bold border border-rose-500/20">
                  ✗ {report.failedCount} Failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!report && !running && (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <ShieldCheck className="w-12 h-12 mx-auto text-emerald-400/50" />
              <div className="font-bold text-sm text-white">Security Verification Engine Ready</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Click "Execute Suite" to run automated end-to-end assertions against the authentication service, invariant enforcement, brute force rate limiters, and token lifecycle.
              </p>
              <button
                onClick={runSuite}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Start Verification Run
              </button>
            </div>
          )}

          {running && (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-10 h-10 mx-auto text-emerald-400 animate-spin" />
              <div className="font-bold text-sm text-white">Simulating Attack Vectors & Invariant Asserts...</div>
              <p className="text-xs text-slate-500">
                Testing payload tamper resistance, role escalation barriers, and TOTP recovery limits
              </p>
            </div>
          )}

          {report && (
            <div className="space-y-2">
              {report.results.map((t) => {
                const passed = t.status === 'passed';
                return (
                  <div
                    key={t.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      passed 
                        ? 'bg-slate-950/60 border-slate-800/80 text-slate-200' 
                        : 'bg-rose-950/20 border-rose-800 text-rose-200'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white flex items-center gap-1.5">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {t.durationMs}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                        {t.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Notes */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-[10px] text-slate-500">
          Enforces RFC 7519 (JWT), RFC 6238 (TOTP), NIST SP 800-63B (Authentication Guidelines)
        </div>
      </div>
    </div>
  );
};
