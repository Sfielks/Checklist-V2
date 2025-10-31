
import React, { useState, useEffect, useCallback } from 'react';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority, AttachmentBlock } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, XIcon, SettingsIcon, AppleIcon, ArchiveIcon, SpinnerIcon, CloudCheckIcon, CloudOffIcon, ExclamationCircleIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon, MenuIcon, BellIcon } from './components/Icons';
import ConfirmationDialog from './components/ConfirmationDialog';
import SettingsModal from './components/SettingsModal';

/**
 * @constant initialTasks
 * @description Initial set of tasks for the checklist application.
 * @type {TaskType[]}
 */
const initialTasks: TaskType[] = [
  {
    id: '1',
    title: 'Checklist para Finalização do Pré-Projeto',
    content: [
      { id: '1-desc', type: 'text', text: 'Com base no seu pré-projeto atual, no modelo da sua professora e nas nossas conversas, aqui está um checklist das próximas tarefas para finalizar seu pré-projeto:' },
      { id: '1-1', type: 'subitem', text: 'Revisar a Introdução (Página 4 do seu Pré-Projeto)', completed: true, children: [] },
      { id: '1-2', type: 'subitem', text: 'Eliminar a duplicidade de texto.', completed: false, children: [] },
      { id: '1-3', type: 'subitem', text: 'Integrar as melhores partes das duas versões em um único texto introdutório coeso.', completed: false, children: [] },
    ],
    priority: 'high',
    dueDate: '2024-08-15',
    category: 'Acadêmico',
    archived: false,
    color: '#581c1c',
  },
  {
    id: '2',
    title: 'Escrever o Quadro Teórico (Página 8 do seu Pré-Projeto)',
    content: [
      { id: '2-1', type: 'subitem', text: 'Desenvolver a seção 5.1: Conceituar Folkcomunicação, citar inspiração e conectar com estudos brasileiros.', completed: false, children: [] },
      { id: '2-2', type: 'subitem', text: 'Desenvolver a seção 5.2: Apresentar a construção histórica da imagem biker global e contextualizar com a realidade brasileira.', completed: false, children: [] },
      { id: '2-3', type: 'subitem', text: 'Desenvolver a seção 5.3: Explicar a análise simbólica e conectar com território e eventos.', completed: false, children: [] },
      { id: '2-4', type: 'subitem', text: 'Desenvolver a seção 5.4 (Opcional): Introduzir o conceito de Securitização.', completed: false, children: [] },
    ],
    priority: 'medium',
    dueDate: '',
    category: 'Acadêmico',
    archived: false,
  },
    {
    id: '3',
    title: 'Ideias para o Futuro',
    content: [
        { id: '3-1', type: 'text', text: '- Pesquisar sobre a história dos motoclubes no Brasil.\n- Entrevistar membros de diferentes motoclubes.\n- Analisar a simbologia das vestimentas.' }
    ],
    priority: 'low',
    category: 'Pesquisa',
    archived: false,
  },
];
/**
 * @constant LOCAL_STORAGE_KEY
 * @description Key for storing tasks in local storage for guest users.
 * @type {string}
 */
const LOCAL_STORAGE_KEY = 'checklist-app-tasks-guest';
/**
 * @constant CLOUD_STORAGE_KEY_PREFIX
 * @description Prefix for storing tasks in cloud storage.
 * @type {string}
 */
const CLOUD_STORAGE_KEY_PREFIX = 'checklist-app-cloud-';
/**
 * @constant THEME_STORAGE_KEY
 * @description Key for storing the selected theme in local storage.
 * @type {string}
 */
const THEME_STORAGE_KEY = 'checklist-app-theme';

/**
 * @typedef {'light' | 'dark'} Theme
 * @description Represents the possible themes for the application.
 */
type Theme = 'light' | 'dark';
/**
 * @typedef {'home' | 'checklist'} View
 * @description Represents the possible views in the application.
 */
type View = 'home' | 'checklist';
/**
 * @typedef {object} User
 * @description Represents a user of the application.
 * @property {string} id - The unique identifier for the user.
 * @property {string} name - The name of the user.
 */
type User = { id: string; name: string };
/**
 * @typedef {'syncing' | 'saved' | 'offline' | 'error'} SyncStatus
 * @description Represents the synchronization status of the application data.
 */
type SyncStatus = 'syncing' | 'saved' | 'offline' | 'error';


/**
 * @constant cloudStorage
 * @description Mock Cloud Storage API for saving and loading tasks.
 */
