import React, { useState, useEffect } from 'react';
import { reportAPI, documentAPI } from '../services/api';
import { FileCheck, Download, Building, ShieldCheck, Loader2, Sparkles, FileText } from 'lucide-react';

const ReportsPage = () => {
  const [institutionName, setInstitutionName] = useState('National Institute of Engineering & Technology');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const fetchDocs = async () => {
    setLoadingDocs(true);
    try {
      const res = await documentAPI.list();
      const docsList = res.data || [];
      setDocuments(docsList);
      
      setSelectedDocId(prev => {
        if (prev && docsList.some(d => d.id.toString() === prev)) {
          return prev;
        }
        return docsList.length > 0 ? docsList[0].id.toString() : '';
      });
    } catch (err) {
      console.error("Failed to fetch documents for report selection:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const getBlobErrorMessage = async (err, defaultMsg) => {
    if (err.response && err.response.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const json = JSON.parse(text);
        if (json.detail) return json.detail;
      } catch (e) {
        // Not JSON
      }
    } else if (err.response?.data?.detail) {
      return err.response.data.detail;
    } else if (err.message) {
      return err.message;
    }
    return defaultMsg;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const docId = selectedDocId ? parseInt(selectedDocId, 10) : null;
      const response = await reportAPI.downloadPdf(institutionName, docId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      
      const docSuffix = docId ? `Doc_${docId}` : 'Portfolio';
      link.setAttribute('download', `CampusInsight_Report_${docSuffix}_${institutionName.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("PDF Download failed:", err);
      const errMsg = await getBlobErrorMessage(err, "Failed to download PDF report. Please try again.");
      alert(errMsg);
      fetchDocs();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const docId = selectedDocId ? parseInt(selectedDocId, 10) : null;
      const response = await reportAPI.downloadCsv(institutionName, docId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      
      const docSuffix = docId ? `Doc_${docId}` : 'Data';
      link.setAttribute('download', `CampusInsight_${docSuffix}_${institutionName.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("CSV Download failed:", err);
      const errMsg = await getBlobErrorMessage(err, "Failed to export CSV. Please try again.");
      alert(errMsg);
      fetchDocs();
    } finally {
      setDownloadingCsv(false);
    }
  };

  const selectedDocObj = documents.find(d => d.id.toString() === selectedDocId);

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

        <div className="space-y-5">
          {/* Institution Name */}
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

          {/* Target Document Selector */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
              Select Target Evidence Document for Report Scope
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3.5 top-3.5 text-blue-600" />
              <select
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
                disabled={loadingDocs}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="">Full Portfolio Report (All Criterion 1 Documents)</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    Document #{doc.id}: {doc.original_name || doc.filename} (Sub-{doc.sub_criterion})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scope Indicator & Disclaimer Box */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-blue-900 uppercase tracking-wider">
                📌 Report Based On: <span className="text-blue-700 underline">{selectedDocObj ? `Document #${selectedDocObj.id} (${selectedDocObj.original_name})` : 'Full Institutional Portfolio (All Criterion 1 Evidence)'}</span>
              </span>
            </div>
            <p className="text-slate-600 font-medium text-[11px]">
              <b>Disclaimer:</b> The CampusInsight Readiness Index included in this report is an internal institutional readiness indicator and is NOT an official NAAC score or grade prediction.
            </p>
          </div>

          <div className="p-4.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <h4 className="font-bold text-blue-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Included Report Components:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
              <li>Target Document ID & Filename Specific Evidence Summary</li>
              <li>Executive Summary & Overall Criterion 1 Quality CGPA Grade</li>
              <li>Sub-Criteria 1.1, 1.2, 1.3, 1.4 Performance & Score Table</li>
              <li>Identified Documentation Gaps & Missing Evidence Checklist</li>
              <li>Agentic AI Recommendations & Action Item Schedule</li>
              <li>SHAP Explainable AI Feature Importance Drivers</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <button
              onClick={handleDownload}
              disabled={downloading || !institutionName.trim()}
              className="py-4 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling PDF for Document #{selectedDocId || 'Portfolio'}...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download PDF Report {selectedDocId ? `(Doc #${selectedDocId})` : '(Full)'}</span>
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
                  <span>Export CSV Data {selectedDocId ? `(Doc #${selectedDocId})` : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report History Log */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Report History Log
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <tr>
                <th className="px-4 py-3">Report ID</th>
                <th className="px-4 py-3">Target Scope / Document</th>
                <th className="px-4 py-3">Criterion</th>
                <th className="px-4 py-3">Generated Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-blue-700 font-bold">RPT-2026-001</td>
                <td className="px-4 py-3 text-slate-900 font-bold">Full Criterion 1 Institutional Portfolio</td>
                <td className="px-4 py-3 text-slate-600">NAAC Criterion 1</td>
                <td className="px-4 py-3 text-slate-500">2026-08-24 18:30</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={handleDownload} className="text-blue-600 hover:underline font-bold">Download PDF</button>
                </td>
              </tr>
              {selectedDocObj && (
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-700 font-bold">RPT-2026-002</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">Doc #{selectedDocObj.id}: {selectedDocObj.original_name}</td>
                  <td className="px-4 py-3 text-slate-600">Sub-Criterion {selectedDocObj.sub_criterion}</td>
                  <td className="px-4 py-3 text-slate-500">2026-08-24 18:40</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={handleDownload} className="text-blue-600 hover:underline font-bold">Download PDF</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
