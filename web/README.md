# Frontend do Black-in-Bot

Esta é a interface administrativa do sistema Black-in-Bot, responsável pelo gerenciamento de bots, grupos, planos e usuários para venda de acesso a grupos VIP do Telegram.

## Tecnologias

- Next.js 14
- React
- TypeScript
- TailwindCSS
- Supabase

## Estrutura do Projeto

```
/src
  /app - Páginas da aplicação (App Router)
  /components - Componentes reutilizáveis
  /contexts - Contextos React (ex: AuthContext)
  /lib - Utilitários e configurações
  /types - Tipos TypeScript
```

## Configuração

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente:
Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

3. Executar o servidor de desenvolvimento:
```bash
npm run dev
```

## Principais Funcionalidades

### Autenticação
- Login com email/senha usando Supabase Auth
- Proteção de rotas para usuários autenticados

### Dashboard
- Visão geral das estatísticas do sistema
- Resumo de atividades recentes

### Gerenciamento de Bots
- Lista de bots configurados
- Criação, edição e remoção de bots
- Status e informações de cada bot

### Gerenciamento de Planos
- Lista de planos de acesso disponíveis
- Criação, edição e remoção de planos
- Configuração de preços e períodos de acesso

### Gerenciamento de Grupos
- Lista de grupos do Telegram
- Configuração de grupos VIP
- Associação de grupos a bots específicos

### Gerenciamento de Usuários
- Lista de usuários do sistema
- Informações sobre pagamentos e acessos

## Integração com Backend

Este frontend se integra com a API backend através do Supabase, utilizando as tabelas:

- `users` - Usuários do sistema
- `bots` - Bots do Telegram configurados
- `groups` - Grupos do Telegram
- `plans` - Planos de acesso disponíveis
- `payments` - Pagamentos realizados
- `sales` - Vendas registradas
- `reminders` - Lembretes programados

## Desenvolvimento

Para adicionar novas funcionalidades:

1. Crie os componentes necessários em `/components`
2. Adicione as novas páginas em `/app`
3. Implemente a lógica de integração com o Supabase

## Produção

Para compilar o projeto para produção:

```bash
npm run build
npm start
```
