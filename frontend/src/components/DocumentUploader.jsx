import React, { useState } from 'react';
import { documentAPI, reportAPI } from '../services/api';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, Download } from 'lucide-react';

const DocumentUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [subCriterion, setSubCriterion] = useState('1.1');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploadedDoc, setUploadedDoc] = useState(null);
  const [error, setError] = useState(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [duplicatePrompt, setDuplicatePrompt] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setUploadedDoc(null);
      setError(null);
      setDuplicatePrompt(null);
    }
  };

  const handleUpload = async (e, forceDuplicate = false) => {
    if (e) e.preventDefault();
    if (!file) {
      setError('Please select an institutional document file to upload.');
      return;
    }

    setUploading(true);
    setMessage(null);
    setUploadedDoc(null);
    setError(null);
    setDuplicatePrompt(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sub_criterion', subCriterion);
    if (forceDuplicate) {
      formData.append('force_duplicate', 'true');
    }

    try {
      const res = await documentAPI.upload(formData);
      const newDoc = res.data;
      setUploadedDoc(newDoc);
      setMessage(`Successfully processed '${newDoc.original_name || newDoc.filename}' (ID: #${newDoc.id}). Text extracted & indexed into FAISS vector store.`);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess(newDoc);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409 || (typeof detail === 'object' && detail?.is_duplicate)) {
        setDuplicatePrompt({
          isDuplicate: true,
          existingFilename: detail.existing_filename || file.name,
          existingDocId: detail.existing_doc_id,
          message: detail.message || `Exact duplicate file detected! Content is identical to existing document '${detail.existing_filename}'. Do you still want to submit this file again?`
        });
      } else {
        const errStr = typeof detail === 'string' ? detail : (detail?.message || 'Failed to process document. Please check file format.');
        setError(errStr);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadUploadedDocReport = async () => {
    if (!uploadedDoc || !uploadedDoc.id) return;
    setDownloadingReport(true);
    try {
      const response = await reportAPI.downloadPdf("CampusInsight AI", uploadedDoc.id);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CampusInsight_Report_Doc_${uploadedDoc.id}_${(uploadedDoc.original_name || 'document').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download PDF report for uploaded document:", err);
      let errMsg = "Unable to generate PDF report for uploaded document.";
      if (err.response && err.response.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          if (json.detail) errMsg = json.detail;
        } catch (e) {}
      } else if (err.response?.data?.detail) {
        errMsg = err.response.data.detail;
      }
      setError(errMsg);
    } finally {
      setDownloadingReport(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl glass-panel border border-slate-200 bg-white shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-700">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900">Upload Institutional Evidence Document</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supported formats: PDF, DOCX, Scanned Documents, PNG/JPG images.
          </p>
        </div>

        {/* Upload Step Flow Badge */}
        <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <span className="text-blue-600">1. Uploaded</span>
          <span>→</span>
          <span className="text-indigo-600">2. Processing</span>
          <span>→</span>
          <span className="text-purple-600">3. Analyzing</span>
          <span>→</span>
          <span className="text-emerald-600">4. Ready</span>
        </div>
      </div>

      {/* "What can I upload?" Institutional Guidance Box */}
      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700 space-y-2">
        <span className="font-extrabold text-blue-950 uppercase tracking-wider block">
          📋 What can I upload?
        </span>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 font-medium">
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> SSR & AQAR Reports</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Syllabus & Course Outlines</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> BOS Meeting Minutes</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Feedback Analysis Reports</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Action Taken Reports (ATRs)</div>
          <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Academic Regulations</div>
        </div>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Select Sub-Criterion Scope
            </label>
            <select
              value={subCriterion}
              onChange={(e) => setSubCriterion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:bg-white font-medium"
            >
              <option value="1.1">1.1 Curriculum Design and Development (PO, PSO, CO, Syllabus Revision)</option>
              <option value="1.2">1.2 Academic Flexibility (Open Electives, CBCS, MOOCs, Credit Transfer)</option>
              <option value="1.3">1.3 Curriculum Enrichment (Value-Added Courses, Ethics, Seminars)</option>
              <option value="1.4">1.4 Feedback System (Student, Faculty, Alumni, Employer, ATR)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Document File (PDF / DOCX / Image)
            </label>
            <div className="relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-2.5 bg-slate-50 hover:bg-blue-50/50 text-center transition-all cursor-pointer">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.bmp,.tiff"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center justify-center space-x-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                <span className="text-xs text-slate-700 font-medium truncate max-w-[200px]">
                  {file ? file.name : 'Choose file or drag here'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing Document & Mapping to NAAC Criterion 1 Requirements...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Upload Document & Update Criterion 1 Analysis</span>
            </>
          )}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{message}</span>
          </div>
          {uploadedDoc && (
            <div className="pt-1">
              <button
                type="button"
                onClick={handleDownloadUploadedDocReport}
                disabled={downloadingReport}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {downloadingReport ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Download Report for Document #{uploadedDoc.id}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {duplicatePrompt && (
        <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3 shadow-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-amber-900">⚠️ Duplicate Document Detected</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">{duplicatePrompt.message}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 justify-end">
            <button
              type="button"
              onClick={() => setDuplicatePrompt(null)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel Upload
            </button>
            <button
              type="button"
              onClick={(e) => handleUpload(e, true)}
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>Yes, Submit Duplicate Document</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentUploader;
