import React, { useState } from 'react';
import type { UserRole } from '../types';
import { getDb, saveDb } from '../mockData';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { GraduationCap, Users, Globe, Lock, Mail, User, AlertCircle } from 'lucide-react';
import academyLogo from '../assets/logo.png';

interface AuthProps {
  onLoginSuccess: (email: string, role: UserRole) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [signupRole, setSignupRole] = useState<UserRole>('student');
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password Strength Meter
  const getPasswordStrength = () => {
    if (!password) return { label: '', percent: 0, color: 'transparent' };
    if (password.length < 6) return { label: 'ضعيفة جداً', percent: 20, color: 'var(--danger)' };
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    if (hasLetters && hasNumbers && hasSpecial && password.length >= 8) {
      return { label: 'قوية جداً', percent: 100, color: 'var(--success)' };
    }
    if (hasLetters && hasNumbers && password.length >= 6) {
      return { label: 'متوسطة', percent: 60, color: 'var(--warning)' };
    }
    return { label: 'ضعيفة', percent: 40, color: 'var(--warning)' };
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });
        if (error) throw error;
      } catch (err: any) {
        setError(err.message || 'فشل تسجيل الدخول بواسطة Google');
        setLoading(false);
      }
    } else {
      setTimeout(() => {
        // Simulate successful login with Admin Role
        onLoginSuccess('ustaz_tester_999@example.com', 'admin');
        setLoading(false);
      }, 1200);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured) {
      try {
        if (isLogin) {
          // Real Supabase Login
          const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (loginError) throw loginError;

          if (data.user) {
            // Fetch profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', data.user.id)
              .single();

            if (profileError || !profile) {
              const defaultRole = 'student';
              await supabase.from('profiles').insert({
                id: data.user.id,
                name: email.split('@')[0],
                email,
                role: defaultRole,
                status: 'active',
                xp: 0,
                level: 1,
                streak: 1,
                badges: []
              });
              onLoginSuccess(email, defaultRole);
            } else {
              onLoginSuccess(email, profile.role as UserRole);
            }
          }
        } else {
          // Real Supabase Signup
          if (password.length < 6) {
            setError('كلمة المرور ضعيفة جداً، يرجى اختيار ٦ أحرف على الأقل');
            setLoading(false);
            return;
          }
          if (!fullName) {
            setError('يرجى إدخال اسمك الكامل');
            setLoading(false);
            return;
          }

          const { data, error: signupError } = await supabase.auth.signUp({
            email,
            password
          });
          if (signupError) throw signupError;

          if (data.user) {
            const newUserProfile = {
              id: data.user.id,
              name: fullName,
              email: email.toLowerCase(),
              role: signupRole,
              status: 'active',
              country: 'مصر',
              timezone: 'Africa/Cairo',
              xp: 0,
              level: 1,
              streak: 1,
              badges: []
            };

            const { error: insertError } = await supabase
              .from('profiles')
              .insert(newUserProfile);

            if (insertError) throw insertError;

            // Sync with local memory cache users
            const db = getDb();
            db.users.push({
              id: data.user.id,
              name: fullName,
              email: email.toLowerCase(),
              role: signupRole,
              status: 'active',
              country: 'مصر',
              timezone: 'Africa/Cairo',
              xp: 0,
              level: 1,
              streak: 1,
              badges: []
            });
            saveDb(db);

            setSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول.');
            setIsLogin(true);
            setFullName('');
            setPassword('');
          }
        }
      } catch (err: any) {
        setError(err.message || 'حدث خطأ أثناء الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    } else {
      // Local Fallback simulation
      setTimeout(() => {
        if (isLogin) {
          // Find user in mock db
          const db = getDb();
          const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
          
          if (password.length < 6) {
            setError('كلمة المرور غير صحيحة أو قصيرة جداً');
            setLoading(false);
            return;
          }

          if (user) {
            onLoginSuccess(user.email, user.role);
          } else {
            onLoginSuccess(email, 'student');
          }
        } else {
          // Sign Up Flow
          if (password.length < 6) {
            setError('كلمة المرور ضعيفة جداً وسهلة التخمين، يرجى اختيار كلمة مرور أخرى أطول');
            setLoading(false);
            return;
          }
          if (!fullName) {
            setError('يرجى إدخال اسمك الكامل');
            setLoading(false);
            return;
          }
          
          const db = getDb();
          if (db.users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            setError('هذا البريد الإلكتروني مسجل بالفعل');
            setLoading(false);
            return;
          }

          const newUser = {
            id: 'u_' + Date.now(),
            name: fullName,
            email: email.toLowerCase(),
            role: signupRole,
            status: 'active' as const,
            country: 'مصر',
            timezone: 'Africa/Cairo',
            xp: 0,
            level: 1,
            streak: 1,
            badges: []
          };

          const updatedDb = {
            ...db,
            users: [...db.users, newUser]
          };
          saveDb(updatedDb);

          setSuccess('تم إنشاء الحساب وحفظه بنجاح! يمكنك الآن تسجيل الدخول.');
          setIsLogin(true);
          setFullName('');
          setPassword('');
        }
        setLoading(false);
      }, 1500);
    }
  };

  const strength = getPasswordStrength();

  return (
    <div className="auth-layout" style={{ display: 'flex', minHeight: '100vh', width: '100vw' }}>
      
      {/* Right Form Pane */}
      <div className="auth-form-pane" style={{
        flex: 1.2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        backgroundColor: 'var(--bg-main)'
      }}>
        <div className="glass-card glowing" style={{ width: '100%', maxWidth: '440px', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <img 
              src={academyLogo} 
              alt="أستاذ أونلاين" 
              style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                backgroundColor: '#ffffff', 
                padding: '4px',
                marginBottom: '1rem',
                border: '2px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }} 
            />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', background: 'var(--gradient-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {isLogin ? 'أهلاً بعودتك' : 'انضم إلينا'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isLogin ? 'سجّل دخولك للمتابعة إلى حسابك' : 'ابدأ رحلتك التعليمية معنا اليوم'}
            </p>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--success)',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
              <AlertCircle size={16} style={{ color: 'var(--success)' }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">الاسم الكامل</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', right: '1rem', top: '1.05rem', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="أدخل اسمك الكامل"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ paddingRight: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">نوع الحساب (الدور)</label>
                  <select 
                    className="form-select" 
                    value={signupRole} 
                    onChange={(e) => setSignupRole(e.target.value as UserRole)}
                    style={{ padding: '0.65rem' }}
                  >
                    <option value="student">طالب (Student)</option>
                    <option value="teacher">معلم (Teacher)</option>
                    <option value="supervisor">مشرف (Supervisor)</option>
                    <option value="admin">مدير (Admin)</option>
                  </select>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', right: '1rem', top: '1.05rem', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', right: '1rem', top: '1.05rem', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem' }}
                />
              </div>
              
              {!isLogin && password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                    <span>قوة كلمة المرور:</span>
                    <span style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${strength.percent}%`, height: '100%', background: strength.color, transition: 'var(--transition)' }}></div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', height: '48px' }}>
              {loading ? 'جاري التحميل...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب')}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              <span style={{ padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>أو بالبريد الإلكتروني</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn-secondary" style={{ width: '100%', height: '48px', gap: '0.75rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.437-2.883-6.437-6.437 0-3.555 2.882-6.437 6.437-6.437 1.5 0 2.868.517 3.96 1.5l3.1-3.1C18.82 2.054 15.75 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.782 0 10.748-4.114 10.748-11.24 0-.568-.047-1.127-.135-1.673H12.24z"/>
              </svg>
              <span>المتابعة بحساب Google</span>
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              {isLogin ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setSuccess('');
              }}
              style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'underline' }}
            >
              {isLogin ? 'سجّل الآن' : 'سجّل دخولك'}
            </button>
          </div>
        </div>
      </div>

      {/* Left Marketing Pane */}
      <div className="auth-marketing-pane" style={{
        flex: 1,
        background: 'var(--gradient-marketing)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '-10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.08)',
          filter: 'blur(80px)',
          pointerEvents: 'none'
        }}></div>

        <div style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <img 
              src={academyLogo} 
              alt="شعار الأكاديمية" 
              style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                backgroundColor: '#ffffff', 
                padding: '4px',
                border: '2px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)'
              }} 
            />
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)' }}>أكاديمية أستاذ أونلاين</h1>
          </div>
          
          <h2 style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            lineHeight: 1.3,
            marginBottom: '1.5rem',
            background: 'var(--gradient-text)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            تعلّم مع نخبة المعلمين المصريين، أينما كنت.
          </h2>
          
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.8, maxWidth: '520px' }}>
            جلسات فردية ٦٠ دقيقة، جدولة ذكية بتوقيتك المحلي، ومتابعة كاملة من خلال مشرفين مختصين — كل ذلك على منصة آمنة بالكامل.
          </p>
        </div>

        {/* Platform stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '2.5rem',
          maxWidth: '520px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              <Users size={18} />
              <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>150+</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>معلم معتمد</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              <GraduationCap size={18} />
              <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>5K+</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>جلسة شهرياً</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              <Globe size={18} />
              <span style={{ fontSize: '1.75rem', fontWeight: 800 }}>7</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>دول عربية وعالمية</span>
          </div>
        </div>
      </div>

    </div>
  );
};
