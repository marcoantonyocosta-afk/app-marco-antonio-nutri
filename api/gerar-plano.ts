import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido. Utilize POST.' });
  }

  if (!apiKey) {
    return res.status(500).json({ error: 'Chave GEMINI_API_KEY não configurada no servidor.' });
  }

  try {
    const { dados_do_paciente } = req.body || {};

    if (!dados_do_paciente) {
      return res.status(400).json({ error: 'Os dados do paciente são obrigatórios.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Schema rígido para garantir que o Gemini retorne exatamente o formato esperado
    const schema = {
      type: SchemaType.OBJECT,
      properties: {
        plano_semanal: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              dia: { type: SchemaType.STRING },
              refeicoes: {
                type: SchemaType.OBJECT,
                properties: {
                  cafe_da_manha: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  lanche_manha: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  almoco: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  lanche_tarde: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                  jantar: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                  },
                },
                required: ['cafe_da_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar'],
              },
            },
            required: ['dia', 'refeicoes'],
          },
        },
      },
      required: ['plano_semanal'],
    };

    const promptText = `Você é um nutricionista clínico profissional especialista na culinária e rotina brasileira.
Gere um plano alimentar semanal completo, saudável e diversificado com base nos dados do paciente fornecidos abaixo.

Dados do Paciente (Metas, Alergias, Restrições e Histórico):
${typeof dados_do_paciente === 'string' ? dados_do_paciente : JSON.stringify(dados_do_paciente, null, 2)}

# Regras OBRIGATÓRIAS e Críticas de Execução:
1. QUANTIDADE DE OPÇÕES: Para CADA UMA das 5 refeições de CADA dia da semana, você DEVE OBRIGATORIAMENTE fornecer EXATAMENTE 5 opções completas, variadas e distintas no array (Opção 1, Opção 2, Opção 3, Opção 4 e Opção 5). NUNCA deixe com menos de 5 itens e NUNCA retorne itens vazios.
2. Cada opção deve ser uma alternativa completa para aquela refeição (exemplo no Café da manhã: Opção 1: '2 ovos mexidos com 1 fatia de pão integral e café', Opção 2: 'Tapioca com queijo branco e suco de laranja', etc.).
3. DIAS DA SEMANA: Cubra todos os 7 dias da semana: Segunda-feira, Terça-feira, Quarta-feira, Quinta-feira, Sexta-feira, Sábado, Domingo.
4. REFEIÇÕES POR DIA: Em cada dia, preencha cafe_da_manha (5 opções), lanche_manha (5 opções), almoco (5 opções), lanche_tarde (5 opções) e jantar (5 opções).
5. Adapte o cardápio rigorosamente a quaisquer alergias, intolerâncias ou restrições descritas nos dados do paciente.
6. Utilize alimentos comuns, saudáveis e culturalmente aceitos no Brasil, calculados para atingir os objetivos informados.
7. Responda APENAS o JSON puro correspondente ao schema. Sem markdown ou texto introdutório.

Exemplo da estrutura exata (com 5 opções em cada array de refeição):
{
  "plano_semanal": [
    {
      "dia": "Segunda-feira",
      "refeicoes": {
        "cafe_da_manha": [
          "2 ovos mexidos + 1 fatia de pão integral + café sem açúcar",
          "Crepioca (1 ovo + 2 colheres de goma) recheada com queijo cottage",
          "Iogurte natural desnatado + 30g de aveia em flocos + 1 maçã picada",
          "Vitamina de banana (200ml leite desnatado ou vegetal + 1 banana + chia)",
          "1 fatia de pão 100% integral com pasta de amendoim integral e morangos"
        ],
        "lanche_manha": [
          "1 maçã gala + 4 castanhas-do-pará",
          "1 barra de proteína sem açúcar",
          "1 pote de iogurte natural desnatado",
          "1 fatia de melão ou mamão com sementes de abóbora",
          "1 punhado pequeno (30g) de mix de nozes e amêndoas"
        ],
        "almoco": [
          "150g de peito de frango grelhado + 4 colheres de arroz integral + feijão + salada verde à vontade",
          "150g de filé de tilápia assada + purê de batata-doce + brócolis ao vapor",
          "140g de patinho moído refogado + mandioca cozida + salada de tomate e rúcula",
          "Omelete de 3 ovos com espinafre e tomate + arroz com lentilha + salada",
          "150g de sobrecoxa assada sem pele + batata inglesa assada com alecrim + legumes salteados"
        ],
        "lanche_tarde": [
          "1 banana prata amassada com 1 colher de sopa de farelo de aveia e canela",
          "1 copo de iogurte desnatado batido com frutas vermelhas",
          "2 torradas integrais com queijo ricota e orégano",
          "1 scoop de whey protein batido com água ou leite desnatado",
          "Salada de frutas frescas com chia"
        ],
        "jantar": [
          "140g de peito de frango em tiras com abobrinha e cenoura refogadas + salada verde",
          "Sopa nutritiva de legumes com carne magra desfiada",
          "Omelete de 2 ovos com legumes e salada de folhas verdes com azeite",
          "140g de peixe grelhado com legumes assados (abóbora e couve-flor)",
          "Prato leve de salada colorida completa com atum sólido ao natural e grão-de-bico"
        ]
      }
    }
  ]
}`;

    // Tentativa com gemini-3.8-flash priorizado, com fallback para gemini-3.1-flash-lite / gemini-3.5-flash / gemini-flash-latest caso haja sobrecarga momentânea (503)
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-flash-latest'
    ];
    let lastError: any = null;
    let textResponse = '';

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schema as any,
            temperature: 0.7,
          },
        });

        const result = await model.generateContent(promptText);
        textResponse = result.response.text();
        if (textResponse) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Tentativa com ${modelName} falhou:`, err?.message || err);
      }
    }

    if (!textResponse) {
      throw lastError || new Error('Nenhum modelo retornou resposta válida');
    }

    let jsonParsed;
    try {
      jsonParsed = JSON.parse(textResponse);
    } catch (parseError) {
      console.error('Falha no JSON.parse da resposta da IA:', textResponse, parseError);
      return res.status(500).json({
        error: 'Erro ao interpretar a resposta da IA como JSON estruturado.',
        raw: textResponse,
      });
    }

    return res.status(200).json(jsonParsed);
  } catch (err: any) {
    console.error('Erro ao gerar plano alimentar com IA:', err);
    return res.status(500).json({
      error: 'Não foi possível gerar o plano com IA no momento. Deseja tentar novamente ou criar um Plano Manual?',
      details: err?.message || String(err),
    });
  }
}
