
import React, { useState } from 'react';
import { TaskType, SavedAnalysis } from '../types';
import { XIcon, ExclamationCircleIcon } from './Icons';

interface BackupData {
  version: number;
  tasks: TaskType[];
  savedAnalyses: SavedAnalysis[];
}

interface ImportConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: 'merge' | 'replace') => void;
  fileData: BackupData | null;
}

const ImportConfirmationModal: React.FC<ImportConfirmationModalProps> = ({ isOpen, onClose, onConfirm, fileData }) => {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  if (!isOpen || !fileData) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 animate-fade-in-scale"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Confirmar Importação</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar">
                <XIcon />
            </button>
        </div>

        <div className="p-6 space-y-6">
            <p className="text-gray-700 dark:text-gray-300">
                O arquivo de backup contém <strong className="text-teal-600 dark:text-teal-400">{fileData.tasks.length} tarefa(s)</strong> e <strong className="text-teal-600 dark:text-teal-400">{fileData.savedAnalyses.length} análise(s) salva(s)</strong>.
            </p>

            <fieldset>
                <legend className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Como você gostaria de importar os dados?</legend>
                <div className="space-y-4">
                    <label 
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${mode === 'merge' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <input
                            type="radio"
                            name="import-mode"
                            value="merge"
                            checked={mode === 'merge'}
                            onChange={() => setMode('merge')}
                            className="h-5 w-5 mt-0.5 text-teal-600 focus:ring-teal-500 border-gray-300 dark:border-gray-500 dark:bg-gray-900 dark:focus:ring-offset-gray-800"
                        />
                        <div className="ml-3 text-sm">
                            <span className="font-medium text-gray-900 dark:text-gray-100">Mesclar com os dados atuais (Recomendado)</span>
                            <p className="text-gray-600 dark:text-gray-400">Adiciona os itens do backup aos seus itens existentes. Nenhum dado atual será excluído.</p>
                        </div>
                    </label>

                    <label 
                        className={`flex items-start p-4 border rounded-lg cursor-pointer transition-all ${mode === 'replace' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                    >
                        <input
                            type="radio"
                            name="import-mode"
                            value="replace"
                            checked={mode === 'replace'}
                            onChange={() => setMode('replace')}
                            className="h-5 w-5 mt-0.5 text-red-600 focus:ring-red-500 border-gray-300 dark:border-gray-500 dark:bg-gray-900 dark:focus:ring-offset-gray-800"
                        />
                        <div className="ml-3 text-sm">
                            <span className="font-medium text-gray-900 dark:text-gray-100">Substituir todos os dados atuais</span>
                            <div className="flex items-center gap-2 mt-1 text-red-700 dark:text-red-300">
                                <ExclamationCircleIcon/>
                                <span><strong>Atenção:</strong> Isso excluirá permanentemente todas as suas tarefas e análises atuais.</span>
                            </div>
                        </div>
                    </label>
                </div>
            </fieldset>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(mode)}
            className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            Importar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportConfirmationModal;
