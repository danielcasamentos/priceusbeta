# Exemplo de Contrato - Antes e Depois

Este documento mostra como o sistema de variáveis funciona na prática.

## ANTES (Template com Variáveis)

Quando você cria o template, usa as variáveis:

```
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FOTOGRAFIA

CONTRATADO:
Nome: {{NOME_PRESTADOR}}
CNPJ: {{CNPJ_PRESTADOR}}
Endereço: {{ENDERECO_PRESTADOR}}
Cidade: {{CIDADE_PRESTADOR}}/{{ESTADO_PRESTADOR}}
CEP: {{CEP_PRESTADOR}}
Telefone: {{TELEFONE_PRESTADOR}}
Email: {{EMAIL_PRESTADOR}}

CONTRATANTE:
Nome: {{NOME_COMPLETO_CLIENTE}}
CPF: {{CPF_CLIENTE}}
RG: {{RG_CLIENTE}}
Endereço: {{ENDERECO_COMPLETO_CLIENTE}}
CEP: {{CEP_CLIENTE}}
Telefone: {{TELEFONE_CLIENTE}}
Email: {{EMAIL_CLIENTE}}

OBJETO DO CONTRATO:

O CONTRATADO prestará serviços de fotografia profissional conforme especificado:

Data do Evento: {{DATA_EVENTO}}
Local: {{LOCAL_EVENTO}}
Endereço: {{ENDERECO_EVENTO}}
Cidade: {{CIDADE_EVENTO}}
Horário: {{HORARIO_INICIO}} às {{HORARIO_FIM}}

SERVIÇOS INCLUSOS:
{{SERVICOS_LISTA}}

PRODUTOS INCLUSOS:
{{PRODUTOS_LISTA}}

{{DESCONTO_CUPOM}}

VALOR TOTAL: {{VALOR_TOTAL}}

FORMA DE PAGAMENTO:
{{FORMA_PAGAMENTO}}

DADOS PARA PAGAMENTO:
PIX: {{PIX_PRESTADOR}}
Banco: {{BANCO_PRESTADOR}}
Agência: {{AGENCIA_PRESTADOR}}
Conta: {{CONTA_PRESTADOR}}

OBSERVAÇÕES DO CLIENTE:
{{OBSERVACOES_CLIENTE}}

CLÁUSULA 1 - DO PRAZO
O prazo para entrega das fotos editadas é de 90 dias úteis contados a partir da data do evento.

CLÁUSULA 2 - DA RESPONSABILIDADE
O CONTRATADO não se responsabiliza por situações de força maior que impeçam a realização dos serviços.

CLÁUSULA 3 - DOS DIREITOS AUTORAIS
As imagens produzidas são de propriedade do CONTRATADO, sendo concedida ao CONTRATANTE licença de uso pessoal.

Por estarem de acordo, firmam o presente contrato.
```

## DEPOIS (Contrato Assinado pelo Cliente)

Após o cliente preencher os dados e assinar, o contrato fica assim:

