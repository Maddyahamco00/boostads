import React, { useState } from 'react';
import { 
  TestTube2, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  Code,
  Terminal,
  Zap
} from 'lucide-react';
import { TestScenarioResult, TestSuiteResult } from '../types';

export const TestRunnerView: React.FC = () => {
  const [suiteResult, setSuiteResult] = useState<TestSuiteResult | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [runningSingle, setRunningSingle] = useState<string | null>(null);

  const runAllTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/tests/run-all', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.suiteResult) {
        setSuiteResult(data.suiteResult);
      }
    } catch (err) {
      console.error('Error running test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  const runSingleTest = async (scenarioId: string) => {
    setRunningSingle(scenarioId);
    try {
      const res = await fetch('/api/tests/run-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId })
      });
      const data = await res.json();
      if (data.success && data.scenarioResult && suiteResult) {
        const updatedScenarios = suiteResult.scenarios.map((s) =>
          s.id === scenarioId ? data.scenarioResult : s
        );
        const passedCount = updatedScenarios.filter((s) => s.status === 'passed').length;
        const failedCount = updatedScenarios.filter((s) => s.status === 'failed').length;
        setSuiteResult({
          ...suiteResult,
          scenarios: updatedScenarios,
          passedCount,
          failedCount
        });
      }
    } catch (err) {
      console.error('Error running single test:', err);
    } finally {
      setRunningSingle(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <TestTube2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">17-Scenario Automated Test Suite</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                End-to-End Validation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Validates FX locking, provider adapters, tamper resistance, 3DS authentication, HMAC webhooks, double-entry ledgers, and NGN settlements.
            </p>
          </div>
        </div>

        <button
          onClick={runAllTests}
          disabled={running}
          className="w-full md:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-xl shadow-amber-600/30 transition flex items-center justify-center gap-2"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing 17 Scenarios...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run All 17 Test Scenarios</span>
            </>
          )}
        </button>
      </div>

      {/* Test Stats Header */}
      {suiteResult && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 animate-fade-in">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Scenarios</span>
            <div className="text-2xl font-extrabold text-white mt-1">{suiteResult.totalScenarios}</div>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
            <span className="text-xs text-emerald-400 uppercase font-semibold">Passed Tests</span>
            <div className="text-2xl font-extrabold text-emerald-300 mt-1">{suiteResult.passedCount}</div>
          </div>

          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-800/40">
            <span className="text-xs text-rose-400 uppercase font-semibold">Failed Tests</span>
            <div className="text-2xl font-extrabold text-rose-300 mt-1">{suiteResult.failedCount}</div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-800/40">
            <span className="text-xs text-indigo-400 uppercase font-semibold">Total Duration</span>
            <div className="text-2xl font-extrabold text-indigo-300 mt-1">{suiteResult.durationMs} ms</div>
          </div>
        </div>
      )}

      {/* Scenarios List */}
      <div className="space-y-3">
        {(!suiteResult || suiteResult.scenarios.length === 0) ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
            <TestTube2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Automated Test Runner Ready</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click "Run All 17 Test Scenarios" to trigger automated end-to-end simulation across all architectural modules and verify system compliance.
            </p>
            <button
              onClick={runAllTests}
              className="mt-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Launch Automated Suite</span>
            </button>
          </div>
        ) : (
          suiteResult.scenarios.map((scenario) => {
            const isExpanded = selectedScenario === scenario.id;
            const isRunningThis = runningSingle === scenario.id;

            return (
              <div
                key={scenario.id}
                className={`bg-slate-900/90 border rounded-2xl transition overflow-hidden ${
                  scenario.status === 'passed'
                    ? 'border-slate-800 hover:border-emerald-500/40'
                    : 'border-rose-900/60 bg-rose-950/10'
                }`}
              >
                {/* Collapsible Header */}
                <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <button
                      onClick={() => setSelectedScenario(isExpanded ? null : scenario.id)}
                      className="text-slate-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                      {scenario.status === 'passed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{scenario.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400">
                          {scenario.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{scenario.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="text-[11px] font-mono text-slate-500">
                      {scenario.durationMs}ms
                    </span>

                    <button
                      onClick={() => runSingleTest(scenario.id)}
                      disabled={isRunningThis || running}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition"
                    >
                      {isRunningThis ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3" />
                      )}
                      <span>Re-run</span>
                    </button>
                  </div>
                </div>

                {/* Expanded Details / Audit Trail */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/80 p-4 space-y-3 text-xs animate-fade-in">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <Terminal className="w-3.5 h-3.5 text-amber-400" />
                        Execution Step Log:
                      </span>
                      <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 space-y-1 font-mono text-[11px]">
                        {scenario.logs.map((log, idx) => (
                          <div key={idx} className="text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-500">✓</span>
                            <span>{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {scenario.error && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                        <strong>Failure Details:</strong> {scenario.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
