'use client';

import React from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

export default function FinancialPage() {
  // Dados fictícios para demonstração
  const balance = {
    pending: 0,
    available: 0
  };

  // Estado para verificar se há contas bancárias cadastradas
  const [hasBankAccounts, setHasBankAccounts] = React.useState(false);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="heading-1">Financeiro</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg p-6">
          <h3 className="text-sm text-white/80 mb-1">Aguardando</h3>
          <p className="text-3xl font-bold text-white">{formatCurrency(balance.pending)}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" rounded="full" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Antecipar
            </Button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-lg p-6">
          <h3 className="text-sm text-white/80 mb-1">Saldo em conta</h3>
          <p className="text-3xl font-bold text-white">{formatCurrency(balance.available)}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" rounded="full" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              Saque
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Tabs defaultValue="accounts">
          <TabsList className="mb-4">
            <TabsTrigger value="accounts">Contas Bancárias</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
            <TabsTrigger value="advances">Antecipações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="accounts" className="mt-4">
            {!hasBankAccounts ? (
              <div className="flex flex-col items-center justify-between bg-secondary rounded-lg p-6">
                <p className="text-center mb-4">Nenhuma conta bancária foi encontrada, cadastre uma agora mesmo.</p>
                <Button className="mt-4">Adicionar Conta Bancária</Button>
              </div>
            ) : (
              <div className="bg-secondary rounded-lg p-6">
                {/* Lista de contas bancárias aqui */}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="withdrawals">
            <div className="bg-secondary rounded-lg p-6">
              <p className="text-center">Nenhum saque registrado.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="advances">
            <div className="bg-secondary rounded-lg p-6">
              <p className="text-center">Nenhuma antecipação registrada.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 