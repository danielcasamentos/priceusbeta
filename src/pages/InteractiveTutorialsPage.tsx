import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  CreditCard, 
  Tag, 
  FileText, 
  MessageSquare, 
  TrendingUp, 
  Palette, 
  Share2, 
  CheckCircle, 
  Award, 
  Play, 
  Pause, 
  Smartphone,
  Check,
  ChevronRight,
  ArrowRight,
  Eye,
  Activity,
  Code
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Estilos customizados embutidos para garantir isolamento e visual deslumbrante
const STYLES = `
@keyframes float {
  0% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
  100% { transform: translateY(0px) rotate(0deg); }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 15px rgba(34, 197, 94, 0.4); }
  50% { box-shadow: 0 0 30px rgba(34, 197, 94, 0.8); }
}
@keyframes slideIn {
  from { transform: translateX(50px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes scaleUp {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes cursorMove {
  0% { top: 70%; left: 10%; }
  40% { top: 30%; left: 80%; }
  60% { top: 32%; left: 80%; } /* Clique */
  100% { top: 50%; left: 50%; }
}
@keyframes typing {
  from { width: 0 }
  to { width: 100% }
}
@keyframes confettiFall {
  0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(800px) rotate(360deg); opacity: 0; }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
.animate-pulse-glow {
  animation: pulseGlow 2s infinite;
}
.animate-slide-in {
  animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.animate-scale-up {
  animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.glass-panel {
  background: rgba(10, 22, 40, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
`;

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  description: string;
  benefits: string[];
  techDetails: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "0. Introdução & Boas-vindas",
    subtitle: "A magia da criação de orçamentos rápidos",
    icon: Sparkles,
    description: "Uma experiência imersiva de onboarding. Em vez de textos longos ou vídeos pesados, o usuário vê os blocos de construção de sua proposta se unindo dinamicamente em um smartphone simulado, despertando o sentimento de facilidade e rapidez.",
    benefits: [
      "Retenção de novos usuários logo no primeiro minuto",
      "Demonstração visual do poder do Priceus sem esforço de leitura",
      "Ambiente interativo e moderno"
    ],
    techDetails: "Desenvolvido com elementos de CSS Grid e Absolute Positioning. Os cards flutuantes possuem 'transition-all duration-1000' e mudam de coordenadas baseados em gatilhos de tempo (Keyframe de translação 3D)."
  },
  {
    id: 1,
    title: "1. Cadastro de Produtos",
    subtitle: "Cadastrando itens e vendo o cálculo em tempo real",
    icon: ShoppingBag,
    description: "Simula o preenchimento de um produto no formulário e seu lançamento automático na visualização do cliente. O valor total atualiza com um efeito de contagem suave (contador numérico animado).",
    benefits: [
      "Ensina que os preços são atualizados automaticamente",
      "Mostra exatamente o que o cliente verá no celular",
      "Reduz a ansiedade de configuração inicial"
    ],
    techDetails: "Usa um loop simulado com temporizadores que preenche o input caractere por caractere (digitando virtualmente) e aciona um estado de transição no card do produto com animação 'slide-in'."
  },
  {
    id: 2,
    title: "2. Formas de Pagamento",
    subtitle: "Flexibilidade financeira de forma visual",
    icon: CreditCard,
    description: "Demonstra o ajuste das parcelas no painel administrativo e a expansão automática da listagem no smartphone do cliente, incluindo o acréscimo de taxas/juros dinâmicos de forma amigável.",
    benefits: [
      "Mostra como configurar regras de parcelamento complexas em segundos",
      "Deixa claro para o profissional o impacto visual para o cliente dele",
      "Aumenta a adoção da funcionalidade de parcelamento"
    ],
    techDetails: "Efeito accordion em CSS usando 'max-height' e 'opacity' dinâmicos. O seletor administrativo exibe um cursor virtual arrastando o slider de parcelas, disparando a atualização matemática instantânea."
  },
  {
    id: 3,
    title: "3. Cupons de Desconto",
    subtitle: "Engajando clientes com promoções",
    icon: Tag,
    description: "Simula a aplicação de um cupom promocional no smartphone, gerando um efeito de 'glowing visual' verde, aplicando o desconto real e mostrando a redução do preço instantaneamente.",
    benefits: [
      "Instrui sobre o uso estratégico de gatilhos mentais de desconto",
      "Visualização clara do pop-up de sucesso do cupom aplicado",
      "Gera desejo de testar cupons na hora"
    ],
    techDetails: "O campo de cupom preenche 'NATAL10', dispara um flash luminoso na tela através de um keyframe '@keyframes glow' e altera o estado do preço final com contagem decrescente."
  },
  {
    id: 4,
    title: "4. Campos Personalizados",
    subtitle: "Orçamentos sob medida para qualquer nicho",
    icon: FileText,
    description: "Mostra como criar um campo extra no formulário de contato do orçamento (como 'Data do Evento' ou 'Local') e vê-lo aparecer instantaneamente no smartphone do cliente.",
    benefits: [
      "Demonstra a alta flexibilidade para assessores, fotógrafos, decoradores, etc.",
      "Mostra a facilidade de coletar dados específicos do cliente",
      "Aumenta o preenchimento de campos obrigatórios"
    ],
    techDetails: "Animação de crescimento ('scale-y' e 'opacity') no campo recém-adicionado dentro do formulário do celular, simulando um insert dinâmico no DOM."
  },
  {
    id: 5,
    title: "5. Mensagem de WhatsApp",
    subtitle: "Automação de contato direto e profissional",
    icon: MessageSquare,
    description: "Simula a criação do texto do WhatsApp utilizando as tags inteligentes (ex: {nome_cliente}) e renderiza instantaneamente o balão de chat do WhatsApp com a mensagem formatada real.",
    benefits: [
      "Ensina o uso das variáveis dinâmicas de forma ultra visual",
      "Mostra como o texto final ficará no celular do cliente",
      "Comprova o ganho de tempo na hora de mandar a mensagem"
    ],
    techDetails: "Usa substituição de string em tempo real em um componente React simulador de chat do WhatsApp, com o clássico estilo verde e notificações realistas."
  },
  {
    id: 6,
    title: "6. Preços Avançados",
    subtitle: "Sazonalidades, taxas extras e regras lógicas",
    icon: TrendingUp,
    description: "Ensina a configurar precificação dinâmica. Ao mudar datas ou selecionar locais específicos, tags coloridas de acréscimo ou desconto piscam na tela mostrando a lógica sendo executada.",
    benefits: [
      "Facilita o entendimento de regras complexas (ex: finais de semana mais caros)",
      "Reduz erros de precificação manual no dia a dia",
      "Agrega valor à percepção técnica do sistema"
    ],
    techDetails: "Gatilhos de estado que alternam tags de badge no produto com animações de pulso de cor e mudanças numéricas baseadas em seleções automatizadas."
  },
  {
    id: 7,
    title: "7. Aparência & Identidade Visual",
    subtitle: "Opcional: A cara da sua marca no orçamento",
    icon: Palette,
    description: "Permite ao usuário testar a troca de cores do tema (Azul para Verde Esmeralda) e o upload da sua logomarca, vendo a transformação de design do smartphone acontecer ao vivo.",
    benefits: [
      "Valorização estética instantânea da proposta do profissional",
      "Mostra como o orçamento fica 100% personalizado e elegante",
      "Estimula a criação de um visual premium"
    ],
    techDetails: "Utiliza propriedades customizadas de CSS (CSS Variables) aplicadas no escopo do mockup do smartphone para alterar temas de cores instantaneamente com transição de 0.4s."
  },
  {
    id: 8,
    title: "8. Integrações & Analytics",
    subtitle: "Opcional: Rastreando cada visualização de lead",
    icon: Activity,
    description: "Demonstra como colar as tags de rastreamento (GA4, Facebook Pixel) e mostra badges flutuantes simulando 'Lead Acessou a Proposta' no painel, mostrando o rastreamento em ação.",
    benefits: [
      "Compreensão clara de como o tráfego e visualizações são capturados",
      "Sensação de controle e profissionalismo sobre as vendas",
      "Gera valor para usuários que fazem tráfego pago"
    ],
    techDetails: "Simula o envio de eventos de tracking com um painel de console de desenvolvedor fictício piscando logs verdes sempre que a página é 'acessada' no mockup."
  },
  {
    id: 9,
    title: "9. Publicação & Configurações Finais",
    subtitle: "Ativando o orçamento e gerando o link",
    icon: Share2,
    description: "Exibe um checklist dinâmico de progresso marcando todos os itens configurados. Ao final, a chave 'Publicar' é ativada e o link final do orçamento surge piscando com efeito neon.",
    benefits: [
      "Sensação de dever cumprido e checklist completo",
      "Entendimento claro de onde copiar e como enviar o link",
      "Criação de um momento de comemoração"
    ],
    techDetails: "Checklist interativo com animações de delay em cascata. Ao ativar a chave, o link final é exibido com efeito de pulso e glow verde no botão copiar."
  },
  {
    id: 10,
    title: "10. Conclusão & Estatísticas",
    subtitle: "O sucesso da sua proposta ativa",
    icon: Award,
    description: "Chuva de confetes festivos caindo na tela com um gráfico de acessos e taxas de aceitação subindo de forma animada, selando a jornada do onboarding com chave de ouro.",
    benefits: [
      "Conclusão emocionalmente recompensadora do fluxo de aprendizado",
      "Estimula o usuário a querer ver esses dados na conta real dele",
      "Reduz drasticamente o Churn nas primeiras horas"
    ],
    techDetails: "Utiliza uma matriz de 40 elementos gerados dinamicamente com durações e cores aleatórias caindo através de animação CSS keyframes de translação e rotação infinita."
  }
];

