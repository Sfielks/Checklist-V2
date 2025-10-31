

import React from 'react';
import { TaskType, Priority, SyncStatus } from '../types';
import Logo from './Logo';
import {
  ClipboardListIcon,
  SettingsIcon,
  SparklesIcon,
  BookmarkIcon,
  BellIcon,
  TagIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusCircleIcon,
  SpinnerIcon,
  CloudCheckIcon,
  CloudOffIcon,
  ExclamationCircleIcon,
  InboxIcon,
  ArchiveIcon,
  FlagIcon,
  ArrowLeftOnRectangleIcon,
} from './Icons';

type MainView = 'active' | 'today' | 'archived';

const priorityOptions: Record<Priority | 'all', string> = {
    all: 'Todas as Prioridades',
    none: 'Nenhuma',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const SyncStatusIndicator: React.FC<{ status: SyncStatus }> = ({ status }) => {
    const statusConfig: Record<SyncStatus, { icon: React.ReactNode; text: string; color: string }> = {
      syncing: {
        icon: <SpinnerIcon />,
        text: 'Sincronizando...',
        color: 'text-blue-500 dark:text-blue-400',
      },
      saved: {
        icon: <CloudCheckIcon />,
        text: 'Salvo na nuvem',
        color: 'text-teal-600 dark:text-teal-400',
      },
      offline: {
        icon: <CloudOffIcon />,
        text: 'Modo Offline',
        color: 'text-gray-500 dark:text-gray-400',
      },
      error: {
        icon: <ExclamationCircleIcon />,
        text: 'Falha na sincronização',
        color: 'text-red-500 dark:text-red-400',
      },
    };
  
  const { icon, text, color } = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${color} transition-colors duration-300`}>
      <div className="flex-shrink-0">{icon}</div>
      <span className="hidden sm:inline">{text}</span>
    </div>
  );
};

interface SidebarProps {
  tasks: TaskType[];
  categories: string[];
  mainView: MainView;
  setMainView: (view: MainView) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  priorityFilter: Priority | 'all';
  setPriorityFilter: (filter: Priority | 'all') => void;
  archivedTaskCount: number;
  syncStatus: SyncStatus;
  handleLogout: () => void;
  isAddingCategory: boolean;
  setIsAddingCategory: (isAdding: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleAddCategory: () => void;
  handleDeleteCategory: (category: string) => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsPanoramaOpen: (isOpen: boolean) => void;
  setIsSavedAnalysesOpen: (isOpen: boolean) => void;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  setIsSettingsOpen,
  setIsPanoramaOpen,
  setIsSavedAnalysesOpen,
  mainView,
  setMainView,
  archivedTaskCount,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  tasks,
  categories,
  handleDeleteCategory,
  isAddingCategory,
  setIsAddingCategory,
  newCategoryName,
  setNewCategoryName,
  handleAddCategory,
  syncStatus,
  handleLogout,
  onClose,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTaskCount = tasks.filter(t => !t.archived && t.dueDate === todayStr).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <Logo className="h-9 w-9" />
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Checklist</h1>
            </div>
          {onClose ? null : (
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Configurações">
              <SettingsIcon />
            </button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <ClipboardListIcon />
              <span>Visualizações</span>
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => { setMainView('active'); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex items-center gap-2 ${mainView === 'active' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <InboxIcon />
                  <span>Tarefas Ativas</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setMainView('today'); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${mainView === 'today' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span className="flex items-center gap-2"><BellIcon/> <span>Tarefas para Hoje</span></span>
                  {todayTaskCount > 0 && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{todayTaskCount}</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setMainView('archived'); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${mainView === 'archived' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span className="flex items-center gap-2">
                    <ArchiveIcon />
                    <span>Arquivadas</span>
                  </span>
                  {archivedTaskCount > 0 && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{archivedTaskCount}</span>}
                </button>
              </li>
            </ul>
          </div>
          
          <div>
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <SparklesIcon />
                  <span>Ferramentas IA</span>
              </h3>
              <ul className="space-y-1">
                  <li>
                      <button
                          onClick={() => { setIsPanoramaOpen(true); onClose?.(); }}
                          className="w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                          <SparklesIcon />
                          <span>Análise com IA</span>
                      </button>
                  </li>
                   <li>
                      <button
                          onClick={() => { setIsSavedAnalysesOpen(true); onClose?.(); }}
                          className="w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                          <BookmarkIcon />
                          <span>Análises Salvas</span>
                      </button>
                  </li>
              </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FlagIcon />
              <span>Prioridade</span>
            </h3>
            <ul className="space-y-1">
              {Object.entries(priorityOptions).map(([key, label]) => (
                <li key={key}>
                  <button
                    onClick={() => { setPriorityFilter(key as Priority | 'all'); onClose?.(); }}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium ${priorityFilter === key ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <TagIcon />
              <span>Categorias</span>
            </h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => { setCategoryFilter('all'); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${categoryFilter === 'all' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span>Todas as Categorias</span>
                  <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tasks.filter(t => !t.archived).length}</span>
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat} className="group flex items-center pr-1">
                  <button
                    onClick={() => { setCategoryFilter(cat); onClose?.(); }}
                    className={`flex-grow text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${categoryFilter === cat ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    <span className="truncate" title={cat}>{cat}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0">
                      {tasks.filter(t => t.category === cat && !t.archived).length}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat)}
                    className="ml-1 p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-red-100 dark:hover:bg-red-900/30"
                    title={`Excluir categoria "${cat}"`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
              {isAddingCategory ? (
                <li className="mt-2 p-1">
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCategory();
                        if (e.key === 'Escape') setIsAddingCategory(false);
                      }}
                      className="flex-grow bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-gray-900 dark:text-white"
                      placeholder="Nome da categoria"
                      autoFocus
                    />
                    <button onClick={handleAddCategory} className="p-2 text-teal-500 hover:text-teal-600" title="Salvar">
                      <CheckCircleIcon />
                    </button>
                    <button onClick={() => setIsAddingCategory(false)} className="p-2 text-gray-500 hover:text-gray-700" title="Cancelar">
                      <XCircleIcon />
                    </button>
                  </div>
                </li>
              ) : (
                <li className="mt-2">
                  <button
                    onClick={() => setIsAddingCategory(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    <PlusCircleIcon />
                    <span>Nova Categoria</span>
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-auto flex-shrink-0 pt-4">
        <SyncStatusIndicator status={syncStatus} />
        <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => {
                setIsSettingsOpen(true);
                onClose?.();
              }}
              className="flex items-center justify-center gap-2 flex-1 text-sm text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <SettingsIcon className="h-5 w-5"/>
              <span>Configurações</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 flex-1 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <ArrowLeftOnRectangleIcon />
              <span>Sair</span>
            </button>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;