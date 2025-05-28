import { NextPage } from 'next';
import Link from 'next/link';

interface ErrorProps {
  statusCode?: number;
}

const Error: NextPage<ErrorProps> = ({ statusCode }) => {
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
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>
        {statusCode ? `Erro ${statusCode}` : 'Erro'}
      </h1>
      <p style={{ color: '#999999', marginBottom: '16px' }}>
        {statusCode
          ? `Ocorreu um erro ${statusCode} no servidor`
          : 'Ocorreu um erro no cliente'}
      </p>
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
};

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error; 