'use client';

import { useState, FormEvent } from 'react';

interface PixData {
  qr_code_text?: string; // Supondo que a API retorne um campo assim para o "copia e cola"
  qr_code_image_base64?: string; // Supondo que a API retorne a imagem do QR Code em base64
  transaction_id?: string; // ID da transação do PushinPay
  // Adicione outros campos que a API do PushinPay possa retornar
}

interface ApiError {
  error: string;
  details?: any;
  missingFields?: any;
}

export default function TestPixPage() {
  const [value, setValue] = useState('1.00');
  const [comment, setComment] = useState('Teste PIX BLACKINPAY');
  const [clientName, setClientName] = useState('Cliente Teste');
  const [clientDocument, setClientDocument] = useState('12345678909'); // CPF ou CNPJ
  const [orderId, setOrderId] = useState(''); // Opcional, será gerado se vazio

  const [isLoading, setIsLoading] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setPixData(null);
    setError(null);

    try {
      const response = await fetch('/api/pushinpay/criar-pix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: parseFloat(value),
          comment,
          clientName,
          clientDocument,
          orderId: orderId || undefined, // Envia undefined se vazio para a API gerar
        }),
      });

      const data: PixData | ApiError = await response.json();

      if (!response.ok) {
        const errorData = data as ApiError;
        let errorMessage = errorData.error || 'Falha ao gerar PIX';
        if (errorData.details) {
          errorMessage += `: ${JSON.stringify(errorData.details)}`;
        }
        if (errorData.missingFields) {
          errorMessage += ` Campos faltando: ${JSON.stringify(errorData.missingFields)}`;
        }
        throw new Error(errorMessage);
      }
      
      setPixData(data as PixData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6 text-center">Testar Geração de PIX (PushinPay)</h1>
      
      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-gray-800 p-6 rounded-lg shadow-xl">
        <div className="mb-4">
          <label htmlFor="value" className="block text-sm font-medium text-gray-300 mb-1">Valor (R$):</label>
          <input 
            type="number" 
            id="value" 
            value={value} 
            onChange={(e) => setValue(e.target.value)} 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            step="0.01"
            required 
          />
        </div>
        <div className="mb-4">
          <label htmlFor="comment" className="block text-sm font-medium text-gray-300 mb-1">Comentário/Descrição:</label>
          <input 
            type="text" 
            id="comment" 
            value={comment} 
            onChange={(e) => setComment(e.target.value)} 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            required 
          />
        </div>
        <div className="mb-4">
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-300 mb-1">Nome do Cliente:</label>
          <input 
            type="text" 
            id="clientName" 
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)} 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            required 
          />
        </div>
        <div className="mb-4">
          <label htmlFor="clientDocument" className="block text-sm font-medium text-gray-300 mb-1">CPF/CNPJ do Cliente:</label>
          <input 
            type="text" 
            id="clientDocument" 
            value={clientDocument} 
            onChange={(e) => setClientDocument(e.target.value)} 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            required 
          />
        </div>
        <div className="mb-6">
          <label htmlFor="orderId" className="block text-sm font-medium text-gray-300 mb-1">ID do Pedido (Opcional):</label>
          <input 
            type="text" 
            id="orderId" 
            value={orderId} 
            onChange={(e) => setOrderId(e.target.value)} 
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 transition duration-150"
        >
          {isLoading ? 'Gerando PIX...' : 'Gerar PIX'}
        </button>
      </form>

      {error && (
        <div className="mt-6 p-4 bg-red-700 text-white rounded-md max-w-lg mx-auto">
          <h3 className="font-bold">Erro ao gerar PIX:</h3>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
        </div>
      )}

      {pixData && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-xl max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-green-400">PIX Gerado com Sucesso!</h2>
          {pixData.transaction_id && <p className="mb-2"><strong className="text-gray-400">ID da Transação:</strong> {pixData.transaction_id}</p>}
          
          {pixData.qr_code_image_base64 && (
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold mb-2">QR Code:</h3>
              <img 
                src={`data:image/png;base64,${pixData.qr_code_image_base64}`} 
                alt="PIX QR Code" 
                className="mx-auto border border-white p-1 rounded"
              />
            </div>
          )}
          
          {pixData.qr_code_text && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-1">PIX Copia e Cola:</h3>
              <textarea 
                readOnly 
                value={pixData.qr_code_text} 
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 h-24 resize-none text-sm"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(pixData.qr_code_text!)}
                className="mt-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded text-sm"
              >
                Copiar Código
              </button>
            </div>
          )}
          
          <div className="mt-4 bg-gray-700 p-3 rounded">
            <h3 className="text-md font-semibold mb-1 text-yellow-400">Resposta Completa da API (Debug):</h3>
            <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(pixData, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
} 