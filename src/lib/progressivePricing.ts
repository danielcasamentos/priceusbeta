export interface FaixaPrecoProduto {
  id: string;
  label: string; // Ex: "10 fotos", "20 fotos", "30 fotos"
  valor_semana: number; // Ex: 200 (Terça a Quinta / Dias úteis)
  valor_fds_feriado?: number | null; // Ex: 300 (Sábado, Domingo ou Feriado)
  desconto_percentual?: number; // Opcional: desconto % caso use modo percentual
}

/**
 * Escalão de preço/desconto progressivo quando o cliente clica no "+" (aumenta a quantidade do produto: 2x, 3x, 4x... até quantidade_maxima).
 * Exemplo Making Of (1h = R$ 200):
 * - quantidade: 2 -> tipo_ajuste: 'valor_total', valor: 300 (2h custa R$ 300 em vez de R$ 400)
 * - quantidade: 3 -> tipo_ajuste: 'valor_total', valor: 400 (3h custa R$ 400 em vez de R$ 600)
 */
export interface EscalaoQuantidadeProduto {
  quantidade: number; // >= 2 (ex: 2, 3, 4...)
  tipo_ajuste: 'valor_total' | 'desconto_percentual' | 'desconto_fixo';
  valor: number; // R$ total (se valor_total), % (se desconto_percentual) ou R$ abatido (se desconto_fixo)
  label?: string; // Rótulo opcional (ex: "2 horas", "20 fotos")
}

/**
 * Regra totalmente configurável de preço por Data / Dias da Semana / Feriados dentro do Produto.
 * Permite configurar livremente qualquer combinação de dias (ex: Terça a Quinta vs Sábado, Domingo e Feriados)
 * ou períodos específicos (data_inicio a data_fim), com integração direta aos feriados da Agenda.
 */
export interface RegraPrecoDataProduto {
  id: string;
  nome: string; // Ex: "Terça a Quinta", "Sábado, Domingo e Feriados", "Alta Temporada Dezembro"
  dias_semana: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  incluir_feriados: boolean; // Aplica também em feriados nacionais e feriados da Agenda
  somente_feriados?: boolean;
  data_inicio?: string | null; // Opcional YYYY-MM-DD
  data_fim?: string | null; // Opcional YYYY-MM-DD
  tipo_valor_base:
  | 'valor_fixo'
  | 'acrescimo_percentual'
  | 'desconto_percentual'
  | 'acrescimo_fixo'
  | 'desconto_fixo';
  valor_base: number; // Ex: 300 (se valor_fixo para 1 un) ou 20 (se +20%)
  /** Escalões progressivos específicos para esta regra de data (ex: Sáb/Dom/Feriado: 2x = R$ 450, 3x = R$ 550) */
  escaloes_quantidade?: EscalaoQuantidadeProduto[];
}

export interface RegraDescontoGrupo {
  id: string;
  grupo: string; // Nome do grupo (ex: "Ensaios") ou "*" para qualquer produto
  min_itens: number; // Ex: 2, 3, 4...
  tipo_desconto: 'percentual' | 'valor_fixo'; // % ou R$
  valor: number; // Ex: 10 (%) ou 150 (R$)
}

export interface RegraDiaSemana {
  id: string;
  nome: string; // Ex: "Promoção Terça a Quinta" ou "Tabela Fim de Semana e Feriados"
  dias_semana: number[]; // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  incluir_feriados: boolean;
  somente_feriados?: boolean;
  tipo_ajuste: 'desconto_percentual' | 'desconto_fixo' | 'acrescimo_percentual' | 'acrescimo_fixo';
  valor: number;
}

export interface ConfigPrecoProdutoFds {
  /** Valor de 1 unidade do produto nos dias de Fim de Semana / Feriado configurados no template */
  valor_fds?: number | null;
  /** Escalões opcionais no botão "+" (2x, 3x...) específicos para Fim de Semana / Feriado */
  escaloes_fds?: EscalaoQuantidadeProduto[];
}

export interface ConfigDescontoProgressivoTemplate {
  ativo: boolean;
  /** Período opcional de vigência da regra (se vazio, vale para qualquer data escolhida pelo cliente, ex: 2027) */
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  dias_fds_personalizados?: number[]; // Padrão: [0, 6] (Domingo e Sábado)
  incluir_feriados_no_fds?: boolean; // Padrão: true
  /** Tabela direta de preços de Fim de Semana / Feriado por produto (configurada na aba "Preços" do template) */
  precos_produtos_fds?: Record<string, ConfigPrecoProdutoFds>;
  regras_grupos: RegraDescontoGrupo[];
  regras_dias_semana?: RegraDiaSemana[];
}

