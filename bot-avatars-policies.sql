-- Remover políticas existentes para garantir configuração limpa
DROP POLICY IF EXISTS "Acesso público de leitura" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;

-- Política para permitir acesso público de leitura
CREATE POLICY "Acesso público de leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'bot-avatars');

-- Política para permitir que usuários autenticados façam upload
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bot-avatars');

-- Política para permitir que usuários autenticados atualizem seus próprios arquivos
CREATE POLICY "Usuários autenticados podem atualizar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'bot-avatars')
WITH CHECK (bucket_id = 'bot-avatars');

-- Política para permitir que usuários autenticados excluam seus próprios arquivos
CREATE POLICY "Usuários autenticados podem excluir"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'bot-avatars'); 