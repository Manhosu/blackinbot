'use client';

import React from 'react';
import Link from 'next/link';

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-blue-500">404</h1>
          <h2 className="text-xl font-semibold">Página não encontrada</h2>
          <p className="text-gray-400">
            A página que você está procurando não existe.
          </p>
        </div>
        
        <Link href="/" className="inline-block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
} 