/**
 * Calcula a data da Páscoa (Algoritmo de Meeus/Jones/Butcher) para detectar
 * Carnaval, Sexta-feira Santa e Corpus Christi automaticamente em qualquer ano.
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

function addDays(date: Date, days: number): string {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Verifica se uma data YYYY-MM-DD é feriado nacional brasileiro (fixo ou móvel)
 * ou está na lista de feriados customizados (da Agenda do fotógrafo ou do Template).
 */
export function isBrazilianHoliday(dateStr?: string, customHolidays?: string[]): { isHoliday: boolean; name?: string } {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isHoliday: false };
  }

  if (customHolidays && customHolidays.length > 0) {
    // Suporta tanto "YYYY-MM-DD" quanto "YYYY-MM-DD|Nome do Feriado"
    for (const item of customHolidays) {
      if (!item) continue;
      const [dPart, namePart] = item.split('|');
      if (dPart.trim() === dateStr) {
        return { isHoliday: true, name: namePart?.trim() || 'Feriado (Agenda)' };
      }
    }
  }

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const mmdd = `${monthStr}-${dayStr}`;

  const fixedHolidays: Record<string, string> = {
    '01-01': 'Confraternização Universal',
    '04-21': 'Tiradentes',
    '05-01': 'Dia do Trabalho',
    '09-07': 'Independência do Brasil',
    '10-12': 'Nossa Sra. Aparecida',
    '11-02': 'Finados',
    '11-15': 'Proclamação da República',
    '11-20': 'Dia da Consciência Negra',
    '12-25': 'Natal',
  };

  if (fixedHolidays[mmdd]) {
    return { isHoliday: true, name: fixedHolidays[mmdd] };
  }

  const easter = getEasterDate(year);
  const carnivalMon = addDays(easter, -48);
  const carnivalTue = addDays(easter, -47);
  const goodFriday = addDays(easter, -2);
  const easterSun = addDays(easter, 0);
  const corpusChristi = addDays(easter, 60);

  if (dateStr === carnivalMon || dateStr === carnivalTue) return { isHoliday: true, name: 'Carnaval' };
  if (dateStr === goodFriday) return { isHoliday: true, name: 'Sexta-feira Santa' };
  if (dateStr === easterSun) return { isHoliday: true, name: 'Páscoa' };
  if (dateStr === corpusChristi) return { isHoliday: true, name: 'Corpus Christi' };

  return { isHoliday: false };
}

/**
 * Verifica se a data escolhida cai em Fim de Semana (padrão Sáb/Dom ou configurado) ou Feriado.
 */
export function isWeekendOrHolidayDate(
  dateStr?: string,
  diasFds: number[] = [0, 6],
  incluirFeriados: boolean = true,
  customHolidays?: string[]
): { isSpecialPeriod: boolean; reason?: string; dayOfWeek?: number } {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { isSpecialPeriod: false };
  }

  const dateObj = new Date(`${dateStr}T12:00:00`);
  if (isNaN(dateObj.getTime())) return { isSpecialPeriod: false };

  const dayOfWeek = dateObj.getDay(); // 0 = Dom, 6 = Sáb

  if (incluirFeriados) {
    const holidayCheck = isBrazilianHoliday(dateStr, customHolidays);
    if (holidayCheck.isHoliday) {
      return {
        isSpecialPeriod: true,
        reason: holidayCheck.name ? `Feriado (${holidayCheck.name})` : 'Feriado',
        dayOfWeek,
      };
    }
  }

  if (diasFds.includes(dayOfWeek)) {
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return {
      isSpecialPeriod: true,
      reason: dayNames[dayOfWeek],
      dayOfWeek,
    };
  }

  return { isSpecialPeriod: false, dayOfWeek };
}

/**
 * Avalia qual regra de data personalizada do produto (`regras_preco_data`) se aplica à `eventDate`.
 * Ordem de prioridade (sem conflito):
 * 1. Regra com período específico (`data_inicio` <= eventDate <= `data_fim`) + dia da semana/feriado compatível
 * 2. Regra de Feriado (quando a data é feriado nacional ou da Agenda e `incluir_feriados` / `somente_feriados` está ativo)
 * 3. Regra de Dia da Semana (`dias_semana` contém o dia da semana da `eventDate`)
 */
