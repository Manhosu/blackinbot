'use client';

import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ChakraProvider } from '@chakra-ui/react';
import Providers from '@/components/Providers';
import { Toaster } from 'sonner';
import TailwindStyles from './TailwindStyles';

// Criamos o QueryClient aqui para garantir que ele seja criado no lado do cliente
const queryClient = new QueryClient();

export default function ClientLayout({ children }: { children: ReactNode }) {
  // Forçar a revalidação do CSS no carregamento do cliente
  useEffect(() => {
    // Força a aplicação do CSS ao carregar no cliente
    document.body.classList.add('css-loaded');
    
    // Aplicar CSS diretamente via JavaScript
    document.body.style.backgroundColor = '#000000';
    document.body.style.color = '#ffffff';
    
    return () => {
      document.body.classList.remove('css-loaded');
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider>
        <Providers>
          <TailwindStyles />
          {children}
          <Toaster position="top-right" />
        </Providers>
      </ChakraProvider>
    </QueryClientProvider>
  );
} 