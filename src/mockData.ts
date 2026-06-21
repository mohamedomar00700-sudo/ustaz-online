import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { User, Session, ChatMessage, ActivityLog, RescheduleRequest, PlatformSettings, Complaint, Assessment } from './types';

// Pre-populated Users with specialties, grades, ratings and reviews
const defaultUsers: User[] = [
  { 
    id: '1', 
    name: 'أ. محمد عمر', 
    email: 'nlife445@gmail.com', 
    role: 'teacher', 
    status: 'active', 
    country: 'مصر', 
    timezone: 'Africa/Cairo',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    specialties: ['القرآن الكريم', 'اللغة العربية', 'التربية الإسلامية'],
    grades: ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'الصف السابع', 'الصف الثامن', 'الصف التاسع'],
    rating: 4.8,
    reviewsCount: 2,
    reviews: [
      { studentName: 'إسراء عبد الله', rating: 5, comment: 'أستاذ متميز جداً صبور وملتزم بمواعيد الحصص.', date: '2026-06-12' },
      { studentName: 'هشام الغمراوي', rating: 4, comment: 'شرح مبسط وممتاز وقدرة رائعة على توصيل المعلومة.', date: '2026-06-10' }
    ]
  },
  { 
    id: '101', 
    name: 'أ. أحمد الشناوي', 
    email: 'shenawy@example.com', 
    role: 'teacher', 
    status: 'active', 
    country: 'مصر', 
    timezone: 'Africa/Cairo',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80',
    specialties: ['الرياضيات', 'العلوم'],
    grades: ['الصف السابع', 'الصف الثامن', 'الصف التاسع', 'الصف العاشر', 'الصف الحادي عشر', 'الصف الثاني عشر'],
    rating: 4.9,
    reviewsCount: 1,
    reviews: [
      { studentName: 'أحمد سعيد', rating: 5, comment: 'شرحه للفيزياء والرياضيات ممتع جداً وسهل الفهم.', date: '2026-06-15' }
    ]
  },
  { 
    id: '102', 
    name: 'أ. منى أحمد', 
    email: 'mona@example.com', 
    role: 'teacher', 
    status: 'active', 
    country: 'الأردن', 
    timezone: 'Asia/Amman',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80',
    specialties: ['اللغة الإنجليزية', 'العلوم'],
    grades: ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'],
    rating: 4.7,
    reviewsCount: 1,
    reviews: [
      { studentName: 'سارة خالد', rating: 4, comment: 'أسلوبها تفاعلي ومحبب جداً للأعمار الصغيرة.', date: '2026-06-14' }
    ]
  },
  { id: '2', name: 'Esraa', email: 'esraa@example.com', role: 'student', status: 'active', country: 'المملكة العربية السعودية', timezone: 'Asia/Riyadh' },
  { id: '3', name: 'Hesham Alghamrawi', email: 'hesham@example.com', role: 'student', status: 'active', country: 'الكويت', timezone: 'Asia/Kuwait' },
  { id: '4', name: 'Mm', email: 'mm@example.com', role: 'student', status: 'active', country: 'الإمارات', timezone: 'Asia/Dubai' },
  { id: '5', name: 'Admin Owner', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: '6', name: 'مشرف الأكاديمية', email: 'supervisor@example.com', role: 'supervisor', status: 'active' },
  { id: '7', name: 'تجربة الإدارة', email: 'ustaz_tester_999@example.com', role: 'admin', status: 'active' }
];

