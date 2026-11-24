/* config.js — versão para banco com tabelas separadas
   - Requisitos: tabelas `templates`, `formas_pagamento`, `produtos`, `campos`, `cupons`,
     `acrescimos_sazonais`, `acrescimos_localidade`
   - Agora as chaves do Supabase vêm do backend via .env
*/

/* ================== CONFIGURAÇÃO SUPABASE ================== */
// ============================
// 🔧 Inicialização segura do Supabase (compatível com Flask /api/env)
// ============================
let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  try {
    const res = await fetch("http://localhost:3000/api/env");
    if (!res.ok) throw new Error("Falha ao carregar variáveis do servidor");
    const env = await res.json();
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Variáveis do Supabase ausentes");

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase inicializado com sucesso em config.js");
    return supabaseClient;
  } catch (err) {
    console.error("❌ Falha ao inicializar Supabase:", err);
    alert("Erro ao conectar com o servidor Flask. Verifique se ele está rodando em localhost:3000");
    return null;
  }
}

async function waitForSupabase() {
  while (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) await new Promise(r => setTimeout(r, 300));
  }
  return supabaseClient;
}


/* ================== ESTADO GLOBAL (local) ================== */
let currentTemplateId = null;
let currentUser = null;

let produtos = [];
let campos = [];
let formasPagamento = [];
let cupons = [];
let acrescimosSazonais = [];
let acrescimosLocalidade = [];

// NOVAS VARIÁVEIS DE CONFIGURAÇÃO GLOBAL (carregadas/salvas na tabela templates)
let bloquearCamposObrigatorios = false;
let ocultarValoresIntermediarios = false;
let textoWhatsApp = "👋 Olá [fotografo], fiz um orçamento em sua pagina [nome_template]:\n\n[campos]\n\n[servicos]\n\nValor total do pacote escolhido: [total]\nForma de pagamento escolhida: [pagamento]\n\nAguardamos seu retorno para agendarmos uma reunião ou tirar dúvidas sobre minha escolha.";


/* ================== HELPERS ================== */
function showModal(message, type = "info") {
  const modal = document.getElementById("statusModal");
  const msg = document.getElementById("modalMessage");
  if (!modal || !msg) { alert(message); return; }
  msg.textContent = message;
  modal.style.backgroundColor = type === "success" ? "#2ecc71" : (type === "error" ? "#e74c3c" : "#3498db");
  modal.style.display = "flex";
  clearTimeout(showModal._t); showModal._t = setTimeout(() => modal.style.display = "none", 2200);
}
function escapeHtml(s=''){ return String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
function getTemplateIdFromUrl(){ const p=new URLSearchParams(window.location.search); return p.get('templateId')||p.get('t')||null; }

/* ================== AUTENTICAÇÃO E INICIALIZAÇÃO ================== */
async function init() {
  // get user
  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) { showModal('Usuário não autenticado. Faça login.', 'error'); return window.location.href='Index.html'; }
    currentUser = user;
    // bind UI
    bindUI();
    // load template id if any
    currentTemplateId = getTemplateIdFromUrl();
    if (currentTemplateId) {
      document.getElementById('btnVerCliente').style.display = 'inline-block';
    } else {
      document.getElementById('btnVerCliente').style.display = 'none';
    }
    // load data
    if (currentTemplateId) await carregarTemplateCompleto(currentTemplateId);
    else {
      // new template: clear state / show defaults
      produtos = []; campos = []; formasPagamento = []; cupons = []; acrescimosSazonais = []; acrescimosLocalidade = [];
      renderAll();
      // Preenche as NOVAS OPÇÕES com valores default
      document.getElementById('bloquearCamposObrigatorios').checked = bloquearCamposObrigatorios;
      document.getElementById('ocultarValoresIntermediarios').checked = ocultarValoresIntermediarios;
      document.getElementById('textoWhatsApp').value = textoWhatsApp;
    }
  } catch (err) {
    console.error('init error', err);
    showModal('Erro na inicialização. Veja console.', 'error');
  }
}