const cloudStorage = {
  /**
   * Saves tasks to the mock cloud storage.
   * @param {string} userId - The ID of the user.
   * @param {TaskType[]} tasks - The array of tasks to save.
   * @returns {Promise<void>} A promise that resolves when the tasks are saved.
   */
  saveTasks: async (userId: string, tasks: TaskType[]): Promise<void> => {
    console.log(`Simulating save to cloud for user ${userId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    try {
      localStorage.setItem(`${CLOUD_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(tasks));
      console.log('Cloud save successful.');
    } catch (error) {
      console.error('Cloud save failed:', error);
      throw new Error('Failed to save to cloud');
    }
  },
  /**
   * Loads tasks from the mock cloud storage.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<TaskType[] | null>} A promise that resolves with the loaded tasks or null if no tasks are found.
   */
  loadTasks: async (userId: string): Promise<TaskType[] | null> => {
    console.log(`Simulating load from cloud for user ${userId}...`);
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    try {
      const savedTasks = localStorage.getItem(`${CLOUD_STORAGE_KEY_PREFIX}${userId}`);
      if (savedTasks) {
        console.log('Cloud load successful.');
        return JSON.parse(savedTasks);
      }
      console.log('No data found in cloud for this user.');
      return null;
    } catch (error) {
      console.error('Cloud load failed:', error);
      throw new Error('Failed to load from cloud');
    }
  },
};

/**
 * A component that displays the synchronization status.
 * @param {object} props - The component props.
 * @param {SyncStatus} props.status - The current synchronization status.
 * @returns {React.ReactElement} The rendered component.
 */
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


/**
 * Recursively maps over a content tree and applies a transformation to a target subitem.
 * @param {ContentBlock[]} content - The array of content blocks to map over.
 * @param {string} targetId - The ID of the target subitem.
 * @param {function(SubItemBlock): SubItemBlock} transform - The transformation function to apply.
 * @returns {[ContentBlock[], boolean]} A tuple containing the new content tree and a boolean indicating if the target was found.
 */
const mapContentTree = (content: ContentBlock[], targetId: string, transform: (block: SubItemBlock) => SubItemBlock): [ContentBlock[], boolean] => {
  let found = false;
  const newContent = content.map(block => {
    if (found) return block;
    if (block.id === targetId && block.type === 'subitem') {
      found = true;
      return transform(block);
    }
    if (block.type === 'subitem' && block.children?.length > 0) {
      const [newChildren, childFound] = mapContentTree(block.children, targetId, transform);
      if (childFound) {
        found = true;
        return { ...block, children: newChildren as SubItemBlock[] };
      }
    }
    return block;
  });
  return [newContent, found];
};
/**
 * Recursively filters a content tree to remove a target block.
 * @param {ContentBlock[]} content - The array of content blocks to filter.
 * @param {string} targetId - The ID of the block to remove.
 * @returns {[ContentBlock[], boolean]} A tuple containing the new content tree and a boolean indicating if the target was found and removed.
 */
const filterContentTree = (content: ContentBlock[], targetId: string): [ContentBlock[], boolean] => {
  let found = false;
  const newContent = content.filter(block => {
      if (block.id === targetId) {
          found = true;
          return false;
      }
      return true;
  }).map(block => {
      if (found) return block;
      if (block.type === 'subitem' && block.children?.length > 0) {
          const [newChildren, childFound] = filterContentTree(block.children, targetId);
          if (childFound) {
              found = true;
              return { ...block, children: newChildren as SubItemBlock[] };
          }
      }
      return block;
  });
  return [newContent, found];
};
/**
 * Migrates old content data structure to the new structure.
 * @param {any[]} items - The array of items to migrate.
 * @returns {ContentBlock[]} The migrated content blocks.
 */
const migrateContent = (items: any[]): ContentBlock[] => {
    return items.map(item => {
        if (item.type === 'subitem') {
            return {
                ...item,
                completed: item.completed || false,
                children: item.children ? migrateContent(item.children) : []
            };
        }
        return item;
    });
};

/**
 * @constant priorityOptions
 * @description A record of priority options and their corresponding labels.
 * @type {Record<Priority | 'all', string>}
 */
