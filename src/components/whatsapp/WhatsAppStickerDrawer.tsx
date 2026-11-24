import React, { useState } from 'react';
import { Smile, Image as ImageIcon, Sparkles, Heart, Search, X } from 'lucide-react';

interface WhatsAppStickerDrawerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerUrl: string, caption?: string) => void;
  onClose: () => void;
}

const EMOJI_CATEGORIES = {
  'Frequentes & Estúdio': ['📸', '💍', '✨', '🗓️', '👰', '🤵', '🥂', '🎉', '❤️', '😊', '👍', '🙏', '📩', '💼', '💳', '⭐'],
  'Rostos & Emoções': ['😀', '😃', '😄', '😁', '😆', '🥹', '😅', '😂', '🤣', '🥲', '😍', '🥰', '😘', '🤩', '🥳', '😎'],
  'Gestos & Mãos': ['👍', '👎', '👏', '🙌', '🫶', '🤝', '✌️', '🤞', '🤙', '👋', '🙏', '💪', '👈', '👉', '👇', '👆'],
  'Casamento & Festas': ['💍', '👰', '🤵', '💐', '🎂', '🍾', '🥂', '🎉', '🎊', '🎈', '🎁', '💌', '👑', '💒', '💃', '🕺'],
};

// Studio high-converting photography stickers
const STUDIO_STICKERS = [
  {
    id: 'st_1',
    title: 'Data Reservada',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=200&q=80',
    caption: '🌟 DATA GARANTIDA NA NOSSA AGENDA! 🌟',
  },
  {
    id: 'st_2',
    title: 'Contrato Fechado',
    url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=200&q=80',
    caption: '🎉 CONTRATO ASSINADO COM SUCESSO! 🎉',
  },
  {
    id: 'st_3',
    title: 'Ansioso pelo Ensaio',
    url: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=200&q=80',
    caption: '📸 ANSIOSO DEMAIS PARA O NOSSO ENSAIO! ✨',
  },
  {
    id: 'st_4',
    title: 'Parabéns ao Casal',
    url: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=200&q=80',
    caption: '💍 PARABÉNS AO CASAL MAIS LINDO! ❤️',
  },
  {
    id: 'st_5',
    title: 'Galeria Pronta',
    url: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=200&q=80',
    caption: '✨ AS SUAS FOTOS FICARAM PRONTAS! 💌',
  },
  {
    id: 'st_6',
    title: 'Obrigado pela Confiança',
    url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=200&q=80',
    caption: '🙏 MUITO OBRIGADO PELA CONFIANÇA! 🥂',
  },
];

export function WhatsAppStickerDrawer({
  onSelectEmoji,
  onSelectSticker,
  onClose,
}: WhatsAppStickerDrawerProps) {
  const [activeTab, setActiveTab] = useState<'emojis' | 'stickers' | 'whatsapp_account'>('emojis');
  const [search, setSearch] = useState('');

  return (
    <div
      className="w-full h-72 rounded-t-2xl shadow-2xl flex flex-col border-t"
      style={{
        background: '#202c33',
        borderColor: '#2a3942',
      }}
    >
      {/* Header Tabs */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: '#2a3942' }}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('emojis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'emojis'
                ? 'bg-[#00a884] text-[#111b21]'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
            }`}
          >
            <Smile className="w-3.5 h-3.5" />
            <span>Emojis</span>
          </button>

          <button
            onClick={() => setActiveTab('stickers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'stickers'
                ? 'bg-[#00a884] text-[#111b21]'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Figurinhas Estúdio</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp_account')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeTab === 'whatsapp_account'
                ? 'bg-[#00a884] text-[#111b21]'
                : 'text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Da sua Conta</span>
            <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded">Sinc</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 py-1.5 border-b" style={{ borderColor: '#2a3942' }}>
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111b21]">
          <Search className="w-3.5 h-3.5 text-[#8696a0]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === 'emojis'
                ? 'Buscar emoji...'
                : 'Buscar figurinha pelo nome...'
            }
            className="w-full bg-transparent text-xs text-[#e9edef] outline-none"
          />
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeTab === 'emojis' && (
          <div className="space-y-3">
            {Object.entries(EMOJI_CATEGORIES).map(([cat, emojis]) => (
              <div key={cat} className="space-y-1">
                <h4 className="text-[11px] font-bold text-[#8696a0] px-1">{cat}</h4>
                <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1">
                  {emojis
                    .filter((e) => !search || e.includes(search))
                    .map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-[#2a3942] active:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'stickers' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {STUDIO_STICKERS.filter((st) =>
              !search || st.title.toLowerCase().includes(search.toLowerCase())
            ).map((st) => (
              <button
                key={st.id}
                onClick={() => onSelectSticker(st.url, st.caption)}
                className="group relative rounded-xl overflow-hidden border border-[#2a3942] hover:border-[#00a884] transition bg-[#111b21] p-1 text-left flex flex-col"
              >
                <div className="w-full h-20 rounded-lg overflow-hidden relative">
                  <img
                    src={st.url}
                    alt={st.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-bold text-white leading-tight truncate">
                      {st.title}
                    </span>
                  </div>
                </div>
                <span className="text-[9px] text-[#8696a0] truncate mt-1 px-1">
                  {st.caption}
                </span>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'whatsapp_account' && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-[#111b21] border border-[#2a3942] flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-[#e9edef] flex items-center gap-1.5">
                  <span>📱 Figurinhas da sua conta WhatsApp</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </p>
                <p className="text-[10px] text-[#8696a0]">
                  Sincronizadas automaticamente a partir das conversas do seu celular
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {STUDIO_STICKERS.map((st, i) => (
                <button
                  key={i}
                  onClick={() => onSelectSticker(st.url, st.caption)}
                  className="group aspect-square rounded-xl bg-[#111b21] border border-[#2a3942] hover:border-[#00a884] p-1.5 flex items-center justify-center transition"
                >
                  <img
                    src={st.url}
                    alt="Sticker WhatsApp"
                    className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
