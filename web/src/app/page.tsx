'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  ArrowRight, 
  CheckCircle, 
  Shield, 
  Zap, 
  Sparkles, 
  MousePointerClick, 
  MessageSquare 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

// Add prefetch directive
// @ts-ignore
export const prefetch = true;
// Add dynamic directive for dynamic rendering 
// @ts-ignore
export const dynamic = 'force-dynamic';
// Add preload directive for important assets
// @ts-ignore
export const preload = ['font', 'script', 'style'];

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Precarregar as páginas de login e cadastro
    const preloadLoginPage = () => {
      router.prefetch('/login');
    };
    
    const preloadRegisterPage = () => {
      router.prefetch('/register');
    };
    
    // Precarregar após 1 segundo
    const timer = setTimeout(() => {
      preloadLoginPage();
      preloadRegisterPage();
    }, 1000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen bg-background flex-col">
      {/* Header */}
      <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'glass-navbar py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src={`/logo.png?v=${new Date().getTime()}`} 
              alt="BLACKINPAY" 
              width={36} 
              height={36} 
              style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, background: '#fff' }}
              priority
            />
            <span className="text-white text-2xl font-bold font-heading tracking-tight" style={{lineHeight: '36px'}}>BLACKINPAY</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-white/80 hover:text-white transition-all">
                Login
            </Link>
            <Link href="/register">
              <Button size="sm" variant="gradient" className="rounded-full px-6">
                Começar
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center pt-20 pb-12 md:pt-32 md:pb-24">
        <div className="absolute inset-0 bg-gradient-dark -z-10">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-4 w-72 h-72 bg-accent/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl"></div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 mb-12 md:mb-0">
            <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
              <span className="bg-clip-text text-transparent bg-gradient-primary">Novo</span> – Controle automático de acessos 
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white font-heading tracking-tight leading-tight">
              Automatize o acesso aos seus <span className="text-gradient">grupos no Telegram</span>
            </h1>
            
            <p className="text-xl mb-8 text-white/70 leading-relaxed">
              Configure o BLACKINPAY em apenas 5 passos simples e comece a faturar com seu grupo VIP ainda hoje, sem complicações.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/register">
                <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
                  Quero começar!
                </Button>
              </Link>
              <Link href="#como-funciona">
                <Button variant="outline" size="lg">
                  Como funciona
                </Button>
              </Link>
            </div>
            
            <div className="flex items-center gap-6 text-white/60">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-accent" />
                <span>Sem taxa de setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-accent" />
                <span>Suporte 24/7</span>
              </div>
            </div>
          </div>
          
          <div className="md:w-1/2 relative">
            <div className="glass-card animate-float">
              <div className="absolute -top-3 -left-3 w-10 h-10 rounded-xl bg-accent/50 backdrop-blur-sm flex items-center justify-center shadow-glow">
                <Sparkles size={18} className="text-white" />
              </div>
              
              <div className="text-3xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2 font-heading">Bot de Demonstração</h3>
              <div className="bg-black/30 rounded-xl p-5 mb-4 backdrop-blur-sm">
                <p className="text-sm text-left mb-3 text-white/90">Bem-vindo(a)! 👋</p>
                <p className="text-sm text-left mb-3 text-white/90">Obtenha acesso exclusivo ao nosso grupo VIP!</p>
                <p className="text-sm text-left mb-3 text-white/90">Escolha o plano que melhor se adequa a você:</p>
                
                <div className="mt-4 space-y-3">
                  <div className="bg-white/5 rounded-lg p-3 text-left border border-white/10 transition-all hover:border-accent/30 hover:bg-white/10 cursor-pointer">
                    <p className="text-sm"><strong className="text-accent">Plano Mensal</strong>: R$ 19,90 / 1 Mês</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-left border border-white/10 transition-all hover:border-accent/30 hover:bg-white/10 cursor-pointer">
                    <p className="text-sm"><strong className="text-accent">Plano Trimestral</strong>: R$ 49,90 / 3 Meses</p>
                  </div>
                </div>
                
                <button className="w-full bg-gradient-primary text-white rounded-lg py-2.5 px-4 mt-5 font-medium hover:shadow-glow transition-all active:scale-95">
                  Gerar QR Code Pix
                </button>
              </div>
              <p className="text-white/60 text-sm">
                Visualize como seu bot aparecerá para os clientes
              </p>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-primary opacity-20 rounded-full filter blur-3xl"></div>
            <div className="absolute -bottom-5 -right-5 w-20 h-20 bg-accent/30 rounded-full filter blur-xl animate-pulse-slow"></div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-black/30 relative" id="recursos">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-80 h-80 bg-accent/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
              <span className="text-accent">Recursos</span> imperdíveis
            </div>
            <h2 className="text-4xl font-bold font-heading">Por que escolher o BLACKINPAY?</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-accent/10 rounded-full transition-all duration-500 group-hover:bg-accent/20"></div>
              
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 z-10 relative">
                <Shield size={24} className="text-accent" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 font-heading">Comece sem gastar nada</h3>
              <p className="text-white/70">
                Não cobramos nada para criar sua conta, as tarifas são aplicadas apenas sobre transações realizadas.
              </p>
              
              <div className="mt-6 pt-4 border-t border-white/5">
                <Link href="/register" className="text-accent inline-flex items-center font-medium group/link">
                  <span>Saiba mais</span>
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            
            <div className="glass-card relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-accent/10 rounded-full transition-all duration-500 group-hover:bg-accent/20"></div>
              
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 z-10 relative">
                <Shield size={24} className="text-accent" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 font-heading">Seu dinheiro mais seguro</h3>
              <p className="text-white/70">
                Nossa tecnologia identifica e proíbe envios para contas bancárias que não sejam de sua titularidade.
              </p>
              
              <div className="mt-6 pt-4 border-t border-white/5">
                <Link href="/register" className="text-accent inline-flex items-center font-medium group/link">
                  <span>Saiba mais</span>
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
            
            <div className="glass-card relative overflow-hidden group">
              <div className="absolute -right-16 -top-16 w-32 h-32 bg-accent/10 rounded-full transition-all duration-500 group-hover:bg-accent/20"></div>
              
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 z-10 relative">
                <Zap size={24} className="text-accent" />
              </div>
              
              <h3 className="text-xl font-bold mb-3 font-heading">Personalize seu bot</h3>
              <p className="text-white/70">
                Deixe o bot com sua identidade, personalizando imagens e textos. Crie diferentes planos e preços.
              </p>
              
              <div className="mt-6 pt-4 border-t border-white/5">
                <Link href="/register" className="text-accent inline-flex items-center font-medium group/link">
                  <span>Saiba mais</span>
                  <ArrowRight size={16} className="ml-2 transition-transform group-hover/link:translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-dark -z-10"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
              <span className="text-accent">Como funciona</span> em poucos passos
            </div>
            <h2 className="text-4xl font-bold font-heading">Automatize o acesso aos seus grupos</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card relative flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-14 h-14 flex items-center justify-center text-3xl font-bold text-accent/20 -mt-2 -mr-2">
                01
              </div>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <MousePointerClick className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">Cadastre-se</h3>
              <p className="text-white/70">
                Crie sua conta em menos de 2 minutos e configure os detalhes do seu bot e grupos.
              </p>
            </div>
            
            <div className="glass-card relative flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-14 h-14 flex items-center justify-center text-3xl font-bold text-accent/20 -mt-2 -mr-2">
                02
              </div>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <MessageSquare className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">Personalize</h3>
              <p className="text-white/70">
                Configure mensagens personalizadas, planos e valores conforme sua estratégia de negócio.
              </p>
            </div>
            
            <div className="glass-card relative flex flex-col items-center text-center">
              <div className="absolute top-0 right-0 w-14 h-14 flex items-center justify-center text-3xl font-bold text-accent/20 -mt-2 -mr-2">
                03
              </div>
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                <Sparkles className="text-accent" size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3 font-heading">Comece a faturar</h3>
              <p className="text-white/70">
                Divulgue seu link, e deixe que o bot automatize todo o processo de vendas e acesso.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <Link href="/register">
              <Button variant="gradient" size="lg" animation="float">
                Comece agora mesmo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Automation */}
      <section className="py-20 bg-gradient-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
                <span className="text-accent">100% Automatizado</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6 font-heading">Automatize todas <br/>as suas operações</h2>
              <p className="text-xl mb-8 text-white/70 leading-relaxed">
                Se você já vende acesso a grupos VIP, sabe o trabalho que dá gerenciar cada pagamento e enviar links. Nosso bot cuida de tudo isso para você. Apenas aguarde os valores entrarem em sua conta.
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="w-8 h-8 flex-shrink-0 bg-accent/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={18} className="text-accent" />
                  </span>
                  <span className="text-white">Venda automatizada 24/7</span>
                </li>
                <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="w-8 h-8 flex-shrink-0 bg-accent/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={18} className="text-accent" />
                  </span>
                  <span className="text-white">Adição e remoção de membros automática</span>
                </li>
                <li className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="w-8 h-8 flex-shrink-0 bg-accent/20 rounded-lg flex items-center justify-center">
                    <CheckCircle size={18} className="text-accent" />
                  </span>
                  <span className="text-white">Reativação de acessos expirados</span>
                </li>
              </ul>
              
              <Link href="/register">
                <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
                  Começar agora
                </Button>
              </Link>
            </div>
            
            <div className="md:w-1/2">
              <div className="glass-card animate-float">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-accent/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white">C</div>
                    <div>
                      <p className="font-medium">Carlos M.</p>
                      <p className="text-sm text-white/60">Sala de Sinais</p>
                    </div>
                    <div className="ml-auto py-1 px-3 rounded-full bg-accent/10 text-accent text-xs font-medium">
                      Adicionado
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-red-500/80 flex items-center justify-center text-white">F</div>
                    <div>
                      <p className="font-medium">Fabricio S.</p>
                      <p className="text-sm text-white/60">Mentoria VIP</p>
                    </div>
                    <div className="ml-auto py-1 px-3 rounded-full bg-red-500/10 text-red-400 text-xs font-medium">
                      Removido
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5">
                    <div className="w-10 h-10 rounded-full bg-amber-500/80 flex items-center justify-center text-white">J</div>
                    <div>
                      <p className="font-medium">Jhony M.</p>
                      <p className="text-sm text-white/60">Mentoria VIP</p>
                    </div>
                    <div className="ml-auto py-1 px-3 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                      Pagamento Pendente
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-accent/20">
                    <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white">R</div>
                    <div>
                      <p className="font-medium">Rafael T.</p>
                      <p className="text-sm text-white/60">Sala de Sinais</p>
                    </div>
                    <div className="ml-auto py-1 px-3 rounded-full bg-accent/10 text-accent text-xs font-medium">
                      Adicionado
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 relative" id="perguntas">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12">
            <div className="md:w-1/3">
              <div className="sticky top-32">
                <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-white/5 border border-white/10 text-sm font-medium">
                  <span className="text-accent">FAQ</span>
                </div>
                <h2 className="text-4xl font-bold mb-6 font-heading">Perguntas frequentes</h2>
                <p className="text-white/70 mb-8">
                  Não encontrou sua dúvida? Entre em contato com nosso suporte 24h.
                </p>
                <p className="text-xl font-medium">contato@blackinpay.com.br</p>
              </div>
            </div>
            
            <div className="md:w-2/3 space-y-6">
              <div className="glass-card transition-all hover:shadow-glow cursor-pointer">
                <h3 className="text-xl font-bold mb-3 font-heading">Quanto tempo leva para cair o saque?</h3>
                <p className="text-white/70">
                  Normalmente o saque é processado em até 1 dia útil após a solicitação, podendo ser instantâneo dependendo da sua instituição bancária.
                </p>
              </div>
              
              <div className="glass-card transition-all hover:shadow-glow cursor-pointer">
                <h3 className="text-xl font-bold mb-3 font-heading">O bot adiciona automaticamente?</h3>
                <p className="text-white/70">
                  Sim, o bot adiciona automaticamente os usuários após a confirmação do pagamento e remove quando o período de acesso expira, sem necessidade de intervenção manual.
                </p>
              </div>
              
              <div className="glass-card transition-all hover:shadow-glow cursor-pointer">
                <h3 className="text-xl font-bold mb-3 font-heading">Posso personalizar meu bot?</h3>
                <p className="text-white/70">
                  Sim, você pode personalizar a imagem de perfil, mensagens de boas-vindas, planos e preços, além de diversos outros elementos para alinhar com sua marca.
                </p>
              </div>
              
              <div className="glass-card transition-all hover:shadow-glow cursor-pointer">
                <h3 className="text-xl font-bold mb-3 font-heading">Qual a taxa da plataforma?</h3>
                <p className="text-white/70">
                  Nossa taxa é de apenas R$1,48 + 5% sobre cada transação realizada, sem custos fixos ou mensalidades. Você só paga quando recebe.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">Pronto para automatizar seu negócio?</h2>
          <p className="text-xl mb-8 text-white/80 max-w-2xl mx-auto">
            Configure o BLACKINPAY em minutos e comece a faturar com seu grupo VIP ainda hoje. Sem complicações.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/register">
              <Button variant="gradient" size="lg" rightIcon={<ArrowRight size={18} />}>
                Criar minha conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-accent/20 rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Image src="/logo.svg" alt="BLACKINPAY" width={40} height={40} />
                </div>
                <span className="text-white text-xl font-bold font-heading">BLACKINPAY</span>
              </div>
              <p className="text-white/60 max-w-xs">
                A solução completa para automatizar o acesso e a monetização dos seus grupos VIP no Telegram.
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
              <div>
                <h4 className="font-bold mb-4 text-white">Plataforma</h4>
                <ul className="space-y-2">
                  <li><Link href="#recursos" className="text-white/60 hover:text-white transition-colors">Recursos</Link></li>
                  <li><Link href="#como-funciona" className="text-white/60 hover:text-white transition-colors">Como funciona</Link></li>
                  <li><Link href="#perguntas" className="text-white/60 hover:text-white transition-colors">FAQ</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4 text-white">Legal</h4>
                <ul className="space-y-2">
                  <li><Link href="/termos" className="text-white/60 hover:text-white transition-colors">Termos de Uso</Link></li>
                  <li><Link href="/privacidade" className="text-white/60 hover:text-white transition-colors">Privacidade</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-bold mb-4 text-white">Contato</h4>
                <ul className="space-y-2">
                  <li><a href="mailto:contato@blackinpay.com.br" className="text-white/60 hover:text-white transition-colors">Email</a></li>
                  <li><a href="https://t.me/blackinpay" className="text-white/60 hover:text-white transition-colors">Telegram</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/40 text-sm mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} BLACKINPAY. Todos os direitos reservados.
            </p>
            
            <div className="flex items-center gap-4">
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
              </a>
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="#" className="text-white/40 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