export function InteractiveTutorialsPage() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [typingText, setTypingText] = useState<string>("");
  const [totalValue, setTotalValue] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(1);
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [selectedTheme, setSelectedTheme] = useState<string>('blue');
  const [addedFields, setAddedFields] = useState<string[]>([]);
  const [whatsappName, setWhatsappName] = useState<string>("Pedro Alencar");
  const [pricingSazonal, setPricingSazonal] = useState<boolean>(false);
  const [checklistProgress, setChecklistProgress] = useState<number>(0);
  const [confetti, setConfetti] = useState<{ id: number; color: string; left: number; delay: number; duration: number }[]>([]);

  // Referência para controlar o intervalo do loop automático
  const autoPlayTimer = useRef<any>(null);

  // Efeito para injetar os estilos customizados na página
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = STYLES;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Efeito de AutoPlay das etapas
  useEffect(() => {
    if (isPlaying) {
      autoPlayTimer.current = setInterval(() => {
        setActiveStep((prev) => (prev + 1) % TUTORIAL_STEPS.length);
      }, 7000); // 7 segundos por etapa para dar tempo de contemplar a animação
    } else {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    }
    return () => {
      if (autoPlayTimer.current) clearInterval(autoPlayTimer.current);
    };
  }, [isPlaying]);

  // Efeito para reiniciar micro-animações específicas de cada Step sempre que o Step mudar
  useEffect(() => {
    // Reset de estados das animações
    setTypingText("");
    setTotalValue(0);
    setInstallments(1);
    setCouponApplied(false);
    setSelectedTheme('blue');
    setAddedFields([]);
    setPricingSazonal(false);
    setChecklistProgress(0);
    setConfetti([]);

    if (activeStep === 1) {
      // Efeito de digitação e contagem de preço do produto
      let currentText = "";
      const textToType = "Assessoria Completa Premium";
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex < textToType.length) {
          currentText += textToType[charIndex];
          setTypingText(currentText);
          charIndex++;
        } else {
          clearInterval(typeInterval);
          // Contagem do total subindo
          let val = 0;
          const priceInterval = setInterval(() => {
            if (val < 3500) {
              val += 175;
              setTotalValue(val);
            } else {
              setTotalValue(3500);
              clearInterval(priceInterval);
            }
          }, 30);
        }
      }, 60);
      return () => clearInterval(typeInterval);
    }

    if (activeStep === 2) {
      // Simulação de arrastar parcelamento e taxa
      setTimeout(() => {
        setInstallments(6);
        setTimeout(() => {
          setInstallments(12);
        }, 1500);
      }, 1000);
    }

    if (activeStep === 3) {
      // Simula digitação de cupom e aplicação
      let currentText = "";
      const couponText = "NOIVA15";
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex < couponText.length) {
          currentText += couponText[charIndex];
          setTypingText(currentText);
          charIndex++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            setCouponApplied(true);
          }, 500);
        }
      }, 1500 / couponText.length);
      return () => clearInterval(typeInterval);
    }

    if (activeStep === 4) {
      // Adição de campos personalizados dinâmicos
      setTimeout(() => {
        setAddedFields(["Data do Evento"]);
        setTimeout(() => {
          setAddedFields(["Data do Evento", "Local da Festa"]);
        }, 1800);
      }, 1000);
    }

    if (activeStep === 5) {
      // Preenche variáveis do WhatsApp
      let charIndex = 0;
      const names = ["Beatriz Costa", "Pedro Alencar", "Mariana & Thiago"];
      const changeNameInterval = setInterval(() => {
        setWhatsappName(names[charIndex % names.length]);
        charIndex++;
      }, 2000);
      return () => clearInterval(changeNameInterval);
    }

    if (activeStep === 6) {
      // Alterna regras sazonais
      const timer = setInterval(() => {
        setPricingSazonal(prev => !prev);
      }, 2000);
      return () => clearInterval(timer);
    }

    if (activeStep === 7) {
      // Simula alteração de paletas
      const themes = ['blue', 'emerald', 'purple', 'rose'];
      let themeIdx = 0;
      const themeInterval = setInterval(() => {
        themeIdx = (themeIdx + 1) % themes.length;
        setSelectedTheme(themes[themeIdx]);
      }, 1500);
      return () => clearInterval(themeInterval);
    }

    if (activeStep === 9) {
      // Progresso do checklist
      const progressTimer = setInterval(() => {
        setChecklistProgress(prev => {
          if (prev < 4) return prev + 1;
          clearInterval(progressTimer);
          return 4;
        });
      }, 1000);
      return () => clearInterval(progressTimer);
    }

    if (activeStep === 10) {
      // Geração de confetes
      const colors = ['#f43f5e', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316'];
      const tempConfetti = Array.from({ length: 40 }).map((_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 2.5 + Math.random() * 2
      }));
      setConfetti(tempConfetti);
    }
  }, [activeStep]);

  const handleNextStep = () => {
    setActiveStep((prev) => (prev + 1) % TUTORIAL_STEPS.length);
  };

  const handlePrevStep = () => {
    setActiveStep((prev) => (prev - 1 + TUTORIAL_STEPS.length) % TUTORIAL_STEPS.length);
  };

  // Render do mockup administrativo (Painel Esquerdo da Simulação)
  const renderAdminMockup = () => {
    switch (activeStep) {
      case 0: // Introdução
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 text-white relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
                <Sparkles className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                Bem-vindo ao Onboarding
              </h3>
              <p className="text-gray-300 max-w-md text-sm leading-relaxed mb-6">
                Este simulador demonstra as animações interativas em HTML5 e CSS3 que projetamos para guiar seus usuários na configuração perfeita do sistema.
              </p>
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-gray-400">
                <Code className="w-4 h-4 text-emerald-400" />
                <span>Simulação do Editor Administrativo</span>
              </div>
            </div>
          </div>
        );

      case 1: // Cadastro de Produtos
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Painel de Configuração</span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">Produtos</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Nome do Item</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[38px] flex items-center">
                    {typingText}
                    <span className="w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse"></span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Preço do Serviço (R$)</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200">
                    {totalValue > 0 ? `R$ 3.500,00` : ""}
                  </div>
                </div>
                <div className="pt-2">
                  <button className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                    typingText.length >= 25 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-500' 
                      : 'bg-slate-800 text-gray-500 border border-white/5'
                  }`}>
                    <span>+ Adicionar Produto</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 text-[11px] text-blue-300">
              💡 **Dica Visual**: O cursor virtual clica no botão e o produto flutua em direção ao mockup do celular à direita, reforçando a lógica "arrastar e atualizar".
            </div>
          </div>
        );

      case 2: // Formas de Pagamento
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Regras de Parcelamento</span>
                <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">Finanças</span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Número máximo de parcelas</span>
                    <span className="text-amber-400 font-bold">{installments}x</span>
                  </div>
                  <div className="relative pt-1">
                    <input 
                      type="range" 
                      min="1" 
                      max="12" 
                      value={installments} 
                      readOnly
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 px-1 mt-1">
                      <span>1x</span>
                      <span>6x</span>
                      <span>12x</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 border border-white/10 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Taxa de Acréscimo</span>
                    <span className="text-xs text-emerald-400 font-semibold">+ 2.0%</span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[40%]"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-300">
              💡 **Dica Visual**: Veja como alterar o slider na esquerda faz as parcelas aparecerem instantaneamente desdobradas no smartphone do cliente à direita.
            </div>
          </div>
        );

      case 3: // Cupons
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Criar Cupom</span>
                <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">Marketing</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Código do Cupom</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 min-h-[38px] flex items-center font-mono">
                    {typingText}
                    <span className="w-1.5 h-4 bg-purple-400 ml-0.5 animate-pulse"></span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Desconto (%)</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono">
                    15% OFF
                  </div>
                </div>
                <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-lg p-2.5 text-xs text-purple-300">
                  <span>Status do Cupom:</span>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">Ativo</span>
                </div>
              </div>
            </div>
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-3 text-[11px] text-purple-300">
              💡 **Dica Visual**: Ao aplicar o cupom, o celular simula uma fagulha de confetes e destaca o valor descontado em verde brilhante.
            </div>
          </div>
        );

      case 4: // Campos Personalizados
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Campos Adicionais</span>
                <span className="text-[10px] px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">Formulário</span>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Arraste campos para coletar informações no fechamento:</p>
                <div className="space-y-2 pt-2">
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all duration-300 ${
                    addedFields.includes("Data do Evento")
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                      : 'bg-slate-900 border-white/10 text-gray-400'
                  }`}>
                    <span>📅 Data do Evento (Campo Opcional)</span>
                    <span className="text-[9px] uppercase font-bold">{addedFields.includes("Data do Evento") ? "Adicionado" : "Disponível"}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-all duration-300 ${
                    addedFields.includes("Local da Festa")
                      ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                      : 'bg-slate-900 border-white/10 text-gray-400'
                  }`}>
                    <span>📍 Local da Festa (Texto Curto)</span>
                    <span className="text-[9px] uppercase font-bold">{addedFields.includes("Local da Festa") ? "Adicionado" : "Disponível"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-lg p-3 text-[11px] text-rose-300">
              💡 **Dica Visual**: Mostra ao profissional que ele pode exigir dados do cliente no ato da aceitação para gerar o contrato automaticamente.
            </div>
          </div>
        );

      case 5: // WhatsApp
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Template de Mensagem</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">Notificações</span>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-400">Texto Padrão de Envio</label>
                <div className="bg-slate-900 border border-white/10 rounded-lg p-3 text-xs text-gray-300 font-mono space-y-1.5 leading-relaxed">
                  <p>Olá, <span className="text-emerald-400 font-bold">{"{nome_cliente}"}</span>!</p>
                  <p>O seu orçamento de <span className="text-emerald-400 font-bold">{"{nome_template}"}</span> está pronto e disponível no link abaixo:</p>
                  <p className="text-blue-400 underline">priceus.com.br/o/5982</p>
                  <p>Valor total: <span className="text-emerald-400 font-bold">{"{valor_total}"}</span></p>
                </div>
              </div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-300">
              💡 **Dica Visual**: O painel esquerdo mostra o editor com variáveis dinâmicas e o celular renderiza a mensagem final real com dados fictícios.
            </div>
          </div>
        );

      case 6: // Preços Avançados
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Regras Inteligentes de Preço</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">Precificação</span>
              </div>
              <div className="space-y-2.5">
                <div className="p-3 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">📅 Ajuste Sazonal: Dezembro</p>
                    <p className="text-[10px] text-gray-400">Aplica acréscimo de fim de ano</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all duration-300 ${
                    pricingSazonal 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-slate-800 text-gray-500 border border-white/5'
                  }`}>
                    {pricingSazonal ? "ATIVADO" : "AGUARDANDO"}
                  </span>
                </div>
                <div className="p-3 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">📍 Ajuste por Cidade</p>
                    <p className="text-[10px] text-gray-400">Frete/Deslocamento automático</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-gray-500 border border-white/5 rounded font-bold">INATIVO</span>
                </div>
              </div>
            </div>
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-lg p-3 text-[11px] text-indigo-300">
              💡 **Dica Visual**: Ao clicar na regra de sazonalidade, o preço da proposta no smartphone pisca uma badge de acréscimo dinâmico.
            </div>
          </div>
        );

      case 7: // Aparência
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Visual do Orçamento</span>
                <span className="text-[10px] px-2 py-0.5 bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-full">Design</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Selecione a cor principal</label>
                  <div className="flex items-center gap-3">
                    <button className={`w-8 h-8 rounded-full bg-blue-600 border-2 transition-all ${selectedTheme === 'blue' ? 'border-white scale-110' : 'border-transparent'}`}></button>
                    <button className={`w-8 h-8 rounded-full bg-emerald-600 border-2 transition-all ${selectedTheme === 'emerald' ? 'border-white scale-110' : 'border-transparent'}`}></button>
                    <button className={`w-8 h-8 rounded-full bg-purple-600 border-2 transition-all ${selectedTheme === 'purple' ? 'border-white scale-110' : 'border-transparent'}`}></button>
                    <button className={`w-8 h-8 rounded-full bg-pink-600 border-2 transition-all ${selectedTheme === 'rose' ? 'border-white scale-110' : 'border-transparent'}`}></button>
                  </div>
                </div>
                <div className="pt-2">
                  <label className="block text-xs text-gray-400 mb-2">Carregar Logotipo</label>
                  <div className="bg-slate-900 border border-dashed border-white/20 rounded-lg p-4 text-center">
                    <Palette className="w-5 h-5 text-pink-400 mx-auto mb-2 animate-bounce" />
                    <span className="text-[10px] text-gray-400 block">SuaLogo.png carregada com sucesso</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-pink-950/20 border border-pink-500/20 rounded-lg p-3 text-[11px] text-pink-300">
              💡 **Dica Visual**: A troca de cor no admin dispara um efeito suave de fade-color mudando toda a proposta visual do cliente no celular.
            </div>
          </div>
        );

      case 8: // Integrações
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Rastreamento & Pixel</span>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">Integrações</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Google Analytics ID (G-XXXX)</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                    G-89FJS8DK93
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Facebook Pixel ID</label>
                  <div className="bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-gray-300 font-mono">
                    784920485903210
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-3 space-y-1.5 font-mono text-[9px] text-cyan-300">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>[Pixel Server] Event 'ViewContent' ready.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>[GA4] Pageview tracked successfully.</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3 text-[11px] text-cyan-300">
              💡 **Dica Visual**: Mostra de forma extremamente didática como o Google Analytics detecta quando um cliente acessa a proposta.
            </div>
          </div>
        );

      case 9: // Configurações Finais
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Finalizar Configuração</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">Pronto</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-gray-300">
                  <span>Status do Orçamento</span>
                  <div className="w-10 h-6 bg-emerald-500 rounded-full p-0.5 flex items-center justify-end transition-all duration-300">
                    <div className="bg-white w-5 h-5 rounded-full shadow-md"></div>
                  </div>
                </div>
                <div className="bg-slate-900 border border-white/10 rounded-lg p-3 space-y-2">
                  <p className="text-[10px] text-gray-400">Link público gerado:</p>
                  <div className="flex items-center justify-between bg-slate-950 border border-white/5 rounded px-2.5 py-1.5">
                    <span className="text-[10px] text-emerald-400 font-mono select-all">priceus.com.br/o/assessoria-premium</span>
                    <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">Copiar</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-lg p-3 text-[11px] text-emerald-300">
              💡 **Dica Visual**: Exibe o switch sendo ligado, o checklist sendo validado e o botão de copiar brilhando em verde néon.
            </div>
          </div>
        );

      case 10: // Conclusão
        return (
          <div className="p-6 text-white space-y-4 h-full flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">Métricas de Sucesso</span>
                <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full">Performance</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-white/10 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-400">Acessos</p>
                  <p className="text-xl font-extrabold text-blue-400 animate-pulse">48</p>
                </div>
                <div className="bg-slate-900 border border-white/10 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-gray-400">Aceitos</p>
                  <p className="text-xl font-extrabold text-emerald-400 animate-pulse">14</p>
                </div>
              </div>
              <div className="bg-slate-900 border border-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                  <span>Conversão Geral</span>
                  <span className="text-emerald-400 font-bold">29.1%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full w-[29.1%]"></div>
                </div>
              </div>
            </div>
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3 text-[11px] text-blue-300">
              💡 **Dica Visual**: Fim do onboarding. Chuva de confetes no celular e animação de comemoração para motivar o usuário a começar a vender.
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render do mockup do smartphone (Painel Direito da Simulação)
  const renderSmartphoneMockup = () => {
    // Cores de tema simuladas
    const themeColors: { [key: string]: string } = {
      blue: 'bg-blue-600 hover:bg-blue-700 text-white',
      emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      purple: 'bg-purple-600 hover:bg-purple-700 text-white',
      rose: 'bg-pink-600 hover:bg-pink-700 text-white',
    };

    const activeThemeClass = themeColors[selectedTheme] || themeColors.blue;

    return (
      <div className="w-full max-w-[280px] h-[520px] bg-slate-950 rounded-[40px] border-[10px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col justify-between">
        {/* Confetes para a etapa de conclusão */}
        {activeStep === 10 && confetti.map((c) => (
          <div 
            key={c.id} 
            className="absolute w-2 h-2 rounded-sm pointer-events-none z-50"
            style={{
              left: `${c.left}%`,
              backgroundColor: c.color,
              top: '-10px',
              animation: `confettiFall ${c.duration}s linear infinite`,
              animationDelay: `${c.delay}s`
            }}
          />
        ))}

        {/* Câmera superior do smartphone */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-slate-800 rounded-full z-40 flex items-center justify-center">
          <span className="w-2.5 h-2.5 bg-slate-900 rounded-full"></span>
        </div>

        {/* Conteúdo interno do smartphone */}
        <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4 text-white text-xs space-y-4 select-none relative">
          
          {/* Header da Proposta */}
          <div className="border-b border-white/10 pb-3 text-center space-y-1 relative">
            {activeStep >= 7 && selectedTheme !== 'blue' ? (
              <div className="h-8 flex items-center justify-center animate-scale-up">
                <div className="text-[11px] font-extrabold tracking-wider text-emerald-400 flex items-center gap-1">
                  <Palette className="w-3.5 h-3.5" />
                  <span>LOGO DA EMPRESA</span>
                </div>
              </div>
            ) : (
              <div className="text-[9px] text-gray-500 font-mono">ORÇAMENTO DE SERVIÇOS</div>
            )}
            <h4 className="font-bold text-sm">Proposta Comercial</h4>
            <p className="text-[10px] text-gray-400">Cliente: Mariana & Thiago</p>
          </div>

          {/* Render dinâmico de acordo com o Step */}
          {activeStep === 0 && (
            <div className="space-y-4 py-8 text-center animate-scale-up">
              <div className="relative inline-block">
                <Smartphone className="w-16 h-16 text-blue-500/50 mx-auto" />
                <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-bounce" />
              </div>
              <p className="text-gray-300 text-[11px]">Sua proposta comercial interativa vai se formando aqui conforme você edita!</p>
              <div className="space-y-2 mt-4 px-2">
                <div className="bg-white/5 border border-white/10 p-2 rounded-lg flex items-center gap-2 text-left animate-slide-in" style={{ animationDelay: '0.2s' }}>
                  <ShoppingBag className="w-4 h-4 text-blue-400" />
                  <span className="text-[10px]">Cadastro de Itens</span>
                </div>
                <div className="bg-white/5 border border-white/10 p-2 rounded-lg flex items-center gap-2 text-left animate-slide-in" style={{ animationDelay: '0.5s' }}>
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px]">Parcelamento Fácil</span>
                </div>
              </div>
            </div>
          )}

          {activeStep === 1 && (
            <div className="space-y-3">
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Serviços Contratados</p>
              {typingText ? (
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1 animate-slide-in">
                  <div className="flex items-center justify-between font-bold text-[11px]">
                    <span className="truncate max-w-[150px]">{typingText}</span>
                    <span className="text-blue-400 font-mono">R$ 3.500</span>
                  </div>
                  <p className="text-[9px] text-gray-400">Serviço de assessoria completa e coordenação para o grande dia.</p>
                </div>
              ) : (
                <div className="border border-dashed border-white/15 p-4 rounded-xl text-center text-gray-500">
                  Nenhum serviço adicionado ainda.
                </div>
              )}
              
              <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-xs">
                <span>VALOR TOTAL</span>
                <span className="text-emerald-400 font-mono text-sm">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div className="space-y-3 animate-scale-up">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <div className="flex items-center justify-between font-bold text-[11px] mb-2">
                  <span>Assessoria de Casamento</span>
                  <span className="font-mono">R$ 3.500,00</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] text-amber-400 uppercase font-bold">Opções de Pagamento</p>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  <div className="bg-slate-900 border border-white/5 p-2 rounded flex items-center justify-between text-[10px]">
                    <span>À vista (PIX ou Boleto)</span>
                    <span className="text-emerald-400 font-bold">R$ 3.500,00</span>
                  </div>
                  {installments > 1 && (
                    <div className="bg-slate-900 border border-amber-500/30 p-2 rounded flex items-center justify-between text-[10px] animate-slide-in">
                      <span>Parcelado em {installments}x</span>
                      <div className="text-right">
                        <span className="text-amber-400 font-bold block">
                          {installments}x R$ {((3500 * 1.02) / installments).toFixed(2)}
                        </span>
                        <span className="text-[8px] text-gray-500 block">Total: R$ 3.570,00 (inc. 2%)</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeStep === 3 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>Fotografia Premium</span>
                  <span className="font-mono">R$ 5.000,00</span>
                </div>
                {couponApplied && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 flex items-center justify-between text-[10px] text-emerald-400 animate-pulse-glow">
                    <span>Cupom {typingText} (15% OFF)</span>
                    <span>- R$ 750,00</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-xs">
                <span>VALOR FINAL</span>
                <span className="text-emerald-400 font-mono text-sm">
                  R$ {couponApplied ? "4.250,00" : "5.000,00"}
                </span>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-3">Informações para Contrato</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[9px] text-gray-400 mb-1">Nome Completo</label>
                    <div className="bg-slate-900 border border-white/10 rounded p-1.5 text-[10px] text-gray-400">Mariana de Souza</div>
                  </div>
                  
                  {addedFields.map((field, idx) => (
                    <div key={idx} className="space-y-1 animate-slide-in">
                      <label className="block text-[9px] text-rose-300 font-bold mb-1">{field}</label>
                      <div className="bg-slate-900 border border-rose-500/30 rounded p-1.5 text-[10px] text-gray-400 flex items-center justify-between">
                        <span>{field === "Data do Evento" ? "20/12/2026" : "Mansão das Flores, SP"}</span>
                        <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1 rounded">Novo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeStep === 5 && (
            <div className="space-y-3 h-full flex flex-col justify-end py-4">
              <p className="text-[9px] text-center text-gray-500 font-bold">Simulação de Chat do WhatsApp</p>
              <div className="bg-[#e5ddd5] dark:bg-slate-900 rounded-xl p-3 space-y-3 border border-white/10 shadow-lg">
                <div className="flex items-center gap-2 border-b border-black/5 pb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold">P</div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-800 dark:text-gray-200">Priceus Pro</p>
                    <p className="text-[8px] text-gray-500">Online</p>
                  </div>
                </div>
                <div className="bg-[#dcf8c6] dark:bg-emerald-950/50 text-gray-800 dark:text-gray-200 p-2.5 rounded-lg text-[10px] shadow-sm max-w-[85%] self-end space-y-1 animate-scale-up">
                  <p className="font-bold">Olá, {whatsappName}!</p>
                  <p>O seu orçamento de Assessoria Premium está pronto no link:</p>
                  <p className="text-blue-600 dark:text-blue-400 underline break-all">priceus.com.br/o/assessoria-premium</p>
                  <p className="font-bold text-[9px] text-right text-gray-500 mt-1">12:30 ✓✓</p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 6 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between font-bold text-[11px]">
                  <span>Fotografia Evento</span>
                  <span className="font-mono">R$ 5.000,00</span>
                </div>
                {pricingSazonal && (
                  <div className="bg-indigo-500/20 border border-indigo-500/40 rounded p-2 flex items-center justify-between text-[10px] text-indigo-300 animate-pulse-glow">
                    <span>Taxa Sazonal (Dezembro)</span>
                    <span className="font-bold">+ 10% (R$ 500,00)</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between font-bold text-xs">
                <span>VALOR TOTAL</span>
                <span className={`font-mono text-sm transition-all duration-300 ${pricingSazonal ? 'text-indigo-400 scale-105' : 'text-emerald-400'}`}>
                  R$ {pricingSazonal ? "5.500,00" : "5.000,00"}
                </span>
              </div>
            </div>
          )}

          {activeStep === 7 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold">Tema selecionado:</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold bg-white/10">{selectedTheme}</span>
                </div>
                <div className="space-y-2">
                  <div className={`p-2.5 rounded-lg text-center font-bold transition-all duration-500 ${activeThemeClass}`}>
                    Confirmar Contratação
                  </div>
                  <div className="p-2.5 rounded-lg text-center font-bold border border-white/10 text-white">
                    Falar com Assessoria
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 8 && (
            <div className="space-y-3">
              <div className="bg-slate-900 border border-white/5 p-3 rounded-xl text-center space-y-2">
                <Activity className="w-8 h-8 text-cyan-400 mx-auto animate-pulse" />
                <p className="text-[10px] font-bold text-cyan-300">Simulador de Eventos de Tracking</p>
                <p className="text-[9px] text-gray-400">Sempre que o cliente acessa esta página pelo smartphone:</p>
                <div className="bg-black/50 p-2 rounded text-[8px] font-mono text-left text-emerald-400 space-y-1 border border-white/5">
                  <p>&gt; Triggering view_item...</p>
                  <p>&gt; GA4 payload sent...</p>
                  <p>&gt; Meta Pixel 'Pageview' fired.</p>
                </div>
              </div>
            </div>
          )}

          {activeStep === 9 && (
            <div className="space-y-3">
              <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                <p className="text-[9px] text-gray-400 uppercase font-bold">Resumo de Configuração</p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">✓</span>
                    <span className="text-gray-300">Definição de preço básico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">✓</span>
                    <span className="text-gray-300">Taxas e juros do parcelamento</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checklistProgress >= 3 ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white animate-scale-up">✓</span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[9px] text-gray-500">3</span>
                    )}
                    <span className={checklistProgress >= 3 ? "text-gray-300" : "text-gray-500"}>Cupom de Boas-vindas ativado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {checklistProgress >= 4 ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white animate-scale-up">✓</span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-800 flex items-center justify-center text-[9px] text-gray-500">4</span>
                    )}
                    <span className={checklistProgress >= 4 ? "text-gray-300" : "text-gray-500"}>Identidade visual customizada</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 10 && (
            <div className="space-y-3 text-center py-6 animate-scale-up">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <h5 className="font-bold text-sm text-emerald-400">Orçamento Concluído!</h5>
              <p className="text-[10px] text-gray-400 px-2">Agora você está pronto para compartilhar sua proposta comercial linda e profissional.</p>
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg text-[9px] font-mono text-emerald-300">
                🚀 Conversão estimada de +35% comparada a propostas em PDF.
              </div>
            </div>
          )}

        </div>

        {/* Home Bar do iPhone */}
        <div className="h-6 flex items-center justify-center pb-2">
          <span className="w-24 h-1 bg-slate-700 rounded-full"></span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#07101f] text-gray-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#0a1628]/80 backdrop-filter backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/Logo Price Us Dark.png"
              alt="Price Us"
              className="h-10 w-auto"
            />
            <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-md">
              Labs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 transition-colors"
            >
              Voltar ao Dashboard
            </Link>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isPlaying 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                  : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pausar Simulação" : "Iniciar AutoPlay"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Lado Esquerdo: Timeline de Passos e Descrição */}
        <div className="flex-1 flex flex-col space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Simulador de Tutoriais Avançados
            </h1>
            <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
              Explore o conceito de **Tutoriais CSS Animados** planejado para o Priceus. Em vez de ler tutoriais chatos, o usuário vê e experimenta as ferramentas sendo ajustadas em tempo real com micro-animações ricas.
            </p>
          </div>

          {/* Stepper Horizontal / Timeline */}
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 overflow-x-auto flex gap-2 scrollbar-none">
            {TUTORIAL_STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    setActiveStep(step.id);
                    setIsPlaying(false); // Pausa o autoplay se o usuário clica manualmente
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 scale-105'
                      : 'bg-slate-900 border-white/5 text-gray-400 hover:border-white/10 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>Passo {step.id}</span>
                </button>
              );
            })}
          </div>

          {/* Detalhes do Passo Atual */}
          <div className="bg-[#0a1628]/70 border border-white/8 backdrop-filter backdrop-blur-xl rounded-3xl p-8 space-y-6 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                {React.createElement(TUTORIAL_STEPS[activeStep].icon, { className: "w-6 h-6 text-blue-400" })}
              </div>
              <div>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-blue-400">ETAPA DE CONFIGURAÇÃO</span>
                <h2 className="text-xl font-bold text-white">{TUTORIAL_STEPS[activeStep].title}</h2>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {TUTORIAL_STEPS[activeStep].description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Benefícios para o Usuário</span>
                  </h4>
                  <ul className="space-y-2">
                    {TUTORIAL_STEPS[activeStep].benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                        <span className="text-emerald-400 font-bold mt-0.5">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Code className="w-4 h-4" />
                    <span>Bastidores do Desenvolvimento</span>
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed bg-slate-900/40 border border-white/5 p-3 rounded-xl font-mono">
                    {TUTORIAL_STEPS[activeStep].techDetails}
                  </p>
                </div>
              </div>
            </div>

            {/* Controles de Navegação */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <button
                onClick={handlePrevStep}
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-white font-semibold transition-colors"
              >
                Voltar Passo
              </button>
              <div className="flex items-center gap-1">
                {TUTORIAL_STEPS.map((step) => (
                  <span 
                    key={step.id} 
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      activeStep === step.id ? 'bg-blue-500 w-4' : 'bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={handleNextStep}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors"
              >
                <span>Avançar Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Lado Direito: Simulador Visual (Painel Admin + Smartphone) */}
        <div className="w-full lg:w-[480px] flex flex-col space-y-4">
          <div className="text-xs uppercase font-bold tracking-wider text-gray-500 pl-1 flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Visualização da Animação Interativa</span>
          </div>

          <div className="bg-[#0a1628]/70 border border-white/8 rounded-3xl p-6 flex flex-col md:flex-row lg:flex-col items-center justify-between gap-6 min-h-[580px] relative overflow-hidden">
            {/* Background Decorativo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

            {/* Painel Esquerdo (Painel Administrativo Simulado) */}
            <div className="flex-1 w-full bg-slate-900/60 border border-white/5 rounded-2xl min-h-[220px] max-h-[280px] overflow-hidden">
              {renderAdminMockup()}
            </div>

            {/* Seta indicativa de Integração */}
            <div className="flex items-center justify-center text-gray-600 lg:rotate-90">
              <ArrowRight className="w-6 h-6 text-gray-500 animate-pulse" />
            </div>

            {/* Celular Simulado (Lado Direito) */}
            <div className="w-full flex justify-center">
              {renderSmartphoneMockup()}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-[#050c18] mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Price Us. Simulador de Recursos de Onboarding.</p>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="hover:underline">Dashboard</Link>
            <span>•</span>
            <span className="text-emerald-400">Alta Fidelidade Visual (HTML/CSS)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
