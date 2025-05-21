'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';

const AuthForm = dynamic(() => import('@/components/AuthForm').then(mod => mod.AuthForm), {
  loading: () => <div className="animate-pulse bg-card/50 rounded-lg h-96"></div>
});

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen bg-gradient-dark flex-col">
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
        <div className="absolute top-0 left-0 w-96 h-96 bg-accent bg-opacity-20 rounded-full filter blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-accent bg-opacity-10 rounded-full filter blur-3xl"></div>
      </div>
      
      <div className="flex flex-col md:flex-row flex-1">
        {/* Lado esquerdo - Formulário */}
        <section className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <Link 
                href="/" 
                className="inline-flex items-center text-white text-opacity-70 hover:text-white transition-all mb-6"
                prefetch={true}
                aria-label="Voltar para página inicial"
              >
                <ArrowLeft size={16} className="mr-2" />
                <span>Voltar para página inicial</span>
              </Link>
            </div>
            
            <div className="relative z-50">
              <AuthForm initialMode="signup" />
            </div>
          </div>
        </section>
        
        {/* Lado direito - Ilustração */}
        <section className="hidden md:flex flex-1 relative" aria-label="Vantagens do BLACKINPAY">
          <div className="w-full h-full flex items-center justify-center p-8">
            <div className="glass-card w-[500px] aspect-square overflow-hidden relative shadow-glow animate-float">
              <div className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-accent bg-opacity-50 backdrop-blur-sm flex items-center justify-center shadow-glow">
                <Sparkles size={18} className="text-white" aria-hidden="true" />
              </div>
              
              <div className="p-10 flex flex-col items-center justify-center h-full">
                <div className="w-32 h-32 rounded-full bg-accent bg-opacity-20 flex items-center justify-center relative mb-8">
                  <div className="text-6xl" role="img" aria-label="Robot emoji">🤖</div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-green-500 border-4 border-primary flex items-center justify-center">
                    <CheckCircle size={16} className="text-white" aria-hidden="true" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4 text-center">
                  Vantagens do BLACKINPAY
                </h2>
                
                <ul className="space-y-4 w-full">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" aria-hidden="true" />
                    </div>
                    <span className="text-white text-opacity-90">Configure em menos de 5 minutos</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" aria-hidden="true" />
                    </div>
                    <span className="text-white text-opacity-90">Automatize 100% do processo de vendas</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" aria-hidden="true" />
                    </div>
                    <span className="text-white text-opacity-90">Suporte para múltiplos grupos</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" aria-hidden="true" />
                    </div>
                    <span className="text-white text-opacity-90">Receba pagamentos via Pix</span>
                  </li>
                  
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent bg-opacity-20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" aria-hidden="true" />
                    </div>
                    <span className="text-white text-opacity-90">Sem taxa de adesão ou mensalidades</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
} 