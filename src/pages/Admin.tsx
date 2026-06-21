import React, { useState, useEffect } from 'react';
import { getDb, saveDb } from '../mockData';
import type { Session, UserRole } from '../types';
import { 
  Users, Calendar, FileText, 
  Search, Plus, Trash2, CheckCircle2, AlertTriangle, Video, Clock, Database
} from 'lucide-react';

interface AdminProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Admin: React.FC<AdminProps> = ({ currentPath }) => {
  const [db, setDb] = useState(() => getDb());

  useEffect(() => {
    const handleStorageChange = () => {
      setDb(getDb());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Derive active tab from the URL path
  const activeTab = (() => {
    if (currentPath === '/admin/users') return 'users';
    if (currentPath === '/admin/sessions') return 'sessions';
    if (currentPath === '/admin/reports') return 'reports';
    if (currentPath === '/admin/activity') return 'activity';
    if (currentPath === '/admin/audit') return 'audit';
    if (currentPath === '/admin/settings') return 'settings';
    return 'overview';
  })();
  
  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Form states for creating a session
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [sessionSubject, setSessionSubject] = useState('');
  const [sessionGrade, setSessionGrade] = useState('');
  const [sessionTeacherId, setSessionTeacherId] = useState('');
  const [sessionStudentId, setSessionStudentId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form states for Settings
  const [sessionDuration, setSessionDuration] = useState(() => getDb().settings.sessionDuration);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(() => getDb().settings.maxSessionsPerDay);
  const [newSubject, setNewSubject] = useState('');
  const [newGrade, setNewGrade] = useState('');

  // Compute metrics
  const teachersCount = db.users.filter(u => u.role === 'teacher').length;
  const studentsCount = db.users.filter(u => u.role === 'student').length;
  const totalSessionsCount = db.sessions.length;
  const completedSessionsCount = db.sessions.filter(s => s.status === 'completed').length;
  
  // Handlers
  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const updatedUsers = db.users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    const updatedDb = { ...db, users: updatedUsers };
    
    // Log the event
    const userObj = db.users.find(u => u.id === userId);
    const logEvent = {
      id: 'l_' + Date.now(),
      type: 'role_change' as const,
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المدير',
      detail: `تغيير دور المستخدم "${userObj?.name}" إلى "${newRole}"`
    };
    updatedDb.logs = [logEvent, ...db.logs];

    saveDb(updatedDb);
    setDb(updatedDb);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionDate || !sessionTime || !sessionSubject || !sessionTeacherId || !sessionStudentId) {
      alert('يرجى ملء كافة حقول الجلسة');
      return;
    }

    const teacher = db.users.find(u => u.id === sessionTeacherId);
    const student = db.users.find(u => u.id === sessionStudentId);

    const newSession: Session = {
      id: 's_' + Date.now(),
      date: sessionDate,
      time: sessionTime,
      duration: db.settings.sessionDuration,
      subject: sessionSubject,
      grade: sessionGrade || 'غير محدد',
      status: 'confirmed',
      teacherId: sessionTeacherId,
      teacherName: teacher?.name || 'غير معروف',
      studentId: sessionStudentId,
      studentName: student?.name || 'غير معروف',
      zoomUrl: 'https://us05web.zoom.us/j/' + Math.floor(1000000000 + Math.random() * 9000000000)
    };

    const updatedSessions = [newSession, ...db.sessions];
    const logEvent = {
      id: 'l_' + Date.now(),
      type: 'session_booking' as const,
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المدير',
      detail: `حجز جلسة جديدة: ${sessionSubject} لـ ${student?.name} مع ${teacher?.name} في ${sessionDate}`
    };

    const updatedDb = { ...db, sessions: updatedSessions, logs: [logEvent, ...db.logs] };
    saveDb(updatedDb);
    setDb(updatedDb);
    
    // Reset form
    setShowCreateForm(false);
    setSessionDate('');
    setSessionTime('');
    setSessionSubject('');
    setSessionGrade('');
    setSessionTeacherId('');
    setSessionStudentId('');
  };

  const handleDeleteSubject = (subj: string) => {
    const filtered = db.settings.subjects.filter(s => s !== subj);
    const updatedDb = { ...db, settings: { ...db.settings, subjects: filtered } };
    saveDb(updatedDb);
    setDb(updatedDb);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    if (db.settings.subjects.includes(newSubject.trim())) return;
    
    const updatedDb = { 
      ...db, 
      settings: { ...db.settings, subjects: [...db.settings.subjects, newSubject.trim()] } 
    };
    saveDb(updatedDb);
    setDb(updatedDb);
    setNewSubject('');
  };

  const handleDeleteGrade = (grade: string) => {
    const filtered = db.settings.grades.filter(g => g !== grade);
    const updatedDb = { ...db, settings: { ...db.settings, grades: filtered } };
    saveDb(updatedDb);
    setDb(updatedDb);
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGrade.trim()) return;
    if (db.settings.grades.includes(newGrade.trim())) return;

    const updatedDb = { 
      ...db, 
      settings: { ...db.settings, grades: [...db.settings.grades, newGrade.trim()] } 
    };
    saveDb(updatedDb);
    setDb(updatedDb);
    setNewGrade('');
  };

  const handleSaveSettings = () => {
    const updatedDb = {
      ...db,
      settings: {
        ...db.settings,
        sessionDuration,
        maxSessionsPerDay
      }
    };
    saveDb(updatedDb);
    setDb(updatedDb);
    alert('تم حفظ إعدادات المنصة بنجاح!');
  };

  // Filters for User tables
  const filteredUsers = db.users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ width: '100%', padding: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>إدارة المنصة والأكاديمية 🛠️</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>تحكم كامل بمستخدمي النظام، الجلسات المجدولة، سجل الأمان، والضبط العام</p>
        </div>
      </div>

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div>
            <div className="metrics-grid">
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">المعلمون النشطون</span>
                  <span className="metric-value">{teachersCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: '#3b82f6' }}><Users size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">إجمالي الطلاب</span>
                  <span className="metric-value">{studentsCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: '#10b981' }}><Users size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">إجمالي الجلسات</span>
                  <span className="metric-value">{totalSessionsCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: '#a7f3d0' }}><Calendar size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">جلسات اليوم</span>
                  <span className="metric-value">0</span>
                </div>
                <div className="metric-icon-box" style={{ color: '#f59e0b' }}><Clock size={24} /></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>جلسات اليوم</h3>
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Calendar size={32} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                  <span>لا توجد جلسات مجدولة لليوم في المنصة.</span>
                </div>
              </div>
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>أفضل المعلمين أداءً</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Mohamed Omar</span>
                      <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.85rem' }}>★ 5.0 (١ جلسة)</span>
                    </div>
                    <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Admin Owner</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>★ 0.0 (٠ جلسة)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>توزيع الطلاب بالدولة</h3>
                  <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    لا توجد بيانات كافية لعرضها بعد.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Users List & Role switching */}
        {activeTab === 'users' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', right: '1rem', top: '0.85rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="البحث بالاسم أو البريد الإلكتروني..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
              </div>
              <select 
                className="form-select" 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ width: '180px' }}
              >
                <option value="all">جميع الأدوار</option>
                <option value="admin">مدير (Admin)</option>
                <option value="supervisor">مشرف (Supervisor)</option>
                <option value="teacher">معلم (Teacher)</option>
                <option value="student">طالب (Student)</option>
              </select>
            </div>

            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>الدور الحالي</th>
                    <th>الحالة</th>
                    <th>تغيير الدور</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: user.role === 'admin' ? 'rgba(16, 185, 129, 0.15)' : user.role === 'supervisor' ? 'rgba(236, 72, 153, 0.15)' : user.role === 'teacher' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.05)',
                          color: user.role === 'admin' ? 'var(--primary)' : user.role === 'supervisor' ? '#ec4899' : user.role === 'teacher' ? '#3b82f6' : 'var(--text-muted)'
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span style={{ color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle2 size={12} />
                          <span>نشط</span>
                        </span>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          style={{ padding: '0.35rem 0.5rem', width: '130px', fontSize: '0.8rem' }}
                        >
                          <option value="admin">ADMIN</option>
                          <option value="supervisor">SUPERVISOR</option>
                          <option value="teacher">TEACHER</option>
                          <option value="student">STUDENT</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Sessions List & Scheduler */}
        {activeTab === 'sessions' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>إدارة الجلسات والدروس</h3>
              <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                <Plus size={16} />
                <span>{showCreateForm ? 'إلغاء' : 'إنشاء جلسة جديدة'}</span>
              </button>
            </div>

            {/* Create Session Form Drawer */}
            {showCreateForm && (
              <form onSubmit={handleCreateSession} className="glass-card" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', alignItems: 'end' }}>
                <div className="form-group">
                  <label className="form-label">التاريخ</label>
                  <input type="date" className="form-input" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">الوقت</label>
                  <input type="time" className="form-input" value={sessionTime} onChange={(e) => setSessionTime(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">المادة</label>
                  <select className="form-select" value={sessionSubject} onChange={(e) => setSessionSubject(e.target.value)}>
                    <option value="">اختر المادة</option>
                    {db.settings.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">المعلم</label>
                  <select className="form-select" value={sessionTeacherId} onChange={(e) => setSessionTeacherId(e.target.value)}>
                    <option value="">اختر المعلم</option>
                    {db.users.filter(u => u.role === 'teacher' || u.role === 'admin').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الطالب</label>
                  <select className="form-select" value={sessionStudentId} onChange={(e) => setSessionStudentId(e.target.value)}>
                    <option value="">اختر الطالب</option>
                    {db.users.filter(u => u.role === 'student').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">الصف الدراسي</label>
                  <select className="form-select" value={sessionGrade} onChange={(e) => setSessionGrade(e.target.value)}>
                    <option value="">اختر الصف (اختياري)</option>
                    {db.settings.grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ gridColumn: 'span 3', height: '44px' }}>تأكيد وحجز الجلسة</button>
              </form>
            )}

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {db.sessions.map((session) => (
                <div key={session.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem'
                }}>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>التاريخ والوقت</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.date} в الساعة {session.time}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>المادة والصف</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.subject} ({session.grade})</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>المعلم</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.teacherName}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>الطالب</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{session.studentName}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: session.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : session.status === 'confirmed' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: session.status === 'completed' ? 'var(--success)' : session.status === 'confirmed' ? 'var(--info)' : 'var(--warning)'
                    }}>
                      {session.status === 'completed' ? 'مكتملة' : session.status === 'confirmed' ? 'مؤكدة' : 'تم التذكير'}
                    </span>
                    
                    {session.zoomUrl && (
                      <a href={session.zoomUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Video size={14} />
                        <span>رابط الفصل</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Reports & Analytics summary */}
        {activeTab === 'reports' && (
          <div>
            <div className="metrics-grid">
              <div className="glass-card metric-card">
                <div className="metric-info">
                  <span className="metric-label">إجمالي الجلسات</span>
                  <span className="metric-value">{totalSessionsCount}</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-info">
                  <span className="metric-label">جلسات مكتملة</span>
                  <span className="metric-value">{completedSessionsCount}</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-info">
                  <span className="metric-label">جلسات ملغاة</span>
                  <span className="metric-value">0</span>
                </div>
              </div>
              <div className="glass-card metric-card">
                <div className="metric-info">
                  <span className="metric-label">معدل الحضور</span>
                  <span className="metric-value">100%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>توزيع حالات الجلسات</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>الجلسات المكتملة</span>
                      <span>{completedSessionsCount} جلسة ({Math.round(completedSessionsCount/totalSessionsCount*100)}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${completedSessionsCount/totalSessionsCount*100}%`, height: '100%', background: 'var(--success)' }}></div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      <span>الجلسات المجدولة والمؤكدة</span>
                      <span>{totalSessionsCount - completedSessionsCount} جلسة ({Math.round((totalSessionsCount-completedSessionsCount)/totalSessionsCount*100)}%)</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${(totalSessionsCount-completedSessionsCount)/totalSessionsCount*100}%`, height: '100%', background: 'var(--info)' }}></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>مخطط الدروس اليومي</h3>
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  رسم بياني توزيع الدروس حسب أيام الأسبوع (قيد المحاكاة).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Platform Logs & Activity */}
        {activeTab === 'activity' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>سجل نشاط النظام والمراجعة الأمنية</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>تتبع الأنشطة في المنصة وتفاصيل عمليات الحظر التلقائي لمحاولات مشاركة معلومات الاتصال الشخصية</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {db.logs.map((log) => (
                <div key={log.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: log.type === 'contact_block' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                  border: log.type === 'contact_block' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '1rem 1.25rem'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: log.type === 'contact_block' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)',
                    color: log.type === 'contact_block' ? 'var(--danger)' : 'var(--text-muted)'
                  }}>
                    {log.type === 'contact_block' ? <AlertTriangle size={18} /> : <FileText size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.detail}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>بواسطة: {log.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab audit: Security Audit Logs */}
        {activeTab === 'audit' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} style={{ color: 'var(--primary)' }} />
              <span>سجل المراجعة الأمنية والنظام (Audit Log)</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              سجل كامل للعمليات الحساسة في المنصة بما في ذلك تغيير أدوار المستخدمين وحظر محاولات التواصل وتعديل إعدادات النظام.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {db.logs.filter(l => l.type === 'role_change' || l.type === 'contact_block').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  لا توجد عمليات مراجعة أمنية مسجلة حالياً.
                </div>
              ) : (
                db.logs.filter(l => l.type === 'role_change' || l.type === 'contact_block').map((log) => (
                  <div key={log.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: log.type === 'contact_block' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.03)',
                    border: log.type === 'contact_block' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.1)',
                    borderRadius: '10px',
                    padding: '1rem 1.25rem'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: log.type === 'contact_block' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      color: log.type === 'contact_block' ? 'var(--danger)' : 'var(--success)'
                    }}>
                      {log.type === 'contact_block' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{log.detail}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>نوع العملية: {log.type === 'role_change' ? 'تغيير الصلاحيات' : 'تنبيه أمني'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Settings panel (Subjects / Classes / Durations) */}
        {activeTab === 'settings' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الإعدادات العامة للدروس</h3>
              
              <div className="form-group">
                <label className="form-label">مدة الجلسة الافتراضية (بالدقائق)</label>
                <input
                  type="number"
                  className="form-input"
                  value={sessionDuration}
                  onChange={(e) => setSessionDuration(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحد الأقصى للجلسات اليومية لكل معلم</label>
                <input
                  type="number"
                  className="form-input"
                  value={maxSessionsPerDay}
                  onChange={(e) => setMaxSessionsPerDay(Number(e.target.value))}
                />
              </div>

              <button onClick={handleSaveSettings} className="btn-primary" style={{ marginTop: '1rem' }}>حفظ جميع الإعدادات</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Subjects Config */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>المواد الدراسية</h3>
                
                <form onSubmit={handleAddSubject} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="أضف مادة جديدة..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }}><Plus size={16} /></button>
                </form>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {db.settings.subjects.map((s) => (
                    <span key={s} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      <span>{s}</span>
                      <button onClick={() => handleDeleteSubject(s)} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Grades/Classes Config */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الصفوف الدراسية</h3>
                
                <form onSubmit={handleAddGrade} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="أضف صفاً دراسياً جديداً..."
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '0 1rem' }}><Plus size={16} /></button>
                </form>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {db.settings.grades.map((g) => (
                    <span key={g} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-color)',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem'
                    }}>
                      <span>{g}</span>
                      <button onClick={() => handleDeleteGrade(g)} style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
