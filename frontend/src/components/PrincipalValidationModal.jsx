import React, { useEffect, useState } from 'react';
import { documentAPI, reportAPI } from '../services/api';
import { ShieldCheck, CheckCircle2, AlertCircle, XCircle, FileText, Download, Eye, Loader2, CornerUpLeft } from 'lucide-react';

const PrincipalValidationModal = ({ docId, docObj, onClose, onSuccess }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionModalType, setActionModalType] = useState(null); // 'revision' or 'reject'
  const [actionReason, setActionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showSummaryView, setShowSummaryView] = useState(false);
  const [previewTextOpen, setPreviewTextOpen] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const id = docId || (docObj ? docObj.id : null);
        if (id) {
          const res = await documentAPI.getValidationSummary(id);
          setSummaryData(res.data);
        }
      } catch (err) {
        console.error("Failed to load validation summary:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [docId, docObj]);

  if (!docId && !docObj) return null;

  const doc = summaryData?.document || docObj || {};
  const metrics = summaryData?.quality_metrics || {};
  const evidenceList = summaryData?.evidence_items || [];
  const aiAnalysis = summaryData?.ai_analysis || {};
  const hodVal = summaryData?.hod_validation || {};

  const handleFinalApprovalConfirm = async () => {
    setProcessing(true);
    try {
      await documentAPI.validatePrincipal(doc.id);
      alert("🎉 Evidence successfully approved at the institutional level!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Final approval failed.");
    } finally {
      setProcessing(false);
      setConfirmModalOpen(false);
    }
  };

  const handleActionSubmit = async () => {
    if (!actionReason.trim()) return;
    setProcessing(true);
    try {
      if (actionModalType === 'revision') {
        await documentAPI.requestRevisionPrincipal(doc.id, actionReason);
        alert("⚠️ Revision request submitted to faculty and HOD.");
      } else {
        await documentAPI.rejectPrincipal(doc.id, actionReason);
        alert("🔴 Document rejected by Principal.");
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Action failed.");
    } finally {
      setProcessing(false);
      setActionModalType(null);
      setActionReason('');
    }
  };

  const handleDownloadDocPdf = async () => {
    try {
      const response = await reportAPI.downloadPdf("CampusInsight AI", doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CampusInsight_Report_Doc_${doc.id}_${(doc.original_name || doc.filename).replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Failed to download PDF report.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs">
                Sub-{doc.sub_criterion || '1.1'} Scope
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                HOD Status: Validated
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              Principal Validation & Institutional Review
            </h2>
            <p className="text-xs text-slate-500">
              Review evidence details, AI analysis findings, and HOD validation before final institutional approval.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSummaryView(!showSummaryView)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300"
            >
              {showSummaryView ? "Back to Detail Review" : "View Review Summary"}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-lg font-bold">✕</button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
            <p className="text-xs font-bold">Loading Evidence Validation Summary...</p>
          </div>
        ) : showSummaryView ? (
          /* CONCISE EVIDENCE VALIDATION SUMMARY VIEW */
          <div className="space-y-5 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Criterion 1 Evidence Review Summary</h3>
                <p className="text-[11px] text-slate-500">Internal institutional validation summary for Document #{doc.id}</p>
              </div>
              <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-lg font-bold">
                {doc.validation_status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <p><b>Document:</b> {doc.original_name || doc.filename}</p>
                <p><b>Sub-Criterion:</b> Sub-{doc.sub_criterion}</p>
                <p><b>Uploaded By:</b> {doc.owner_name} ({doc.owner_department})</p>
                <p><b>Upload Date:</b> {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}</p>
              </div>

              <div className="space-y-1">
                <p><b>AI Finding:</b> <span className="font-bold text-emerald-700">{aiAnalysis.finding || 'Satisfactory'}</span></p>
                <p><b>HOD Validation:</b> <span className="font-bold text-emerald-700">✓ Validated</span> ({hodVal.validated_by})</p>
                <p><b>Validation Date:</b> {hodVal.validation_date ? new Date(hodVal.validation_date).toLocaleDateString() : 'N/A'}</p>
                <p><b>Institutional Status:</b> <span className="font-bold text-purple-700">{doc.validation_status}</span></p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wider">HOD Validation Note:</p>
              <p className="text-slate-600 italic bg-white p-3 rounded-xl border border-slate-200">"{hodVal.comments}"</p>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
              <p className="font-bold text-slate-800 uppercase tracking-wider">Identified Gaps & Actions:</p>
              {aiAnalysis.gaps && aiAnalysis.gaps.length > 0 ? (
                aiAnalysis.gaps.map(g => (
                  <div key={g.id} className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                    <p className="font-bold text-slate-900">• {g.title} ({g.severity} Severity)</p>
                    <p className="text-slate-600">{g.description}</p>
                    <p className="text-blue-700 font-semibold">Action: {g.recommended_action}</p>
                  </div>
                ))
              ) : (
                <p className="text-emerald-700 font-semibold">✓ No active gaps detected. Evidence meets Criterion 1 compliance.</p>
              )}
            </div>
          </div>
        ) : (
          /* DETAILED 5-SECTION REVIEW WORKFLOW */
          <div className="space-y-6">
            
            {/* SUMMARY HEADER CARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Criterion</span>
                <p className="font-bold text-slate-900">Criterion 1 (Curricular Aspects)</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Document</span>
                <p className="font-bold text-slate-900 truncate">{doc.original_name || doc.filename}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Submitted By</span>
                <p className="font-bold text-slate-900">{doc.owner_name} ({doc.owner_department})</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">HOD Validation Status</span>
                <p className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Validated by {hodVal.validated_by?.split(' ')[0] || 'HOD'}
                </p>
              </div>
            </div>

            {/* SECTION 1 — EVIDENCE DOCUMENT */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  SECTION 1 — EVIDENCE DOCUMENT DETAILS
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPreviewTextOpen(!previewTextOpen)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] flex items-center gap-1 border border-blue-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {previewTextOpen ? "Hide Document Text" : "View Document Text"}
                  </button>
                  <button
                    onClick={handleDownloadDocPdf}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] flex items-center gap-1 border border-emerald-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PDF Report
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-slate-400">Document ID:</span> <span className="font-bold text-slate-800">#{doc.id}</span></div>
                <div><span className="text-slate-400">File Type:</span> <span className="font-bold text-slate-800">{doc.file_type}</span></div>
                <div><span className="text-slate-400">File Size:</span> <span className="font-bold text-slate-800">{(doc.file_size / 1024).toFixed(1)} KB</span></div>
                <div><span className="text-slate-400">Upload Date:</span> <span className="font-bold text-slate-800">{doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}</span></div>
              </div>

              {previewTextOpen && (
                <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {doc.extracted_preview || "No text preview extracted."}
                </div>
              )}
            </div>

            {/* SECTION 2 — EVIDENCE SUMMARY */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                SECTION 2 — EVIDENCE SUMMARY & QUALITY METRICS
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Completeness</span>
                  <span className="text-base font-extrabold text-blue-700">{metrics.completeness_score || 85.0}%</span>
                </div>
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Relevance Confidence</span>
                  <span className="text-base font-extrabold text-emerald-700">{metrics.relevance_score || 92.0}%</span>
                </div>
                <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">OCR Quality</span>
                  <span className="text-base font-extrabold text-purple-700">{metrics.ocr_quality_score || 90.0}%</span>
                </div>
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Human Validation</span>
                  <span className="text-xs font-bold text-amber-800 block mt-1">Stage 1 Validated</span>
                </div>
              </div>

              {/* Page Level Evidence Snippets */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Extracted Page-Level Evidence Snippets:</p>
                {evidenceList.length > 0 ? (
                  evidenceList.slice(0, 3).map(ev => (
                    <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-blue-700">Metric {ev.metric_id} (Page {ev.page_number || 1})</span>
                        <span className="font-bold text-emerald-700">Confidence: {ev.confidence}%</span>
                      </div>
                      <p className="text-slate-800 italic">"{ev.evidence_text}"</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No specific page snippets recorded.</p>
                )}
              </div>
            </div>

            {/* SECTION 3 — AI ANALYSIS */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                SECTION 3 — AI ANALYSIS FINDINGS & GAPS
              </h4>

              <div className="flex items-center justify-between text-xs bg-purple-50/60 p-3 rounded-xl border border-purple-100">
                <span className="font-bold text-purple-900">Overall AI Finding:</span>
                <span className="font-extrabold text-purple-700 uppercase tracking-wide">{aiAnalysis.finding || 'Satisfactory'}</span>
              </div>

              {aiAnalysis.gaps && aiAnalysis.gaps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 uppercase">Detected Compliance Gaps:</p>
                  {aiAnalysis.gaps.map(gap => (
                    <div key={gap.id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                      <p className="font-bold text-rose-900">{gap.title} ({gap.severity} Severity)</p>
                      <p className="text-slate-700">{gap.description}</p>
                      <p className="text-blue-800 font-bold text-[11px]">Recommended Action: {gap.recommended_action}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SECTION 4 — HOD VALIDATION */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3 shadow-xs">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                SECTION 4 — HOD STAGE 1 VALIDATION
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                <div><span className="text-slate-500">HOD Assessor:</span> <span className="font-bold text-slate-900">{hodVal.validated_by}</span></div>
                <div><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-700">✓ Validated</span></div>
              </div>

              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700">HOD Validation Note:</span>
                <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 italic">
                  "{hodVal.comments}"
                </p>
              </div>
            </div>

            {/* SECTION 5 — PRINCIPAL DECISION */}
            <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl">
              <h4 className="font-bold text-xs uppercase tracking-wider text-purple-300">
                SECTION 5 — PRINCIPAL EXECUTIVE DECISION
              </h4>
              <p className="text-xs text-slate-300">
                Select your executive decision after completing evidence inspection:
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => setConfirmModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ Final Institutional Approval</span>
                </button>

                <button
                  onClick={() => { setActionModalType('revision'); setActionReason(''); }}
                  className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CornerUpLeft className="w-4 h-4" />
                  <span>↩ Request Revision</span>
                </button>

                <button
                  onClick={() => { setActionModalType('reject'); setActionReason(''); }}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>✕ Reject Evidence</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL — FINAL INSTITUTIONAL APPROVAL */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  Approve Evidence at Institutional Level?
                </h3>
                <button onClick={() => setConfirmModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="space-y-2 text-xs text-slate-700 bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <p><b>Document:</b> {doc.original_name || doc.filename}</p>
                <p><b>Criterion Scope:</b> Criterion 1 (Curricular Aspects)</p>
                <p><b>Sub-Criterion:</b> Sub-{doc.sub_criterion}</p>
                <p><b>HOD Validation:</b> <span className="text-emerald-700 font-bold">Completed ({hodVal.validated_by})</span></p>
                <p><b>Current Status:</b> <span className="text-amber-700 font-semibold">{doc.validation_status}</span></p>
                <p><b>New Status:</b> <span className="text-purple-800 font-extrabold">Fully Validated</span></p>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFinalApprovalConfirm}
                  disabled={processing}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs disabled:opacity-50"
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Final Approval"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* REVISION / REJECTION MODAL */}
        {actionModalType && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {actionModalType === 'revision' ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      Request Revision for Evidence
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-rose-600" />
                      Reject Evidence Document
                    </>
                  )}
                </h3>
                <button onClick={() => setActionModalType(null)} className="text-slate-400 hover:text-slate-700">✕</button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  {actionModalType === 'revision'
                    ? `Request revision for ${doc.original_name || doc.filename}. This will alert the HOD and faculty.`
                    : `Reject evidence document ${doc.original_name || doc.filename}. Mandatory feedback reason required.`}
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {actionModalType === 'revision' ? 'Required Revision Details' : 'Rejection Reason'} *
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder={
                      actionModalType === 'revision'
                        ? "e.g. Please provide the missing Action Taken Report for stakeholder feedback..."
                        : "e.g. Evidence does not meet institutional NAAC compliance standards..."
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setActionModalType(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleActionSubmit}
                    disabled={!actionReason.trim() || processing}
                    className={`px-4 py-2 rounded-xl font-bold text-xs text-white disabled:opacity-50 ${
                      actionModalType === 'revision' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Decision"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrincipalValidationModal;
