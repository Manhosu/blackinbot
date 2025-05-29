# Como Testar o Sistema de Autenticação

Este documento fornece instruções passo a passo para testar manualmente o novo sistema de autenticação implementado.

## Preparação

1. Limpe o localStorage do navegador:
   - Abra as ferramentas de desenvolvedor (F12)
   - Vá para a aba "Application" ou "Aplicativo"
   - Selecione "Local Storage" no painel esquerdo
   - Clique com o botão direito em "http://localhost:3025" e escolha "Clear" ou "Limpar"

2. Reinicie o servidor usando o script fornecido:
   ```
   powershell -ExecutionPolicy Bypass -File restart-server.ps1
   ```

3. Aguarde o servidor iniciar completamente e acesse http://localhost:3025

## Testes Básicos de Autenticação

### Teste 1: Login e Persistência de Sessão
1. Acesse a página de login (/login)
2. Insira suas credenciais e faça login
3. Verifique se você é redirecionado para o dashboard
4. Atualize a página (F5)
5. Verifique se você continua logado (não é redirecionado de volta para a página de login)

### Teste 2: Proteção de Rotas
1. Faça logout (clique no botão de logout)
2. Tente acessar diretamente uma URL protegida como /dashboard/bots
3. Verifique se você é redirecionado para a página de login

### Teste 3: Funcionalidades que Exigem Autenticação
1. Faça login novamente
2. Vá para a página de bots (/dashboard/bots)
3. Tente criar um novo bot (clique em "Criar Bot")
4. Preencha os dados e verifique se o bot é criado com sucesso
5. Volte para a lista de bots e verifique se o novo bot aparece na lista

### Teste 4: Permanência de Sessão
1. Sem fazer logout, feche o navegador completamente
2. Abra o navegador novamente e acesse diretamente http://localhost:3025/dashboard
3. Verifique se a sessão é restaurada automaticamente e você não precisa fazer login novamente

### Teste 5: API e Endpoints Autenticados
1. Estando logado, tente configurar o webhook de um bot:
   - Vá para a página de detalhes de um bot
   - Clique em "Configurar Webhook" (se disponível)
   - Verifique se a operação é bem-sucedida

## Cenários de Erro (Verificar Tratamento)

### Teste 6: Token Inválido
1. Faça login normalmente
2. Abra as ferramentas de desenvolvedor (F12)
3. No console, execute:
   ```javascript
   localStorage.setItem('supabase.auth.token', 'token_inválido')
   ```
4. Atualize a página e observe se o sistema:
   - Detecta o token inválido
   - Tenta fazer refresh automático ou
   - Solicita novo login quando necessário

### Teste 7: Recuperação após Erros
1. Feche o servidor (Ctrl+C no terminal onde ele está rodando)
2. Acesse a aplicação e tente realizar operações
3. Verifique se erros são exibidos corretamente
4. Reinicie o servidor e verifique se a aplicação se recupera

## Resultados Esperados

Para cada teste acima, os resultados esperados são:

- **Testes 1-4**: O usuário deve permanecer autenticado e ter acesso às funcionalidades protegidas
- **Teste 5**: As operações de API que exigem autenticação devem funcionar corretamente
- **Testes 6-7**: O sistema deve lidar graciosamente com erros, fornecendo feedback adequado e tentando se recuperar quando possível

## Relatando Problemas

Se encontrar algum problema durante os testes:

1. Anote o comportamento esperado vs. comportamento observado
2. Capture qualquer mensagem de erro no console do navegador
3. Documente os passos exatos para reproduzir o problema 