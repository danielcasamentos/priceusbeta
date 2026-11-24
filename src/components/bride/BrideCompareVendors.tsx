import React, { useState } from 'react';
import {
  Scale,
  Check,
  X,
  Star,
  Sparkles,
  ShieldCheck,
  FileCheck,
  MessageSquare,
  ArrowRight,
  TrendingDown,
  Award
} from 'lucide-react';
import { VendorMarketplaceCard, BrideProfile } from '../../services/brideMarketplaceService';

interface BrideCompareVendorsProps {
  vendors: VendorMarketplaceCard[];
  brideProfile: BrideProfile;
  onOpenVendorTab: (vendor: VendorMarketplaceCard) => void;
  onOpenContractModal: (vendor: VendorMarketplaceCard, total: number) => void;
}

export function BrideCompareVendors({
  vendors,
  brideProfile,
  onOpenVendorTab,
  onOpenContractModal,
}: BrideCompareVendorsProps) {
  // Inicialmente seleciona até 3 fornecedores para comparar (prioriza os mais bem avaliados ou abertos)
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(() => {
    return vendors.slice(0, 3).map((v) => v.user_id);
  });

  const comparedVendors = vendors.filter((v) => selectedVendorIds.includes(v.user_id));

  const toggleVendorSelection = (vendorId: string) => {
    if (selectedVendorIds.includes(vendorId)) {
      if (selectedVendorIds.length <= 1) {
        alert('Selecione pelo menos um fornecedor para comparar.');
        return;
      }
      setSelectedVendorIds(selectedVendorIds.filter((id) => id !== vendorId));
    } else {
      if (selectedVendorIds.length >= 4) {
        alert('Você pode comparar no máximo 4 fornecedores lado a lado.');
        return;
      }
      setSelectedVendorIds([...selectedVendorIds, vendorId]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header da Mesa de Decisão */}
      <div className="rounded-3xl bg-white border border-stone-200/90 p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            <Scale size={13} />
            Mesa de Decisão dos Noivos
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Compare propostas e escolha sem medo de errar
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 leading-relaxed font-normal">
            Visualize entregas, horas de cobertura, ensaios, álbuns e investimentos lado a lado para tomar a melhor decisão para o seu grande dia.
          </p>
        </div>

        {/* Seletor rápido de quem está sendo comparado */}
        <div className="flex flex-wrap gap-2">
          {vendors.map((v) => {
            const isSelected = selectedVendorIds.includes(v.user_id);
            return (
              <button
                key={v.user_id}
                type="button"
                onClick={() => toggleVendorSelection(v.user_id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {v.business_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabela Comparativa Visual Clean */}
      <div className="bg-white border border-stone-200/90 rounded-3xl shadow-xl shadow-stone-200/40 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-stone-200/80 bg-stone-50/70">
                <th className="p-5 text-xs font-bold text-stone-400 uppercase tracking-wider w-1/4">
                  Critérios de Decisão
                </th>
                {comparedVendors.map((vendor, idx) => (
                  <th key={vendor.user_id} className="p-5 w-1/4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center text-white font-serif font-bold text-xs shadow-xs">
                          {vendor.business_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 leading-tight">{vendor.business_name}</p>
                          <p className="text-[10px] text-stone-400 capitalize">{vendor.category}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star size={11} className="fill-amber-400" /> {vendor.rating.toFixed(1)}
                        </span>
                        <span className="text-[10px] text-stone-400">({vendor.total_reviews} avaliações)</span>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-100 text-xs text-slate-700">
              {/* Linha: Investimento Base */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Investimento Principal
                </td>
                {comparedVendors.map((vendor) => (
                  <td key={vendor.user_id} className="p-5">
                    <span className="text-base font-black text-slate-900">
                      R$ {vendor.starting_price.toLocaleString('pt-BR')}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-0.5">Pacote {vendor.templates[0]?.name || 'Padrão'}</p>
                  </td>
                ))}
              </tr>

              {/* Linha: Condições de Pagamento */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Condições de Pagamento
                </td>
                {comparedVendors.map((vendor) => (
                  <td key={vendor.user_id} className="p-5">
                    <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold">
                      30% entrada + 10x sem juros
                    </span>
                    <p className="text-[10px] text-stone-500 mt-1">7% desconto no PIX à vista</p>
                  </td>
                ))}
              </tr>

              {/* Linha: Horas de Cobertura */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Horas de Cobertura no Dia
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    <span className="font-semibold text-slate-800">
                      {idx === 0 ? 'Até o fim da festa (Sem limite)' : idx === 1 ? '10 horas de evento' : '8 horas de cobertura'}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-0.5">Cerimônia + Recepção completa</p>
                  </td>
                ))}
              </tr>

              {/* Linha: Ensaio Pré-Wedding */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Ensaio Pré-Wedding Externo
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    {idx === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <Check size={14} className="text-emerald-600" /> Já incluso de brinde
                      </span>
                    ) : (
                      <span className="text-stone-600">
                        Opcional (+ R$ 600)
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha: Álbum Físico Nobre */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Álbum Panorâmico Luxo
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    {idx === 1 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <Check size={14} className="text-emerald-600" /> 30x30 Linho Incluso
                      </span>
                    ) : (
                      <span className="text-stone-600">
                        Opcional (+ R$ 800)
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha: Drone / Tomadas Aéreas */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Cobertura Aérea com Drone
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    {vendor.tags.some((t) => t.toLowerCase().includes('drone')) ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                        <Check size={14} className="text-emerald-600" /> Operador 4K Homologado
                      </span>
                    ) : (
                      <span className="text-stone-400 flex items-center gap-1">
                        <X size={14} className="text-stone-300" /> Sob consulta
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha: Prazo de Entrega */}
              <tr className="hover:bg-stone-50/50 transition-colors">
                <td className="p-5 font-bold text-slate-800 bg-stone-50/30">
                  Prazo de Entrega Garantido
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    <span className="font-semibold text-slate-900">
                      {idx === 0 ? '30 dias corridos' : '45 dias com prévia em 48h'}
                    </span>
                    <p className="text-[10px] text-stone-400 mt-0.5">Com multa contratual por atraso</p>
                  </td>
                ))}
              </tr>

              {/* Linha: Análise da IA Concierge */}
              <tr className="bg-rose-50/30">
                <td className="p-5 font-bold text-rose-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-rose-600" />
                  Destaque da IA Concierge
                </td>
                {comparedVendors.map((vendor, idx) => (
                  <td key={vendor.user_id} className="p-5">
                    {idx === 0 ? (
                      <div className="p-2.5 rounded-xl bg-white border border-rose-200 text-rose-900 text-[11px] leading-relaxed shadow-2xs">
                        <span className="font-bold flex items-center gap-1 text-rose-700">
                          <Award size={12} /> Melhor Custo-Benefício
                        </span>
                        Entrega mais ágil e pré-wedding já bonificado.
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-white border border-stone-200 text-stone-700 text-[11px] leading-relaxed">
                        <span className="font-bold text-slate-800">
                          Estilo Mais Premiado
                        </span>
                        Nota máxima em avaliações de noivas reais.
                      </div>
                    )}
                  </td>
                ))}
              </tr>

              {/* Linha de Ações Finais */}
              <tr className="bg-white">
                <td className="p-5 font-bold text-stone-400 bg-stone-50/40">
                  Próximo Passo
                </td>
                {comparedVendors.map((vendor) => (
                  <td key={vendor.user_id} className="p-5">
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => onOpenContractModal(vendor, vendor.starting_price)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-slate-900/10 cursor-pointer transition-all"
                      >
                        <FileCheck size={13} />
                        <span>Contratar Este</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenVendorTab(vendor)}
                        className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 font-semibold text-xs flex items-center justify-center gap-1.5 border border-stone-200 cursor-pointer transition-all"
                      >
                        <MessageSquare size={13} />
                        <span>Abrir no Chat do Quotes</span>
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