// Pre-populated Sessions
const defaultSessions: Session[] = [
  {
    id: 's_1',
    date: '2026-06-20',
    time: '16:00',
    duration: 60,
    subject: 'القرآن الكريم',
    grade: 'الصف التاسع',
    status: 'completed',
    teacherId: '1',
    teacherName: 'أ. محمد عمر',
    studentId: '2',
    studentName: 'Esraa',
    zoomUrl: 'https://us05web.zoom.us/j/1234567890'
  },
  {
    id: 's_2',
    date: '2026-06-22',
    time: '15:00',
    duration: 60,
    subject: 'القرآن الكريم',
    grade: 'الصف التاسع',
    status: 'confirmed',
    teacherId: '1',
    teacherName: 'أ. محمد عمر',
    studentId: '2',
    studentName: 'Esraa',
    zoomUrl: 'https://us05web.zoom.us/j/2345678901'
  },
  {
    id: 's_3',
    date: '2026-06-23',
    time: '17:00',
    duration: 60,
    subject: 'الرياضيات',
    grade: 'الصف التاسع',
    status: 'confirmed',
    teacherId: '101',
    teacherName: 'أ. أحمد الشناوي',
    studentId: '2',
    studentName: 'Esraa',
    zoomUrl: 'https://us05web.zoom.us/j/3456789012'
  },
  {
    id: 's_4',
    date: '2026-06-22',
    time: '16:00',
    duration: 60,
    subject: 'العلوم',
    grade: 'الصف الثامن',
    status: 'confirmed',
    teacherId: '102',
    teacherName: 'أ. منى أحمد',
    studentId: '3',
    studentName: 'Hesham Alghamrawi',
    zoomUrl: 'https://us05web.zoom.us/j/4567890123'
  }
];

// Pre-populated Chat Messages
const defaultMessages: ChatMessage[] = [
  {
    id: 'm_mock_1',
    senderId: '1',
    senderName: 'أ. محمد عمر',
    receiverId: '2',
    receiverName: 'Esraa',
    text: 'السلام عليكم يا إسراء، كيف حالك؟ جاهزة لحصة القرآن اليوم؟',
    timestamp: '10:00 ص'
  },
  {
    id: 'm_mock_2',
    senderId: '2',
    senderName: 'Esraa',
    receiverId: '1',
    receiverName: 'أ. محمد عمر',
    text: 'وعليكم السلام يا أستاذ محمد. نعم جاهزة والحمد لله.',
    timestamp: '10:02 ص'
  },
  {
    id: 'm_mock_3',
    senderId: '2',
    senderName: 'Esraa',
    receiverId: '1',
    receiverName: 'أ. محمد عمر',
    text: 'هل يمكننا مراجعة سورة الكهف اليوم؟',
    timestamp: '10:03 ص'
  },
  {
    id: 'm_mock_4',
    senderId: '1',
    senderName: 'أ. محمد عمر',
    receiverId: '2',
    receiverName: 'Esraa',
    text: 'بكل سرور، سنقوم بمراجعة أول صفحتين وتصحيح التلاوة.',
    timestamp: '10:05 ص'
  },
  {
    id: 'm_mock_5',
    senderId: '2',
    senderName: 'Esraa',
    receiverId: '1',
    receiverName: 'أ. محمد عمر',
    text: 'تم حجب رسالة مخالفة لسياسة التواصل داخل المنصة.',
    timestamp: '10:06 ص',
    isBlocked: true
  }
];

// Pre-populated Activity Logs
const defaultLogs: ActivityLog[] = [
  {
    id: 'l_mock_1',
    type: 'contact_block',
    timestamp: '2026-06-20, 10:06:00 ص',
    user: 'Esraa',
    detail: 'محاولة تواصل خارج المنصة (محجوبة) - بواسطة Esraa (رقم هاتفي للتواصل السريع هو 0123...)'
  },
  {
    id: 'l_mock_2',
    type: 'session_booking',
    timestamp: '2026-06-19, 04:30:00 م',
    user: 'المدير',
    detail: 'حجز جلسة جديدة: القرآن الكريم لـ Esraa مع أ. محمد عمر في 2026-06-22'
  },
  {
    id: 'l_mock_3',
    type: 'role_change',
    timestamp: '2026-06-18, 11:15:00 ص',
    user: 'المدير',
    detail: 'تغيير دور المستخدم "Esraa" إلى "student"'
  }
];

