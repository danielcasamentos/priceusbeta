// ===============================
// DASHBOARD.JS — versão final integrada com Flask + Supabase
// ===============================

// ===========================
// 🔧 Inicialização segura do Supabase
// ===========================

let supabaseClient = null;
let loggedInUser = null;
let templates = [];
let currentProfile = {};

// Função que busca o Supabase do backend e cria o client
async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  try {
    // Note: Usando path relativo, dependendo de como seu Flask serve os arquivos
    const res = await fetch("/api/env");
    if (!res.ok) throw new Error("Falha ao carregar variáveis do servidor");

    const env = await res.json();
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = env;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Variáveis do Supabase ausentes");
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("✅ Supabase inicializado com sucesso no dashboard.js");
    return supabaseClient;
  } catch (err) {
    console.error("❌ Falha ao inicializar Supabase:", err);
    alert("Erro ao conectar com o servidor Flask. Verifique se ele está rodando.");
    return null;
  }
}

// Aguarda Supabase estar pronto antes de executar qualquer operação
async function waitForSupabase() {
  while (!supabaseClient) {
    await initSupabase();
    if (!supabaseClient) await new Promise(r => setTimeout(r, 300));
  }
  return supabaseClient;
}

// ===========================
// 🔒 AUTENTICAÇÃO E CARREGAMENTO INICIAL
// ===========================

async function checkAuthAndLoadData() {
  const supabase = await waitForSupabase();
  if (!supabase) return;

  const { data: sessionData, error } = await supabase.auth.getSession();
  const session = sessionData?.session;

  // CORREÇÃO: Redireciona para o index.html (sua página de login)
  if (!session) {
    console.warn("⚠️ Nenhuma sessão ativa — redirecionando para login...");
    window.location.href = "index.html";
    return;
  }

  loggedInUser = session.user;

  // Carrega Perfil, Templates, e inicializa o resto
  await loadProfile(loggedInUser.id);
  await loadTemplates();

  // Esconde o spinner se existir e mostra o dashboard
  document.querySelector(".dashboard-container").style.display = 'flex';
}

// ===========================
// 🛠️ HELPERS (Funções Auxiliares)
// ===========================

// Exibe a modal de status
function showModal(message, type) {
  const modal = document.getElementById("statusModal");
  const modalMessage = document.getElementById("modalMessage");
  
  if (!modal || !modalMessage) return;

  modalMessage.textContent = message;
  modal.className = `modal ${type || 'info'}`;
  modal.style.display = "block";

  // Auto-hide após 3 segundos
  setTimeout(() => {
    modal.style.display = "none";
  }, 3000);
}

// Atualiza o URL do template
function updateTemplateUrl(template) {
  const url = `${window.location.origin}/user.html?template=${template.uuid}`;
  template.url = url;
}

// Cria o elemento visual de um Template
function createTemplateElement(template) {
  const el = document.createElement("div");
  el.className = "template-card";
  el.dataset.id = template.id;

  updateTemplateUrl(template);

  el.innerHTML = `
    <h3 class="card-title">${template.nome_template}</h3>
    <p class="card-subtitle">Última modificação: ${new Date(template.updated_at).toLocaleDateString()}</p>
    <div class="card-actions">
      <button class="btn btn-sm btn-outline edit-btn" data-uuid="${template.uuid}"><i class="fas fa-edit"></i> Editar</button>
      <button class="btn btn-sm btn-secondary copy-btn" data-url="${template.url}"><i class="fas fa-copy"></i> Copiar Link</button>
      <button class="btn btn-sm btn-danger delete-btn" data-id="${template.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
      <a href="${template.url}" target="_blank" class="btn btn-sm btn-outline view-btn"><i class="fas fa-eye"></i> Ver</a>
    </div>
  `;

  // Adiciona listeners aos botões
  el.querySelector(".edit-btn").addEventListener("click", (e) => editarTemplate(e.currentTarget.dataset.uuid));
  el.querySelector(".copy-btn").addEventListener("click", (e) => copiarLink(e.currentTarget.dataset.url));
  el.querySelector(".delete-btn").addEventListener("click", (e) => confirmarExclusao(e.currentTarget.dataset.id));

  return el;
}