const priorityOptions: Record<Priority | 'all', string> = {
    all: 'Todas as Prioridades',
    none: 'Nenhuma',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

/**
 * @constant statusOptions
 * @description A record of status options and their corresponding labels.
 * @type {Record<'all' | 'completed' | 'in-progress', string>}
 */
const statusOptions: Record<'all' | 'completed' | 'in-progress', string> = {
    all: 'Todos os Status',
    'in-progress': 'Em Andamento',
    completed: 'Concluído',
};

/**
 * A component that displays the home screen of the application.
 * @param {object} props - The component props.
 * @param {() => void} props.onAppleLogin - The function to call when the Apple login button is clicked.
 * @param {() => void} props.onGuestLogin - The function to call when the guest login button is clicked.
 * @returns {React.ReactElement} The rendered component.
 */
const HomeScreen = ({ onAppleLogin, onGuestLogin }: { onAppleLogin: () => void; onGuestLogin: () => void; }) => (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-4 text-center transition-colors duration-300">
    <div className="max-w-2xl">
      <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
        Checklist Avançado
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mt-4 text-lg sm:text-xl">
        A sua ferramenta definitiva para organizar tarefas complexas, projetos e ideias. Crie checklists detalhados com subtarefas, notas, prioridades e muito mais.
      </p>
       <p className="text-teal-500 dark:text-teal-400 mt-6 text-lg font-semibold">
        Faça login para salvar e sincronizar suas tarefas na nuvem!
      </p>
      <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onAppleLogin}
          className="w-full sm:w-auto flex items-center justify-center gap-3 bg-black text-white font-semibold py-3 px-8 rounded-lg border border-gray-600 hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 text-lg"
        >
          <AppleIcon />
          <span>Entrar com a Apple</span>
        </button>
      </div>
       <button
          onClick={onGuestLogin}
          className="mt-6 text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-300 transition-colors"
        >
          Continuar como convidado
        </button>
    </div>
  </div>
);
/**
 * A component that displays the content of the sidebar.
 * @param {object} props - The component props.
 * @param {function(boolean): void} props.setIsSettingsOpen - Function to set the settings modal's open state.
 * @param {boolean} props.showArchived - Whether to show archived tasks.
 * @param {function(boolean): void} props.setShowArchived - Function to set whether to show archived tasks.
 * @param {number} props.archivedTaskCount - The number of archived tasks.
 * @param {string} props.categoryFilter - The current category filter.
 * @param {function(string): void} props.setCategoryFilter - Function to set the category filter.
 * @param {Priority | 'all'} props.priorityFilter - The current priority filter.
 * @param {function(Priority | 'all'): void} props.setPriorityFilter - Function to set the priority filter.
 * @param {TaskType[]} props.tasks - The array of tasks.
 * @param {string[]} props.categories - The array of categories.
 * @param {function(string): void} props.handleDeleteCategory - Function to handle deleting a category.
 * @param {boolean} props.isAddingCategory - Whether the user is adding a new category.
 * @param {function(boolean): void} props.setIsAddingCategory - Function to set whether the user is adding a new category.
 * @param {string} props.newCategoryName - The name of the new category being added.
 * @param {function(string): void} props.setNewCategoryName - Function to set the name of the new category.
 * @param {() => void} props.handleAddCategory - Function to handle adding a new category.
 * @param {SyncStatus} props.syncStatus - The current synchronization status.
 * @param {() => void} props.handleLogout - Function to handle user logout.
 * @param {() => void} [props.onClose] - Optional function to call when the sidebar is closed.
 * @returns {React.ReactElement} The rendered component.
 */
