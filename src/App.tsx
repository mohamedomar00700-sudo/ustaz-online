import React, { useState, useEffect } from 'react';
import type { UserRole } from './types';
import { Sidebar } from './components/Sidebar';
import { RoleSwitcher } from './components/RoleSwitcher';
import { Auth } from './pages/Auth';
import { Admin } from './pages/Admin';
import { Supervisor } from './pages/Supervisor';
import { Teacher } from './pages/Teacher';
import { Student } from './pages/Student';
import { NotFound } from './pages/NotFound';
import { Topbar } from './components/Topbar';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { fetchFromSupabase } from './mockData';

export const App: React.FC = () => {
  // Authentication & Role State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ustaz_isLoggedIn') === 'true';
  });
  
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem('ustaz_userEmail') || '';
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (localStorage.getItem('ustaz_role') as UserRole) || 'student';
  });

  // Helper to extract clean path from hash (falling back to pathname)
  const getCleanPath = () => {
    const hash = window.location.hash;
    if (hash) {
      return hash.replace(/^#/, '') || '/';
    }
    let path = window.location.pathname;
    if (path.startsWith('/ustaz-online')) {
      path = path.slice('/ustaz-online'.length);
    }
    return path || '/';
  };

  // Simple State-Based Router
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return getCleanPath();
  });

  // Keep history synchronised
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(getCleanPath());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Supabase real-time sync & session listener
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Load initial data from Supabase
    fetchFromSupabase().catch(console.error);

    // Listen to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const email = session.user.email || '';
        // Fetch or provision user profile
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        let role: UserRole = 'student';
        if (error || !profile) {
          // Provision new profile
          const signupRole = (localStorage.getItem('ustaz_signup_role') as UserRole) || 'student';
          await supabase.from('profiles').insert({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || email.split('@')[0],
            email,
            role: signupRole,
            status: 'active',
            xp: 0,
            level: 1,
            streak: 1,
            badges: []
          });
          role = signupRole;
        } else {
          role = profile.role as UserRole;
        }

        // Save session locally
        localStorage.setItem('ustaz_isLoggedIn', 'true');
        localStorage.setItem('ustaz_userEmail', email);
        localStorage.setItem('ustaz_role', role);
        setIsLoggedIn(true);
        setUserEmail(email);
        setCurrentRole(role);
      } else {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('ustaz_isLoggedIn');
          localStorage.removeItem('ustaz_userEmail');
          localStorage.removeItem('ustaz_role');
          setIsLoggedIn(false);
          setUserEmail('');
          setCurrentRole('student');
          navigate('/auth');
        }
      }
    });

    // Real-time table updates subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchFromSupabase().catch(console.error);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
  };

  const handleLoginSuccess = (email: string, role: UserRole) => {
    localStorage.setItem('ustaz_isLoggedIn', 'true');
    localStorage.setItem('ustaz_userEmail', email);
    localStorage.setItem('ustaz_role', role);
    
    setIsLoggedIn(true);
    setUserEmail(email);
    setCurrentRole(role);

    // Redirect to the appropriate dashboard
    if (role === 'admin') navigate('/admin');
    else if (role === 'supervisor') navigate('/supervisor');
    else if (role === 'teacher') navigate('/tutor');
    else navigate('/student');
  };

  const handleLogout = async () => {
    localStorage.removeItem('ustaz_isLoggedIn');
    localStorage.removeItem('ustaz_userEmail');
    localStorage.removeItem('ustaz_role');
    
    setIsLoggedIn(false);
    setUserEmail('');
    setCurrentRole('student');
    navigate('/auth');

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Supabase signout error:', err);
      }
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    localStorage.setItem('ustaz_role', newRole);
    setCurrentRole(newRole);

    // Navigate to role's dashboard
    if (newRole === 'admin') navigate('/admin');
    else if (newRole === 'supervisor') navigate('/supervisor');
    else if (newRole === 'teacher') navigate('/tutor');
    else navigate('/student');
  };

  // Route guarding
  useEffect(() => {
    if (!isLoggedIn && currentPath !== '/auth') {
      navigate('/auth');
    } else if (isLoggedIn && (currentPath === '/auth' || currentPath === '/')) {
      // Redirect logged in user from auth page to dashboard
      if (currentRole === 'admin') navigate('/admin');
      else if (currentRole === 'supervisor') navigate('/supervisor');
      else if (currentRole === 'teacher') navigate('/tutor');
      else navigate('/student');
    }
  }, [isLoggedIn, currentRole, currentPath]);

  // Main Page Content Renderer
  const renderPage = () => {
    if (!isLoggedIn) {
      return <Auth onLoginSuccess={handleLoginSuccess} />;
    }

    // Active path routing
    const isPath = (pattern: string) => currentPath.startsWith(pattern);

    if (currentRole === 'admin' && isPath('/admin')) {
      return <Admin currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentRole === 'supervisor' && isPath('/supervisor')) {
      return <Supervisor currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentRole === 'teacher' && isPath('/tutor')) {
      return <Teacher currentPath={currentPath} onNavigate={navigate} />;
    }
    if (currentRole === 'student' && isPath('/student')) {
      return <Student currentPath={currentPath} onNavigate={navigate} />;
    }

    // 404 Route Fallback
    return (
      <NotFound 
        onReturnHome={() => {
          if (currentRole === 'admin') navigate('/admin');
          else if (currentRole === 'supervisor') navigate('/supervisor');
          else if (currentRole === 'teacher') navigate('/tutor');
          else navigate('/student');
        }} 
      />
    );
  };

  const showSidebar = isLoggedIn && currentPath !== '/auth' && !['/admin', '/supervisor', '/tutor', '/student'].every(p => !currentPath.startsWith(p));

  return (
    <div className="app-layout" style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-main)' }}>
      {showSidebar && (
        <Sidebar 
          role={currentRole} 
          currentPath={currentPath} 
          onNavigate={navigate} 
          userEmail={userEmail}
          onLogout={handleLogout}
        />
      )}

      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        minWidth: 0,
        paddingRight: showSidebar ? '280px' : '0'
      }}>
        {isLoggedIn && currentPath !== '/auth' && (
          <Topbar 
            currentPath={currentPath} 
            userEmail={userEmail} 
            onLogout={handleLogout} 
            role={currentRole} 
          />
        )}
        <main style={{ flex: 1, display: 'flex', width: '100%', overflowY: 'auto' }}>
          {renderPage()}
        </main>
      </div>

      {/* Dynamic Role Switcher for local simulation */}
      {isLoggedIn && (
        <RoleSwitcher currentRole={currentRole} onChangeRole={handleRoleChange} />
      )}
    </div>
  );
};
export default App;
