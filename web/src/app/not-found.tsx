'use client';

import React from 'react';
import Link from 'next/link';

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <h1 className="text-9xl font-bold text-blue-600">404</h1>
        <h2 className="text-2xl font-semibold mt-4 mb-2">Página não encontrada</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Não foi possível encontrar a página que você está procurando. Verifique o endereço ou volte para a página inicial.
        </p>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          ← Voltar para o Dashboard
        </Link>
      </div>
    </div>
  );
} 