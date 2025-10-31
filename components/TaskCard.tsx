
import React, { useState, useRef, useEffect } from 'react';
import { TaskType, ContentBlock, SubItemBlock, Priority } from '../types';
import SubItem from './SubItem';
import TextBlock from './TextBlock';
import { TrashIcon, PlusIcon, CalendarIcon, ArchiveIcon, UnarchiveIcon, PaletteIcon } from './Icons';
import ColorPalette from './ColorPalette';

interface TaskCardProps {
  task: TaskType;
  categories: string[];
  onUpdateTitle: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
  onAddBlock: (taskId: string, type: 'subitem' | 'text') => void;
  onUpdateBlock: (taskId: string, blockId: string, updates: Partial<ContentBlock>) => void;
  onDeleteBlock: (taskId: string, blockId: string) => void;
  onToggleSubItem: (taskId: string, subItemId: string) => void;
  onAddNestedSubItem: (taskId: string, parentId: string) => void;
  onUpdateDetails: (id: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color'>>) => void;
  onToggleArchive: (id: string) => void;
  onMoveBlock: (taskId: string, sourceId: string, targetId: string | null, position: 'before' | 'after' | 'end') => void;
}

const priorityConfig: Record<Priority, { label: string; ringColor: string }> = {
    none: { label: 'Nenhuma', ringColor: 'focus:ring-gray-500' },
    low: { label: 'Baixa', ringColor: 'focus:ring-blue-400' },
    medium: { label: 'Média', ringColor: 'focus:ring-yellow-400' },
    high: { label: 'Alta', ringColor: 'focus:ring-orange-400' },
    urgent: { label: 'Urgente', ringColor: 'focus:ring-red-500' },
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


const TaskCard: React.FC<TaskCardProps> = ({
  task,
  categories,
  onUpdateTitle,
  onDeleteTask,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onToggleSubItem,
  onAddNestedSubItem,
  onUpdateDetails,
  onToggleArchive,
  onMoveBlock,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  const [categoryValue, setCategoryValue] = useState(task.category || '');
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setShowColorPalette(false);
      }
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(event.target as Node)) {
        if (isCategoryFocused) {
          if (categoryValue.trim() !== (task.category || '')) {
             onUpdateDetails(task.id, { category: categoryValue });
          }
        }
        setIsCategoryFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryFocused, categoryValue, onUpdateDetails, task.id, task.category]);

  useEffect(() => {
    setCategoryValue(task.category || '');
  }, [task.category]);


  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if(title.trim() === '') {
        setTitle(task.title); // revert if empty
    } else if (title !== task.title) {
        onUpdateTitle(task.id, title);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };
  
