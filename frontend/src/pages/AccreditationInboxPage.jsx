import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Inbox, CheckCircle2, AlertCircle, Clock, ArrowRight, ShieldCheck, Mail, RefreshCw, Send, Plus, Trash2, X, User, CornerUpLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api, { authAPI } from '../services/api';
import PrincipalValidationModal from '../components/PrincipalValidationModal';

const ComposeMailModal = ({ isOpen, onClose, onSent }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [recipientRole, setRecipientRole] = useState('Faculty');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Direct');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      authAPI.listUsers().then(res => setUsers(res.data)).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      alert("Please provide both subject and message body.");
      return;
    }

    setSending(true);
    try {
      await api.post('/inbox/send', {
        recipient_user_id: recipientUserId ? parseInt(recipientUserId) : null,
        recipient_email: recipientEmail || null,
        recipient_role: recipientRole || null,
        category: category,
        subject: subject,
        body: body
      });
      alert("🎉 Real accreditation mail dispatched successfully!");
      onSent();
      onClose();
      setSubject('');
      setBody('');
    } catch (err) {
      console.error(err);
      alert("Failed to send mail: " + (err.response?.data?.detail || err.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            Compose Accreditation Mail & Notification
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Role</label>
              <select
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="All">All Users</option>
                <option value="Faculty">Faculty Members</option>
                <option value="HOD">Heads of Department (HOD)</option>
                <option value="Principal">Principal Executive Office</option>
                <option value="Administrator">System Administrator</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Specific User (Optional)</label>
              <select
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="">Any in Role</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.role} - {u.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Custom Recipient Email (Optional)</label>
            <input
              type="email"
              placeholder="e.g. principal@institution.edu"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject</label>
            <input
              type="text"
              required
              placeholder="e.g. Request for BOS Meeting Minutes 2024-25"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Message Body</label>
            <textarea
              required
              rows={4}
              placeholder="Write your official accreditation request or clarification details here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-800 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md disabled:opacity-50 flex items-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Dispatching Email...' : 'Send Mail'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AccreditationInboxPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState('inbox'); // inbox, unread, sent
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [inboxReviewDocId, setInboxReviewDocId] = useState(null);

  const fetchInbox = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inbox?folder=${folder}&category=${categoryFilter}`);
      setMessages(res.data || []);
    } catch (err) {
      console.error("Failed to load inbox:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbox();
  }, [folder, categoryFilter]);

  const markAsRead = async (msgId) => {
    try {
      await api.patch(`/inbox/${msgId}/read`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_read: true } : m));
    } catch (err) {
      console.error("Error marking read:", err);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/inbox/read-all');
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  const deleteMessage = async (msgId, e) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`/inbox/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
      if (selectedMessage?.id === msgId) setSelectedMessage(null);
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleSelectMessage = (msg) => {
    setSelectedMessage(msg);
    if (!msg.is_read) markAsRead(msg.id);
  };

  return (
    <div className="space-y-6">
      <ComposeMailModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSent={fetchInbox}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-3xl bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white shadow-xl">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Inbox className="w-3.5 h-3.5" />
            <span>CampusInsight AI Real Mail & Notification System</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Accreditation Inbox & Messaging</h1>
          <p className="text-sm text-slate-300">
            Real internal accreditation email system with async SMTP notifications for Faculty, HOD, Principal, and Admin.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg border border-blue-400/30"
          >
            <Plus className="w-4 h-4" />
            <span>Compose Mail</span>
          </button>
          <button
            onClick={markAllRead}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold transition-all backdrop-blur-md"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Mark All Read</span>
          </button>
          <button
            onClick={fetchInbox}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all"
            title="Refresh Mailbox"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Mailbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mail Navigation & List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Folders Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-2 overflow-x-auto">
            <div className="flex space-x-1">
              {[
                { id: 'inbox', label: 'Inbox' },
                { id: 'unread', label: 'Unread' },
                { id: 'sent', label: 'Sent Mail' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFolder(f.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    folder === f.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="p-2 rounded-xl border border-slate-200 text-xs font-bold bg-white text-slate-700"
            >
              <option value="All">All Categories</option>
              <option value="Approval">Approval</option>
              <option value="Gap">Gap</option>
              <option value="Evidence">Evidence</option>
              <option value="Direct">Direct Mail</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Message List */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-sm glass-card rounded-2xl">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="p-12 text-center glass-card rounded-3xl space-y-3">
                <Mail className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">No Messages in {folder}</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your mailbox is empty for this folder. Compose a new message or await workflow updates.
                </p>
              </div>
            ) : (
              messages.map(msg => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                        : !msg.is_read
                        ? 'bg-blue-50/50 border-blue-200 shadow-xs hover:border-blue-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        msg.category === 'Approval' ? 'bg-amber-100 text-amber-700' :
                        msg.category === 'Gap' ? 'bg-rose-100 text-rose-700' :
                        msg.category === 'Direct' ? 'bg-indigo-100 text-indigo-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {msg.category === 'Approval' ? <Clock className="w-4 h-4" /> :
                         msg.category === 'Gap' ? <AlertCircle className="w-4 h-4" /> :
                         <Mail className="w-4 h-4" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{msg.sender_name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-200 text-slate-700">
                            {msg.category}
                          </span>
                          {!msg.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900">{msg.subject}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1">{msg.body}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={(e) => deleteMessage(msg.id, e)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Delete Mail"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Message Detail Drawer (1 Col) */}
        <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white space-y-4 min-h-[400px]">
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Message Detail</span>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-bold text-slate-900">{selectedMessage.subject}</h3>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <p><span className="font-bold text-slate-700">From:</span> {selectedMessage.sender_name}</p>
                  <p><span className="font-bold text-slate-700">Category:</span> {selectedMessage.category}</p>
                  <p><span className="font-bold text-slate-700">Date:</span> {new Date(selectedMessage.created_at).toLocaleString()}</p>
                  {selectedMessage.recipient_email && (
                    <p><span className="font-bold text-slate-700">To Email:</span> {selectedMessage.recipient_email}</p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                {selectedMessage.body}
              </div>

              {selectedMessage.target_type && (
                <div className="pt-2 space-y-2">
                  {['Principal', 'Administrator'].includes(user?.role) && selectedMessage.target_type === 'Document' && selectedMessage.target_id && (
                    <button
                      onClick={() => setInboxReviewDocId(parseInt(selectedMessage.target_id))}
                      className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-200" />
                      <span>Review Evidence & Validate (Principal Review)</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (selectedMessage.target_type === 'Document') navigate('/documents');
                      else if (selectedMessage.target_type === 'Gap' || selectedMessage.target_type === 'Metric') navigate('/gaps-recommendations');
                    }}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Go to {selectedMessage.target_type} Vault</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
              <Mail className="w-12 h-12 text-slate-300" />
              <p className="text-xs font-bold text-slate-600">Select a message to view full contents</p>
              <p className="text-[11px] text-slate-400">Click any email in your mailbox list to inspect thread and action details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Principal Evidence Review Modal from Inbox */}
      {inboxReviewDocId && (
        <PrincipalValidationModal
          docId={inboxReviewDocId}
          onClose={() => setInboxReviewDocId(null)}
          onSuccess={fetchInbox}
        />
      )}
    </div>
  );
};

export default AccreditationInboxPage;
