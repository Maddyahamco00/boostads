import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Play, 
  RefreshCw, 
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden text-gray-900 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Security Test Suite</h2>
            <p className="text-xs text-gray-500">
              Run automated authentication and invariant assertions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runSuite}
              disabled={running}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {running ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Tests</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Overview Banner */}
        {report && (
          <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {report.failedCount === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-semibold text-gray-900">
                {report.failedCount === 0 ? 'All tests passed' : `${report.failedCount} tests failed`}
              </span>
              <span className="text-gray-500">
                ({report.passedCount}/{report.totalCount} in {report.durationMs}ms)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-medium border border-green-200">
                ✓ {report.passedCount} Passed
              </span>
              {report.failedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium border border-red-200">
                  ✗ {report.failedCount} Failed
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!report && !running && (
            <div className="p-10 text-center text-gray-500 space-y-2">
              <ShieldCheck className="w-10 h-10 mx-auto text-blue-600" />
              <div className="font-semibold text-sm text-gray-900">Security Suite Ready</div>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Click "Run Tests" to execute automated tests against registration, login, rate limits, and tokens.
              </p>
            </div>
          )}

          {running && (
            <div className="p-10 text-center text-gray-500 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
              <div className="font-semibold text-sm text-gray-900">Running Tests...</div>
            </div>
          )}

          {report && (
            <div className="space-y-1.5">
              {report.results.map((t) => {
                const passed = t.status === 'passed';
                return (
                  <div
                    key={t.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                      passed 
                        ? 'bg-gray-50 border-gray-100 text-gray-900' 
                        : 'bg-red-50 border-red-200 text-red-900'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between font-medium">
                        <span>{t.name}</span>
                        <span className="text-gray-400 font-mono text-[10px]">
                          {t.durationMs}ms
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 font-mono">
                        {t.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
