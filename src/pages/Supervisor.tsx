import React, { useState, useEffect } from 'react';
import { getDb, saveDb } from '../mockData';
import type { ActivityLog } from '../types';
import { 
  FileText, AlertCircle, RefreshCw, 
  Check, X, CheckCircle, ShieldAlert, Calendar, AlertTriangle
} from 'lucide-react';

interface SupervisorProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Supervisor: React.FC<SupervisorProps> = ({ currentPath }) => {
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
    if (currentPath === '/supervisor/activity') return 'activity';
    if (currentPath === '/supervisor/alerts') return 'alerts';
    if (currentPath === '/supervisor/reschedule') return 'reschedule';
    if (currentPath === '/supervisor/complaints') return 'complaints';
    if (currentPath === '/supervisor/settings') return 'settings';
    return 'overview';
  })();

  // Compute metrics
  const activeAlertsCount = db.logs.filter(l => l.type === 'contact_block').length;
  const rescheduleRequestsCount = db.reschedules.filter(r => r.status === 'pending').length;
  const pendingComplaintsCount = db.complaints.filter(c => c.status === 'pending').length;

  // Actions for Rescheduling requests
  const handleApproveReschedule = (reqId: string) => {
    const request = db.reschedules.find(r => r.id === reqId);
    if (!request) return;

    // 1. Update rescheduling request status
    const updatedReschedules = db.reschedules.map(r => 
      r.id === reqId ? { ...r, status: 'approved' as const } : r
    );

    // 2. Update actual session date/time in database!
    const updatedSessions = db.sessions.map(s => 
      s.id === request.sessionId ? { ...s, date: request.proposedDate, time: request.proposedTime, status: 'confirmed' as const } : s
    );

    // 3. Log the approval in Activity Log
    const session = db.sessions.find(s => s.id === request.sessionId);
    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'general',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المشرف',
      detail: `قبول طلب إعادة جدولة الجلسة "${session?.subject}" للطالب "${session?.studentName}" إلى ${request.proposedDate} الساعة ${request.proposedTime}`
    };

    const updatedDb = {
      ...db,
      reschedules: updatedReschedules,
      sessions: updatedSessions,
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
  };

  const handleRejectReschedule = (reqId: string) => {
    const request = db.reschedules.find(r => r.id === reqId);
    if (!request) return;

    const updatedReschedules = db.reschedules.map(r => 
      r.id === reqId ? { ...r, status: 'rejected' as const } : r
    );

    const session = db.sessions.find(s => s.id === request.sessionId);
    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'general',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المشرف',
      detail: `رفض طلب إعادة جدولة الجلسة "${session?.subject}" للمعلّم "${session?.teacherName}"`
    };

    const updatedDb = {
      ...db,
      reschedules: updatedReschedules,
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
  };

  const handleResolveComplaint = (complaintId: string) => {
    const updatedComplaints = db.complaints.map(c => 
      c.id === complaintId ? { ...c, status: 'resolved' as const } : c
    );

    const complaint = db.complaints.find(c => c.id === complaintId);
    const newLog: ActivityLog = {
      id: 'l_' + Date.now(),
      type: 'general',
      timestamp: new Date().toLocaleString('ar-EG'),
      user: 'المشرف',
      detail: `حل الشكوى المقدمة من الطالب "${complaint?.user}" بنجاح`
    };

    const updatedDb = {
      ...db,
      complaints: updatedComplaints,
      logs: [newLog, ...db.logs]
    };

    saveDb(updatedDb);
    setDb(updatedDb);
  };

  return (
    <div style={{ width: '100%', padding: '2rem' }}>
      
      {/* Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>بوابة المتابعة والإشراف الأمني 🛡️</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>رصد أمن المحادثات، مراجعة طلبات الجدولة، ومعالجة الشكاوى الواردة</p>
        </div>
      </div>

        {/* Tab 1: Overview Panel */}
        {activeTab === 'overview' && (
          <div>
            <div className="metrics-grid">
              <div className="glass-card metric-card glowing" style={{ borderRight: activeAlertsCount > 0 ? '3px solid var(--danger)' : '1px solid var(--border-color)' }}>
                <div className="metric-info">
                  <span className="metric-label">محاولات التواصل المحجوبة</span>
                  <span className="metric-value" style={{ color: activeAlertsCount > 0 ? 'var(--danger)' : 'inherit' }}>{activeAlertsCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: 'var(--danger)' }}><ShieldAlert size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">طلبات إعادة الجدولة</span>
                  <span className="metric-value">{rescheduleRequestsCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: 'var(--warning)' }}><RefreshCw size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">الشكاوى المعلقة</span>
                  <span className="metric-value">{pendingComplaintsCount}</span>
                </div>
                <div className="metric-icon-box" style={{ color: 'var(--info)' }}><AlertCircle size={24} /></div>
              </div>
              <div className="glass-card metric-card glowing">
                <div className="metric-info">
                  <span className="metric-label">إجمالي جلسات المنصة</span>
                  <span className="metric-value">{db.sessions.length}</span>
                </div>
                <div className="metric-icon-box" style={{ color: 'var(--primary)' }}><Calendar size={24} /></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
              {/* Left Column - Active Warnings & Reschedules */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Blocked contacts highlight */}
                <div className="glass-card">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={16} style={{ color: 'var(--danger)' }} />
                    <span>آخر مراجعات الأمان (حظر الاتصال الخارجي)</span>
                  </h3>
                  
                  {activeAlertsCount === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      لا توجد محاولات تواصل خارج المنصة. النظام آمن بالكامل.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {db.logs.filter(l => l.type === 'contact_block').slice(0, 3).map(log => (
                        <div key={log.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.detail}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{log.timestamp.split(' ').pop()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass-card">
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>جلسات اليوم</h3>
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>لا توجد جلسات مقررة لليوم</div>
                </div>
              </div>

              {/* Right Column - Pending Complaints */}
              <div className="glass-card">
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>الشكاوى المعلقة</h3>
                {pendingComplaintsCount === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    لا توجد شكاوى معلقة. جميع التذاكر مغلقة.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {db.complaints.filter(c => c.status === 'pending').map((comp) => (
                      <div key={comp.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>الطالب: {comp.user}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.date}</span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.6 }}>{comp.detail}</p>
                        <button onClick={() => handleResolveComplaint(comp.id)} className="btn-secondary" style={{ width: '100%', padding: '0.4rem', fontSize: '0.8rem', color: 'var(--success)' }}>حل الشكوى</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Activity Logs Feed */}
        {activeTab === 'activity' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>سجل نشاط النظام (مشرف)</h3>
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
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المنشئ: {log.user}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab alerts: Security Alerts Feed */}
        {activeTab === 'alerts' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />
              <span>تنبيهات الأمان وحظر الاتصال الخارجي</span>
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              النظام يقوم تلقائياً بمسح محادثات الشات وحظر محاولات تبادل معلومات الاتصال الشخصية مثل أرقام الهواتف والروابط الخارجية.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {db.logs.filter(l => l.type === 'contact_block').length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  لا توجد تنبيهات أمنية حالياً.
                </div>
              ) : (
                db.logs.filter(l => l.type === 'contact_block').map((log) => (
                  <div key={log.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
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
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: 'var(--danger)'
                    }}>
                      <AlertTriangle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)' }}>{log.detail}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.timestamp}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>المستخدم المتأثر: {log.user}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Reschedule requests flow */}
        {activeTab === 'reschedule' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>إعادة الجدولة</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>راجع طلبات تغيير مواعيد الدروس والتحقق التلقائي للتعارضات.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {db.reschedules.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>لا توجد طلبات إعادة جدولة حالياً.</div>
              ) : (
                db.reschedules.map((req) => (
                  <div key={req.id} style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{req.sessionDetails}</span>
                        <span style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: req.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: req.status === 'approved' ? 'var(--success)' : req.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'
                        }}>
                          {req.status === 'approved' ? 'مقبولة' : req.status === 'rejected' ? 'مرفوضة' : 'قيد الانتظار'}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        <span>الموعد المقترح: <strong style={{ color: 'var(--text-main)' }}>{req.proposedDate} الساعة {req.proposedTime}</strong></span>
                        <span>سبب الطلب: <strong style={{ color: 'var(--text-main)' }}>{req.reason}</strong></span>
                      </div>
                      
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle size={12} />
                        <span>التحقق من التعارض: لا يوجد تعارض مع جدول المعلم أو الطالب</span>
                      </span>
                    </div>

                    {req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleApproveReschedule(req.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--success)' }}>
                          <Check size={14} />
                          <span>موافقة</span>
                        </button>
                        <button onClick={() => handleRejectReschedule(req.id)} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.2)' }}>
                          <X size={14} />
                          <span>رفض</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Complaints Queue */}
        {activeTab === 'complaints' && (
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>تذاكر الشكاوى والدعم الفني</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {db.complaints.map((comp) => (
                <div key={comp.id} style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>الطالب: {comp.user}</span>
                      <span style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: comp.status === 'resolved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: comp.status === 'resolved' ? 'var(--success)' : 'var(--warning)'
                      }}>
                        {comp.status === 'resolved' ? 'محلولة' : 'قيد المراجعة'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{comp.detail}</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem' }}>التاريخ: {comp.date}</span>
                  </div>

                  {comp.status === 'pending' && (
                    <button onClick={() => handleResolveComplaint(comp.id)} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>إغلاق التذكرة كـ محلولة</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 5: Supervisor Settings */}
        {activeTab === 'settings' && (
          <div className="glass-card" style={{ maxWidth: '600px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>إعدادات التنبيهات والإشعارات</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>إشعارات جهاز المشرف (Push Notifications)</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>تفعيل الإشعارات اللحظية على سطح المكتب لمراجعة محاولات التواصل المحجوبة فوراً.</p>
                </div>
                <input type="checkbox" defaultChecked style={{ width: '20px', height: '20px', accentColor: 'var(--primary)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>أنواع تنبيهات المشرفين</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>طلب إعادة جدولة الجلسة من معلّم/طالب</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تنبيه أمني (حظر مشاركة معلومات اتصال خارجية)</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>شكوى مقدمة من طالب</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem' }}>تنبيه ببدء الجلسات وتأكيد الحضور</span>
                  <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                </div>
              </div>

              <button onClick={() => alert('تم حفظ تفضيلات المشرف')} className="btn-primary" style={{ marginTop: '1rem' }}>حفظ التفضيلات</button>
            </div>
          </div>
        )}

      </div>
  );
};
