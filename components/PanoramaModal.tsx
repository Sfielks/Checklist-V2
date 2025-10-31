import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import { TaskType, ContentBlock } from '../types';
import { XIcon, SparklesIcon, SpinnerIcon, ExclamationCircleIcon } from './Icons';

interface PanoramaModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskType[];
  onSaveAnalysis: (content: string) => void;
}

const PanoramaModal: React.FC<PanoramaModalProps> = ({ isOpen, onClose, tasks, onSaveAnalysis }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const generateAnalysis = useCallback(async () => {
    if (!process.env.API_KEY) {
      setError("A chave da API não foi configurada. Por favor, configure a variável de ambiente API_KEY.");
      return;
    }

    if (tasks.length === 0) {
      setAnalysisResult("### Você ainda não tem tarefas para analisar. \n\nAdicione algumas tarefas e volte aqui para obter um panorama geral da sua produtividade!");
      return;
    }

    setIsLoading(true);
    setAnalysisResult(null);
    setError(null);
    setIsSaved(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const simplifiedTasks = tasks.map(task => {
        const countSubItems = (items: ContentBlock[]): { total: number; completed: number } => {
            let total = 0;
            let completed = 0;
            for (const item of items) {
                if (item.type === 'subitem') {
                    total++;
                    if (item.completed) completed++;
                    const childrenCount = countSubItems(item.children);
                    total += childrenCount.total;
                    completed += childrenCount.completed;
                }
            }
            return { total, completed };
        };
        const {total, completed} = countSubItems(task.content);

        return {
            title: task.title,
            priority: task.priority || 'none',
            dueDate: task.dueDate || 'N/A',
            category: task.category || 'N/A',
            archived: task.archived,
            subitemsTotal: total,
            subitemsCompleted: completed
        };
      });

      const prompt = `
        Você é um assistente de produtividade e sua tarefa é analisar uma lista de tarefas de um usuário fornecida em formato JSON. 
        Com base nesses dados, forneça um panorama geral, encorajador e perspicaz sobre a produtividade do usuário.

        Sua análise deve:
        1.  Começar com uma saudação amigável e um resumo geral.
        2.  Destacar estatísticas chave: número total de tarefas, taxa de conclusão geral (considerando sub-tarefas), e quantas tarefas estão arquivadas.
        3.  Identificar padrões importantes:
            -   Mencionar tarefas com prazo próximo ou vencido (a data de hoje é ${new Date().toISOString().split('T')[0]}).
            -   Apontar as categorias com mais tarefas.
            -   Comentar sobre o uso de prioridades (ex: muitas tarefas urgentes).
        4.  Oferecer 1 ou 2 sugestões práticas e acionáveis para ajudar o usuário a priorizar ou a se organizar melhor.
        5.  Terminar com uma nota motivacional.

        Formate toda a sua resposta em Markdown. Use títulos (h2), listas e negrito para uma boa legibilidade.
        Responda em Português do Brasil.

        Aqui estão os dados das tarefas:
        ${JSON.stringify(simplifiedTasks, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
      });

      setAnalysisResult(response.text);

    } catch (err) {
      console.error("Error generating analysis:", err);
      setError("Ocorreu um erro ao tentar analisar suas tarefas. Verifique sua conexão e a chave da API, e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }, [tasks]);

  useEffect(() => {
    if (isOpen) {
      generateAnalysis();
    }
  }, [isOpen, generateAnalysis]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-scale flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-3">
            <SparklesIcon />
            <span>Panorama Geral das Tarefas</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar">
            <XIcon />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 gap-4 py-10">
              <SpinnerIcon />
              <p className="font-semibold">Analisando suas tarefas com Gemini...</p>
              <p className="text-sm">Isso pode levar alguns segundos.</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center text-center text-red-600 dark:text-red-400 gap-4 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
              <ExclamationCircleIcon />
              <p className="font-semibold">Erro na Análise</p>
              <p className="text-sm">{error}</p>
              <button
                onClick={generateAnalysis}
                className="mt-4 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Tentar Novamente
              </button>
            </div>
          )}
          
          {analysisResult && (
             <div className="prose-styles dark:prose-styles max-w-none" dangerouslySetInnerHTML={{ __html: marked(analysisResult) as string }} />
          )}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg flex-shrink-0">
          <button
            onClick={generateAnalysis}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Gerar Novamente
          </button>
           <button
            onClick={() => {
              if (analysisResult) {
                onSaveAnalysis(analysisResult);
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 2000);
              }
            }}
            disabled={isLoading || !analysisResult || isSaved}
            className={`px-4 py-2 font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 ring-offset-2 dark:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
              ${isSaved
                ? 'bg-green-600 text-white ring-green-500'
                : 'bg-blue-600 text-white hover:bg-blue-700 ring-blue-500'
              }`
            }
          >
            {isSaved ? 'Salvo!' : 'Salvar Análise'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanoramaModal;