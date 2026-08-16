import React, { useEffect, useState } from 'react';
import { documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DocumentUploader from '../components/DocumentUploader';
import { FileText, Trash2, Eye, Filter, Loader2, CheckCircle, ShieldCheck, XCircle, AlertCircle } from 'lucide-react';

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

      {/* Documents Table Container */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">
            {user?.role === 'Faculty' ? 'My Uploaded Evidence Documents' :
             user?.role === 'HOD' ? `Department Evidence & Validations (${user?.department})` :
             user?.role === 'Principal' ? 'Institutional Criterion 1 Document Vault' :
             'System Document Registry'} ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-sm font-medium">
            No documents found matching selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold bg-slate-50">
                  <th className="py-3 px-3">Document Name</th>
                  <th className="py-3 px-3">Sub-Criterion</th>
                  <th className="py-3 px-3">Uploaded By</th>
                  <th className="py-3 px-3">HOD Status</th>
                  <th className="py-3 px-3">Principal Status</th>
                  <th className="py-3 px-3">Validation Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="truncate max-w-[220px] block">{doc.original_name || doc.filename}</span>
                        {doc.rejection_reason && (
                          <span className="text-[11px] font-normal text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3" /> Rejection: {doc.rejection_reason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-blue-700 font-bold">
                      Sub-{doc.sub_criterion}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-slate-800 block">{doc.owner_name || 'Faculty Member'}</span>
                      <span className="text-[10px] text-slate-400">{doc.owner_department || 'Engineering'}</span>
                    </td>

                    {/* HOD Review Actions / Status */}
                    <td className="py-3.5 px-3">
                      {doc.hod_validated ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          Validated
                        </span>
                      ) : doc.validation_status === 'Rejected by HOD' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      ) : ['HOD', 'Administrator'].includes(user?.role) && doc.validation_status === 'Pending HOD Validation' ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleValidateHod(doc.id)}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setRejectingDoc(doc); setRejectionReason(''); }}
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

                    {/* Principal Review Actions / Status */}
                    <td className="py-3.5 px-3">
                      {doc.principal_validated ? (
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          Approved
                        </span>
                      ) : doc.validation_status === 'Rejected by Principal' ? (
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] flex items-center gap-1 w-fit">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Rejected
                        </span>
                      ) : ['Principal', 'Administrator'].includes(user?.role) && doc.validation_status === 'Pending Principal Validation' ? (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleValidatePrincipal(doc.id)}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] cursor-pointer shadow-xs"
                            title="Approve Document & Execute AI Analysis Pipeline"
                          >
                            Approve & Run AI
                          </button>
                          <button
                            onClick={() => { setRejectingDoc(doc); setRejectionReason(''); }}
                            disabled={processingId === doc.id}
                            className="px-2 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Pending Principal</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        doc.validation_status === 'Fully Validated' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        doc.validation_status === 'Pending Principal Validation' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        doc.validation_status.includes('Rejected') ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {doc.validation_status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right space-x-1.5">
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

      {/* Document Text Preview Modal */}
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

      {/* Document Rejection Modal */}
      {rejectingDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-rose-700 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                Reject Evidence Document
              </h3>
              <button onClick={() => setRejectingDoc(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Provide feedback / reason for rejecting <b>{rejectingDoc.original_name}</b>. This comment will be returned to the faculty member for correction.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rejection Reason / Insufficient Evidence</label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Missing official Board of Studies signature sheet or Course Attainment matrices..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
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
                  onClick={user?.role === 'HOD' ? handleRejectHodSubmit : handleRejectPrincipalSubmit}
                  disabled={!rejectionReason.trim() || processingId === rejectingDoc.id}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs disabled:opacity-50"
                >
                  Submit Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
