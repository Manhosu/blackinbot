'use client';

// Forçar renderização dinâmica para evitar problemas de SSR
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#000000',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>404</h1>
      <p style={{ color: '#999999', marginBottom: '16px' }}>Página não encontrada</p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: '#3b5aef',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none'
        }}
      >
        Voltar ao início
      </a>
    </div>
  );
} 