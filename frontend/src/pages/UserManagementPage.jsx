import React, { useEffect, useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, CheckCircle2, Loader2, UserPlus, AlertCircle, Shield } from 'lucide-react';

const UserManagementPage = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Role Change Confirmation Modal State
  const [pendingRoleChange, setPendingRoleChange] = useState(null);

  // New User Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: 'password123',
    role: 'Faculty',
    department: 'Computer Science & Engineering'
  });
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authAPI.listUsers();
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const initiateRoleChange = (targetUser, newRole) => {
    if (targetUser.role === newRole) return;
    setPendingRoleChange({ targetUser, newRole });
  };

  const handleConfirmedRoleChange = async () => {
    if (!pendingRoleChange) return;
    const { targetUser, newRole } = pendingRoleChange;
    setUpdatingId(targetUser.id);
    setMessage(null);
    setErrorMessage(null);
    try {
      const res = await authAPI.updateUserRole(targetUser.id, newRole, true);
      setMessage(`Role updated to '${res.data.role}' for ${res.data.full_name}`);
      setPendingRoleChange(null);
      fetchUsers();
    } catch (err) {
      console.error("Role update failed:", err);
      const detail = err.response?.data?.detail || "Failed to update role.";
      setErrorMessage(detail);
      alert(detail);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await authAPI.createUser(newUser);
      setMessage(`New ${res.data.role} account created for ${res.data.full_name}`);
      setIsModalOpen(false);
      setNewUser({
        email: '',
        full_name: '',
        password: 'password123',
        role: 'Faculty',
        department: 'Computer Science & Engineering'
      });
      fetchUsers();
    } catch (err) {
      console.error("User creation failed:", err);
      alert(err.response?.data?.detail || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  if (currentUser?.role !== 'Administrator') {
    return (
      <div className="p-8 rounded-3xl glass-panel bg-white border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          User Management (Roles & Access) is reserved strictly for System Administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            System Administration & User Management
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage institutional user accounts, assign roles (Faculty, HOD, Principal, Admin), and set department permissions.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md flex items-center space-x-2 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Role Definitions Reference Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
          <span className="font-bold text-emerald-900 block">👨‍🏫 Faculty</span>
          <p className="text-emerald-700 font-medium">Uploads institutional evidence & tracks document validation status.</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs space-y-1">
          <span className="font-bold text-blue-900 block">🎓 HOD (Head of Dept)</span>
          <p className="text-blue-700 font-medium">Reviews & Validates/Rejects department evidence (Stage 1 academic review).</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
          <span className="font-bold text-amber-900 block">🏛️ Principal</span>
          <p className="text-amber-800 font-medium">Highest institutional approval authority: provides final institutional authorization for accreditation evidence.</p>
        </div>
        <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 text-xs space-y-1">
          <span className="font-bold text-purple-900 block">🔑 Administrator</span>
          <p className="text-purple-700 font-medium">Highest system and administrative authority: user management, evidence governance, audit log inspection, and system health monitoring.</p>
        </div>
      </div>

      {/* Registered Users Table */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-200 bg-white shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Institutional Accounts ({users.length})</h3>

        {loading ? (
          <div className="text-center py-10">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold bg-slate-50">
                  <th className="py-3 px-3">User Name & Email</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Current Assigned Role</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Reassign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3">
                      <p className="font-bold text-slate-900">{u.full_name}</p>
                      <p className="text-slate-500 font-mono text-[11px]">{u.email}</p>
                    </td>
                    <td className="py-3.5 px-3 font-medium text-slate-700">{u.department}</td>
                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                        u.role === 'Administrator' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                        u.role === 'Principal' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        u.role === 'HOD' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                        'bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
                        Active
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      {updatingId === u.id ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin ml-auto" />
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => initiateRoleChange(u, e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        >
                          <option value="Faculty">Faculty</option>
                          <option value="HOD">HOD</option>
                          <option value="Principal">Principal</option>
                          <option value="Administrator">Administrator</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create New User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Create Institutional User Account
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. rajesh.k@campusinsight.edu"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Assigned Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="Faculty">Faculty (Uploads Evidence)</option>
                  <option value="HOD">HOD (Department Validation)</option>
                  <option value="Principal">Principal (Final Academic Approval)</option>
                  <option value="Administrator">Administrator (System Admin)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                <input
                  type="text"
                  required
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold disabled:opacity-50 flex items-center space-x-1"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Create Account</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Modal */}
      {pendingRoleChange && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-2xl animate-fadeIn">
            <div className="flex items-center space-x-3 text-purple-700 border-b border-slate-100 pb-3">
              <Shield className="w-6 h-6 shrink-0 text-purple-600" />
              <h3 className="text-base font-bold text-slate-900">Change User Role?</h3>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs space-y-2">
              <p className="font-bold text-slate-900">
                User: <span className="text-purple-800">{pendingRoleChange.targetUser.full_name}</span> ({pendingRoleChange.targetUser.email})
              </p>
              <div className="flex items-center space-x-3 font-semibold pt-1">
                <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-700">Current: {pendingRoleChange.targetUser.role}</span>
                <span className="text-purple-600 font-extrabold">→</span>
                <span className="px-2.5 py-1 rounded bg-purple-600 text-white">New: {pendingRoleChange.newRole}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>Warning: This will change the user's system permissions and logged audit trail records.</span>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingRoleChange(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedRoleChange}
                disabled={updatingId === pendingRoleChange.targetUser.id}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-500/20 disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                {updatingId === pendingRoleChange.targetUser.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Confirm Role Change</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
