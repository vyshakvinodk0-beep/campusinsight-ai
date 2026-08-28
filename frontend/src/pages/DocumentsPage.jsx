import React, { useEffect, useState } from 'react';
import { documentAPI, reportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DocumentUploader from '../components/DocumentUploader';
import PrincipalValidationModal from '../components/PrincipalValidationModal';
import { FileText, Trash2, Eye, Filter, Loader2, CheckCircle, ShieldCheck, XCircle, AlertCircle, Download } from 'lucide-react';

const DocumentsPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subCriterion, setSubCriterion] = useState('All');
  const [validationFilter, setValidationFilter] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [rejectingDoc, setRejectingDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [downloadingDocId, setDownloadingDocId] = useState(null);
  const [confirmHodModalDoc, setConfirmHodModalDoc] = useState(null);
  const [confirmPrincipalModalDoc, setConfirmPrincipalModalDoc] = useState(null);
  const [principalModalDoc, setPrincipalModalDoc] = useState(null);
  const [actionType, setActionType] = useState('reject');

  const handleDownloadDocPdf = async (doc) => {
    setDownloadingDocId(doc.id);
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
      console.error("Failed to download PDF report:", err);
      let errMsg = "Unable to generate PDF report for document #" + doc.id;
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.detail) errMsg = json.detail;
        } catch (e) {}
      } else if (err.response?.data?.detail) {
        errMsg = err.response.data.detail;
      }
      alert(errMsg);
      fetchDocuments();
    } finally {
      setDownloadingDocId(null);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentAPI.list(subCriterion, validationFilter);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to list documents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [subCriterion, validationFilter]);

  const handleValidateHod = async (id) => {
    setProcessingId(id);
    try {
      await documentAPI.validateHod(id);
      fetchDocuments();
    } catch (err) {
      console.error("HOD validation failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectHodSubmit = async () => {
    if (!rejectingDoc || !rejectionReason.trim()) return;
    setProcessingId(rejectingDoc.id);
    try {
      await documentAPI.rejectHod(rejectingDoc.id, rejectionReason);
      setRejectingDoc(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (err) {
      console.error("HOD rejection failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleValidatePrincipal = async (id) => {
    setProcessingId(id);
    try {
      await documentAPI.validatePrincipal(id);
      fetchDocuments();
    } catch (err) {
      console.error("Principal validation failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPrincipalSubmit = async () => {
    if (!rejectingDoc || !rejectionReason.trim()) return;
    setProcessingId(rejectingDoc.id);
    try {
      await documentAPI.rejectPrincipal(rejectingDoc.id, rejectionReason);
      setRejectingDoc(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (err) {
      console.error("Principal rejection failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document and remove its vector embeddings?")) return;
    try {
      await documentAPI.delete(id);
      fetchDocuments();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Institutional Document Vault ({user?.role} Portal)
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Strict multi-role academic validation pipeline: Faculty Submission → HOD Department Review → Principal Institutional Approval → Agentic AI Analysis.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={subCriterion}
              onChange={(e) => setSubCriterion(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none shadow-xs"
            >
              <option value="All">All Sub-Criteria</option>
              <option value="1.1">1.1 Curriculum Design</option>
              <option value="1.2">1.2 Academic Flexibility</option>
              <option value="1.3">1.3 Curriculum Enrichment</option>
              <option value="1.4">1.4 Feedback System</option>
            </select>
          </div>

          <select
            value={validationFilter}
            onChange={(e) => setValidationFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none shadow-xs"
          >
            <option value="All">All Validation States</option>
            <option value="Pending HOD Validation">Pending HOD Validation</option>
            <option value="Pending Principal Validation">Pending Principal Validation</option>
            <option value="Fully Validated">Fully Validated</option>
            <option value="Rejected by HOD">Rejected by HOD</option>
            <option value="Rejected by Principal">Rejected by Principal</option>
          </select>
        </div>
      </div>

      {/* Document Uploader - Accessible to Faculty, HOD, Principal, Admin */}
      <DocumentUploader onUploadSuccess={fetchDocuments} />

      <div className="glass-panel p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Vault Document Filters</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-500 font-medium">Sub-Criterion:</label>
              <select
                value={subCriterion}
                onChange={(e) => setSubCriterion(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Sub-Criteria</option>
                <option value="1.1">Sub-1.1: Curriculum Design</option>
                <option value="1.2">Sub-1.2: Academic Flexibility</option>
                <option value="1.3">Sub-1.3: Curriculum Enrichment</option>
                <option value="1.4">Sub-1.4: Feedback System</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-500 font-medium">Workflow Status:</label>
              <select
                value={validationFilter}
                onChange={(e) => setValidationFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Statuses</option>
                <option value="Pending HOD Validation">Pending HOD Validation</option>
                <option value="Pending Principal Validation">Pending Principal Validation</option>
                <option value="Fully Validated">Fully Validated</option>
                <option value="Revision Requested">Revision Requested</option>
                <option value="Rejected by HOD">Rejected by HOD</option>
                <option value="Rejected by Principal">Rejected by Principal</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading Vault Documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No evidence documents match your selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-3">Document Details</th>
                  <th className="py-3 px-3">Scope</th>
                  <th className="py-3 px-3">Quality Scores</th>
                  <th className="py-3 px-3">Stage 1: HOD Review</th>
                  <th className="py-3 px-3">Stage 2: Principal Approval</th>
                  <th className="py-3 px-3">Workflow Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mt-0.5">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">{doc.original_name || doc.filename}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            ID: #{doc.id} | Size: {(doc.file_size / 1024).toFixed(1)} KB | Uploaded: {new Date(doc.upload_date).toLocaleDateString()}
                          </p>
                          {doc.owner_name && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              Owner: <span className="font-semibold text-slate-700">{doc.owner_name}</span> ({doc.owner_department})
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        Sub-{doc.sub_criterion}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1 text-[10px]">
                        <div className="flex justify-between items-center w-32">
                          <span className="text-slate-500">Text Quality:</span>
                          <span className="font-bold text-blue-700">{doc.text_quality_score}%</span>
                        </div>
                        <div className="flex justify-between items-center w-32">
                          <span className="text-slate-500">OCR Quality:</span>
                          <span className="font-bold text-emerald-700">{doc.ocr_quality_score}%</span>
                        </div>
                        <div className="flex justify-between items-center w-32">
                          <span className="text-slate-500">Readability:</span>
                          <span className="font-bold text-purple-700">{doc.readability_score}%</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      {doc.hod_validated ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Validated ({doc.hod_validated_by || 'HOD'})
                        </span>
                      ) : doc.validation_status === 'Rejected by HOD' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      ) : doc.validation_status === 'Revision Requested' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Revision Requested
                        </span>
                      ) : ['HOD', 'Principal', 'Administrator'].includes(user?.role) ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setConfirmHodModalDoc(doc)}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectingDoc(doc); setActionType('revision'); setRejectionReason(''); }}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-[10px] cursor-pointer"
                          >
                            Revision
                          </button>
                          <button
                            onClick={() => { setRejectingDoc(doc); setActionType('reject'); setRejectionReason(''); }}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Pending HOD</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      {doc.principal_validated ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          Approved ({doc.principal_validated_by || 'Principal'})
                        </span>
                      ) : doc.validation_status === 'Rejected by Principal' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      ) : doc.validation_status === 'Revision Requested by Principal' ? (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Revision Requested
                        </span>
                      ) : ['Principal', 'Administrator'].includes(user?.role) && doc.validation_status === 'Pending Principal Validation' ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setPrincipalModalDoc(doc)}
                            className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer shadow-xs flex items-center gap-1"
                            title="Review Evidence & Perform Institutional Validation"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Review & Validate</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">
                          {doc.hod_validated ? 'Pending Principal' : 'Awaiting Stage 1'}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border block w-fit ${
                          doc.validation_status === 'Fully Validated' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                          doc.validation_status === 'Pending Principal Validation' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                          doc.validation_status.includes('Revision') ? 'bg-amber-100 text-amber-800 border-amber-200' :
                          doc.validation_status.includes('Rejected') ? 'bg-rose-100 text-rose-800 border-rose-200' :
                          'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {doc.validation_status}
                        </span>
                        <span className="text-[9px] text-slate-400 block font-mono">
                          Tech State: {doc.status || 'Processed'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right space-x-1.5">
                      <button
                        onClick={() => handleDownloadDocPdf(doc)}
                        disabled={downloadingDocId === doc.id}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-emerald-700 border border-slate-200 cursor-pointer disabled:opacity-50"
                        title={`Download PDF Report for Document #${doc.id}`}
                      >
                        {downloadingDocId === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-blue-700 border border-slate-200 cursor-pointer"
                        title="Preview Parsed Text"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {(user?.role === 'Administrator' || (user?.role === 'Faculty' && doc.user_id === user?.id && !doc.principal_validated)) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-600 border border-slate-200 cursor-pointer"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmHodModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Approve Evidence Document?
              </h3>
              <button onClick={() => setConfirmHodModalDoc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p><b>Document:</b> {confirmHodModalDoc.original_name}</p>
              <p><b>Sub-Criterion:</b> Sub-{confirmHodModalDoc.sub_criterion}</p>
              <p><b>Current Status:</b> <span className="text-amber-700 font-semibold">{confirmHodModalDoc.validation_status}</span></p>
              <p><b>New Status:</b> <span className="text-purple-700 font-semibold">Pending Principal Validation</span></p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmHodModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveHodConfirm}
                disabled={processingId === confirmHodModalDoc.id}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                {processingId === confirmHodModalDoc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve Stage 1'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPrincipalModalDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Final Institutional Approval
              </h3>
              <button onClick={() => setConfirmPrincipalModalDoc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to approve this evidence document at the institutional level?
            </p>

            <div className="space-y-2 text-xs text-slate-700 bg-purple-50 p-4 rounded-xl border border-purple-200">
              <p><b>Document:</b> {confirmPrincipalModalDoc.original_name}</p>
              <p><b>Department:</b> {confirmPrincipalModalDoc.owner_department || 'Computer Science & Engg'}</p>
              <p><b>Criterion Scope:</b> Criterion 1 (Curricular Aspects)</p>
              <p><b>Stage 1 HOD Validation:</b> <span className="text-emerald-700 font-semibold">Completed ({confirmPrincipalModalDoc.hod_validated_by || 'HOD'})</span></p>
              <p><b>New Status:</b> <span className="text-purple-800 font-bold">Fully Validated</span></p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmPrincipalModalDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApprovePrincipalConfirm}
                disabled={processingId === confirmPrincipalModalDoc.id}
                className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs"
              >
                {processingId === confirmPrincipalModalDoc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass-panel bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900">{previewDoc.original_name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap border border-slate-200">
              {previewDoc.extracted_preview || "No text preview available."}
            </div>
          </div>
        </div>
      )}

      {rejectingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {actionType === 'revision' ? (
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
              <button onClick={() => setRejectingDoc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActionType('revision')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    actionType === 'revision'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Request Revision
                </button>
                <button
                  type="button"
                  onClick={() => setActionType('reject')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    actionType === 'reject'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  Reject Evidence
                </button>
              </div>

              <p className="text-xs text-slate-600">
                {actionType === 'revision'
                  ? `Request faculty revision for ${rejectingDoc.original_name}. The document status will change to 'Revision Requested'.`
                  : `Reject evidence ${rejectingDoc.original_name}. Mandatory feedback reason required.`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {actionType === 'revision' ? 'Revision Details / Required Additions' : 'Rejection Reason'} *
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={
                    actionType === 'revision'
                      ? "e.g. Please upload the revised syllabus and supporting BOS minutes..."
                      : "e.g. Document is fundamentally unreadable or missing required Academic Council ratification..."
                  }
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setRejectingDoc(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleActionSubmit}
                  disabled={!rejectionReason.trim() || processingId === rejectingDoc.id}
                  className={`px-4 py-2 rounded-xl font-bold text-xs text-white disabled:opacity-50 ${
                    actionType === 'revision' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {processingId === rejectingDoc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : actionType === 'revision' ? (
                    'Submit Revision Request'
                  ) : (
                    'Submit Rejection'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Principal Evidence Review & Validation Summary Modal */}
      {principalModalDoc && (
        <PrincipalValidationModal
          docObj={principalModalDoc}
          onClose={() => setPrincipalModalDoc(null)}
          onSuccess={fetchDocuments}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