```
CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FOTOGRAFIA

CONTRATADO:
Nome: Daniel Azevedo Fotografia
CNPJ: 32.737.434/0001-65
Endereço: Rua Coronel João Cândido de Aguiar, 201, Centro
Cidade: Patrocínio/MG
CEP: 38740-000
Telefone: (34) 9 9904-8840
Email: contato@danielfotografia.com.br

CONTRATANTE:
Nome: João Pedro Silva Santos
CPF: 123.456.789-00
RG: MG-12.345.678
Endereço: Rua das Flores, 456, Apto 302, Bairro Jardim América
CEP: 38730-000
Telefone: (34) 9 8765-4321
Email: joao.santos@email.com

OBJETO DO CONTRATO:

O CONTRATADO prestará serviços de fotografia profissional conforme especificado:

Data do Evento: 15/06/2025
Local: Fazenda Vista Alegre
Endereço: Rodovia BR-365, Km 12, Zona Rural
Cidade: Patrocínio/MG
Horário: 15:00 às 23:00

SERVIÇOS INCLUSOS:
- Cobertura Completa do Casamento: R$ 3.500,00
- Ensaio Pré-Wedding: R$ 800,00
- Vídeo Highlights: R$ 1.200,00

PRODUTOS INCLUSOS:
- Álbum Premium 30x40 - 50 páginas: R$ 1.500,00
- Pendrive Personalizado: R$ 150,00
- 100 Fotos Impressas 15x21: R$ 350,00

Desconto aplicado: R$ 500,00

VALOR TOTAL: R$ 7.000,00

FORMA DE PAGAMENTO:
Sinal de R$ 2.000,00 na assinatura do contrato
Parcela de R$ 2.500,00 em 30 dias antes do evento
Saldo de R$ 2.500,00 no dia do evento

DADOS PARA PAGAMENTO:
PIX: 34999048840
Banco: Nubank (Nu Pagamentos S.A.)
Agência: 0001
Conta: 8423092-5

OBSERVAÇÕES DO CLIENTE:
Favor chegar 1 hora antes para fotos dos preparativos.
Fazer fotos especiais com os avós.
Lista de fotos obrigatórias será enviada por WhatsApp.

CLÁUSULA 1 - DO PRAZO
O prazo para entrega das fotos editadas é de 90 dias úteis contados a partir da data do evento.

CLÁUSULA 2 - DA RESPONSABILIDADE
O CONTRATADO não se responsabiliza por situações de força maior que impeçam a realização dos serviços.

CLÁUSULA 3 - DOS DIREITOS AUTORAIS
As imagens produzidas são de propriedade do CONTRATADO, sendo concedida ao CONTRATANTE licença de uso pessoal.

Por estarem de acordo, firmam o presente contrato.

---
ASSINATURA DIGITAL

[Imagem da Assinatura]

Assinado em: 05/11/2025, 14:23:15
IP: 177.85.3.190
Código de verificação: https://priceus.com/contrato/abc123def456

QR Code para verificação de autenticidade:
[QR Code]
```

## Comparação: O Que Mudou

### Dados do Prestador (VOCÊ)
| Variável | Valor Substituído |
|----------|-------------------|
| `{{NOME_PRESTADOR}}` | Daniel Azevedo Fotografia |
| `{{CNPJ_PRESTADOR}}` | 32.737.434/0001-65 |
| `{{ENDERECO_PRESTADOR}}` | Rua Coronel João Cândido de Aguiar, 201, Centro |
| `{{CIDADE_PRESTADOR}}` | Patrocínio |
| `{{ESTADO_PRESTADOR}}` | MG |
| `{{PIX_PRESTADOR}}` | 34999048840 |
| `{{BANCO_PRESTADOR}}` | Nubank |

### Dados do Cliente
| Variável | Valor Preenchido pelo Cliente |
|----------|------------------------------|
| `{{NOME_COMPLETO_CLIENTE}}` | João Pedro Silva Santos |
| `{{CPF_CLIENTE}}` | 123.456.789-00 |
| `{{RG_CLIENTE}}` | MG-12.345.678 |
| `{{ENDERECO_COMPLETO_CLIENTE}}` | Rua das Flores, 456, Apto 302 |
| `{{TELEFONE_CLIENTE}}` | (34) 9 8765-4321 |

### Dados do Evento
| Variável | Valor Preenchido |
|----------|------------------|
| `{{DATA_EVENTO}}` | 15/06/2025 |
| `{{LOCAL_EVENTO}}` | Fazenda Vista Alegre |
| `{{ENDERECO_EVENTO}}` | Rodovia BR-365, Km 12 |
| `{{HORARIO_INICIO}}` | 15:00 |
| `{{HORARIO_FIM}}` | 23:00 |
| `{{OBSERVACOES_CLIENTE}}` | Chegar 1 hora antes... |

