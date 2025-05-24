'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { RegisterForm } from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-dark">
      {/* Botão de voltar */}
      <div className="w-full flex items-center justify-start px-6 pt-8">
        <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-accent transition-colors font-medium text-base">
          <ArrowLeft size={20} />
          <span>Voltar para Home</span>
        </Link>
      </div>
      {/* Logo centralizada no topo */}
      <div className="w-full flex flex-col items-center pt-4 pb-8">
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
      <div className="flex flex-col md:flex-row flex-1 w-full items-center justify-center">
        {/* Formulário */}
        <div className="flex-1 flex flex-col justify-center items-center p-8">
          <div className="w-full max-w-md">
            <RegisterForm />
            <div className="mt-6 text-center">
              <span className="text-white/70">Já tem conta?</span>{' '}
              <Link href="/login" className="text-accent hover:underline font-medium">Faça login</Link>
            </div>
          </div>
        </div>
        {/* Card informativo */}
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
                <ul className="space-y-4 w-full">
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" />
                    </div>
                    <span className="text-white/90">Configure em menos de 5 minutos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" />
                    </div>
                    <span className="text-white/90">Automatize 100% do processo de vendas</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" />
                    </div>
                    <span className="text-white/90">Suporte para múltiplos grupos</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" />
                    </div>
                    <span className="text-white/90">Receba pagamentos via Pix</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-6 h-6 mt-0.5 rounded-full bg-accent/20 flex-shrink-0 flex items-center justify-center">
                      <CheckCircle size={14} className="text-accent" />
                    </div>
                    <span className="text-white/90">Sem taxa de adesão ou mensalidades</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 