// ===========================
// 🔄 CRUD Templates
// ===========================

async function loadTemplates() {
  const supabase = await waitForSupabase();
  const templateList = document.getElementById("templateList");
  
  if (!templateList) return;
  templateList.innerHTML = ''; // Limpa a lista

  try {
    // Busca templates do backend Flask (que já usa o login_required)
    const res = await fetch("/api/templates");
    if (res.status === 302) { // Se for redirecionado, a sessão Flask expirou
      window.location.href = "index.html"; 
      return;
    }
    if (!res.ok) throw new Error("Falha ao carregar templates do servidor");
    
    const data = await res.json();
    templates = data.data || [];

    if (templates.length === 0) {
      templateList.innerHTML = "<p>Você não tem templates. Crie um novo para começar.</p>";
      return;
    }

    templates.forEach(template => {
      templateList.appendChild(createTemplateElement(template));
    });

  } catch (err) {
    console.error("❌ Erro ao carregar templates:", err);
    showModal("Erro ao carregar templates. (Veja console)", "error");
  }
}

function editarTemplate(uuid) {
  // Redireciona para a página de configuração, passando o UUID como parâmetro
  window.location.href = `config.html?template=${uuid}`;
}

async function confirmarExclusao(id) {
  if (confirm("Tem certeza que deseja excluir este template? Esta ação é irreversível.")) {
    await excluirTemplate(id);
  }
}

async function excluirTemplate(id) {
  try {
    const res = await fetch(`/api/templates?id=${id}`, {
      method: 'DELETE',
    });
    
    if (res.status === 302) { 
      window.location.href = "index.html"; 
      return;
    }
    if (!res.ok) throw new Error("Falha ao excluir template");
    
    showModal("✅ Template excluído com sucesso!", "success");
    await loadTemplates(); // Recarrega a lista
  } catch (err) {
    console.error("❌ Erro ao excluir template:", err);
    showModal("Erro ao excluir template. (Veja console)", "error");
  }
}

async function novoTemplate() {
  // Redireciona para config.html sem UUID para criar um novo
  window.location.href = "config.html";
}

function copiarLink(url) {
  navigator.clipboard.writeText(url)
    .then(() => showModal("✅ Link copiado para a área de transferência!", "success"))
    .catch(err => {
      console.error('Erro ao copiar:', err);
      showModal("❌ Erro ao copiar link. Tente manualmente: " + url, "error");
    });
}

// ===========================
// 👤 PERFIL
// ===========================

async function loadProfile(userId) {
  const supabase = await waitForSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error("Erro ao carregar perfil:", error);
    // showModal("Erro ao carregar perfil. (Veja console)", "error");
    return;
  }
  
  currentProfile = data;
  fillProfileForm(data);
  updateWelcomeMessage(data.nome_admin || loggedInUser.email);
}

function fillProfileForm(profile) {
  document.getElementById("perfil_apresentacao").value = profile.apresentacao || '';
  document.getElementById("perfil_nome").value = profile.nome_profissional || '';
  document.getElementById("perfil_tipo").value = profile.tipo_fotografia || '';
  document.getElementById("perfil_instagram").value = profile.instagram || '';
  document.getElementById("perfil_whatsapp").value = profile.whatsapp_principal || '';
  document.getElementById("perfil_email").value = profile.email_recebimento || '';
  document.getElementById("subscriptionStatus").textContent = `Status: ${profile.status_assinatura || 'Desconhecido'}`;

  // Imagem de preview
  const preview = document.getElementById("profileImagePreview");
  const btnRemove = document.getElementById("perfil_btnRemoverImagem");

  if (profile.profile_image_url) {
    preview.src = profile.profile_image_url;
    preview.style.display = "block";
    btnRemove.style.display = "inline-block";
  } else {
    preview.style.display = "none";
    btnRemove.style.display = "none";
  }
}