export function matchProductDateRule(
  rules?: RegraPrecoDataProduto[] | null,
  eventDate?: string,
  customHolidays?: string[]
): { matchedRule?: RegraPrecoDataProduto; reasonLabel?: string; isHolidayMatch?: boolean } {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Array.isArray(rules) || rules.length === 0) {
    return {};
  }

  const dateObj = new Date(`${eventDate}T12:00:00`);
  if (isNaN(dateObj.getTime())) return {};

  const dow = dateObj.getDay();
  const holidayCheck = isBrazilianHoliday(eventDate, customHolidays);

  const isWithinRange = (r: RegraPrecoDataProduto) => {
    if (r.data_inicio && eventDate < r.data_inicio) return false;
    if (r.data_fim && eventDate > r.data_fim) return false;
    return true;
  };

  // 1. Prioridade máxima: Regras com intervalo de datas específico (data_inicio ou data_fim) que batam com a data
  for (const r of rules) {
    if ((r.data_inicio || r.data_fim) && isWithinRange(r)) {
      const hasDaysFilter = Array.isArray(r.dias_semana) && r.dias_semana.length > 0;
      const matchesHoliday = r.incluir_feriados && holidayCheck.isHoliday;
      const matchesDow = !r.somente_feriados && (!hasDaysFilter || r.dias_semana.includes(dow));
      if (matchesHoliday || matchesDow) {
        return {
          matchedRule: r,
          reasonLabel: r.nome || 'Período Especial',
          isHolidayMatch: matchesHoliday,
        };
      }
    }
  }

  // 2. Segunda prioridade: Se a data escolhida é Feriado (Nacional ou da Agenda) e a regra inclui feriados
  if (holidayCheck.isHoliday) {
    for (const r of rules) {
      if (r.data_inicio || r.data_fim) continue;
      if (r.incluir_feriados || r.somente_feriados) {
        return {
          matchedRule: r,
          reasonLabel: r.nome ? `${r.nome} (${holidayCheck.name || 'Feriado'})` : `Feriado (${holidayCheck.name || 'Agenda'})`,
          isHolidayMatch: true,
        };
      }
    }
  }

  // 3. Terceira prioridade: Regra por Dia da Semana (ex: Terça a Quinta vs Sábado e Domingo)
  for (const r of rules) {
    if (r.data_inicio || r.data_fim) continue;
    if (r.somente_feriados) continue;
    if (Array.isArray(r.dias_semana) && r.dias_semana.includes(dow)) {
      return {
        matchedRule: r,
        reasonLabel: r.nome || 'Tabela por Dia',
        isHolidayMatch: false,
      };
    }
  }

  return {};
}

/**
 * Verifica se a data escolhida pelo cliente está dentro do período de vigência opcional da campanha/regra no template.
 * Se vigencia_inicio e vigencia_fim estiverem vazios, retorna true para qualquer data escolhida (ex: 15/01/2027).
 */
