import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';
import { TaskType, ContentBlock, SubItemBlock, TextBlock } from '../types';
import { XIcon, SparklesIcon, DocumentTextIcon, UploadIcon, SpinnerIcon, ExclamationCircleIcon, ArrowLeftOnRectangleIcon } from './Icons';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskType;
  onAddBlocks: (taskId: string, newBlocks: ContentBlock[]) => void;
}

type View = 'select' | 'analyze' | 'summarize';

const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, task, onAddBlocks }) => {
  const [view, setView] = useState<View>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for analysis
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  // State for summarization
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const resetState = () => {
    setView('select');
    setIsLoading(false);
    setError(null);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setFile(null);
    setSummary(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleAnalyzeTask = useCallback(async () => {
    setView('analyze');
    if (!process.env.API_KEY) {
      setError("A chave da API do Gemini não foi configurada.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const existingSubItems = task.content
        .filter(b => b.type === 'subitem')
        .map(b => (b as SubItemBlock).text)
        .join(', ');

      const prompt = `
        Baseado no título da tarefa "${task.title}", gere uma lista de 3 a 5 subtarefas acionáveis em português.
        As subtarefas devem ser curtas e diretas, e devem complementar a tarefa principal.
        ${existingSubItems.length > 0 ? `As seguintes subtarefas já existem, então não as repita: ${existingSubItems}.` : ''}
        Responda APENAS com um array JSON de strings, como este: ["Fazer X", "Pesquisar Y", "Revisar Z"]
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      
      const parsedSuggestions = JSON.parse(response.text);
      setSuggestions(parsedSuggestions);
      setSelectedSuggestions(new Set(parsedSuggestions)); // Select all by default
    } catch (err) {
      console.error("Error suggesting sub-items:", err);
      setError("Não foi possível gerar sugestões. Verifique o console para mais detalhes.");
    } finally {
      setIsLoading(false);
    }
  }, [task]);

  const handleSummarizeFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setView('summarize');
    
    if (!process.env.API_KEY) {
      setError("A chave da API do Gemini não foi configurada.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
        const fileText = await selectedFile.text();
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            Você é um assistente especialista em resumir textos. 
            Resuma o seguinte conteúdo do arquivo de forma clara e concisa, capturando os pontos mais importantes.
            O resumo deve ter no máximo 3 parágrafos.
            Formate a saída em Markdown (use títulos, negrito e listas se apropriado).
            Responda em Português do Brasil.
            Aqui está o texto do arquivo:

            ---
            ${fileText}
            ---
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
        });

        setSummary(response.text);

    } catch (err) {
        console.error("Error summarizing file:", err);
        if (err instanceof DOMException && err.name === 'NotReadableError') {
             setError(`Não foi possível ler o arquivo "${selectedFile.name}". O arquivo pode estar corrompido ou o formato não é suportado para leitura como texto.`);
        } else {
            setError("Ocorreu um erro ao resumir o arquivo. Verifique se é um arquivo de texto simples e tente novamente.");
        }
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleSummarizeFile(file);
    }
  };

  const handleSuggestionToggle = (suggestion: string) => {
    setSelectedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestion)) {
        newSet.delete(suggestion);
      } else {
        newSet.add(suggestion);
      }
      return newSet;
    });
  };

  const handleAddSuggestions = () => {
    const newBlocks: SubItemBlock[] = Array.from(selectedSuggestions).map(text => ({
      id: `${Date.now()}-${Math.random()}`,
      type: 'subitem',
      text,
      completed: false,
      children: []
    }));
    onAddBlocks(task.id, newBlocks);
    handleClose();
  };

  const handleAddSummary = () => {
    if (!summary) return;
    const newBlock: TextBlock = {
      id: `${Date.now()}-${Math.random()}`,
      type: 'text',
      text: `### Resumo de ${file?.name || 'Arquivo'}\n\n${summary}`
    };
    onAddBlocks(task.id, [newBlock]);
    handleClose();
  };


  if (!isOpen) return null;

  const renderContent = () => {
    switch (view) {
      case 'analyze':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Sugestões de Subitens</h3>
            {isLoading && <div className="text-center p-8"><SpinnerIcon /></div>}
            {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {suggestions.length > 0 && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {suggestions.map((s, i) => (
                  <label key={i} className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(s)}
                      onChange={() => handleSuggestionToggle(s)}
                      className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="ml-3 text-gray-800 dark:text-gray-200">{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );

      case 'summarize':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Resumir Arquivo</h3>
            {isLoading && (
              <div className="text-center p-8 space-y-3">
                <SpinnerIcon />
                <p>Processando "{file?.name}"...</p>
              </div>
            )}
            {error && <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">{error}</div>}
            {summary && (
              <div>
                <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Resumo de "{file?.name}":</h4>
                <div 
                    className="prose-styles dark:prose-styles max-w-none max-h-64 overflow-y-auto pr-2 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: marked(summary) as string }} 
                />
              </div>
            )}
          </div>
        );

      case 'select':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleAnalyzeTask}
              className="flex flex-col items-center justify-center text-center p-6 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-teal-100/50 dark:hover:bg-teal-900/30 border-2 border-transparent hover:border-teal-500 transition-all duration-200"
            >
              <SparklesIcon />
              <h3 className="mt-2 font-semibold text-gray-800 dark:text-gray-200">Analisar Tarefa</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sugerir novos subitens com base no título da tarefa.</p>
            </button>
             <label className="flex flex-col items-center justify-center text-center p-6 bg-gray-100 dark:bg-gray-700/50 rounded-lg hover:bg-teal-100/50 dark:hover:bg-teal-900/30 border-2 border-transparent hover:border-teal-500 transition-all duration-200 cursor-pointer">
              <UploadIcon />
              <h3 className="mt-2 font-semibold text-gray-800 dark:text-gray-200">Resumir Arquivo</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Faça o upload de um arquivo de texto para adicioná-lo como nota.</p>
              <input type="file" className="hidden" onChange={handleFileChange} accept=".txt,.md,.js,.py,.html,.css,.json" />
            </label>
          </div>
        );
    }
  };

  const renderFooter = () => {
    switch (view) {
      case 'analyze':
        return (
          <>
            <button onClick={handleAddSuggestions} disabled={isLoading || selectedSuggestions.size === 0} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-400">
              Adicionar Selecionados ({selectedSuggestions.size})
            </button>
          </>
        );
      case 'summarize':
        return (
          <>
            <button onClick={handleAddSummary} disabled={isLoading || !summary} className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-400">
              Adicionar Resumo à Tarefa
            </button>
          </>
        );
      case 'select':
      default:
        return (
          <button onClick={handleClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400">
            Fechar
          </button>
        );
    }
  };


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 animate-fade-in-scale flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-3">
                <SparklesIcon />
                <span>Sugestões com IA</span>
            </h2>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar">
                <XIcon />
            </button>
        </div>
        
        <div className="p-6">{renderContent()}</div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg">
           {view !== 'select' && (
                <button onClick={() => setView('select')} className="px-4 py-2 text-gray-700 dark:text-gray-300 font-semibold rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 mr-auto flex items-center gap-2">
                    <ArrowLeftOnRectangleIcon />
                    Voltar
                </button>
            )}
            {renderFooter()}
        </div>
      </div>
    </div>
  );
};

export default SuggestionModal;