async function saveProfile() {
  const supabase = await waitForSupabase();
  const userId = loggedInUser.id;
  const inputFile = document.getElementById("perfil_profileImageUpload");
  let imageUrl = currentProfile.profile_image_url;

  try {
    // 1. Upload da imagem, se houver
    const file = inputFile.files[0];
    if (file) {
      const fileName = `profile-${userId}-${Date.now()}.${file.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images') // Assumindo bucket 'images'
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) throw uploadError;

      // Obtém URL pública (pode variar dependendo da configuração do bucket)
      const { data: publicUrlData } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
      
      imageUrl = publicUrlData.publicUrl;
    }

    // 2. Monta objeto de update
    const profileUpdate = {
      apresentacao: document.getElementById("perfil_apresentacao").value.trim(),
      nome_profissional: document.getElementById("perfil_nome").value.trim(),
      tipo_fotografia: document.getElementById("perfil_tipo").value.trim(),
      instagram: document.getElementById("perfil_instagram").value.trim(),
      whatsapp_principal: document.getElementById("perfil_whatsapp").value.replace(/\D/g, ''), // remove não-dígitos
      email_recebimento: document.getElementById("perfil_email").value.trim(),
      profile_image_url: imageUrl || null
    };

    // 3. Salva no Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    showModal("✅ Perfil salvo com sucesso!", "success");
    await loadProfile(userId); // Recarrega para refletir as mudanças
  } catch (err) {
    console.error("❌ Erro ao salvar perfil:", err);
    showModal(`Erro ao salvar perfil: ${err.message}`, "error");
  }
}


function updateWelcomeMessage(name) {
  const welcomeEl = document.getElementById("welcomeMessage");
  if (welcomeEl) {
    // Limita o nome para evitar quebra de layout
    const shortName = name.split('@')[0].split(' ')[0];
    welcomeEl.textContent = `👋 Bem-vindo(a), ${shortName}`;
  }
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==============================
// LOGOUT (CORREÇÃO DE REDIRECIONAMENTO)
// ==============================
async function logout() {
  const supabase = await waitForSupabase();
  await supabase.auth.signOut(); // Limpa a sessão do Supabase (cliente)
  
  // CORREÇÃO: Redireciona para a rota /logout do Flask
  // O Flask limpará sua própria sessão e fará o redirect final para index.html
  window.location.href = "/logout";
}


/* ================== BOOT ================== */
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializa o Supabase e checa a autenticação (inicia o fluxo)
  await checkAuthAndLoadData(); 

  // Event listeners para navegação
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.querySelectorAll(".tab-pane").forEach((pane) => (pane.style.display = "none"));
      document.getElementById(tab).style.display = "block";
    });
  });

  // Botões
  document.getElementById("btnSair").addEventListener("click", logout);
  document.getElementById("btnNovoTemplate").addEventListener("click", novoTemplate);
  document.getElementById("btnSalvarPerfil").addEventListener("click", saveProfile);

  // Upload de imagem
  const inputFile = document.getElementById("perfil_profileImageUpload");
  const preview = document.getElementById("profileImagePreview");
  const btnRemove = document.getElementById("perfil_btnRemoverImagem");

  inputFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const base64 = await readImageFile(file);
      preview.src = base64;
      preview.style.display = "block";
      btnRemove.style.display = "inline-block";
      showModal("Pré-visualização atualizada. Clique em salvar.", "info");
    } catch (err) {
      console.error(err);
      showModal("Erro ao carregar imagem.", "error");
    }
  });

  btnRemove.addEventListener("click", () => {
    preview.src = "/static/img/placeholder.png"; // Volta para o placeholder
    preview.style.display = "block";
    btnRemove.style.display = "none";
    currentProfile.profile_image_url = null; // Remove a URL
    showModal("Imagem removida. Clique em salvar para confirmar.", "info");
    document.getElementById("perfil_profileImageUpload").value = ''; // Limpa o input
  });
});