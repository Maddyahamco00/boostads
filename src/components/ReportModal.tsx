import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, X, ShieldAlert, Check } from 'lucide-react';

export const ReportModal: React.FC = () => {
  const { isReportModalOpen, reportingTarget, closeReportModal, currentUser, refreshData } = useApp();
  const [reason, setReason] = useState('Misleading or False Information');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isReportModalOpen || !reportingTarget) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('/api/reports/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          targetType: reportingTarget.type,
          targetId: reportingTarget.id,
          targetTitle: reportingTarget.title,
          reason: `${reason} - ${details}`,
          details
        })
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        closeReportModal();
        refreshData();
      }, 1500);
    } catch (err) {
      console.error('Failed to submit report:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white">Report Content or Business</h3>
          </div>
          <button onClick={closeReportModal} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center">
            <Check className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-white">Report Submitted to CEO / Moderation Team</h4>
            <p className="text-xs text-slate-400 mt-1">Thank you for keeping Boost Market safe.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
            <p className="text-slate-400">
              You are reporting <strong className="text-white">{reportingTarget.title}</strong> ({reportingTarget.type}).
            </p>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Reason for Report</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:outline-none focus:border-rose-500"
              >
                <option>Misleading or False Information</option>
                <option>Fraudulent Activity or Scam Attempt</option>
                <option>Inappropriate or Offensive Content</option>
                <option>Counterfeit Goods or Copyright Issue</option>
                <option>Other Suspicious Behavior</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Additional Details</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide any specific evidence or explanation..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeReportModal}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold shadow"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