/* ================== BIND UI ================== */
function bindUI() {
  document.getElementById('btnVoltarDashboard')?.addEventListener('click', () => window.location.href = 'dashboard.html');
  // Alterado para 'btnSalvarConfiguracoes'
  document.getElementById('btnSalvarConfiguracoes')?.addEventListener('click', salvarConfiguracoesNoServidor); 
  document.getElementById('btnVerCliente')?.addEventListener('click', () => {
    if (!currentTemplateId) return showModal('Template ainda não salvo.', 'error');
    const url = `${location.origin}/user.html?templateId=${currentTemplateId}`;
    window.open(url, '_blank');
  });

  document.getElementById('btnAdicionarCampo')?.addEventListener('click', adicionarCampoUI);
  document.getElementById('btnAdicionarProduto')?.addEventListener('click', adicionarProdutoUI);
  document.getElementById('btnAdicionarPagamento')?.addEventListener('click', adicionarFormaPagamento); // Corrigido ID do botão
  document.getElementById('btnAdicionarCupom')?.addEventListener('click', adicionarCupomUI);
  document.getElementById('btnAdicionarAcrescimoSazonal')?.addEventListener('click', adicionarAcrescimoSazonalUI);
  document.getElementById('btnAdicionarAcrescimoLocalidade')?.addEventListener('click', adicionarAcrescimoLocalidadeUI);

  // file input: product image preview (base64 stored temporarily)
  const fileInput = document.getElementById('novoProdutoImagem');
  if (fileInput) fileInput.addEventListener('change', (e) => {
    // preview optional; image will be uploaded/encoded on save if needed
    showModal('Imagem selecionada (será salva ao salvar as configurações).', 'info');
  });
}

/* ================== CARREGAMENTO (READ) ================== */
async function carregarTemplateCompleto(templateId) {
  try {
    // load base template entry, incluindo os NOVOS CAMPOS
    const { data: template, error: tErr } = await supabaseClient
      .from('templates')
      .select('id, nome_template, titulo_template, configuracao_completa, created_at, updated_at, bloquear_campos_obrigatorios, ocultar_valores_intermediarios, texto_whatsapp')
      .eq('id', templateId)
      .single();
    if (tErr) throw tErr;
    document.getElementById('nomeTemplate').value = template.nome_template || template.titulo_template || '';

    // CARREGA NOVAS OPÇÕES
    bloquearCamposObrigatorios = template.bloquear_campos_obrigatorios ?? false;
    ocultarValoresIntermediarios = template.ocultar_valores_intermediarios ?? false;
    textoWhatsApp = template.texto_whatsapp || textoWhatsApp;

    // load related tables
    await Promise.all([
      carregarProdutos(templateId),
      carregarCampos(templateId),
      carregarFormasPagamento(templateId),
      carregarCupons(templateId),
      carregarAcrescimosSazonais(templateId),
      carregarAcrescimosLocalidade(templateId)
    ]);

    renderAll();
    // Preenche as NOVAS OPÇÕES
    document.getElementById('bloquearCamposObrigatorios').checked = bloquearCamposObrigatorios;
    document.getElementById('ocultarValoresIntermediarios').checked = ocultarValoresIntermediarios;
    document.getElementById('textoWhatsApp').value = textoWhatsApp;

    showModal('Template carregado.', 'success');
  } catch (err) {
    console.error('carregarTemplateCompleto erro', err);
    showModal('Erro ao carregar template. Veja console.', 'error');
  }
}
// ... (carregarProdutos, carregarCampos, carregarFormasPagamento, carregarCupons, carregarAcrescimosSazonais, carregarAcrescimosLocalidade - MANTIDOS INALTERADOS)
async function carregarProdutos(templateId) {
  try {
    const { data, error } = await supabaseClient.from('produtos').select('*').eq('template_id', templateId).order('created_at', { ascending: true });
    if (error) throw error;
    produtos = data || [];
  } catch (err) {
    console.error('carregarProdutos', err);
    produtos = [];
  }
}

async function carregarCampos(templateId) {
  try {
    const { data, error } = await supabaseClient.from('campos').select('*').eq('template_id', templateId).order('created_at', { ascending: true });
    if (error) throw error;
    campos = data || [];
  } catch (err) {
    console.error('carregarCampos', err);
    campos = [];
  }
}

async function carregarFormasPagamento(templateId) {
  try {
    const { data, error } = await supabaseClient.from('formas_pagamento').select('*').eq('template_id', templateId).order('created_at', { ascending: true });
    if (error) throw error;
    formasPagamento = data || [];
  } catch (err) {
    console.error('carregarFormasPagamento', err);
    formasPagamento = [];
  }
}

