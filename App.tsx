
import React, { useState, useEffect } from 'react';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, MenuIcon, XIcon, SettingsIcon, AppleIcon } from './components/Icons';
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

const LOCAL_STORAGE_KEY = 'checklist-app-tasks';
const THEME_STORAGE_KEY = 'checklist-app-theme';

type Theme = 'light' | 'dark';

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

const App: React.FC<{ initialTasks?: TaskType[] }> = ({ initialTasks: initialTasksProp }) => {
  const [view, setView] = useState<'home' | 'checklist'>('home');
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showResetConfirmation, setShowResetConfirmation] = useState(false);

  const [tasks, setTasks] = useState<TaskType[]>(() => {
    if (initialTasksProp) {
      return initialTasksProp;
    }
    try {
      const savedTasks = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        return parsedTasks.map((task: any) => ({
          ...task,
          archived: task.archived || false,
          content: migrateSubItems(task.content || []),
        }));
      }
      return initialTasks;
    } catch (error) {
      console.error('Could not load tasks from localStorage', error);
      return initialTasks;
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

  useEffect(() => {
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks to localStorage", error);
    }
  }, [tasks]);
  
  useEffect(() => {
    if (isMobileMenuOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => {
        document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleAppleLogin = () => {
    setUser({ name: 'Usuário Apple' });
    setView('checklist');
  };

  const handleGuestLogin = () => {
    setUser(null);
    setView('checklist');
  };

  const handleLogout = () => {
    setUser(null);
    setView('home');
    setIsMobileMenuOpen(false);
  };

  const handleAddTask = () => {
    const newTask: TaskType = {
      id: Date.now().toString(),
      title: 'Nova Tarefa',
      content: [],
      priority: 'none',
      dueDate: '',
      category: '',
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
    setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, ...details } : task
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
        type ToggleUpdateResult = 'unchecked' | 'checked' | null;

        const toggleAndUpdate = (content: ContentBlock[]): [ContentBlock[], ToggleUpdateResult] => {
            let updateResult: ToggleUpdateResult = null;

            const newContent = content.map(block => {
                if (updateResult !== null || block.type === 'text') return block;

                // Base case: Found the item to toggle.
                if (block.id === subItemId) {
                    const newCompleted = !block.completed;
                    updateResult = newCompleted ? 'checked' : 'unchecked';

                    const markAllChildren = (child: SubItemBlock): SubItemBlock => ({
                        ...child,
                        completed: newCompleted,
                        children: child.children.map(markAllChildren)
                    });
                    const newChildren = (block.type === 'subitem' && block.children) ? block.children.map(markAllChildren) : [];

                    return { ...block, completed: newCompleted, children: newChildren };
                }

                // Recursive step: Search in children.
                if (block.type === 'subitem' && block.children.length > 0) {
                    const [newChildren, childUpdateResult] = toggleAndUpdate(block.children);

                    if (childUpdateResult !== null) {
                        // An update happened in a descendant. Propagate the result.
                        updateResult = childUpdateResult;

                        if (childUpdateResult === 'unchecked') {
                            // If a child was unchecked, this parent must be unchecked.
                            return { ...block, children: newChildren as SubItemBlock[], completed: false };
                        }

                        // If a child was checked, check if all siblings are now complete.
                        if (childUpdateResult === 'checked') {
                            const allSiblingsCompleted = (newChildren as SubItemBlock[])
                                .filter(c => c.type === 'subitem')
                                .every(c => c.completed);
                            return { ...block, children: newChildren as SubItemBlock[], completed: allSiblingsCompleted };
                        }
                    }
                    // No update in children, just return the block with potentially updated children array
                    return { ...block, children: newChildren as SubItemBlock[] };
                }
                return block;
            });

            return [newContent, updateResult];
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
        if (typeof text !== 'string') {
          throw new Error("File content is not a string");
        }
        const importedTasks = JSON.parse(text);
        
        if (!Array.isArray(importedTasks) || (importedTasks.length > 0 && (typeof importedTasks[0].id === 'undefined' || typeof importedTasks[0].title === 'undefined'))) {
          throw new Error("Invalid file format");
        }
        
        setTasks(importedTasks.map((task: any) => ({ 
            ...task, 
            archived: task.archived || false,
            content: migrateSubItems(task.content || [])
        })));

        setIsSettingsOpen(false);
        alert("Dados importados com sucesso!");

      } catch (error) {
        console.error("Failed to import data", error);
        alert("Ocorreu um erro ao importar os dados. Verifique se o arquivo é um JSON válido exportado deste aplicativo.");
      } finally {
        if (event.target) {
            event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };
  
  const handleRequestReset = () => {
      setIsSettingsOpen(false);
      setShowResetConfirmation(true);
  }

  const handleConfirmReset = () => {
    setTasks(initialTasks);
    setShowResetConfirmation(false);
  };

  const handleCancelReset = () => {
    setShowResetConfirmation(false);
  };

    const countSubItems = (items: ContentBlock[]): { total: number; completed: number } => {
        let total = 0;
        let completed = 0;
        for (const item of items) {
            if (item.type === 'subitem') {
                total++;
                if (item.completed) completed++;
                const childrenCount = countSubItems(item.children);
                total += childrenCount.total;
                completed += childrenCount.completed;
            }
        }
        return { total, completed };
    };

  const getTaskCompletionStatus = (task: TaskType): 'completed' | 'in-progress' => {
        const subItems = task.content.filter(b => b.type === 'subitem') as SubItemBlock[];
        if (subItems.length === 0) {
          const textBlocks = task.content.filter(b => b.type === 'text');
          if (textBlocks.length > 0 && subItems.length === 0) return 'in-progress';
          return 'in-progress';
        }

        const { total, completed } = countSubItems(subItems);
        return total > 0 && completed === total ? 'completed' : 'in-progress';
  };
  
  const allCategories = ['all', ...Array.from(new Set(tasks.map(t => t.category).filter((c): c is string => !!c)))];

  const filteredTasks = tasks.filter(task => {
      if (task.archived !== showArchived) {
          return false;
      }
      if (priorityFilter !== 'all' && (task.priority || 'none') !== priorityFilter) {
          return false;
      }
       if (categoryFilter !== 'all' && task.category !== categoryFilter) {
          return false;
      }
      if (statusFilter !== 'all') {
          const status = getTaskCompletionStatus(task);
          if (status !== statusFilter) {
              return false;
          }
      }
      return true;
  });

  const handleClearFilters = () => {
    setPriorityFilter('all');
    setStatusFilter('all');
  }
  
  if (view === 'home') {
    return <HomeScreen onAppleLogin={handleAppleLogin} onGuestLogin={handleGuestLogin} />;
  }

  const categoryNav = (
    <nav className="flex flex-col space-y-2">
        <button 
            onClick={() => setCategoryFilter('all')}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === 'all' ? 'bg-teal-500/20 text-teal-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
            }`}
        >
            <ClipboardListIcon />
            <span>Todas as Tarefas</span>
        </button>
        {allCategories.filter(c => c !== 'all').map(category => (
            <button 
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    categoryFilter === category ? 'bg-teal-500/20 text-teal-300' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50'
                }`}
            >
                <TagIcon />
                <span>{category}</span>
            </button>
        ))}
    </nav>
  );

  const filterControls = (isMobile: boolean) => (
    <>
      <div className={isMobile ? "flex flex-col gap-4" : "flex-1 min-w-[150px]"}>
        <label htmlFor={isMobile ? "priority-filter-mobile" : "priority-filter"} className={isMobile ? "text-gray-700 dark:text-gray-300 font-medium mb-1" : "sr-only"}>Prioridade</label>
        <select
            id={isMobile ? "priority-filter-mobile" : "priority-filter"}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
            className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
        >
            {Object.entries(priorityOptions).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ))}
        </select>
      </div>
      <div className={isMobile ? "flex flex-col gap-4" : "flex-1 min-w-[150px]"}>
        <label htmlFor={isMobile ? "status-filter-mobile" : "status-filter"} className={isMobile ? "text-gray-700 dark:text-gray-300 font-medium mb-1" : "sr-only"}>Status</label>
        <select
            id={isMobile ? "status-filter-mobile" : "status-filter"}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-white"
        >
            {Object.entries(statusOptions).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white font-sans transition-colors duration-300">
      <header className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-sm sticky top-0 z-30 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-teal-600 dark:text-teal-400">Checklist v2</h1>
              <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="text-gray-500 dark:text-gray-400 hover:text-teal-500 dark:hover:text-teal-400 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700/50"
                  title="Configurações"
                  aria-label="Abrir configurações"
              >
                  <SettingsIcon />
              </button>
            </div>
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  <span className="text-gray-700 dark:text-gray-300">Olá, {user.name}</span>
                  <button onClick={handleLogout} className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                    Sair
                  </button>
                </>
              ) : (
                !showArchived && (
                  <button
                      onClick={handleAddTask}
                      className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                  >
                      <PlusIcon />
                      <span>Nova Tarefa</span>
                  </button>
                )
              )}
            </div>
            <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Abrir menu"
            >
                <MenuIcon />
            </button>
        </div>
      </header>
      
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      ></div>
    
      <div className={`fixed top-0 left-0 h-full w-full max-w-xs bg-white dark:bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                 {user ? (
                    <span className="text-lg font-semibold text-teal-600 dark:text-teal-400">Olá, {user.name}</span>
                ) : (
                    <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400">Menu</h2>
                )}
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Fechar menu">
                    <XIcon />
                </button>
            </div>
            
            <div className="border-y border-gray-200 dark:border-gray-700 py-4 my-4">
                <h3 className="text-lg font-semibold text-teal-600 dark:text-teal-400 mb-4">Categorias</h3>
                {categoryNav}
            </div>
            
            <div className="flex flex-col gap-4 flex-grow">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                    <FilterIcon />
                    <span>Filtrar por:</span>
                </div>
                {filterControls(true)}
                <div className="mt-auto pt-4">
                  <button
                      onClick={handleClearFilters}
                      className="w-full flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-md py-2 mb-4"
                  >
                      <XCircleIcon />
                      <span>Limpar Filtros</span>
                  </button>
                  {user && (
                    <button onClick={handleLogout} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                        Sair
                    </button>
                  )}
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64 flex-shrink-0 hidden md:block">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700/50 sticky top-24">
                    <h2 className="text-lg font-semibold text-teal-600 dark:text-teal-400 mb-4">Categorias</h2>
                    {categoryNav}
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <div className="flex justify-center mb-6">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-lg flex items-center border border-gray-200 dark:border-gray-700/50">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${!showArchived ? 'bg-teal-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Ativas
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${showArchived ? 'bg-teal-500 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            Arquivadas
                        </button>
                    </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-700/50 hidden md:flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold">
                        <FilterIcon />
                        <span>Filtrar por:</span>
                    </div>
                    {filterControls(false)}
                    <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <XCircleIcon />
                        <span>Limpar</span>
                    </button>
                </div>
                
                {filteredTasks.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                ) : (
                    <div className="text-center py-16 px-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                           {tasks.length > 0 ? "Nenhuma tarefa corresponde aos seus filtros" : (showArchived ? "Nenhuma tarefa arquivada" : "Nenhuma tarefa encontrada")}
                        </h3>
                        <p className="text-gray-500 mt-2">
                           {tasks.length > 0 ? "Tente ajustar ou limpar os filtros." : (showArchived ? "Quando você arquivar uma tarefa, ela aparecerá aqui." : "Clique no botão '+' para começar a organizar seu trabalho.")}
                        </p>
                    </div>
                )}
            </div>
        </div>
      </main>

      {!showArchived && (
        <button
            onClick={handleAddTask}
            className="md:hidden fixed bottom-6 right-6 bg-teal-500 hover:bg-teal-600 text-white p-4 rounded-full shadow-lg transition-transform transform hover:scale-110 z-20"
            aria-label="Adicionar Nova Tarefa"
        >
            <PlusIcon />
        </button>
      )}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onExport={handleExportData}
        onImport={handleImportData}
        onReset={handleRequestReset}
        theme={theme}
        onThemeChange={setTheme}
      />
      <ConfirmationDialog
        isOpen={!!taskToDeleteId}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão"
        message="Você tem certeza de que deseja excluir permanentemente esta tarefa? Esta ação não pode ser desfeita."
      />
       <ConfirmationDialog
        isOpen={showResetConfirmation}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Confirmar Redefinição"
        message="Você tem certeza de que deseja excluir TODAS as tarefas? Esta ação é irreversível e removerá todos os dados."
      />
    </div>
  );
};

export default App;
