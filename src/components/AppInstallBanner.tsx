import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';

interface AppInstallBannerProps {
  variant?: 'default' | 'topbar' | 'mini';
}

export function AppInstallBanner({ variant = 'default' }: AppInstallBannerProps) {
  const [showIosModal, setShowIosModal] = useState(false);
  const [device, setDevice] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  useEffect(() => {
    // Detect mobile OS
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDevice('ios');
    } else if (/android/.test(userAgent)) {
      setDevice('android');
    }

    // Detect if already installed/running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsPwaInstalled(true);
    }
  }, []);

  if (isPwaInstalled) return null; // Hide if already inside the app

  // Renderização da Topbar (Muitíssimo mais discreta e fina, para ficar grudada abaixo do header)
  if (variant === 'topbar') {
    return (
      <>
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white w-full py-2.5 px-4 shadow-sm flex flex-col sm:flex-row items-center justify-center sm:justify-between transition-all">
          <div className="flex items-center space-x-2 mb-2 sm:mb-0 text-sm">
            <Smartphone className="w-4 h-4 text-blue-200" />
            <span className="font-medium whitespace-nowrap">Baixe o App PriceU$ gratuitamente!</span>
            <span className="hidden md:inline text-blue-200 text-xs">— Orçamentos rápidos no seu bolso</span>
          </div>

          <div className="flex space-x-2">
            {(device === 'android' || device === 'desktop') && (
              <a
                href="/priceus-android.apk"
                download
                className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Android</span>
              </a>
            )}
            {(device === 'ios' || device === 'desktop') && (
              <button
                onClick={() => setShowIosModal(true)}
                className="flex items-center space-x-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              >
                <Share className="w-3.5 h-3.5" />
                <span>iPhone</span>
              </button>
            )}
          </div>
        </div>
        {showIosModal && <IosModal onClose={() => setShowIosModal(false)} />}
      </>
    );
  }

  // Renderização Mini (Aleta discreta para o Dashboard)
  if (variant === 'mini') {
    return (
      <>
        <div className="bg-white border border-blue-100 shadow-sm rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800 leading-tight">Instale nosso Aplicativo</h4>
              <p className="text-xs text-gray-500">Tenha o painel sempre acessível no celular</p>
            </div>
          </div>
          <div>
            {(device === 'android' || device === 'desktop') && (
              <a
                href="/priceus-android.apk"
                download
                className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar</span>
              </a>
            )}
            {(device === 'ios' || device === 'desktop') && (
              <button
                onClick={() => setShowIosModal(true)}
                className="text-white bg-gray-900 hover:bg-gray-800 px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1"
              >
                <Share className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>
            )}
          </div>
        </div>
        {showIosModal && <IosModal onClose={() => setShowIosModal(false)} />}
      </>
    );
  }

  // Renderização Default (Página de Login)
  return (
    <>
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-xl rounded-2xl p-6 text-center border border-blue-500/30 w-full relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-400 opacity-20 blur-3xl rounded-full"></div>
        
        <h3 className="text-2xl font-bold text-white mb-2 relative z-10">Instale o App PriceU$</h3>
        <p className="text-blue-100 text-[15px] mb-6 relative z-10 leading-relaxed max-w-sm mx-auto">
          Tenha orçamentos, contratos e leads na palma da sua mão com nosso aplicativo nativo e rápido.
        </p>

        <div className="flex flex-col gap-3 relative z-10">
          {(device === 'android' || device === 'desktop') && (
            <a
              href="/priceus-android.apk"
              download
              className="w-full flex items-center justify-center space-x-2 bg-white text-blue-700 font-bold px-5 py-3.5 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Download className="w-5 h-5" />
              <span>Baixar para Android</span>
            </a>
          )}
          
          {(device === 'ios' || device === 'desktop') && (
            <button
              onClick={() => setShowIosModal(true)}
              className="w-full flex items-center justify-center space-x-2 bg-black text-white font-bold px-5 py-3.5 rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] border border-gray-700/50"
            >
              <Share className="w-5 h-5" />
              <span>Instalar no iPhone</span>
            </button>
          )}
        </div>
      </div>
      {showIosModal && <IosModal onClose={() => setShowIosModal(false)} />}
    </>
  );
}

// Componente do Modal extraído para reutilização
function IosModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900">Como instalar no iPhone (iOS)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 text-sm mb-6 text-center">A Apple exige que aplicativos fora da App Store sejam instalados diretamente pelo navegador Safari de forma manual.</p>
          
          <div className="space-y-6">
            <div className="flex bg-gray-50 p-4 rounded-2xl border border-gray-100 items-start">
              <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 shrink-0 shadow-sm border border-blue-200">1</div>
              <div>
                <p className="text-gray-800 font-medium">Abra no Safari</p>
                <p className="text-gray-500 text-sm mt-1">Certifique-se de não estar em redes sociais (como Instagram), abra o link oficial no Safari do seu iPhone.</p>
              </div>
            </div>

            <div className="flex bg-gray-50 p-4 rounded-2xl border border-gray-100 items-start">
              <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 shrink-0 shadow-sm border border-blue-200">2</div>
              <div className="w-full">
                <p className="text-gray-800 font-medium">Toque em Compartilhar</p>
                <p className="text-gray-500 text-sm mt-1">Clique no ícone central inferior da tela com um quadrado e uma seta para cima.</p>
                <div className="mt-3 flex justify-center bg-gray-100 p-3 rounded-xl border border-gray-200 border-dashed">
                  <Share className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="flex bg-gray-50 p-4 rounded-2xl border border-gray-100 items-start">
              <div className="bg-blue-100 text-blue-700 rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 shrink-0 shadow-sm border border-blue-200">3</div>
              <div className="w-full">
                <p className="text-gray-800 font-medium">Adicionar à Tela de Início</p>
                <p className="text-gray-500 text-sm mt-1">Role as opções para baixo e clique em "Adicionar à Tela de Início".</p>
                <div className="mt-3 flex justify-center bg-gray-100 p-3 rounded-xl border border-gray-200 border-dashed">
                  <PlusSquare className="w-6 h-6 text-gray-800" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button onClick={onClose} className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20 active:scale-[0.98]">
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
