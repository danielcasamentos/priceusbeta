#!/bin/bash
echo "=== Script de Replicação: Banco de Produção -> Docker Local ==="
echo "Você pode digitar a Senha do Banco de Dados OU colar a URL de Conexão (URI do Supabase)."
echo "Dica: A URI fica em Supabase Dashboard -> Project Settings -> Database -> Connection string (URI)"
echo ""
read -p "Digite a Senha ou cole a URL de Conexão: " INPUT_STR
echo ""

TEMP_FILE="backup_producao_temp.sql"

if [[ "$INPUT_STR" == postgresql://* ]] || [[ "$INPUT_STR" == postgres://* ]]; then
  CONNECTION_URI="$INPUT_STR"
  echo "1/2 📥 Realizando o backup (dump) via URI..."
  pg_dump "$CONNECTION_URI" > "$TEMP_FILE"
else
  ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent(process.argv[1]))" "$INPUT_STR")
  
  echo "1/2 📥 Tentando conexão via Supabase Pooler Session (sa-east-1:5432)..."
  pg_dump "postgresql://postgres.vkwpcyahwzzeyesyytpa:${ENCODED_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require" > "$TEMP_FILE"

  if [ $? -ne 0 ] || [ ! -s "$TEMP_FILE" ]; then
    echo "🔄 Tentando Pooler com usuário postgres padrão..."
    pg_dump "postgresql://postgres:${ENCODED_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?sslmode=require" > "$TEMP_FILE"
  fi

  if [ $? -ne 0 ] || [ ! -s "$TEMP_FILE" ]; then
    echo "🔄 Tentando conexão direta com SSL..."
    pg_dump "postgresql://postgres:${ENCODED_PASSWORD}@db.vkwpcyahwzzeyesyytpa.supabase.co:5432/postgres?sslmode=require" > "$TEMP_FILE"
  fi
fi

if [ $? -eq 0 ] && [ -s "$TEMP_FILE" ]; then
  echo "✅ Backup da produção baixado com sucesso!"
  echo "2/2 ⚙️ Restaurando os dados no banco local do Docker (localhost:54322)..."
  
  export PGPASSWORD="postgres"
  psql -h localhost -p 54322 -U postgres -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >/dev/null 2>&1
  psql -h localhost -p 54322 -U postgres -d postgres -f "$TEMP_FILE" >/dev/null 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✅ Banco de dados local (Docker) atualizado com sucesso com todos os dados da produção!"
    rm -f "$TEMP_FILE"
  else
    echo "❌ Erro ao restaurar os dados no Docker local."
  fi
else
  echo "❌ Erro ao conectar ao banco Supabase."
  if [ -f "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
  fi
fi
