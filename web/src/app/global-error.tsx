'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="max-w-md w-full mx-4 text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-red-500">500</h1>
              <h2 className="text-xl font-semibold">Algo deu errado!</h2>
              <p className="text-gray-400">
                Ocorreu um erro inesperado. Tente novamente.
              </p>
            </div>
            
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
} 