// Pre-populated Assessments
const defaultAssessments: Assessment[] = [
  {
    id: 'a_1',
    sessionId: 's_2',
    sessionSubject: 'القرآن الكريم',
    teacherId: '1',
    teacherName: 'أ. محمد عمر',
    studentId: '2',
    title: 'تقييم مراجعة سورة الكهف',
    questions: [
      { question: 'ما هي أول آية في سورة الكهف؟', options: ['الحمد لله الذي أنزل على عبده الكتاب', 'تبياناً لكل شيء', 'تبارك الذي بيده الملك', 'يس والقرآن الحكيم'], answer: 0 },
      { question: 'كم عدد آيات سورة الكهف؟', options: ['١٠٠ آية', '١١٠ آيات', '١٢٠ آية', '١٠٥ آيات'], answer: 1 }
    ],
    maxScore: 2,
    status: 'pending'
  },
  {
    id: 'a_2',
    sessionId: 's_1',
    sessionSubject: 'القرآن الكريم',
    teacherId: '1',
    teacherName: 'أ. محمد عمر',
    studentId: '2',
    title: 'اختبار التجويد القصير',
    questions: [
      { question: 'ما هي أحكام النون الساكنة والتنوين؟', options: ['٤ أحكام', '٣ أحكام', '٥ أحكام', 'حكمان'], answer: 0 }
    ],
    studentAnswers: [0],
    score: 1,
    maxScore: 1,
    status: 'solved'
  }
];

// Platform Settings
const defaultSettings: PlatformSettings = {
  sessionDuration: 60,
  maxSessionsPerDay: 5,
  subjects: ['القرآن الكريم', 'اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'التربية الإسلامية'],
  grades: Array.from({ length: 12 }, (_, i) => `الصف ${[
    'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس',
    'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر'
  ][i]}`)
};

// Rescheduling Requests
const defaultReschedules: RescheduleRequest[] = [
  {
    id: 'r_1',
    sessionId: 's_3',
    sessionDetails: 'جلسة الرياضيات - الصف التاسع',
    proposedDate: '2026-06-24',
    proposedTime: '18:00',
    status: 'pending',
    reason: 'لدي اختبار تجريبي في المدرسة في نفس وقت الحصة'
  }
];

// Complaints
const defaultComplaints: Complaint[] = [
  {
    id: 'c_1',
    sessionId: 's_1',
    user: 'Esraa',
    detail: 'الصوت كان متقطعاً بشكل مستمر خلال آخر ربع ساعة من الحصة الدراسية عبر زووم.',
    date: '2026-06-20',
    status: 'pending'
  }
];

// Load and save state functions
export const loadState = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(`ustaz_${key}`);
  return data ? JSON.parse(data) : defaultValue;
};

export const saveState = <T>(key: string, value: T): void => {
  localStorage.setItem(`ustaz_${key}`, JSON.stringify(value));
};

export const getDb = () => {
  return {
    users: loadState<User[]>('users', defaultUsers),
    sessions: loadState<Session[]>('sessions', defaultSessions),
    messages: loadState<ChatMessage[]>('messages', defaultMessages),
    logs: loadState<ActivityLog[]>('logs', defaultLogs),
    settings: loadState<PlatformSettings>('settings', defaultSettings),
    reschedules: loadState<RescheduleRequest[]>('reschedules', defaultReschedules),
    complaints: loadState<Complaint[]>('complaints', defaultComplaints),
    assessments: loadState<Assessment[]>('assessments', defaultAssessments)
  };
};

export const saveDb = (db: ReturnType<typeof getDb>) => {
  saveState('users', db.users);
  saveState('sessions', db.sessions);
  saveState('messages', db.messages);
  saveState('logs', db.logs);
  saveState('settings', db.settings);
  saveState('reschedules', db.reschedules);
  saveState('complaints', db.complaints);
  saveState('assessments', db.assessments);

  // Background sync with Supabase if configured
  if (isSupabaseConfigured) {
    syncToSupabase(db).catch(err => console.error('Supabase Sync Error:', err));
  }
};

