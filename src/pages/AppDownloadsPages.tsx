import { useState, useEffect } from 'react';
import { Download, Share, Smartphone, Monitor, Apple, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export function MobileAppDownloadPage() {
  const [device, setDevice] = useState<'android' | 'ios' | 'unknown'>('android');

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDevice('ios');
    } else {
      setDevice('android');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Smartphone className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">App Mobile PriceU$</h1>
          <p className="text-xs text-slate-400 mt-1">
            Tenha o controle total do seu estúdio, orçamentos, leads e WhatsApp no seu bolso.
          </p>
        </div>

        {/* Card Dinâmico de Download/Instalação */}
        {device === 'android' ? (
          <div className="p-5 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-4">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Android Identificado</span>
            </div>
            <a
              href="/priceus-android.apk"
              download
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo APK (Android)</span>
            </a>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/30 space-y-4 text-left">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
              <Apple className="w-4 h-4" />
              <span>iPhone (iOS) Identificado</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para instalar o app no iPhone sem precisar da App Store:
            </p>
            <ol className="text-xs text-slate-400 space-y-2 font-medium list-decimal pl-4">
              <li>Toque no botão <strong className="text-white">Compartilhar</strong> (ícone de quadrado com seta no Safari).</li>
              <li>Role para baixo e selecione <strong className="text-amber-300">"Adicionar à Tela de Início"</strong>.</li>
              <li>Abra o app direto pelo ícone do seu celular!</li>
            </ol>
          </div>
        )}

        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-bold transition"
        >
          <span>Ir para o Painel Web</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export function DesktopAppDownloadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl relative z-10">
        <div className="flex items-center justify-between border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg shadow-purple-600/20">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">PriceU$ Desktop Studio</h1>
              <p className="text-xs text-slate-400">Software Nativo de Alta Performance para macOS e Windows</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* macOS Apple Silicon */}
          <a
            href="/downloads/PriceUS_macOS_AppleSilicon.dmg"
            download="PriceUS_macOS_AppleSilicon.dmg"
            className="p-5 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <Apple className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold">.DMG</span>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">macOS Apple Silicon</h4>
              <p className="text-[10px] text-slate-400">Chips M1, M2, M3, M4</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-purple-400 pt-1">
              <Download className="w-4 h-4" />
              <span>Baixar M1-M4</span>
            </div>
          </a>

          {/* macOS Intel */}
          <a
            href="/downloads/PriceUS_macOS_Intel.dmg"
            download="PriceUS_macOS_Intel.dmg"
            className="p-5 rounded-2xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <Apple className="w-6 h-6 text-slate-300 group-hover:scale-110 transition-transform" />
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[9px] font-bold">.DMG</span>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">macOS Intel</h4>
              <p className="text-[10px] text-slate-400">Processadores Intel</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-purple-400 pt-1">
              <Download className="w-4 h-4" />
              <span>Baixar Intel</span>
            </div>
          </a>

          {/* Windows x64 */}
          <a
            href="/downloads/PriceUS_Windows_x64.exe"
            download="PriceUS_Windows_x64.exe"
            className="p-5 rounded-2xl bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 transition-all text-left group flex flex-col justify-between cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between">
              <Monitor className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[9px] font-bold">.EXE</span>
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">Windows 10 / 11</h4>
              <p className="text-[10px] text-slate-400">64-bit Exe</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-extrabold text-blue-400 pt-1">
              <Download className="w-4 h-4" />
              <span>Baixar Windows</span>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
