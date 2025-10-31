

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority, AttachmentBlock, SavedAnalysis, SyncStatus } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, XIcon, SettingsIcon, ArchiveIcon, SpinnerIcon, CloudCheckIcon, CloudOffIcon, ExclamationCircleIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon, MenuIcon, BellIcon, SparklesIcon, BookmarkIcon, MicrophoneIcon, SearchIcon, ViewGridIcon, ViewListIcon, ExclamationTriangleIcon, InboxIcon, ChevronDownIcon, UnarchiveIcon, RestoreIcon } from './components/Icons';
import ConfirmationDialog from './components/ConfirmationDialog';
import SettingsModal from './components/SettingsModal';
import PanoramaModal from './components/PanoramaModal';
import SavedAnalysesModal from './components/SavedAnalysesModal';
import LiveConversationModal from './components/LiveConversationModal';
import Sidebar from './components/Sidebar';
import ImportConfirmationModal from './components/ImportConfirmationModal';

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
    tags: ['urgente', 'escrita'],
    archived: false,
    color: '#581c1c',
    createdAt: '2024-08-10T10:00:00.000Z',
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
    tags: ['pesquisa', 'escrita'],
    archived: false,
    createdAt: '2024-08-11T11:00:00.000Z',
  },
    {
    id: '3',
    title: 'Ideias para o Futuro',
    content: [
        { id: '3-1', type: 'text', text: '- Pesquisar sobre a história dos motoclubes no Brasil.\n- Entrevistar membros de diferentes motoclubes.\n- Analisar a simbologia das vestimentas.' }
    ],
    priority: 'low',
    category: 'Pesquisa',
    tags: ['ideias'],
    archived: false,
    createdAt: '2024-08-12T12:00:00.000Z',
  },
];

const LOCAL_STORAGE_KEY = 'checklist-app-tasks-guest';
const ANALYSES_STORAGE_KEY = 'checklist-app-analyses';
const CLOUD_STORAGE_KEY_PREFIX = 'checklist-app-cloud-';
const THEME_STORAGE_KEY = 'checklist-app-theme';
const LAYOUT_STORAGE_KEY = 'checklist-app-layout';

type Theme = 'light' | 'dark';
type View = 'home' | 'checklist';
type User = { id: string; name: string };
type LayoutMode = 'grid' | 'list';
type MainView = 'active' | 'today' | 'archived' | 'trash';
type SearchScope = 'all' | 'title' | 'content' | 'category';

interface BackupData {
  version: number;
  tasks: TaskType[];
  savedAnalyses: SavedAnalysis[];
}