// Sync functions to Supabase
const syncToSupabase = async (db: ReturnType<typeof getDb>) => {
  try {
    // 1. Sync profiles (users)
    for (const u of db.users) {
      await supabase.from('profiles').upsert({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        avatar_url: u.avatar || '',
        country: u.country || '',
        timezone: u.timezone || '',
        specialties: u.specialties || [],
        grades: u.grades || [],
        rating: u.rating || 0.0,
        reviews_count: u.reviewsCount || 0,
        reviews: u.reviews || [],
        xp: u.xp || 0,
        level: u.level || 1,
        streak: u.streak || 0,
        badges: u.badges || [],
        last_login_date: u.lastLoginDate || ''
      });
    }

    // 2. Sync sessions
    for (const s of db.sessions) {
      await supabase.from('sessions').upsert({
        id: s.id,
        date: s.date,
        time: s.time,
        duration: s.duration,
        subject: s.subject,
        grade: s.grade || '',
        status: s.status,
        teacher_id: s.teacherId,
        student_id: s.studentId,
        zoom_url: s.zoomUrl || ''
      });
    }

    // 3. Sync messages
    for (const m of db.messages) {
      await supabase.from('messages').upsert({
        id: m.id,
        sender_id: m.senderId,
        receiver_id: m.receiverId,
        text: m.text,
        timestamp: new Date().toISOString(),
        file_url: m.fileUrl || '',
        file_name: m.fileName || '',
        is_blocked: m.isBlocked || false
      });
    }

    // 4. Sync reschedule requests
    for (const r of db.reschedules) {
      await supabase.from('reschedule_requests').upsert({
        id: r.id,
        session_id: r.sessionId,
        proposed_date: r.proposedDate,
        proposed_time: r.proposedTime,
        status: r.status,
        reason: r.reason
      });
    }

    // 5. Sync complaints
    for (const c of db.complaints) {
      await supabase.from('complaints').upsert({
        id: c.id,
        session_id: c.sessionId,
        user_name: c.user,
        detail: c.detail,
        status: c.status,
        date: c.date
      });
    }

    // 6. Sync assessments
    for (const a of db.assessments) {
      await supabase.from('assessments').upsert({
        id: a.id,
        session_id: a.sessionId,
        subject: a.sessionSubject,
        teacher_id: a.teacherId,
        student_id: a.studentId,
        title: a.title,
        questions: a.questions,
        student_answers: a.studentAnswers || [],
        score: a.score || 0,
        max_score: a.maxScore,
        status: a.status
      });
    }
  } catch (e) {
    console.error('Failed to sync to Supabase database tables:', e);
  }
};

