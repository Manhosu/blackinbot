// Componente descontinuado. Use LoginForm.tsx e RegisterForm.tsx separados para cada página.

"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import "../styles/auth-form.css";

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Atualiza o modo com base na página atual
    if (pathname === '/register') {
      setIsSignUp(true);
    } else if (pathname === '/login') {
      setIsSignUp(false);
    }

    // Corrigir o erro de preload CSS removendo os links preload problemáticos
    const removeIncorrectPreloadLinks = () => {
      document.querySelectorAll('link[rel="preload"][as=""]').forEach(link => {
        link.setAttribute('as', 'style');
      });
      
      // Também remover links específicos que estão causando problemas
      document.querySelectorAll('link[rel="preload"][href*="app/login/page.css"], link[rel="preload"][href*="app/register/page.css"]').forEach(link => {
        if (!link.hasAttribute('as') || link.getAttribute('as') === '') {
          link.setAttribute('as', 'style');
        }
      });
    };

    // Executar a correção após um breve delay para garantir que os links foram carregados
    setTimeout(removeIncorrectPreloadLinks, 100);
    
    // Executar novamente se houver uma mudança no pathname
  }, [pathname]);

  const handleToggle = () => {
    const newMode = !isSignUp;
    setIsSignUp(newMode);
    
    // Redireciona para a página correta com base na seleção
    if (newMode) {
      // Se está mudando para cadastro
      router.push('/register');
    } else {
      // Se está mudando para login
      router.push('/login');
    }
  };

  // Adaptar o estilo conforme a página atual
  const wrapperStyle = {
    position: 'relative',
    zIndex: 100,
    marginTop: '-30px'
  } as React.CSSProperties;

  return (
    <div className="auth-wrapper" style={wrapperStyle}>
      <div className="auth-card-switch">
        <label className="auth-switch">
          <input 
            type="checkbox" 
            className="auth-toggle" 
            checked={isSignUp}
            onChange={handleToggle}
          />
          <span className="auth-slider"></span>
          <span className="auth-card-side">
            <span className={`auth-tab-label login-label ${!isSignUp ? 'active' : ''}`}>Login</span>
            <span className={`auth-tab-label signup-label ${isSignUp ? 'active' : ''}`}>Cadastro</span>
          </span>
          <div className="auth-flip-card__inner">
            <div className="auth-flip-card__front">
              <div className="auth-title">Login</div>
              <form className="auth-flip-card__form" action="">
                <input 
                  className="auth-flip-card__input" 
                  name="email" 
                  placeholder="Email" 
                  type="email"
                />
                <input 
                  className="auth-flip-card__input" 
                  name="password" 
                  placeholder="Senha" 
                  type="password"
                />
                <button className="auth-flip-card__btn">Entrar</button>
              </form>
            </div>
            <div className="auth-flip-card__back">
              <div className="auth-title">Cadastro</div>
              <form className="auth-flip-card__form" action="">
                <input 
                  className="auth-flip-card__input" 
                  placeholder="Nome" 
                  type="text"
                  name="name"
                />
                <input 
                  className="auth-flip-card__input" 
                  name="email" 
                  placeholder="Email" 
                  type="email"
                />
                <input 
                  className="auth-flip-card__input" 
                  name="password" 
                  placeholder="Senha" 
                  type="password"
                />
                <button className="auth-flip-card__btn">Confirmar</button>
              </form>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
} 