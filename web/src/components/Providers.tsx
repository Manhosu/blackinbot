'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Prefetch páginas comuns quando o componente montar
  useEffect(() => {
    const pagesToPrefetch = [
      '/',
      '/login',
      '/register',
      '/dashboard'
    ];
    
    // Prefetch todas as rotas comuns para navegação instantânea
    pagesToPrefetch.forEach(path => {
      if (path !== pathname) {
        router.prefetch(path);
      }
    });
  }, [pathname, router]);

  // Capturar cliques em links para exibir transições suaves
  useEffect(() => {
    const handleNavigation = () => {
      setIsNavigating(true);
    };

    // Adicionar event listeners para capturar cliques em links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href.includes(window.location.origin) && !e.ctrlKey && !e.metaKey) {
        handleNavigation();
      }
    });

    // Limpar evento de transição quando a página carregar completamente
    const clearNavigating = () => {
      setIsNavigating(false);
    };

    window.addEventListener('load', clearNavigating);

    // Quando a rota mudar, resetar o estado
    const handleRouteChangeComplete = () => {
      setIsNavigating(false);
    };

    // Observar mudanças de caminho para resetar o estado
    let lastPathname = pathname;
    const intervalId = setInterval(() => {
      if (pathname !== lastPathname) {
        lastPathname = pathname;
        handleRouteChangeComplete();
      }
    }, 100);

    return () => {
      window.removeEventListener('load', clearNavigating);
      clearInterval(intervalId);
    };
  }, [pathname]);

  // Estilo para o loader de transição
  const loaderStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '3px',
    backgroundColor: 'var(--accent)',
    transformOrigin: 'left',
    animation: isNavigating ? 'loading 1s infinite ease-in-out' : 'none',
    zIndex: 9999,
    opacity: isNavigating ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
  } as React.CSSProperties;

  return (
    <>
      <style jsx global>{`
        @keyframes loading {
          0% { transform: translateX(0) scaleX(0); }
          50% { transform: translateX(0) scaleX(0.5); }
          100% { transform: translateX(100%) scaleX(0); }
        }
        
        /* Estilo para acelerar transições de página */
        a {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        
        .fast-transition {
          transition: opacity 0.15s ease-in-out;
        }
      `}</style>
      
      {/* Loader de navegação */}
      <div style={loaderStyle} />
      
      {/* Envolver todo o conteúdo em uma div que pode ter transição */}
      <div className={`${isNavigating ? 'opacity-80' : 'opacity-100'} fast-transition`}>
        {children}
      </div>
    </>
  );
} 