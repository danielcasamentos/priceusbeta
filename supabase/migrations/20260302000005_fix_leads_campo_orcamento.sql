-- Corrigir nome do campo orcamento_detalhes para orcamento_detalhe (singular)
-- para manter consistência com o código frontend

-- Verificar se a coluna orcamento_detalhe já existe
DO $$ 
BEGIN
    -- Se existir a coluna com nome plural, renomear para singular
    IF EXISTS (SELECT FROM information_schema.columns 
               WHERE table_name = 'leads' AND column_name = 'orcamento_detalhes') THEN
        ALTER TABLE leads RENAME COLUMN orcamento_detalhes TO orcamento_detalhe;
    END IF;
    
    -- Se não existir nenhuma das duas, criar com nome correto
    IF NOT EXISTS (SELECT FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'orcamento_detalhe') THEN
        ALTER TABLE leads ADD COLUMN orcamento_detalhe JSONB DEFAULT '{}';
    END IF;
END $$;