// Mock Cloud Storage API
const cloudStorage = {
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

// Recursive helper functions for deep state manipulation
const mapContentTree = (content: ContentBlock[], targetId: string, transform: (block: SubItemBlock) => SubItemBlock): [ContentBlock[], boolean] => {
  let wasModified = false;
  const newContent: ContentBlock[] = [];

  for (const block of content) {
    if (wasModified) {
      newContent.push(block);
      continue;
    }

    if (block.id === targetId && block.type === 'subitem') {
      wasModified = true;
      newContent.push(transform(block));
      continue;
    }
    
    if (block.type === 'subitem' && block.children?.length > 0) {
      const [newChildren, childWasModified] = mapContentTree(block.children, targetId, transform);
      if (childWasModified) {
        wasModified = true;
        newContent.push({ ...block, children: newChildren as SubItemBlock[] });
      } else {
        newContent.push(block);
      }
    } else {
      newContent.push(block);
    }
  }

  return [newContent, wasModified];
};

const filterContentTree = (content: ContentBlock[], targetId: string): [ContentBlock[], boolean] => {
  let wasModified = false;
  const newContent: ContentBlock[] = [];

  for (const block of content) {
    if (wasModified) {
      newContent.push(block);
      continue;
    }
    
    if (block.id === targetId) {
      wasModified = true;
      // Do not push the block, effectively removing it.
      continue;
    }

    if (block.type === 'subitem' && block.children?.length > 0) {
      const [newChildren, childWasModified] = filterContentTree(block.children, targetId);
      if (childWasModified) {
        wasModified = true;
        newContent.push({ ...block, children: newChildren as SubItemBlock[] });
      } else {
        newContent.push(block);
      }
    } else {
      newContent.push(block);
    }
  }

  return [newContent, wasModified];
};

const findBlockInTree = (content: ContentBlock[], blockId: string): ContentBlock | null => {
  for (const block of content) {
    if (block.id === blockId) {
      return block;
    }
    if (block.type === 'subitem' && block.children?.length > 0) {
      const foundInChildren = findBlockInTree(block.children, blockId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
  }
  return null;
};

const getAllSubItems = (content: ContentBlock[]): SubItemBlock[] => {
    let all: SubItemBlock[] = [];
    for (const block of content) {
        if (block.type === 'subitem') {
            all.push(block);
            if (block.children && block.children.length > 0) {
                all = all.concat(getAllSubItems(block.children));
            }
        }
    }
    return all;
};


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


const priorityOptions: Record<Priority | 'all', string> = {
    all: 'Todas as Prioridades',
    none: 'Nenhuma',
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
};

const statusOptions: Record<'all' | 'completed' | 'in-progress', string> = {
    all: 'Todos os Status',
    'in-progress': 'Em Andamento',
    completed: 'Concluído',
};


const HomeScreen = ({ onGuestLogin }: { onGuestLogin: () => void; }) => (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white flex flex-col items-center justify-center p-4 text-center transition-colors duration-300 overflow-hidden relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-200 dark:text-gray-800/70">
            <ClipboardListIcon className="h-[40rem] w-[40rem] opacity-30" />
        </div>
        <div className="max-w-2xl z-10 flex flex-col items-center">
            <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 pb-2">
                Checklist Inteligente
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-lg sm:text-xl mt-4 max-w-xl">
                Organize suas tarefas com subtarefas aninhadas, defina prioridades e receba sugestões inteligentes da IA para otimizar seu fluxo de trabalho.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
                <button 
                    onClick={onGuestLogin}
                    className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-300 dark:focus:ring-teal-800"
                >
                    Acessar como Visitante
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
                Como visitante, seus dados são salvos apenas no seu navegador.
            </p>
        </div>
    </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  const [mainView, setMainView] = useState<MainView>('active');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isConfirmingEmptyTrash, setIsConfirmingEmptyTrash] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanoramaOpen, setIsPanoramaOpen] = useState(false);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const [isLiveConversationOpen, setIsLiveConversationOpen] = useState(false);
  const [isImportConfirmationOpen, setIsImportConfirmationOpen] = useState(false);
  const [importFileData, setImportFileData] = useState<BackupData | null>(null);

  const [theme, setTheme] = useState<Theme>('light');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  const [recentlyDeletedBlock, setRecentlyDeletedBlock] = useState<{ block: ContentBlock; taskId: string; originalIndex: number } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // --- Initialization & Data Persistence ---

  useEffect(() => {
    // Theme initialization
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Layout initialization
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY) as LayoutMode | null;
    setLayoutMode(savedLayout || 'grid');

    // Notification permission status
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);


  const guestLogin = () => {
    const guestUser = { id: 'guest', name: 'Visitante' };
    setUser(guestUser);
    setView('checklist');
    loadData(guestUser.id);
  };

  const loadData = async (userId: string) => {
    setIsLoading(true);
    let loadedTasks: TaskType[] | null = null;
    let loadedAnalyses: SavedAnalysis[] = [];

    if (userId === 'guest') {
      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
      loadedTasks = localData ? JSON.parse(localData) : initialTasks;
      const localAnalyses = localStorage.getItem(ANALYSES_STORAGE_KEY);
      loadedAnalyses = localAnalyses ? JSON.parse(localAnalyses) : [];
    } else {
      // Cloud load logic
      try {
        setSyncStatus('syncing');
        loadedTasks = await cloudStorage.loadTasks(userId);
        // Add analysis loading from cloud if needed
        setSyncStatus('saved');
      } catch {
        setSyncStatus('error');
      }
    }
    
    const migratedTasks = (loadedTasks || []).map(task => ({
        ...task,
        content: migrateContent(task.content)
    }));

    setTasks(migratedTasks);
    setSavedAnalyses(loadedAnalyses);
    setIsLoading(false);
  };

  const saveData = useCallback(async (tasksToSave: TaskType[], analysesToSave: SavedAnalysis[]) => {
    if (!user) return;
    
    if (user.id === 'guest') {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasksToSave));
        localStorage.setItem(ANALYSES_STORAGE_KEY, JSON.stringify(analysesToSave));
    } else {
        try {
            setSyncStatus('syncing');
            await cloudStorage.saveTasks(user.id, tasksToSave);
            // Add analysis saving to cloud if needed
            await new Promise(resolve => setTimeout(resolve, 500)); // optimistic UI delay
            setSyncStatus('saved');
        } catch {
            setSyncStatus('error');
        }
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading) {
      saveData(tasks, savedAnalyses);
    }
  }, [tasks, savedAnalyses, isLoading, saveData]);
  
   // --- Notifications ---

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };
  
  const scheduleNotifications = useCallback(() => {
    // This is a simplified version. A real app would use a service worker for reliable notifications.
    const todayStr = new Date().toISOString().split('T')[0];
    tasks.forEach(task => {
        // FIX: Property 'completed' does not exist on type 'TaskType'. Task completion is derived from its sub-items.
        const subItems = getAllSubItems(task.content);
        const isTaskCompleted = subItems.length > 0 && subItems.every(item => item.completed);
        if (task.dueDate?.startsWith(todayStr) && !isTaskCompleted && !task.archived) {
             if (notificationPermission === 'granted') {
                 new Notification('Lembrete de Tarefa', {
                     body: `Não se esqueça de concluir: "${task.title}"`,
                     icon: '/vite.svg', // Replace with your app's icon
                 });
             }
        }
    });
  }, [tasks, notificationPermission]);

  useEffect(() => {
      scheduleNotifications();
      const interval = setInterval(scheduleNotifications, 60 * 60 * 1000); // Check every hour
      return () => clearInterval(interval);
  }, [scheduleNotifications]);


  // --- CRUD & State Management ---

  const handleAddTask = () => {
    const newId = Date.now().toString();
    const newTask: TaskType = {
      id: newId,
      title: 'Nova Tarefa',
      content: [],
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
  };
  
  const handleLiveCreateTasks = (newTasks: Array<{ title: string; subItems: string[] }>) => {
    const createdTasks: TaskType[] = newTasks.map((taskData, index) => {
        const taskId = `${Date.now()}-${index}`;
        const content: SubItemBlock[] = (taskData.subItems || []).map((subItemText, subIndex) => ({
            id: `${taskId}-${subIndex}`,
            type: 'subitem',
            text: subItemText,
            completed: false,
            children: []
        }));
        return {
            id: taskId,
            title: taskData.title,
            content: content,
            archived: false,
            createdAt: new Date().toISOString(),
        };
    });
    setTasks(prev => [...createdTasks, ...prev]);
    setIsLiveConversationOpen(false); // Close modal after creation
  };

  const handleUpdateTaskTitle = (id: string, title: string) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, title } : task)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prevTasks =>
        prevTasks.map(task =>
            task.id === id ? { ...task, deletedAt: new Date().toISOString() } : task
        )
    );
    setRecentlyDeletedBlock(null); // Clear undo state when deleting a task
  };
  
  const handleRestoreTask = (id:string) => {
    setTasks(prevTasks =>
        prevTasks.map(task =>
            task.id === id ? { ...task, deletedAt: undefined, archived: false } : task // Also unarchive when restoring
        )
    );
  };

  const handlePermanentlyDeleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
  };
  
  const handleEmptyTrash = () => {
    setTasks(prevTasks => prevTasks.filter(task => !task.deletedAt));
    setIsConfirmingEmptyTrash(false);
  };

  const handleUpdateTaskDetails = (id: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color' | 'tags'>>) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, ...details } : task)));
  };

  const handleToggleArchiveTask = (id: string) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, archived: !task.archived } : task)));
  };

  const handleAddBlock = (taskId: string, type: 'subitem' | 'text') => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const newBlock: ContentBlock = type === 'subitem'
          ? { id: Date.now().toString(), type: 'subitem', text: '', completed: false, children: [] }
          : { id: Date.now().toString(), type: 'text', text: '' };
        return { ...task, content: [...task.content, newBlock] };
      }
      return task;
    }));
  };
  
  const handleAddAttachment = (taskId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
         const newBlock: AttachmentBlock = {
           id: Date.now().toString(),
           type: 'attachment',
           fileName: file.name,
           fileType: file.type,
           size: file.size,
           dataUrl: dataUrl
         };
         setTasks(tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, content: [...task.content, newBlock] };
            }
            return task;
         }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateBlock = (taskId: string, blockId: string, updates: Partial<ContentBlock>) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const [newContent, _] = mapContentTree(task.content, blockId, (block) => ({ ...block, ...updates }));
        return { ...task, content: newContent };
      }
      return task;
    }));
  };

  const handleClearUndoState = useCallback(() => {
    if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
    }
    setRecentlyDeletedBlock(null);
  }, []);

  const handleDeleteBlock = (taskId: string, blockId: string) => {
    handleClearUndoState();
    let originalIndex = -1;
    let deletedBlock: ContentBlock | null = null;
    
    setTasks(tasks.map(task => {
        if (task.id === taskId) {
            originalIndex = task.content.findIndex(b => b.id === blockId);
            deletedBlock = findBlockInTree(task.content, blockId);
            const [newContent, _] = filterContentTree(task.content, blockId);
            return { ...task, content: newContent };
        }
        return task;
    }));

    if (deletedBlock) {
        setRecentlyDeletedBlock({ block: deletedBlock, taskId, originalIndex });
        undoTimeoutRef.current = window.setTimeout(handleClearUndoState, 5000);
    }
  };
  
  const handleUndoDeleteBlock = () => {
    if (!recentlyDeletedBlock) return;
    const { block, taskId, originalIndex } = recentlyDeletedBlock;

    setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === taskId) {
            const newContent = [...task.content];
            if (originalIndex >= 0 && originalIndex <= newContent.length) {
                newContent.splice(originalIndex, 0, block);
            } else {
                newContent.push(block);
            }
            return { ...task, content: newContent };
        }
        return task;
    }));
    
    handleClearUndoState();
  };

  const handleToggleSubItem = (taskId: string, subItemId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const [newContent, _] = mapContentTree(task.content, subItemId, (block) => ({ ...block, completed: !block.completed }));
        return { ...task, content: newContent };
      }
      return task;
    }));
  };
  
  // FIX: Refactored the recursive function `setCompletionRecursively` to use function overloads.
  // This provides better type inference for recursive calls, resolving the type error without an unsafe cast.
  const handleToggleAllSubItems = (taskId: string, shouldBeCompleted: boolean) => {
     setTasks(tasks.map(task => {
        if (task.id !== taskId) return task;
        
        function setCompletionRecursively(items: SubItemBlock[]): SubItemBlock[];
        function setCompletionRecursively(items: ContentBlock[]): ContentBlock[];
        function setCompletionRecursively(items: ContentBlock[]): ContentBlock[] {
            return items.map(item => {
                if (item.type === 'subitem') {
                    // With overloads, the cast is no longer needed.
                    // The recursive call with item.children (SubItemBlock[]) will return SubItemBlock[].
                    return {
                        ...item,
                        completed: shouldBeCompleted,
                        children: setCompletionRecursively(item.children)
                    };
                }
                return item;
            });
        };
        
        return { ...task, content: setCompletionRecursively(task.content) };
    }));
  };


  const handleAddNestedSubItem = (taskId: string, parentId: string) => {
    const newSubItem: SubItemBlock = {
      id: Date.now().toString(),
      type: 'subitem',
      text: '',
      completed: false,
      children: [],
    };
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const [newContent, _] = mapContentTree(task.content, parentId, (block) => ({
            ...block,
            children: [...block.children, newSubItem]
        }));
        return { ...task, content: newContent };
      }
      return task;
    }));
  };
  
  const handleMoveBlock = (taskId: string, sourceId: string, targetId: string | null, position: 'before' | 'after' | 'end') => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id !== taskId) return task;

      let sourceBlock: ContentBlock | null = null;

      // Find and remove source block
      const removeSource = (content: ContentBlock[]): ContentBlock[] => {
        return content.reduce((acc, block) => {
          if (block.id === sourceId) {
            sourceBlock = block;
            return acc;
          }
          if (block.type === 'subitem' && block.children.length > 0) {
            // FIX: Spreading a discriminated union (`...block`) can confuse TypeScript inside a `reduce` callback.
            // Reconstructing the object explicitly avoids type ambiguity and resolves the error.
            const updatedBlock: SubItemBlock = {
              id: block.id,
              type: 'subitem',
              text: block.text,
              completed: block.completed,
              children: removeSource(block.children) as SubItemBlock[],
            };
            return [...acc, updatedBlock];
          }
          return [...acc, block];
        }, [] as ContentBlock[]);
      };
      
      let newContent = removeSource(task.content);
      if (!sourceBlock) return task; // Source not found, do nothing

      // Insert source block at target position
      const insertTarget = (content: ContentBlock[]): ContentBlock[] => {
         if (targetId === null && position === 'end') {
             return [...content, sourceBlock!];
         }
         
         return content.reduce((acc, block) => {
            if (block.id === targetId) {
                if (position === 'before') {
                    return [...acc, sourceBlock!, block];
                }
                if (position === 'after') {
                    return [...acc, block, sourceBlock!];
                }
            }
             if (block.type === 'subitem' && block.children.length > 0) {
                // FIX: Spreading a discriminated union (`...block`) can confuse TypeScript inside a `reduce` callback.
                // Reconstructing the object explicitly avoids type ambiguity and resolves the error.
                const updatedBlock: SubItemBlock = {
                  id: block.id,
                  type: 'subitem',
                  text: block.text,
                  completed: block.completed,
                  children: insertTarget(block.children) as SubItemBlock[],
                };
                return [...acc, updatedBlock];
            }
            return [...acc, block];
         }, [] as ContentBlock[]);
      };
      
      newContent = insertTarget(newContent);
      return { ...task, content: newContent };
    }));
  };
  
  const handleMoveTask = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    setTasks(prevTasks => {
        const sourceIndex = prevTasks.findIndex(t => t.id === sourceId);
        const targetIndex = prevTasks.findIndex(t => t.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return prevTasks;
        
        const [removed] = prevTasks.splice(sourceIndex, 1);
        const newTargetIndex = prevTasks.findIndex(t => t.id === targetId);
        
        if (position === 'before') {
            prevTasks.splice(newTargetIndex, 0, removed);
        } else { // 'after'
            prevTasks.splice(newTargetIndex + 1, 0, removed);
        }

        return [...prevTasks];
    });
  };
  
  // --- AI Features ---

  const handleSuggestSubItems = async (taskId: string) => {
    if (!process.env.API_KEY) {
        alert("A chave da API do Gemini não foi configurada.");
        return;
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isSuggesting: true } : t));

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const existingSubItems = getAllSubItems(task.content).map(item => item.text).join(', ');

        const prompt = `
            Baseado no título da tarefa "${task.title}", gere uma lista de 3 a 5 subtarefas acionáveis em português.
            As subtarefas devem ser curtas e diretas.
            ${existingSubItems.length > 0 ? `As seguintes subtarefas já existem, então não as repita: ${existingSubItems}.` : ''}
            Responda APENAS com um array JSON de strings, como este: ["Fazer X", "Pesquisar Y", "Revisar Z"]
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
        });

        const suggestions: string[] = JSON.parse(response.text);

        setTasks(prev => prev.map(t => {
            if (t.id === taskId) {
                const newSubItems: SubItemBlock[] = suggestions.map(text => ({
                    id: `${Date.now()}-${Math.random()}`,
                    type: 'subitem',
                    text: text,
                    completed: false,
                    children: []
                }));
                return { ...t, content: [...t.content, ...newSubItems], isSuggesting: false };
            }
            return t;
        }));

    } catch (error) {
        console.error("Error suggesting sub-items:", error);
        alert("Não foi possível gerar sugestões. Verifique o console para mais detalhes.");
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isSuggesting: false } : t));
    }
  };
  
  const handleSaveAnalysis = (content: string) => {
      const newAnalysis: SavedAnalysis = {
          id: Date.now().toString(),
          title: `Análise de ${new Date().toLocaleDateString('pt-BR')}`,
          content,
          createdAt: new Date().toISOString(),
      };
      setSavedAnalyses(prev => [...prev, newAnalysis]);
  };
  
  const handleDeleteAnalysis = (id: string) => {
      setSavedAnalyses(prev => prev.filter(a => a.id !== id));
  };
  
  // --- Data Export/Import ---
  const handleExportData = () => {
      const backupData: BackupData = {
          version: 2,
          tasks: tasks,
          savedAnalyses: savedAnalyses,
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `checklist_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
  };
  
  const handleImportFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const result = e.target?.result as string;
            const data = JSON.parse(result) as BackupData;
            // Basic validation
            if (data && Array.isArray(data.tasks) && (data.savedAnalyses === undefined || Array.isArray(data.savedAnalyses))) {
                setImportFileData(data);
                setIsImportConfirmationOpen(true);
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch (error) {
            alert("Erro ao ler o arquivo de backup.");
            console.error("Import error:", error);
        }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };
  
  const handleConfirmImport = (mode: 'merge' | 'replace') => {
      if (!importFileData) return;

      if (mode === 'replace') {
          setTasks(importFileData.tasks || []);
          setSavedAnalyses(importFileData.savedAnalyses || []);
      } else { // merge
          const existingTaskIds = new Set(tasks.map(t => t.id));
          const newTasks = importFileData.tasks.filter(t => !existingTaskIds.has(t.id));

          const existingAnalysisIds = new Set(savedAnalyses.map(a => a.id));
          const newAnalyses = (importFileData.savedAnalyses || []).filter(a => !existingAnalysisIds.has(a.id));

          setTasks(prev => [...prev, ...newTasks]);
          setSavedAnalyses(prev => [...prev, ...newAnalyses]);
      }
      setIsImportConfirmationOpen(false);
      setImportFileData(null);
  };

  
  // --- App Reset ---

  const handleResetApp = () => {
    setTasks(initialTasks);
    setSavedAnalyses([]);
    setIsConfirmingReset(false);
    // Optionally clear local storage if guest mode is persistent
    if (user?.id === 'guest') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(ANALYSES_STORAGE_KEY);
    }
  };
  
  // --- Category Management ---
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean) as string[])].sort();

  const handleAddCategory = () => {
      if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
          // This doesn't create a task, just makes the category available.
          // A better approach might be to just let users type categories freely.
          // For now, let's say adding a category selects it.
          setCategoryFilter(newCategoryName.trim());
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
      setTasks(tasks.map(task => {
          if (task.category === categoryToDelete) {
              return { ...task, category: undefined };
          }
          return task;
      }));
      if (categoryFilter === categoryToDelete) {
          setCategoryFilter('all');
      }
  };
  
  const handleLogout = () => {
      setUser(null);
      setView('home');
      setTasks([]);
      setSavedAnalyses([]);
  };

  // --- Filtering & Derived State ---
  const archivedTaskCount = tasks.filter(t => t.archived && !t.deletedAt).length;
  const trashedTaskCount = tasks.filter(t => !!t.deletedAt).length;
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))].sort();

  const getFilteredTasks = useCallback(() => {
    let tasksToDisplay: TaskType[];

    if (mainView === 'trash') {
        tasksToDisplay = tasks.filter(task => !!task.deletedAt);
        return tasksToDisplay.sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());
    }

    const nonDeletedTasks = tasks.filter(task => !task.deletedAt);

    if (mainView === 'archived') {
      tasksToDisplay = nonDeletedTasks.filter(task => task.archived);
    } else { // 'active' or 'today'
      tasksToDisplay = nonDeletedTasks.filter(task => !task.archived);
      if (mainView === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        tasksToDisplay = tasksToDisplay.filter(task => task.dueDate?.startsWith(todayStr));
      }
    }
    
    // Apply search
    if (searchTerm) {
        tasksToDisplay = tasksToDisplay.filter(task => {
            const term = searchTerm.toLowerCase();
            const inTitle = task.title.toLowerCase().includes(term);
            const inContent = searchScope === 'all' || searchScope === 'content'
                ? task.content.some(block => 'text' in block && block.text.toLowerCase().includes(term))
                : false;
            const inCategory = searchScope === 'all' || searchScope === 'category'
                ? task.category?.toLowerCase().includes(term)
                : false;
            
            switch (searchScope) {
                case 'title': return inTitle;
                case 'content': return inContent;
                case 'category': return inCategory;
                default: return inTitle || inContent || inCategory;
            }
        });
    }

    // Apply filters
    if (categoryFilter !== 'all') {
      tasksToDisplay = tasksToDisplay.filter(task => task.category === categoryFilter);
    }
    if (priorityFilter !== 'all') {
      tasksToDisplay = tasksToDisplay.filter(task => (task.priority || 'none') === priorityFilter);
    }
     if (statusFilter !== 'all') {
        tasksToDisplay = tasksToDisplay.filter(task => {
            const subItems = getAllSubItems(task.content);
            if (subItems.length === 0) return statusFilter === 'in-progress'; // No items, can't be completed
            const isCompleted = subItems.every(item => item.completed);
            return statusFilter === 'completed' ? isCompleted : !isCompleted;
        });
    }
    if (tagFilter !== 'all') {
      tasksToDisplay = tasksToDisplay.filter(task => task.tags?.includes(tagFilter));
    }
    
    return tasksToDisplay;
  }, [tasks, mainView, searchTerm, searchScope, categoryFilter, priorityFilter, statusFilter, tagFilter]);
  
  const filteredTasks = getFilteredTasks();

  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setStatusFilter('all');
    setTagFilter('all');
  };

  const areFiltersActive = searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all' || tagFilter !== 'all';

  if (view === 'home') {
    return <HomeScreen onGuestLogin={guestLogin} />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-800 transition-colors duration-300">
      <div className={`fixed inset-0 z-30 bg-black/50 lg:hidden ${isSidebarOpen ? 'block' : 'hidden'}`} onClick={() => setIsSidebarOpen(false)}></div>
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-r border-gray-200 dark:border-gray-700/50 p-6 z-40 transform transition-transform lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          tasks={tasks}
          categories={categories}
          allTags={allTags}
          mainView={mainView}
          setMainView={setMainView}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          archivedTaskCount={archivedTaskCount}
          trashedTaskCount={trashedTaskCount}
          syncStatus={syncStatus}
          handleLogout={handleLogout}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          handleAddCategory={handleAddCategory}
          handleDeleteCategory={handleDeleteCategory}
          setIsSettingsOpen={setIsSettingsOpen}
          setIsPanoramaOpen={setIsPanoramaOpen}
          setIsSavedAnalysesOpen={setIsSavedAnalysesOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </aside>
      
      <div className="flex-1 lg:pl-72 flex flex-col overflow-y-auto">
        <header className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-20 p-4 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex items-center justify-between gap-4">
             <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300">
                <MenuIcon />
            </button>
            <div className="relative flex-grow max-w-xl">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-teal-500 focus:ring-teal-500 rounded-lg py-2 pl-10 pr-4"
              />
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setIsLiveConversationOpen(true)}
                    className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Criar tarefa com IA"
                >
                    <MicrophoneIcon />
                </button>
                <div className="hidden sm:flex items-center gap-2">
                    <button
                        onClick={() => setLayoutMode('grid')}
                        className={`p-2.5 rounded-lg transition-colors ${layoutMode === 'grid' ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Visualização em Grade"
                    >
                        <ViewGridIcon />
                    </button>
                    <button
                        onClick={() => setLayoutMode('list')}
                        className={`p-2.5 rounded-lg transition-colors ${layoutMode === 'list' ? 'bg-teal-500 text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        title="Visualização em Lista"
                    >
                        <ViewListIcon />
                    </button>
                </div>
            </div>
          </div>
        </header>

        <main className="flex-grow">
          {mainView === 'trash' ? (
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                        <TrashIcon className="h-7 w-7" /> Lixeira
                    </h2>
                    {filteredTasks.length > 0 && (
                        <button 
                            onClick={() => setIsConfirmingEmptyTrash(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <TrashIcon /> Esvaziar Lixeira
                        </button>
                    )}
                </div>
                {isLoading ? (
                  <div className="text-center py-20"><SpinnerIcon /></div>
                ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                        <TrashIcon className="h-16 w-16 mx-auto" />
                        <p className="mt-4 text-lg font-semibold">A lixeira está vazia.</p>
                        <p className="mt-1 text-sm">Itens excluídos aparecerão aqui.</p>
                    </div>
                ) : (
                    <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-6 max-w-4xl mx-auto'}>
                        {filteredTasks.map(task => (
                            <div key={task.id} className="relative group/trashitem">
                                <div className="absolute inset-0 bg-gray-600/20 dark:bg-black/40 rounded-lg backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 opacity-0 group-hover/trashitem:opacity-100 transition-opacity duration-300">
                                    <button
                                        onClick={() => handleRestoreTask(task.id)}
                                        className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-transform hover:scale-105"
                                    >
                                        <RestoreIcon />
                                        Restaurar
                                    </button>
                                    <button
                                        onClick={() => handlePermanentlyDeleteTask(task.id)}
                                        className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-transform hover:scale-105"
                                    >
                                        <TrashIcon />
                                        Excluir para Sempre
                                    </button>
                                </div>
                                <div className="transition-all duration-300 group-hover/trashitem:opacity-30 group-hover/trashitem:scale-95 pointer-events-none">
                                    <TaskCard
                                        task={task}
                                        categories={categories}
                                        onUpdateTitle={() => {}}
                                        onDeleteTask={() => {}}
                                        onAddBlock={() => {}}
                                        onAddAttachment={() => {}}
                                        onUpdateBlock={() => {}}
                                        onDeleteBlock={() => {}}
                                        onToggleSubItem={() => {}}
                                        onToggleAllSubItems={() => {}}
                                        onAddNestedSubItem={() => {}}
                                        onUpdateDetails={() => {}}
                                        onToggleArchive={() => {}}
                                        onMoveBlock={() => {}}
                                        onMoveTask={() => {}}
                                        onSuggestSubItems={() => {}}
                                        draggedTaskId={null}
                                        onSetDraggedTaskId={() => {}}
                                        recentlyDeleted={null}
                                        onUndoDeleteBlock={() => {}}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          ) : (
            <>
                <div className="p-4 sm:p-6">
                    {areFiltersActive && (
                        <div className="mb-4 flex items-center gap-2 p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg text-teal-800 dark:text-teal-200">
                            <FilterIcon />
                            <span className="text-sm font-medium">Filtros ativos.</span>
                            <button onClick={handleClearFilters} className="ml-auto text-sm font-semibold hover:underline">Limpar filtros</button>
                        </div>
                    )}
                    {isLoading ? (
                        <div className="text-center py-20"><SpinnerIcon /></div>
                    ) : filteredTasks.length > 0 ? (
                        <div className={layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-6 max-w-4xl mx-auto'}>
                            {filteredTasks.map((task, index) => (
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
                                    onToggleAllSubItems={handleToggleAllSubItems}
                                    onAddNestedSubItem={handleAddNestedSubItem}
                                    onUpdateDetails={handleUpdateTaskDetails}
                                    onToggleArchive={handleToggleArchiveTask}
                                    onMoveBlock={handleMoveBlock}
                                    onMoveTask={handleMoveTask}
                                    onSuggestSubItems={handleSuggestSubItems}
                                    draggedTaskId={draggedTaskId}
                                    onSetDraggedTaskId={setDraggedTaskId}
                                    isNew={index === 0 && task.title === 'Nova Tarefa'}
                                    recentlyDeleted={recentlyDeletedBlock}
                                    onUndoDeleteBlock={handleUndoDeleteBlock}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                            <ClipboardListIcon className="h-16 w-16 mx-auto" />
                            <p className="mt-4 text-lg font-semibold">Nenhuma tarefa encontrada</p>
                            <p className="mt-1 text-sm">Tente ajustar seus filtros ou crie uma nova tarefa.</p>
                        </div>
                    )}
                </div>

                <div className="fixed bottom-8 right-8 z-20">
                    <button
                        onClick={handleAddTask}
                        className="bg-gradient-to-r from-teal-500 to-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-300 dark:focus:ring-teal-800"
                    >
                        <PlusIcon />
                    </button>
                </div>
            </>
          )}

          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onExport={handleExportData}
            onImport={handleImportFileChange}
            onReset={() => setIsConfirmingReset(true)}
            theme={theme}
            onThemeChange={setTheme}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={requestNotificationPermission}
          />
          <PanoramaModal isOpen={isPanoramaOpen} onClose={() => setIsPanoramaOpen(false)} tasks={tasks} onSaveAnalysis={handleSaveAnalysis} />
          <SavedAnalysesModal isOpen={isSavedAnalysesOpen} onClose={() => setIsSavedAnalysesOpen(false)} analyses={savedAnalyses} onDelete={handleDeleteAnalysis} />
          <LiveConversationModal isOpen={isLiveConversationOpen} onClose={() => setIsLiveConversationOpen(false)} onTasksCreated={handleLiveCreateTasks} />
          <ImportConfirmationModal isOpen={isImportConfirmationOpen} onClose={() => setIsImportConfirmationOpen(false)} onConfirm={handleConfirmImport} fileData={importFileData} />

          <ConfirmationDialog
            isOpen={isConfirmingReset}
            onClose={() => setIsConfirmingReset(false)}
            onConfirm={handleResetApp}
            title="Redefinir Aplicativo"
            message="Tem certeza de que deseja excluir permanentemente todas as suas tarefas e análises? Esta ação não pode ser desfeita."
            icon={<ExclamationTriangleIcon className="h-10 w-10 text-red-500" />}
          />
          <ConfirmationDialog
            isOpen={isConfirmingEmptyTrash}
            onClose={() => setIsConfirmingEmptyTrash(false)}
            onConfirm={handleEmptyTrash}
            title="Esvaziar Lixeira"
            message="Tem certeza de que deseja excluir permanentemente todos os itens da lixeira? Esta ação não pode ser desfeita."
            icon={<ExclamationTriangleIcon className="h-10 w-10 text-red-500" />}
          />
        </main>
      </div>
    </div>
  );
};

export default App;
