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
      if (!email) {
        setErrorMessage("Email é obrigatório");
        return;
      }
      
      if (!password) {
        setErrorMessage("Senha é obrigatória");
        return;
      }
      
      console.log('🔐 Tentando login com:', email);
      
      // Autenticação direta com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Erro de autenticação:", error.message);
        setErrorMessage("Credenciais inválidas ou problemas de conexão");
        return;
      }
      
      console.log("✅ Login bem-sucedido no Auth!");
      
      if (data.user) {
        // Buscar dados completos do usuário na tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, name, telegram_id')
          .eq('id', data.user.id)
          .single();

        if (userError) {
          console.warn('⚠️ Usuário não encontrado na tabela users, criando...');
          
          // Se o usuário não existe na tabela users, criar
          const { error: createError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) {
            console.error('❌ Erro ao criar usuário:', createError);
          }
        }

        // Salvar dados no localStorage
        const userForStorage = {
          id: data.user.id,
          email: data.user.email || email,
          name: userData?.name || data.user.user_metadata?.name || email.split('@')[0] || 'Usuário',
        };
        
        localStorage.setItem('blackinpay_user', JSON.stringify(userForStorage));
        console.log('✅ Usuário salvo no localStorage:', userForStorage.id);
        
        // Redirecionamento direto via href
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