const SidebarContent: React.FC<{
  setIsSettingsOpen: (isOpen: boolean) => void;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  archivedTaskCount: number;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  priorityFilter: Priority | 'all';
  setPriorityFilter: (filter: Priority | 'all') => void;
  tasks: TaskType[];
  categories: string[];
  handleDeleteCategory: (category: string) => void;
  isAddingCategory: boolean;
  setIsAddingCategory: (isAdding: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleAddCategory: () => void;
  syncStatus: SyncStatus;
  handleLogout: () => void;
  onClose?: () => void;
}> = ({
  setIsSettingsOpen,
  showArchived,
  setShowArchived,
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
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Tarefas</h1>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" title="Configurações">
            <SettingsIcon />
          </button>
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
                  onClick={() => { setShowArchived(false); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium ${!showArchived ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  Tarefas Ativas
                </button>
              </li>
              <li>
                <button
                  onClick={() => { setShowArchived(true); onClose?.(); }}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${showArchived ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                >
                  <span>Arquivadas</span>
                  {archivedTaskCount > 0 && <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{archivedTaskCount}</span>}
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <BellIcon />
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
        <button
          onClick={handleLogout}
          className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-2 rounded-md text-center"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

/**
 * The main component of the application.
 * @returns {React.ReactElement} The rendered component.
 */
const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const [tasks, setTasks] = useState<TaskType[]>(() => {
    try {
      const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        return parsedTasks.map((task: any) => ({ 
            ...task, 
            archived: task.archived || false,
            content: migrateContent(task.content || [])
        }));
      }
      return initialTasks;
    } catch (error)
     {
      console.error("Could not load tasks from localStorage", error);
      return initialTasks;
    }
  });
  
  const [categories, setCategories] = useState<string[]>(() => {
    try {
      const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const tasksToParse: TaskType[] = savedTasks ? JSON.parse(savedTasks) : initialTasks;
      const initialCategories = Array.from(new Set(tasksToParse.map((t: TaskType) => t.category).filter((c?: string): c is string => !!c)));
      return initialCategories.sort();
    } catch (error) {
      console.error("Could not load categories from tasks", error);
      const initialCategories = Array.from(new Set(initialTasks.map(t => t.category).filter((c?: string): c is string => !!c)));
      return initialCategories.sort();
    }
  });

  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
      }
    } catch (error) {
      console.error("Could not load theme from localStorage", error);
    }
    return 'light';
  });

  const [showArchived, setShowArchived] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
       console.error("Could not save theme to localStorage", error);
    }
  }, [theme]);
  
  // Debounced save effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (user) {
        setSyncStatus('syncing');
        cloudStorage.saveTasks(user.id, tasks)
          .then(() => setSyncStatus('saved'))
          .catch(() => setSyncStatus('error'));
      } else {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
          setSyncStatus('offline');
        } catch (error) {
          console.error("Could not save tasks to localStorage", error);
          setSyncStatus('error');
        }
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [tasks, user]);
  
  // Effect for checking due tasks and sending notifications
  useEffect(() => {
    if (notificationPermission !== 'granted' || view !== 'checklist') return;

    const checkInterval = setInterval(() => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const notifiedTasksKey = `notified-tasks-${todayStr}`;
      
      let notifiedTaskIds: string[];
      try {
        notifiedTaskIds = JSON.parse(localStorage.getItem(notifiedTasksKey) || '[]');
      } catch {
        notifiedTaskIds = [];
      }

      tasks.forEach(task => {
        if (task.dueDate === todayStr && !task.archived && !notifiedTaskIds.includes(task.id)) {
          new Notification('Tarefa vence hoje!', {
            body: `Não se esqueça de concluir: "${task.title}"`,
            icon: '/vite.svg',
          });
          notifiedTaskIds.push(task.id);
        }
      });
      
      try {
        localStorage.setItem(notifiedTasksKey, JSON.stringify(notifiedTaskIds));
      } catch (error) {
        console.error("Could not save notified tasks to localStorage", error);
      }
    }, 60 * 1000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [tasks, notificationPermission, view]);
/**
 * Loads and synchronizes tasks from the cloud.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<void>} A promise that resolves when the tasks are loaded and synchronized.
 */
  const loadAndSyncTasks = async (userId: string) => {
    setSyncStatus('syncing');
    try {
        const cloudTasks = await cloudStorage.loadTasks(userId);
        if (cloudTasks) {
            setTasks(cloudTasks.map((task: any) => ({ ...task, content: migrateContent(task.content || []) })));
            const cloudCategories = Array.from(new Set(cloudTasks.map((t: TaskType) => t.category).filter((c?: string): c is string => !!c)));
            setCategories(cloudCategories.sort());
        } else {
            // New user, migrate guest tasks to cloud
            await cloudStorage.saveTasks(userId, tasks);
        }
        setSyncStatus('saved');
    } catch (e) {
        setSyncStatus('error');
        alert("Não foi possível carregar os dados da nuvem. Verifique sua conexão e tente novamente.");
    }
  };
/**
 * Handles the Apple login process.
 */
  const handleAppleLogin = () => {
    const mockUser = { id: 'apple-user-123', name: 'Usuário Apple' };
    setUser(mockUser);
    loadAndSyncTasks(mockUser.id);
    setView('checklist');
  };
/**
 * Handles the guest login process.
 */
  const handleGuestLogin = () => {
    setUser(null);
    setSyncStatus('offline');
    setView('checklist');
  };
/**
 * Handles the user logout process.
 */
  const handleLogout = () => {
    setUser(null);
    setSyncStatus('offline');
    // Reload guest tasks
    const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
    setView('home');
  };
/**
 * Adds a new task to the list.
 */
  const handleAddTask = () => {
    const newTask: TaskType = {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      content: [],
      priority: 'none',
      dueDate: '',
      category: categoryFilter !== 'all' ? categoryFilter : '',
      archived: false,
    };
    setTasks([newTask, ...tasks]);
  };
/**
 * Sets the ID of the task to be deleted.
 * @param {string} taskId - The ID of the task to delete.
 */
  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
  };
