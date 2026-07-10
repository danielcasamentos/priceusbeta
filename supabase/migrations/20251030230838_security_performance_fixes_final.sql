/*
  # Security and Performance Fixes
  
  Fixes 40+ security and performance issues:
  ✓ 3 missing foreign key indexes
  ✓ 37 RLS policies optimized
  ✓ 4 functions secured
  
  Impact:
  - Better query performance
  - RLS policies execute once per query (not per row)
  - Protected against search_path attacks
*/

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_acrescimos_localidade_template_id ON acrescimos_localidade(template_id);
CREATE INDEX IF NOT EXISTS idx_acrescimos_sazonais_template_id ON acrescimos_sazonais(template_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_user_id ON formas_pagamento(user_id);

-- ==================== PROFILES ====================

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- ==================== TEMPLATES ====================

DROP POLICY IF EXISTS "Users can read own templates" ON templates;
CREATE POLICY "Users can read own templates" ON templates FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create templates" ON templates;
CREATE POLICY "Users can create templates" ON templates FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own templates" ON templates;
CREATE POLICY "Users can update own templates" ON templates FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
CREATE POLICY "Users can delete own templates" ON templates FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== PRODUTOS ====================

DROP POLICY IF EXISTS "Users can manage own template products" ON produtos;
CREATE POLICY "Users can manage own template products" ON produtos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = produtos.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = produtos.template_id AND templates.user_id = (SELECT auth.uid())));

-- ==================== LEADS ====================

DROP POLICY IF EXISTS "Users can read own leads" ON leads;
CREATE POLICY "Users can read own leads" ON leads FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = leads.template_id AND templates.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can update own leads" ON leads;
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = leads.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = leads.template_id AND templates.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can delete own leads" ON leads;
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = leads.template_id AND templates.user_id = (SELECT auth.uid())));

-- ==================== CAMPOS ====================

DROP POLICY IF EXISTS "Users can manage own template fields" ON campos;
CREATE POLICY "Users can manage own template fields" ON campos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = campos.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = campos.template_id AND templates.user_id = (SELECT auth.uid())));

-- ==================== FORMAS_PAGAMENTO ====================

DROP POLICY IF EXISTS "Users can manage own payment methods" ON formas_pagamento;
CREATE POLICY "Users can manage own payment methods" ON formas_pagamento FOR ALL TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ==================== CUPONS ====================

DROP POLICY IF EXISTS "Users can manage own coupons" ON cupons;
CREATE POLICY "Users can manage own coupons" ON cupons FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = cupons.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = cupons.template_id AND templates.user_id = (SELECT auth.uid())));

-- ==================== ACRESCIMOS ====================

DROP POLICY IF EXISTS "Users can manage seasonal charges" ON acrescimos_sazonais;
CREATE POLICY "Users can manage seasonal charges" ON acrescimos_sazonais FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = acrescimos_sazonais.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = acrescimos_sazonais.template_id AND templates.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can manage location charges" ON acrescimos_localidade;
CREATE POLICY "Users can manage location charges" ON acrescimos_localidade FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM templates WHERE templates.id = acrescimos_localidade.template_id AND templates.user_id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM templates WHERE templates.id = acrescimos_localidade.template_id AND templates.user_id = (SELECT auth.uid())));

-- ==================== PAISES ====================

DROP POLICY IF EXISTS "Usuários podem ver próprios países" ON paises;
CREATE POLICY "Usuários podem ver próprios países" ON paises FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem criar próprios países" ON paises;
CREATE POLICY "Usuários podem criar próprios países" ON paises FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem atualizar próprios países" ON paises;
CREATE POLICY "Usuários podem atualizar próprios países" ON paises FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem deletar próprios países" ON paises;
CREATE POLICY "Usuários podem deletar próprios países" ON paises FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== ESTADOS ====================

DROP POLICY IF EXISTS "Usuários podem ver próprios estados" ON estados;
CREATE POLICY "Usuários podem ver próprios estados" ON estados FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem criar próprios estados" ON estados;
CREATE POLICY "Usuários podem criar próprios estados" ON estados FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem atualizar próprios estados" ON estados;
CREATE POLICY "Usuários podem atualizar próprios estados" ON estados FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem deletar próprios estados" ON estados;
CREATE POLICY "Usuários podem deletar próprios estados" ON estados FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== CIDADES_AJUSTE ====================

DROP POLICY IF EXISTS "Usuários podem ver próprias cidades" ON cidades_ajuste;
CREATE POLICY "Usuários podem ver próprias cidades" ON cidades_ajuste FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem criar próprias cidades" ON cidades_ajuste;
CREATE POLICY "Usuários podem criar próprias cidades" ON cidades_ajuste FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem atualizar próprias cidades" ON cidades_ajuste;
CREATE POLICY "Usuários podem atualizar próprias cidades" ON cidades_ajuste FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem deletar próprias cidades" ON cidades_ajuste;
CREATE POLICY "Usuários podem deletar próprias cidades" ON cidades_ajuste FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== TEMPORADAS ====================

DROP POLICY IF EXISTS "Usuários podem ver próprias temporadas" ON temporadas;
CREATE POLICY "Usuários podem ver próprias temporadas" ON temporadas FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem criar próprias temporadas" ON temporadas;
CREATE POLICY "Usuários podem criar próprias temporadas" ON temporadas FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem atualizar próprias temporadas" ON temporadas;
CREATE POLICY "Usuários podem atualizar próprias temporadas" ON temporadas FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuários podem deletar próprias temporadas" ON temporadas;
CREATE POLICY "Usuários podem deletar próprias temporadas" ON temporadas FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== STRIPE ====================

DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data" ON stripe_customers FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data" ON stripe_subscriptions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM stripe_customers WHERE stripe_customers.customer_id = stripe_subscriptions.customer_id AND stripe_customers.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS "Users can view their own order data" ON stripe_orders;
CREATE POLICY "Users can view their own order data" ON stripe_orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM stripe_customers WHERE stripe_customers.customer_id = stripe_orders.customer_id AND stripe_customers.user_id = (SELECT auth.uid())));

-- ==================== FUNCTIONS ====================

CREATE OR REPLACE FUNCTION public.set_trial_expiration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.trial_end := NOW() + INTERVAL '14 days';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_trial_expired(user_id_param UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE trial_end_date TIMESTAMPTZ;
BEGIN
  SELECT trial_end INTO trial_end_date FROM profiles WHERE id = user_id_param;
  IF trial_end_date IS NULL THEN RETURN FALSE; END IF;
  RETURN NOW() > trial_end_date;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_days_remaining(user_id_param UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_end_date TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT trial_end INTO trial_end_date FROM profiles WHERE id = user_id_param;
  IF trial_end_date IS NULL THEN RETURN 0; END IF;
  days_remaining := EXTRACT(DAY FROM (trial_end_date - NOW()));
  IF days_remaining < 0 THEN RETURN 0; END IF;
  RETURN days_remaining;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
