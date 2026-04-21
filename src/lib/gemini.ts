import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const model = "gemini-3.1-pro-preview"; // Using pro for complex legal reasoning

export interface CaseAnalysis {
  diagnostico: string;
  estrategiaBusca: string;
  sugestaoAutomacao: string;
  minutaPeca: string;
}

export async function analyzeCase(description: string): Promise<CaseAnalysis> {
  const prompt = `
    Você é um Assessor Jurídico da Defensoria Pública.
    Analise o seguinte caso e forneça uma resposta estruturada em JSON.
    
    Campos obrigatórios:
    - diagnostico: Analise nulidades, prescrição, decadência e tempestividade.
    - estrategiaBusca: Strings de busca avançada booleanas para STF/STJ/TJ.
    - sugestaoAutomacao: Ideia de script ou ferramenta para busca em massa.
    - minutaPeca: Minuta inicial da peça jurídica completa e profissional com fundamentação legal.

    Caso: ${description}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          diagnostico: { type: Type.STRING },
          estrategiaBusca: { type: Type.STRING },
          sugestaoAutomacao: { type: Type.STRING },
          minutaPeca: { type: Type.STRING },
        },
        required: ["diagnostico", "estrategiaBusca", "sugestaoAutomacao", "minutaPeca"],
      },
    },
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return {
      diagnostico: "Erro na geração do diagnóstico.",
      estrategiaBusca: "",
      sugestaoAutomacao: "",
      minutaPeca: "Erro ao gerar a minuta. Por favor, tente novamente."
    };
  }
}

export async function generateSearchString(theme: string): Promise<string> {
  const prompt = `Gere uma string de busca avançada (booleanos como AND, OR, NOT) para o site do STJ/TJ sobre o tema: ${theme}. Retorne apenas a string.`;
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "";
}

export async function analyzeRuling(rulingText: string): Promise<string> {
  const prompt = `Analise este acórdão:
    1. Resumo dos argumentos vencedores.
    2. Identifique se contraria decisões recentes do STF.
    3. Indique se é leading case, overruling ou cabe distinguishing.
    
    Texto: ${rulingText}`;
    
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text || "";
}

export async function findSimilarCases(description: string): Promise<string> {
  const prompt = `
    Você é um Assessor Jurídico da Defensoria Pública Especialista em Precedentes.
    Com base na seguinte descrição de caso técnico, realize uma pesquisa web (Google Search) para encontrar e resumir 3 processos, acórdãos ou súmulas REAIS similares (priorize STF e STJ). 
    
    Para cada precedente encontrado, forneça:
    1. Número do Processo / Recurso (Ex: HC 123.456 ou RE 789.012)
    2. Número Único CNJ (Obrigatório para conferência real no e-SAJ/PJe: 0000000-00.0000.0.00.0000)
    3. Partes (Agravante/Agravado ou Impetrante/Paciente - use iniciais se houver segredo de justiça)
    4. Tribunal e Relator
    5. Tese Firmada (Ratio Decidendi)
    6. Link Direto para o Processo ou Acórdão no site do Tribunal.
    
    IMPORTANTE: Verifique via Google Search se o número do processo é real e atual. Não invente números.
    
    Descrição do Caso: ${description}
    
    Retorne uma resposta em Markdown bem estruturada.
  `;

  // Note: Using tools in config for grounding
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  } as any);

  return response.text || "Nenhum precedente similar encontrado via busca web.";
}
