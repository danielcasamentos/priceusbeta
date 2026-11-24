import os
import logging
from functools import wraps
from dotenv import load_dotenv
from flask import (
    Flask, jsonify, request, session, redirect,
    render_template, url_for
)
from flask_cors import CORS
from supabase import create_client, Client
# Removendo todas as importações específicas de erros (gotrue, postgrest) para evitar ModuleNotFoundError.
# Usaremos tratamento de exceção mais genérico com verificação de status code.

# ---------------------------------------------
# 1. Configuração inicial
# ---------------------------------------------
load_dotenv()

# Carregamento de TODAS as variáveis de ambiente necessárias
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE") # CHAVE CRÍTICA
SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "troque_esta_chave_em_producao_forte")

# Verificação essencial
if not SUPABASE_URL or not SUPABASE_KEY or not SERVICE_ROLE_KEY:
    raise RuntimeError(
        "As variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE devem estar definidas no .env"
    )

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = SECRET_KEY
CORS(app, resources={r"/*": {"origins": "*"}})

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cliente Supabase Padrão (usa ANON_KEY)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cliente Supabase Admin (usa SERVICE_ROLE_KEY para validação de token e operações seguras)
supabase_admin: Client = create_client(SUPABASE_URL, SERVICE_ROLE_KEY)


# ---------------------------------------------
# 2. Helpers
# ---------------------------------------------
def get_current_user():
    """Retorna o objeto de usuário da sessão Flask ou None."""
    return session.get("user")

