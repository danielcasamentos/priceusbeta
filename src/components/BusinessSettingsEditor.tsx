import { CompanyDataEditor } from './company/CompanyDataEditor';

interface BusinessSettingsEditorProps {
  userId: string;
}

export function BusinessSettingsEditor({ userId }: BusinessSettingsEditorProps) {
  return (
    // Este componente agora renderiza diretamente o editor de dados da empresa,
    // pois a navegação por abas foi movida para o DashboardPage.
    <CompanyDataEditor userId={userId} />
  );
}