/**
 * Confirms and deletes the selected task.
 */
  const handleConfirmDelete = () => {
    if (!taskToDeleteId) return;
    setTasks(tasks.filter((task) => task.id !== taskToDeleteId));
    setTaskToDeleteId(null);
  };
/**
 * Cancels the task deletion process.
 */
  const handleCancelDelete = () => {
    setTaskToDeleteId(null);
  };
  /**
 * Toggles the archive status of a task.
 * @param {string} taskId - The ID of the task to toggle.
 */
  const handleToggleArchiveTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, archived: !task.archived } : task
      )
    );
  };
/**
 * Updates the title of a task.
 * @param {string} taskId - The ID of the task to update.
 * @param {string} newTitle - The new title for the task.
 */
  const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, title: newTitle } : task
      )
    );
  };
/**
 * Updates the details of a task.
 * @param {string} taskId - The ID of the task to update.
 * @param {Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color'>>} details - The details to update.
 */
  const handleUpdateTaskDetails = (taskId: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color'>>) => {
    const finalDetails = { ...details };
    if (typeof finalDetails.category === 'string') {
        const trimmedCategory = finalDetails.category.trim();
        if (trimmedCategory && !categories.includes(trimmedCategory)) {
            setCategories(prev => [...prev, trimmedCategory].sort());
        }
        finalDetails.category = trimmedCategory;
    }

    setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, ...finalDetails } : task
    ));
  };
  /**
 * Adds a new content block to a task.
 * @param {string} taskId - The ID of the task.
 * @param {'subitem' | 'text'} type - The type of block to add.
 */
  const handleAddBlock = (taskId: string, type: 'subitem' | 'text') => {
    setTasks(tasks.map(task => {
        if (task.id === taskId) {
            if (type === 'subitem') {
                const newBlock: SubItemBlock = { id: Date.now().toString(), type: 'subitem', text: '', completed: false, children: [] };
                return { ...task, content: [...task.content, newBlock] };
            } else { // type === 'text'
                const newBlock: TextBlock = { id: Date.now().toString(), type: 'text', text: '' };
                return { ...task, content: [...task.content, newBlock] };
            }
        }
        return task;
    }));
  };
/**
 * Adds an attachment to a task.
 * @param {string} taskId - The ID of the task.
 * @param {File} file - The file to attach.
 */
  const handleAddAttachment = (taskId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        const newAttachment: AttachmentBlock = {
          id: Date.now().toString(),
          type: 'attachment',
          fileName: file.name,
          fileType: file.type,
          dataUrl: e.target.result,
          size: file.size,
        };

        setTasks(currentTasks => currentTasks.map(task => {
          if (task.id === taskId) {
            return { ...task, content: [...task.content, newAttachment] };
          }
          return task;
        }));
      }
    };
    reader.onerror = (error) => {
      console.error("Error reading file:", error);
      alert("Não foi possível ler o arquivo.");
    };
    reader.readAsDataURL(file);
  };
/**
 * Updates a content block within a task.
 * @param {string} taskId - The ID of the task.
 * @param {string} blockId - The ID of the block to update.
 * @param {Partial<ContentBlock>} updates - The updates to apply to the block.
 */
  const handleUpdateBlock = (taskId: string, blockId: string, updates: Partial<ContentBlock>) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const [newContentTree, foundInTree] = mapContentTree(task.content, blockId, (block) => {
          return { ...block, ...updates as Partial<SubItemBlock> };
        });

        if (foundInTree) {
          return { ...task, content: newContentTree };
        }

        const newContent = task.content.map(block => 
          block.id === blockId ? { ...block, ...updates } : block
        );
        return { ...task, content: newContent as ContentBlock[] };
      }
      return task;
    }));
  };
/**
 * Deletes a content block from a task.
 * @param {string} taskId - The ID of the task.
 * @param {string} blockId - The ID of the block to delete.
 */
  const handleDeleteBlock = (taskId: string, blockId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
          const [newContentTree, foundInTree] = filterContentTree(task.content, blockId);
          if (foundInTree) {
              return { ...task, content: newContentTree };
          }
          
          return { ...task, content: task.content.filter(block => block.id !== blockId) };
      }
      return task;
    }));
  };
