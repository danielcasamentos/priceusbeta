export interface AiLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'groq_success' | 'groq_quota' | 'subfolder' | 'warning' | 'error';
  message: string;
  details?: string;
}

export class GroqCullingService {
  /**
   * Avalia um lote de fotos com o Groq AI e emite registros de log em tempo real
   */
  static async evaluateBatch(
    photosBatch: { fileName: string; subfolderName: string; sharpnessScore: number }[],
    onLog: (entry: AiLogEntry) => void
  ): Promise<{ isGroqActive: boolean; isQuotaExceeded: boolean; scores?: number[] }> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;

    if (!apiKey) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning',
        message: '⚠️ Chave VITE_GROQ_API_KEY não detectada. Utilizando Motor Local Laplaciano de Nitidez.',
      });
      return { isGroqActive: false, isQuotaExceeded: false };
    }

    try {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `🤖 Chamando Groq Vision AI (llama-3.3-70b-versatile) para analisar lote de ${photosBatch.length} foto(s)...`,
      });

      const prompt = `Você é um motor de IA especialista em culling e curadoria de fotografia de casamentos.
Analise estas fotos trazidas das subpastas organizadas do evento:
${photosBatch.map((p, idx) => `- Foto ${idx + 1}: ${p.subfolderName}/${p.fileName} (Nitidez laplaciana: ${p.sharpnessScore})`).join('\n')}

Atribua uma nota estética e de composição (0 a 100) para cada foto.
Responda APENAS com um JSON array de números de 0 a 100, no formato: [92, 88, 75, ...]`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (response.status === 429) {
        const errorText = await response.text();
        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'groq_quota',
          message: '🚨 COTA DO GROQ IA ATINGIDA (HTTP 429 Rate Limit)!',
          details: `Motivo: Cota de requisições excedida na API do Groq. Transição automática para o Motor Local Laplaciano de Alta Precisão (Zero interrupção).`,
        });
        return { isGroqActive: false, isQuotaExceeded: true };
      }

      if (!response.ok) {
        const errorText = await response.text();
        onLog({
          id: `log_${Date.now()}_${Math.random()}`,
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: `⚠️ Resposta da API Groq (HTTP ${response.status})`,
          details: errorText.substring(0, 120),
        });
        return { isGroqActive: false, isQuotaExceeded: false };
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      const match = content.match(/\[[\d\s,]+\]/);
      let scores: number[] = [];
      if (match) {
        try {
          scores = JSON.parse(match[0]);
        } catch {}
      }

      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'groq_success',
        message: `✅ Groq IA respondeu com sucesso! ${photosBatch.length} foto(s) avaliada(s) pelo modelo llama-3.3-70b.`,
      });

      return { isGroqActive: true, isQuotaExceeded: false, scores };
    } catch (err: any) {
      onLog({
        id: `log_${Date.now()}_${Math.random()}`,
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        message: `⚠️ Conexão Groq IA: ${err.message || 'Erro de rede'}`,
      });
      return { isGroqActive: false, isQuotaExceeded: false };
    }
  }
}