def login_required(f):
    """Decorator para exigir que o usuário esteja logado (sessão Flask ativa)."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user or not user.get("id"):
            # Se não houver sessão Flask, redireciona para a página de login
            return redirect(url_for("serve_login_page"))
        # Passa o objeto user para a função decorada
        return f(*args, user=user, **kwargs)
    return decorated_function

# ---------------------------------------------
# 3. Rotas de Renderização (Páginas HTML)
# ---------------------------------------------

@app.route("/")
@app.route("/index.html")
def serve_login_page():
    """Página inicial/Login."""
    # Redireciona para o dashboard se já houver uma sessão Flask
    if get_current_user():
        return redirect(url_for("serve_dashboard"))
    return render_template("Index.html")

@app.route("/dashboard.html")
@login_required
def serve_dashboard(user):
    """Dashboard principal (requer login)."""
    return render_template("dashboard.html")

@app.route("/config.html")
@login_required
def serve_config_page(user):
    """Página de configuração de template (requer login)."""
    return render_template("config.html")

@app.route("/orcamento/<template_id>")
def serve_user_page(template_id):
    """Página de orçamento para o cliente (acesso público)."""
    # Esta página é acessada pelo cliente final e não requer login
    return render_template("user.html", template_id=template_id)


@app.route("/logout")
def serve_logout_page():
    """Rota para limpar a sessão Flask após o logout do cliente."""
    session.pop("user", None)
    logger.info("✅ Sessão Flask encerrada via rota /logout. Redirecionando para index.")
    return redirect(url_for("serve_login_page"))


# ---------------------------------------------
# 4. Rotas de Autenticação (Login/Sincronização)
# ---------------------------------------------

@app.route("/api/login", methods=["POST"])
def api_login():
    """
    Sincroniza a sessão Supabase (token JWT) com a sessão Flask,
    usando a SERVICE_ROLE_KEY para validação segura.
    """
    data = request.get_json()
    token = data.get("token")
    email = data.get("email", "unknown") 

    if not token:
        logger.error("❌ Tentativa de login sem token JWT.")
        return jsonify({"error": "Token não fornecido"}), 400

    # 1. Validação do Token no Supabase (Usando a Chave de Serviço)
    try:
        # get_user() usa o token JWT para buscar o usuário. Se falhar, lança uma exceção.
        user_response = supabase_admin.auth.get_user(token)
        user = user_response.user
        
        if not user:
             raise Exception("Token inválido: Usuário não pôde ser recuperado.")
        
        # 2. Criação da sessão Flask
        session["user"] = {
            "id": user.id,
            "email": user.email or email 
        }
        logger.info(f"✅ Sessão Flask sincronizada e criada para: {user.email}")
        return jsonify({"success": True}), 200

    except Exception as e:
        # Tratamento de Exceção Genérico: verifica a mensagem de erro para o status 401
        error_message = str(e)
        if "401" in error_message or "Invalid JWT" in error_message or "JWT expired" in error_message:
            logger.error(f"❌ Erro 401: Token Supabase inválido/expirado para {email}. Mensagem: {error_message}")
            return jsonify({"error": "Sessão inválida. Faça o login novamente."}), 401
        
        logger.error(f"❌ Erro interno inesperado ao sincronizar sessão para {email}: {e}")
        return jsonify({"error": "Erro interno do servidor."}), 500


@app.route("/api/logout", methods=["POST"])
def api_logout():
    """Limpa a sessão Flask (chamada pelo JS)."""
    session.pop("user", None)
    logger.info("✅ Sessão Flask encerrada (via /api/logout).")
    return jsonify({"success": True}), 200

# ---------------------------------------------
# 5. Rotas de API (Acesso a Dados)
# ---------------------------------------------

@app.route("/api/templates", methods=["GET", "POST", "DELETE"])
@login_required
def api_templates(user):
    """Gerencia Templates (GET, POST, DELETE)."""
    try:
        if request.method == "POST":
            data = request.get_json()
            
            # Estrutura de dados simplificada para templates (garante user_id)
            payload = {
                "user_id": user["id"],
                "nome_template": data.get("nome_template", "Novo Template"),
                "produtos": data.get("produtos", []),
                "formas_pagamento": data.get("formas_pagamento", []),
                "campos": data.get("campos", []),
                "cupons": data.get("cupons", []),
                "acrescimos_sazonais": data.get("acrescimos_sazonais", []),
                "acrescimos_localidade": data.get("acrescimos_localidade", [])
            }
            # Insere no banco de dados
            resp = supabase.table("templates").insert(payload).execute()
            
            # Verifica se a inserção foi bem-sucedida
            if resp.data and len(resp.data) > 0:
                return jsonify({"success": True, "data": resp.data[0]}), 201
            else:
                 # Erro de Postgrest
                 return jsonify({"error": "Nenhum dado retornado após a inserção."}), 500


        elif request.method == "DELETE":
            template_id = request.args.get("id")
            if not template_id:
                return jsonify({"error": "Parâmetro 'id' obrigatório"}), 400
                
            # Deleta apenas templates pertencentes ao usuário
            resp = supabase.table("templates").delete().eq("id", template_id).eq("user_id", user["id"]).execute()
            return jsonify({"success": True, "deleted_count": len(resp.data)}), 200

        else: # GET
            # Retorna todos os templates do usuário logado
            # Seleciona apenas campos essenciais para a lista de templates
            resp = supabase.table("templates").select("id, user_id, nome_template, created_at").eq("user_id", user["id"]).execute()
            return jsonify({"data": resp.data}), 200

    except Exception as e:
        logger.error(f"❌ Erro na API /templates: {e}")
        # Simplificamos o tratamento de erro aqui também
        return jsonify({"error": "Erro interno do servidor ao acessar templates."}), 500


# ---------------------------------------------
# 6. Utilidades
# ---------------------------------------------

@app.route("/api/env", methods=["GET"])
def api_env():
    """
    Retorna as chaves públicas necessárias para o frontend.
    NUNCA exponha a SERVICE_ROLE_KEY nesta rota.
    """
    return jsonify({
        "SUPABASE_URL": SUPABASE_URL,
        "SUPABASE_ANON_KEY": SUPABASE_KEY
    })

@app.route("/status")
def status():
    """Verificação simples de status do servidor."""
    is_logged_in = bool(get_current_user())
    user_id = get_current_user().get("id") if is_logged_in else "n/a"
    return jsonify({
        "status": "ok", 
        "env": "flask", 
        "user_logged_in": is_logged_in, 
        "user_id": user_id
    })


# ---------------------------------------------
# 7. Inicialização
# ---------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=3000)