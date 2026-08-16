import React, { useState } from 'react';
import { reportAPI } from '../services/api';
import { FileCheck, Download, Building, ShieldCheck, Loader2, Sparkles } from 'lucide-react';

const ReportsPage = () => {
  const [institutionName, setInstitutionName] = useState('National Institute of Engineering & Technology');
  const [downloading, setDownloading] = useState(false);

  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await reportAPI.downloadPdf(institutionName);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NAAC_Criterion1_Accreditation_Report_${institutionName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const response = await reportAPI.downloadCsv(institutionName);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NAAC_Criterion1_Accreditation_Data_${institutionName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("CSV Download failed:", err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-blue-600" />
          NAAC Criterion 1 Accreditation Report Generator
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Export complete institutional self-study evaluation reports (SSR) for Criterion 1 (Curricular Aspects) in publication-ready PDF & CSV data formats.
        </p>
      </div>

      <div className="p-8 rounded-3xl glass-panel border border-slate-200 bg-white shadow-xs space-y-6">
        <div className="flex items-center space-x-3 text-blue-700">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-lg font-bold text-slate-900">Generate Official Assessment Reports</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Higher Educational Institution Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-blue-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Included Report Components:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
              <li>Executive Summary & Overall Criterion 1 Quality CGPA Grade</li>
              <li>Sub-Criteria 1.1, 1.2, 1.3, 1.4 Performance & Score Table</li>
              <li>Identified Documentation Gaps & Missing Evidence Checklist</li>
              <li>Agentic AI Recommendations & Action Item Schedule</li>
              <li>SHAP Explainable AI Feature Importance Drivers</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleDownload}
              disabled={downloading || !institutionName.trim()}
              className="py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download NAAC PDF Report</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv || !institutionName.trim()}
              className="py-4 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md border border-slate-800 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {downloadingCsv ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Export CSV / Data Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

};

export default ReportsPage;
