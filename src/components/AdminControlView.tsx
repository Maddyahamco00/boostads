import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Radio, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  FileCode, 
  Sliders, 
  Clock, 
  Lock, 
  Play, 
  AlertTriangle,
  FileCheck,
  Send,
  Eye
} from 'lucide-react';
import { PlatformConfig, ProviderType, ReconciliationRecord, WebhookEvent, AuditLog } from '../types';

export const AdminControlView: React.FC = () => {
  const [adminTab, setAdminTab] = useState<'providers' | 'fx_fees' | 'webhooks' | 'reconciliation' | 'audit'>('providers');

  // Platform Config State
  const [config, setConfig] = useState<PlatformConfig | null>(null);
  const [providerHealth, setProviderHealth] = useState<Array<{ isHealthy: boolean; latencyMs: number; provider: ProviderType }>>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Reconciliation State
  const [reconciliationReport, setReconciliationReport] = useState<{
    timestamp: string;
    totalChecked: number;
    matchedCount: number;
    discrepancyCount: number;
    records: ReconciliationRecord[];
  } | null>(null);
  const [runningRec, setRunningRec] = useState(false);

  // Webhook inspector state
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookEvent | null>(null);
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [simWebhookMsg, setSimWebhookMsg] = useState('');

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const fetchAdminData = async () => {
    try {
      // 1. Config & health
      const cfgRes = await fetch('/api/admin/config');
      const cfgData = await cfgRes.json();
      if (cfgData.success) {
        setConfig(cfgData.config);
        setProviderHealth(cfgData.providerHealth || []);
      }

      // 2. Webhooks
      const whRes = await fetch('/api/admin/webhooks');
      const whData = await whRes.json();
      if (whData.success) {
        setWebhookEvents(whData.events);
      }

      // 3. Reconciliation
      const recRes = await fetch('/api/admin/reconciliation');
      const recData = await recRes.json();
      if (recData.success) {
        setReconciliationReport({
          timestamp: new Date().toISOString(),
          totalChecked: recData.records.length,
          matchedCount: recData.records.filter((r: ReconciliationRecord) => r.status === 'matched').length,
          discrepancyCount: recData.records.filter((r: ReconciliationRecord) => r.status === 'flagged').length,
          records: recData.records
        });
      }

      // 4. Audit logs
      const audRes = await fetch('/api/admin/audit-logs');
      const audData = await audRes.json();
      if (audData.success) {
        setAuditLogs(audData.logs);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setSaveMessage('');

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage('Platform parameters updated and active.');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSaveMessage(`Save error: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const runReconciliationScan = async () => {
    setRunningRec(true);
    try {
      const res = await fetch('/api/admin/reconciliation/run', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        setReconciliationReport(data.report);
      }
    } catch (err) {
      console.error('Reconciliation error:', err);
    } finally {
      setRunningRec(false);
    }
  };

  const simulateIncomingWebhook = async () => {
    setSimulatingWebhook(true);
    setSimWebhookMsg('');
    try {
      const samplePayload = {
        event: 'charge.completed',
        id: `evt_sim_${Date.now()}`,
        data: {
          tx_ref: 'NS-TXN-2026-0829-9182',
          status: 'successful',
          amount: 98.68,
          currency: 'USD',
          customer: { email: 'sarah.jenkins@nyconsulting.com' }
        }
      };

      const res = await fetch('/api/webhooks/flutterwave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'verif-hash': config?.webhookSecret || 'flw_secret_hash_demo_992182748'
        },
        body: JSON.stringify(samplePayload)
      });

      const data = await res.json();
      setSimWebhookMsg(`Webhook Response: HTTP ${res.status} - ${data.message}`);
      fetchAdminData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setSimWebhookMsg(`Simulation error: ${message}`);
    } finally {
      setSimulatingWebhook(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Executive Admin & Provider Orchestrator</h2>
            <p className="text-xs text-slate-400">Gateway routing, FX spreads, webhooks, 4-way reconciliation & AML compliance</p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-2 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh All Systems</span>
        </button>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Admin Nav Sub-tabs */}
      <div className="flex items-center border-b border-slate-800 gap-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setAdminTab('providers')}
          className={`pb-3 transition flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'providers' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Provider Orchestration & Health</span>
        </button>

        <button
          onClick={() => setAdminTab('fx_fees')}
          className={`pb-3 transition flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'fx_fees' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>FX Spread & Fee Margins</span>
        </button>

        <button
          onClick={() => setAdminTab('webhooks')}
          className={`pb-3 transition flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'webhooks' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Webhook Inspector ({webhookEvents.length})</span>
        </button>

        <button
          onClick={() => setAdminTab('reconciliation')}
          className={`pb-3 transition flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'reconciliation' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>4-Way Reconciliation Engine</span>
        </button>

        <button
          onClick={() => setAdminTab('audit')}
          className={`pb-3 transition flex items-center gap-2 whitespace-nowrap ${
            adminTab === 'audit' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* 1. PROVIDERS TAB */}
      {adminTab === 'providers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Provider Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Primary Gateway (Flutterwave)</h3>
                    <p className="text-xs text-slate-400">Global cards, multi-currency processing & 3DS</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>API Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Operational (24ms latency)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Webhook Verification:</span>
                  <span className="text-slate-300 font-mono">HMAC-SHA256 (verif-hash)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Currencies Supported:</span>
                  <span className="text-slate-300">USD, EUR, GBP, AED, CAD, ZAR, NGN</span>
                </div>
              </div>
            </div>

            {/* Secondary / Failover Provider Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Secondary Gateway (Paystack)</h3>
                    <p className="text-xs text-slate-400">Automatic failover adapter</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                  STANDBY
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>API Status:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Operational (31ms latency)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Webhook Verification:</span>
                  <span className="text-slate-300 font-mono">HMAC-SHA512 (x-paystack-signature)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Failover Status:</span>
                  <span className="text-emerald-400">Hot Standby Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. FX SPREAD & FEE MARGINS TAB */}
      {adminTab === 'fx_fees' && config && (
        <form onSubmit={handleSaveConfig} className="max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Platform Margins & Fee Parameters</h3>
              <p className="text-xs text-slate-400">Configure transparent pricing and FX rate locks</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Platform Processing Fee (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={config.platformFeePercent}
                onChange={(e) => setConfig({ ...config, platformFeePercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Charged transparently on checkout</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                FX Spread Buffer (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={config.fxSpreadPercent}
                onChange={(e) => setConfig({ ...config, fxSpreadPercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Hedging spread against foreign volatility</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quote Rate Lock Duration (Seconds)
              </label>
              <input
                type="number"
                step="60"
                min="60"
                max="3600"
                value={config.quoteExpirationSeconds}
                onChange={(e) => setConfig({ ...config, quoteExpirationSeconds: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Default: 600s (10 Minutes)</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Automated Settlement Routing
              </label>
              <select
                value={config.settlementSchedule}
                onChange={(e) => setConfig({ ...config, settlementSchedule: e.target.value as 'instant' | 'daily_t1' | 'manual' })}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
              >
                <option value="instant">Instant Real-Time (NIP Protocol)</option>
                <option value="daily_t1">Daily T+1 End of Day Batch</option>
                <option value="manual">Manual Merchant Trigger</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. WEBHOOK INSPECTOR TAB */}
      {adminTab === 'webhooks' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Webhook Listener Endpoints</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Active endpoints: <code className="text-indigo-400">/api/webhooks/flutterwave</code> & <code className="text-purple-400">/api/webhooks/paystack</code>
              </p>
            </div>

            <button
              onClick={simulateIncomingWebhook}
              disabled={simulatingWebhook}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulate Provider Webhook Dispatch</span>
            </button>
          </div>

          {simWebhookMsg && (
            <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 text-xs">
              {simWebhookMsg}
            </div>
          )}

          {/* Webhook Events Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Timestamp & ID</th>
                    <th className="py-3 px-4 font-semibold">Provider</th>
                    <th className="py-3 px-4 font-semibold">Event Type</th>
                    <th className="py-3 px-4 font-semibold">Signature Status</th>
                    <th className="py-3 px-4 font-semibold">Idempotency Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Inspect Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {webhookEvents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500">
                        No webhook events recorded yet.
                      </td>
                    </tr>
                  ) : (
                    webhookEvents.map((wh) => (
                      <tr key={wh.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono">
                          <div className="text-slate-200">{wh.id}</div>
                          <div className="text-[10px] text-slate-500">{new Date(wh.createdAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="py-3 px-4 uppercase font-bold text-indigo-400">
                          {wh.provider}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {wh.eventType}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            wh.signatureValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {wh.signatureValid ? 'HMAC Verified' : 'Invalid Signature'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                            {wh.idempotencyKey}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedWebhook(wh)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                          >
                            View JSON
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. RECONCILIATION ENGINE TAB */}
      {adminTab === 'reconciliation' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">4-Way Automated Financial Reconciliation</h3>
              <p className="text-xs text-slate-400 mt-1">
                Compares Internal Payments ↔ Gateway Provider Records ↔ Ledger Balances ↔ NIP Bank Settlements
              </p>
            </div>

            <button
              onClick={runReconciliationScan}
              disabled={runningRec}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              {runningRec ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>Execute 4-Way Reconciliation</span>
            </button>
          </div>

          {/* Report Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Checked Records</span>
              <div className="text-2xl font-bold text-white mt-1">{reconciliationReport?.totalChecked || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
              <span className="text-xs text-emerald-400">Matched Clean</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1">{reconciliationReport?.matchedCount || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40">
              <span className="text-xs text-amber-400">Flagged Anomalies</span>
              <div className="text-2xl font-bold text-amber-300 mt-1">{reconciliationReport?.discrepancyCount || 0}</div>
            </div>
          </div>

          {/* Reconciliation Table */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Payment Ref</th>
                    <th className="py-3 px-4 font-semibold">Internal Amount (NGN)</th>
                    <th className="py-3 px-4 font-semibold">Provider Charged</th>
                    <th className="py-3 px-4 font-semibold">Settlement Net</th>
                    <th className="py-3 px-4 font-semibold">Discrepancy Status</th>
                    <th className="py-3 px-4 font-semibold">Audit Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reconciliationReport?.records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-200">{rec.internalReference}</td>
                      <td className="py-3 px-4 font-mono font-bold text-white">₦{rec.internalAmountNGN.toLocaleString('en-NG')}</td>
                      <td className="py-3 px-4 font-mono text-slate-300">{rec.providerCurrency} {rec.providerAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 font-mono text-emerald-400 font-bold">₦{rec.settlementAmountNGN.toLocaleString('en-NG')}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          rec.status === 'matched' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {rec.status} ({rec.discrepancyType})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">{rec.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. AUDIT TRAIL TAB */}
      {adminTab === 'audit' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">Actor</th>
                  <th className="py-3 px-4 font-semibold">Payload Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-3 px-4 font-bold text-white">{log.action}</td>
                    <td className="py-3 px-4 uppercase text-indigo-400">{log.category}</td>
                    <td className="py-3 px-4 text-slate-300">{log.actorType} ({log.actorId})</td>
                    <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{JSON.stringify(log.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Webhook JSON Viewer Modal */}
      {selectedWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white font-mono">{selectedWebhook.id}</h3>
              <button onClick={() => setSelectedWebhook(null)} className="text-slate-400 hover:text-white text-xs">Close</button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-emerald-400 text-xs font-mono overflow-auto max-h-80 border border-slate-800">
              {JSON.stringify(selectedWebhook.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