/**
 * Toggles the completion status of a subitem.
 * @param {string} taskId - The ID of the task.
 * @param {string} subItemId - The ID of the subitem to toggle.
 */
  const handleToggleSubItem = (taskId: string, subItemId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const toggleAndUpdate = (content: ContentBlock[]): [ContentBlock[], boolean] => {
            let wasUnchecked = false;
            let found = false;
            
            const newContent = content.map(block => {
                if (found || block.type !== 'subitem') return block;

                if (block.id === subItemId) {
                    found = true;
                    const newCompleted = !block.completed;
                    if (!newCompleted) wasUnchecked = true;
                    
                    const newChildren = block.children.map(function markAllChildren(child): SubItemBlock {
                        return { ...child, completed: newCompleted, children: child.children.map(markAllChildren) };
                    });
                    return { ...block, completed: newCompleted, children: newChildren };
                }

                if (block.children.length > 0) {
                    const [newChildren, childWasUnchecked] = toggleAndUpdate(block.children);
                    if (childWasUnchecked) {
                        wasUnchecked = true;
                        return { ...block, children: newChildren as SubItemBlock[], completed: false };
                    }
                    return { ...block, children: newChildren as SubItemBlock[] };
                }
                return block;
            });

            return [newContent, wasUnchecked];
        };
        
        const [finalContent] = toggleAndUpdate(task.content);
        return { ...task, content: finalContent };
      }
      return task;
    }));
  };
  /**
 * Adds a nested subitem to a parent subitem.
 * @param {string} taskId - The ID of the task.
 * @param {string} parentId - The ID of the parent subitem.
 */
  const handleAddNestedSubItem = (taskId: string, parentId: string) => {
      setTasks(tasks.map(task => {
          if (task.id === taskId) {
              const newSubItem: SubItemBlock = { id: Date.now().toString(), type: 'subitem', text: '', completed: false, children: [] };
              const [newContent, found] = mapContentTree(task.content, parentId, (block) => ({
                  ...block,
                  children: [...block.children, newSubItem]
              }));

              if (found) {
                  return { ...task, content: newContent };
              }
          }
          return task;
      }));
  };
/**
 * Moves a content block within a task.
 * @param {string} taskId - The ID of the task.
 * @param {string} sourceId - The ID of the block to move.
 * @param {string | null} targetId - The ID of the target block.
 * @param {'before' | 'after' | 'end'} position - The position to move the block to.
 */
  const handleMoveBlock = (taskId: string, sourceId: string, targetId: string | null, position: 'before' | 'after' | 'end') => {
    setTasks(currentTasks => {
        const taskIndex = currentTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return currentTasks;

        const task = currentTasks[taskIndex];
        let sourceBlock: ContentBlock | null = null;

        function removeSource(content: ContentBlock[]): ContentBlock[] {
            const result: ContentBlock[] = [];
            for (const block of content) {
                if (block.id === sourceId) {
                    sourceBlock = block;
                    continue;
                }
                if (block.type === 'subitem' && block.children?.length > 0) {
                    result.push({ ...block, children: removeSource(block.children) as SubItemBlock[] });
                } else {
                    result.push(block);
                }
            }
            return result;
        }

        const contentWithoutSource = removeSource(task.content);

        if (!sourceBlock) {
            return currentTasks;
        }

        let newContent: ContentBlock[];

        if (position === 'end' || !targetId) {
            newContent = [...contentWithoutSource, sourceBlock];
        } else {
            function insertSource(content: ContentBlock[]): [ContentBlock[], boolean] {
                const result: ContentBlock[] = [];
                let inserted = false;
                for (const block of content) {
                    if (inserted) {
                      result.push(block);
                      continue;
                    }
                    if (block.id === targetId) {
                        if (position === 'before') {
                            result.push(sourceBlock!, block);
                        } else {
                            result.push(block, sourceBlock!);
                        }
                        inserted = true;
                        continue;
                    }
                    if (block.type === 'subitem' && block.children?.length > 0) {
                        const [newChildren, childInserted] = insertSource(block.children);
                        if (childInserted) inserted = true;
                        result.push({ ...block, children: newChildren as SubItemBlock[] });
                    } else {
                        result.push(block);
                    }
                }
                return [result, inserted];
            }
            [newContent] = insertSource(contentWithoutSource);
        }

        const newTasks = [...currentTasks];
        newTasks[taskIndex] = { ...task, content: newContent };
        return newTasks;
    });
  };
