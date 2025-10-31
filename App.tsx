
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
import Logo from './components/Logo';

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

const App: React.FC = () => {
  // Core State
  const [view, setView] = useState<View>('checklist');
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>({ id: 'guest', name: 'Convidado' });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('saved');

  // UI State
  const [theme, setTheme] = useState<Theme>('light');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Filtering & Sorting State
  const [mainView, setMainView] = useState<MainView>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('all');
  
  // Modal & Dialog State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPanoramaOpen, setIsPanoramaOpen] = useState(false);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const [isLiveConversationOpen, setIsLiveConversationOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importFileData, setImportFileData] = useState<BackupData | null>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    icon?: React.ReactNode;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Undo State
  const [recentlyDeleted, setRecentlyDeleted] = useState<{ block: ContentBlock; taskId: string; index: number; parentId?: string; } | null>(null);
  const undoTimeoutRef = useRef<number | null>(null);
  
  // Category Management State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Analyses State
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

  // Notification State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(window.Notification?.permission || 'default');

  // Load initial data from local storage
  useEffect(() => {
    if (currentUser) {
      const storageKey = currentUser.id === 'guest' ? LOCAL_STORAGE_KEY : `${CLOUD_STORAGE_KEY_PREFIX}${currentUser.id}`;
      try {
        const savedTasks = localStorage.getItem(storageKey);
        const tasksToLoad = savedTasks ? JSON.parse(savedTasks) : initialTasks;
        setTasks(tasksToLoad.map((task: TaskType) => ({
            ...task,
            content: migrateContent(task.content || [])
        })));

        const savedAnalyses = localStorage.getItem(ANALYSES_STORAGE_KEY);
        if (savedAnalyses) setSavedAnalyses(JSON.parse(savedAnalyses));
      } catch (error) {
        console.error("Failed to load tasks from local storage:", error);
        setTasks(initialTasks); // Fallback to initial tasks
      }
    }
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
    }
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout && (savedLayout === 'grid' || savedLayout === 'list')) {
        setLayoutMode(savedLayout);
    }
  }, [currentUser]);

  // Apply theme class to HTML element
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  
  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
  }, [layoutMode]);


  // Debounced save to local storage
  const debouncedSave = useCallback(() => {
    const handler = setTimeout(() => {
      if (currentUser) {
        setSyncStatus('syncing');
        const storageKey = currentUser.id === 'guest' ? LOCAL_STORAGE_KEY : `${CLOUD_STORAGE_KEY_PREFIX}${currentUser.id}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(tasks));
          // Simulate cloud save for non-guest users
          if (currentUser.id !== 'guest') {
            cloudStorage.saveTasks(currentUser.id, tasks)
              .then(() => setSyncStatus('saved'))
              .catch(() => setSyncStatus('error'));
          } else {
             setTimeout(() => setSyncStatus('saved'), 500); // Simulate local save delay
          }
        } catch (error) {
          console.error("Failed to save tasks:", error);
          setSyncStatus('error');
        }
      }
    }, 1000);
    return () => clearTimeout(handler);
  }, [tasks, currentUser]);

  useEffect(debouncedSave, [tasks, debouncedSave]);
  
  useEffect(() => {
    try {
        localStorage.setItem(ANALYSES_STORAGE_KEY, JSON.stringify(savedAnalyses));
    } catch (error) {
        console.error("Failed to save analyses:", error);
    }
  }, [savedAnalyses]);
  
  // Due Date Notification Scheduler
  useEffect(() => {
    if (notificationPermission !== 'granted') return;

    const todayStr = new Date().toISOString().split('T')[0];
    const dueTodayTasks = tasks.filter(
      task => !task.archived && !task.deletedAt && task.dueDate?.startsWith(todayStr)
    );

    if (dueTodayTasks.length > 0) {
      new Notification('Tarefas para Hoje!', {
        body: `Você tem ${dueTodayTasks.length} tarefa(s) com vencimento hoje. Não se esqueça de concluí-las!`,
        icon: '/vite.svg', // Replace with your app's icon
      });
    }
  }, [tasks, notificationPermission]);
  

  const handleCreateTask = () => {
    const newTask: TaskType = {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      content: [],
      archived: false,
      createdAt: new Date().toISOString(),
    };
    setTasks(prevTasks => [newTask, ...prevTasks]);
  };
  
  const handleCreateTasksFromSpeech = (newTasks: Array<{ title: string; subItems: string[] }>) => {
    const tasksToAdd: TaskType[] = newTasks.map((taskData, index) => {
        const newSubItems: SubItemBlock[] = (taskData.subItems || []).map((subItemText, subIndex) => ({
            id: `${Date.now()}-${index}-${subIndex}`,
            type: 'subitem',
            text: subItemText,
            completed: false,
            children: [],
        }));
        
        return {
            id: `${Date.now()}-${index}`,
            title: taskData.title,
            content: newSubItems,
            archived: false,
            createdAt: new Date().toISOString(),
        };
    });

    setTasks(prev => [...tasksToAdd, ...prev]);
  };

  const handleUpdateTitle = (id: string, title: string) => {
    setTasks(prevTasks => prevTasks.map(task => (task.id === id ? { ...task, title } : task)));
  };

  const handleSoftDeleteTask = (id: string) => {
    setDialog({
      isOpen: true,
      title: 'Mover para a Lixeira?',
      message: 'A tarefa será movida para a lixeira e poderá ser restaurada ou excluída permanentemente mais tarde.',
      icon: <TrashIcon className="h-6 w-6 text-red-500" />,
      onConfirm: () => {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === id ? { ...task, deletedAt: new Date().toISOString() } : task
          )
        );
      },
    });
  };
  
  const handleRestoreTask = (id: string) => {
     setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === id ? { ...task, deletedAt: undefined } : task
        )
      );
  };
  
  const handlePermanentDeleteTask = (id: string) => {
     setDialog({
      isOpen: true,
      title: 'Excluir Permanentemente?',
      message: 'Esta ação não pode ser desfeita. A tarefa e todo o seu conteúdo serão excluídos para sempre.',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
      onConfirm: () => {
        setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
      },
    });
  };
  
  const handleEmptyTrash = () => {
    if (tasks.filter(t => t.deletedAt).length === 0) return;
    
    setDialog({
      isOpen: true,
      title: 'Esvaziar Lixeira?',
      message: 'Todas as tarefas na lixeira serão excluídas permanentemente. Esta ação não pode ser desfeita.',
      icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
      onConfirm: () => {
        setTasks(prevTasks => prevTasks.filter(task => !task.deletedAt));
      },
    });
  };

  const handleAddBlock = (taskId: string, type: 'subitem' | 'text') => {
    const newBlock: ContentBlock =
      type === 'subitem'
        ? { id: Date.now().toString(), type: 'subitem', text: '', completed: false, children: [] }
        : { id: Date.now().toString(), type: 'text', text: '' };

    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, content: [...task.content, newBlock] } : task
      )
    );
  };
  
  const handleAddBlocks = (taskId: string, newBlocks: ContentBlock[]) => {
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, content: [...task.content, ...newBlocks] } : task
        )
    );
  };

  const handleAddAttachment = (taskId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const newBlock: AttachmentBlock = {
            id: Date.now().toString(),
            type: 'attachment',
            fileName: file.name,
            fileType: file.type,
            dataUrl: event.target?.result as string,
            size: file.size,
        };
         setTasks(prevTasks =>
            prevTasks.map(task =>
                task.id === taskId ? { ...task, content: [...task.content, newBlock] } : task
            )
        );
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateBlock = (taskId: string, blockId: string, updates: Partial<ContentBlock>) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const updateRecursively = (items: ContentBlock[]): ContentBlock[] => {
            return items.map(item => {
              if (item.id === blockId) {
                // Type-safe update: Ensure updates don't corrupt the discriminated union.
                // The only intended update via this function is for the 'text' property.
                if ('text' in updates && (item.type === 'subitem' || item.type === 'text')) {
                  return { ...item, text: updates.text! };
                }
                // Silently ignore other updates to prevent state corruption.
                return item;
              }
              if (item.type === 'subitem' && item.children?.length) {
                return { ...item, children: updateRecursively(item.children) as SubItemBlock[] };
              }
              return item;
            });
          };
          return { ...task, content: updateRecursively(task.content) };
        }
        return task;
      })
    );
  };

  const handleDeleteBlock = (taskId: string, blockId: string) => {
    let deletedBlock: ContentBlock | null = null;
    let originalIndex: number = -1;
    let parentId: string | undefined = undefined;

    const findAndDeleteRecursively = (items: ContentBlock[], parent?: SubItemBlock): ContentBlock[] => {
        let wasDeleted = false;
        const remainingItems = items.filter((item, index) => {
            if (item.id === blockId) {
                deletedBlock = item;
                originalIndex = index;
                parentId = parent?.id;
                wasDeleted = true;
                return false; // Exclude the item
            }
            return true;
        });

        if (wasDeleted) {
            return remainingItems;
        }

        return items.map(item => {
            if (item.type === 'subitem' && item.children) {
                return { ...item, children: findAndDeleteRecursively(item.children, item) as SubItemBlock[] };
            }
            return item;
        });
    };

    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const updatedContent = findAndDeleteRecursively(task.content);
          if (deletedBlock) {
              if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
              setRecentlyDeleted({ block: deletedBlock, taskId, index: originalIndex, parentId });
              undoTimeoutRef.current = window.setTimeout(() => setRecentlyDeleted(null), 5000);
          }
          return { ...task, content: updatedContent };
        }
        return task;
      })
    );
  };
  
  const handleUndoDeleteBlock = () => {
    if (!recentlyDeleted) return;

    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);

    const { block, taskId, index, parentId } = recentlyDeleted;

    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          let content = [...task.content];
          if (parentId) {
            // It's a nested subitem
            const [newContent] = mapContentTree(content, parentId, parentBlock => {
                const newChildren = [...parentBlock.children];
                newChildren.splice(index, 0, block as SubItemBlock);
                return { ...parentBlock, children: newChildren };
            });
            content = newContent;
          } else {
            // It's a top-level item
            content.splice(index, 0, block);
          }
          return { ...task, content };
        }
        return task;
      })
    );
    setRecentlyDeleted(null);
  };

  const handleToggleSubItem = (taskId: string, subItemId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const [newContent] = mapContentTree(
            task.content,
            subItemId,
            (block: SubItemBlock) => ({ ...block, completed: !block.completed })
          );
          return { ...task, content: newContent };
        }
        return task;
      })
    );
  };
  
  const handleToggleAllSubItems = (taskId: string, completed: boolean) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const setCompletionRecursively = (items: ContentBlock[]): ContentBlock[] => {
            return items.map(item => {
              if (item.type === 'subitem') {
                return {
                  ...item,
                  completed,
                  children: setCompletionRecursively(item.children) as SubItemBlock[],
                };
              }
              return item;
            });
          };
          return { ...task, content: setCompletionRecursively(task.content) };
        }
        return task;
      })
    );
  };

  const handleAddNestedSubItem = (taskId: string, parentId: string) => {
    const newSubItem: SubItemBlock = {
      id: Date.now().toString(),
      type: 'subitem',
      text: '',
      completed: false,
      children: [],
    };
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === taskId) {
          const [newContent] = mapContentTree(
            task.content,
            parentId,
            (block: SubItemBlock) => ({ ...block, children: [...block.children, newSubItem] })
          );
          return { ...task, content: newContent };
        }
        return task;
      })
    );
  };

  const handleUpdateDetails = (id: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color' | 'tags'>>) => {
    setTasks(prevTasks => prevTasks.map(task => (task.id === id ? { ...task, ...details } : task)));
  };

  const handleToggleArchive = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === id ? { ...task, archived: !task.archived } : task))
    );
  };
  
  const handleMoveBlock = (taskId: string, sourceId: string, targetId: string | null, position: 'before' | 'after' | 'end') => {
    if (sourceId === targetId) return;

    setTasks(prevTasks =>
        prevTasks.map(task => {
            if (task.id !== taskId) return task;

            let sourceBlock: ContentBlock | null = null;

            // Remove source block
            const [contentWithoutSource] = filterContentTree(task.content, sourceId);
            const sourceTask = prevTasks.find(t => t.id === taskId);
            if(sourceTask) {
                sourceBlock = findBlockInTree(sourceTask.content, sourceId);
            }
            
            if (!sourceBlock) return task; // Should not happen

            let newContent = contentWithoutSource;
            
            // Add source block to new position
            if (targetId === null && position === 'end') { // Drop at the end of the task
                 newContent.push(sourceBlock);
            } else if (targetId) {
                const insertRecursively = (items: ContentBlock[]): ContentBlock[] => {
                    const targetIndex = items.findIndex(item => item.id === targetId);
                    if (targetIndex > -1) {
                        const newItems = [...items];
                        newItems.splice(targetIndex + (position === 'after' ? 1 : 0), 0, sourceBlock!);
                        return newItems;
                    }
                    return items.map(item => {
                        if (item.type === 'subitem' && item.children) {
                            return { ...item, children: insertRecursively(item.children) as SubItemBlock[] };
                        }
                        return item;
                    });
                };
                newContent = insertRecursively(newContent);
            }
            
            return { ...task, content: newContent };
        })
    );
  };
  
  const handleMoveTask = (sourceId: string, targetId: string, position: 'before' | 'after') => {
    setTasks(prevTasks => {
        const sourceIndex = prevTasks.findIndex(t => t.id === sourceId);
        const targetIndex = prevTasks.findIndex(t => t.id === targetId);

        if (sourceIndex === -1 || targetIndex === -1) return prevTasks;
        
        const [sourceTask] = prevTasks.splice(sourceIndex, 1);
        const newTargetIndex = prevTasks.findIndex(t => t.id === targetId);

        prevTasks.splice(newTargetIndex + (position === 'after' ? 1 : 0), 0, sourceTask);

        return [...prevTasks];
    });
  };

  // Category and Tag calculations
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))] as string[];
  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))];
  
  const handleAddCategory = () => {
      if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
          // In a real app, this might update a central category list.
          // Here, we just clear the input. The new category will be picked up
          // once a task uses it.
      }
      setNewCategoryName('');
      setIsAddingCategory(false);
  };
  
  const handleDeleteCategory = (categoryToDelete: string) => {
       setDialog({
        isOpen: true,
        title: `Excluir a categoria "${categoryToDelete}"?`,
        message: 'As tarefas nesta categoria não serão excluídas, mas ficarão sem categoria. Esta ação não pode ser desfeita.',
        icon: <ExclamationTriangleIcon className="h-6 w-6 text-orange-500" />,
        onConfirm: () => {
            setTasks(prevTasks =>
                prevTasks.map(task =>
                    task.category === categoryToDelete ? { ...task, category: undefined } : task
                )
            );
        },
    });
  };
  
  // Settings actions
  const handleExportData = () => {
    const data: BackupData = {
        version: 2.2, // Current app version
        tasks: tasks,
        savedAnalyses: savedAnalyses,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const data = JSON.parse(result) as BackupData;
        // Basic validation
        if (data && Array.isArray(data.tasks) && data.version) {
          setImportFileData(data);
          setIsImportConfirmOpen(true);
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (error) {
        console.error("Error parsing import file:", error);
        alert('Falha ao ler o arquivo. Certifique-se de que é um arquivo de backup válido.');
      } finally {
        // Reset file input to allow re-uploading the same file
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = (mode: 'merge' | 'replace') => {
    if (!importFileData) return;
    
    if (mode === 'replace') {
        setTasks(importFileData.tasks);
        setSavedAnalyses(importFileData.savedAnalyses || []);
    } else { // merge
        const existingTaskIds = new Set(tasks.map(t => t.id));
        const newTasks = importFileData.tasks.filter(t => !existingTaskIds.has(t.id));

        const existingAnalysisIds = new Set(savedAnalyses.map(a => a.id));
        const newAnalyses = (importFileData.savedAnalyses || []).filter(a => !existingAnalysisIds.has(a.id));

        setTasks(prev => [...prev, ...newTasks]);
        setSavedAnalyses(prev => [...prev, ...newAnalyses]);
    }

    setIsImportConfirmOpen(false);
    setImportFileData(null);
  };


  const handleResetApp = () => {
    setDialog({
        isOpen: true,
        title: 'Redefinir o Aplicativo?',
        message: 'Isso excluirá permanentemente TODAS as suas tarefas e análises, e restaurará a lista de tarefas inicial. Esta ação não pode ser desfeita.',
        icon: <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />,
        onConfirm: () => {
            setTasks(initialTasks);
            setSavedAnalyses([]);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            localStorage.removeItem(ANALYSES_STORAGE_KEY);
            // In a real app, you would also clear the cloud storage for the logged-in user.
        },
    });
  };

  const handleSaveAnalysis = (content: string) => {
    const titleMatch = content.match(/##\s*(.*)/);
    const title = titleMatch ? titleMatch[1] : 'Análise';
    const newAnalysis: SavedAnalysis = {
        id: Date.now().toString(),
        title: title,
        content,
        createdAt: new Date().toISOString(),
    };
    setSavedAnalyses(prev => [newAnalysis, ...prev]);
  };

  const handleDeleteAnalysis = (id: string) => {
      setSavedAnalyses(prev => prev.filter(a => a.id !== id));
  };
  
  const handleRequestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador não suporta notificações.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };
  
  const filteredAndSortedTasks = tasks
    .filter(task => {
        if (mainView === 'archived') return task.archived && !task.deletedAt;
        if (mainView === 'trash') return !!task.deletedAt;
        if (mainView === 'today') {
             const todayStr = new Date().toISOString().split('T')[0];
             return !task.archived && !task.deletedAt && task.dueDate?.startsWith(todayStr);
        }
        // Default to 'active' view
        return !task.archived && !task.deletedAt;
    })
    .filter(task => categoryFilter === 'all' || task.category === categoryFilter)
    .filter(task => priorityFilter === 'all' || task.priority === priorityFilter)
    .filter(task => tagFilter === 'all' || (task.tags && task.tags.includes(tagFilter)))
    .filter(task => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const inTitle = task.title.toLowerCase().includes(term);
      const inContent = task.content.some(block => 'text' in block && block.text?.toLowerCase().includes(term));
      const inCategory = task.category?.toLowerCase().includes(term);

      switch (searchScope) {
        case 'title': return inTitle;
        case 'content': return inContent;
        case 'category': return !!inCategory;
        default: return inTitle || inContent || !!inCategory;
      }
    });
    
    const trashedTaskCount = tasks.filter(t => t.deletedAt).length;

  if (view === 'home') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-center p-4">
        <h1 className="text-5xl font-bold text-teal-600 dark:text-teal-400">Bem-vindo ao Checklist</h1>
        <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">Sua ferramenta inteligente para organização de tarefas.</p>
        <button
          onClick={() => setView('checklist')}
          className="mt-8 px-8 py-3 bg-teal-600 text-white font-semibold rounded-lg shadow-lg hover:bg-teal-700 transition-transform transform hover:scale-105"
        >
          Começar
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-300`}>
      {/* Sidebar for large screens */}
      <aside className="hidden lg:block w-72 bg-white dark:bg-gray-800 p-5 border-r border-gray-200 dark:border-gray-700/50">
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
          archivedTaskCount={tasks.filter(t => t.archived && !t.deletedAt).length}
          trashedTaskCount={trashedTaskCount}
          syncStatus={syncStatus}
          handleLogout={() => console.log('Logout')}
          isAddingCategory={isAddingCategory}
          setIsAddingCategory={setIsAddingCategory}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          handleAddCategory={handleAddCategory}
          handleDeleteCategory={handleDeleteCategory}
          setIsSettingsOpen={setIsSettingsOpen}
          setIsPanoramaOpen={setIsPanoramaOpen}
          setIsSavedAnalysesOpen={setIsSavedAnalysesOpen}
        />
      </aside>
      
      {/* Mobile Sidebar */}
       {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside 
            className="fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-800 p-5 border-r border-gray-200 dark:border-gray-700/50 animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
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
              archivedTaskCount={tasks.filter(t => t.archived && !t.deletedAt).length}
              trashedTaskCount={trashedTaskCount}
              syncStatus={syncStatus}
              handleLogout={() => console.log('Logout')}
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
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="flex-shrink-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 lg:hidden" title="Abrir menu">
                <MenuIcon />
            </button>
            <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="text-gray-400 dark:text-gray-500"/>
                </div>
                <input
                    type="text"
                    placeholder="Pesquisar tarefas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/50 border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
                onClick={() => setIsLiveConversationOpen(true)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Criar tarefa por voz"
            >
                <MicrophoneIcon />
            </button>
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-semibold rounded-md hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
              title="Criar nova tarefa"
            >
              <PlusIcon />
              <span className="hidden sm:inline">Nova Tarefa</span>
            </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold text-gray-600 dark:text-gray-400">Visualizando:</span>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 capitalize">{mainView === 'active' ? 'Tarefas Ativas' : (mainView === 'today' ? 'Tarefas para Hoje' : mainView)}</h2>
                </div>
                <div className="flex items-center gap-4">
                     { (categoryFilter !== 'all' || priorityFilter !== 'all' || tagFilter !== 'all') && (
                        <button
                            onClick={() => {
                            setCategoryFilter('all');
                            setPriorityFilter('all');
                            setTagFilter('all');
                            }}
                            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                            title="Limpar filtros"
                        >
                            <XCircleIcon />
                            Limpar filtros
                        </button>
                    )}
                    <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700/50">
                        <button onClick={() => setLayoutMode('grid')} className={`p-1.5 rounded-md ${layoutMode === 'grid' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Visualização em grade">
                            <ViewGridIcon />
                        </button>
                        <button onClick={() => setLayoutMode('list')} className={`p-1.5 rounded-md ${layoutMode === 'list' ? 'bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'}`} title="Visualização em lista">
                            <ViewListIcon />
                        </button>
                    </div>
                </div>
            </div>
          
            {mainView === 'trash' && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-300 rounded-r-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm">As tarefas na lixeira serão excluídas permanentemente após 30 dias. Esta funcionalidade ainda não foi implementada.</p>
                    <button
                      onClick={handleEmptyTrash}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={trashedTaskCount === 0}
                      title="Esvaziar lixeira permanentemente"
                    >
                        <TrashIcon />
                        <span>Esvaziar Lixeira</span>
                    </button>
                </div>
            )}


          {filteredAndSortedTasks.length > 0 ? (
            <div className={`${layoutMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6' : 'space-y-6 max-w-4xl mx-auto'}`}>
              {filteredAndSortedTasks.map((task, index) =>
                 mainView === 'trash' ? (
                     <div key={task.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center justify-between gap-4 border border-gray-200 dark:border-gray-700/50 animate-fade-in-scale">
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200 line-through">{task.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Excluída em: {task.deletedAt ? new Date(task.deletedAt).toLocaleDateString() : 'N/A'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleRestoreTask(task.id)}
                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                                title="Restaurar tarefa"
                            >
                                <RestoreIcon />
                            </button>
                            <button
                                onClick={() => handlePermanentDeleteTask(task.id)}
                                className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400"
                                title="Excluir permanentemente"
                            >
                                <TrashIcon />
                            </button>
                        </div>
                     </div>
                 ) : (
                    <TaskCard
                        key={task.id}
                        task={task}
                        categories={categories}
                        onUpdateTitle={handleUpdateTitle}
                        onDeleteTask={handleSoftDeleteTask}
                        onAddBlock={handleAddBlock}
                        onAddBlocks={handleAddBlocks}
                        onAddAttachment={handleAddAttachment}
                        onUpdateBlock={handleUpdateBlock}
                        onDeleteBlock={handleDeleteBlock}
                        onToggleSubItem={handleToggleSubItem}
                        onToggleAllSubItems={handleToggleAllSubItems}
                        onAddNestedSubItem={handleAddNestedSubItem}
                        onUpdateDetails={handleUpdateDetails}
                        onToggleArchive={handleToggleArchive}
                        onMoveBlock={handleMoveBlock}
                        onMoveTask={handleMoveTask}
                        draggedTaskId={draggedTaskId}
                        onSetDraggedTaskId={setDraggedTaskId}
                        isNew={task.title === 'Nova Tarefa' && index === 0}
                        recentlyDeleted={recentlyDeleted}
                        onUndoDeleteBlock={handleUndoDeleteBlock}
                    />
                 )
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <ClipboardListIcon className="h-12 w-12 mx-auto" />
              <h3 className="mt-4 text-xl font-semibold">Nenhuma tarefa encontrada</h3>
              <p className="mt-2 text-sm">
                {searchTerm ? 'Tente refinar sua busca.' : 'Crie uma nova tarefa para começar!'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ConfirmationDialog
        isOpen={dialog.isOpen}
        onClose={() => setDialog({ ...dialog, isOpen: false })}
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        icon={dialog.icon}
      />
       <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExport={handleExportData}
        onImport={handleImportData}
        onReset={handleResetApp}
        theme={theme}
        onThemeChange={setTheme}
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
        onTasksCreated={handleCreateTasksFromSpeech}
      />
      <ImportConfirmationModal
        isOpen={isImportConfirmOpen}
        onClose={() => setIsImportConfirmOpen(false)}
        onConfirm={handleConfirmImport}
        fileData={importFileData}
      />
    </div>
  );
};

export default App;