  const handleContentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    const target = e.target as HTMLElement;
    // Check if dropping in the container but not on another draggable item
    if (sourceId && target.closest('[data-dropzone="true"]')) {
      const closestDraggable = target.closest('[draggable="true"]');
      if (!closestDraggable) {
        onMoveBlock(task.id, sourceId, null, 'end');
      }
    }
  };

  const { total: totalSubItems, completed: completedSubItems } = countSubItems(task.content);
  const progress = totalSubItems > 0 ? (completedSubItems / totalSubItems) * 100 : 0;
  
  const handleSelectColor = (color: string | undefined) => {
    onUpdateDetails(task.id, { color });
    setShowColorPalette(false);
  };
  
  const handleSelectCategory = (category: string) => {
    setCategoryValue(category);
    onUpdateDetails(task.id, { category });
    setIsCategoryFocused(false);
  };
  
  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (categoryValue.trim() !== (task.category || '')) {
          onUpdateDetails(task.id, { category: categoryValue });
      }
      setIsCategoryFocused(false);
      e.currentTarget.blur();
    }
     if (e.key === 'Escape') {
      setIsCategoryFocused(false);
      e.currentTarget.blur();
    }
  };
  
  const filteredCategories = categories.filter(
      cat => cat.toLowerCase().includes(categoryValue.toLowerCase()) && cat.toLowerCase() !== categoryValue.toLowerCase()
  );

  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col gap-4 border border-gray-200 dark:border-gray-700/50 hover:border-teal-500/30 transition-all duration-300 border-t-8"
      style={{ borderTopColor: task.color || 'transparent' }}
    >
      <div className="flex justify-between items-start">
        {isEditingTitle ? (
            <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                className="text-xl font-bold text-teal-600 dark:text-teal-400 bg-transparent border-b-2 border-teal-500 focus:outline-none w-full mr-4"
            />
        ) : (
            <h2 onClick={() => setIsEditingTitle(true)} className="text-xl font-bold text-teal-600 dark:text-teal-400 cursor-pointer w-full mr-4 break-words">
                {task.title}
            </h2>
        )}
        <div className="flex items-center space-x-2 flex-shrink-0 text-gray-500">
            <div className="relative" ref={paletteRef}>
                <button 
                  onClick={() => setShowColorPalette(!showColorPalette)} 
                  className="hover:text-teal-500 dark:hover:text-teal-400" 
                  title="Alterar Cor"
                >
                  <PaletteIcon />
                </button>
                {showColorPalette && <ColorPalette onSelectColor={handleSelectColor} />}
            </div>
            <button onClick={() => onToggleArchive(task.id)} className="hover:text-teal-500 dark:hover:text-teal-400" title={task.archived ? "Desarquivar Tarefa" : "Arquivar Tarefa"}>
                {task.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
            </button>
            <button onClick={() => onDeleteTask(task.id)} className="hover:text-red-500 dark:hover:text-red-400" title="Excluir Tarefa">
                <TrashIcon />
            </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-x-6 gap-y-3 text-sm text-gray-500 dark:text-gray-400 border-b border-t border-gray-200 dark:border-gray-700/50 py-3 -mx-5 px-5">
        <div className="flex items-center gap-2">
            <label htmlFor={`priority-${task.id}`} className="font-medium text-gray-700 dark:text-gray-300">Prioridade:</label>
            <select
                id={`priority-${task.id}`}
                value={task.priority || 'none'}
                onChange={(e) => onUpdateDetails(task.id, { priority: e.target.value as Priority })}
                className={`bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-2 text-gray-900 dark:text-white ${priorityConfig[task.priority || 'none'].ringColor}`}
            >
                {Object.entries(priorityConfig).map(([key, { label }]) => (
                    <option key={key} value={key} className="bg-white dark:bg-gray-800 font-medium">{label}</option>
                ))}
            </select>
        </div>

        <div className="flex items-center gap-2">
             <label htmlFor={`dueDate-${task.id}`} className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2"><CalendarIcon /> Vencimento:</label>
             <input
                id={`dueDate-${task.id}`}
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => onUpdateDetails(task.id, { dueDate: e.target.value })}
                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-700 dark:text-gray-300"
                style={{ colorScheme: 'dark' }}
            />
        </div>
        
         <div ref={categoryContainerRef} className="relative flex items-center gap-2">
            <label htmlFor={`category-${task.id}`} className="font-medium text-gray-700 dark:text-gray-300">#</label>
            <input
                id={`category-${task.id}`}
                type="text"
                placeholder="Categoria"
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                onFocus={() => setIsCategoryFocused(true)}
                onKeyDown={handleCategoryKeyDown}
                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-teal-500 w-32 placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white"
            />
            {isCategoryFocused && filteredCategories.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white dark:bg-gray-800 rounded-md shadow-lg border dark:border-gray-700 z-10 max-h-40 overflow-y-auto">
                    {filteredCategories.map(cat => (
                        <div
                            key={cat}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900/50"
                            onMouseDown={(e) => {
                                e.preventDefault(); // prevent input blur before click
                                handleSelectCategory(cat);
                            }}
                        >
                            {cat}
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {totalSubItems > 0 && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      <div 
        className="flex flex-col min-h-[2rem]"
        data-dropzone="true"
        onDragOver={handleContentDragOver}
        onDrop={handleContentDrop}
       >
        {task.content.map((block) => {
           if (block.type === 'subitem') {
            return (
              <SubItem
                key={block.id}
                subItem={block}
                onToggle={(subItemId) => onToggleSubItem(task.id, subItemId)}
                onUpdate={(_id, text) => onUpdateBlock(task.id, block.id, { text })}
                onDelete={(_id) => onDeleteBlock(task.id, block.id)}
                onAddNestedSubItem={(parentId) => onAddNestedSubItem(task.id, parentId)}
                onMoveBlock={(sourceId, targetId, position) => onMoveBlock(task.id, sourceId, targetId, position)}
              />
            );
          }
          if (block.type === 'text') {
            return (
              <TextBlock
                key={block.id}
                block={block}
                onUpdate={(_id, text) => onUpdateBlock(task.id, block.id, { text })}
                onDelete={(_id) => onDeleteBlock(task.id, block.id)}
                onMoveBlock={(sourceId, targetId, position) => onMoveBlock(task.id, sourceId, targetId, position)}
              />
            );
          }
          return null;
        })}
      </div>
      
      <div className="mt-auto pt-4 flex items-center justify-stretch gap-2 text-sm">
        <button
          onClick={() => onAddBlock(task.id, 'subitem')}
          className="flex-1 flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-2 transition-colors"
        >
          <PlusIcon />
          <span>Adicionar subitem</span>
        </button>
         <button
          onClick={() => onAddBlock(task.id, 'text')}
          className="flex-1 flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-2 transition-colors"
        >
          <PlusIcon />
          <span>Adicionar texto</span>
        </button>
      </div>
    </div>
  );
};

export default TaskCard;