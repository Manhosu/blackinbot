'use client';

import { useEffect, useState } from 'react';
import { Heading, Text, Box, Flex, Grid, Button, useToast, Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';
import { FiPlus, FiRefreshCw } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, getMyBots } from '@/lib/bot-functions';
import BotCard from '@/components/BotCard';
import PageLoading from '@/components/PageLoading';
import EmptyState from '@/components/EmptyState';

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, refreshAuth, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // Função para buscar bots
  const fetchBots = async () => {
    try {
      setError(null); // Limpar erros anteriores
      setLoading(true);
      
      // Tentar atualizar autenticação caso não esteja autenticado
      if (!isAuthenticated) {
        console.log('🔄 Usuário não autenticado, tentando atualizar autenticação...');
        const authResult = await refreshAuth();
        if (!authResult) {
          console.log('❌ Falha na autenticação após tentativa de refresh');
          setError('Você precisa estar logado para ver seus bots.');
          
          toast({
            title: 'Erro de autenticação',
            description: 'Você precisa estar logado para ver seus bots.',
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
          
          return;
        }
      }
      
      // Buscar bots usando a função getMyBots atualizada
      const botsList = await getMyBots();
      setBots(botsList || []);
      console.log(`✅ ${botsList.length} bots encontrados`);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar bots:', error);
      setError('Ocorreu um erro ao buscar seus bots. Tente novamente mais tarde.');
      
      toast({
        title: 'Erro ao carregar bots',
        description: 'Ocorreu um erro ao buscar seus bots. Tente novamente mais tarde.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      setBots([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar bots quando o componente montar ou quando o usuário mudar
  useEffect(() => {
    // Só fazer a requisição quando a autenticação estiver completa
    if (!authLoading) {
      fetchBots();
    }
  }, [isAuthenticated, authLoading]);

  // Função para atualizar a lista de bots
  const handleRefresh = () => {
    setRefreshing(true);
    fetchBots();
  };

  // Função para criar um novo bot
  const handleCreateBot = () => {
    if (!isAuthenticated) {
      toast({
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para criar um bot.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      router.push('/login');
      return;
    }
    
    router.push('/dashboard/bots/create');
  };

  // Enquanto verifica autenticação, mostrar loading
  if (authLoading) {
    return <PageLoading message="Verificando autenticação..." />;
  }

  if (loading && !refreshing) {
    return <PageLoading message="Carregando seus bots..." />;
  }

  return (
    <Box p={4}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Box>
          <Heading size="lg">Seus Bots</Heading>
          <Text color="gray.500">
            Gerencie seus bots de Telegram e configure integrações
          </Text>
        </Box>
        <Flex gap={2}>
          <Button
            leftIcon={<FiRefreshCw />}
            onClick={handleRefresh}
            isLoading={refreshing}
            variant="outline"
          >
            Atualizar
          </Button>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="brand"
            onClick={handleCreateBot}
          >
            Criar Bot
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Alert status="error" mb={6} borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Erro!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!error && bots.length === 0 ? (
        <EmptyState
          title="Nenhum bot encontrado"
          description="Você ainda não criou nenhum bot. Crie seu primeiro bot para começar."
          actionLabel="Criar Bot"
          onAction={handleCreateBot}
        />
      ) : (
        <Grid
          templateColumns={[
            '1fr',
            'repeat(2, 1fr)',
            'repeat(2, 1fr)',
            'repeat(3, 1fr)',
          ]}
          gap={4}
        >
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onUpdate={handleRefresh} />
          ))}
        </Grid>
      )}
    </Box>
  );
} 