export const fetchFromSupabase = async () => {
  if (!isSupabaseConfigured) return getDb();
  try {
    // 1. Fetch profiles
    const { data: profiles, error: err1 } = await supabase.from('profiles').select('*');
    if (err1) throw err1;

    const usersList: User[] = (profiles || []).map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      role: p.role,
      status: p.status,
      avatar: p.avatar_url || undefined,
      country: p.country || undefined,
      timezone: p.timezone || undefined,
      specialties: p.specialties || [],
      grades: p.grades || [],
      rating: p.rating ? parseFloat(p.rating) : undefined,
      reviewsCount: p.reviews_count || undefined,
      reviews: p.reviews || [],
      xp: p.xp || 0,
      level: p.level || 1,
      streak: p.streak || 0,
      badges: p.badges || [],
      lastLoginDate: p.last_login_date || undefined
    }));

    // Helper to find profile names
    const getUserName = (id: string, defaultName: string) => {
      const found = usersList.find(u => u.id === id);
      return found ? found.name : defaultName;
    };

    // 2. Fetch sessions
    const { data: sessions, error: err2 } = await supabase.from('sessions').select('*');
    if (err2) throw err2;
    const sessionsList: Session[] = (sessions || []).map(s => ({
      id: s.id,
      date: s.date,
      time: s.time,
      duration: s.duration,
      subject: s.subject,
      grade: s.grade || undefined,
      status: s.status,
      teacherId: s.teacher_id,
      teacherName: getUserName(s.teacher_id, 'معلم الأكاديمية'),
      studentId: s.student_id,
      studentName: getUserName(s.student_id, 'طالب'),
      zoomUrl: s.zoom_url || undefined
    }));

    // 3. Fetch messages
    const { data: messages, error: err3 } = await supabase.from('messages').select('*').order('id', { ascending: true });
    if (err3) throw err3;
    const messagesList: ChatMessage[] = (messages || []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: getUserName(m.sender_id, 'مستخدم'),
      receiverId: m.receiver_id,
      receiverName: getUserName(m.receiver_id, 'مستخدم'),
      text: m.text,
      timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      fileUrl: m.file_url || undefined,
      fileName: m.file_name || undefined,
      isBlocked: m.is_blocked || false
    }));

    // 4. Fetch reschedule requests
    const { data: reschedules, error: err4 } = await supabase.from('reschedule_requests').select('*');
    if (err4) throw err4;
    const reschedulesList: RescheduleRequest[] = (reschedules || []).map(r => {
      const session = sessionsList.find(s => s.id === r.session_id);
      const sessionDetails = session ? `${session.subject} (${session.grade}) - مع ${session.teacherName}` : 'تفاصيل الجلسة';
      return {
        id: r.id,
        sessionId: r.session_id,
        sessionDetails,
        proposedDate: r.proposed_date,
        proposedTime: r.proposed_time,
        status: r.status,
        reason: r.reason
      };
    });

    // 5. Fetch complaints
    const { data: complaints, error: err5 } = await supabase.from('complaints').select('*');
    if (err5) throw err5;
    const complaintsList: Complaint[] = (complaints || []).map(c => ({
      id: c.id,
      sessionId: c.session_id,
      user: c.user_name,
      detail: c.detail,
      date: c.date,
      status: c.status
    }));

    // 6. Fetch assessments
    const { data: assessments, error: err6 } = await supabase.from('assessments').select('*');
    if (err6) throw err6;
    const assessmentsList: Assessment[] = (assessments || []).map(a => ({
      id: a.id,
      sessionId: a.session_id,
      sessionSubject: a.subject,
      teacherId: a.teacher_id,
      teacherName: getUserName(a.teacher_id, 'معلم الأكاديمية'),
      studentId: a.student_id,
      title: a.title,
      questions: a.questions,
      studentAnswers: a.student_answers || undefined,
      score: a.score !== null ? a.score : undefined,
      maxScore: a.max_score,
      status: a.status
    }));

    const currentDb = getDb();
    const mergedDb = {
      ...currentDb,
      users: usersList.length > 0 ? usersList : currentDb.users,
      sessions: sessionsList.length > 0 ? sessionsList : currentDb.sessions,
      messages: messagesList.length > 0 ? messagesList : currentDb.messages,
      reschedules: reschedulesList.length > 0 ? reschedulesList : currentDb.reschedules,
      complaints: complaintsList.length > 0 ? complaintsList : currentDb.complaints,
      assessments: assessmentsList.length > 0 ? assessmentsList : currentDb.assessments
    };

    saveState('users', mergedDb.users);
    saveState('sessions', mergedDb.sessions);
    saveState('messages', mergedDb.messages);
    saveState('reschedules', mergedDb.reschedules);
    saveState('complaints', mergedDb.complaints);
    saveState('assessments', mergedDb.assessments);

    // Dispatch storage event to notify other components/tabs
    window.dispatchEvent(new Event('storage'));

    return mergedDb;
  } catch (e) {
    console.error('Error fetching data from Supabase, using local cached database:', e);
    return getDb();
  }
};
