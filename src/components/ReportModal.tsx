import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, X, Check } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-xl max-w-sm w-full p-5 shadow-xl text-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-gray-900">Report Content</h3>
          </div>
          <button onClick={closeReportModal} className="text-gray-400 hover:text-gray-700 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-6 text-center">
            <Check className="w-8 h-8 text-green-600 mx-auto mb-1.5" />
            <h4 className="text-xs font-bold text-gray-900">Report Submitted</h4>
            <p className="text-[11px] text-gray-500 mt-0.5">Thank you for reporting.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-3 text-xs">
            <p className="text-gray-600">
              Reporting <strong className="text-gray-900">{reportingTarget.title}</strong>
            </p>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:border-blue-600"
              >
                <option>Misleading or False Information</option>
                <option>Fraudulent Activity or Scam Attempt</option>
                <option>Inappropriate or Offensive Content</option>
                <option>Counterfeit Goods or Copyright Issue</option>
                <option>Other Suspicious Behavior</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-1">Details</label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide explanation..."
                className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeReportModal}
                className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium cursor-pointer disabled:opacity-50"
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