### Dados Financeiros
| Variável | Valor Calculado |
|----------|-----------------|
| `{{SERVICOS_LISTA}}` | Lista com 3 serviços |
| `{{PRODUTOS_LISTA}}` | Lista com 3 produtos |
| `{{DESCONTO_CUPOM}}` | R$ 500,00 |
| `{{VALOR_TOTAL}}` | R$ 7.000,00 |
| `{{FORMA_PAGAMENTO}}` | Descrição do parcelamento |

## Vantagens do Sistema

### Para Você (Prestador)

✅ **Configure uma vez, use sempre**
- Cadastra seus dados empresariais uma única vez
- Todos os contratos usam automaticamente seus dados
- Atualiza em um lugar, reflete em todos os contratos

✅ **Profissionalismo**
- Contratos completos e bem formatados
- Todas as informações necessárias incluídas
- Aparência profissional e confiável

✅ **Economiza tempo**
- Não precisa editar cada contrato manualmente
- Sistema substitui tudo automaticamente
- Gera PDF pronto em segundos

### Para o Cliente

✅ **Facilidade**
- Recebe contrato já com os dados do prestador
- Só preenche seus próprios dados
- Interface simples e intuitiva

✅ **Transparência**
- Vê todos os detalhes do serviço
- Valores, prazos e condições claros
- Pode baixar PDF a qualquer momento

✅ **Segurança**
- Assinatura digital com timestamp
- IP registrado para autenticidade
- QR Code para verificação

## Fluxo Real de Uso

### Passo 1: Você (Uma Vez)
1. Acessa "Dados Empresariais"
2. Preenche: nome, CNPJ, endereço, telefone, PIX, banco
3. Salva

### Passo 2: Você (Para Cada Tipo de Contrato)
1. Acessa "Contratos"
2. Cria template usando variáveis
3. Salva template

### Passo 3: Você (Para Cada Cliente)
1. Cria orçamento no sistema
2. Cliente aceita orçamento
3. Gera contrato para o cliente
4. Envia link por WhatsApp

### Passo 4: Cliente
1. Abre link do contrato
2. Vê seus dados empresariais já preenchidos
3. Preenche dados pessoais e do evento
4. Assina digitalmente
5. Baixa PDF completo

### Resultado Final
✅ Contrato assinado com TODOS os dados
✅ PDF profissional e completo
✅ Registro de data/hora/IP da assinatura
✅ QR Code para verificação
✅ Ambas as partes têm cópia

## Dicas de Boas Práticas

### 1. Configure Tudo Corretamente

Preencha com atenção os "Dados Empresariais":
- ✅ Confira CNPJ, telefone, email
- ✅ Teste chave PIX antes
- ✅ Valide dados bancários
- ✅ Use endereço completo

### 2. Use Todas as Variáveis Necessárias

No template de contrato:
- ✅ Inclua dados completos de ambas as partes
- ✅ Especifique claramente o serviço
- ✅ Detalhe valores e pagamento
- ✅ Adicione cláusulas importantes

### 3. Revise os Contratos

Antes de enviar ao cliente:
- ✅ Gere um teste e revise o PDF
- ✅ Verifique se todas as variáveis funcionam
- ✅ Confirme formatação e layout
- ✅ Teste o fluxo completo

### 4. Organize Seus Templates

Crie templates específicos:
- 📸 Fotografia de Casamento
- 🎂 Fotografia de Aniversários
- 👶 Ensaio Newborn
- 💼 Fotografia Corporativa
- etc.

Cada tipo pode ter variáveis e cláusulas específicas!

## Conclusão

O novo sistema transforma:

**DE:**
```
Contrato com {{VARIAVEIS}} não substituídas
Dados incompletos
Aparência não profissional
```

**PARA:**
```
Contrato completo e profissional
Todos os dados automaticamente preenchidos
PDF pronto para impressão
Assinatura digital válida
```

**Resultado:** Mais profissionalismo, menos trabalho manual, melhor experiência para o cliente!