export function isDateWithinTemplateVigencia(
  eventDate?: string,
  config?: ConfigDescontoProgressivoTemplate | null
): boolean {
  if (!eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return false;
  if (!config) return true;
  if (config.vigencia_inicio && eventDate < config.vigencia_inicio) return false;
  if (config.vigencia_fim && eventDate > config.vigencia_fim) return false;
  return true;
}

/**
 * Resolve o preço de uma faixa legada (ex: "10 fotos", "20 fotos", "30 fotos") de acordo com a data do evento.
 */
export function resolveTierPrice(
  tier: FaixaPrecoProduto,
  eventDate?: string,
  config?: ConfigDescontoProgressivoTemplate | null,
  customHolidays?: string[]
): { price: number; isWeekendOrHoliday: boolean; periodLabel?: string } {
  const isSystemActive = config ? Boolean(config.ativo) : true;
  const withinVigencia = isDateWithinTemplateVigencia(eventDate, config);
  const diasFds = config?.dias_fds_personalizados ?? [0, 6];
  const incluirFeriados = config?.incluir_feriados_no_fds ?? true;
  const check =
    isSystemActive && withinVigencia
      ? isWeekendOrHolidayDate(eventDate, diasFds, incluirFeriados, customHolidays)
      : { isSpecialPeriod: false };

  let base = Number(tier.valor_semana) || 0;
  if (
    check.isSpecialPeriod &&
    tier.valor_fds_feriado !== undefined &&
    tier.valor_fds_feriado !== null &&
    Number(tier.valor_fds_feriado) > 0
  ) {
    base = Number(tier.valor_fds_feriado);
  }

  if (tier.desconto_percentual && tier.desconto_percentual > 0) {
    base = base * (1 - tier.desconto_percentual / 100);
  }

  return {
    price: base,
    isWeekendOrHoliday: check.isSpecialPeriod,
    periodLabel: check.reason,
  };
}

/**
 * Calcula o valor de `quantity` unidades de um produto considerando:
 * 1) Tabela de Dias da Semana vs. Fim de Semana/Feriado configurada na aba "Preços" do Template (`config.precos_produtos_fds`)
 *    ou regras de data do produto (`regras_preco_data`), aplicadas AUTOMATICAMENTE quando o cliente escolhe a data no orçamento
 *    (e somente quando o sistema estiver ATIVO na aba "Preços" do template!).
 * 2) Escalões de desconto progressivo por quantidade no botão "+" (`escaloes_quantidade`, ex: 1h = 200, 2h = 300, 3h = 400)
 * 3) Desconto percentual individual do produto (`desconto_percentual`)
 * 4) Faixas legadas (`faixas_preco`) se presentes
 */
export function resolveProductQuantityPricing(
  product: {
    id?: string;
    valor: number;
    desconto_percentual?: number;
    quantidade_maxima?: number | null;
    faixas_preco?: FaixaPrecoProduto[] | null;
    escaloes_quantidade?: EscalaoQuantidadeProduto[] | null;
    regras_preco_data?: RegraPrecoDataProduto[] | null;
  },
  quantity: number = 1,
  selectedTierId?: string,
  eventDate?: string,
  config?: ConfigDescontoProgressivoTemplate | null,
  customHolidays?: string[]
): {
  /** Preço base de 1 unidade (já considerando a data escolhida e desconto % base do produto) */
  baseUnitPrice: number;
  /** Preço original de 1 unidade sem desconto */
  originalBaseUnitPrice: number;
  /** Preço unitário efetivo na quantidade atual (totalPrice / quantity) */
  effectiveUnitPrice: number;
  /** Valor total para a quantidade selecionada (já com desconto progressivo de quantidade aplicado) */
  totalPrice: number;
  /** Valor total que custaria sem desconto progressivo (baseUnitPrice * quantity) */
  normalTotalForQuantity: number;
  normalTotal: number;
  /** Economia obtida no clique do "+" (normalTotalForQuantity - totalPrice) */
  progressiveQuantitySavings: number;
  progressiveSavings: number;
  /** Escalão de quantidade atingido (se quantity >= 2 e houver escalão) */
  matchedQuantityTier?: EscalaoQuantidadeProduto;
  /** Dica do próximo escalão ao clicar no "+" (ex: "2x por R$ 300,00 (economize R$ 100,00)") */
  nextQuantityHint?: {
    nextQty: number;
    nextTotal: number;
    nextSavings: number;
    label: string;
  };
  /** Todos os escalões resolvidos para a data atual (para exibir pílulas de referência no card) */
  resolvedSteps: Array<{
    quantidade: number;
    total: number;
    totalPrice: number;
    normalTotal: number;
    savings: number;
    label?: string;
  }>;
  /** Regra de data ativa no produto (se houve match com `eventDate`) */
  activeDateRule?: RegraPrecoDataProduto;
  periodLabel?: string;
  isWeekendOrHoliday: boolean;
  hasCustomDateRuleApplied: boolean;
} {
  const safeQty = Math.max(1, quantity || 1);
  const prodDiscount = product.desconto_percentual ?? 0;

  // Verifica se o sistema de preços por dia da semana/feriado está ATIVO na aba "Preços" do template
  const isDateSystemActive = config ? Boolean(config.ativo) : true;
  const withinVigencia = isDateWithinTemplateVigencia(eventDate, config);
  const canApplyDatePricing = Boolean(eventDate && isDateSystemActive && withinVigencia);

  const diasFds = config?.dias_fds_personalizados ?? [0, 6];
  const incluirFeriados = config?.incluir_feriados_no_fds ?? true;
  const fdsCheck = canApplyDatePricing
    ? isWeekendOrHolidayDate(eventDate, diasFds, incluirFeriados, customHolidays)
    : { isSpecialPeriod: false };

  // 1. Verificar primeiro se na aba "Preços" do template há preço de Fim de Semana / Feriado para este produto
  const prodFdsConfig =
    canApplyDatePricing && product.id && config?.precos_produtos_fds
      ? config.precos_produtos_fds[product.id]
      : undefined;

  const dateMatch = canApplyDatePricing
    ? matchProductDateRule(product.regras_preco_data, eventDate, customHolidays)
    : {};

  let baseUnitRaw = Number(product.valor) || 0;
  let hasCustomDateRuleApplied = false;
  let periodLabel: string | undefined = undefined;
  let isWeekendOrHoliday = false;
  let effectiveDateRule: RegraPrecoDataProduto | undefined = dateMatch.matchedRule;

  if (
    prodFdsConfig &&
    prodFdsConfig.valor_fds !== undefined &&
    prodFdsConfig.valor_fds !== null &&
    Number(prodFdsConfig.valor_fds) > 0
  ) {
    // Produto configurado na tabela da aba "Preços" do template (Dia de Semana vs Fim de Semana/Feriado)
    hasCustomDateRuleApplied = true;
    if (fdsCheck.isSpecialPeriod) {
      baseUnitRaw = Number(prodFdsConfig.valor_fds);
      isWeekendOrHoliday = true;
      periodLabel = fdsCheck.reason || 'Fim de Semana / Feriado';
      effectiveDateRule = {
        id: `tpl-fds-${product.id}`,
        nome: periodLabel,
        dias_semana: diasFds,
        incluir_feriados: incluirFeriados,
        tipo_valor_base: 'valor_fixo',
        valor_base: baseUnitRaw,
        escaloes_quantidade: prodFdsConfig.escaloes_fds,
      };
    } else {
      isWeekendOrHoliday = false;
      periodLabel = 'Dias de Semana';
    }
  } else if (dateMatch.matchedRule) {
    hasCustomDateRuleApplied = true;
    periodLabel = dateMatch.reasonLabel;
    isWeekendOrHoliday = Boolean(dateMatch.isHolidayMatch);
    const r = dateMatch.matchedRule;
    if (r.tipo_valor_base === 'valor_fixo') {
      baseUnitRaw = Number(r.valor_base) || 0;
    } else if (r.tipo_valor_base === 'acrescimo_percentual') {
      baseUnitRaw = baseUnitRaw * (1 + (Number(r.valor_base) || 0) / 100);
    } else if (r.tipo_valor_base === 'desconto_percentual') {
      baseUnitRaw = baseUnitRaw * (1 - Math.min(100, Math.max(0, Number(r.valor_base) || 0)) / 100);
    } else if (r.tipo_valor_base === 'acrescimo_fixo') {
      baseUnitRaw = baseUnitRaw + (Number(r.valor_base) || 0);
    } else if (r.tipo_valor_base === 'desconto_fixo') {
      baseUnitRaw = Math.max(0, baseUnitRaw - (Number(r.valor_base) || 0));
    }
  } else if (Array.isArray(product.faixas_preco) && product.faixas_preco.length > 0) {
    // Fallback para faixas_preco legadas
    const tiers = product.faixas_preco;
    const chosenTier = (selectedTierId ? tiers.find((t) => t.id === selectedTierId) : undefined) || tiers[0];
    const resolved = resolveTierPrice(chosenTier, eventDate, config, customHolidays);
    baseUnitRaw = resolved.price;
    isWeekendOrHoliday = resolved.isWeekendOrHoliday;
    periodLabel = resolved.periodLabel;
    hasCustomDateRuleApplied = Boolean(canApplyDatePricing);
  }

  const originalBaseUnitPrice = baseUnitRaw;
  const baseUnitPrice = prodDiscount > 0 ? baseUnitRaw * (1 - prodDiscount / 100) : baseUnitRaw;

  // 2. Determinar quais escalões de quantidade (`escaloes_quantidade`) estão ativos
  let activeSteps: EscalaoQuantidadeProduto[] = [];
  let usingBaseStepsOnDateRule = false;

  if (
    effectiveDateRule &&
    Array.isArray(effectiveDateRule.escaloes_quantidade) &&
    effectiveDateRule.escaloes_quantidade.length > 0
  ) {
    activeSteps = effectiveDateRule.escaloes_quantidade;
  } else if (Array.isArray(product.escaloes_quantidade) && product.escaloes_quantidade.length > 0) {
    activeSteps = product.escaloes_quantidade;
    if (hasCustomDateRuleApplied && baseUnitRaw !== (Number(product.valor) || 0)) {
      usingBaseStepsOnDateRule = true;
    }
  }

  const sortedSteps = [...activeSteps]
    .filter((s) => s && Number(s.quantidade) >= 2 && Number(s.valor) >= 0)
    .sort((a, b) => a.quantidade - b.quantidade);

  // Função auxiliar para calcular o total de uma quantidade Q usando os escalões
  const computeTotalForQty = (q: number): { total: number; matched?: EscalaoQuantidadeProduto } => {
    const normalForQ = baseUnitPrice * q;
    if (q <= 1 || sortedSteps.length === 0) {
      return { total: normalForQ };
    }

    // Buscar o maior escalão cuja quantidade seja <= q
    let matched: EscalaoQuantidadeProduto | undefined;
    for (const s of sortedSteps) {
      if (q >= s.quantidade) {
        matched = s;
      }
    }

    if (!matched) {
      return { total: normalForQ };
    }

    let stepTotal = normalForQ;
    if (matched.tipo_ajuste === 'valor_total') {
      const baseProductVal = Number(product.valor) || baseUnitRaw;
      const diffPerUnit = usingBaseStepsOnDateRule ? Math.max(0, baseUnitRaw - baseProductVal) : 0;
      const configuredTotalForStep = Number(matched.valor) + diffPerUnit * matched.quantidade;
      const discountedTotalForStep =
        prodDiscount > 0 ? configuredTotalForStep * (1 - prodDiscount / 100) : configuredTotalForStep;

      if (q === matched.quantidade) {
        stepTotal = discountedTotalForStep;
      } else {
        const unitAtStep = discountedTotalForStep / matched.quantidade;
        stepTotal = unitAtStep * q;
      }
    } else if (matched.tipo_ajuste === 'desconto_percentual') {
      const pct = Math.min(100, Math.max(0, Number(matched.valor) || 0));
      stepTotal = normalForQ * (1 - pct / 100);
    } else if (matched.tipo_ajuste === 'desconto_fixo') {
      const fixedOff = Math.max(0, Number(matched.valor) || 0);
      stepTotal = Math.max(0, normalForQ - fixedOff);
    }

    return { total: Math.max(0, stepTotal), matched };
  };

  const normalTotalForQuantity = baseUnitPrice * safeQty;
  const { total: totalPrice, matched: matchedQuantityTier } = computeTotalForQty(safeQty);
  const progressiveQuantitySavings = Math.max(0, normalTotalForQuantity - totalPrice);
  const effectiveUnitPrice = safeQty > 0 ? totalPrice / safeQty : baseUnitPrice;

  // Resolver lista de todos os escalões para exibição clara ao cliente (ex: "1x R$ 200 | 2x R$ 300 | 3x R$ 400")
  const resolvedSteps = sortedSteps
    .filter((s) => !product.quantidade_maxima || s.quantidade <= product.quantidade_maxima)
    .map((s) => {
      const normalForS = baseUnitPrice * s.quantidade;
      const { total: totalForS } = computeTotalForQty(s.quantidade);
      return {
        quantidade: s.quantidade,
        total: totalForS,
        totalPrice: totalForS,
        normalTotal: normalForS,
        savings: Math.max(0, normalForS - totalForS),
        label: s.label,
      };
    });

  // Calcular dica para o próximo clique no "+"
  let nextQuantityHint:
    | {
      nextQty: number;
      nextTotal: number;
      nextSavings: number;
      label: string;
    }
    | undefined;

  const maxAllowed = product.quantidade_maxima || 99;
  const currentQtyForHint = quantity || 0;
  if (currentQtyForHint < maxAllowed && sortedSteps.length > 0) {
    const candidateQty = currentQtyForHint <= 0 ? sortedSteps[0].quantidade : currentQtyForHint + 1;
    if (candidateQty <= maxAllowed) {
      const nextStepObj = sortedSteps.find((s) => s.quantidade === candidateQty) || sortedSteps.find((s) => s.quantidade > currentQtyForHint);
      if (nextStepObj && (!product.quantidade_maxima || nextStepObj.quantidade <= product.quantidade_maxima)) {
        const targetQ = nextStepObj.quantidade;
        const normalNext = baseUnitPrice * targetQ;
        const { total: totalNext } = computeTotalForQty(targetQ);
        const savNext = Math.max(0, normalNext - totalNext);
        if (savNext > 0) {
          nextQuantityHint = {
            nextQty: targetQ,
            nextTotal: totalNext,
            nextSavings: savNext,
            label: nextStepObj.label || `${targetQ}x`,
          };
        }
      }
    }
  }

  return {
    baseUnitPrice,
    originalBaseUnitPrice,
    effectiveUnitPrice,
    totalPrice,
    normalTotalForQuantity,
    normalTotal: normalTotalForQuantity,
    progressiveQuantitySavings,
    progressiveSavings: progressiveQuantitySavings,
    matchedQuantityTier,
    nextQuantityHint,
    resolvedSteps,
    activeDateRule: effectiveDateRule,
    periodLabel,
    isWeekendOrHoliday,
    hasCustomDateRuleApplied,
  };
}

/**
 * Resolve o preço unitário efetivo de um produto (compatível com chamadas existentes e com quantidade).
 */
export function resolveProductEffectivePrice(
  product: {
    id?: string;
    valor: number;
    desconto_percentual?: number;
    quantidade_maxima?: number | null;
    faixas_preco?: FaixaPrecoProduto[] | null;
    escaloes_quantidade?: EscalaoQuantidadeProduto[] | null;
    regras_preco_data?: RegraPrecoDataProduto[] | null;
  },
  selectedTierId?: string,
  eventDate?: string,
  config?: ConfigDescontoProgressivoTemplate | null,
  customHolidays?: string[],
  quantity: number = 1
): {
  unitPrice: number;
  originalUnitPrice: number;
  totalPrice: number;
  normalTotalForQuantity: number;
  progressiveQuantitySavings: number;
  activeTier?: FaixaPrecoProduto;
  activeDateRule?: RegraPrecoDataProduto;
  isWeekendOrHoliday: boolean;
  periodLabel?: string;
} {
  const res = resolveProductQuantityPricing(
    product,
    quantity,
    selectedTierId,
    eventDate,
    config,
    customHolidays
  );

  const tiers = Array.isArray(product.faixas_preco) ? product.faixas_preco : [];
  const chosenTier =
    tiers.length > 0
      ? (selectedTierId ? tiers.find((t) => t.id === selectedTierId) : undefined) || tiers[0]
      : undefined;

  return {
    unitPrice: res.effectiveUnitPrice,
    originalUnitPrice: res.originalBaseUnitPrice,
    totalPrice: res.totalPrice,
    normalTotalForQuantity: res.normalTotalForQuantity,
    progressiveQuantitySavings: res.progressiveQuantitySavings,
    activeTier: chosenTier,
    activeDateRule: res.activeDateRule,
    isWeekendOrHoliday: res.isWeekendOrHoliday,
    periodLabel: res.periodLabel,
  };
}

export interface ProgressiveDiscountSummary {
  /** Desconto total (em R$) ganho por comprar múltiplos itens/quantidades (soma de desconto no "+" do produto + grupos) */
  groupDiscountTotal: number;
  /** Economia exclusiva dos escalões de quantidade no "+" dos produtos */
  productQuantitySavingsTotal: number;
  /** Ajuste (em R$, negativo = desconto, positivo = acréscimo) por regra de dia da semana do template */
  dayOfWeekAdjustment: number;
  /** Mensagens de regras ativas para exibir no orçamento e no WhatsApp */
  activeGroupBadges: Array<{
    grupo: string;
    quantidade: number;
    descontoAplicado: number;
    descricao: string;
  }>;
  /** Dicas para incentivar o cliente a adicionar +1 unidade no "+" ou +1 item do grupo */
  nextTierHints: Array<{
    grupo: string;
    faltam: number;
    beneficioTexto: string;
  }>;
  /** Descrição da regra de dia da semana ativa (se houver) */
  activeDayRuleLabel?: string;
}

/**
 * Calcula descontos progressivos por quantidade de produto (no "+"), por grupo de produtos (% ou R$)
 * e ajustes por dia da semana/feriado, garantindo zero conflito de lógica entre regras do produto e do template.
 */
export function calculateProgressiveDiscounts(
  products: Array<{
    id: string;
    nome: string;
    valor: number;
    desconto_percentual?: number;
    quantidade_maxima?: number | null;
    grupo_desconto?: string | null;
    faixas_preco?: FaixaPrecoProduto[] | null;
    escaloes_quantidade?: EscalaoQuantidadeProduto[] | null;
    regras_preco_data?: RegraPrecoDataProduto[] | null;
  }>,
  selectedQuantities: Record<string, number>,
  selectedTiers: Record<string, string>,
  config?: ConfigDescontoProgressivoTemplate | null,
  eventDate?: string,
  customHolidays?: string[]
): ProgressiveDiscountSummary {
  const activeGroupBadges: ProgressiveDiscountSummary['activeGroupBadges'] = [];
  const nextTierHints: ProgressiveDiscountSummary['nextTierHints'] = [];
  let productQuantitySavingsTotal = 0;

  // 1. Avaliar descontos progressivos por quantidade (no clique do "+") de cada produto e agrupar por grupo_desconto
  const groupStats: Record<string, { count: number; subtotal: number }> = {};
  let allSelectedCount = 0;
  let allSelectedSubtotal = 0;
  let subtotalEligibleForTemplateDayRule = 0;

  for (const prod of products) {
    const qty = selectedQuantities[prod.id] || 0;
    const qtyPricing = resolveProductQuantityPricing(
      prod,
      Math.max(1, qty),
      selectedTiers[prod.id],
      eventDate,
      config,
      customHolidays
    );

    // Se o cliente selecionou 1+ unidade e há próxima faixa no "+" deste produto, sugerir!
    if (qty > 0 && qtyPricing.nextQuantityHint) {
      const h = qtyPricing.nextQuantityHint;
      nextTierHints.push({
        grupo: prod.nome,
        faltam: h.nextQty - qty,
        beneficioTexto: `${prod.nome}: clique no "+" para ${h.label} por R$ ${h.nextTotal.toFixed(2).replace('.', ',')} (economize R$ ${h.nextSavings.toFixed(2).replace('.', ',')}!)`,
      });
    }

    if (qty <= 0) continue;

    if (qtyPricing.progressiveQuantitySavings > 0) {
      productQuantitySavingsTotal += qtyPricing.progressiveQuantitySavings;
      activeGroupBadges.push({
        grupo: prod.nome,
        quantidade: qty,
        descontoAplicado: qtyPricing.progressiveQuantitySavings,
        descricao: `${qty}x ${prod.nome}: de R$ ${qtyPricing.normalTotalForQuantity.toFixed(2).replace('.', ',')} por R$ ${qtyPricing.totalPrice.toFixed(2).replace('.', ',')}`,
      });
    }

    const itemTotal = qtyPricing.totalPrice;
    allSelectedCount += qty;
    allSelectedSubtotal += itemTotal;

    // Anti-conflito: só aplica regra geral de dia da semana do template em produtos que NÃO tiveram regra de data própria aplicada
    if (!qtyPricing.hasCustomDateRuleApplied) {
      subtotalEligibleForTemplateDayRule += itemTotal;
    }

    const grp = (prod.grupo_desconto || '').trim();
    if (grp) {
      if (!groupStats[grp]) {
        groupStats[grp] = { count: 0, subtotal: 0 };
      }
      groupStats[grp].count += qty;
      groupStats[grp].subtotal += itemTotal;
    }
  }

  let groupDiscountTotal = 0;

  if (config && config.ativo) {
    const rules = Array.isArray(config.regras_grupos) ? config.regras_grupos : [];
    if (rules.length > 0) {
      const rulesByGroup: Record<string, RegraDescontoGrupo[]> = {};
      for (const r of rules) {
        const key = (r.grupo || '*').trim();
        if (!rulesByGroup[key]) rulesByGroup[key] = [];
        rulesByGroup[key].push(r);
      }

      for (const [grpKey, grpRules] of Object.entries(rulesByGroup)) {
        const sortedRules = [...grpRules].sort((a, b) => a.min_itens - b.min_itens);
        const stats =
          grpKey === '*' || grpKey.toLowerCase() === 'todos' || grpKey.toLowerCase() === 'geral'
            ? { count: allSelectedCount, subtotal: allSelectedSubtotal }
            : groupStats[grpKey] || { count: 0, subtotal: 0 };

        let matchedRule: RegraDescontoGrupo | undefined;
        let nextRule: RegraDescontoGrupo | undefined;

        for (const r of sortedRules) {
          if (stats.count >= r.min_itens) {
            matchedRule = r;
          } else if (!nextRule && stats.count > 0 && stats.count < r.min_itens) {
            nextRule = r;
          }
        }

        if (matchedRule && stats.subtotal > 0) {
          const discountVal =
            matchedRule.tipo_desconto === 'percentual'
              ? stats.subtotal * (Math.min(100, Math.max(0, matchedRule.valor)) / 100)
              : Math.min(stats.subtotal, Math.max(0, matchedRule.valor));

          if (discountVal > 0) {
            groupDiscountTotal += discountVal;
            const labelGrupo = grpKey === '*' ? 'Pacote Combo' : grpKey;
            const beneficio =
              matchedRule.tipo_desconto === 'percentual'
                ? `${matchedRule.valor}% OFF`
                : `R$ ${matchedRule.valor.toFixed(2).replace('.', ',')} OFF`;
            activeGroupBadges.push({
              grupo: labelGrupo,
              quantidade: stats.count,
              descontoAplicado: discountVal,
              descricao: `${labelGrupo} (${stats.count} itens): -${beneficio}`,
            });
          }
        }

        if (nextRule) {
          const faltam = nextRule.min_itens - stats.count;
          const labelGrupo = grpKey === '*' ? 'no orçamento' : `do grupo "${grpKey}"`;
          const beneficio =
            nextRule.tipo_desconto === 'percentual'
              ? `${nextRule.valor}% de desconto`
              : `R$ ${nextRule.valor.toFixed(2).replace('.', ',')} de desconto`;
          nextTierHints.push({
            grupo: grpKey,
            faltam,
            beneficioTexto: `Adicione +${faltam} ${faltam === 1 ? 'item' : 'itens'} ${labelGrupo} para ganhar ${beneficio}!`,
          });
        }
      }
    }
  }

  // 2. Avaliar regras gerais por dia da semana / feriado no template (apenas para produtos sem regra própria de data, evitando conflito!)
  let dayOfWeekAdjustment = 0;
  let activeDayRuleLabel: string | undefined;

  const dayRules =
    config &&
    config.ativo &&
    isDateWithinTemplateVigencia(eventDate, config) &&
    Array.isArray(config.regras_dias_semana)
      ? config.regras_dias_semana
      : [];
  if (eventDate && dayRules.length > 0 && subtotalEligibleForTemplateDayRule > 0) {
    const baseAfterGroup = Math.max(0, subtotalEligibleForTemplateDayRule - groupDiscountTotal);
    const dateObj = new Date(`${eventDate}T12:00:00`);
    if (!isNaN(dateObj.getTime())) {
      const dow = dateObj.getDay();
      const holidayInfo = isBrazilianHoliday(eventDate, customHolidays);

      for (const dr of dayRules) {
        const matchesHoliday = dr.incluir_feriados && holidayInfo.isHoliday;
        const matchesDow = !dr.somente_feriados && Array.isArray(dr.dias_semana) && dr.dias_semana.includes(dow);

        if (matchesHoliday || matchesDow) {
          let adj = 0;
          if (dr.tipo_ajuste === 'desconto_percentual') {
            adj = -(baseAfterGroup * (dr.valor / 100));
          } else if (dr.tipo_ajuste === 'desconto_fixo') {
            adj = -Math.min(baseAfterGroup, dr.valor);
          } else if (dr.tipo_ajuste === 'acrescimo_percentual') {
            adj = baseAfterGroup * (dr.valor / 100);
          } else if (dr.tipo_ajuste === 'acrescimo_fixo') {
            adj = dr.valor;
          }

          if (adj !== 0) {
            dayOfWeekAdjustment = adj;
            activeDayRuleLabel = dr.nome || (matchesHoliday ? `Tabela Feriado (${holidayInfo.name})` : 'Tabela por Dia da Semana');
            break;
          }
        }
      }
    }
  }

  return {
    groupDiscountTotal,
    productQuantitySavingsTotal,
    dayOfWeekAdjustment,
    activeGroupBadges,
    nextTierHints,
    activeDayRuleLabel,
  };
}
