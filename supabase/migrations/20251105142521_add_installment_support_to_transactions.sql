/*
  # Add Installment Support to Company Transactions

  1. Schema Changes
    - Add parent_transaction_id to link installment transactions together
    - Add is_installment boolean flag to identify installment transactions
    - Add installment_number to track which installment this is (e.g., 1 of 6)
    - Add total_installments to track total number of installments
    - Add index for parent_transaction_id for efficient querying

  2. Purpose
    - Enable credit card installment payments (parcelas)
    - Link related installment transactions together
    - Display installment information (e.g., "Parcela 3/12")
    - Allow querying all installments from a parent transaction

  3. Security
    - No RLS changes needed (existing policies cover new fields)
*/

-- Add new columns for installment support
DO $$
BEGIN
  -- Add parent_transaction_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_transactions' AND column_name = 'parent_transaction_id'
  ) THEN
    ALTER TABLE company_transactions 
    ADD COLUMN parent_transaction_id uuid REFERENCES company_transactions(id) ON DELETE CASCADE;
  END IF;

  -- Add is_installment flag if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_transactions' AND column_name = 'is_installment'
  ) THEN
    ALTER TABLE company_transactions 
    ADD COLUMN is_installment boolean DEFAULT false NOT NULL;
  END IF;

  -- Add installment_number if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_transactions' AND column_name = 'installment_number'
  ) THEN
    ALTER TABLE company_transactions 
    ADD COLUMN installment_number integer;
  END IF;

  -- Add total_installments if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_transactions' AND column_name = 'total_installments'
  ) THEN
    ALTER TABLE company_transactions 
    ADD COLUMN total_installments integer;
  END IF;
END $$;

-- Create index for parent_transaction_id for efficient queries
CREATE INDEX IF NOT EXISTS idx_company_transactions_parent 
  ON company_transactions(parent_transaction_id);

-- Create index for installment queries
CREATE INDEX IF NOT EXISTS idx_company_transactions_installment 
  ON company_transactions(is_installment, parent_transaction_id);

-- Add constraint to ensure installment fields are consistent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'installment_fields_consistency'
  ) THEN
    ALTER TABLE company_transactions
    ADD CONSTRAINT installment_fields_consistency 
    CHECK (
      (is_installment = false AND installment_number IS NULL AND total_installments IS NULL AND parent_transaction_id IS NULL)
      OR
      (is_installment = true AND installment_number > 0 AND total_installments > 0 AND installment_number <= total_installments)
    );
  END IF;
END $$;