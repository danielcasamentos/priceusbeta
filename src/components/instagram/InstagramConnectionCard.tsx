import React, { useState, useEffect } from 'react';
import {
  Instagram,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sliders,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { InstagramConnectionModal } from './InstagramConnectionModal';
import {
  fetchConnectedInstagramAccounts,
  InstagramAccountInfo,
} from '../../services/instagramPublishService';

interface InstagramConnectionCardProps {
  className?: string;
}

export function InstagramConnectionCard({ className = '' }: InstagramConnectionCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [account, setAccount] = useState<InstagramAccountInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('priceus_instagram_token') || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
      if (token) {
        const accounts = await fetchConnectedInstagramAccounts(token);
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      }
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <>
      <div
        className={`p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 text-white ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                <span>Instagram Graph API</span>
                {account && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                    CONECTADO
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400">
                {account
                  ? `Vinculado à conta @${account.username}`
                  : 'Conecte sua conta para postar Feed, Carrosséis e Stories com 1 clique'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-lg flex items-center gap-1.5 ${
              account
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-90 text-white'
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>{account ? 'Gerenciar Conexão' : 'Conectar Instagram'}</span>
          </button>
        </div>

        {account && (
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Publicações automáticas ativadas para <b>@{account.username}</b></span>
            </span>

            <span className="text-[11px] text-slate-500 font-mono">ID: {account.id}</span>
          </div>
        )}
      </div>

      <InstagramConnectionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          loadStatus();
        }}
        onConnected={(acc) => setAccount(acc)}
      />
    </>
  );
}
