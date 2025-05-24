'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardBody, 
  CardFooter, 
  Heading, 
  Text, 
  Badge, 
  Button, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem, 
  IconButton, 
  Flex, 
  Divider, 
  Stack, 
  useToast 
} from '@chakra-ui/react';
import { FiMoreVertical, FiEdit, FiTrash2, FiExternalLink, FiSettings, FiLink } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { Bot } from '@/lib/bot-functions';

interface BotCardProps {
  bot: Bot;
  onUpdate: () => void;
}

export default function BotCard({ bot, onUpdate }: BotCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Formatar data de criação para exibição
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Data desconhecida';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obter status para exibição
  const getBotStatus = () => {
    switch (bot.status) {
      case 'active':
        return { label: 'Ativo', color: 'green' };
      case 'inactive':
        return { label: 'Inativo', color: 'orange' };
      case 'deleted':
        return { label: 'Excluído', color: 'red' };
      default:
        return { label: 'Desconhecido', color: 'gray' };
    }
  };

  // Visualizar detalhes do bot
  const handleViewDetails = () => {
    router.push(`/dashboard/bots/${bot.id}`);
  };

  // Editar bot
  const handleEdit = () => {
    router.push(`/dashboard/bots/${bot.id}/edit`);
  };

  // Ir para o Telegram
  const handleOpenTelegram = () => {
    if (bot.username) {
      window.open(`https://t.me/${bot.username}`, '_blank');
    }
  };

  // Função para copiar o link do bot para o clipboard
  const handleCopyBotLink = () => {
    if (bot.username) {
      navigator.clipboard.writeText(`https://t.me/${bot.username}`);
      toast({
        title: 'Link copiado!',
        description: `O link do bot @${bot.username} foi copiado para a área de transferência.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Erro ao copiar link',
        description: 'Este bot não possui um username definido.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Status do bot para exibição
  const status = getBotStatus();

  return (
    <Card variant="outline" borderRadius="md" boxShadow="sm" transition="all 0.2s" 
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}>
      <CardBody>
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Heading size="md" mb={2}>{bot.name}</Heading>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Opções"
              icon={<FiMoreVertical />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem icon={<FiExternalLink />} onClick={handleViewDetails}>
                Detalhes
              </MenuItem>
              <MenuItem icon={<FiEdit />} onClick={handleEdit}>
                Editar
              </MenuItem>
              <MenuItem icon={<FiSettings />} onClick={() => router.push(`/dashboard/bots/${bot.id}/config`)}>
                Configurações
              </MenuItem>
              <MenuItem icon={<FiLink />} onClick={handleCopyBotLink}>
                Copiar Link
              </MenuItem>
              <MenuItem icon={<FiTrash2 />} color="red.500">
                Excluir
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>

        <Badge colorScheme={status.color as any} mb={3}>
          {status.label}
        </Badge>

        {bot.description && (
          <Text color="gray.500" fontSize="sm" noOfLines={2} mb={3}>
            {bot.description}
          </Text>
        )}

        <Flex flexDirection="column" gap={1}>
          {bot.username && (
            <Text fontSize="sm">
              <strong>Username:</strong> @{bot.username}
            </Text>
          )}
          <Text fontSize="sm">
            <strong>Criado em:</strong> {formatDate(bot.created_at)}
          </Text>
          <Text fontSize="sm">
            <strong>Webhook:</strong> {bot.webhook_url ? 'Configurado' : 'Não configurado'}
          </Text>
        </Flex>
      </CardBody>

      <Divider />
      
      <CardFooter pt={3} pb={3}>
        <Flex width="100%" justifyContent="space-between">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewDetails}
          >
            Gerenciar
          </Button>
          
          {bot.username && (
            <Button 
              colorScheme="brand" 
              size="sm"
              onClick={handleOpenTelegram}
            >
              Abrir no Telegram
            </Button>
          )}
        </Flex>
      </CardFooter>
    </Card>
  );
} 