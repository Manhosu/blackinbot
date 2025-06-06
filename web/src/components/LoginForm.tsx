"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import "../styles/auth-form.css";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Função direta e simplificada para login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setErrorMessage("");
      
      // Validações básicas
      if (!email || !password) {
        setErrorMessage((!email ? "Email" : "Senha") + " é obrigatório");
        return;
      }
      
      console.log('🔐 Tentando login com:', email);
      
      // 🚀 OTIMIZAÇÃO: Login mais direto
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Erro de autenticação:", error.message);
        setErrorMessage("Credenciais inválidas");
        return;
      }
      
      if (data.user) {
        console.log("✅ Login bem-sucedido!");
        
        // 🚀 OTIMIZAÇÃO: Salvar dados mínimos no localStorage imediatamente
        const userForStorage = {
          id: data.user.id,
          email: data.user.email || email,
          name: data.user.user_metadata?.name || email.split('@')[0] || 'Usuário',
        };
        
        localStorage.setItem('blackinpay_user', JSON.stringify(userForStorage));
        console.log('✅ Usuário salvo, redirecionando...');
        
        // 🚀 OTIMIZAÇÃO: Redirecionamento imediato sem verificações extras
        window.location.href = "/dashboard";
      }
      
    } catch (err: any) {
      console.error("❌ Erro ao fazer login:", err);
      setErrorMessage("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper" style={{ position: 'relative', zIndex: 100, marginTop: '-30px' }}>
      <div className="auth-card-switch">
        <div className="auth-flip-card__front">
          <div className="auth-title">Login</div>
          <form onSubmit={handleLogin} className="auth-flip-card__form">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-flip-card__input"
              placeholder="Email"
              type="email"
              autoComplete="username"
              required
            />
            
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-flip-card__input"
              placeholder="Senha"
              type="password"
              autoComplete="current-password"
              required
            />
            
            <button 
              className="auth-flip-card__btn" 
              type="submit" 
              disabled={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
            
            {errorMessage && (
              <div className="bg-red-100 text-red-700 p-2 rounded mt-2 text-sm">
                {errorMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
} 