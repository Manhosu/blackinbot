# Sistema de Remarketing - BLACKINBOT

## Visão Geral

O sistema de remarketing foi completamente refatorado para trabalhar apenas com **dados reais** dos grupos, removendo todos os dados de mock/teste. O sistema agora oferece envio automático de mensagens personalizadas 1 dia antes do plano do membro expirar.

## Principais Funcionalidades

### 1. Visualização de Membros Reais
- ✅ Mostra TODOS os membros reais dos grupos
- ✅ Remove dados de teste/mockup
- ✅ Exibe status em tempo real (Ativo, Expirando, Expirado)
- ✅ Indica visualmente membros que receberão remarketing (ponto laranja piscando)

### 2. Configuração de Mensagem de Remarketing
- ✅ Mensagem personalizada por bot
- ✅ Suporte a placeholder `{nome}` para personalização
- ✅ Interface dedicada para configuração
- ✅ Salva automaticamente no banco de dados

### 3. Sistema Automático de Envio
- ✅ Executa diariamente via cron job
- ✅ Identifica membros que expiram em exatamente 1 dia
- ✅ Envia mensagem personalizada via Telegram
- ✅ Log completo de envios para auditoria

## Como Usar

### Configurar Mensagem de Remarketing

1. Acesse **Dashboard > Remarketing**
2. Clique na aba **"Configurações de Remarketing"**
3. Selecione o bot desejado
4. Digite sua mensagem personalizada
5. Use `{nome}` para incluir o nome do membro
6. Clique em **"Salvar Mensagem"**

**Exemplo de mensagem:**
```
Olá {nome}! 👋 

Seu acesso ao nosso grupo VIP expira amanhã. 

Renove já para não perder nenhuma oportunidade! 🚀

Para renovar, envie /renovar
```

### Visualizar Membros dos Grupos

1. Acesse **Dashboard > Remarketing**
2. Na aba **"Grupos e Membros"** você verá:
   - Estatísticas gerais (Total, Ativos, Expirando, Expirados)
   - Lista de todos os grupos com seus membros
   - Status de cada membro em tempo real
   - Indicador visual para membros que receberão remarketing

### Testar o Sistema

Para testar o remarketing manualmente:

```bash
# Modo teste (não envia mensagens)
POST /api/cron/remarketing
{
  "bot_id": "seu-bot-id",
  "test_mode": true
}

# Envio real
POST /api/cron/remarketing
{
  "bot_id": "seu-bot-id",
  "test_mode": false
}
```

## Estrutura do Banco de Dados

### Nova Coluna em `bots`
```sql
ALTER TABLE bots ADD COLUMN remarketing_message TEXT;
```

### Nova Tabela `remarketing_logs`
```sql
CREATE TABLE remarketing_logs (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES group_members(id),
  bot_id UUID REFERENCES bots(id),
  message_sent TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  telegram_response JSONB
);
```

## APIs Implementadas

### 1. Configuração de Remarketing
- **PUT** `/api/bots/{id}/remarketing` - Salvar mensagem
- **GET** `/api/bots/{id}/remarketing` - Buscar mensagem

### 2. Cron Job Automático
- **GET** `/api/cron/remarketing` - Executar diariamente
- **POST** `/api/cron/remarketing` - Teste manual

### 3. Dados de Remarketing
- **GET** `/api/remarketing/groups` - Buscar grupos e membros reais

## Configuração do Cron Job

Para execução automática diária, configure:

### Vercel (recomendado)
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/remarketing",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Cron tradicional
```bash
# Executar todos os dias às 9h
0 9 * * * curl -X GET https://seu-dominio.com/api/cron/remarketing
```

## Melhorias Implementadas

1. **Performance**: Dados cacheados e otimizados
2. **UX**: Interface com abas para melhor organização
3. **Feedback Visual**: Indicadores claros de status
4. **Logs**: Sistema completo de auditoria
5. **Personalização**: Mensagens por bot
6. **Automação**: Envio 100% automatizado

## Monitoramento

O sistema registra todos os envios na tabela `remarketing_logs` com:
- Membro que recebeu
- Bot que enviou
- Mensagem exata enviada
- Resposta do Telegram
- Timestamp do envio

Isso permite auditoria completa e resolução de problemas.

## Status do Sistema

✅ **Implementado e Funcionando**
- Remoção completa de dados de mock
- Exibição de membros reais
- Configuração de mensagens por bot  
- Envio automático 1 dia antes do vencimento
- Sistema de logs para auditoria
- Interface moderna com abas
- Feedback visual em tempo real 