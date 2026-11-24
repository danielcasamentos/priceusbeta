CREATE OR REPLACE FUNCTION get_public_contract_data(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contract record;
  v_template record;
  v_business_settings record;
  v_result json;
BEGIN
  -- Get the contract using the token
  SELECT * INTO v_contract
  FROM public.contracts
  WHERE token = p_token;

  -- If contract not found, return null
  IF NOT FOUND THEN
    RETURN null;
  END IF;

  -- Get the associated template
  SELECT * INTO v_template
  FROM public.contract_templates
  WHERE id = v_contract.template_id;

  -- Get the user's business settings
  SELECT * INTO v_business_settings
  FROM public.user_business_settings
  WHERE user_id = v_contract.user_id;

  -- Build the JSON response
  v_result := json_build_object(
    'contract', row_to_json(v_contract),
    'template', row_to_json(v_template),
    'business_settings', row_to_json(v_business_settings)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_contract_data(uuid) TO anon, authenticated;

COMMENT ON FUNCTION get_public_contract_data(uuid) IS 'Fetches all necessary data for a public contract signing page using a secure token.';
