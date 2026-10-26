import React from 'react';
import { Mail } from 'lucide-react';
import { AuditReport } from '../types';

interface ExecutiveSendPromptProps {
  report: AuditReport;
  executiveRecipients: string[];
  onYes: () => void;
  onNo: () => void;
}

// Shown after the Head Manager approves the last pending NCAR/OFI of an Audit Report.
const ExecutiveSendPrompt: React.FC<ExecutiveSendPromptProps> = ({ report, executiveRecipients, onYes, onNo }) => (
  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="auto-send-title">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#172554]"><Mail size={20} /></div>
      <h2 id="auto-send-title" className="text-lg font-bold text-gray-900">All findings approved</h2>
      <p className="mt-2 text-sm text-gray-600">That was the last NCAR/OFI in <span className="font-semibold">{report.reportTitle || report.referenceNumber || report.id}</span>. Give Final Approve and automatically send the full Audit Report to Executive now?</p>
      <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{executiveRecipients.length ? <>Recipients: <span className="font-semibold">{executiveRecipients.join(', ')}</span></> : 'No Executive recipients are set in Maintenance Table, so the report will be approved but not emailed.'}</p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onNo} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">No, later</button>
        <button type="button" onClick={onYes} className="rounded-xl bg-[#172554] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1E3268]">Yes, approve &amp; send</button>
      </div>
    </div>
  </div>
);

export default ExecutiveSendPrompt;
