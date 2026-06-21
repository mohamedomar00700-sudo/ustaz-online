import React from 'react';
import type { UserRole } from '../types';
import { 
  Landmark, Users, Calendar, BarChart3, FileText, Database, Settings,
  Shield, Bell, AlertCircle, RefreshCw, Clock, MessageSquare, PlusCircle, User, LogOut, CheckSquare
} from 'lucide-react';
import { getDb } from '../mockData';
import academyLogo from '../assets/logo.png';

interface SidebarProps {
  role: UserRole;
  currentPath: string;
  onNavigate: (path: string) => void;
  userEmail: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, currentPath, onNavigate, userEmail, onLogout }) => {
  
  // Get active user details
  const getUserName = () => {
    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
    return user ? user.name : userEmail;
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'إدارة الأكاديمية';
      case 'supervisor': return 'مشرف الأكاديمية';
      case 'teacher': return 'المعلّم';
      case 'student': return 'طالب';
    }
  };

  // Define navigation menu items per role
  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          { path: '/admin', label: 'لوحة التحكم', icon: <Landmark size={18} /> },
          { path: '/admin/users', label: 'المستخدمون', icon: <Users size={18} /> },
          { path: '/admin/sessions', label: 'الجلسات', icon: <Calendar size={18} /> },
          { path: '/admin/reports', label: 'التقارير', icon: <BarChart3 size={18} /> },
          { path: '/admin/activity', label: 'سجل النشاط', icon: <FileText size={18} /> },
          { path: '/admin/audit', label: 'سجل المراجعة', icon: <Database size={18} /> },
          { path: '/admin/settings', label: 'الإعدادات', icon: <Settings size={18} /> }
        ];
      case 'supervisor':
        return [
          { path: '/supervisor', label: 'لوحة المتابعة', icon: <Shield size={18} /> },
          { path: '/supervisor/activity', label: 'سجل النشاط', icon: <FileText size={18} /> },
          { path: '/supervisor/alerts', label: 'التنبيهات', icon: <Bell size={18} /> },
          { path: '/supervisor/complaints', label: 'الشكاوى', icon: <AlertCircle size={18} /> },
          { path: '/supervisor/reschedule', label: 'إعادة الجدولة', icon: <RefreshCw size={18} /> },
          { path: '/supervisor/settings', label: 'الإعدادات', icon: <Settings size={18} /> }
        ];
      case 'teacher':
        return [
          { path: '/tutor', label: 'لوحة التحكم', icon: <Landmark size={18} /> },
          { path: '/tutor/sessions', label: 'جلساتي', icon: <Calendar size={18} /> },
          { path: '/tutor/availability', label: 'التوفر', icon: <Clock size={18} /> },
          { path: '/tutor/chat', label: 'المحادثات', icon: <MessageSquare size={18} /> },
          { path: '/tutor/notifications', label: 'الإشعارات', icon: <Bell size={18} /> },
          { path: '/tutor/settings', label: 'الإعدادات', icon: <Settings size={18} /> },
          { path: '/tutor/profile', label: 'ملفي الشخصي', icon: <User size={18} /> }
        ];
      case 'student':
        return [
          { path: '/student', label: 'الرئيسية', icon: <Landmark size={18} /> },
          { path: '/student/book', label: 'حجز جلسة', icon: <PlusCircle size={18} /> },
          { path: '/student/sessions', label: 'جلساتي', icon: <Calendar size={18} /> },
          { path: '/student/assessments', label: 'الاختبارات والتقييمات', icon: <CheckSquare size={18} /> },
          { path: '/student/chat', label: 'المحادثات', icon: <MessageSquare size={18} /> },
          { path: '/student/notifications', label: 'الإشعارات', icon: <Bell size={18} /> },
          { path: '/student/settings', label: 'الإعدادات', icon: <Settings size={18} /> },
          { path: '/student/profile', label: 'ملفي الشخصي', icon: <User size={18} /> }
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
        <img 
          src={academyLogo} 
          alt="لوجو الأكاديمية" 
          style={{ 
            width: '38px', 
            height: '38px', 
            borderRadius: '50%', 
            backgroundColor: '#ffffff', 
            padding: '2px',
            border: '2px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            objectFit: 'cover'
          }} 
        />
        <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.05rem' }}>أستاذ أونلاين</span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '1rem 0.5rem' }}>
        <ul style={{ listStyle: 'none' }}>
          {menuItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.path} style={{ marginBottom: '0.25rem' }}>
                <button
                  onClick={() => onNavigate(item.path)}
                  className={`menu-item-link ${isActive ? 'active' : ''}`}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'right' }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="avatar-fallback">
            {getUserName().charAt(0)}
          </div>
          <div className="user-info">
            <span className="user-name">{getUserName()}</span>
            <span className="user-role-badge">{getRoleLabel()}</span>
          </div>
        </div>
        <button onClick={onLogout} className="logout-btn">
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};