/**
 * Exports the current tasks as a JSON file.
 */
  const handleExportData = () => {
    try {
      const dataStr = JSON.stringify(tasks, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.download = `checklist-v2-backup-${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Failed to export data", error);
      alert("Ocorreu um erro ao exportar os dados.");
    }
  };
/**
 * Imports tasks from a JSON file.
 * @param {React.ChangeEvent<HTMLInputElement>} event - The file input change event.
 */
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const importedTasks: TaskType[] = JSON.parse(text);
          // Basic validation
          if (Array.isArray(importedTasks) && importedTasks.every(t => 'id' in t && 'title' in t)) {
            const migratedTasks = importedTasks.map(task => ({
                ...task,
                archived: task.archived || false,
                content: migrateContent(task.content || [])
            }));
            setTasks(migratedTasks);
            const importedCategories = Array.from(new Set(migratedTasks.map(t => t.category).filter(Boolean)));
            setCategories(importedCategories.sort());
            setIsSettingsOpen(false);
          } else {
            throw new Error("Invalid file format");
          }
        }
      } catch (error) {
        console.error("Failed to import data", error);
        alert("Ocorreu um erro ao importar os dados. Verifique o formato do arquivo.");
      }
    };
    reader.readAsText(file);
  };
/**
 * Shows the confirmation dialog for resetting data.
 */
  const handleResetData = () => {
      setShowResetConfirmation(true);
  };
  /**
 * Confirms and resets all application data.
 */
  const handleConfirmReset = () => {
    setTasks(initialTasks);
    const initialCategories = Array.from(new Set(initialTasks.map(t => t.category).filter(Boolean)));
    setCategories(initialCategories.sort());
    setPriorityFilter('all');
    setCategoryFilter('all');
    setStatusFilter('all');
    setShowResetConfirmation(false);
    setIsSettingsOpen(false);
    // Note: This doesn't clear cloud data for logged-in users, only local state.
    // For a full reset, we'd need a cloudStorage.delete() method.
  };
/**
 * Requests permission for notifications.
 */
  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };
/**
 * Adds a new category.
 */
  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !categories.includes(trimmedName)) {
      setCategories(prev => [...prev, trimmedName].sort());
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };
  /**
 * Sets the category to be deleted.
 * @param {string} categoryName - The name of the category to delete.
 */
  const handleDeleteCategory = (categoryName: string) => {
    setCategoryToDelete(categoryName);
  };
/**
 * Confirms and deletes the selected category.
 */
  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;

    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.category === categoryToDelete ? { ...task, category: '' } : task
      )
    );

    setCategories(prevCategories =>
      prevCategories.filter(c => c !== categoryToDelete)
    );

    if (categoryFilter === categoryToDelete) {
      setCategoryFilter('all');
    }
    
    setCategoryToDelete(null);
  };
/**
 * Cancels the category deletion process.
 */
  const handleCancelDeleteCategory = () => {
    setCategoryToDelete(null);
  };

  const filteredTasks = tasks.filter((task) => {
    const isArchivedMatch = showArchived ? task.archived : !task.archived;
    const isPriorityMatch = priorityFilter === 'all' || task.priority === priorityFilter;
    const isCategoryMatch = categoryFilter === 'all' || task.category === categoryFilter;

    const isStatusMatch = () => {
      if (statusFilter === 'all') return true;
      
      const subItems = task.content.filter(c => c.type === 'subitem') as SubItemBlock[];
      if (subItems.length === 0) {
        // Tasks without subitems are considered 'in-progress'
        return statusFilter === 'in-progress';
      }
      
      const allCompleted = subItems.every(item => item.completed);
      
      if (statusFilter === 'completed') return allCompleted;
      if (statusFilter === 'in-progress') return !allCompleted;
      
      return false;
    };
    
    return isArchivedMatch && isPriorityMatch && isCategoryMatch && isStatusMatch();
  });

  const archivedTaskCount = tasks.filter(t => t.archived).length;
  const pageTitle = showArchived ? 'Tarefas Arquivadas' : categoryFilter !== 'all' ? categoryFilter : 'Suas Tarefas';

  if (view === 'home') {
    return <HomeScreen onAppleLogin={handleAppleLogin} onGuestLogin={handleGuestLogin} />;
  }
  
  const FilterModal = () => (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 z-40 flex justify-center items-end sm:items-center"
        onClick={() => setIsFilterModalOpen(false)}
    >
        <div 
            className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400 flex items-center gap-2">
                    <FilterIcon />
                    <span>Filtrar Tarefas</span>
                </h3>
                <button onClick={() => setIsFilterModalOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar filtros">
                    <XIcon />
                </button>
            </div>
            
            <div className="space-y-6">
                <div>
                    <label htmlFor="priority-filter-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prioridade</label>
                    <select
                        id="priority-filter-modal"
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
                        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                    >
                        {Object.entries(priorityOptions).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="status-filter-modal" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                        id="status-filter-modal"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
                    >
                        {Object.entries(statusOptions).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    </div>
  );

  const sidebarProps = {
    setIsSettingsOpen,
    showArchived,
    setShowArchived,
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
  };


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 transition-colors duration-300">
      
      <ConfirmationDialog
        isOpen={!!taskToDeleteId}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Excluir Tarefa"
        message="Tem certeza de que deseja excluir esta tarefa permanentemente? Esta ação não pode ser desfeita."
      />

      <ConfirmationDialog
        isOpen={!!categoryToDelete}
        onClose={handleCancelDeleteCategory}
        onConfirm={handleConfirmDeleteCategory}
        title="Excluir Categoria"
        message={`Tem certeza de que deseja excluir a categoria "${categoryToDelete}"? Esta ação removerá a categoria de todas as tarefas associadas, mas não excluirá as tarefas em si.`}
      />

      <ConfirmationDialog
          isOpen={showResetConfirmation}
          onClose={() => setShowResetConfirmation(false)}
          onConfirm={handleConfirmReset}
          title="Redefinir Aplicativo"
          message="Tem certeza de que deseja excluir TODOS os dados? Esta ação é irreversível."
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExport={handleExportData}
        onImport={handleImportData}
        onReset={handleResetData}
        theme={theme}
        onThemeChange={setTheme}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={handleRequestNotificationPermission}
      />

      {isFilterModalOpen && <FilterModal />}

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-30 lg:hidden" 
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          ></div>
          <aside className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 p-6 z-40 lg:hidden animate-slide-in-left overflow-y-auto">
            <button 
              onClick={() => setIsDrawerOpen(false)} 
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Fechar menu"
            >
              <XIcon />
            </button>
            <SidebarContent 
              {...sidebarProps}
              onClose={() => setIsDrawerOpen(false)}
            />
          </aside>
        </>
      )}
      
      <div className="lg:grid lg:grid-cols-[288px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700/50 p-6 h-screen sticky top-0 overflow-y-auto">
           <SidebarContent {...sidebarProps} />
        </aside>

        {/* Main Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          <header className="flex justify-between items-center mb-6 gap-4">
             <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <button onClick={() => setIsDrawerOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300">
                    <MenuIcon />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200 truncate" title={pageTitle}>
                        {pageTitle}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <FilterIcon />
                    <span className="hidden sm:inline">Filtros</span>
                </button>
                {!showArchived && (
                    <button
                        onClick={handleAddTask}
                        className="hidden lg:flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105 shadow-lg"
                    >
                        <PlusIcon />
                        <span>Nova Tarefa</span>
                    </button>
                )}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                categories={categories}
                onUpdateTitle={handleUpdateTaskTitle}
                onDeleteTask={handleDeleteTask}
                onAddBlock={handleAddBlock}
                onAddAttachment={handleAddAttachment}
                onUpdateBlock={handleUpdateBlock}
                onDeleteBlock={handleDeleteBlock}
                onToggleSubItem={handleToggleSubItem}
                onAddNestedSubItem={handleAddNestedSubItem}
                onUpdateDetails={handleUpdateTaskDetails}
                onToggleArchive={handleToggleArchiveTask}
                onMoveBlock={handleMoveBlock}
              />
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Tudo limpo por aqui!</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                {showArchived ? 'Você não tem tarefas arquivadas.' : 'Crie uma nova tarefa para começar.'}
              </p>
              {!showArchived && (
                 <button
                    onClick={handleAddTask}
                    className="mt-6 flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105 shadow-lg mx-auto"
                >
                    <PlusIcon />
                    <span>Criar Primeira Tarefa</span>
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* FAB for Mobile */}
      {!showArchived && (
        <button
          onClick={handleAddTask}
          className="lg:hidden fixed bottom-6 right-6 bg-teal-600 text-white p-4 rounded-full shadow-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-110"
          aria-label="Adicionar nova tarefa"
        >
          <PlusIcon />
        </button>
      )}
    </div>
  );
};

export default App;
