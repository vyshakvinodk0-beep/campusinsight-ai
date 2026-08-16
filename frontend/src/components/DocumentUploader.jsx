import React, { useState } from 'react';
import { documentAPI } from '../services/api';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles } from 'lucide-react';

const DocumentUploader = ({ onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [subCriterion, setSubCriterion] = useState('1.1');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select an institutional document file to upload.');
      return;
    }

    setUploading(true);
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sub_criterion', subCriterion);

    try {
      const res = await documentAPI.upload(formData);
      setMessage(`Successfully processed '${res.data.filename}' via PyMuPDF/OCR. Mapped & indexed into FAISS vector store.`);
      setFile(null);
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process document. Please check file format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center space-x-2 text-blue-700 mb-1">
        <Sparkles className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-slate-900">Upload Institutional Evidence Document</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Supported formats: Digital PDF, DOCX, Scanned PDF, Images (PNG, JPG). Automatic Tesseract OCR & PyMuPDF text parsing enabled.
      </p>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Select Sub-Criterion Scope
            </label>
            <select
              value={subCriterion}
              onChange={(e) => setSubCriterion(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Parsing, Running OCR & Executing LangGraph Multi-Agent Analysis...</span>
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              <span>Process Document & Update NAAC Readiness</span>
            </>
          )}
        </button>
      </form>

      {message && (
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{message}</span>
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
