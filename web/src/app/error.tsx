'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-red-500">500</h1>
          <h2 className="text-xl font-semibold text-white">Algo deu errado!</h2>
          <p className="text-gray-400">
            Ocorreu um erro inesperado. Tente novamente em alguns instantes.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
          
          <Link
            href="/dashboard"
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors inline-block"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
} 