import React, { useState, useEffect } from 'react';
import { getDb, saveDb } from '../mockData';
import type { Session, ActivityLog } from '../types';
import { ChatSystem } from '../components/ChatSystem';
import { 
  BookOpen, Clock, Users, GraduationCap, Video, AlertCircle, Star, CheckSquare, Bell
} from '../customIcons';

interface StudentProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Student: React.FC<StudentProps> = ({ currentPath, onNavigate }) => {
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
    if (currentPath === '/student/book') return 'book';
    if (currentPath === '/student/sessions') return 'sessions';
    if (currentPath === '/student/chat') return 'chat';
    if (currentPath === '/student/notifications') return 'notifications';
    if (currentPath === '/student/settings') return 'settings';
    if (currentPath === '/student/profile') return 'profile';
    if (currentPath === '/student/assessments') return 'assessments';
    return 'overview';
  })();

  const setActiveTab = (tab: string) => {
    if (tab === 'overview') {
      onNavigate('/student');
    } else {
      onNavigate(`/student/${tab}`);
    }
  };
  
  // Book Session local wizard states
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedTeacherForReviews, setSelectedTeacherForReviews] = useState<any | null>(null);

  // Assessment Solving Modal State
  const [activeAssessment, setActiveAssessment] = useState<any | null>(null);
  const [solvingAnswers, setSolvingAnswers] = useState<number[]>([]);

  // Rating Modal state
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const [stars, setStars] = useState(5);
  const [feedback, setFeedback] = useState('');

  // Sessions sub-tab
  const [sessionSubTab, setSessionSubTab] = useState<'upcoming' | 'past'>('upcoming');

  // Rescheduling states
  const [reschedulingSessionId, setReschedulingSessionId] = useState<string | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState('');
  const [newRescheduleTime, setNewRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Complaint states
  const [complaintSessionId, setComplaintSessionId] = useState<string | null>(null);
  const [complaintDetail, setComplaintDetail] = useState('');

  // Get dynamic student details
  const loggedInEmail = localStorage.getItem('ustaz_userEmail') || '';
  
  // Profile fields initialized from database
  const [fullName, setFullName] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user ? user.name : 'طالب';
  });
  const [country, setCountry] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user?.country || 'المملكة العربية السعودية';
  });
  const [timezone, setTimezone] = useState(() => {
    const freshDb = getDb();
    const user = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    return user?.timezone || 'Asia/Riyadh';
  });



  const currentUser = db.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
  const currentUserId = currentUser?.id || '2';
  const currentUserName = currentUser?.name || 'طالب';

  // Mascot message state
  const [mascotMessage, setMascotMessage] = useState<string | null>(null);

  // Gamification node popup selection
  const [selectedNodeDetails, setSelectedNodeDetails] = useState<any | null>(null);

  const awardXP = (amount: number, message: string) => {
    const freshDb = getDb();
    const student = freshDb.users.find(u => u.email.toLowerCase() === loggedInEmail.toLowerCase());
    if (!student) return;
    const newXp = (student.xp || 0) + amount;
    const newLevel = Math.floor(newXp / 500) + 1;
    const levelUp = newLevel > (student.level || 1);

    const updatedBadges = [...(student.badges || [])];
    if (amount === 50 && !updatedBadges.includes('الالتزام التام')) {
      updatedBadges.push('الالتزام التام');
    }
    if (amount === 100 && !updatedBadges.includes('القارئ الحافظ')) {
      updatedBadges.push('القارئ الحافظ');
    }

    const updatedUsers = freshDb.users.map(u => {
      if (u.id === student.id) {
        return {
          ...u,
          xp: newXp,
          level: newLevel,
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

    let finalMsg = message;
    if (levelUp) {
      finalMsg += ` 🎉 مبارك! لقد ارتقيت إلى المستوى ${newLevel}!`;
    }
    setMascotMessage(finalMsg);
    
    // Auto dismiss after 7 seconds
    setTimeout(() => {
      setMascotMessage(prev => prev === finalMsg ? null : prev);
    }, 7000);
  };

  // Compute metrics
  const studentSessions = db.sessions.filter(s => s.studentId === currentUserId);
  
  const upcomingSessions = studentSessions.filter(s => s.status !== 'completed');
  const pastSessions = studentSessions.filter(s => s.status === 'completed');

  // Booking a new session handler
  const handleBookSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !selectedSubject || !bookingDate || !bookingTime) {
      alert('يرجى اختيار المعلم والمادة وتاريخ ووقت الجلسة');
      return;
    }

    const teacher = db.users.find(u => u.id === selectedTeacherId);

    const newSession: Session = {
      id: 's_' + Date.now(),
      date: bookingDate,
      time: bookingTime,
      duration: db.settings.sessionDuration,
      subject: selectedSubject,
      grade: selectedGrade || 'الصف التاسع',
      status: 'confirmed',
      teacherId: selectedTeacherId,
      teacherName: teacher?.name || 'معلّم الأكاديمية',
      studentId: currentUserId,
      studentName: currentUserName,
      zoomUrl: 'https://us05web.zoom.us/j/' + Math.floor(1000000000 + Math.random() * 9000000000)
    };

    // Log the event
    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'session_booking',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: currentUserName,
      detail: `حجز جلسة جديدة: ${selectedSubject} مع ${teacher?.name} في ${bookingDate} الساعة ${bookingTime}`
    };

    const updatedDb = {
      ...db,
      sessions: [newSession, ...db.sessions],
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
    
    // Reset wizard
    setSelectedTeacherId('');
    setSelectedSubject('');
    setSelectedGrade('');
    setBookingDate('');
    setBookingTime('');
    setBookingStep(1);

    alert('تم حجز جلستك الدراسية بنجاح!');
    setSessionSubTab('upcoming');
    setActiveTab('sessions');
  };

  // Confirm Attendance / Mark session as Completed!
  const handleConfirmAttendance = (sessionId: string) => {
    const session = db.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const updatedSessions = db.sessions.map(s => 
      s.id === sessionId ? { ...s, status: 'completed' as const } : s
    );

    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'general',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: currentUserName,
      detail: `تأكيد حضور الحصة: تم إنهاء حصة "${session.subject}" بنجاح مع المعلم "${session.teacherName}"`
    };

    const updatedDb = {
      ...db,
      sessions: updatedSessions,
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
    
    awardXP(50, `رائع! أكملت حصة جديدة في مادة ${session.subject} وحصلت على +50 نقطة خبرة 🦉✨`);
  };

  // Submit session rating
  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingSessionId) return;

    setRatingSessionId(null);
    setStars(5);
    setFeedback('');
    
    awardXP(30, `شكراً لك على تقييم المعلم ومساعدتنا في تحسين الأكاديمية! حصلت على +30 نقطة خبرة 🦉✨`);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUsers = db.users.map(u => 
      u.id === '2' ? { ...u, name: fullName, country, timezone } : u
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
      sessionDetails: `${session.subject} (${session.grade}) - مع ${session.teacherName}`,
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
      detail: `طلب إعادة جدولة حصة ${session.subject} إلى ${newRescheduleDate} الساعة ${newRescheduleTime}`
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

  const handleComplaintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSessionId || !complaintDetail) return;
    const session = db.sessions.find(s => s.id === complaintSessionId);
    if (!session) return;

    const newComplaint = {
      id: 'c_' + Date.now(),
      sessionId: complaintSessionId,
      user: currentUserName,
      detail: `الشكوى على حصة ${session.subject} بتاريخ ${session.date}: ${complaintDetail}`,
      date: new Date().toLocaleDateString('ar-EG'),
      status: 'pending' as const
    };

    const newLog = {
      id: 'l_' + Date.now(),
      type: 'general' as const,
      timestamp: new Date().toLocaleString('ar-EG'),
      user: currentUserName,
      detail: `تقديم شكوى جديدة بخصوص حصة ${session.subject} مع المعلم ${session.teacherName}`
    };

    const updatedDb = {
      ...db,
      complaints: [newComplaint, ...db.complaints],
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);

    setComplaintSessionId(null);
    setComplaintDetail('');
    alert('تم إرسال شكواك بنجاح وسيتم مراجعتها من قبل الإدارة!');
  };

  return (
    <div style={{ width: '100%', padding: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>أهلاً بك، {currentUserName} 👋</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>تابع اختباراتك وجدول حصصك الدراسية وتواصل مع معلميك</p>
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

        {/* Tab 1: Overview Dashboard */}
        {activeTab === 'overview' && (
          <div>
            <style>{`
              @keyframes nodePulse {
                0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                70% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
                100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
              }
              @keyframes mascotFloat {
                0% { transform: translateY(0px); }
                50% { transform: translateY(-6px); }
                100% { transform: translateY(0px); }
              }
              .pulsing-node {
                animation: nodePulse 2s infinite;
              }
              .floating-mascot {
                animation: mascotFloat 3s ease-in-out infinite;
              }
              .zigzag-node {
                transition: all 0.3s ease;
              }
              .zigzag-node:hover {
                transform: scale(1.1) !important;
              }
            `}</style>

            {/* Gamification Top Stats Bar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem'
            }}>
              {/* Streak Card */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem' }}>🔥</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>شعلة المذاكرة المستمرة</span>
                  <strong style={{ fontSize: '1.2rem', color: '#f97316' }}>{currentUser?.streak || 0} أيام متتالية</strong>
                </div>
              </div>

              {/* XP Level Card */}
              <div className="glass-card glowing" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المستوى الدراسي</span>
                  <span style={{
                    background: 'var(--primary-glow)',
                    color: 'var(--primary)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>مستوى {currentUser?.level || 1}</span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(((currentUser?.xp || 0) % 500) / 500 * 100, 100)}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.5s ease' }}></div>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left' }}>{(currentUser?.xp || 0) % 500} / 500 XP للتالي</span>
              </div>

              {/* Points Card */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
                <div style={{ fontSize: '2.2rem', color: 'var(--primary)' }}>💎</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>إجمالي نقاط الخبرة</span>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{currentUser?.xp || 0} XP</strong>
                </div>
              </div>

              {/* Mascot Bubble Trigger Card */}
              <div className="glass-card glowing" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', cursor: 'pointer' }} onClick={() => awardXP(0, "أهلاً بك يا بطل! أنا أستاذ البومة، مرشدك الذكي. حل المزيد من الاختبارات وأكمل حصصك لترقية مستواك والحصول على الأوسمة اللامعة! 🦉✨")}>
                <div className="floating-mascot" style={{ fontSize: '2.5rem' }}>🦉</div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>مرشدك الأكاديمي</span>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}>تحدث مع البومة</strong>
                </div>
              </div>
            </div>

            {/* Dashboard Two-Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
              
              {/* Right Column: Duolingo-style Path Map */}
              <div className="glass-card glowing" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', minHeight: '550px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '2.5rem', textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', width: '100%' }}>خريطة رحلتك التعليمية 🗺️</h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '3rem',
                  position: 'relative',
                  width: '100%',
                  maxWidth: '300px',
                  padding: '1rem 0'
                }}>
                  {/* Visual central connect line */}
                  <div style={{
                    position: 'absolute',
                    top: '20px',
                    bottom: '20px',
                    width: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '3px',
                    zIndex: 0
                  }}></div>

                  {/* Map over dynamic learning path nodes */}
                  {(() => {
                    const currentXP = currentUser?.xp || 0;
                    const dynamicNodes = [
                      { id: 1, title: 'القرآن الكريم: مخارج الحروف والتجويد', subject: 'القرآن الكريم', xpThreshold: 0, description: 'مراجعة سورة الكهف وأحكام المدود النبيلة' },
                      { id: 2, title: 'اللغة العربية: النحو الميسر', subject: 'اللغة العربية', xpThreshold: 100, description: 'الفاعل والمفعول به وعلامات الإعراب' },
                      { id: 3, title: 'اللغة الإنجليزية: أساسيات المحادثة', subject: 'اللغة الإنجليزية', xpThreshold: 250, description: 'صياغة الترحيب والتعريف بالنفس والكلمات الشائعة' },
                      { id: 4, title: 'العلوم: المختبر الصغير والاستكشاف', subject: 'العلوم', xpThreshold: 450, description: 'دراسة الكائنات الحية والخلية والبيئة الطبيعية' },
                      { id: 5, title: 'الرياضيات: الأعداد والجبر البسيط', subject: 'الرياضيات', xpThreshold: 750, description: 'العمليات الحسابية المتقدمة وحل المعادلات البسيطة' },
                      { id: 6, title: 'التربية الإسلامية: الأخلاق النبيلة', subject: 'التربية الإسلامية', xpThreshold: 1100, description: 'دراسة الصدق والأمانة وبر الوالدين وحب العلم' }
                    ].map((node, index, arr) => {
                      let status: 'completed' | 'current' | 'locked' = 'locked';
                      const nextNode = arr[index + 1];
                      if (currentXP >= (nextNode ? nextNode.xpThreshold : 999999)) {
                        status = 'completed';
                      } else if (currentXP >= node.xpThreshold) {
                        status = 'current';
                      }
                      return { ...node, status };
                    });

                    return dynamicNodes.map((node, index) => {
                      const offset = [0, -55, 55, 0, -55, 55][index % 6];
                      const isCompleted = node.status === 'completed';
                      const isCurrent = node.status === 'current';
                      
                      let nodeColor = 'rgba(255,255,255,0.06)';
                      let borderStyle = '2px solid rgba(255,255,255,0.1)';
                      let innerContent = '🔒';
                      
                      if (isCompleted) {
                        nodeColor = 'linear-gradient(135deg, #10b981, #059669)';
                        borderStyle = '4px solid rgba(16, 185, 129, 0.3)';
                        innerContent = '👑';
                      } else if (isCurrent) {
                        nodeColor = 'linear-gradient(135deg, var(--primary), #a855f7)';
                        borderStyle = '4px solid rgba(16, 185, 129, 0.5)';
                        innerContent = '🦉';
                      }

                      return (
                        <div
                          key={node.id}
                          className={`zigzag-node ${isCurrent ? 'pulsing-node' : ''}`}
                          style={{
                            transform: `translateX(${offset}px)`,
                            zIndex: 10,
                            position: 'relative',
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: nodeColor,
                            border: borderStyle,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.75rem',
                            cursor: 'pointer',
                            boxShadow: isCurrent ? '0 0 25px rgba(16, 185, 129, 0.4)' : '0 4px 10px rgba(0,0,0,0.3)',
                            transition: 'all 0.3s ease'
                          }}
                          onClick={() => setSelectedNodeDetails(node)}
                        >
                          {innerContent}
                          {isCurrent && (
                            <span style={{
                              position: 'absolute',
                              top: '-24px',
                              background: 'var(--primary)',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                            }}>ابدأ هنا</span>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Left Column: Traditional Stats, Achievements, Leaderboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Visual Badges Cabinet */}
                <div className="glass-card glowing">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>خزانة الأوسمة والجوائز 🏅</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                    {[
                      { name: 'قارئ الكلمات', desc: 'إتمام أول تقييم لغة بنجاح', icon: '📖', color: '#10b981', unlocked: (currentUser?.xp || 0) >= 100 || (currentUser?.badges || []).includes('قارئ الكلمات') },
                      { name: 'العالم الصغير', desc: 'إكمال حصة علوم بنجاح', icon: '🧬', color: '#3b82f6', unlocked: studentSessions.some(s => s.subject === 'العلوم' && s.status === 'completed') },
                      { name: 'الالتزام التام', desc: 'الحفاظ على شعلة الدراسة', icon: '🏅', color: '#f59e0b', unlocked: (currentUser?.streak || 0) >= 1 },
                      { name: 'القارئ الحافظ', desc: 'حضور حصة للقرآن الكريم', icon: '🕌', color: '#ec4899', unlocked: studentSessions.some(s => s.subject === 'القرآن الكريم') }
                    ].map(badge => (
                      <div
                        key={badge.name}
                        style={{
                          background: badge.unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
                          opacity: badge.unlocked ? 1 : 0.4,
                          border: badge.unlocked ? '1px solid rgba(255,255,255,0.08)' : '1px dashed rgba(255,255,255,0.05)',
                          borderRadius: '12px',
                          padding: '0.75rem',
                          textAlign: 'center',
                          transition: 'all 0.3s ease'
                        }}
                        title={badge.desc}
                      >
                        <div style={{ fontSize: '2.2rem', marginBottom: '0.25rem', filter: badge.unlocked ? 'none' : 'grayscale(100%)' }}>{badge.icon}</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, display: 'block', color: badge.unlocked ? 'var(--text-main)' : 'var(--text-muted)' }}>{badge.name}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{badge.unlocked ? 'تم فتح القفل' : 'مغلق'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="glass-card glowing">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>متصدرو الترتيب الأسبوعي 🏆</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {db.users
                      .filter(u => u.role === 'student')
                      .map(u => ({
                        id: u.id,
                        name: u.name,
                        xp: u.xp || 0,
                        avatar: u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.name)}`
                      }))
                      .sort((a, b) => b.xp - a.xp)
                      .slice(0, 5)
                      .map((user, idx) => {
                        const isSelf = user.id === currentUserId;
                        const rankMedals = ['🥇', '🥈', '🥉'];
                        return (
                          <div
                            key={user.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: isSelf ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.01)',
                              border: isSelf ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                              padding: '0.6rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, width: '24px', textAlign: 'center' }}>
                                {rankMedals[idx] || `${idx + 1}`}
                              </span>
                              <strong style={{ color: isSelf ? 'var(--primary)' : 'var(--text-main)' }}>{user.name}</strong>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{user.xp} XP</span>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Upcoming Sessions List */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>جلساتي القادمة</h3>
                  {upcomingSessions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <span>لا توجد جلسات قادمة بعد.</span>
                      <button onClick={() => setActiveTab('book')} className="btn-primary" style={{ display: 'block', margin: '0.75rem auto 0', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>احجز درسك الآن</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {upcomingSessions.slice(0, 2).map(s => (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.6rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                          <div>
                            <strong style={{ color: 'var(--text-main)', display: 'block' }}>{s.subject} - مع أ. {s.teacherName}</strong>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.date} الساعة {s.time}</span>
                          </div>
                          <button onClick={() => handleConfirmAttendance(s.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', color: 'var(--primary)' }}>تأكيد الحضور</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Interactive Node Details Modal */}
            {selectedNodeDetails && (
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
                <div className="glass-card glowing" style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
                    {selectedNodeDetails.status === 'completed' ? '👑' : selectedNodeDetails.status === 'current' ? '🦉' : '🔒'}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-main)' }}>{selectedNodeDetails.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>مادة {selectedNodeDetails.subject}</span>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0 1.5rem', lineHeight: 1.6 }}>{selectedNodeDetails.description}</p>
                  
                  <div style={{
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    fontSize: '0.8rem',
                    marginBottom: '1.5rem',
                    color: 'var(--text-muted)'
                  }}>
                    {selectedNodeDetails.status === 'completed' ? (
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>لقد أتممت هذا الدرس بنجاح وحصلت على الأوسمة! 🏆</span>
                    ) : selectedNodeDetails.status === 'current' ? (
                      <span>تحدي نشط حالياً! تفاعل مع معلمك في الدروس القادمة وقم بحل الاختبارات لفتحه.</span>
                    ) : (
                      <span>يتطلب فتح هذا القسم الوصول إلى <strong>{selectedNodeDetails.xpThreshold} XP</strong> (مستواك الحالي هو {currentUser?.xp || 0} XP).</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {selectedNodeDetails.status === 'current' ? (
                      <button onClick={() => { setSelectedNodeDetails(null); setActiveTab('assessments'); }} className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>اذهب للاختبارات النشطة</button>
                    ) : (
                      <button onClick={() => setSelectedNodeDetails(null)} className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>حسناً، فهمت</button>
                    )}
                    <button onClick={() => setSelectedNodeDetails(null)} className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>إغلاق</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Tab 2: Book a new session wizard */}
        {activeTab === 'book' && (
          <div className="booking-wizard-container">
            {/* Steps indicator progress bar */}
            <div className="wizard-steps-header">
              <div className={`step-indicator ${bookingStep >= 1 ? 'active' : ''}`}><span>١. الصف الدراسي</span></div>
              <div className="step-line"></div>
              <div className={`step-indicator ${bookingStep >= 2 ? 'active' : ''}`}><span>٢. المادة</span></div>
              <div className="step-line"></div>
              <div className={`step-indicator ${bookingStep >= 3 ? 'active' : ''}`}><span>٣. المعلم</span></div>
              <div className="step-line"></div>
              <div className={`step-indicator ${bookingStep >= 4 ? 'active' : ''}`}><span>٤. الموعد</span></div>
            </div>

            {/* Step 1: Grade selection */}
            {bookingStep === 1 && (
              <div className="glass-card fade-in">
                <h3 className="section-title">اختر الصف الدراسي للطالب</h3>
                <p className="section-subtitle">حدّد السنة الدراسية لعرض المواد والمدرسين المناسبين</p>
                <div className="grades-grid">
                  {db.settings.grades.map(g => (
                    <button 
                      key={g} 
                      onClick={() => {
                        setSelectedGrade(g);
                        setBookingStep(2);
                      }} 
                      className={`grade-card-btn ${selectedGrade === g ? 'selected' : ''}`}
                    >
                      <GraduationCap size={24} />
                      <span>{g}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Subject selection */}
            {bookingStep === 2 && (
              <div className="glass-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 className="section-title">اختر المادة الدراسية</h3>
                  <button onClick={() => setBookingStep(1)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>السابق</button>
                </div>
                <p className="section-subtitle">الصف المختار: <strong style={{ color: 'var(--primary)' }}>{selectedGrade}</strong></p>
                <div className="subjects-grid">
                  {db.settings.subjects.map(s => (
                    <button 
                      key={s} 
                      onClick={() => {
                        setSelectedSubject(s);
                        setBookingStep(3);
                      }} 
                      className={`subject-card-btn ${selectedSubject === s ? 'selected' : ''}`}
                    >
                      <BookOpen size={24} />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Teacher selection */}
            {bookingStep === 3 && (
              <div className="glass-card fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 className="section-title">اختر المعلم المفضل</h3>
                    <p className="section-subtitle">المادة: <strong style={{ color: 'var(--primary)' }}>{selectedSubject}</strong> | الصف: <strong style={{ color: 'var(--primary)' }}>{selectedGrade}</strong></p>
                  </div>
                  <button onClick={() => setBookingStep(2)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>السابق</button>
                </div>

                {/* Filter teachers based on grade and subject */}
                {(() => {
                  const matchingTeachers = db.users.filter(u => 
                    (u.role === 'teacher' || u.role === 'admin') && 
                    u.specialties?.includes(selectedSubject) &&
                    u.grades?.includes(selectedGrade)
                  );

                  if (matchingTeachers.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
                        <Users size={36} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                        <span>عذراً، لا يوجد معلمون متاحون حالياً لهذا الصف والمادة. يرجى تجربة اختيار مادة أو صف آخر.</span>
                      </div>
                    );
                  }

                  return (
                    <div className="teachers-list-grid">
                      {matchingTeachers.map(t => (
                        <div key={t.id} className="teacher-premium-card">
                          <div className="teacher-card-top">
                            {t.avatar ? (
                              <img src={t.avatar} alt={t.name} className="teacher-card-avatar" />
                            ) : (
                              <div className="avatar-fallback teacher-card-avatar-fallback">{t.name.charAt(0)}</div>
                            )}
                            <div className="teacher-card-meta">
                              <h4 className="teacher-card-name">{t.name}</h4>
                              <span className="teacher-card-country">{t.country} 📍</span>
                              <div 
                                className="teacher-card-rating"
                                onClick={() => setSelectedTeacherForReviews(t)}
                                title="عرض تقييمات الطلاب"
                              >
                                <Star size={14} fill="currentColor" style={{ color: 'var(--warning)' }} />
                                <span>{t.rating || '5.0'}</span>
                                <span className="reviews-count">({t.reviewsCount || 0} تقييم)</span>
                              </div>
                            </div>
                          </div>

                          <div className="teacher-card-specs">
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>التخصصات:</span>
                            <div className="specs-tags">
                              {t.specialties?.map(spec => (
                                <span key={spec} className="spec-tag">{spec}</span>
                              ))}
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setSelectedTeacherId(t.id);
                              setBookingStep(4);
                            }} 
                            className="btn-primary" 
                            style={{ width: '100%', padding: '0.6rem', fontSize: '0.85rem' }}
                          >
                            احجز موعداً مع الأستاذ
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Step 4: Time and Date Selection */}
            {bookingStep === 4 && (
              <div className="glass-card fade-in" style={{ maxWidth: '580px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 className="section-title">تحديد موعد الجلسة الدراسية</h3>
                  <button onClick={() => setBookingStep(3)} className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>السابق</button>
                </div>

                {(() => {
                  const teacher = db.users.find(u => u.id === selectedTeacherId);
                  return (
                    <form onSubmit={handleBookSession} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div className="summary-banner">
                        <span>المعلم: <strong>{teacher?.name}</strong></span>
                        <span className="separator">|</span>
                        <span>المادة: <strong>{selectedSubject}</strong></span>
                        <span className="separator">|</span>
                        <span>الصف: <strong>{selectedGrade}</strong></span>
                      </div>

                      <div className="form-group">
                        <label className="form-label">اختر تاريخ الحصة:</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          value={bookingDate} 
                          onChange={(e) => setBookingDate(e.target.value)} 
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">اختر الوقت المناسب لك:</label>
                        <div className="time-slots-grid">
                          {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '20:00'].map(slot => (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setBookingTime(slot)}
                              className={`time-slot-btn ${bookingTime === slot ? 'active' : ''}`}
                            >
                              <Clock size={12} />
                              <span>{slot}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.05)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        border: '1px solid var(--border-color-glow)'
                      }}>
                        <AlertCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.15rem' }} />
                        <div>
                          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-main)' }}>تأكيد مدة وموقع الجلسة:</span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            مدة الجلسة هي {db.settings.sessionDuration} دقيقة متصلة. سيتم تلقائياً إنشاء رابط فصل Zoom دراسي مشفر وتوفيره لك فور تأكيد الحجز.
                          </span>
                        </div>
                      </div>

                      <button type="submit" className="btn-primary" style={{ height: '48px', marginTop: '0.5rem' }}>حفظ وتأكيد موعد الدرس</button>
                    </form>
                  );
                })()}
              </div>
            )}

            {/* Reviews Dialog Modal */}
            {selectedTeacherForReviews && (
              <div className="modal-overlay fade-in">
                <div className="glass-card modal-content" style={{ maxWidth: '460px', width: '100%', padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>مراجعات وتقييمات {selectedTeacherForReviews.name}</h3>
                    <button onClick={() => setSelectedTeacherForReviews(null)} className="btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>إغلاق</button>
                  </div>

                  <div className="reviews-list-modal" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {selectedTeacherForReviews.reviews?.length === 0 ? (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 0' }}>لا توجد تقييمات مكتوبة لهذا المعلم بعد.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {selectedTeacherForReviews.reviews?.map((r: any, idx: number) => (
                          <div key={idx} className="review-modal-item" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.studentName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.date}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.5rem', color: 'var(--warning)' }}>
                              {Array.from({ length: r.rating }).map((_, i) => (
                                <Star key={i} size={12} fill="currentColor" />
                              ))}
                            </div>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>"{r.comment}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Sessions List */}
        {activeTab === 'sessions' && (
          <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>جلساتي التعليمية</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>إدارة الحصص وتأكيد الحضور وتقييم المعلمين بعد انتهاء الدروس</p>
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
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>المعلم</span>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.teacherName}</span>
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
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => handleConfirmAttendance(s.id)} className="btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                          <span>تأكيد الحضور</span>
                        </button>
                        <a href={s.zoomUrl} target="_blank" rel="noreferrer" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Video size={14} />
                          <span>دخول الفصل</span>
                        </a>
                        <button onClick={() => {
                          setReschedulingSessionId(s.id);
                          setNewRescheduleDate(s.date);
                          setNewRescheduleTime(s.time);
                        }} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--warning)', borderColor: 'rgba(245,158,11,0.2)' }}>
                          <span>إعادة جدولة</span>
                        </button>
                        <button onClick={() => setComplaintSessionId(s.id)} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
                          <span>تقديم شكوى</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setRatingSessionId(s.id)} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)' }}>
                          <Star size={14} />
                          <span>تقييم المعلم</span>
                        </button>
                        <button onClick={() => setComplaintSessionId(s.id)} className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
                          <span>تقديم شكوى</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Rating Modal Popup */}
            {ratingSessionId && (
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
                <form onSubmit={handleRatingSubmit} className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>تقييم الحصة والمعلم</h3>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', margin: '1.5rem 0' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setStars(star)}
                        style={{ color: star <= stars ? 'var(--warning)' : 'rgba(255,255,255,0.1)' }}
                      >
                        <Star size={32} fill={star <= stars ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>

                  <div className="form-group">
                    <label className="form-label">ملاحظات وتقييم أداء المعلم</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      placeholder="اكتب تعليقك هنا (اختياري)..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '0.85rem' }}>إرسال التقييم</button>
                    <button type="button" onClick={() => setRatingSessionId(null)} className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>إلغاء</button>
                  </div>
                </form>
              </div>
            )}

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
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', textAlign: 'center' }}>طلب إعادة جدولة الحصة الدراسية</h3>
                  
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

            {/* Complaint Modal Popup */}
            {complaintSessionId && (
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
                <form onSubmit={handleComplaintSubmit} className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>تقديم شكوى / بلاغ بخصوص الحصة</h3>
                  
                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label className="form-label">تفاصيل المشكلة:</label>
                    <textarea
                      rows={4}
                      className="form-textarea"
                      placeholder="اكتب تفاصيل المشكلة أو الشكوى بالتفصيل هنا..."
                      value={complaintDetail}
                      onChange={(e) => setComplaintDetail(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, fontSize: '0.85rem', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>إرسال الشكوى</button>
                    <button type="button" onClick={() => setComplaintSessionId(null)} className="btn-secondary" style={{ flex: 1, fontSize: '0.85rem' }}>إلغاء</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Chats messaging */}
        {activeTab === 'chat' && (
          <ChatSystem currentUserId={currentUserId} currentUserName={currentUserName} currentUserRole="student" />
        )}

        {/* Tab 5: Notifications list */}
        {activeTab === 'notifications' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>تنبيهات الطالب</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Array.from({ length: 3 }).map((_, i) => (
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
          </div>
        )}

        {/* Tab 6: Settings list checkboxes */}
        {activeTab === 'settings' && (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الإعدادات والتفضيلات</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>إشعارات جهاز الطالب (Push)</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تفعيل الإشعارات اللحظية على جهازك لمعرفة قرارات مواعيد الدروس والرسائل الجديدة.</p>
                </div>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>تفضيلات التنبيهات</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تذكير الجلسات (تنبيهات التذكير بالدروس قبل ٢٤ ساعة وساعة)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تحديثات الجلسات (عند تأكيد الموعد، تغيير المعلم، أو الحذف)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>رسائل الدردشة الشات (إشعارات وصول رسائل جديدة من المعلمين)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
              </div>

              <button onClick={() => alert('تم حفظ إعدادات الطالب')} className="btn-primary" style={{ marginTop: '1rem' }}>حفظ التفضيلات</button>
            </div>
          </div>
        )}

        {/* Tab 7: Profile Edit Form */}
        {activeTab === 'profile' && (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>ملفي الشخصي</h3>
            
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                <div className="avatar-fallback" style={{ width: '80px', height: '80px', fontSize: '1.75rem' }}>E</div>
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

        {/* Tab 8: Assessments (Quizzes) List & Solve */}
        {activeTab === 'assessments' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>الاختبارات والتقييمات</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>حل الاختبارات المرسلة من معلميك لمراجعة مستواك الدراسي</p>

            {(() => {
              const studentAssessments = db.assessments.filter(a => a.studentId === currentUserId);
              if (studentAssessments.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '3.5rem 0', color: 'var(--text-muted)' }}>
                    <CheckSquare size={36} style={{ display: 'block', margin: '0 auto 0.75rem', opacity: 0.3 }} />
                    <span>لا توجد اختبارات أو تقييمات مخصصة لك حالياً.</span>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                  {studentAssessments.map((a) => (
                    <div key={a.id} className="glass-card" style={{
                      padding: '1.25rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      background: 'rgba(255, 255, 255, 0.01)'
                    }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: a.status === 'solved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: a.status === 'solved' ? 'var(--success)' : 'var(--warning)'
                          }}>
                            {a.status === 'solved' ? 'تم الحل' : 'قيد الانتظار'}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{a.sessionSubject}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>{a.title}</h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المعلم: {a.teacherName}</p>
                      </div>

                      {a.status === 'solved' ? (
                        <div style={{
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '0.75rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>النتيجة المحققة:</span>
                          <strong style={{ fontSize: '1.1rem', color: 'var(--primary)' }}>{a.score} / {a.maxScore}</strong>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveAssessment(a);
                            setSolvingAnswers(new Array(a.questions.length).fill(-1));
                          }}
                          className="btn-primary"
                          style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                        >
                          بدء حل الاختبار
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Assessment Solver Modal */}
        {activeAssessment && (
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
              maxWidth: '600px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '2rem',
              borderRadius: '16px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)' }}>{activeAssessment.title}</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>مادة {activeAssessment.sessionSubject} | المعلم {activeAssessment.teacherName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAssessment(null)}
                  className="btn-secondary"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                >
                  إلغاء وحفظ لاحقاً
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activeAssessment.questions.map((q: any, qIdx: number) => (
                  <div key={qIdx} style={{
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid var(--border-color)',
                    padding: '1.25rem',
                    borderRadius: '10px'
                  }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--primary)' }}>س{qIdx + 1}:</span>
                      <span>{q.question}</span>
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {q.options.map((opt: string, oIdx: number) => (
                        <label
                          key={oIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            background: solvingAnswers[qIdx] === oIdx ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.1)',
                            border: solvingAnswers[qIdx] === oIdx ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '0.85rem'
                          }}
                        >
                          <input
                            type="radio"
                            name={`question_${qIdx}`}
                            checked={solvingAnswers[qIdx] === oIdx}
                            onChange={() => {
                              const updatedAnswers = [...solvingAnswers];
                              updatedAnswers[qIdx] = oIdx;
                              setSolvingAnswers(updatedAnswers);
                            }}
                            style={{ accentColor: 'var(--primary)', width: '16px', height: '16px' }}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (solvingAnswers.some(ans => ans === -1)) {
                      if (!confirm('لم تقم بالإجابة على جميع الأسئلة. هل أنت متأكد من تسليم الاختبار الآن؟')) {
                        return;
                      }
                    }

                    // Calculate score
                    let correctCount = 0;
                    activeAssessment.questions.forEach((q: any, idx: number) => {
                      if (solvingAnswers[idx] === q.answer) {
                        correctCount++;
                      }
                    });

                    // Update database
                    const updatedAssessments = db.assessments.map(a => {
                      if (a.id === activeAssessment.id) {
                        return {
                          ...a,
                          status: 'solved' as const,
                          studentAnswers: solvingAnswers,
                          score: correctCount
                        };
                      }
                      return a;
                    });

                    const newLog = {
                      id: 'l_' + Date.now(),
                      type: 'general' as const,
                      timestamp: new Date().toLocaleString('ar-EG'),
                      user: currentUserName,
                      detail: `تم حل اختبار "${activeAssessment.title}" بنجاح للدرجة ${correctCount} / ${activeAssessment.maxScore}`
                    };

                    const updatedDb = {
                      ...db,
                      assessments: updatedAssessments,
                      logs: [newLog, ...db.logs]
                    };

                    saveDb(updatedDb);
                    setDb(updatedDb);
                    setActiveAssessment(null);
                    awardXP(100, `عمل رائع ومتميز! لقد قمت بحل اختبار "${activeAssessment.title}" بنجاح وحصلت على +100 نقطة خبرة 🦉✨`);
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  تسليم الإجابات وإنهاء الاختبار
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAssessment(null)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
  );
};
