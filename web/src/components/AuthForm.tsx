"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IMaskInput } from "react-imask";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/auth-form.css";

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
}

export function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    cpf: ''
  });
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/register') {
      setIsSignUp(true);
    } else if (pathname === '/login') {
      setIsSignUp(false);
    }
  }, [pathname]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      if (isSignUp) {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          router.push('/dashboard');
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Erro no registro');
        }
      } else {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });

        if (response.ok) {
          router.push('/dashboard');
        } else {
          const error = await response.json();
          throw new Error(error.message || 'Erro no login');
        }
      }
    } catch (error: any) {
      console.error('Erro:', error);
      setError(error.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const newMode = !isSignUp;
    setIsSignUp(newMode);
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      cpf: ''
    });
    
    if (newMode) {
      router.push('/register', { scroll: false });
    } else {
      router.push('/login', { scroll: false });
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card-switch">
        <div className="auth-switch">
          <div className="auth-card-side">
            <span className={`auth-tab-label login-label ${!isSignUp ? 'active' : ''}`}>
              Login
            </span>
            <label>
              <input 
                type="checkbox" 
                className="auth-toggle" 
                checked={isSignUp}
                onChange={handleToggle}
              />
              <span className="auth-slider"></span>
            </label>
            <span className={`auth-tab-label signup-label ${isSignUp ? 'active' : ''}`}>
              Cadastro
            </span>
          </div>
        </div>

        <div className="auth-flip-card__inner">
          <AnimatePresence mode="wait">
            <motion.div 
              key={isSignUp ? 'signup' : 'login'}
              className={isSignUp ? 'auth-flip-card__back' : 'auth-flip-card__front'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <form className="auth-flip-card__form" onSubmit={handleSubmit}>
                {error && (
                  <div className="w-full p-3 mb-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-500">
                    {error}
                  </div>
                )}
                {isSignUp && (
                  <>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Nome completo"
                      className="auth-flip-card__input"
                      required
                    />
                    <IMaskInput
                      mask="(00) 00000-0000"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Celular"
                      className="auth-flip-card__input"
                      required
                    />
                    <IMaskInput
                      mask="000.000.000-00"
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      placeholder="CPF"
                      className="auth-flip-card__input"
                      required
                    />
                  </>
                )}
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Email"
                  className="auth-flip-card__input"
                  required
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Senha"
                  className="auth-flip-card__input"
                  required
                />
                <motion.button
                  type="submit"
                  className="auth-flip-card__btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isSignUp ? 'Criando conta...' : 'Entrando...'}
                    </span>
                  ) : (
                    isSignUp ? 'Criar conta' : 'Entrar'
                  )}
                </motion.button>
              </form>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
} 