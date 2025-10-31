

import React, { useRef } from 'react';
import { XIcon, SunIcon, MoonIcon, BellIcon, CheckCircleIcon, XCircleIcon, DownloadIcon, UploadIcon } from './Icons';

type Theme = 'light' | 'dark';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationPermission: NotificationPermission;
  onRequestNotificationPermission: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    onExport, 
    onImport, 
    onReset, 
    theme, 
    onThemeChange, 
    notificationPermission, 
    onRequestNotificationPermission 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

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
          <h2 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Configurações</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar configurações">
            <XIcon />
          </button>
        </div>
        
        <div className="p-6 space-y-8">
          {/* Appearance Section */}
          <section>
             <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Aparência</h3>
             <div className="flex items-center gap-4">
                <span className="text-gray-800 dark:text-gray-200">Tema:</span>
                <div className="flex items-center gap-2 rounded-lg p-1 bg-gray-200 dark:bg-gray-700">
                    <button
                        onClick={() => onThemeChange('light')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${theme === 'light' ? 'bg-white text-teal-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        <SunIcon />
                        Claro
                    </button>
                    <button
                        onClick={() => onThemeChange('dark')}
                        className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${theme === 'dark' ? 'bg-gray-800 text-teal-400 shadow' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        <MoonIcon />
                        Escuro
                    </button>
                </div>
             </div>
          </section>

          {/* Notifications Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Notificações</h3>
            <div className="flex items-center gap-4">
                {notificationPermission === 'granted' && (
                    <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
                    <CheckCircleIcon />
                    <span>As notificações estão ativadas.</span>
                    </div>
                )}
                {notificationPermission === 'default' && (
                    <button
                    onClick={onRequestNotificationPermission}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                    <BellIcon />
                    Ativar Notificações
                    </button>
                )}
                {notificationPermission === 'denied' && (
                    <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <XCircleIcon />
                    <span>Notificações bloqueadas. Altere nas configurações do seu navegador.</span>
                    </div>
                )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Receba um lembrete no dia do vencimento de uma tarefa.
            </p>
          </section>

          {/* Data Management Section */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Backup e Restauração</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onExport}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <DownloadIcon />
                Exportar Dados
              </button>
              <button
                onClick={handleImportClick}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <UploadIcon />
                Importar Dados
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onImport}
                className="hidden"
                accept=".json"
              />
            </div>
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
               Salve um backup de todas as suas tarefas e análises. Ao importar, você poderá escolher entre mesclar ou substituir os dados existentes.
             </p>
          </section>

          {/* Danger Zone Section */}
          <section>
            <h3 className="text-lg font-semibold text-red-500 dark:text-red-400 mb-4 border-b border-red-500/30 pb-2">Zona de Perigo</h3>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-1">
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">Redefinir Aplicativo</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Isso excluirá permanentemente todas as suas tarefas e redefinirá o aplicativo para seu estado inicial.
                    </p>
                </div>
                <button
                    onClick={onReset}
                    className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 flex-shrink-0 w-full sm:w-auto"
                >
                    Redefinir
                </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
