




import React, { useState, useEffect, useCallback } from 'react';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority, AttachmentBlock, SavedAnalysis, SyncStatus } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, XIcon, SettingsIcon, ArchiveIcon, SpinnerIcon, CloudCheckIcon, CloudOffIcon, ExclamationCircleIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon, MenuIcon, BellIcon, SparklesIcon, BookmarkIcon, MicrophoneIcon, SearchIcon, ViewGridIcon, ViewListIcon } from './components/Icons';
import ConfirmationDialog from './components/ConfirmationDialog';
import SettingsModal from './components/SettingsModal';
import PanoramaModal from './components/PanoramaModal';
import SavedAnalysesModal from './components/SavedAnalysesModal';
import LiveConversationModal from './components/LiveConversationModal';
import Sidebar from './components/Sidebar';

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
            <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg sm:text-xl">
                Organize suas ideias, projetos e tarefas diárias com facilidade e estilo.
            </p>
            <div className="mt-12">
                <button
                    onClick={onGuestLogin}
                    className="w-full sm:w-auto flex items-center justify-center gap-3 bg-teal-600 text-white font-bold py-4 px-10 rounded-lg hover:bg-teal-700 transition-all duration-300 transform hover:scale-105 text-xl shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-500/50"
                >
                    <span>Começar Agora</span>
                </button>
            </div>
            <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
                Seus dados são salvos automaticamente no seu dispositivo.
            </p>
        </div>
    </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [analysisToDeleteId, setAnalysisToDeleteId] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanoramaOpen, setIsPanoramaOpen] = useState(false);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const [isLiveConversationOpen, setIsLiveConversationOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('offline');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [newlyCreatedTaskId, setNewlyCreatedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');


  const [tasks, setTasks] = useState<TaskType[]>(() => {
    try {
      const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        return parsedTasks.map((task: any) => ({ 
            ...task, 
            archived: task.archived || false,
            content: migrateContent(task.content || []),
            createdAt: task.createdAt || new Date().toISOString(),
        }));
      }
      return initialTasks;
    } catch (error)
     {
      console.error("Could not load tasks from localStorage", error);
      return initialTasks;
    }
  });

   const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>(() => {
    try {
      const saved = window.localStorage.getItem(ANALYSES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Could not load analyses from localStorage", error);
      return [];
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

  const getInitialTheme = (): Theme => {
    try {
        const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme === 'light' || savedTheme === 'dark') {
            return savedTheme;
        }
    } catch (error) {
        console.error("Could not load theme from localStorage", error);
    }
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  };

  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
        const savedLayout = window.localStorage.getItem(LAYOUT_STORAGE_KEY);
        return (savedLayout === 'grid' || savedLayout === 'list') ? savedLayout : 'grid';
    } catch (error) {
        console.error("Could not load layout mode from localStorage", error);
        return 'grid';
    }
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
  }, [theme]);
  
  useEffect(() => {
    try {
        window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    } catch (error) {
        console.error("Could not save layout mode to localStorage", error);
    }
  }, [layoutMode]);

  // Effect for listening to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Check if the user has manually set a theme. If so, don't override it.
      const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        return; 
      }
      setTheme(e.matches ? 'dark' : 'light');
    };

    try {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } catch (e) {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      try {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } catch (e) {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, []);
  
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

  useEffect(() => {
    if (newlyCreatedTaskId) {
      const timer = setTimeout(() => {
        setNewlyCreatedTaskId(null);
      }, 500); // Animation is 200ms, giving it extra time
      return () => clearTimeout(timer);
    }
  }, [newlyCreatedTaskId]);


  useEffect(() => {
    try {
      localStorage.setItem(ANALYSES_STORAGE_KEY, JSON.stringify(savedAnalyses));
    } catch (error) {
      console.error("Could not save analyses to localStorage", error);
    }
  }, [savedAnalyses]);
  
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

  const handleGuestLogin = () => {
    setUser(null);
    setSyncStatus('offline');
    setView('checklist');
  };

  const handleLogout = () => {
    setUser(null);
    setSyncStatus('offline');
    // Reload guest tasks
    const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    setTasks(savedTasks ? JSON.parse(savedTasks) : initialTasks);
    setView('home');
  };

  const handleAddTask = () => {
    const newTaskId = Date.now().toString();
    const newTask: TaskType = {
      id: newTaskId,
      title: 'Nova Tarefa',
      content: [],
      priority: 'none',
      dueDate: '',
      category: categoryFilter !== 'all' ? categoryFilter : '',
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setTasks([newTask, ...tasks]);
    setNewlyCreatedTaskId(newTaskId);
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
  };

  const handleConfirmDelete = () => {
    if (!taskToDeleteId) return;
    setTasks(tasks.filter((task) => task.id !== taskToDeleteId));
    setTaskToDeleteId(null);
  };

  const handleCancelDelete = () => {
    setTaskToDeleteId(null);
  };
  
  const handleToggleArchiveTask = (taskId: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, archived: !task.archived } : task
      )
    );
  };

  const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, title: newTitle } : task
      )
    );
  };

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
  
  const handleToggleAllSubItems = (taskId: string, completed: boolean) => {
    const updateAllChildren = (items: ContentBlock[]): ContentBlock[] => {
        return items.map(item => {
            if (item.type === 'subitem') {
                return {
                    ...item,
                    completed: completed,
                    children: updateAllChildren(item.children) as SubItemBlock[]
                };
            }
            return item;
        });
    };

    setTasks(currentTasks => 
        currentTasks.map(task => {
            if (task.id === taskId) {
                return { ...task, content: updateAllChildren(task.content) };
            }
            return task;
        })
    );
  };

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
  
  const handleMoveTask = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    setTasks(currentTasks => {
      const sourceIndex = currentTasks.findIndex(t => t.id === sourceId);
      const targetIndex = currentTasks.findIndex(t => t.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
        return currentTasks;
      }

      const newTasks = Array.from(currentTasks);
      const [movedTask] = newTasks.splice(sourceIndex, 1);
      
      const newTargetIndex = newTasks.findIndex(t => t.id === targetId);

      if (position === 'before') {
        newTasks.splice(newTargetIndex, 0, movedTask);
      } else { // 'after'
        newTasks.splice(newTargetIndex + 1, 0, movedTask);
      }

      return newTasks;
    });
  };

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
                content: migrateContent(task.content || []),
                createdAt: task.createdAt || new Date().toISOString(),
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

  const handleResetData = () => {
      setShowResetConfirmation(true);
  };
  
  const handleConfirmReset = () => {
    setTasks(initialTasks);
    setSavedAnalyses([]);
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

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (trimmedName && !categories.includes(trimmedName)) {
      setCategories(prev => [...prev, trimmedName].sort());
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };
  
  const handleDeleteCategory = (categoryName: string) => {
    setCategoryToDelete(categoryName);
  };

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

  const handleCancelDeleteCategory = () => {
    setCategoryToDelete(null);
  };
  
  const handleSaveAnalysis = (content: string) => {
    const now = new Date();
    const newAnalysis: SavedAnalysis = {
        id: now.toISOString(),
        title: `Análise de ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}`,
        content: content,
        createdAt: now.toISOString(),
    };
    setSavedAnalyses(prev => [newAnalysis, ...prev]);
  };

  const handleDeleteAnalysis = (id: string) => {
    setAnalysisToDeleteId(id);
  };

  const handleConfirmDeleteAnalysis = () => {
      if (!analysisToDeleteId) return;
      setSavedAnalyses(prev => prev.filter(a => a.id !== analysisToDeleteId));
      setAnalysisToDeleteId(null);
  };
  
  const handleCancelDeleteAnalysis = () => {
      setAnalysisToDeleteId(null);
  };

  const handleAITasksCreation = (createdTasks: Array<{ title: string; subItems: string[] }>) => {
    const newTasks: TaskType[] = createdTasks.map(taskData => {
      const taskId = Date.now().toString() + Math.random();
      const content: SubItemBlock[] = (taskData.subItems || []).map((subItemText, index) => ({
        id: `${taskId}-${index}`,
        type: 'subitem',
        text: subItemText,
        completed: false,
        children: [],
      }));
      
      return {
        id: taskId,
        title: taskData.title,
        content: content,
        priority: 'none',
        dueDate: '',
        category: categoryFilter !== 'all' ? categoryFilter : '',
        archived: false,
        createdAt: new Date().toISOString(),
      };
    });

    if (newTasks.length > 0) {
      setNewlyCreatedTaskId(newTasks[0].id);
    }
    setTasks(prevTasks => [...newTasks, ...prevTasks]);
    setIsLiveConversationOpen(false); // Close modal after creation
  };

 const handleThemeChange = (newTheme: Theme) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
       console.error("Could not save theme to localStorage", error);
    }
    setTheme(newTheme);
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

    const searchLower = searchQuery.toLowerCase().trim();
    if (!searchLower) {
      return isArchivedMatch && isPriorityMatch && isCategoryMatch && isStatusMatch();
    }

    const checkContent = (content: ContentBlock[]): boolean => {
        for (const block of content) {
            if (block.type === 'text' && block.text.toLowerCase().includes(searchLower)) {
                return true;
            }
            if (block.type === 'subitem') {
                if (block.text.toLowerCase().includes(searchLower)) {
                    return true;
                }
                if (block.children && checkContent(block.children)) {
                    return true;
                }
            }
        }
        return false;
    };

    const isSearchMatch =
        task.title.toLowerCase().includes(searchLower) ||
        (task.category && task.category.toLowerCase().includes(searchLower)) ||
        checkContent(task.content);
    
    return isArchivedMatch && isPriorityMatch && isCategoryMatch && isStatusMatch() && isSearchMatch;
  });

  const archivedTaskCount = tasks.filter(t => t.archived).length;
  const pageTitle = showArchived ? 'Tarefas Arquivadas' : categoryFilter !== 'all' ? categoryFilter : 'Suas Tarefas';

  if (view === 'home') {
    return <HomeScreen onGuestLogin={handleGuestLogin} />;
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
    setIsPanoramaOpen,
    setIsSavedAnalysesOpen,
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
        isOpen={!!analysisToDeleteId}
        onClose={handleCancelDeleteAnalysis}
        onConfirm={handleConfirmDeleteAnalysis}
        title="Excluir Análise"
        message="Tem certeza de que deseja excluir esta análise salva? Esta ação é irreversível."
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
        onThemeChange={handleThemeChange}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={handleRequestNotificationPermission}
      />
      
      <PanoramaModal
        isOpen={isPanoramaOpen}
        onClose={() => setIsPanoramaOpen(false)}
        tasks={tasks}
        onSaveAnalysis={handleSaveAnalysis}
      />

      <SavedAnalysesModal
        isOpen={isSavedAnalysesOpen}
        onClose={() => setIsSavedAnalysesOpen(false)}
        analyses={savedAnalyses}
        onDelete={handleDeleteAnalysis}
      />

      <LiveConversationModal
        isOpen={isLiveConversationOpen}
        onClose={() => setIsLiveConversationOpen(false)}
        onTasksCreated={handleAITasksCreation}
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
            <Sidebar 
              {...sidebarProps}
              onClose={() => setIsDrawerOpen(false)}
            />
          </aside>
        </>
      )}
      
      <div className="lg:grid lg:grid-cols-[288px_1fr]">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700/50 p-6 h-screen sticky top-0 overflow-y-auto">
           <Sidebar {...sidebarProps} />
        </aside>

        {/* Main Content */}
        <main className="lg:p-8">
          <header className="sticky top-0 z-20 bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-sm lg:static lg:bg-transparent dark:lg:bg-transparent flex justify-between items-center gap-4 p-4 sm:p-6 lg:p-0 mb-6">
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
                <div className="hidden sm:flex items-center gap-1 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <button
                        onClick={() => setLayoutMode('grid')}
                        className={`p-1.5 rounded-md transition-colors ${layoutMode === 'grid' ? 'bg-white dark:bg-gray-800 text-teal-600 shadow' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                        title="Visualização em Grade"
                    >
                        <ViewGridIcon className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setLayoutMode('list')}
                        className={`p-1.5 rounded-md transition-colors ${layoutMode === 'list' ? 'bg-white dark:bg-gray-800 text-teal-600 shadow' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                        title="Visualização em Lista"
                    >
                        <ViewListIcon className="h-5 w-5" />
                    </button>
                </div>
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <FilterIcon />
                    <span className="hidden sm:inline">Filtros</span>
                </button>
                {!showArchived && (
                    <>
                        <button
                            onClick={() => setIsLiveConversationOpen(true)}
                            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold px-3 sm:px-4 py-2 rounded-lg hover:from-teal-600 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
                        >
                            <MicrophoneIcon />
                            <span className="hidden sm:inline">Criar com IA</span>
                        </button>
                        <button
                            onClick={handleAddTask}
                            className="hidden lg:flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105 shadow-lg"
                        >
                            <PlusIcon />
                            <span>Nova Tarefa</span>
                        </button>
                    </>
                )}
            </div>
          </header>

          <div className="px-4 sm:px-6 lg:px-0 mb-6">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tarefas por título, conteúdo ou categoria..."
                  className="block w-full rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800 py-2.5 pl-10 pr-10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/50 sm:text-sm"
              />
              {searchQuery && (
                  <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                      <XCircleIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" />
                  </button>
              )}
            </div>
          </div>

          <div className="px-4 sm:px-6 lg:px-0 pb-24 lg:pb-0">
            <div className={layoutMode === 'grid'
              ? `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 ${draggedTaskId ? '[&>*]:opacity-50' : ''}`
              : `flex flex-col gap-4 ${draggedTaskId ? '[&>*]:opacity-50' : ''}`
            }>
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
                  onToggleAllSubItems={handleToggleAllSubItems}
                  onAddNestedSubItem={handleAddNestedSubItem}
                  onUpdateDetails={handleUpdateTaskDetails}
                  onToggleArchive={handleToggleArchiveTask}
                  onMoveBlock={handleMoveBlock}
                  onMoveTask={handleMoveTask}
                  draggedTaskId={draggedTaskId}
                  onSetDraggedTaskId={setDraggedTaskId}
                  isNew={task.id === newlyCreatedTaskId}
                />
              ))}
            </div>

            {filteredTasks.length === 0 && (
              <div className="text-center py-20">
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  {searchQuery ? 'Nenhum Resultado Encontrado' : 'Tudo limpo por aqui!'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  {searchQuery
                    ? 'Tente ajustar sua busca ou limpar os filtros.'
                    : showArchived
                    ? 'Você não tem tarefas arquivadas.'
                    : 'Crie uma nova tarefa para começar.'}
                </p>
                {!showArchived && !searchQuery && (
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
          </div>
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