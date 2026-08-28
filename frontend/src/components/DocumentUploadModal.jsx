import React from 'react';
import DocumentUploader from './DocumentUploader';
import { X, FileText, Sparkles } from 'lucide-react';

const DocumentUploadModal = ({ isOpen, onClose, onUploadStarted }) => {
  if (!isOpen) return null;

  const handleUploadSuccess = (uploadedDoc) => {
    if (onUploadStarted) {
      onUploadStarted(uploadedDoc);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Upload Institutional Evidence</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500">
                Upload accreditation documents for NAAC Criterion 1 analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Reused Full-Featured DocumentUploader Component */}
        <DocumentUploader onUploadSuccess={handleUploadSuccess} />

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
