'use client';

// Forçar renderização dinâmica
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-red-500">500</h1>
          <h2 className="text-xl font-semibold">Erro Global!</h2>
          <p className="text-gray-400">
            Ocorreu um erro crítico. Tente recarregar a página.
          </p>
        </div>
        
        <button
          onClick={reset}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
} 