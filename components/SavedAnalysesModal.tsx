import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import { SavedAnalysis } from '../types';
import { XIcon, BookmarkIcon, TrashIcon } from './Icons';

interface SavedAnalysesModalProps {
  isOpen: boolean;
  onClose: () => void;
  analyses: SavedAnalysis[];
  onDelete: (id: string) => void;
}

const SavedAnalysesModal: React.FC<SavedAnalysesModalProps> = ({ isOpen, onClose, analyses, onDelete }) => {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  useEffect(() => {
    // Select the most recent analysis when the modal opens or the list changes
    if (isOpen && analyses.length > 0) {
        const sortedAnalyses = [...analyses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        if (!selectedAnalysisId || !analyses.some(a => a.id === selectedAnalysisId)) {
             setSelectedAnalysisId(sortedAnalyses[0].id);
        }
    } else if (analyses.length === 0) {
        setSelectedAnalysisId(null);
    }
  }, [isOpen, analyses, selectedAnalysisId]);

  if (!isOpen) return null;

  const selectedAnalysis = analyses.find(a => a.id === selectedAnalysisId);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 animate-fade-in-scale flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-3">
            <BookmarkIcon />
            <span>Análises Salvas</span>
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar">
            <XIcon />
          </button>
        </div>
        
        <div className="flex-grow flex min-h-0">
          {analyses.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 p-10">
              <BookmarkIcon />
              <p className="font-semibold mt-4">Nenhuma análise salva ainda</p>
              <p className="text-sm mt-1">Gere uma análise no Panorama e salve-a para vê-la aqui.</p>
            </div>
          ) : (
            <>
              <aside className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                <ul>
                  {[...analyses]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(analysis => (
                    <li key={analysis.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <button 
                        onClick={() => setSelectedAnalysisId(analysis.id)}
                        className={`w-full text-left p-4 group ${selectedAnalysisId === analysis.id ? 'bg-teal-50 dark:bg-teal-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-grow">
                            <p className={`font-semibold text-sm ${selectedAnalysisId === analysis.id ? 'text-teal-700 dark:text-teal-300' : 'text-gray-800 dark:text-gray-200'}`}>
                              {analysis.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {new Date(analysis.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                          </div>
                          <div
                            onClick={(e) => { e.stopPropagation(); onDelete(analysis.id); }} 
                            className="p-2 -mr-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Excluir análise"
                          >
                             <TrashIcon />
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
              <main className="w-2/3 p-6 overflow-y-auto">
                {selectedAnalysis ? (
                   <div className="prose-styles dark:prose-styles max-w-none" dangerouslySetInnerHTML={{ __html: marked(selectedAnalysis.content) as string }} />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 dark:text-gray-300 h-full">
                     <p>Selecione uma análise para visualizar</p>
                  </div>
                )}
              </main>
            </>
          )}
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg flex-shrink-0">
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

export default SavedAnalysesModal;