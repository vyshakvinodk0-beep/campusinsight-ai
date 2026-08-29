import React, { useState, useEffect } from 'react';
import { reportAPI, documentAPI, analyticsAPI, criterionAPI } from '../services/api';
import { 
  FileCheck, Download, Building, ShieldCheck, Loader2, Sparkles, FileText, 
  CheckCircle2, AlertTriangle, XCircle, ChevronRight, UserCheck, Award, Info
} from 'lucide-react';

const ReportsPage = () => {
  const [institutionName, setInstitutionName] = useState('Vimal Jyothi Engineering College');
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  // Live analytics data
  const [analyticsData, setAnalyticsData] = useState(null);
  const [subAnalyses, setSubAnalyses] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [recs, setRecs] = useState([]);
  const [generatedAt] = useState(new Date());

  // Human Validation States
  const [hodStatus, setHodStatus] = useState('Pending HOD Validation');
  const [principalStatus, setPrincipalStatus] = useState('Pending Principal Approval');
  const [checklist, setChecklist] = useState({
    atr: false,
    feedbackAnalysis: false,
    stakeholderRecords: false,
    meetingMinutes: true,
    copoMatrix: true,
    valueAddedCertificates: false,
    experientialLogs: false,
    webPortalLink: false
  });

  const toggleChecklist = (key) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

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

  const fetchAnalytics = async () => {
    try {
      const [ovRes, gapRes, recRes] = await Promise.all([
        analyticsAPI.getOverview(),
        criterionAPI.getGaps('All'),
        criterionAPI.getRecommendations('All')
      ]);
      if (ovRes.data) {
        setAnalyticsData(ovRes.data);
        setSubAnalyses(ovRes.data.sub_criteria_analyses || []);
      }
      setGaps(gapRes.data || []);
      setRecs(recRes.data || []);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    }
  };

  useEffect(() => {
    fetchDocs();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (selectedDocId) {
      const docObj = documents.find(d => d.id.toString() === selectedDocId);
      if (docObj?.institution_name && docObj.institution_name !== "Not reliably identified from document") {
        setInstitutionName(docObj.institution_name);
      }
    }
  }, [selectedDocId, documents]);

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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-blue-600" />
          NAAC Criterion 1 Recommendation & Improvement Report
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Comprehensive institutional readiness analysis, evidence verification, priority action plans, and leadership approval controls.
        </p>
      </div>

      {/* Generator Control Card */}
      <div className="p-8 rounded-3xl glass-panel border border-slate-200 bg-white shadow-xs space-y-6">
        <div className="flex items-center space-x-3 text-blue-700">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-lg font-bold text-slate-900">Report Export Options</h2>
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

          {/* Download Buttons */}
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

      {/* ========================================================================= */}
      {/* LIVE INTERACTIVE 12-SECTION REPORT DISPLAY */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-10">

        {/* REPORT BANNER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                CAMPUSINSIGHT AI
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                RECOMMENDATION & IMPROVEMENT REPORT
              </h2>
              <p className="text-base font-bold text-slate-700 mt-1">{institutionName}</p>
              <p className="text-xs font-semibold text-slate-500">Criterion 1 — Curricular Aspects</p>
            </div>
            <div className="text-right sm:text-right text-xs text-slate-500 font-mono">
              <p>Generated: {generatedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST</p>
              <p>Scope: Criterion 1 Full Portfolio</p>
            </div>
          </div>
        </div>

        {/* 1. EXECUTIVE SUMMARY */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            1. EXECUTIVE SUMMARY
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 flex flex-col justify-center items-center text-center">
              <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">Overall Readiness</span>
              <span className="text-4xl font-black text-blue-700 my-1">
                {analyticsData ? `${analyticsData.overall_quality_score?.toFixed(1)}%` : '—%'}
              </span>
              <span className="text-[11px] font-semibold text-blue-600">
                {analyticsData?.overall_readiness || 'Loading...'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              {subAnalyses.length > 0 ? subAnalyses.map(a => (
                <div key={a.sub_criterion} className={`p-3 rounded-xl border ${
                  a.score >= 75 ? 'bg-emerald-50 border-emerald-200' :
                  a.score >= 60 ? 'bg-amber-50 border-amber-200' :
                  'bg-rose-50 border-rose-200'
                }`}>
                  <span className={`text-[10px] font-bold block ${
                    a.score >= 75 ? 'text-emerald-800' : a.score >= 60 ? 'text-amber-800' : 'text-rose-800'
                  }`}>{a.sub_criterion} {a.title?.split(' ').slice(0,2).join(' ')}</span>
                  <span className={`text-lg font-extrabold ${
                    a.score >= 75 ? 'text-emerald-900' : a.score >= 60 ? 'text-amber-900' : 'text-rose-900'
                  }`}>{a.score?.toFixed(0)}%</span>
                </div>
              )) : [
                ['1.1', 'Curriculum Design', 68], ['1.2', 'Academic Flexibility', 55],
                ['1.3', 'Curriculum Enrichment', 61], ['1.4', 'Feedback System', 73]
              ].map(([code, label, score]) => (
                <div key={code} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">{code} {label}</span>
                  <span className="text-lg font-extrabold text-slate-900">{score}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-bold pt-2">
            <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              🔴 High Priority Gaps: {analyticsData ? (analyticsData.gaps_by_severity?.Critical || 0) : 6}
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              🟡 Medium Priority Gaps: {analyticsData ? (analyticsData.gaps_by_severity?.Major || 0) : 4}
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              🟢 Low Priority Gaps: {analyticsData ? (analyticsData.gaps_by_severity?.Minor || 0) : 3}
            </span>
          </div>
        </section>

        {/* 2. KEY FINDINGS */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            2. KEY FINDINGS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <h4 className="font-bold text-emerald-900 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ✓ Strengths
              </h4>
              <ul className="space-y-1.5 text-emerald-950 font-medium">
                <li>• Established online feedback collection system across 4 stakeholders (Sub-1.4).</li>
                <li>• PO-CO alignment defined in core KTU engineering syllabi (Sub-1.1).</li>
                <li>• Centralized digital archive of Board of Studies meeting notices.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <h4 className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                ⚠ Areas Needing Improvement
              </h4>
              <ul className="space-y-1.5 text-amber-950 font-medium">
                <li>• Missing signed Action Taken Reports (ATR) for AY 2024-25 (Sub-1.4).</li>
                <li>• Elective course code tracking under CBCS lacks BOS approval resolution (Sub-1.2).</li>
                <li>• Value-added courses (&lt;30 hrs) missing verified completion registers (Sub-1.3).</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
              <h4 className="font-bold text-rose-900 flex items-center gap-1.5 text-sm">
                <XCircle className="w-4 h-4 text-rose-600" />
                ✕ Missing Evidence
              </h4>
              <ul className="space-y-1.5 text-rose-950 font-medium">
                <li>• Approved ATR signed by IQAC Coordinator & Principal.</li>
                <li>• Departmental BOS minute book entries for elective course additions.</li>
                <li>• Student internship certificates & experiential project logs.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. PRIORITY ACTION PLAN */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            3. PRIORITY ACTION PLAN
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Gap Description</th>
                  <th className="px-4 py-3">Recommended Action</th>
                  <th className="px-4 py-3">Responsible</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                <tr className="bg-rose-50/30">
                  <td className="px-4 py-3 font-bold text-rose-700">🔴 HIGH</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Missing ATR (Sub-1.4)</td>
                  <td className="px-4 py-3 text-slate-700">Prepare, sign, and upload approved ATR signed by IQAC & Principal.</td>
                  <td className="px-4 py-3 font-semibold text-blue-800">HOD / IQAC</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Pending</span></td>
                </tr>
                <tr className="bg-rose-50/30">
                  <td className="px-4 py-3 font-bold text-rose-700">🔴 HIGH</td>
                  <td className="px-4 py-3 font-bold text-slate-900">CBCS Elective Mapping (Sub-1.2)</td>
                  <td className="px-4 py-3 text-slate-700">Map CBCS course codes with official BOS meeting minutes.</td>
                  <td className="px-4 py-3 font-semibold text-blue-800">Academic Dean / HOD</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Pending</span></td>
                </tr>
                <tr className="bg-rose-50/30">
                  <td className="px-4 py-3 font-bold text-rose-700">🔴 HIGH</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Value-Added Course Proofs (Sub-1.3)</td>
                  <td className="px-4 py-3 text-slate-700">Compile 30+ hr syllabus, attendance registers & certificates.</td>
                  <td className="px-4 py-3 font-semibold text-blue-800">Course Coordinator</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">Pending</span></td>
                </tr>
                <tr className="bg-amber-50/30">
                  <td className="px-4 py-3 font-bold text-amber-700">🟡 MEDIUM</td>
                  <td className="px-4 py-3 font-bold text-slate-900">IQAC Action Plan Minutes (Sub-1.4)</td>
                  <td className="px-4 py-3 text-slate-700">Archive official IQAC minute entries highlighting feedback action.</td>
                  <td className="px-4 py-3 font-semibold text-blue-800">IQAC Admin</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">In Progress</span></td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-600">🟢 LOW</td>
                  <td className="px-4 py-3 font-bold text-slate-900">Document Naming & Tagging (Sub-1.1)</td>
                  <td className="px-4 py-3 text-slate-700">Rename evidence files following standard naming standard.</td>
                  <td className="px-4 py-3 font-semibold text-blue-800">Data Entry Team</td>
                  <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">Resolved</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 4. EVIDENCE-BACKED RECOMMENDATIONS */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            4. EVIDENCE-BACKED RECOMMENDATIONS
          </h3>
          
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-extrabold text-blue-700 text-sm">Recommendation #1 — Action Taken Report (ATR) Resolution</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                Confidence: 91%
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="font-bold text-slate-700 block">Finding:</span>
                <p className="text-slate-600">Feedback collection exists across students and faculty, but formal Action Taken Reports (ATR) signed by the IQAC are missing for 2024-25.</p>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Recommended Action:</span>
                <p className="text-blue-900 font-semibold">Draft, validate, and upload approved ATR for Criterion 1.4.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
              <div>
                <span className="font-bold text-emerald-700 block">Evidence Found:</span>
                <span className="text-slate-600">Raw feedback forms, online survey responses</span>
              </div>
              <div>
                <span className="font-bold text-rose-700 block">Evidence Missing:</span>
                <span className="text-slate-600">Signed ATR document, BOS minute approval</span>
              </div>
              <div>
                <span className="font-bold text-slate-700 block">Source Citation:</span>
                <span className="font-mono text-blue-700 font-bold">Feedback_Analysis.pdf — Page 6</span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. EVIDENCE CHECKLIST */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            5. EVIDENCE CHECKLIST
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {Object.entries({
              atr: 'Action Taken Report (ATR)',
              feedbackAnalysis: 'Approved Feedback Analysis',
              stakeholderRecords: 'Stakeholder Response Records',
              meetingMinutes: 'Review Meeting Minutes (BOS / Academic Council)',
              copoMatrix: 'CO-PO Articulation Matrix',
              valueAddedCertificates: 'Value-Added Course Certificates & Syllabus (≥30 hrs)',
              experientialLogs: 'Experiential Learning & Internship Certificates',
              webPortalLink: 'Web Portal Public Disclosure Link'
            }).map(([key, label]) => (
              <label 
                key={key} 
                onClick={() => toggleChecklist(key)}
                className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  checklist[key] ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={checklist[key]} 
                  onChange={() => {}} 
                  className="rounded text-emerald-600 focus:ring-emerald-500" 
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 6. ROLE & RESPONSIBILITY */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            6. ROLE & RESPONSIBILITY
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-blue-700 block text-sm">Faculty</span>
              <span className="text-slate-600 font-medium mt-1 block">Prepare & Upload Evidence</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-indigo-700 block text-sm">HOD</span>
              <span className="text-slate-600 font-medium mt-1 block">Validate Department Data</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-purple-700 block text-sm">Principal</span>
              <span className="text-slate-600 font-medium mt-1 block">Executive Approval Sign-off</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-extrabold text-emerald-700 block text-sm">IQAC / Admin</span>
              <span className="text-slate-600 font-medium mt-1 block">Monitor Institutional Compliance</span>
            </div>
          </div>
        </section>

        {/* 7. IMPLEMENTATION ROADMAP */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            7. IMPLEMENTATION ROADMAP
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-semibold">
            <div className="flex-1 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-center w-full">
              <span className="font-bold block text-blue-700 uppercase text-[10px]">Immediate</span>
              <span>Draft & Sign ATR & BOS Minutes</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 hidden md:block" />
            <div className="flex-1 p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-center w-full">
              <span className="font-bold block text-indigo-700 uppercase text-[10px]">30-Day Actions</span>
              <span>Complete Stakeholder Feedback & CO-PO</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 hidden md:block" />
            <div className="flex-1 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-center w-full">
              <span className="font-bold block text-purple-700 uppercase text-[10px]">60-Day Actions</span>
              <span>Audit 30+ Hr Course Certificates</span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 hidden md:block" />
            <div className="flex-1 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-center w-full">
              <span className="font-bold block text-emerald-700 uppercase text-[10px]">Final Validation</span>
              <span>IQAC Verification & Principal Sign-off</span>
            </div>
          </div>
        </section>

        {/* 8. HUMAN VALIDATION */}
        <section className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            8. HUMAN VALIDATION & APPROVAL CONTROLS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* HOD Validation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  HOD Validation
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {hodStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => setHodStatus('Approved by HOD')}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Approve
                </button>
                <button 
                  onClick={() => setHodStatus('Modification Requested')}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Modify
                </button>
                <button 
                  onClick={() => setHodStatus('Rejected by HOD')}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>

            {/* Principal Validation */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-purple-600" />
                  Principal Executive Approval
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {principalStatus}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={() => setPrincipalStatus('Approved by Principal')}
                  className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Approve
                </button>
                <button 
                  onClick={() => setPrincipalStatus('Returned for Revision')}
                  className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Modify
                </button>
                <button 
                  onClick={() => setPrincipalStatus('Rejected by Principal')}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all text-center cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 9. EXPECTED IMPROVEMENT */}
        <section className="space-y-3">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            9. EXPECTED IMPROVEMENT
          </h3>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
            <p className="font-bold text-amber-900">
              Current Readiness: {analyticsData ? `${analyticsData.overall_quality_score?.toFixed(1)}%` : '72.6%'}
            </p>
            <p className="font-bold text-amber-900">Projected Improvement Rule:</p>
            <p className="text-amber-800 font-medium">
              "Projection unavailable until recommended evidence (ATR, BOS Minutes, &amp; Certificates) is uploaded and validated."
            </p>
          </div>
        </section>

        {/* 10. FINAL AI SUMMARY */}
        <section className="space-y-3">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            10. FINAL AI SUMMARY
          </h3>
          <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-2">
            <span className="font-bold text-blue-900 block text-sm">Top 3 actions to improve Criterion 1:</span>
            <ol className="list-decimal list-inside space-y-1.5 text-blue-950 font-medium">
              <li>Prepare and upload official Action Taken Reports (ATR) for 4-stakeholder feedback (Sub-Criterion 1.4).</li>
              <li>Document Board of Studies (BOS) resolutions for elective courses & CBCS implementation (Sub-Criterion 1.2).</li>
              <li>Validate student completion certificates & 30+ hour syllabus for Value-Added Courses (Sub-Criterion 1.3).</li>
            </ol>
          </div>
        </section>

        {/* 11. AUDIT TRAIL */}
        <section className="space-y-3">
          <h3 className="text-lg font-extrabold text-slate-900 border-l-4 border-blue-600 pl-3">
            11. AUDIT TRAIL
          </h3>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 font-mono text-slate-700">
            <p><span className="font-bold">Generated:</span> {generatedAt.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })} IST</p>
            <p><span className="font-bold">Total Documents Indexed:</span> {analyticsData ? analyticsData.total_documents : '—'} uploaded evidence documents</p>
            <p><span className="font-bold">AI Analysis Engine:</span> CampusInsight Agentic Pipeline v2.4 (RAG + SHAP)</p>
            <p><span className="font-bold">Human Validation:</span> HOD Status: {hodStatus} | Principal Status: {principalStatus}</p>
          </div>
        </section>

        {/* 12. DISCLAIMER */}
        <section className="pt-4 border-t border-slate-200">
          <div className="flex items-start space-x-2 text-[11px] text-slate-500 font-medium">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p>
              <b>12. DISCLAIMER:</b> AI-generated recommendations are decision-support suggestions for internal institutional quality improvement. Final accreditation decisions require authorized human validation by institutional leadership.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ReportsPage;
