import React from 'react';
import type { UserRole } from '../types';
import { Shield, Users, User, Landmark } from '../customIcons';

interface RoleSwitcherProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ currentRole, onChangeRole }) => {
  const roles: { value: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'admin', label: 'المدير (Admin)', icon: <Landmark size={16} />, color: 'var(--primary-glow)' },
    { value: 'supervisor', label: 'المشرف (Supervisor)', icon: <Shield size={16} />, color: '#ec4899' },
    { value: 'teacher', label: 'المعلم (Teacher)', icon: <Users size={16} />, color: '#3b82f6' },
    { value: 'student', label: 'الطالب (Student)', icon: <User size={16} />, color: '#10b981' }
  ];

  return (
    <div className="role-switcher-container">
      <div className="role-switcher-header">
        <span className="role-switcher-dot"></span>
        <span>محاكاة الأدوار (للتحقق)</span>
      </div>
      <div className="role-switcher-buttons">
        {roles.map((r) => (
          <button
            key={r.value}
            onClick={() => onChangeRole(r.value)}
            className={`role-switcher-btn ${currentRole === r.value ? 'active' : ''}`}
            style={{
              '--btn-accent': r.color
            } as React.CSSProperties}
          >
            {r.icon}
            <span>{r.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
