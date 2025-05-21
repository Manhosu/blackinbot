'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export default function BotsPage() {
  // Estado para verificar se há bots cadastrados
  const [hasBots, setHasBots] = React.useState(false);

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="heading-1">Meus bots</h1>
        <Button>
          <span className="mr-2">+</span>
          Criar bot
        </Button>
      </div>

      {!hasBots ? (
        <div className="bg-secondary rounded-lg p-12 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">😐</div>
          <h2 className="text-2xl font-bold mb-2">Ooops!</h2>
          <p className="text-lg mb-6">Parece que você ainda não criou nenhum grupo...</p>
          <Button size="lg" rounded="full">Crie agora!</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Aqui seriam listados os bots cadastrados */}
        </div>
      )}
    </DashboardLayout>
  );
} 