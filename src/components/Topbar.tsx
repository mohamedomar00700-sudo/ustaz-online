import React, { useState } from 'react';
import { Bell, Search, ChevronDown, LogOut } from '../customIcons';
import { getDb } from '../mockData';

interface TopbarProps {
  currentPath: string;
  userEmail: string;
  onLogout: () => void;
  role: string;
}

export const Topbar: React.FC<TopbarProps> = ({ currentPath, userEmail, onLogout, role }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  const getDbData = () => {
    try {
      return getDb();
    } catch (e) {
      return { users: [], sessions: [], logs: [], reschedules: [], complaints: [] };
    }
  };

  const db = getDbData();
  const currentUser = db.users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
  const userName = currentUser ? currentUser.name : userEmail;
  const userAvatar = currentUser?.avatar || '';

  // Get active breadcrumb title based on path
  const getPageTitle = () => {
    const p = currentPath;
    if (p.startsWith('/admin')) {
      if (p.endsWith('/users')) return 'إدارة المستخدمين';
      if (p.endsWith('/sessions')) return 'جدولة الجلسات';
      if (p.endsWith('/reports')) return 'التقارير والإحصائيات';
      if (p.endsWith('/activity')) return 'سجل النشاط العام';
      if (p.endsWith('/audit')) return 'المراجعة الأمنية';
      if (p.endsWith('/settings')) return 'إعدادات المنصة';
      return 'لوحة المسؤول الرئيسية';
    }
    if (p.startsWith('/supervisor')) {
      if (p.endsWith('/activity')) return 'مراقبة النشاط';
      if (p.endsWith('/alerts')) return 'تنبيهات خرق الأمان';
      if (p.endsWith('/complaints')) return 'تذاكر شكاوى الدعم';
      if (p.endsWith('/reschedule')) return 'طلبات إعادة الجدولة';
      if (p.endsWith('/settings')) return 'تفضيلات الأمان';
      return 'لوحة إشراف المتابعة';
    }
    if (p.startsWith('/tutor')) {
      if (p.endsWith('/sessions')) return 'دروسي وجلساتي';
      if (p.endsWith('/availability')) return 'مواعيد توفري';
      if (p.endsWith('/chat')) return 'محادثات الطلاب';
      if (p.endsWith('/notifications')) return 'صندوق التنبيهات';
      if (p.endsWith('/profile')) return 'الملف الشخصي للمعلّم';
      if (p.endsWith('/settings')) return 'الإعدادات الشخصية';
      return 'لوحة المعلم الرئيسية';
    }
    if (p.startsWith('/student')) {
      if (p.endsWith('/book')) return 'حجز حصة دراسية';
      if (p.endsWith('/sessions')) return 'جدول حصصي';
      if (p.endsWith('/chat')) return 'محادثة الأساتذة';
      if (p.endsWith('/notifications')) return 'التنبيهات الواردة';
      if (p.endsWith('/profile')) return 'حسابي الشخصي';
      if (p.endsWith('/settings')) return 'إعدادات الحساب';
      if (p.endsWith('/assessments')) return 'الاختبارات والتقييمات';
      return 'لوحة الطالب الرئيسية';
    }
    return 'الرئيسية';
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'rgba(16, 185, 129, 0.15)';
      case 'supervisor': return 'rgba(236, 72, 153, 0.15)';
      case 'teacher': return 'rgba(59, 130, 246, 0.15)';
      default: return 'rgba(255, 255, 255, 0.05)';
    }
  };

  const getRoleBadgeTextColor = () => {
    switch (role) {
      case 'admin': return 'var(--primary)';
      case 'supervisor': return '#ec4899';
      case 'teacher': return '#3b82f6';
      default: return 'var(--text-muted)';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return 'مدير النظام';
      case 'supervisor': return 'مشرف أمان';
      case 'teacher': return 'معلم معتمد';
      default: return 'طالب';
    }
  };

  // Pre-configured alerts count based on user role
  const getNotifications = () => {
    const alerts = [
      { id: '1', title: 'تم تأكيد موعد حصة الرياضيات', time: 'قبل 5 دقائق' },
      { id: '2', title: 'رسالة جديدة من المعلم محمد عمر', time: 'قبل ساعة' },
      { id: '3', title: 'طلب إعادة جدولة قيد المراجعة', time: 'قبل ساعتين' }
    ];
    return alerts;
  };

  const notifications = getNotifications();

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span className="breadcrumb-main">أستاذ أونلاين</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-active">{getPageTitle()}</span>
      </div>

      <div className="topbar-search">
        <Search size={16} className="search-icon" />
        <input type="text" placeholder="ابحث عن حصص، معلمين، أو ملفات..." className="search-input" />
      </div>

      <div className="topbar-actions">
        {/* Notifications Icon with Dropdown */}
        <div style={{ position: 'relative' }}>
          <button 
            className={`topbar-btn ${showNotificationsDropdown ? 'active' : ''}`}
            onClick={() => {
              setShowNotificationsDropdown(!showNotificationsDropdown);
              setShowProfileDropdown(false);
            }}
          >
            <Bell size={20} />
            <span className="topbar-badge">{notifications.length}</span>
          </button>

          {showNotificationsDropdown && (
            <div className="topbar-dropdown notifications-dropdown">
              <div className="dropdown-header">
                <span>التنبيهات الأخيرة</span>
                <span className="badge-count">{notifications.length} جديدة</span>
              </div>
              <div className="dropdown-divider"></div>
              <div className="dropdown-list">
                {notifications.map(n => (
                  <div key={n.id} className="dropdown-item notification-item">
                    <div className="notification-dot"></div>
                    <div className="notification-details">
                      <div className="notification-title">{n.title}</div>
                      <div className="notification-time">{n.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="topbar-divider"></div>

        {/* Profile Dropdown Widget */}
        <div style={{ position: 'relative' }}>
          <button 
            className="topbar-profile-btn"
            onClick={() => {
              setShowProfileDropdown(!showProfileDropdown);
              setShowNotificationsDropdown(false);
            }}
          >
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="profile-avatar" />
            ) : (
              <div className="avatar-fallback topbar-avatar-fallback">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="profile-meta">
              <span className="profile-name">{userName}</span>
              <span 
                className="profile-role" 
                style={{ 
                  backgroundColor: getRoleBadgeColor(), 
                  color: getRoleBadgeTextColor() 
                }}
              >
                {getRoleLabel()}
              </span>
            </div>
            <ChevronDown size={14} className="chevron-icon" />
          </button>

          {showProfileDropdown && (
            <div className="topbar-dropdown profile-dropdown">
              <div className="dropdown-profile-header">
                <span className="profile-email">{userEmail}</span>
              </div>
              <div className="dropdown-divider"></div>
              <button onClick={onLogout} className="dropdown-item logout-item">
                <LogOut size={16} />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
