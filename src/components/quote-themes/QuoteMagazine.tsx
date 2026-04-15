import { Send, Lock, Camera } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';

interface QuoteMagazineProps {
  template: any;
  profile: any;
  produtos: any[];
  selectedProdutos: Record<string, number>;
  formData: any;
  calculateTotal: () => number;
  handleProdutoQuantityChange: (id: string, qty: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFormData: (data: any) => void;
  fieldsValidation: any;
  camposExtras: any[];
  camposExtrasData: Record<string, string>;
  setCamposExtrasData: (data: any) => void;
  renderLocationDateFields?: () => React.ReactNode;
}

export function QuoteMagazine(props: QuoteMagazineProps) {
  const { template, profile, produtos, selectedProdutos, formData, calculateTotal, handleSubmit, fieldsValidation, camposExtras, camposExtrasData } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-100 font-serif">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {profile && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border-4 border-amber-600">
            <div className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 h-24 flex items-center justify-center">
              <Camera className="w-12 h-12 text-white/20 absolute left-8" />
              <Camera className="w-12 h-12 text-white/20 absolute right-8" />
            </div>
            <div className="px-6 sm:px-8 pb-8 -mt-12 text-center">
              {profile.profile_image_url && (
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-amber-400 rounded-xl blur-lg opacity-50"></div>
                  <img
                    src={profile.profile_image_url}
                    alt={profile.nome_profissional}
                    className="relative w-24 h-24 rounded-xl border-4 border-white shadow-2xl object-cover"
                  />
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-black text-amber-900 mt-4 mb-2 tracking-tight uppercase">
                {profile.nome_profissional}
              </h1>
              {profile.tipo_fotografia && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-px w-12 bg-amber-600"></div>
                  <p className="text-amber-700 font-bold uppercase tracking-widest">{profile.tipo_fotografia}</p>
                  <div className="h-px w-12 bg-amber-600"></div>
                </div>
              )}
              {profile.apresentacao && (
                <div className="relative mb-4">
                  <div className="absolute top-0 left-0 text-4xl text-amber-200">"</div>
                  <p className="text-gray-700 leading-loose max-w-2xl mx-auto pt-6 px-4 italic">{profile.apresentacao}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-amber-600">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-black text-amber-900 mb-2 uppercase tracking-tight">
              {template.titulo_template || template.nome_template}
            </h2>
            <div className="h-1 w-24 bg-amber-600 mx-auto"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formData.nome_cliente}
                onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={formData.email_cliente}
                onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold"
                required
              />
              <input
                type="tel"
                placeholder="Telefone/WhatsApp *"
                value={formData.telefone_cliente}
                onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold"
                required
              />
            </div>

            {props.renderLocationDateFields && props.renderLocationDateFields()}

            {camposExtras.map((campo) => (
              <div key={campo.id}>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    placeholder={campo.placeholder}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold"
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent font-bold"
                  />
                )}
              </div>
            ))}

            <div className="border-t-2 border-amber-600 pt-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Serviços Disponíveis</h3>
                <div className="h-0.5 w-16 bg-amber-600 mx-auto mt-2"></div>
              </div>
              <div className="space-y-4">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      selectedProdutos[produto.id] ? 'border-amber-600 bg-amber-50' : 'border-amber-300 hover:border-amber-400'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens?.length > 0)) && (
                        <div className="w-20 h-20 shrink-0 overflow-hidden rounded-lg">
                          {produto.imagens && produto.imagens.length > 0 ? (
                            <ProductGalleryCarousel
                              images={[produto.imagem_url, ...produto.imagens].filter(Boolean)}
                              autoPlay={produto.carrossel_automatico}
                              productName={produto.nome}
                            />
                          ) : (
                            <ImageWithFallback
                              src={produto.imagem_url}
                              alt={produto.nome}
                              className="w-full h-full object-cover rounded-lg"
                              fallbackClassName="w-full h-full rounded-lg bg-amber-100"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-black text-lg text-amber-900 uppercase">{produto.nome}</h4>
                        {produto.resumo && <p className="text-sm text-amber-700 mt-1 italic">{produto.resumo}</p>}
                        {!template.ocultar_valores_intermediarios && (
                          <p className="text-xl font-black text-amber-700 mt-2">{formatCurrency(produto.valor)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                          disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          className="w-10 h-10 bg-amber-200 hover:bg-amber-300 rounded-lg font-black disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-black text-xl">{selectedProdutos[produto.id] || 0}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                              alert(fieldsValidation.validationMessage);
                              return;
                            }
                            props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1);
                          }}
                          disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                          className="w-10 h-10 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-black disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 rounded-xl p-6 text-center border-2 border-amber-600">
              <p className="text-sm text-amber-700 font-bold uppercase tracking-widest mb-2">Valor Total</p>
              <p className="text-4xl font-black text-amber-900">{formatCurrency(calculateTotal())}</p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-amber-700 to-orange-600 hover:from-amber-800 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-black text-lg tracking-wide shadow-lg hover:shadow-xl transition-all disabled:opacity-50 uppercase"
              disabled={!fieldsValidation.canUseWhatsApp}
            >
              {!fieldsValidation.canUseWhatsApp ? <Lock className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              Enviar Orçamento via WhatsApp
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
