import React, { useEffect, useState } from 'react';
import { analyticsAPI, criterionAPI, documentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import MetricCard from '../components/MetricCard';
import SubCriteriaCard from '../components/SubCriteriaCard';
import DocumentUploader from '../components/DocumentUploader';
import { Award, FileCheck, AlertTriangle, Lightbulb, Sparkles, Loader2, RefreshCw, CheckCircle, ShieldCheck, XCircle, Users, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const FacultyDashboard = ({ overview, user, fetchOverview }) => {
  const { total_documents, sub_criteria_analyses } = overview;
  const [myDocs, setMyDocs] = useState([]);

  useEffect(() => {
    documentAPI.list('All').then(res => setMyDocs(res.data)).catch(console.error);
  }, []);

  const pendingHod = myDocs.filter(d => d.validation_status === 'Pending HOD Validation').length;
  const pendingPrin = myDocs.filter(d => d.validation_status === 'Pending Principal Validation').length;
  const fullyValidated = myDocs.filter(d => d.validation_status === 'Fully Validated').length;
  const rejected = myDocs.filter(d => d.validation_status?.includes('Rejected')).length;

  return (
    <div className="space-y-8 pb-12">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white glass-panel border border-emerald-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Faculty Academic Evidence Portal</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            Welcome, {user.full_name}
          </h1>
          <p className="text-sm text-slate-600 font-medium max-w-2xl">
            Upload institutional evidence for NAAC Criterion 1 (Curricular Aspects). Track HOD review and Principal approval statuses.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="My Uploaded Evidence" value={myDocs.length} subtitle="Files Submitted" icon={FileCheck} color="blue" />
        <MetricCard title="Pending HOD Review" value={pendingHod} subtitle="Stage 1 Verification" icon={AlertTriangle} color="amber" />
        <MetricCard title="Pending Principal Review" value={pendingPrin} subtitle="Stage 2 Approval" icon={Award} color="purple" />
        <MetricCard title="Approved Evidence" value={fullyValidated} subtitle="Indexed for AI Analysis" icon={CheckCircle} color="emerald" />
      </div>

      <DocumentUploader onUploadSuccess={() => { fetchOverview(); documentAPI.list('All').then(res => setMyDocs(res.data)); }} />

      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">My Evidence Documents ({myDocs.length})</h3>
          <Link to="/documents" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline">
            View All Vault <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {myDocs.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No documents uploaded yet. Use the uploader above to submit evidence.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold bg-slate-50">
                  <th className="py-3 px-3">Document Name</th>
                  <th className="py-3 px-3">Sub-Criterion</th>
                  <th className="py-3 px-3">Validation Status</th>
                  <th className="py-3 px-3">Feedback / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {myDocs.slice(0, 5).map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-3 font-bold text-slate-900 flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{doc.original_name || doc.filename}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-blue-700 font-bold">Sub-{doc.sub_criterion}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        doc.validation_status === 'Fully Validated' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        doc.validation_status === 'Pending Principal Validation' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        doc.validation_status?.includes('Rejected') ? 'bg-rose-100 text-rose-800 border-rose-200' :
                        'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {doc.validation_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {doc.rejection_reason ? <span className="text-rose-600 font-medium">Rejection: {doc.rejection_reason}</span> : 'In Workflow'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const HodDashboard = ({ overview, user, fetchOverview }) => {
  const [deptDocs, setDeptDocs] = useState([]);
  const [validatingId, setValidatingId] = useState(null);

  const loadDeptDocs = () => {
    documentAPI.list('All').then(res => setDeptDocs(res.data)).catch(console.error);
  };

  useEffect(() => {
    loadDeptDocs();
  }, []);

  const handleQuickApprove = async (id) => {
    setValidatingId(id);
    try {
      await documentAPI.validateHod(id);
      loadDeptDocs();
      fetchOverview();
    } catch (err) {
      console.error(err);
    } finally {
      setValidatingId(null);
    }
  };

  const pendingHod = deptDocs.filter(d => d.validation_status === 'Pending HOD Validation');

  return (
    <div className="space-y-8 pb-12">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white glass-panel border border-blue-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>HOD Department Academic Review ({user.department})</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            Head of Department Verification Hub
          </h1>
          <p className="text-sm text-slate-600 font-medium max-w-2xl">
            Review faculty uploaded documents from {user.department}, validate evidence completeness, and approve or reject submissions before Principal validation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Department Documents" value={deptDocs.length} subtitle={user.department} icon={FileCheck} color="blue" />
        <MetricCard title="Pending HOD Review" value={pendingHod.length} subtitle="Requires Action" icon={AlertTriangle} color="amber" />
        <MetricCard title="Approved to Principal" value={deptDocs.filter(d => d.hod_validated).length} subtitle="Stage 1 Verified" icon={CheckCircle} color="emerald" />
        <MetricCard title="Rejections" value={deptDocs.filter(d => d.validation_status === 'Rejected by HOD').length} subtitle="Returned to Faculty" icon={XCircle} color="rose" />
      </div>

      {/* Pending HOD Review Queue */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Pending HOD Validation Queue ({pendingHod.length})
          </h3>
          <Link to="/documents" className="text-xs font-bold text-blue-600 hover:underline">
            Manage All Documents
          </Link>
        </div>

        {pendingHod.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No pending department documents awaiting HOD validation.</p>
        ) : (
          <div className="space-y-3">
            {pendingHod.map(doc => (
              <div key={doc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">[{doc.sub_criterion}] {doc.original_name || doc.filename}</p>
                  <p className="text-slate-500">Uploaded by: {doc.owner_name || 'Faculty Member'} ({doc.owner_department || user.department})</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleQuickApprove(doc.id)}
                    disabled={validatingId === doc.id}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {validatingId === doc.id ? 'Approving...' : 'Approve Stage 1'}
                  </button>
                  <Link to="/documents" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 border border-blue-200">
                    Review Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>

  );
};

const PrincipalDashboard = ({ overview, user, fetchOverview }) => {
  const { overall_quality_score, overall_cgpa, overall_readiness, total_documents, total_gaps, sub_criteria_analyses, recent_gaps, recent_recommendations } = overview;
  const [reanalyzing, setReanalyzing] = useState(false);
  const [pendingPrinDocs, setPendingPrinDocs] = useState([]);

  useEffect(() => {
    documentAPI.list('All', 'Pending Principal Validation').then(res => setPendingPrinDocs(res.data)).catch(console.error);
  }, []);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await criterionAPI.reanalyze();
      await fetchOverview();
    } catch (err) {
      console.error(err);
    } finally {
      setReanalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white glass-panel border border-purple-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Principal Executive Accreditation Office</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900">
            Institutional NAAC Criterion 1 Readiness
          </h1>
          <p className="text-sm text-slate-600 font-medium max-w-2xl">
            Final institutional approval hub. Validating evidence triggers the 5-Agent LangGraph AI Pipeline and updates CGPA evaluation scores.
          </p>
          <div className="pt-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center space-x-2 cursor-pointer"
            >
              {reanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
              <span>Re-run Agentic AI Analysis</span>
            </button>
          </div>
        </div>

        <div className="z-10 bg-white p-6 rounded-2xl border border-slate-200 text-center min-w-[240px] shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Criterion 1 Overall Readiness</span>
          <div className="text-4xl font-black text-blue-700 mt-1 flex items-baseline justify-center">
            {overall_quality_score}%
          </div>
          <p className="text-xs font-bold text-slate-700 mt-1">{overall_readiness}</p>
          <Link to="/evidence-matrix" className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all">
            View Evidence Matrix <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Historical Academic Year Trend & Evidence Checklist Counters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Required Evidence Checklist</h4>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-xl font-black text-blue-700">{overview.evidence_checklist?.required_total || 52}</span>
              <p className="text-[11px] text-slate-600 font-medium">Required Items</p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-xl font-black text-emerald-700">{overview.evidence_checklist?.available || 43}</span>
              <p className="text-[11px] text-slate-600 font-medium">Available Evidence</p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-xl font-black text-rose-700">{overview.evidence_checklist?.missing || 9}</span>
              <p className="text-[11px] text-slate-600 font-medium">Missing Evidence</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-xl font-black text-amber-700">{overview.evidence_checklist?.partial || 7}</span>
              <p className="text-[11px] text-slate-600 font-medium">Partial Evidence</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Readiness Growth (3-Year Audit Trend)</h4>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">+17% Improvement</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center pt-1">
            {[
              { year: '2023-24', score: 64, docs: 28, status: 'B++ Grade' },
              { year: '2024-25', score: 72, docs: 36, status: 'A Grade' },
              { year: '2025-26 (Current)', score: 81, docs: 43, status: 'A+ Grade' }
            ].map(h => (
              <div key={h.year} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-600">{h.year}</span>
                <div className="text-2xl font-extrabold text-slate-900">{h.score}%</div>
                <p className="text-[10px] text-slate-500">{h.docs} Docs | {h.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Principal Final Approval Queue */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            Pending Principal Final Validation Queue ({pendingPrinDocs.length})
          </h3>
          <Link to="/documents" className="text-xs font-bold text-purple-600 hover:underline">
            View All Documents
          </Link>
        </div>

        {pendingPrinDocs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No documents awaiting Principal approval. All verified evidence has been processed by AI.</p>
        ) : (
          <div className="space-y-3">
            {pendingPrinDocs.map(doc => (
              <div key={doc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">[{doc.sub_criterion}] {doc.original_name || doc.filename}</p>
                  <p className="text-slate-500">HOD Validated by: {doc.hod_validated_by || 'HOD'} | Dept: {doc.owner_department}</p>
                </div>
                <Link to="/documents" className="px-3 py-1.5 rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-700">
                  Approve & Run AI
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sub_criteria_analyses.map((analysis) => (
          <SubCriteriaCard key={analysis.sub_criterion} analysis={analysis} />
        ))}
      </div>
    </div>
  );
};

const AdminDashboard = ({ overview, user, fetchOverview }) => {
  const { total_documents, total_gaps } = overview;
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    authAPI.listUsers().then(res => setAllUsers(res.data)).catch(console.error);
  }, []);

  const facultyCount = allUsers.filter(u => u.role === 'Faculty').length;
  const hodCount = allUsers.filter(u => u.role === 'HOD').length;
  const principalCount = allUsers.filter(u => u.role === 'Principal').length;
  const adminCount = allUsers.filter(u => u.role === 'Administrator').length;

  return (
    <div className="space-y-8 pb-12">
      <div className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white glass-panel border border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-900/80 text-purple-200 border border-purple-700 text-xs font-bold">
            <Users className="w-4 h-4 text-purple-400" />
            <span>System Administrator Command Center</span>
          </div>
          <h1 className="text-3xl font-black text-white">
            CampusInsight AI System Administration
          </h1>
          <p className="text-sm text-slate-300 font-medium max-w-2xl">
            Technical system management, account permissions, user creation, and infrastructure monitoring.
          </p>
        </div>
        <Link to="/manage-users" className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center gap-2">
          <Users className="w-4 h-4" /> Manage System Users
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Faculty Users" value={facultyCount} subtitle="Evidence Submitters" icon={Users} color="emerald" />
        <MetricCard title="HOD Users" value={hodCount} subtitle="Stage 1 Reviewers" icon={Users} color="blue" />
        <MetricCard title="Principal Users" value={principalCount} subtitle="Stage 2 Approvers" icon={Award} color="purple" />
        <MetricCard title="Total Evidence Docs" value={total_documents} subtitle="FAISS Vector Store" icon={FileCheck} color="amber" />
      </div>

      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Registered System Accounts ({allUsers.length})</h3>
          <Link to="/manage-users" className="text-xs font-bold text-purple-600 hover:underline">
            Manage Roles & Accounts
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold bg-slate-50">
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allUsers.slice(0, 6).map(u => (
                <tr key={u.id}>
                  <td className="py-3 px-3 font-bold text-slate-900">{u.full_name}</td>
                  <td className="py-3 px-3 font-mono text-slate-600">{u.email}</td>
                  <td className="py-3 px-3 font-bold">{u.role}</td>
                  <td className="py-3 px-3">{u.department}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getOverview();
      setOverview(res.data);
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading || !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Synthesizing NAAC Criterion 1 Data & Role Dashboard...</p>
        </div>
      </div>
    );
  }

  switch (user?.role) {
    case 'Faculty':
      return <FacultyDashboard overview={overview} user={user} fetchOverview={fetchOverview} />;
    case 'HOD':
      return <HodDashboard overview={overview} user={user} fetchOverview={fetchOverview} />;
    case 'Principal':
      return <PrincipalDashboard overview={overview} user={user} fetchOverview={fetchOverview} />;
    case 'Administrator':
      return <AdminDashboard overview={overview} user={user} fetchOverview={fetchOverview} />;
    default:
      return <FacultyDashboard overview={overview} user={user} fetchOverview={fetchOverview} />;
  }
};

export default Dashboard;
