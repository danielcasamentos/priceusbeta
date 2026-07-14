#!/bin/bash
echo "=== Script de Replicação: Banco de Produção -> Docker Local ==="
read -s -p "Digite a senha do seu banco de dados do Supabase (Produção): " DB_PASSWORD
echo ""

# Nome do arquivo temporário
TEMP_FILE="backup_producao_temp.sql"

echo "1/2 📥 Realizando o backup (dump) do banco de produção..."
export PGPASSWORD="$DB_PASSWORD"
pg_dump "postgresql://postgres@db.vkwpcyahwzzeyesyytpa.supabase.co:5432/postgres" > "$TEMP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup da produção baixado com sucesso!"
  echo "2/2 ⚙️ Restaurando os dados no banco local do Docker (localhost:54322)..."
  
  export PGPASSWORD="postgres"
  # Limpa o banco local antes de importar para evitar conflitos de tabelas/dados existentes
  psql "postgresql://postgres@localhost:54322/postgres" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  psql "postgresql://postgres@localhost:54322/postgres" -f "$TEMP_FILE"
  
  if [ $? -eq 0 ]; then
    echo "✅ Banco de dados local (Docker) atualizado com sucesso com todos os dados da produção!"
    rm "$TEMP_FILE"
  else
    echo "❌ Erro ao restaurar os dados no Docker local."
  fi
else
  echo "❌ Erro ao conectar ou extrair os dados da produção. Verifique a senha digitada."
  if [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
  fi
fi
