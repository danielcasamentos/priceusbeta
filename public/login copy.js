// login.js - FINAL COM REDIRECIONAMENTO CORRIGIDO E BACKEND SINCRONIZADO
let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  try {
    // Busca variáveis de ambiente do backend Flask
    const res = await fetch("/api/env");
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = await res.json();
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error("Variáveis inválidas");

    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    console.log("✅ Supabase inicializado");
    return supabaseClient;
  } catch (err) {
    console.error("❌ Falha ao inicializar Supabase:", err);
    alert("Erro ao carregar configuração do servidor.");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("login-form");
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("password-input");
  const errorMessage = document.getElementById("error-message");
  const registerBtn = document.getElementById("btnRegister");

  await initSupabase();

  if (errorMessage) errorMessage.style.display = "none";

  // 🔹 Verifica sessão ativa e SINCRONIZA com backend (CORREÇÃO CRÍTICA)
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (sessionData?.session?.user) {
    console.log("✅ Sessão ativa detectada:", sessionData.session.user.email);
    console.log("Sincronizando sessão com o backend Flask...");

    try {
      const token = sessionData.session.access_token;
      const email = sessionData.session.user.email;

      // Chama o /api/login para criar a sessão do Flask
      const syncRes = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      if (!syncRes.ok) {
        throw new Error("Falha ao sincronizar sessão com o backend Flask.");
      }
      
      console.log("✅ Sessão Flask sincronizada. Redirecionando para /dashboard.html");
      window.location.href = "dashboard.html";
      return;

    } catch (err) {
      console.error("❌ Erro ao sincronizar sessão existente:", err);
      // Limpa a sessão do Supabase (para remover o token inválido)
      await supabaseClient.auth.signOut();
      alert("Houve um erro ao validar sua sessão. Por favor, faça login novamente.");
      // Força a recarga para exibir o formulário limpo
      window.location.reload(); 
    }
    
  } else {
    console.log("Nenhuma sessão ativa encontrada. Exibindo formulário de login.");
  }

  // 🔹 LOGIN (quando o usuário clica no botão)
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMessage.style.display = "none";
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();

      try {
        const {
          data: { user },
          error: loginError,
        } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw new Error(loginError.message);
        
        // Sincroniza a sessão recém-criada com o Flask
        const token = (await supabaseClient.auth.getSession()).data.session.access_token;
        await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, token }),
        });

        console.log("✅ Login completo, redirecionando...");
        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("❌ Erro no login:", error.message);
        errorMessage.textContent = `❌ ${error.message}`;
        errorMessage.style.display = "block";
      }
    });
  }

  // 🔹 CADASTRO
  if (registerBtn) {
    registerBtn.addEventListener("click", async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value.trim();
      if (!email || password.length < 6) {
        alert("Preencha um email válido e uma senha com no mínimo 6 caracteres.");
        return;
      }
      try {
        const { data: userData, error: signUpError } = await supabaseClient.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw new Error(signUpError.message);

        if (userData.user) {
          await supabaseClient.from("profiles").insert({
            id: userData.user.id,
            nome_admin: email.split("@")[0],
            status_assinatura: "trial",
          });
        }
        alert("✅ Cadastro realizado! Faça login para continuar.");
      } catch (error) {
        console.error("❌ Erro no cadastro:", error.message);
        errorMessage.textContent = `❌ ${error.message}`;
        errorMessage.style.display = "block";
      }
    });
  }
});