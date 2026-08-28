import React, { useEffect, useState, useRef } from 'react';
import { documentAPI, reportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DocumentUploader from '../components/DocumentUploader';
import PrincipalValidationModal from '../components/PrincipalValidationModal';
import {
  FileText,
  Plus,
  Trash2,
  Eye,
  Filter,
  Loader2,
  CheckCircle,
  ShieldCheck,
  XCircle,
  AlertCircle,
  Download,
  Layers,
  Clock,
  Sparkles,
  UploadCloud
} from 'lucide-react';

const DocumentsPage = () => {
  const { user } = useAuth();
  const uploaderRef = useRef(null);
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
  const [principalModalDoc, setPrincipalModalDoc] = useState(null);
  const [actionType, setActionType] = useState('reject');

  const fetchDocuments = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await documentAPI.list(subCriterion, validationFilter);
      setDocuments(res.data);
    } catch (err) {
      console.error("Failed to list documents:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(true);
    const timer = setInterval(() => {
      setDocuments((prevDocs) => {
        const hasProcessing = prevDocs.some(
          (d) =>
            d.status === 'Processing' ||
            d.processing_stage === 'Extracting Text' ||
            d.processing_stage === 'OCR Processing' ||
            d.processing_stage === 'FAISS Indexing' ||
            d.processing_stage === 'AI Analysis'
        );
        if (hasProcessing) {
          fetchDocuments(false);
        }
        return prevDocs;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [subCriterion, validationFilter]);

  const scrollToUploader = () => {
    if (uploaderRef.current) {
      uploaderRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDownloadDocPdf = async (doc) => {
    setDownloadingDocId(doc.id);
    try {
      const response = await reportAPI.downloadPdf("CampusInsight AI", doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `CampusInsight_Report_Doc_${doc.id}_${(doc.original_name || doc.filename).replace(/\s+/g, '_')}.pdf`
      );
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

  const handleApproveHodConfirm = async () => {
    if (!confirmHodModalDoc) return;
    setProcessingId(confirmHodModalDoc.id);
    try {
      await documentAPI.validateHod(confirmHodModalDoc.id);
      setConfirmHodModalDoc(null);
      fetchDocuments();
    } catch (err) {
      console.error("HOD validation failed:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActionSubmit = async () => {
    if (!rejectingDoc || !rejectionReason.trim()) return;
    setProcessingId(rejectingDoc.id);
    try {
      if (actionType === 'revision') {
        await documentAPI.rejectHod(rejectingDoc.id, `[Revision Requested] ${rejectionReason}`);
      } else {
        await documentAPI.rejectHod(rejectingDoc.id, rejectionReason);
      }
      setRejectingDoc(null);
      setRejectionReason('');
      fetchDocuments();
    } catch (err) {
      console.error("Action submit failed:", err);
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

  // KPI Calculations
  const totalCount = documents.length;
  const processingCount = documents.filter(
    (d) => d.status === 'Processing' || (d.processing_stage && d.processing_stage !== 'Completed' && d.processing_stage !== 'Failed')
  ).length;
  const pendingCount = documents.filter((d) => d.validation_status && d.validation_status.includes('Pending')).length;
  const validatedCount = documents.filter((d) => d.validation_status === 'Fully Validated').length;

  return (
    <div className="space-y-7 pb-12">
      {/* 1. Page Title Header & Top-Right Primary Upload Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-6 h-6" />
            </div>
            <span>My Evidence Portal</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              {user?.role || 'Faculty'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
            Upload, manage and analyze your institutional accreditation evidence documents (SSR, AQAR, Syllabus, BOS Minutes, Feedback ATRs).
          </p>
        </div>

        {/* Primary CTA Upload Action - Visible Immediately at Top Right */}
        <button
          onClick={scrollToUploader}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer hover:shadow-lg shrink-0 border border-blue-400/30 active:scale-98"
        >
          <Plus className="w-4 h-4 text-white stroke-[3]" />
          <span>+ Upload Evidence</span>
        </button>
      </div>

      {/* 2. RESTORED COMPLETE UPLOAD INSTITUTIONAL EVIDENCE SECTION */}
      <div ref={uploaderRef}>
        <DocumentUploader onUploadSuccess={fetchDocuments} />
      </div>

      {/* 3. Status & Evidence KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Evidence</p>
            <p className="text-xl font-black text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Processing</p>
            <p className="text-xl font-black text-amber-900">{processingCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Review</p>
            <p className="text-xl font-black text-purple-900">{pendingCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Validated</p>
            <p className="text-xl font-black text-emerald-900">{validatedCount}</p>
          </div>
        </div>
      </div>

      {/* 4. Vault Document Table / Recent Evidence */}
      <div className="glass-panel p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Recent Evidence Repository
            </h3>
          </div>

          {/* Sub-Criterion & Workflow Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={subCriterion}
                onChange={(e) => setSubCriterion(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="All">All Sub-Criteria</option>
                <option value="1.1">Sub-1.1: Curriculum Design</option>
                <option value="1.2">Sub-1.2: Academic Flexibility</option>
                <option value="1.3">Sub-1.3: Curriculum Enrichment</option>
                <option value="1.4">Sub-1.4: Feedback System</option>
              </select>
            </div>

            <select
              value={validationFilter}
              onChange={(e) => setValidationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Validation Statuses</option>
              <option value="Pending HOD Validation">Pending HOD Review</option>
              <option value="Pending Principal Validation">Pending Principal Approval</option>
              <option value="Fully Validated">Fully Validated</option>
              <option value="Revision Requested">Revision Requested</option>
              <option value="Rejected by HOD">Rejected by HOD</option>
              <option value="Rejected by Principal">Rejected by Principal</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center items-center text-slate-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-xs font-medium">Loading Vault Documents...</span>
          </div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">No institutional evidence documents uploaded yet.</p>
              <p className="text-[11px] text-slate-500">
                Use the upload section above to submit evidence for Criterion 1 analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                  <th className="py-3 px-3">Document</th>
                  <th className="py-3 px-3">Sub-Criterion</th>
                  <th className="py-3 px-3">Uploaded By</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Processing Status</th>
                  <th className="py-3 px-3">Validation Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 mt-0.5 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">
                            {doc.original_name || doc.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            ID: #{doc.id} | Size: {(doc.file_size / 1024).toFixed(1)} KB | {doc.page_count || 1} pgs ({doc.text_pages_count || 0} Text / {doc.ocr_pages_count || 0} OCR)
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                        Sub-{doc.sub_criterion}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-700">
                      <div>
                        <p className="font-bold text-slate-800">{doc.owner_name || 'Faculty User'}</p>
                        <p className="text-[10px] text-slate-400">{doc.owner_department || 'Computer Science'}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-slate-600 font-medium text-[11px]">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border block w-fit ${
                        doc.processing_stage === 'Completed' || doc.status === 'Processed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : doc.processing_stage === 'Failed'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {doc.processing_stage || doc.status || 'Processed'}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        {doc.validation_status === 'Fully Validated' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Fully Validated
                          </span>
                        ) : doc.validation_status === 'Pending Principal Validation' ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              Pending Principal
                            </span>
                            {['Principal', 'Administrator'].includes(user?.role) && (
                              <button
                                onClick={() => setPrincipalModalDoc(doc)}
                                className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Validate
                              </button>
                            )}
                          </div>
                        ) : doc.validation_status?.includes('Revision') ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Revision Requested
                          </span>
                        ) : doc.validation_status?.includes('Rejected') ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        ) : (
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold text-[10px] w-fit">
                              Pending HOD
                            </span>
                            {['HOD', 'Principal', 'Administrator'].includes(user?.role) && (
                              <button
                                onClick={() => setConfirmHodModalDoc(doc)}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        )}
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
                      {(user?.role === 'Administrator' ||
                        (user?.role === 'Faculty' && doc.user_id === user?.id && !doc.principal_validated)) && (
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

      {/* 5. Recommended Next Steps Guidance Section */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-3 shadow-md">
        <div className="flex items-center space-x-2 text-amber-400">
          <Sparkles className="w-5 h-5" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Recommended Next Steps for Institutional Evidence</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-blue-300">1. Review Feedback ATRs</p>
            <p className="text-slate-300 text-[11px]">
              Ensure Sub-Criterion 1.4 includes formal Action Taken Reports (ATRs) with Academic Council signatures.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-indigo-300">2. Verify HOD Department Review</p>
            <p className="text-slate-300 text-[11px]">
              HODs must validate faculty submissions before final Principal institutional approval.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
            <p className="font-bold text-purple-300">3. Generate Comprehensive Report</p>
            <p className="text-slate-300 text-[11px]">
              Export institution-wide NAAC Criterion 1 PDF reports from the Analytics & Reports tab.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm HOD Modal */}
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

      {/* Preview Text Modal */}
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

      {/* Rejection / Revision Modal */}
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

      {/* Principal Validation Modal */}
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
