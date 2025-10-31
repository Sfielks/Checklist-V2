import React, { useState, useEffect } from 'react';
import { TaskType, ContentBlock, SubItemBlock, TextBlock, Priority } from './types';
import TaskCard from './components/TaskCard';
import { PlusIcon, FilterIcon, XCircleIcon, ClipboardListIcon, TagIcon, MenuIcon, XIcon } from './components/Icons';

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


const HomeScreen = ({ onEnter }: { onEnter: () => void }) => (
  <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
    <div className="max-w-2xl">
      <h1 className="text-5xl sm:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">
        Checklist Avançado
      </h1>
      <p className="text-gray-400 mt-4 text-lg sm:text-xl">
        A sua ferramenta definitiva para organizar tarefas complexas, projetos e ideias. Crie checklists detalhados com subtarefas, notas, prioridades e muito mais.
      </p>
      <button 
        onClick={onEnter}
        className="mt-10 bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300 text-lg"
      >
        Acessar Checklist
      </button>
    </div>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'checklist'>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const [showArchived, setShowArchived] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress'>('all');

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
    setTasks(tasks.filter((task) => task.id !== taskId));
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

  const handleUpdateTaskDetails = (taskId: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category'>>) => {
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
    return <HomeScreen onEnter={() => setView('checklist')} />;
  }

  const categoryNav = (
    <nav className="flex flex-col space-y-2">
        <button 
            onClick={() => setCategoryFilter('all')}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                categoryFilter === 'all' ? 'bg-teal-500/20 text-teal-300' : 'text-gray-300 hover:bg-gray-700/50'
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
                    categoryFilter === category ? 'bg-teal-500/20 text-teal-300' : 'text-gray-300 hover:bg-gray-700/50'
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
        <label htmlFor={isMobile ? "priority-filter-mobile" : "priority-filter"} className={isMobile ? "text-gray-300 font-medium mb-1" : "sr-only"}>Prioridade</label>
        <select
            id={isMobile ? "priority-filter-mobile" : "priority-filter"}
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value as Priority | 'all')}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
        >
            {Object.entries(priorityOptions).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ))}
        </select>
      </div>
      <div className={isMobile ? "flex flex-col gap-4" : "flex-1 min-w-[150px]"}>
        <label htmlFor={isMobile ? "status-filter-mobile" : "status-filter"} className={isMobile ? "text-gray-300 font-medium mb-1" : "sr-only"}>Status</label>
        <select
            id={isMobile ? "status-filter-mobile" : "status-filter"}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-white"
        >
            {Object.entries(statusOptions).map(([key, value]) => (
                <option key={key} value={key}>{value}</option>
            ))}
        </select>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 z-30 p-4 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-teal-400">Checklist v2</h1>
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-md hover:bg-gray-700"
                aria-label="Abrir menu"
            >
                <MenuIcon />
            </button>
            {!showArchived && (
                <button
                    onClick={handleAddTask}
                    className="hidden md:flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105"
                >
                    <PlusIcon />
                    <span>Nova Tarefa</span>
                </button>
            )}
        </div>
      </header>
      
      <div 
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity md:hidden ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      ></div>
    
      <div className={`fixed top-0 left-0 h-full w-full max-w-xs bg-gray-800 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-teal-400">Filtros & Categorias</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-md hover:bg-gray-700" aria-label="Fechar menu">
                    <XIcon />
                </button>
            </div>
            
            <div className="border-b border-gray-700 pb-4 mb-4">
                <h3 className="text-lg font-semibold text-teal-400 mb-4">Categorias</h3>
                {categoryNav}
            </div>
            
            <div className="flex flex-col gap-4 flex-grow">
                <div className="flex items-center gap-2 text-gray-300 font-semibold">
                    <FilterIcon />
                    <span>Filtrar por:</span>
                </div>
                {filterControls(true)}
                <div className="mt-auto pt-4">
                  <button
                      onClick={handleClearFilters}
                      className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors bg-gray-700 hover:bg-gray-600 rounded-md py-2"
                  >
                      <XCircleIcon />
                      <span>Limpar Filtros</span>
                  </button>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="w-full md:w-64 flex-shrink-0 hidden md:block">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700/50 sticky top-24">
                    <h2 className="text-lg font-semibold text-teal-400 mb-4">Categorias</h2>
                    {categoryNav}
                </div>
            </aside>

            <div className="flex-1 min-w-0">
                <div className="flex justify-center mb-6">
                    <div className="bg-gray-800 p-1 rounded-lg flex items-center border border-gray-700/50">
                        <button
                            onClick={() => setShowArchived(false)}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${!showArchived ? 'bg-teal-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Ativas
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${showArchived ? 'bg-teal-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Arquivadas
                        </button>
                    </div>
                </div>

                <div className="bg-gray-800/80 backdrop-blur-sm p-4 rounded-lg mb-6 border border-gray-700/50 hidden md:flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-gray-300 font-semibold">
                        <FilterIcon />
                        <span>Filtrar por:</span>
                    </div>
                    {filterControls(false)}
                    <button
                        onClick={handleClearFilters}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
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
                    <div className="text-center py-16 px-6 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-300">
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
    </div>
  );
};

export default App;