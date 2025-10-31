
import React, { useState, useEffect, useCallback } from 'react';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, XIcon, SettingsIcon, AppleIcon, ArchiveIcon, SpinnerIcon, CloudCheckIcon, CloudOffIcon, ExclamationCircleIcon, PlusCircleIcon, TrashIcon, CheckCircleIcon } from './components/Icons';
import ConfirmationDialog from './components/ConfirmationDialog';
import SettingsModal from './components/SettingsModal';

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

const LOCAL_STORAGE_KEY = 'checklist-app-tasks-guest';
const CLOUD_STORAGE_KEY_PREFIX = 'checklist-app-cloud-';
const THEME_STORAGE_KEY = 'checklist-app-theme';

type Theme = 'light' | 'dark';
type View = 'home' | 'checklist';
type User = { id: string; name: string };
type SyncStatus = 'syncing' | 'saved' | 'offline' | 'error';


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


// Recursive helper functions for deep state manipulation
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

const migrateSubItems = (items: any[]): ContentBlock[] => {
    return items.map(item => {
        if (item.type === 'subitem') {
            return {
                ...item,
                completed: item.completed || false,
                children: item.children ? migrateSubItems(item.children) : []
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

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
            content: migrateSubItems(task.content || [])
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
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    return savedTheme || 'dark';
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

  const loadAndSyncTasks = async (userId: string) => {
    setSyncStatus('syncing');
    try {
        const cloudTasks = await cloudStorage.loadTasks(userId);
        if (cloudTasks) {
            setTasks(cloudTasks.map((task: any) => ({ ...task, content: migrateSubItems(task.content || []) })));
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

  const handleAppleLogin = () => {
    const mockUser = { id: 'apple-user-123', name: 'Usuário Apple' };
    setUser(mockUser);
    loadAndSyncTasks(mockUser.id);
    setView('checklist');
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
                if (found || block.type === 'text') return block;

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
                content: migrateSubItems(task.content || [])
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
      
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-72 bg-white dark:bg-gray-800/50 border-r border-gray-200 dark:border-gray-700/50 p-6 min-h-screen sticky top-0">
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
                    onClick={() => setShowArchived(false)}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium ${!showArchived ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                  >
                    Tarefas Ativas
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowArchived(true)}
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
                <TagIcon />
                <span>Categorias</span>
              </h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${
                      categoryFilter === 'all'
                        ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>Todas as Categorias</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{tasks.filter(t => !t.archived).length}</span>
                  </button>
                </li>
                {categories.map((cat) => (
                  <li key={cat} className="group flex items-center pr-1">
                    <button
                      onClick={() => setCategoryFilter(cat)}
                      className={`flex-grow text-left px-3 py-2 rounded-md transition-colors text-sm font-medium flex justify-between items-center ${
                        categoryFilter === cat
                          ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
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
          <div className="mt-auto absolute bottom-6 left-6 right-6">
                <SyncStatusIndicator status={syncStatus} />
                <button 
                    onClick={handleLogout}
                    className="w-full mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors py-2 rounded-md text-center"
                >
                    Sair
                </button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
             <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                  {showArchived ? 'Tarefas Arquivadas' : 'Suas Tarefas'}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {filteredTasks.length > 0
                        ? `${filteredTasks.length} tarefa${filteredTasks.length > 1 ? 's' : ''} encontrada${filteredTasks.length > 1 ? 's' : ''}.`
                        : 'Nenhuma tarefa encontrada.'}
                </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="lg:hidden flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                    <FilterIcon />
                    <span>Filtros</span>
                </button>
                {!showArchived && (
                    <button
                        onClick={handleAddTask}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-teal-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-teal-700 transition-transform transform hover:scale-105 shadow-lg"
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
                onUpdateTitle={handleUpdateTaskTitle}
                onDeleteTask={handleDeleteTask}
                onAddBlock={handleAddBlock}
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
    </div>
  );
};

export default App;
