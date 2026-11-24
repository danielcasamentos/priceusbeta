import React, { useState, useEffect } from 'react';
import {
  X, Users, Download, DollarSign, MessageCircle, Mail, Phone,
  Calendar, ShoppingBag, Search, Copy, Check, FileSpreadsheet, ArrowUpRight
} from 'lucide-react';
import { GalleryVisitor, GalleryOrder } from '../../types/gallery';
import { GalleryService } from '../../services/galleryService';

interface GalleryVisitorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  galleryTitle: string;
}

export function GalleryVisitorsModal({
  isOpen,
  onClose,
  galleryId,
  galleryTitle,
}: GalleryVisitorsModalProps) {
  const [loading, setLoading] = useState(true);
  const [visitors, setVisitors] = useState<GalleryVisitor[]>([]);
  const [orders, setOrders] = useState<GalleryOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'visitors' | 'orders'>('visitors');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedPhones, setCopiedPhones] = useState(false);

  useEffect(() => {
    if (isOpen && galleryId) {
      loadData();
    }
  }, [isOpen, galleryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vData, oData] = await Promise.all([
        GalleryService.getGalleryVisitors(galleryId),
        GalleryService.getGalleryOrders(galleryId),
      ]);
      setVisitors(vData);
      setOrders(oData);
    } catch (err) {
      console.error('Erro ao carregar dados de visitantes:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Cálculos de Métricas
  const totalDownloads = visitors.reduce((acc, v) => acc + (v.downloads_count || 0), 0);
  const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
  const leadsCount = visitors.filter((v) => v.email || v.whatsapp).length;

  // Filtragem
  const filteredVisitors = visitors.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.whatsapp && v.whatsapp.includes(q))
    );
  });

  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase();
    return (
      o.buyer_name.toLowerCase().includes(q) ||
      (o.buyer_email && o.buyer_email.toLowerCase().includes(q)) ||
      (o.buyer_whatsapp && o.buyer_whatsapp.includes(q))
    );
  });

  // Copiar todos os telefones de WhatsApp
  const handleCopyPhones = () => {
    const phones = visitors
      .map((v) => v.whatsapp)
      .filter((p): p is string => !!p && p.trim().length > 0)
      .join('\n');

    if (!phones) return;
    navigator.clipboard.writeText(phones);
    setCopiedPhones(true);
    setTimeout(() => setCopiedPhones(false), 3000);
  };

  // Exportar CSV
  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (activeTab === 'visitors') {
      csvContent += 'Nome,Email,WhatsApp,Fotos Baixadas,Data Acesso\n';
      visitors.forEach((v) => {
        const dateStr = new Date(v.accessed_at).toLocaleDateString('pt-BR');
        csvContent += `"${v.name}","${v.email || ''}","${v.whatsapp || ''}",${v.downloads_count || 0},"${dateStr}"\n`;
      });
    } else {
      csvContent += 'Comprador,Email,WhatsApp,Fotos Extras,Valor Total (R$),Forma Pagamento,Data\n';
      orders.forEach((o) => {
        const dateStr = new Date(o.created_at).toLocaleDateString('pt-BR');
        csvContent += `"${o.buyer_name}","${o.buyer_email || ''}","${o.buyer_whatsapp || ''}",${o.photo_count},${o.total_price},"${o.payment_method}","${dateStr}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_${activeTab}_${galleryTitle.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatWhatsappLink = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    const cleanNumber = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(`Olá! Vi que você acessou a galeria "${galleryTitle}". Tudo bem?`)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-white">Visitantes, Leads & Vendas</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Galeria: <span className="text-blue-400 font-semibold">{galleryTitle}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acessos Únicos</p>
              <p className="text-2xl font-bold text-white mt-1">{visitors.length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads Capturados</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{leadsCount}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fotos Baixadas</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{totalDownloads}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendas Extras (R$)</p>
              <p className="text-2xl font-bold text-purple-400 mt-1">
                R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Abas e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('visitors')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'visitors'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Visitantes ({visitors.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('orders')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  activeTab === 'orders'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Vendas Extras ({orders.length})</span>
              </button>
            </div>

            {/* Ações e Busca */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar contato..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {activeTab === 'visitors' && (
                <button
                  onClick={handleCopyPhones}
                  title="Copiar lista de telefones de WhatsApp"
                  className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-colors flex items-center space-x-1.5"
                >
                  {copiedPhones ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">Copiar WhatsApps</span>
                </button>
              )}

              <button
                onClick={handleExportCsv}
                title="Exportar dados em CSV"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Tabelas de Dados */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Carregando contatos...</div>
          ) : activeTab === 'visitors' ? (
            filteredVisitors.length === 0 ? (
              <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-950/50 text-slate-400 text-xs">
                Nenhum visitante registrado ainda nesta galeria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Visitante</th>
                      <th className="p-3.5">WhatsApp</th>
                      <th className="p-3.5">E-mail</th>
                      <th className="p-3.5 text-center">Fotos Baixadas</th>
                      <th className="p-3.5 text-right">Primeiro Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {filteredVisitors.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-500/30">
                            {v.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{v.name}</span>
                        </td>
                        <td className="p-3.5">
                          {v.whatsapp ? (
                            <a
                              href={formatWhatsappLink(v.whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-medium"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{v.whatsapp}</span>
                              <ArrowUpRight className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {v.email ? (
                            <span className="flex items-center space-x-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              <span>{v.email}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] ${
                            (v.downloads_count || 0) > 0
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {v.downloads_count || 0} foto(s)
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-400 text-[11px]">
                          {new Date(v.accessed_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            filteredOrders.length === 0 ? (
              <div className="p-12 text-center border border-slate-800 rounded-2xl bg-slate-950/50 text-slate-400 text-xs">
                Nenhuma venda de foto extra realizada até o momento nesta galeria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Comprador</th>
                      <th className="p-3.5">Contato</th>
                      <th className="p-3.5 text-center">Fotos Compradas</th>
                      <th className="p-3.5 text-right">Valor Total</th>
                      <th className="p-3.5 text-center">Pagamento</th>
                      <th className="p-3.5 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-bold text-white">{o.buyer_name}</td>
                        <td className="p-3.5 text-slate-300">
                          {o.buyer_whatsapp ? (
                            <a
                              href={formatWhatsappLink(o.buyer_whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-400 hover:underline flex items-center space-x-1"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>{o.buyer_whatsapp}</span>
                            </a>
                          ) : (
                            o.buyer_email || '-'
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-purple-400">
                          {o.photo_count} fotos extras
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">
                          R$ {Number(o.total_price).toFixed(2)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase text-[10px] font-bold">
                            {o.payment_method || 'PIX'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right text-slate-400 text-[11px]">
                          {new Date(o.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
