'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Lock, Sparkles } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';

export default function LoginPage() {
  const router = useRouter();
  
  // Solução para corrigir o preload CSS warning
  useEffect(() => {
    // Remover link preload incorreto e adicionar com atributo 'as' correto
    const linkElements = document.querySelectorAll('link[rel="preload"][href*="app/login/page.css"]');
    linkElements.forEach(link => link.remove());
  }, []);

  return (
      <div className="flex min-h-screen flex-col bg-gradient-dark">
        {/* Logo centralizada no topo */}
        <div className="w-full flex flex-col items-center pt-12 pb-8">
          <Image 
            src="/logo.png" 
            alt="BLACKINPAY" 
            width={100} 
            height={100} 
            className="object-contain mb-2 drop-shadow-lg"
            priority
          />
          <span className="text-white text-3xl font-bold font-heading tracking-tight">BLACKINPAY</span>
        </div>
        {/* Background elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1">
          {/* Lado esquerdo - Formulário */}
          <div className="flex-1 flex flex-col justify-center items-center p-8">
            <div className="w-full max-w-md">
              <div className="mb-10">
                <Link href="/" className="inline-flex items-center text-white/70 hover:text-white transition-all mb-8">
                  <ArrowLeft size={16} className="mr-2" />
                  <span>Voltar para página inicial</span>
                </Link>
                
                <h1 className="text-3xl md:text-4xl font-bold text-white font-heading tracking-tight mb-2">Bem-vindo de volta!</h1>
                <p className="text-white/70 text-lg mb-8">Acesse sua conta para gerenciar seus bots e grupos</p>
              </div>
              
              <div className="relative z-10">
                <AuthForm initialMode="login" />
              </div>
            </div>
          </div>
          
          {/* Lado direito - Ilustração */}
          <div className="hidden md:flex flex-1 relative">
            <div className="w-full h-full flex items-center justify-center p-8">
              <div className="glass-card w-[500px] aspect-square overflow-hidden relative shadow-glow animate-float">
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-accent/50 backdrop-blur-sm flex items-center justify-center shadow-glow">
                  <Sparkles size={18} className="text-white" />
                </div>
                
                <div className="p-10 flex flex-col items-center justify-center h-full">
                  <div className="w-24 h-24 mb-8 bg-accent/20 rounded-full flex items-center justify-center">
                    <span className="text-5xl">🤖</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold font-heading text-gradient mb-6 text-center">
                    BLACKINPAY
                  </h3>
                  
                  <div className="space-y-6 w-full">
                    <div className="glass p-4 rounded-xl backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white">B</div>
                        <div>
                          <p className="font-medium">Black Bot</p>
                          <p className="text-sm text-white/60">Online agora</p>
                        </div>
                        <div className="ml-auto w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                    </div>
                    
                    <div className="glass p-4 rounded-xl backdrop-blur-md">
                      <p className="text-white/90 text-sm">
                        Automatize o acesso aos seus grupos no Telegram e comece a faturar agora!
                      </p>
                    </div>
                    
                    <div className="glass p-4 rounded-xl backdrop-blur-md">
                      <div className="flex justify-between items-center">
                        <p className="text-white text-sm font-medium">Usuários ativos</p>
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 rounded-full border-2 border-primary bg-blue-600 flex items-center justify-center text-white text-xs">M</div>
                          <div className="w-8 h-8 rounded-full border-2 border-primary bg-purple-600 flex items-center justify-center text-white text-xs">L</div>
                          <div className="w-8 h-8 rounded-full border-2 border-primary bg-green-600 flex items-center justify-center text-white text-xs">C</div>
                          <div className="w-8 h-8 rounded-full border-2 border-primary bg-accent flex items-center justify-center text-white text-xs">+5</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}  