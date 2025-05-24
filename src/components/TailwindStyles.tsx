'use client';

// Este componente força a aplicação dos estilos do Tailwind
// ao injetar classes básicas no DOM via JavaScript no lado do cliente

import { useEffect } from 'react';

export default function TailwindStyles() {
  useEffect(() => {
    // Adiciona classes diretamente aos elementos via JavaScript
    const applyStyles = () => {
      // Estilo para o body
      document.body.classList.add(
        'bg-background',
        'text-foreground',
        'antialiased',
        'font-sans'
      );
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#ffffff';

      // Adiciona stylesheet inline caso o Tailwind falhe
      const style = document.createElement('style');
      style.textContent = `
        body {
          background-color: #000000 !important;
          color: #ffffff !important;
        }
        .glass {
          background-color: rgba(15, 20, 40, 0.7) !important;
          border-color: rgba(255, 255, 255, 0.08) !important;
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
        .button-primary {
          background-color: #3b5aef !important;
          color: white !important;
          border-radius: 9999px !important;
        }
      `;
      document.head.appendChild(style);
    };

    applyStyles();

    // Aplica novamente após 1 segundo para garantir
    setTimeout(applyStyles, 1000);

    return () => {
      // Limpar na desmontagem (não necessário, mas boa prática)
    };
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
} 