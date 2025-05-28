'use client';

export default function DocsUploadPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          📚 Documentação: Upload Direto para Supabase
        </h1>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🎯 Problema Resolvido</h2>
          <div className="text-white/80 space-y-3">
            <p>
              • <strong>Limite do Vercel:</strong> API Routes limitadas a 4MB
            </p>
            <p>
              • <strong>Necessidade:</strong> Upload de vídeos até 25MB para mensagens de boas-vindas do bot
            </p>
            <p>
              • <strong>Solução:</strong> Upload direto frontend → Supabase Storage (bypassa Vercel)
            </p>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🏗️ Arquitetura Implementada</h2>
          <div className="space-y-4">
            <div className="bg-blue-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">1. API Route: /api/media/signed-upload</h3>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• <strong>POST:</strong> Gera URL assinada para upload direto</li>
                <li>• <strong>PUT:</strong> Confirma upload e registra no banco</li>
                <li>• <strong>Validação:</strong> Usuário, bot, arquivo (tipo, tamanho)</li>
                <li>• <strong>Segurança:</strong> Headers de autenticação via localStorage</li>
              </ul>
            </div>

            <div className="bg-green-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-300 mb-2">2. Hook: useDirectSupabaseUpload</h3>
              <ul className="text-green-200 text-sm space-y-1">
                <li>• <strong>Upload direto:</strong> XMLHttpRequest com progresso</li>
                <li>• <strong>Validação local:</strong> Tipo e tamanho antes do upload</li>
                <li>• <strong>Estados:</strong> Loading, progresso, erro, sucesso</li>
                <li>• <strong>Timeout:</strong> 5 minutos para uploads grandes</li>
              </ul>
            </div>

            <div className="bg-purple-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">3. Componente: DirectVideoUpload</h3>
              <ul className="text-purple-200 text-sm space-y-1">
                <li>• <strong>Interface:</strong> Drag & drop + preview</li>
                <li>• <strong>Suporte:</strong> Imagens (10MB) e vídeos (25MB)</li>
                <li>• <strong>Feedback:</strong> Progresso em tempo real</li>
                <li>• <strong>Validation:</strong> Visual de erros e sucessos</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">📋 Especificações Técnicas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Formatos Suportados</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Imagens:</strong> JPG, PNG, GIF, WebP</p>
                <p><strong>Vídeos:</strong> MP4, MOV, AVI, MKV, WebM</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Limites de Tamanho</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Imagens:</strong> Até 10MB</p>
                <p><strong>Vídeos:</strong> Até 25MB</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Bucket Supabase</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Nome:</strong> bot-media</p>
                <p><strong>Estrutura:</strong> {'{botId}/{mediaType}s/{timestamp}_{id}.{ext}'}</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Autenticação</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Header:</strong> x-user-data (localStorage)</p>
                <p><strong>Fallback:</strong> Cookie blackinpay_user</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibent text-white mb-4">📋 Especificações Técnicas</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Formatos Suportados</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Imagens:</strong> JPG, PNG, GIF, WebP</p>
                <p><strong>Vídeos:</strong> MP4, MOV, AVI, MKV, WebM</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Limites de Tamanho</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Imagens:</strong> Até 10MB</p>
                <p><strong>Vídeos:</strong> Até 25MB</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Bucket Supabase</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Nome:</strong> bot-media</p>
                <p><strong>Estrutura:</strong> {'{botId}/{mediaType}s/{timestamp}_{id}.{ext}'}</p>
              </div>
            </div>

            <div className="bg-gray-500/20 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Autenticação</h3>
              <div className="text-gray-200 text-sm space-y-1">
                <p><strong>Header:</strong> x-user-data (localStorage)</p>
                <p><strong>Fallback:</strong> Cookie blackinpay_user</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-6">
          <h2 className="text-2xl font-semibold text-white mb-4">🔄 Fluxo de Upload</h2>
          <div className="space-y-3 text-white/80">
            <div className="flex items-center gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              <span>Usuário seleciona arquivo no frontend</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              <span>Validação local (tipo, tamanho, extensão)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              <span>POST /api/media/signed-upload → gera URL assinada</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              <span>Upload direto para Supabase Storage via XMLHttpRequest</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">5</span>
              <span>PUT /api/media/signed-upload → confirma e registra no banco</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">✓</span>
              <span>URL pública retornada para uso no bot</span>
            </div>
          </div>
        </div>

        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6">
          <h2 className="text-2xl font-semibold text-green-300 mb-4">✅ Benefícios Alcançados</h2>
          <ul className="text-green-200 space-y-2">
            <li>• <strong>Bypass completo</strong> do limite de 4MB do Vercel</li>
            <li>• <strong>Upload direto</strong> para Supabase Storage (sem processamento server-side)</li>
            <li>• <strong>Progresso em tempo real</strong> para melhor UX</li>
            <li>• <strong>Validação robusta</strong> de arquivos e permissões</li>
            <li>• <strong>URLs públicas</strong> prontas para uso nas mensagens de boas-vindas</li>
            <li>• <strong>Rastreamento</strong> de uploads na tabela media_uploads</li>
            <li>• <strong>Segurança</strong> mantida com validação de usuário e bot</li>
          </ul>
        </div>

        <div className="text-center mt-8">
          <a 
            href="/test-upload" 
            className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            🧪 Testar Upload Direto
          </a>
        </div>
      </div>
    </div>
  );
} 