import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto'; // Para gerar um external_id único

// Este é o seu token do PushinPay. O ideal é armazená-lo em variáveis de ambiente.
const PUSHINPAY_TOKEN = process.env.PUSHINPAY_TOKEN || '30054|WAhgfJDCfZrHGRqsdaCvYjOh4wUncQm4rhLtHszK34b10bea';
const PUSHINPAY_API_URL = 'https://api.pushinpay.com.br/api/v1/pix/transaction';

export async function POST(request: Request) {
  if (!PUSHINPAY_TOKEN || !PUSHINPAY_TOKEN.includes('|')) {
    console.error('Token do PushinPay não configurado ou inválido.');
    return NextResponse.json({ error: 'Configuração de pagamento inválida.' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { value, comment, clientName, clientDocument, orderId } = body;

    // Validação básica dos campos obrigatórios
    if (!value || !comment || !clientName || !clientDocument) {
      return NextResponse.json({ error: 'Dados incompletos para gerar o PIX.', missingFields: {
        value: !value,
        comment: !comment,
        clientName: !clientName,
        clientDocument: !clientDocument
      } }, { status: 400 });
    }
    
    if (typeof value !== 'number' || value <= 0) {
      return NextResponse.json({ error: 'O valor do PIX deve ser um número positivo.' }, { status: 400 });
    }

    // Gerar um external_id único se não for fornecido pelo frontend
    // Em um cenário real, o orderId pode vir do seu sistema de pedidos.
    const external_id = orderId || randomUUID();

    const pushinpayPayload = {
      value: Number(value.toFixed(2)), // Garantir duas casas decimais
      comment,
      client: {
        name: clientName,
        document: clientDocument,
      },
      external_id,
    };

    console.log('Enviando para PushinPay URL:', PUSHINPAY_API_URL);
    console.log('Enviando para PushinPay Headers:', { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PUSHINPAY_TOKEN}` });
    console.log('Enviando para PushinPay Body:', JSON.stringify(pushinpayPayload));

    const response = await fetch(PUSHINPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PUSHINPAY_TOKEN}`,
      },
      body: JSON.stringify(pushinpayPayload),
    });

    // Log para ver o status e o tipo de conteúdo da resposta do PushinPay
    console.log('PushinPay Response Status:', response.status);
    console.log('PushinPay Response Content-Type:', response.headers.get('content-type'));

    if (!response.ok) {
      const responseText = await response.text(); // Tentar ler como texto
      console.error('Erro ao criar PIX no PushinPay. Resposta não OK. Texto da Resposta:', responseText);
      // Tenta fazer parse do JSON somente se o content-type indicar que é JSON
      let errorDetails = { rawResponse: responseText };
      if (response.headers.get('content-type')?.includes('application/json')) {
        try {
            errorDetails = JSON.parse(responseText); // Tentar fazer parse do que veio
        } catch (parseError) {
            console.warn("Não foi possível fazer parse da resposta de erro como JSON, mesmo com content-type application/json", parseError);
        }
      }
      return NextResponse.json({ error: 'Falha ao gerar PIX', details: errorDetails }, { status: response.status });
    }

    // Se a resposta for OK, esperamos JSON
    const responseData = await response.json();
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('Erro interno na API /api/pushinpay/criar-pix:', error);
    let errorMessage = 'Erro interno do servidor.';
    if (error.message) {
      errorMessage = error.message;
    }
    if (error.type === 'json') { // body-parser error
        errorMessage = 'Corpo da requisição inválido. Verifique o JSON enviado.'
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 