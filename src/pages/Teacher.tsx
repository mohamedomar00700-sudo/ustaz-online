import React, { useState, useEffect } from 'react';
import { getDb, saveDb } from '../mockData';
import type { ActivityLog } from '../types';
import { ChatSystem } from '../components/ChatSystem';
import { 
  Calendar, Bell, Save, Plus, Trash2
} from '../customIcons';

interface TeacherProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Teacher: React.FC<TeacherProps> = ({ currentPath, onNavigate }) => {
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
    if (currentPath === '/tutor/sessions') return 'sessions';
    if (currentPath === '/tutor/availability') return 'availability';
    if (currentPath === '/tutor/chat') return 'chat';
    if (currentPath === '/tutor/notifications') return 'notifications';
    if (currentPath === '/tutor/settings') return 'settings';
    if (currentPath === '/tutor/profile') return 'profile';
    return 'overview';
  })();

  const setActiveTab = (tab: string) => {
    if (tab === 'overview') {
      onNavigate('/tutor');
    } else {
      onNavigate(`/tutor/${tab}`);
    }
  };
  
  // Availability local states
  const [selectedDay, setSelectedDay] = useState<string>('الأحد');
  const [weeklySlots, setWeeklySlots] = useState<{ [day: string]: { id: string; from: string; to: string }[] }>({
    'الأحد': [{ id: '1', from: '15:00', to: '16:00' }],
    'الإثنين': [{ id: '2', from: '15:00', to: '16:00' }],
    'الثلاثاء': [{ id: '3', from: '15:00', to: '16:00' }],
    'الأربعاء': [{ id: '4', from: '15:00', to: '16:00' }],
    'الخميس': [],
    'الجمعة': [],
    'السبت': []
  });

  // Sessions sub-tab
  const [sessionSubTab, setSessionSubTab] = useState<'upcoming' | 'past'>('upcoming');

  // Rescheduling states
  const [reschedulingSessionId, setReschedulingSessionId] = useState<string | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Notifications state
  const [notificationsCount, setNotificationsCount] = useState(632);
  const [showNotifications, setShowNotifications] = useState(true);

  // Quiz/Assessment Creator States
  const [activeSessionForQuiz, setActiveSessionForQuiz] = useState<any | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<{ question: string; options: string[]; answer: number }[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newOptions, setNewOptions] = useState<string[]>(['', '', '', '']);
  const [newCorrectAnswer, setNewCorrectAnswer] = useState<number>(0);

  // Get dynamic teacher details
  const loggedInEmail = localStorage.getItem('ustaz_userEmail') || '';
  
  // Profile Form States initialized from database
  const [fullName, setFullName] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user ? user.name : 'معلّم';
  });
  const [country, setCountry] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user?.country || 'مصر';
  });
  const [timezone, setTimezone] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user?.timezone || 'Africa/Cairo';
  });



  const currentUser = db.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
  const currentUserId = currentUser?.id || '1';
  const currentUserName = currentUser?.name || 'معلّم';

  // Mascot message state
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  const awardPoints = (amount: number, message: string) => {
    const freshDb = getDb();
    const teacher = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    if (!teacher) return;
    const newXp = (teacher.xp || 0) + amount;

    const updatedBadges = [...(teacher.badges || [])];
    if (newXp >= 100 && !updatedBadges.includes('المعلم الملتزم')) {
      updatedBadges.push('المعلم الملتزم');
    }
    if (newXp >= 150 && !updatedBadges.includes('المختبر النشط')) {
      updatedBadges.push('المختبر النشط');
    }

    const updatedUsers = freshDb.users.map(u => {
      if (u.id === teacher.id) {
        return {
          ...u,
          xp: newXp,
          badges: updatedBadges,
          streak: (u.streak || 0) + (amount === 50 ? 1 : 0)
        };
      }
      return u;
    });

    const updatedDb = {
      ...freshDb,
      users: updatedUsers
    };

    saveDb(updatedDb);
    setDb(updatedDb);

    setMascotMessage(message);
    setTimeout(() => {
      setMascotMessage(prev => prev === message ? null : prev);
    }, 6000);
  };

  // Compute metrics
  const teacherSessions = db.sessions.filter(s => s.teacherId === currentUserId);
  const completedSessionsCount = teacherSessions.filter(s => s.status === 'completed').length;
  const upcomingSessions = teacherSessions.filter(s => s.status !== 'completed');
  const pastSessions = teacherSessions.filter(s => s.status === 'completed');

  // Confirm Attendance / Mark session as Completed!
  const handleConfirmAttendance = (sessionId: string) => {
    const session = db.sessions.find(s => s.id === sessionId);
    if (!session) return;

    // 1. Update session status to completed
    const updatedSessions = db.sessions.map(s => 
      s.id === sessionId ? { ...s, status: 'completed' as const } : s
    );

    // 2. Log in Activity Log
    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'general',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: currentUserName,
      detail: `تأكيد حضور الحصة: تم إنهاء حصة "${session.subject}" بنجاح مع الطالب "${session.studentName}"`
    };

    const updatedDb = {
      ...db,
      sessions: updatedSessions,
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
    
    awardPoints(50, `عمل رائع أستاذ! تم تأكيد الجلسة بنجاح، وحصلت على +50 نقطة للمعلم المتميز 🦉✨`);
  };

  // Availability slots CRUD
  const handleAddSlot = () => {
    const newSlot = {
      id: 'slot_' + Date.now(),
      from: '16:00',
      to: '17:00'
    };
    setWeeklySlots({
      ...weeklySlots,
      [selectedDay]: [...weeklySlots[selectedDay], newSlot]
    });
  };

  const handleDeleteSlot = (id: string) => {
    const filtered = weeklySlots[selectedDay].filter(slot => slot.id !== id);
    setWeeklySlots({
      ...weeklySlots,
      [selectedDay]: filtered
    });
  };

  const handleSaveAvailability = () => {
    alert('تم حفظ أوقات التوفر الأسبوعية الخاصة بك وتطبيقها على المنصة!');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = db.users.map(u => 
      u.id === '1' ? { ...u, name: fullName, country, timezone } : u
    );
    const updatedDb = { ...db, users: updatedUsers };
    saveDb(updatedDb);
    setDb(updatedDb);
    alert('تم تحديث الملف الشخصي بنجاح!');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingSessionId || !newRescheduleDate || !newRescheduleTime || !rescheduleReason) return;
    const session = db.sessions.find(s => s.id === reschedulingSessionId);
    if (!session) return;

    const newRequest = {
      id: 'r_' + Date.now(),
      sessionId: reschedulingSessionId,
      sessionDetails: `${session.subject} (${session.grade}) - مع الطالب ${session.studentName}`,
      proposedDate: newRescheduleDate,
      proposedTime: newRescheduleTime,
      status: 'pending' as const,
      reason: rescheduleReason
    };

    const newLog = {
      id: 'l_' + Date.now(),
      type: 'general' as const,
      timestamp: new Date().toLocaleString('ar-EG'),
      user: currentUserName,
      detail: `طلب المعلم إعادة جدولة حصة ${session.subject} إلى ${newRescheduleDate} الساعة ${newRescheduleTime}`
    };

    const updatedDb = {
      ...db,
      reschedules: [newRequest, ...db.reschedules],
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
    
    setReschedulingSessionId(null);
    setNewRescheduleDate('');
    setNewRescheduleTime('');
    setRescheduleReason('');
    alert('تم تقديم طلب إعادة الجدولة بنجاح للمشرف للمراجعة!');
  };

  return (
    <div style={{ width: '100%', padding: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>مرحباً بك، أستاذ {currentUserName} 👋</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إدارة الحصص المجدولة، تحديد التوفر، وإرسال الاختبارات لطلابك</p>
        </div>
      </div>

      {/* Mascot Alert Toast */}
      {mascotMessage && (
        <div className="fade-in" style={{
          position: 'fixed',
          bottom: '2rem',
          left: '2rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          background: 'rgba(30, 41, 59, 0.9)',
          border: '2px solid var(--primary)',
          borderRadius: '16px',
          padding: '1.25rem',
          maxWidth: '450px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)',
          direction: 'rtl'
        }}>
          <div style={{ fontSize: '2.5rem', filter: 'drop-shadow(0 0 8px var(--primary))', animation: 'mascotFloat 2s infinite' }}>🦉</div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.25rem', fontSize: '0.95rem' }}>أستاذ البومة (Ustaz Owl)</h4>
            <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', lineHeight: 1.5 }}>{mascotMessage}</p>
          </div>
          <button 
            onClick={() => setMascotMessage(null)}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', fontSize: '1.1rem' }}
          >
            ×
          </button>
        </div>
      )}

        {/* Tab 1: Overview Panel */}
        {activeTab === 'overview' && (
          <div>
            <style>{`
              @keyframes mascotFloat {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0px); }
              }
              .floating-mascot {
                animation: mascotFloat 3s ease-in-out infinite;
              }
            `}</style>

            {/* Gamified Teacher Stats Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem'
            }}>
              {/* Teacher Points Card */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>💎</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي نقاط الأداء</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{currentUser?.xp || 0} نقطة</strong>
                </div>
              </div>

              {/* Teacher Tier Card */}
              {(() => {
                const teacherPoints = currentUser?.xp || 0;
                let tutorTier = 'البرونزية (Bronze)';
                let tierColor = '#b45309';
                if (teacherPoints >= 1000) { tutorTier = 'البلاتينية (Platinum)'; tierColor = '#e2e8f0'; }
                else if (teacherPoints >= 500) { tutorTier = 'الذهبية (Gold)'; tierColor = '#f59e0b'; }
                else if (teacherPoints >= 200) { tutorTier = 'الفضية (Silver)'; tierColor = '#94a3b8'; }
                
                return (
                  <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>🏆</div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>الفئة الحالية</span>
                      <strong style={{ fontSize: '1.1rem', color: tierColor }}>الفئة {tutorTier}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Teaching Streak */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🔥</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>تواصل التدريس اليومي</span>
                  <strong style={{ fontSize: '1.2rem', color: '#f97316' }}>{currentUser?.streak || 0} أيام متتالية</strong>
                </div>
              </div>

              {/* Rating Card */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem', color: 'var(--warning)' }}>★</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>متوسط تقييم الطلاب</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>5.0 / 5.0</strong>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              
              {/* Right Column: Sessions & Availability */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '280px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>جلسات اليوم</h3>
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Calendar size={32} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <span>أهلاً أستاذ {currentUserName}. لا توجد جلسات لليوم. خصّص أوقاتك المتاحة لاستقبل طلاباً جدداً.</span>
                    <button onClick={() => setActiveTab('availability')} className="btn-primary" style={{ margin: '1.25rem auto 0', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>حدّد أوقات توفرك</button>
                  </div>
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>نظرة سريعة على التوفر الأسبوعي</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>الأحد</span>
                      <span style={{ color: 'var(--primary)' }}>15:00 - 16:00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>الإثنين</span>
                      <span style={{ color: 'var(--primary)' }}>15:00 - 16:00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>الثلاثاء</span>
                      <span style={{ color: 'var(--primary)' }}>15:00 - 16:00</span>
                    </div>
                    <button onClick={() => setActiveTab('availability')} className="btn-secondary" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', marginTop: '0.5rem' }}>تعديل المواعيد</button>
                  </div>
                </div>
              </div>

              {/* Left Column: Trophies Cabinet & Student Leaderboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Trophy Cabinet */}
                <div className="glass-card glowing">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>خزانة جوائز المعلم 🎓</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {[
                      { name: 'المعلم الملتزم', desc: 'تخطي ١٠٠ نقطة أداء بنجاح', icon: '🎓', color: '#10b981', unlocked: (currentUser?.xp || 0) >= 100 },
                      { name: 'محبوب الجماهير', desc: 'الحصول على مراجعات وتفاعلات ممتازة', icon: '🌟', color: '#f59e0b', unlocked: true },
                      { name: 'المختبر النشط', desc: 'نشر أول اختبار أو تقييم بنجاح', icon: '📝', color: '#3b82f6', unlocked: (currentUser?.xp || 0) >= 50 },
                      { name: 'المدرس المتألق', desc: 'تأكيد الحضور وإكمال الحصص الدراسية', icon: '💼', color: '#ec4899', unlocked: completedSessionsCount >= 1 }
                    ].map(trophy => (
                      <div
                        key={trophy.name}
                        style={{
                          background: trophy.unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
                          opacity: trophy.unlocked ? 1 : 0.4,
                          border: trophy.unlocked ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          padding: '0.75rem',
                          textAlign: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        title={trophy.desc}
                      >
                        <div style={{ fontSize: '2.2rem', marginBottom: '0.25rem', filter: trophy.unlocked ? 'none' : 'grayscale(100%)' }}>{trophy.icon}</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: trophy.unlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>{trophy.name}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{trophy.unlocked ? 'مكتمل' : 'مغلق'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Students Leaderboard */}
                <div className="glass-card glowing">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>متصدرو الطلاب تفاعلاً 🥇</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {db.users
                      .filter(u => u.role === 'student')
                      .map(u => ({
                        id: u.id,
                        name: u.name,
                        xp: u.xp || 0
                      }))
                      .sort((a, b) => b.xp - a.xp)
                      .slice(0, 3)
                      .map((student, idx) => (
                        <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600 }}>{idx + 1}. {student.name}</span>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{student.xp} XP</span>
                        </div>
                      ))}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Sessions List & Confirmation Actions */}
        {activeTab === 'sessions' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>جلساتي التعليمية</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>عرض وإدارة جلساتك القادمة والسابقة وتأكيد حضور الدروس</p>
              </div>
              
              <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button onClick={() => setSessionSubTab('upcoming')} className={`btn-secondary ${sessionSubTab === 'upcoming' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', border: 'none', background: sessionSubTab === 'upcoming' ? 'rgba(255,255,255,0.05)' : 'none' }}>القادمة ({upcomingSessions.length})</button>
                <button onClick={() => setSessionSubTab('past')} className={`btn-secondary ${sessionSubTab === 'past' ? 'active' : ''}`} style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', border: 'none', background: sessionSubTab === 'past' ? 'rgba(255,255,255,0.05)' : 'none' }}>السابقة ({pastSessions.length})</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(sessionSubTab === 'upcoming' ? upcomingSessions : pastSessions).map((s) => (
                <div key={s.id} style={{
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
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.date} في الساعة {s.time}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>المادة والصف</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.subject} ({s.grade})</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>الطالب</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.studentName}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: s.status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : s.status === 'confirmed' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: s.status === 'completed' ? 'var(--success)' : s.status === 'confirmed' ? 'var(--info)' : 'var(--warning)'
                    }}>
                      {s.status === 'completed' ? 'مكتملة' : s.status === 'confirmed' ? 'مؤكدة' : 'تم التذكير'}
                    </span>
                    
                    {s.status !== 'completed' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleConfirmAttendance(s.id)} className="btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                          <span>تأكيد الحضور</span>
                        </button>
                        <button onClick={() => {
                          setReschedulingSessionId(s.id);
                          setNewRescheduleDate(s.date);
                          setNewRescheduleTime(s.time);
                        }} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.2)' }}>
                          <span>إعادة جدولة</span>
                        </button>
                      </div>
                    ) : (() => {
                      const hasQuiz = db.assessments.some(a => a.sessionId === s.id);
                      if (hasQuiz) {
                        const quiz = db.assessments.find(a => a.sessionId === s.id);
                        return (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            backgroundColor: quiz?.status === 'solved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: quiz?.status === 'solved' ? 'var(--success)' : '#3b82f6',
                            fontWeight: 600
                          }}>
                            {quiz?.status === 'solved' ? `الدرجة: ${quiz.score}/${quiz.maxScore}` : 'قيد الحل'}
                          </span>
                        );
                      }
                      return (
                        <button
                          onClick={() => {
                            setActiveSessionForQuiz(s);
                            setQuizTitle(`تقييم درس ${s.subject} - ${s.date}`);
                            setQuizQuestions([]);
                            setNewQuestionText('');
                            setNewOptions(['', '', '', '']);
                            setNewCorrectAnswer(0);
                          }}
                          className="btn-secondary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--primary)' }}
                        >
                          إنشاء اختبار
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            {/* Rescheduling Modal Popup */}
            {reschedulingSessionId && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1100,
                backdropFilter: 'blur(4px)'
              }}>
                <form onSubmit={handleRescheduleSubmit} className="glass-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>طلب إعادة جدولة الحصة الدراسية (معلّم)</h3>
                  
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">التاريخ المقترح الجديد:</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={newRescheduleDate} 
                      onChange={(e) => setNewRescheduleDate(e.target.value)} 
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label">الوقت المقترح الجديد:</label>
                    <div className="time-slots-grid">
                      {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '20:00'].map(slot => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setNewRescheduleTime(slot)}
                          className={`time-slot-btn ${newRescheduleTime === slot ? 'active' : ''}`}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.6rem' }}
                        >
                          <span>{slot}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">سبب طلب إعادة الجدولة:</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="يرجى توضيح سبب طلب تغيير موعد الحصة..."
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>تقديم الطلب</button>
                    <button type="button" onClick={() => setReschedulingSessionId(null)} className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>إلغاء</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Availability Time slots picker */}
        {activeTab === 'availability' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '1.5rem' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>إدارة التوفر الأسبوعي</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>حدد الأيام والأوقات المتاحة للتدريس لتظهر للطلاب عند رغبتهم بالحجز</p>

              {/* Days Switch Tabs */}
              <div className="days-grid">
                {Object.keys(weeklySlots).map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`day-btn ${selectedDay === day ? 'active' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Selected Day Slots editor */}
              <div style={{ minHeight: '200px', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.95rem' }}>الفترات المتاحة ليوم {selectedDay}:</h4>
                  <button onClick={handleAddSlot} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)' }}>
                    <Plus size={14} />
                    <span>إضافة وقت</span>
                  </button>
                </div>

                {weeklySlots[selectedDay].length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
                    غير متاح للتدريس في هذا اليوم. انقر على إضافة فترة لتنشيط اليوم.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {weeklySlots[selectedDay].map((slot) => (
                      <div key={slot.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ flex: 1, display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>من الساعة</span>
                          <input type="time" className="form-input" defaultValue={slot.from} style={{ padding: '0.4rem', width: '110px' }} />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>إلى الساعة</span>
                          <input type="time" className="form-input" defaultValue={slot.to} style={{ padding: '0.4rem', width: '110px' }} />
                        </div>
                        <button onClick={() => handleDeleteSlot(slot.id)} style={{ color: 'var(--danger)', padding: '0.5rem' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleSaveAvailability} className="btn-primary" style={{ width: '100%', marginTop: '2rem' }}>
                <Save size={16} />
                <span>حفظ التعديلات وجدول العمل</span>
              </button>
            </div>

            {/* Weekly slots review card */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>نظرة عامة على الأسبوع</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {Object.entries(weeklySlots).map(([day, slots]) => (
                  <div key={day} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.01)', paddingBottom: '0.4rem' }}>
                    <span style={{ fontWeight: 600 }}>{day}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                      {slots.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>مغلق</span>
                      ) : (
                        slots.map(s => <span key={s.id} style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.from} - {s.to}</span>)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Chats messaging */}
        {activeTab === 'chat' && (
          <ChatSystem currentUserId={currentUserId} currentUserName={currentUserName} currentUserRole="teacher" />
        )}

        {/* Tab 5: Notifications list */}
        {activeTab === 'notifications' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>الإشعارات والتذكيرات</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>تنبيهات الدروس المتبقية، والرسائل الجديدة الواردة</p>
              </div>
              {notificationsCount > 0 && (
                <button onClick={() => { setNotificationsCount(0); setShowNotifications(false); }} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>قراءة الكل</button>
              )}
            </div>

            {showNotifications ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '1rem'
                  }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--primary-glow)',
                      color: 'var(--primary)'
                    }}>
                      <Bell size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>تذكير: جلسة بعد ٣٠ دقيقة</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>قبل قليل</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>جلسة "رياضيات" ستبدأ بعد ٣٠ دقيقة في الساعة 10:14</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                لا توجد إشعارات غير مقروءة حالياً.
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Notifications switches */}
        {activeTab === 'settings' && (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الإعدادات</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>إشعارات جهاز المعلم (Push)</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تفعيل الإشعارات اللحظية للحصص الدراسية على متصفحك أو جهازك.</p>
                </div>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>تفضيلات التنبيهات</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تذكير الجلسات (قبل بدء الجلسة بـ ٢٤ ساعة، وساعة، و١٥ دقيقة)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تحديثات الجلسات (عند حجز أو إلغاء أو تعديل الحصص)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>رسائل الدردشة الشات (تنبيه عند وصول رسائل الطلاب)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
              </div>

              <button onClick={() => alert('تم حفظ إعدادات المعلم')} className="btn-primary" style={{ marginTop: '1rem' }}>حفظ التفضيلات</button>
            </div>
          </div>
        )}

        {/* Tab 7: Profile Edit form */}
        {activeTab === 'profile' && (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>ملفي الشخصي</h3>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                <div className="avatar-fallback" style={{ width: '80px', height: '80px', fontSize: '1.75rem' }}>M</div>
                <div>
                  <button type="button" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>تغيير الصورة</button>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>JPG or PNG. Max 2MB</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">البريد الإلكتروني (غير قابل للتعديل)</label>
                <input type="text" className="form-input" value={loggedInEmail} disabled style={{ opacity: 0.6, background: 'rgba(0,0,0,0.1)' }} />
              </div>

              <div className="form-group">
                <label className="form-label">الاسم الكامل</label>
                <input type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">البلد</label>
                <select className="form-select" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">اختر البلد</option>
                  <option value="مصر">مصر</option>
                  <option value="المملكة العربية السعودية">المملكة العربية السعودية</option>
                  <option value="الكويت">الكويت</option>
                  <option value="الإمارات">الإمارات</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المنطقة الزمنية</label>
                <select className="form-select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  <option value="Africa/Cairo">Africa/Cairo (مصر)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (السعودية)</option>
                  <option value="Asia/Dubai">Asia/Dubai (الإمارات)</option>
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>حفظ التعديلات</button>
            </form>
          </div>
        )}

        {/* Assessment Creator Modal */}
        {activeSessionForQuiz && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(8px)',
            padding: '1rem'
          }}>
            <div className="glass-card" style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>إنشاء تقييم جديد للطالب</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    المادة: {activeSessionForQuiz.subject} | الطالب: {activeSessionForQuiz.studentName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSessionForQuiz(null)}
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  إلغاء
                </button>
              </div>

              {/* Quiz General Settings */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">عنوان التقييم / الاختبار:</label>
                <input
                  type="text"
                  className="form-input"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  placeholder="مثال: اختبار قصير في النحو والضمائر"
                />
              </div>

              {/* Added Questions Preview */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                  الأسئلة المضافة ({quizQuestions.length})
                </h4>
                {quizQuestions.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    لم يتم إضافة أي أسئلة للاختبار بعد. استخدم النموذج أدناه لإضافة الأسئلة.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {quizQuestions.map((q, idx) => (
                      <div key={idx} style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-color)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}>
                        <div>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)', display: 'block' }}>
                            س{idx + 1}: {q.question}
                          </strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            الخيارات: {q.options.join(' | ')} (الإجابة الصحيحة: {q.options[q.answer]})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setQuizQuestions(quizQuestions.filter((_, qIdx) => qIdx !== idx));
                          }}
                          style={{ color: 'var(--danger)', padding: '0.25rem', fontSize: '0.8rem' }}
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Question Sub-Form */}
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-color)',
                padding: '1.25rem',
                borderRadius: '12px',
                marginBottom: '2rem'
              }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  إضافة سؤال جديد (اختيار من متعدد)
                </h4>

                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">نص السؤال:</label>
                  <textarea
                    rows={2}
                    className="form-textarea"
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="اكتب نص السؤال هنا..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                  {newOptions.map((opt, idx) => (
                    <div key={idx} className="form-group">
                      <label className="form-label">الخيار {idx + 1}:</label>
                      <input
                        type="text"
                        className="form-input"
                        value={opt}
                        onChange={(e) => {
                          const updated = [...newOptions];
                          updated[idx] = e.target.value;
                          setNewOptions(updated);
                        }}
                        placeholder={`الخيار ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                  <label className="form-label">الخيار الصحيح:</label>
                  <select
                    className="form-select"
                    value={newCorrectAnswer}
                    onChange={(e) => setNewCorrectAnswer(parseInt(e.target.value))}
                  >
                    <option value={0}>الخيار الأول</option>
                    <option value={1}>الخيار الثاني</option>
                    <option value={2}>الخيار الثالث</option>
                    <option value={3}>الخيار الرابع</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newQuestionText.trim()) {
                      alert('يرجى كتابة نص السؤال');
                      return;
                    }
                    if (newOptions.some(o => !o.trim())) {
                      alert('يرجى ملء جميع خيارات السؤال الأربعة');
                      return;
                    }

                    const added = {
                      question: newQuestionText.trim(),
                      options: [...newOptions],
                      answer: newCorrectAnswer
                    };

                    setQuizQuestions([...quizQuestions, added]);
                    setNewQuestionText('');
                    setNewOptions(['', '', '', '']);
                    setNewCorrectAnswer(0);
                  }}
                  className="btn-secondary"
                  style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem', color: 'var(--primary)' }}
                >
                  حفظ وإضافة السؤال للقائمة
                </button>
              </div>

              {/* Publish / Action Buttons */}
              <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!quizTitle.trim()) {
                      alert('يرجى إدخال عنوان للاختبار');
                      return;
                    }
                    if (quizQuestions.length === 0) {
                      alert('يرجى إضافة سؤال واحد على الأقل للاختبار');
                      return;
                    }

                    const newAssessment = {
                      id: 'a_' + Date.now(),
                      sessionId: activeSessionForQuiz.id,
                      sessionSubject: activeSessionForQuiz.subject,
                      teacherId: currentUserId,
                      teacherName: currentUserName,
                      studentId: activeSessionForQuiz.studentId,
                      title: quizTitle.trim(),
                      questions: quizQuestions,
                      maxScore: quizQuestions.length,
                      status: 'pending' as const
                    };

                    const newLog = {
                      id: 'l_' + Date.now(),
                      type: 'general' as const,
                      timestamp: new Date().toLocaleString('ar-EG'),
                      user: currentUserName,
                      detail: `إنشاء وإرسال اختبار جديد للطالب "${activeSessionForQuiz.studentName}" في مادة "${activeSessionForQuiz.subject}"`
                    };

                    const updatedDb = {
                      ...db,
                      assessments: [newAssessment, ...db.assessments],
                      logs: [newLog, ...db.logs]
                    };

                    saveDb(updatedDb);
                    setDb(updatedDb);
                    setActiveSessionForQuiz(null);
                    awardPoints(50, `أحسنت أستاذ! لقد قمت بنشر التقييم للطالب بنجاح وحصلت على +50 نقطة للمعلم النشط 🦉✨`);
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  نشر وإرسال الاختبار للطالب
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSessionForQuiz(null)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
};
