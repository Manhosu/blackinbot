import Link from 'next/link';

export default function Custom500() {
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
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>500</h1>
      <p style={{ color: '#999999', marginBottom: '16px' }}>Erro interno do servidor</p>
      <Link 
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
      </Link>
    </div>
  );
} 