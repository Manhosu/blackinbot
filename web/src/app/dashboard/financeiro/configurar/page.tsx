'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  CreditCard, 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff, 
  Info,
  Check,
  AlertCircle,
  User,
  Building,
  Mail,
  Phone,
  Hash
} from 'lucide-react';

interface PixKeyData {
  user_id?: string;
  pix_key?: string;
  pix_key_type?: string;
  bank_name?: string;
  account_holder_name?: string;
  account_holder_document?: string;
}

export default function ConfigurarPixPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDocument, setShowDocument] = useState(false);
  const [formData, setFormData] = useState<PixKeyData>({
    pix_key: '',
    pix_key_type: 'cpf',
    bank_name: '',
    account_holder_name: '',
    account_holder_document: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carregar dados existentes
  const loadPixData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: finances } = await supabase
        .from('user_finances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (finances) {
        setFormData({
          pix_key: finances.pix_key || '',
          pix_key_type: finances.pix_key_type || 'cpf',
          bank_name: finances.bank_name || '',
          account_holder_name: finances.account_holder_name || '',
          account_holder_document: finances.account_holder_document || ''
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados PIX:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPixData();
  }, []);

  // Formatação de documentos
  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Validações
  const validateCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    return cleaned.length === 11;
  };

  const validateCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    return cleaned.length === 14;
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Nome obrigatório
    if (!formData.account_holder_name?.trim()) {
      newErrors.account_holder_name = 'Nome completo é obrigatório';
    }

    // Documento obrigatório
    if (!formData.account_holder_document?.trim()) {
      newErrors.account_holder_document = 'CPF ou CNPJ é obrigatório';
    } else {
      const cleaned = formData.account_holder_document.replace(/\D/g, '');
      if (cleaned.length !== 11 && cleaned.length !== 14) {
        newErrors.account_holder_document = 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos';
      }
    }

    // Chave PIX obrigatória
    if (!formData.pix_key?.trim()) {
      newErrors.pix_key = 'Chave PIX é obrigatória';
    } else {
      // Validar chave PIX conforme o tipo
      switch (formData.pix_key_type) {
        case 'cpf':
          if (!validateCPF(formData.pix_key)) {
            newErrors.pix_key = 'CPF inválido';
          }
          break;
        case 'cnpj':
          if (!validateCNPJ(formData.pix_key)) {
            newErrors.pix_key = 'CNPJ inválido';
          }
          break;
        case 'email':
          if (!validateEmail(formData.pix_key)) {
            newErrors.pix_key = 'E-mail inválido';
          }
          break;
        case 'phone':
          if (!validatePhone(formData.pix_key)) {
            newErrors.pix_key = 'Telefone inválido';
          }
          break;
        case 'random':
          if (formData.pix_key.length < 30) {
            newErrors.pix_key = 'Chave aleatória deve ter pelo menos 30 caracteres';
          }
          break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar dados
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_finances')
        .upsert({
          user_id: user.id,
          pix_key: formData.pix_key,
          pix_key_type: formData.pix_key_type,
          bank_name: formData.bank_name,
          account_holder_name: formData.account_holder_name,
          account_holder_document: formData.account_holder_document,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      alert('Dados PIX salvos com sucesso! ✅');
      router.push('/dashboard/financeiro');
    } catch (error) {
      console.error('Erro ao salvar dados PIX:', error);
      alert('Erro ao salvar dados PIX. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // Atualizar campo
  const updateField = (field: keyof PixKeyData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const getPixKeyIcon = (type: string) => {
    switch (type) {
      case 'cpf':
      case 'cnpj':
        return <User className="w-5 h-5" />;
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'phone':
        return <Phone className="w-5 h-5" />;
      case 'random':
        return <Hash className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  const getPixKeyPlaceholder = (type: string) => {
    switch (type) {
      case 'cpf':
        return '000.000.000-00';
      case 'cnpj':
        return '00.000.000/0000-00';
      case 'email':
        return 'seu@email.com';
      case 'phone':
        return '(11) 99999-9999';
      case 'random':
        return 'Chave aleatória (gerada pelo banco)';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/financeiro')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para Financeiro
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Configurar PIX
          </h1>
          <p className="text-gray-600">
            Configure sua chave PIX para receber saques dos seus ganhos
          </p>
        </div>

        {/* Aviso Importante */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Os dados devem estar corretos para evitar problemas nos saques</li>
                <li>• A chave PIX deve estar em seu nome (titular da conta)</li>
                <li>• Dados incorretos podem resultar no cancelamento do saque</li>
                <li>• Todas as informações são criptografadas e seguras</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="space-y-6">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Dados Pessoais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formData.account_holder_name || ''}
                    onChange={(e) => updateField('account_holder_name', e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.account_holder_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Seu nome completo"
                  />
                  {errors.account_holder_name && (
                    <p className="text-red-500 text-sm mt-1">{errors.account_holder_name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF ou CNPJ *
                  </label>
                  <div className="relative">
                    <input
                      type={showDocument ? "text" : "password"}
                      value={formData.account_holder_document || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        const formatted = value.length <= 11 ? formatCPF(value) : formatCNPJ(value);
                        updateField('account_holder_document', formatted);
                      }}
                      className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.account_holder_document ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDocument(!showDocument)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showDocument ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.account_holder_document && (
                    <p className="text-red-500 text-sm mt-1">{errors.account_holder_document}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Banco */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building className="w-5 h-5 text-green-600" />
                Banco (Opcional)
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome do Banco
                </label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => updateField('bank_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Banco do Brasil, Nubank, Inter..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Apenas para identificação (não obrigatório)
                </p>
              </div>
            </div>

            {/* Chave PIX */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Chave PIX
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo da Chave PIX *
                  </label>
                  <select
                    value={formData.pix_key_type || 'cpf'}
                    onChange={(e) => {
                      updateField('pix_key_type', e.target.value);
                      updateField('pix_key', ''); // Limpar chave ao mudar tipo
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chave PIX *
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {getPixKeyIcon(formData.pix_key_type || 'cpf')}
                    </div>
                    <input
                      type="text"
                      value={formData.pix_key || ''}
                      onChange={(e) => {
                        let value = e.target.value;
                        
                        // Aplicar formatação conforme o tipo
                        if (formData.pix_key_type === 'cpf') {
                          value = formatCPF(value.replace(/\D/g, ''));
                        } else if (formData.pix_key_type === 'cnpj') {
                          value = formatCNPJ(value.replace(/\D/g, ''));
                        } else if (formData.pix_key_type === 'phone') {
                          value = formatPhone(value.replace(/\D/g, ''));
                        }
                        
                        updateField('pix_key', value);
                      }}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.pix_key ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={getPixKeyPlaceholder(formData.pix_key_type || 'cpf')}
                    />
                  </div>
                  {errors.pix_key && (
                    <p className="text-red-500 text-sm mt-1">{errors.pix_key}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Informações de Segurança */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <h4 className="font-medium mb-2">🔒 Segurança dos Dados</h4>
                  <ul className="space-y-1">
                    <li>• Todos os dados são criptografados e armazenados com segurança</li>
                    <li>• Utilizamos padrões bancários de proteção de informações</li>
                    <li>• Seus dados nunca são compartilhados com terceiros</li>
                    <li>• Você pode alterar ou remover suas informações a qualquer momento</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4 pt-6">
              <button
                onClick={() => router.push('/dashboard/financeiro')}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salvar Configurações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Próximos Passos */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-green-900 mb-4 flex items-center gap-2">
            <Check className="w-5 h-5" />
            Próximos Passos
          </h4>
          <div className="text-sm text-green-800 space-y-2">
            <p>✅ Após salvar, você poderá solicitar saques na área financeira</p>
            <p>✅ Saques são processados em até 24 horas úteis</p>
            <p>✅ Valor mínimo para saque: R$ 5,00</p>
            <p>✅ Sem taxa de processamento para saques PIX</p>
          </div>
        </div>
      </div>
    </div>
  );
} 