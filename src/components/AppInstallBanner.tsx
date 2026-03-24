import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export function AppInstallBanner() {
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

  return (
    <>
      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg rounded-2xl p-4 md:p-6 my-6 flex flex-col md:flex-row items-center justify-between border border-blue-500/30">
        <div className="flex items-center space-x-4 mb-4 md:mb-0 text-center md:text-left">
          <div className="bg-white/20 p-3 rounded-full hidden sm:block">
            <Download className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-100">Instale o App PriceU$</h3>
            <p className="text-blue-100 text-sm mt-1 max-w-md">Tenha orçamentos, contratos e leads na palma da sua mão com nosso aplicativo nativo e rápido.</p>
          </div>
        </div>

        <div className="flex space-x-3 w-full md:w-auto">
          {(device === 'android' || device === 'desktop') && (
            <a
              href="/priceus-android.apk"
              download
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all shadow-md active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Baixar para Android</span>
            </a>
          )}
          
          {(device === 'ios' || device === 'desktop') && (
            <button
              onClick={() => setShowIosModal(true)}
              className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-black text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95 border border-gray-700"
            >
              <Share className="w-5 h-5" />
              <span>Instalar no iPhone</span>
            </button>
          )}
        </div>
      </div>

      {/* iOS Install Modal */}
      {showIosModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">Como instalar no iPhone (iOS)</h3>
              <button onClick={() => setShowIosModal(false)} className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-200 transition-colors">
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
                <button onClick={() => setShowIosModal(false)} className="w-full bg-gray-900 text-white font-semibold py-3.5 rounded-xl hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20 active:scale-[0.98]">
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