async function carregarCupons(templateId) {
  try {
    const { data, error } = await supabaseClient.from('cupons').select('*').eq('template_id', templateId).order('created_at', { ascending: true });
    if (error) throw error;
    cupons = data || [];
  } catch (err) {
    console.error('carregarCupons', err);
    cupons = [];
  }
}

async function carregarAcrescimosSazonais(templateId) {
  try {
    const { data, error } = await supabaseClient.from('acrescimos_sazonais').select('*').eq('template_id', templateId).order('mes', { ascending:true });
    if (error) throw error;
    acrescimosSazonais = data || [];
  } catch (err) {
    console.error('carregarAcrescimosSazonais', err);
    acrescimosSazonais = [];
  }
}

async function carregarAcrescimosLocalidade(templateId) {
  try {
    const { data, error } = await supabaseClient.from('acrescimos_localidade').select('*').eq('template_id', templateId).order('id', { ascending:true });
    if (error) throw error;
    acrescimosLocalidade = data || [];
  } catch (err) {
    console.error('carregarAcrescimosLocalidade', err);
    acrescimosLocalidade = [];
  }
}


/* ================== RENDER (UI) ================== */
function renderAll() {
  renderizarListaCampos();
  renderizarListaProdutos();
  renderizarListaFormasPagamento();
  renderizarListaCupons();
  renderizarListaAcrescimosSazonais();
  renderizarListaAcrescimosLocalidade();
  // update template name display
  document.getElementById('templateNomeDisplay') && (document.getElementById('templateNomeDisplay').textContent = document.getElementById('nomeTemplate').value || '(sem nome)');
}
// ... (renderizarListaCampos, adicionarCampoUI, renderizarListaProdutos, adicionarProdutoUI, renderizarListaFormasPagamento, adicionarFormaPagamento - MANTIDOS INALTERADOS)
/* ---- CAMPOS ---- */
function renderizarListaCampos() {
  const container = document.getElementById('listaCampos');
  if (!container) return;
  container.innerHTML = '';
  if (!campos.length) { container.innerHTML = '<p style="color:#777">Nenhum campo.</p>'; return; }
  campos.forEach(c => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<strong>${escapeHtml(c.label)}</strong> — ${escapeHtml(c.tipo)} ${c.obrigatorio ? '(Obrigatório)' : ''} <div style="float:right"><button class="btn small" data-id="${c.id}" data-action="editar-campo">Editar</button> <button class="btn small btn-delete" data-id="${c.id}" data-action="remover-campo">Remover</button></div>`;
    container.appendChild(el);
  });
  container.querySelectorAll('button[data-action="remover-campo"]').forEach(b => b.addEventListener('click', async(e)=> {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    if (!confirm('Remover campo?')) return;
    // delete from DB if persisted
    try {
      if (currentTemplateId) {
        const { error } = await supabaseClient.from('campos').delete().eq('id', id);
        if (error) throw error;
      }
      campos = campos.filter(x => x.id !== id);
      renderizarListaCampos();
    } catch(err){ console.error(err); showModal('Erro ao remover campo','error'); }
  }));
  container.querySelectorAll('button[data-action="editar-campo"]').forEach(b => b.addEventListener('click', (e)=> {
    const id = e.currentTarget.dataset.id;
    const idx = campos.findIndex(x=>x.id==id);
    if (idx===-1) return;
    const novo = prompt('Editar label do campo', campos[idx].label);
    if (novo===null) return;
    campos[idx].label = novo.trim() || campos[idx].label;
    // update DB
    (async()=>{
      try {
        if (currentTemplateId) {
          const { error } = await supabaseClient.from('campos').update({ label: campos[idx].label }).eq('id', id);
          if (error) throw error;
        }
        renderizarListaCampos();
      } catch(err){ console.error(err); showModal('Erro ao atualizar campo','error'); }
    })();
  }));
}

/* ---- ADICIONAR CAMPO ---- */
function adicionarCampoUI(){
  const label = (document.getElementById('novoCampoLabel')?.value||'').trim();
  const tipo = (document.getElementById('novoCampoTipo')?.value||'text');
  const obrig = !!document.getElementById('novoCampoObrigatorio')?.checked;
  if(!label){ showModal('Nome do campo é obrigatório','error'); return; }
  // create local object (if template persisted later we'll insert)
  const id = 'local-'+Date.now()+Math.floor(Math.random()*1000);
  const obj = { id, label, tipo, obrigatorio: obrig };
  campos.push(obj);
  document.getElementById('novoCampoLabel').value='';
  renderizarListaCampos();
}

/* ---- PRODUTOS ---- */
function renderizarListaProdutos(){
  const c = document.getElementById('listaProdutos'); if(!c) return; c.innerHTML='';
  if (!produtos.length){ c.innerHTML='<p style="color:#777">Nenhum produto.</p>'; return; }
  produtos.forEach(p=>{
    const div=document.createElement('div'); div.className='item';
    div.innerHTML = `<strong>${escapeHtml(p.nome)}</strong> — R$ ${Number(p.valor||0).toFixed(2)} <div style="float:right"><button class="btn small" data-id="${p.id}" data-action="editar-produto">Editar</button> <button class="btn small btn-delete" data-id="${p.id}" data-action="remover-produto">Remover</button></div>`;
    c.appendChild(div);
  });
  c.querySelectorAll('button[data-action="remover-produto"]').forEach(b=>b.addEventListener('click', async(e)=>{
    const id=e.currentTarget.dataset.id; if(!id) return; if(!confirm('Remover produto?')) return;
    try{ if (currentTemplateId && id && id.length>5) { const { error } = await supabaseClient.from('produtos').delete().eq('id', id); if(error) throw error; } produtos = produtos.filter(x=>x.id!==id); renderizarListaProdutos(); }catch(err){ console.error(err); showModal('Erro ao remover produto','error'); }
  }));
  c.querySelectorAll('button[data-action="editar-produto"]').forEach(b=>b.addEventListener('click', (e)=>{
    const id=e.currentTarget.dataset.id; const idx=produtos.findIndex(x=>x.id==id); if(idx===-1) return;
    const novoNome = prompt('Nome', produtos[idx].nome); if(novoNome===null) return; produtos[idx].nome = novoNome.trim() || produtos[idx].nome;
    const novoValor = prompt('Valor (use .)', String(produtos[idx].valor||0)); if(novoValor===null) return; produtos[idx].valor = parseFloat(String(novoValor).replace(',', '.'))||0;
    renderizarListaProdutos();
  }));
}

/* ---- ADICIONAR PRODUTO ---- */
function adicionarProdutoUI(){
  const nome=(document.getElementById('novoProdutoNome')?.value||'').trim();
  const resumo=(document.getElementById('novoProdutoResumo')?.value||'').trim();
  const valor=parseFloat((document.getElementById('novoProdutoValor')?.value||'0').toString().replace(',', '.'))||0;
  if(!nome){ showModal('Nome do produto obrigatório','error'); return; }
  const id = 'local-prod-'+Date.now()+Math.floor(Math.random()*1000);
  const produto = { id, nome, resumo, valor };
  // image handling: we leave for save step (client can upload base64 or store path)
  produtos.push(produto);
  document.getElementById('novoProdutoNome').value=''; document.getElementById('novoProdutoResumo').value=''; document.getElementById('novoProdutoValor').value='';
  renderizarListaProdutos();
}

/* ---- FORMAS DE PAGAMENTO (UI + DB) ---- */
function renderizarListaFormasPagamento(){
  const c = document.getElementById('listaFormasPagamento'); if(!c) return; c.innerHTML='';
  if(!formasPagamento.length){ c.innerHTML='<p style="color:#777">Nenhuma forma de pagamento cadastrada.</p>'; return; }
  formasPagamento.forEach(fp=>{
    const div=document.createElement('div'); div.className='item';
    const entry = fp.regra==='full' ? 'Sem entrada' : (fp.regra==='percentage_entry'? `Entrada ${fp.entrada_valor||0}%` : `Entrada R$ ${fp.entrada_valor||0}`);
    div.innerHTML = `<strong>${escapeHtml(fp.nome)}</strong> — ${fp.acrescimo||0}% • ${entry} <div style="float:right"><button class="btn small" data-id="${fp.id}" data-action="editar-pag">Editar</button> <button class="btn small btn-delete" data-id="${fp.id}" data-action="remover-pag">Remover</button></div>`;
    c.appendChild(div);
  });
  c.querySelectorAll('button[data-action="remover-pag"]').forEach(b=>b.addEventListener('click', async (e)=>{
    const id=e.currentTarget.dataset.id; if(!id) return; if(!confirm('Remover forma de pagamento?')) return;
    try { if (currentTemplateId && id && id.length>5) { const { error } = await supabaseClient.from('formas_pagamento').delete().eq('id', id); if(error) throw error; } formasPagamento = formasPagamento.filter(x=>x.id!==id); renderizarListaFormasPagamento(); } catch(err){ console.error(err); showModal('Erro ao remover forma','error'); }
  }));
  c.querySelectorAll('button[data-action="editar-pag"]').forEach(b=>b.addEventListener('click', (e)=>{
    const id=e.currentTarget.dataset.id; const idx=formasPagamento.findIndex(x=>x.id==id); if(idx===-1) return;
    const nome = prompt('Nome', formasPagamento[idx].nome); if(nome===null) return; formasPagamento[idx].nome = nome.trim()||formasPagamento[idx].nome;
    // basic update to DB
    (async()=>{
      try{ if (currentTemplateId && formasPagamento[idx].id && formasPagamento[idx].id.length>5) { const { error } = await supabaseClient.from('formas_pagamento').update({ nome: formasPagamento[idx].nome }).eq('id', formasPagamento[idx].id); if(error) throw error; } renderizarListaFormasPagamento(); }catch(err){ console.error(err); showModal('Erro ao atualizar forma','error'); }
    })();
  }));
}

/* ---- ADICIONAR FORMA DE PAGAMENTO ---- */
async function adicionarFormaPagamento(){
  try{
    const nome=(document.getElementById('novaFormaPagamentoNome')?.value||'').trim();
    if(!nome) return alert('Informe o nome da forma.');
    const entrada_val = parseFloat((document.getElementById('novaFormaPagamentoEntradaValor')?.value||'0').toString().replace(',', '.'))||0;
    const max_parcelas = parseInt(document.getElementById('novaFormaPagamentoMaxParcelas')?.value)||1;
    const acrescimo = parseFloat((document.getElementById('novaFormaPagamentoAcrescimo')?.value||'0').toString().replace(',', '.'))||0;
    const mes_final = (document.getElementById('novaFormaPagamentoMesFinal')?.value||'').trim() || null;

    const obj = {
      id: 'local-pag-'+Date.now()+Math.floor(Math.random()*1000),
      nome, entrada_valor: entrada_val, max_parcelas, acrescimo, mes_final, regra: 'personalizada'
    };
    // if template exists, immediately insert to DB
    if (currentTemplateId) {
      const payload = { nome, entrada_valor: entrada_val, max_parcelas, acrescimo, mes_final, regra: 'personalizada', template_id: currentTemplateId, user_id: currentUser.id };
      const { data, error } = await supabaseClient.from('formas_pagamento').insert([payload]).select().single();
      if (error) throw error;
      formasPagamento.push(data);
    } else {
      formasPagamento.push(obj);
    }
    // clear fields
    ['novaFormaPagamentoNome','novaFormaPagamentoEntradaValor','novaFormaPagamentoMaxParcelas','novaFormaPagamentoAcrescimo','novaFormaPagamentoMesFinal'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    renderizarListaFormasPagamento();
    showModal('Forma de pagamento adicionada','success');
  }catch(err){
    console.error('adicionarFormaPagamento', err);
    showModal('Erro ao adicionar forma','error');
  }
}

/* Compatibility fallback (legacy calls) */
async function adicionarFormaPagamentoUI(){ console.warn('Compat: adicionarFormaPagamentoUI -> adicionarFormaPagamento'); return adicionarFormaPagamento(); }

/* ---- CUPONS ---- */
function renderizarListaCupons(){ const c=document.getElementById('listaCupons'); if(!c) return; c.innerHTML=''; if(!cupons.length){ c.innerHTML='<p style="color:#777">Nenhum cupom.</p>'; return; } cupons.forEach(cp=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`<strong>${escapeHtml(cp.codigo)}</strong> — ${cp.porcentagem}% <div style="float:right"><button class="btn small" data-id="${cp.id}" data-action="editar-cupom">Editar</button> <button class="btn small btn-delete" data-id="${cp.id}" data-action="remover-cupom">Remover</button></div>`; c.appendChild(div); }); c.querySelectorAll('button[data-action="remover-cupom"]').forEach(b=>b.addEventListener('click', async(e)=>{ const id=e.currentTarget.dataset.id; if(!id) return; if(!confirm('Remover cupom?')) return; try{ if(currentTemplateId && id.length>5){ const { error } = await supabaseClient.from('cupons').delete().eq('id', id); if(error) throw error; } cupons = cupons.filter(x=>x.id!==id); renderizarListaCupons(); }catch(err){ console.error(err); showModal('Erro ao remover cupom','error'); } })); c.querySelectorAll('button[data-action="editar-cupom"]').forEach(b=>b.addEventListener('click',(e)=>{ const id=e.currentTarget.dataset.id; const idx=cupons.findIndex(x=>x.id==id); if(idx===-1) return; const novo = prompt('Código', cupons[idx].codigo); if(novo===null) return; cupons[idx].codigo = novo.trim(); renderizarListaCupons(); })); }
function adicionarCupomUI(){ const codigo=(document.getElementById('novoCupomCodigo')?.value||'').trim(); if(!codigo){ showModal('Código obrigatório','error'); return; } const porcent = parseFloat((document.getElementById('novoCupomPorcentagem')?.value||'0').toString().replace(',','.'))||0; const validade=(document.getElementById('novoCupomValidade')?.value||null); const obj={ id:'local-cup-'+Date.now(), codigo:codigo.toUpperCase(), porcentagem:porcent, validade }; if(currentTemplateId){ (async()=>{ try{ const { data, error } = await supabaseClient.from('cupons').insert([{ ...obj, template_id: currentTemplateId, codigo: obj.codigo }]).select().single(); if(error) throw error; cupons.push(data); renderizarListaCupons(); showModal('Cupom salvo','success'); document.getElementById('novoCupomCodigo').value=''; document.getElementById('novoCupomPorcentagem').value=''; document.getElementById('novoCupomValidade').value=''; }catch(err){ console.error(err); showModal('Erro ao salvar cupom','error'); } })(); } else { cupons.push(obj); renderizarListaCupons(); document.getElementById('novoCupomCodigo').value=''; document.getElementById('novoCupomPorcentagem').value=''; document.getElementById('novoCupomValidade').value=''; showModal('Cupom adicionado (salve para persistir)','info'); } }

/* ---- ACRÉSCIMOS SAZONAIS ---- */
function renderizarListaAcrescimosSazonais(){ const c=document.getElementById('listaAcrescimosSazonais'); if(!c) return; c.innerHTML=''; if(!acrescimosSazonais.length){ c.innerHTML='<p style="color:#777">Nenhum acréscimo sazonal.</p>'; return; } acrescimosSazonais.forEach(a=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`<strong>${escapeHtml(a.nome||('Acréscimo '+(a.mes||'')))}</strong> — ${a.tipo==='percentage'?a.valor+'%':('R$ '+Number(a.valor||0).toFixed(2))} <div style="float:right"><button class="btn small" data-id="${a.id}" data-action="editar-saz">Editar</button> <button class="btn small btn-delete" data-id="${a.id}" data-action="remover-saz">Remover</button></div>`; c.appendChild(div); }); c.querySelectorAll('button[data-action="remover-saz"]').forEach(b=>b.addEventListener('click',async(e)=>{ const id=e.currentTarget.dataset.id; if(!id) return; if(!confirm('Remover acréscimo?')) return; try{ if(currentTemplateId && id.length>5){ const { error } = await supabaseClient.from('acrescimos_sazonais').delete().eq('id', id); if(error) throw error; } acrescimosSazonais = acrescimosSazonais.filter(x=>x.id!==id); renderizarListaAcrescimosSazonais(); }catch(err){ console.error(err); showModal('Erro ao remover','error'); } })); }
function adicionarAcrescimoSazonalUI(){ const mes=document.getElementById('novoAcrescimoSazonalMes')?.value||null; const valor=parseFloat((document.getElementById('novoAcrescimoSazonalValor')?.value||'0').toString().replace(',','.'))||0; const tipo=document.getElementById('novoAcrescimoSazonalTipo')?.value||'percentage'; if(!valor){ showModal('Valor inválido','error'); return; } const obj={ id:'local-saz-'+Date.now(), nome: mes?`Acréscimo ${mes}`:'Acréscimo', mes, valor, tipo }; if(currentTemplateId){ (async()=>{ try{ const { data, error } = await supabaseClient.from('acrescimos_sazonais').insert([{ ...obj, template_id: currentTemplateId }]).select().single(); if(error) throw error; acrescimosSazonais.push(data); renderizarListaAcrescimosSazonais(); showModal('Acréscimo salvo','success'); }catch(err){ console.error(err); showModal('Erro ao salvar','error'); } })(); } else { acrescimosSazonais.push(obj); renderizarListaAcrescimosSazonais(); showModal('Acréscimo adicionado (salve para persistir)','info'); } }

/* ---- ACRÉSCIMOS LOCALIDADE ---- */
function renderizarListaAcrescimosLocalidade(){ const c=document.getElementById('listaAcrescimosLocalidade'); if(!c) return; c.innerHTML=''; if(!acrescimosLocalidade.length){ c.innerHTML='<p style="color:#777">Nenhum acréscimo por localidade.</p>'; return; } acrescimosLocalidade.forEach(a=>{ const div=document.createElement('div'); div.className='item'; div.innerHTML=`<strong>${escapeHtml(a.nome||'Localidade')}</strong> — ${a.tipo==='percentage'?a.valor+'%':('R$ '+Number(a.valor||0).toFixed(2))} — ${escapeHtml((a.keywords||[]).join(', '))} <div style="float:right"><button class="btn small" data-id="${a.id}" data-action="editar-loc">Editar</button> <button class="btn small btn-delete" data-id="${a.id}" data-action="remover-loc">Remover</button></div>`; c.appendChild(div); }); c.querySelectorAll('button[data-action="remover-loc"]').forEach(b=>b.addEventListener('click',async(e)=>{ const id=e.currentTarget.dataset.id; if(!id) return; if(!confirm('Remover local?')) return; try{ if(currentTemplateId && id.length>5){ const { error } = await supabaseClient.from('acrescimos_localidade').delete().eq('id', id); if(error) throw error; } acrescimosLocalidade = acrescimosLocalidade.filter(x=>x.id!==id); renderizarListaAcrescimosLocalidade(); }catch(err){ console.error(err); showModal('Erro ao remover','error'); } })); }
function adicionarAcrescimoLocalidadeUI(){ const raw=(document.getElementById('novoAcrescimoLocalidadeKeywords')?.value||'').trim(); const keywords = raw.split(',').map(s=>s.trim()).filter(Boolean); const valor=parseFloat((document.getElementById('novoAcrescimoLocalidadeValor')?.value||'0').toString().replace(',','.'))||0; const tipo=document.getElementById('novoAcrescimoLocalidadeTipo')?.value||'percentage'; if(!keywords.length){ showModal('Informe ao menos uma cidade','error'); return; } const obj={ id:'local-loc-'+Date.now(), nome:`Local ${keywords[0]}`, keywords, valor, tipo }; if(currentTemplateId){ (async()=>{ try{ const { data, error } = await supabaseClient.from('acrescimos_localidade').insert([{ ...obj, template_id: currentTemplateId }]).select().single(); if(error) throw error; acrescimosLocalidade.push(data); renderizarListaAcrescimosLocalidade(); showModal('Local salvo','success'); }catch(err){ console.error(err); showModal('Erro ao salvar','error'); } })(); } else { acrescimosLocalidade.push(obj); renderizarListaAcrescimosLocalidade(); showModal('Local adicionado (salve para persistir)','info'); } }


/* ================== SALVAR CONFIGURAÇÕES (TEMPLATE + TABELAS RELACIONADAS) ================== */
/*
 Strategy: 
  - If template exists: update templates row (nome, updated_at) and then
    delete existing related rows for this template_id in each related table,
    and re-insert current arrays (simple replace strategy).
  - If new template: insert into templates then insert related rows with template_id.
*/
async function salvarConfiguracoesNoServidor(){
  try{
    // auth check
    const { data: { user } } = await supabaseClient.auth.getUser();
    if(!user) { showModal('Usuário não autenticado','error'); return; }

    // CAPTURA NOVAS OPÇÕES
    bloquearCamposObrigatorios = document.getElementById('bloquearCamposObrigatorios').checked;
    ocultarValoresIntermediarios = document.getElementById('ocultarValoresIntermediarios').checked;
    textoWhatsApp = document.getElementById('textoWhatsApp').value;


    // gather data
    const nomeTemplate = (document.getElementById('nomeTemplate')?.value||'').trim() || `Orçamento ${new Date().toLocaleDateString()}`;
    
    // template payload
    const payload = {
      user_id: user.id,
      nome_template: nomeTemplate,
      titulo_template: nomeTemplate,
      updated_at: new Date().toISOString(),

      // NOVOS CAMPOS PARA SALVAR
      bloquear_campos_obrigatorios: bloquearCamposObrigatorios,
      ocultar_valores_intermediarios: ocultarValoresIntermediarios,
      texto_whatsapp: textoWhatsApp
    };

    if (currentTemplateId) {
      // update templates
      const { error: updateErr } = await supabaseClient.from('templates').update(payload).eq('id', currentTemplateId);
      if (updateErr) throw updateErr;
    } else {
      // insert new template
      const { data: inserted, error: insertErr } = await supabaseClient.from('templates').insert([{ ...payload, criado_em: new Date().toISOString() }]).select().single();
      if (insertErr) throw insertErr;
      currentTemplateId = inserted.id;
      // show Ver Cliente button
      document.getElementById('btnVerCliente').style.display = 'inline-block';
    }

    // now synchronize related tables: for simplicity we delete existing rows for template_id and insert current arrays
    const related = [
      { table:'produtos', data: produtos, map: p => ({ ...p, template_id: currentTemplateId }) },
      { table:'campos', data: campos, map: c => ({ ...c, template_id: currentTemplateId }) },
      { table:'formas_pagamento', data: formasPagamento, map: f => ({ nome: f.nome, entrada_valor: f.entrada_valor ?? f.entrada_valor, max_parcelas: f.max_parcelas, acrescimo: f.acrescimo, regra: f.regra || 'personalizada', parcelas_detalhadas: f.parcelas_detalhadas || null, data_limite_quitacao: f.data_limite_quitacao || null, mes_final: f.mes_final || null, template_id: currentTemplateId, user_id: user.id }) },
      { table:'cupons', data: cupons, map: c => ({ codigo: c.codigo, porcentagem: c.porcentagem || c.porcentagem, validade: c.validade || c.validade, template_id: currentTemplateId }) },
      { table:'acrescimos_sazonais', data: acrescimosSazonais, map: a => ({ nome: a.nome, mes: a.mes || null, tipo: a.tipo || 'percentage', valor: a.valor || 0, template_id: currentTemplateId }) },
      { table:'acrescimos_localidade', data: acrescimosLocalidade, map: a => ({ nome: a.nome, keywords: a.keywords || [], tipo: a.tipo || 'percentage', valor: a.valor || 0, template_id: currentTemplateId }) }
    ];

    // delete existing for this template
    for (const r of related) {
      try {
        const { error: delErr } = await supabaseClient.from(r.table).delete().eq('template_id', currentTemplateId);
        if (delErr) throw delErr;
      } catch (err) {
        // log but continue
        console.warn(`Aviso: não foi possível limpar tabela ${r.table}`, err);
      }
    }

    // insert current arrays (in batches)
    for (const r of related) {
      if (!r.data || !r.data.length) continue;
      const toInsert = r.data.map(r.map);
      // chunk insertion in case of many items
      const CHUNK = 100;
      for (let i=0;i<toInsert.length;i+=CHUNK){
        const slice = toInsert.slice(i,i+CHUNK);
        const { error } = await supabaseClient.from(r.table).insert(slice);
        if (error) throw error;
      }
    }

    showModal(`✅ Configurações salvas (${nomeTemplate})`, 'success');
    // refresh loaded data from DB to ensure IDs sync
    await carregarTemplateCompleto(currentTemplateId);
  }catch(err){
    console.error('❌ Erro salvarConfiguracoesNoServidor:', err);
    showModal('Erro ao salvar (veja console)', 'error');
  }
}

/* ================== BOOT ================== */
document.addEventListener('DOMContentLoaded', async () => {
  await initSupabase();
  init();
});


/* ================== EXPORT PARA DEBUG ================== */
window._configDebug = {
  produtos, campos, formasPagamento, cupons, acrescimosSazonais, acrescimosLocalidade,
  carregarTemplateCompleto, salvarConfiguracoesNoServidor, adicionarFormaPagamentoUI, adicionarFormaPagamento
};