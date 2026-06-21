import React from 'react';
import { Landmark, ArrowLeft } from 'lucide-react';

interface NotFoundProps {
  onReturnHome: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({ onReturnHome }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: 'var(--bg-main)',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'rgba(16, 185, 129, 0.05)',
        filter: 'blur(80px)',
        pointerEvents: 'none'
      }}></div>

      <div className="glass-card glowing" style={{ maxWidth: '480px', width: '100%', padding: '3rem 2rem' }}>
        <div className="logo-icon" style={{ margin: '0 auto 1.5rem', width: '60px', height: '60px', borderRadius: '14px' }}>
          <Landmark size={32} />
        </div>

        <h1 style={{
          fontSize: '6rem',
          fontWeight: 900,
          lineHeight: 1,
          margin: 0,
          background: 'linear-gradient(135deg, #10b981 0%, #ef4444 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-2px'
        }}>
          404
        </h1>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '1rem 0 0.5rem', color: 'var(--text-main)' }}>
          عذراً! الصفحة غير موجودة
        </h2>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          الصفحة التي تبحث عنها قد تكون حُذفت، تم تغيير اسمها، أو أنها غير متاحة مؤقتاً.
        </p>

        <button onClick={onReturnHome} className="btn-primary" style={{ width: '100%', gap: '0.5rem' }}>
          <ArrowLeft size={16} />
          <span>العودة للرئيسية</span>
        </button>
      </div>
    </div>
  );
};
