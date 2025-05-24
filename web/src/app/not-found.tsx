import React from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <h2 className="text-2xl font-semibold mt-4 mb-2">Página não encontrada</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Não foi possível encontrar a página que você está procurando. Verifique o endereço ou volte para a página inicial.
        </p>
        <Link href="/dashboard">
          <Button className="flex items-center">
            <ArrowLeft size={16} className="mr-2" />
            Voltar para o Dashboard
          </Button>
        </Link>
      </div>
    </DashboardLayout>
  );
} 