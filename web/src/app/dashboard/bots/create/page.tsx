"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { Plus, X, ArrowRight, Check, AlertCircle, Info, Loader2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createBot, validateBotToken } from '@/lib/bot-functions';
import {
  Box,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Text,
  VStack,
  useToast,
  Card,
  CardBody,
  Flex,
  FormErrorMessage,
  Divider,
  Alert,
  AlertIcon,
  AlertDescription,
  Spinner,
  useSteps,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator
} from '@chakra-ui/react';

const PERIODS = [
  { label: "7 dias", value: "7" },
  { label: "15 dias", value: "15" },
  { label: "1 mês", value: "30" },
  { label: "3 meses", value: "90" },
  { label: "6 meses", value: "180" },
  { label: "1 ano", value: "365" },
  { label: "Vitalício", value: "9999" },
];

interface PricePlan {
  id: string;
  name: string;
  price: string;
  period: string;
}

// Definição dos passos de criação
const steps = [
  { title: 'Dados básicos', description: 'Nome e token do bot' },
  { title: 'Validação', description: 'Verificação do token' },
  { title: 'Conclusão', description: 'Configurações adicionais' }
];

export default function CreateBotPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshAuth } = useAuth();
  const toast = useToast();
  const { activeStep, goToNext, goToPrevious } = useSteps({
    index: 0,
    count: steps.length,
  });

  // Estado do formulário
  const [form, setForm] = useState({
    name: '',
    token: '',
    image: null as File | null,
    telegram_group_link: "",
    welcome_message: "",
    welcome_media: null as File | null,
  });
  
  // Planos de preço
  const [pricePlans, setPricePlans] = useState<PricePlan[]>([
    { id: '1', name: "Acesso VIP ao grupo", price: "", period: "30" }
  ]);
  
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [botResult, setBotResult] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookStatus, setWebhookStatus] = useState<'not_set' | 'checking' | 'set' | 'error'>('not_set');
  const [paymentGateway, setPaymentGateway] = useState<'pix' | 'stripe' | 'mercadopago'>('pix');
  const [pixConfig, setPixConfig] = useState({
    key: '',
    keyType: 'cpf' as 'cpf' | 'email' | 'telefone' | 'aleatoria',
    description: ''
  });
  const [testingGroupAccess, setTestingGroupAccess] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [groupAccessDetails, setGroupAccessDetails] = useState<any>(null);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Estados de validação
  const [validations, setValidations] = useState({
    name: { isValid: true, message: '' },
    token: { isValid: true, message: '' },
  });
  
  // Resultado da validação do token
  const [validationResult, setValidationResult] = useState<any>(null);

  // Verificar autenticação em useEffect para evitar o erro de roteamento no servidor
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirecionar para login se não houver usuário autenticado
      router.push("/login");
    }
  }, [user, isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, files } = e.target as any;
    if (name === "image" && files && files[0]) {
      setForm((prev) => ({ ...prev, image: files[0] }));
      setImgPreview(URL.createObjectURL(files[0]));
    } else if (name === "welcome_media" && files && files[0]) {
      setForm((prev) => ({ ...prev, welcome_media: files[0] }));
      setMediaPreview(URL.createObjectURL(files[0]));
      setMediaUploadError(null); // Limpar erros anteriores
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    
    // Limpar erro de validação quando o usuário começa a digitar
    if (!validations[name as keyof typeof validations].isValid) {
      setValidations({
        ...validations,
        [name]: { isValid: true, message: '' }
      });
    }
  };

  // Função para adicionar um novo plano de preço
  const addPricePlan = () => {
    setPricePlans([
      ...pricePlans,
      { 
        id: Date.now().toString(), 
        name: `Plano ${pricePlans.length + 1}`, 
        price: "", 
        period: "30" 
      }
    ]);
  };

  // Função para remover um plano de preço
  const removePricePlan = (id: string) => {
    if (pricePlans.length > 1) {
      setPricePlans(pricePlans.filter(plan => plan.id !== id));
    } else {
      toast.error("Você precisa ter pelo menos um plano de preço.");
    }
  };

  // Função para remover mídia de boas-vindas
  const handleRemoveMedia = () => {
    setForm((prev) => ({ ...prev, welcome_media: null }));
    setMediaPreview(null);
    setMediaUploadError(null);
  };

  // Função para verificar buckets no Supabase
  const checkBuckets = async () => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      console.log("Buckets disponíveis:", buckets?.map(b => b.name));
      return buckets || [];
    } catch (error) {
      console.error("Erro ao listar buckets:", error);
      return [];
    }
  };

  // Função para alterar um plano de preço
  const handlePlanChange = (id: string, field: keyof PricePlan, value: string) => {
    setPricePlans(
      pricePlans.map(plan => {
        if (plan.id === id) {
          // Se o campo for price, formatar o valor
          if (field === 'price') {
            // Remover caracteres não numéricos, exceto vírgula e ponto
            let numericValue = value.replace(/[^\d,.]/g, '');
            
            // Substituir pontos por vírgulas (para padronizar)
            numericValue = numericValue.replace(/\./g, ',');
            
            // Garantir que só exista uma vírgula
            const parts = numericValue.split(',');
            if (parts.length > 2) {
              numericValue = parts[0] + ',' + parts.slice(1).join('');
            }
            
            // Limitar a 2 casas decimais
            if (parts.length > 1 && parts[1].length > 2) {
              numericValue = parts[0] + ',' + parts[1].substring(0, 2);
            }
            
            // Permitir qualquer valor digitado, sem forçar mínimo de 4,90
            // A validação de valor mínimo será feita apenas no validateStep()
            return { ...plan, [field]: numericValue };
          }
          
          return { ...plan, [field]: value };
        }
        return plan;
      })
    );
  };

  // Função para validar a etapa atual
  const validateStep = () => {
    let isValid = true;
    const newValidations = { ...validations };
    
    if (activeStep === 0) {
      if (!form.name.trim()) {
        newValidations.name = {
          isValid: false,
          message: 'Nome do bot é obrigatório'
        };
        isValid = false;
      }
      if (!form.token.trim()) {
        newValidations.token = {
          isValid: false,
          message: 'Token do bot é obrigatório'
        };
        isValid = false;
      }
      
      // Validação básica do formato do token do Telegram
      if (!form.token.includes(':')) {
        newValidations.token = {
          isValid: false,
          message: "Token do bot parece inválido. Verifique se está no formato correto."
        };
        isValid = false;
      }
      
      // Verificar se o token foi validado
      if (tokenStatus !== 'valid') {
        newValidations.token = {
          isValid: false,
          message: "Por favor, aguarde a validação do token ou verifique se está correto"
        };
        isValid = false;
      }
    }
    
    if (activeStep === 1 && pricePlans.length === 0) {
      newValidations.pricePlans = {
        isValid: false,
        message: "É necessário ter pelo menos um plano de preço"
      };
      isValid = false;
    }
    
    if (activeStep === 2) {
      // Aqui seria onde configuramos o webhook automaticamente
      // A validação vai acontecer no goToNextStep
      isValid = true;
    }
    
    if (activeStep === 3) {
      if (!form.telegram_group_link) {
        newValidations.telegram_group_link = {
          isValid: false,
          message: "Link do grupo do Telegram é obrigatório"
        };
        isValid = false;
      }
      
      if (!form.welcome_message) {
        newValidations.welcome_message = {
          isValid: false,
          message: "Mensagem de boas-vindas é obrigatória"
        };
        isValid = false;
      }
      
      if (!form.welcome_media) {
        newValidations.welcome_media = {
          isValid: false,
          message: "Mídia de boas-vindas é obrigatória"
        };
        isValid = false;
      }
    }
    
    setValidations(newValidations);
    return isValid;
  };

  // Função para ir para a próxima etapa
  const goToNextStep = () => {
    // Adiciona indicador visual de carregamento enquanto valida
    setSubmitting(true);
    
    // Forçar um revalidate para garantir que o formulário é validado
    setTimeout(() => {
      if (!validateStep()) {
        setSubmitting(false);
        return;
      }
      
      // Se estiver na etapa 3, configura o webhook automaticamente
      if (activeStep === 2 && form.token && tokenStatus === 'valid') {
        // Configurar o webhook em segundo plano, mas não esperar por ele
        fetch('/api/bots/setup-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: form.token })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log('✅ Webhook configurado automaticamente');
            toast.success('Webhook configurado com sucesso!', {
              duration: 3000,
              position: 'bottom-right',
            });
          }
        })
        .catch(error => {
          console.error('❌ Erro ao configurar webhook:', error);
        });
      }
      
      // Rolar para o topo e avançar para a próxima etapa
      window.scrollTo(0, 0);
      goToNext();
      setSubmitting(false);
    }, 500); // Pequeno delay para feedback visual
  };

  // Função para voltar para a etapa anterior
  const goToPreviousStep = () => {
    window.scrollTo(0, 0);
    goToPrevious();
  };

  // Função para fazer upload de um arquivo para o Supabase
  const uploadToSupabase = async (file: File, prefix: string): Promise<string> => {
    console.log(`Iniciando upload de ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${prefix}_${Date.now()}.${fileExt}`;
    
    // Lista de buckets para tentar (em ordem de preferência)
    const bucketsToTry = ['bot-avatars', 'avatars', 'uploads', 'media', 'files', 'storage'];
    
    // Primeiro, verificar buckets disponíveis
    try {
      const { data: availableBuckets } = await supabase.storage.listBuckets();
      const bucketNames = availableBuckets?.map(b => b.name) || [];
      console.log("Buckets disponíveis:", bucketNames);
    
      // Se não tem nenhum bucket, tentar criar o bot-avatars
      if (bucketNames.length === 0) {
        console.log("⚠️ Nenhum bucket encontrado. Tentando criar 'bot-avatars'...");
        try {
          await supabase.storage.createBucket('bot-avatars', {
            public: true,
            allowedMimeTypes: ['image/*', 'video/*', 'audio/*']
          });
          console.log("✅ Bucket 'bot-avatars' criado com sucesso!");
          bucketNames.push('bot-avatars');
        } catch (createError) {
          console.log("❌ Erro ao criar bucket:", createError);
        }
      }
      
      // Adicionar buckets disponíveis à lista de tentativas
      const finalBucketsToTry = Array.from(new Set([...bucketNames, ...bucketsToTry]));
      
      // Tentar upload em cada bucket
      for (const bucketName of finalBucketsToTry) {
      try {
          console.log(`🔄 Tentando upload no bucket: ${bucketName}`);
          
        const { data, error } = await supabase.storage
            .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });
          
          if (!error && data) {
            console.log(`✅ Upload bem-sucedido no bucket: ${bucketName}`);
            
            // Obter URL pública
          const { data: urlData } = supabase.storage
              .from(bucketName)
            .getPublicUrl(fileName);
            
            if (urlData?.publicUrl) {
              console.log(`✅ URL gerada: ${urlData.publicUrl}`);
              return urlData.publicUrl;
            }
        } else {
            console.log(`❌ Erro no bucket ${bucketName}:`, error?.message);
        }
        } catch (bucketError) {
          console.log(`❌ Exceção no bucket ${bucketName}:`, bucketError);
      }
    }
    
      // Se chegou até aqui, nenhum upload funcionou
      console.log("❌ Todos os uploads falharam. Usando placeholder.");
      
      // Retornar uma URL placeholder baseada no tipo de arquivo
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      if (isImage) {
        return `https://via.placeholder.com/400x400/0891b2/white?text=${encodeURIComponent(prefix + '_image')}`;
      } else if (isVideo) {
        return `https://via.placeholder.com/400x300/0891b2/white?text=${encodeURIComponent(prefix + '_video')}`;
      } else {
        return `https://via.placeholder.com/400x200/0891b2/white?text=${encodeURIComponent(prefix + '_file')}`;
      }
      
    } catch (storageError) {
      console.error("❌ Erro geral no storage:", storageError);
      
      // Fallback: usar placeholder
      return `https://via.placeholder.com/400x300/0891b2/white?text=${encodeURIComponent(prefix + '_fallback')}`;
    }
  };

  // Função para testar o acesso ao grupo
  const testGroupAccess = async () => {
    if (!form.token || !form.telegram_group_link) {
      toast.error('Preencha o token do bot e o link do grupo para testar o acesso');
      return;
    }
    
    setTestingGroupAccess('testing');
    try {
      const response = await fetch('/api/bots/test-group-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: form.token, 
          groupLink: form.telegram_group_link 
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTestingGroupAccess('success');
        setGroupAccessDetails(data.details);
        toast.success('Teste de acesso ao grupo realizado com sucesso!');
      } else {
        setTestingGroupAccess('error');
        toast.error(data.error || 'Erro ao testar acesso ao grupo');
      }
    } catch (error) {
      console.error('Erro ao testar acesso:', error);
      setTestingGroupAccess('error');
      toast.error('Erro ao testar acesso ao grupo');
    }
  };

  // Renderização do conteúdo conforme a etapa
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VStack spacing={4} align="stretch">
            <FormControl isInvalid={!validations.name.isValid} isRequired>
              <FormLabel>Nome do Bot</FormLabel>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: Meu Bot de Vendas"
              />
              <FormErrorMessage>{validations.name.message}</FormErrorMessage>
            </FormControl>
            
            <FormControl isInvalid={!validations.token.isValid} isRequired>
              <FormLabel>Token do Bot</FormLabel>
              <Input
                name="token"
                value={form.token}
                onChange={handleChange}
                placeholder="Ex: 123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi"
                type="password"
              />
              <FormErrorMessage>{validations.token.message}</FormErrorMessage>
              <Text fontSize="sm" mt={1} color="gray.500">
                Obtenha o token do seu bot conversando com @BotFather no Telegram
              </Text>
            </FormControl>
            
            <Button
              colorScheme="brand"
              onClick={goToNextStep}
              isLoading={submitting}
              mt={4}
            >
              Validar e Continuar
            </Button>
          </VStack>
        );
        
      case 1:
        return (
          <VStack spacing={4} align="stretch">
            <Alert status="success" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                Bot validado com sucesso! Confira os dados abaixo.
              </AlertDescription>
            </Alert>
            
            <Card variant="outline">
              <CardBody>
                <VStack align="stretch" spacing={3}>
                  <Flex justify="space-between">
                    <Text color="gray.500">Nome</Text>
                    <Text fontWeight="medium">{form.name}</Text>
                  </Flex>
                  <Divider />
                  
                  <Flex justify="space-between">
                    <Text color="gray.500">Username</Text>
                    <Text fontWeight="medium">@{validationResult?.username}</Text>
                  </Flex>
                  <Divider />
                  
                  <Flex justify="space-between">
                    <Text color="gray.500">ID</Text>
                    <Text fontWeight="medium">{validationResult?.id}</Text>
                  </Flex>
                </VStack>
              </CardBody>
            </Card>
            
            <Flex gap={4} mt={4}>
              <Button variant="outline" onClick={goToPreviousStep}>
                Voltar
              </Button>
              <Button colorScheme="brand" onClick={goToNextStep}>
                Continuar
              </Button>
            </Flex>
          </VStack>
        );
        
      case 2:
        return (
          <VStack spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                Agora você pode finalizar a criação do seu bot.
              </AlertDescription>
            </Alert>
            
            <Text>
              Após a criação, você será redirecionado para a página de configuração,
              onde poderá ajustar configurações avançadas e configurar o webhook.
            </Text>
            
            {error && (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Flex gap={4} mt={4}>
              <Button variant="outline" onClick={goToPreviousStep}>
                Voltar
              </Button>
              <Button
                colorScheme="brand"
                onClick={handleSubmit}
                isLoading={isCreating}
              >
                Criar Bot
              </Button>
            </Flex>
          </VStack>
        );
        
      case 3:
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">Etapa 3: Como Configurar seu Bot</h2>
            
            <div className="bg-info/10 border border-info rounded-lg p-6 text-white">
              <div className="flex items-start gap-4">
                <Info size={24} className="text-info shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-medium mb-2">Instruções Importantes</h3>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>Certifique-se de que seu bot foi criado no Telegram através do <b>@BotFather</b>.</li>
                    <li>Adicione seu bot como <b>administrador</b> do grupo privado que deseja gerenciar.</li>
                    <li>Dê permissões de <b>adicionar membros</b> e <b>enviar mensagens</b> para o bot.</li>
                    <li>Nas próximas etapas, você vai fornecer o link do grupo e configurar mensagens personalizadas.</li>
                  </ol>
                  <p className="mt-4 text-white/70">
                    Ao clicar em "Continuar", você confirma que já adicionou o bot como administrador do seu grupo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-8">
            <h2 className="text-xl font-bold">Etapa 4: Configurações do Grupo</h2>
            
            <div>
              <label className="block text-white/70 mb-1">Link do Grupo no Telegram <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="telegram_group_link"
                value={form.telegram_group_link}
                onChange={handleChange}
                className="input-auth w-full"
                placeholder="Cole o link de convite privado ou @username do grupo"
                required
              />
              <p className="text-xs text-white/40 mt-1">Exemplo: https://t.me/+ABC123 ou @meugrupovip</p>
            </div>
            
            <div>
              <label className="block text-white/70 mb-1">Mensagem de boas-vindas <span className="text-red-500">*</span></label>
              <textarea
                name="welcome_message"
                value={form.welcome_message}
                onChange={handleChange}
                className="input-auth w-full min-h-[150px]"
                placeholder="Mensagem enviada ao usuário ao entrar. Suporta Markdown/HTML."
                required
              />
              <p className="text-xs text-white/40 mt-1">Você pode usar <b>negrito</b>, <i>itálico</i>, links, etc.</p>
            </div>
            
            <div>
              <label className="block text-white/70 mb-1">Mídia de boas-vindas <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  name="welcome_media"
                  accept="image/*,video/*"
                  ref={mediaInputRef}
                  onChange={handleChange}
                  className="block mt-2 flex-1"
                  disabled={mediaUploading}
                  required
                />
                {(mediaPreview || mediaUploadError) && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRemoveMedia}
                    className="mt-2"
                  >
                    <X size={16} className="mr-1" /> Remover mídia
                  </Button>
                )}
              </div>
              {mediaUploadError && (
                <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <p className="text-sm text-red-400 flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <span>{mediaUploadError}</span>
                  </p>
                  <p className="text-xs text-white/60 mt-2">
                    Por favor corrija o problema ou selecione outro arquivo.
                  </p>
                </div>
              )}
              {mediaPreview && !mediaUploadError && (
                <div className="mt-2">
                  {form.welcome_media?.type.startsWith("image") ? (
                    <Image src={mediaPreview} alt="Mídia preview" width={200} height={200} className="rounded-lg" />
                  ) : (
                    <video src={mediaPreview} controls width={200} className="rounded-lg" />
                  )}
                </div>
              )}
              {mediaUploading && (
                <div className="mt-2 flex items-center gap-2 text-accent">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Enviando mídia...</span>
                </div>
              )}
              
              <div className="mt-3 bg-amber-500/10 p-3 rounded-md border border-amber-500/30">
                <p className="text-sm text-amber-400 flex items-center gap-2">
                  <Info size={16} />
                  <strong>Atenção:</strong> A mídia é essencial para a criação do bot. Certifique-se de que o bucket 'bot-avatars' existe no seu Supabase.
                </p>
              </div>
            </div>
            
            <div className="mt-2">
              <Button
                type="button"
                onClick={testGroupAccess}
                disabled={!form.token || !form.telegram_group_link || testingGroupAccess === 'testing'}
                variant="outline"
                className="flex items-center gap-2"
              >
                {testingGroupAccess === 'testing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Testando...
                  </>
                ) : testingGroupAccess === 'success' ? (
                  <>
                    <Check size={16} className="text-green-500" />
                    Acesso Verificado
                  </>
                ) : testingGroupAccess === 'error' ? (
                  <>
                    <AlertCircle size={16} className="text-red-500" />
                    Falha no Teste
                  </>
                ) : (
                  <>
                    Testar Acesso ao Grupo
                  </>
                )}
              </Button>
              
              {testingGroupAccess === 'success' && groupAccessDetails && (
                <div className="mt-3 bg-green-500/10 border border-green-500/30 rounded-md p-3">
                  <h4 className="font-medium text-green-400 mb-1">Grupo verificado com sucesso!</h4>
                  <p className="text-sm text-white/70">
                    <span className="text-white/90">Nome do grupo:</span> {groupAccessDetails.title}
                  </p>
                  <p className="text-sm text-white/70">
                    <span className="text-white/90">Membros:</span> {groupAccessDetails.memberCount}
                  </p>
                  <p className="text-sm text-white/70">
                    <span className="text-white/90">Permissões do bot:</span> {groupAccessDetails.botPermissions.join(', ')}
                  </p>
                </div>
              )}
              
              {testingGroupAccess === 'error' && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-md p-3">
                  <h4 className="font-medium text-red-400 mb-1">Falha na verificação do grupo</h4>
                  <p className="text-sm text-white/70">
                    Verifique se o bot foi adicionado como administrador e tem permissões para adicionar membros.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
        
      case 5:
        return (
          <div className="mt-8 bg-success/10 border border-success rounded-lg p-6 text-success">
            <h2 className="text-xl font-bold mb-2">Bot criado com sucesso!</h2>
            <p>Seu bot está ativo e pronto para uso.</p>
            <div className="mt-2">
              <b>Link do bot:</b> <a href={botResult?.bot_link} target="_blank" rel="noopener noreferrer" className="underline">{botResult?.bot_link}</a>
            </div>
            <div className="mt-2">
              <b>Status do webhook:</b> <span className="font-mono">Ativo</span>
            </div>
            <div className="mt-2">
              <b>Planos configurados:</b>
              <ul className="list-disc ml-5 mt-1">
                {pricePlans.map((plan, idx) => {
                  // Formatar o preço para exibição
                  const formattedPrice = parseFloat(plan.price.replace(/\./g, '').replace(',', '.') || '0')
                    .toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 2
                    });
                    
                  return (
                    <li key={plan.id}>
                      {plan.name}: {formattedPrice} - {PERIODS.find(p => p.value === plan.period)?.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="mt-2">
              <b>Prévia da mensagem de boas-vindas:</b>
              <div className="bg-background border rounded p-3 mt-1 whitespace-pre-line">{form.welcome_message}</div>
              {mediaPreview && (
                <div className="mt-2">
                  {form.welcome_media?.type.startsWith("image") ? (
                    <Image src={mediaPreview} alt="Mídia preview" width={200} height={200} className="rounded-lg" />
                  ) : (
                    <video src={mediaPreview} controls width={200} className="rounded-lg" />
                  )}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  // Enviar formulário para criar bot
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação final
    if (!validateStep()) {
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Verificar autenticação
      if (!isAuthenticated) {
        console.log('🔄 Usuário não autenticado, tentando atualizar autenticação...');
        const authResult = await refreshAuth();
        if (!authResult) {
          toast.error('Você precisa estar autenticado para criar um bot.');
          router.push('/login');
          return;
        }
      }
      
      // Preparar dados do bot
      const botData = {
        name: form.name,
        token: form.token,
        description: '',
        username: validationResult?.username,
        telegram_id: validationResult?.id,
        is_public: false,
        status: 'active' as const
      };
      
      console.log('📤 Enviando dados do bot:', botData);
      
      // Criar bot no Supabase
      const newBot = await createBot(botData);
      
      toast.success('Bot criado com sucesso!');
      
      // Redirecionar para a página do bot
      router.push(`/dashboard/bots/${newBot.id}`);
    } catch (error: any) {
      console.error('❌ Erro ao criar bot:', error);
      setError(error.message || 'Ocorreu um erro ao criar o bot.');
      toast.error('Erro ao criar bot');
    } finally {
      setIsCreating(false);
    }
  };

  // Renderizar o passo atual
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return renderStepContent();
      
      case 1:
        return renderStepContent();
      
      case 2:
        return renderStepContent();
      
      case 3:
        return renderStepContent();
      
      case 4:
        return renderStepContent();
      
      case 5:
        return renderStepContent();
      
      default:
        return null;
    }
  };

  // Não renderizar nada enquanto verifica autenticação
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="heading-2 mb-2">Criar novo bot</h1>
            <p className="text-white/60">Configure seu bot do Telegram para vender acesso aos grupos VIP.</p>
          </div>
        </div>
        
        <Stepper index={activeStep} mb={8} colorScheme="brand">
          {steps.map((step, index) => (
            <Step key={index}>
              <StepIndicator>
                <StepStatus
                  complete={<StepIcon />}
                  incomplete={<StepNumber />}
                  active={<StepNumber />}
                />
              </StepIndicator>
              
              <Box flexShrink={0}>
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </Box>
              
              <StepSeparator />
            </Step>
          ))}
        </Stepper>
        
        <Card variant="outline">
          <CardBody>
            {renderStep()}
          </CardBody>
        </Card>
      </div>
    </DashboardLayout>
  );
} 