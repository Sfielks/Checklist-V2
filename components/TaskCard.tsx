
import React, { useState, useRef, useEffect } from 'react';
import { TaskType, ContentBlock, SubItemBlock, Priority } from '../types';
import SubItem from './SubItem';
import TextBlock from './TextBlock';
import AttachmentBlock from './AttachmentBlock';
import { TrashIcon, PlusIcon, CalendarIcon, ArchiveIcon, UnarchiveIcon, PaletteIcon, PaperClipIcon, CheckCircleIcon, CircleIcon, DotsVerticalIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon } from './Icons';
import ColorPalette from './ColorPalette';

interface TaskCardProps {
  task: TaskType;
  categories: string[];
  onUpdateTitle: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
  onAddBlock: (taskId: string, type: 'subitem' | 'text') => void;
  onAddAttachment: (taskId: string, file: File) => void;
  onUpdateBlock: (taskId: string, blockId: string, updates: Partial<ContentBlock>) => void;
  onDeleteBlock: (taskId: string, blockId: string) => void;
  onToggleSubItem: (taskId: string, subItemId: string) => void;
  onToggleAllSubItems: (taskId: string, completed: boolean) => void;
  onAddNestedSubItem: (taskId: string, parentId: string) => void;
  onUpdateDetails: (id: string, details: Partial<Pick<TaskType, 'priority' | 'dueDate' | 'category' | 'color'>>) => void;
  onToggleArchive: (id: string) => void;
  onMoveBlock: (taskId: string, sourceId: string, targetId: string | null, position: 'before' | 'after' | 'end') => void;
  onMoveTask: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  draggedTaskId: string | null;
  onSetDraggedTaskId: (id: string | null) => void;
  isNew?: boolean;
}

const priorityConfig: Record<Priority, { label: string; ringColor: string; dotColor: string }> = {
    none: { label: 'Nenhuma', ringColor: 'focus:ring-gray-500', dotColor: '' },
    low: { label: 'Baixa', ringColor: 'focus:ring-blue-400', dotColor: 'bg-blue-500' },
    medium: { label: 'Média', ringColor: 'focus:ring-yellow-400', dotColor: 'bg-yellow-500' },
    high: { label: 'Alta', ringColor: 'focus:ring-orange-400', dotColor: 'bg-orange-500' },
    urgent: { label: 'Urgente', ringColor: 'focus:ring-red-500', dotColor: 'bg-red-600' },
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
  onAddAttachment,
  onUpdateBlock,
  onDeleteBlock,
  onToggleSubItem,
  onToggleAllSubItems,
  onAddNestedSubItem,
  onUpdateDetails,
  onToggleArchive,
  onMoveBlock,
  onMoveTask,
  draggedTaskId,
  onSetDraggedTaskId,
  isNew = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [categoryValue, setCategoryValue] = useState(task.category || '');
  const [isCategoryFocused, setIsCategoryFocused] = useState(false);
  const categoryContainerRef = useRef<HTMLDivElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
        titleInputRef.current.focus();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowColorPalette(false);
        setShowActionsMenu(false);
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

  const handleTaskDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, button, [contenteditable]')) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
    onSetDraggedTaskId(task.id);
  };
  
  const handleTaskDragEnd = () => {
    onSetDraggedTaskId(null);
    setDragOverPosition(null);
  };

  const handleTaskDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/task-id')) {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.y + rect.height / 2;
        setDragOverPosition(e.clientY < midpoint ? 'top' : 'bottom');
    }
  };

  const handleTaskDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleTaskDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/task-id')) {
        e.preventDefault();
        const sourceId = e.dataTransfer.getData('application/task-id');
        if (sourceId && sourceId !== task.id) {
            onMoveTask(sourceId, task.id, dragOverPosition === 'top' ? 'before' : 'after');
        }
        setDragOverPosition(null);
    }
  };


  const { total: totalSubItems, completed: completedSubItems } = countSubItems(task.content);
  const progress = totalSubItems > 0 ? (completedSubItems / totalSubItems) * 100 : 0;
  const isTaskCompleted = totalSubItems > 0 && completedSubItems === totalSubItems;
  
  const handleSelectColor = (color: string | undefined) => {
    onUpdateDetails(task.id, { color });
    setShowColorPalette(false);
    setShowActionsMenu(false);
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

  const handleAddAttachmentClick = () => {
    attachmentInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onAddAttachment(task.id, e.target.files[0]);
    }
    if (e.target) e.target.value = '';
  };
  
  const filteredCategories = categories.filter(
      cat => cat.toLowerCase().includes(categoryValue.toLowerCase()) && cat.toLowerCase() !== categoryValue.toLowerCase()
  );

  const isBeingDragged = draggedTaskId === task.id;
  const showDropIndicator = draggedTaskId && !isBeingDragged;

  const formatDate = (isoString: string | undefined) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return `Criada em ${date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })}`;
  };

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col gap-4 border border-gray-200 dark:border-gray-700/50 hover:border-teal-500/30 transition-all duration-300 ease-in-out border-t-8 ${isBeingDragged ? 'scale-105 shadow-2xl z-20 !opacity-100' : (draggedTaskId ? 'hover:!opacity-100' : '')} ${isNew ? 'animate-fade-in-scale' : ''}`}
      style={{ borderTopColor: task.color || 'transparent' }}
      draggable="true"
      onDragStart={handleTaskDragStart}
      onDragEnd={handleTaskDragEnd}
      onDragOver={handleTaskDragOver}
      onDragLeave={handleTaskDragLeave}
      onDrop={handleTaskDrop}
    >
      {showDropIndicator && dragOverPosition === 'top' && <div className="absolute top-[-4px] left-0 right-0 h-2 bg-teal-400 rounded-full shadow-[0_0_15px_4px] shadow-teal-400/70 z-20 pointer-events-none"></div>}
      {showDropIndicator && dragOverPosition === 'bottom' && <div className="absolute bottom-[-4px] left-0 right-0 h-2 bg-teal-400 rounded-full shadow-[0_0_15px_4px] shadow-teal-400/70 z-20 pointer-events-none"></div>}
      
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 w-full mr-4 min-w-0">
          {totalSubItems > 0 && (
            <button 
              onClick={() => onToggleAllSubItems(task.id, !isTaskCompleted)} 
              className="flex-shrink-0"
              title={isTaskCompleted ? "Marcar tarefa como 'em andamento'" : "Concluir tarefa"}
            >
              {isTaskCompleted ? <CheckCircleIcon /> : <CircleIcon />}
            </button>
          )}
          <div className="flex-grow min-w-0">
            {isEditingTitle ? (
                <div className="flex items-center gap-2">
                    {task.priority && task.priority !== 'none' && (
                        <div 
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${priorityConfig[task.priority].dotColor}`}
                            title={`Prioridade: ${priorityConfig[task.priority].label}`}
                        ></div>
                    )}
                    <input
                        ref={titleInputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        className="text-xl font-bold text-teal-600 dark:text-teal-400 bg-transparent border-b-2 border-teal-500 focus:outline-none w-full"
                    />
                </div>
            ) : (
                <div onClick={() => setIsEditingTitle(true)} className="flex items-center gap-2 cursor-pointer w-full">
                    {task.priority && task.priority !== 'none' && (
                        <div 
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${priorityConfig[task.priority].dotColor}`}
                            title={`Prioridade: ${priorityConfig[task.priority].label}`}
                        ></div>
                    )}
                    <h2 className="text-xl font-bold text-teal-600 dark:text-teal-400 break-words">
                        {task.title}
                    </h2>
                </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {formatDate(task.createdAt)}
            </p>
          </div>
        </div>

        <div className="relative flex-shrink-0 text-gray-500 flex items-center" ref={menuRef}>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            title={isCompact ? "Expandir tarefa" : "Visualização compacta"}
          >
            {isCompact ? <ArrowsPointingOutIcon /> : <ArrowsPointingInIcon />}
          </button>
          <button onClick={() => setShowActionsMenu(!showActionsMenu)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" title="Mais opções">
            <DotsVerticalIcon />
          </button>

          {showActionsMenu && (
            <div className="absolute top-full right-0 mt-2 z-20 bg-white dark:bg-gray-700 p-2 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 w-48">
              <div className="relative">
                <button
                  onClick={() => setShowColorPalette(!showColorPalette)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  <PaletteIcon />
                  <span>Alterar Cor</span>
                </button>
                {showColorPalette && <ColorPalette onSelectColor={handleSelectColor} />}
              </div>
              <button
                onClick={() => { onToggleArchive(task.id); setShowActionsMenu(false); }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
              >
                {task.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
                <span>{task.archived ? "Desarquivar" : "Arquivar"}</span>
              </button>
              <div className="my-1 h-px bg-gray-200 dark:bg-gray-600"></div>
              <button
                onClick={() => { onDeleteTask(task.id); setShowActionsMenu(false); }}
                className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400"
              >
                <TrashIcon />
                <span>Excluir Tarefa</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden flex flex-col gap-4 ${isCompact ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
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
        
        <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 ${totalSubItems > 0 ? 'block' : 'hidden'}`}>
          <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>

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
            if (block.type === 'attachment') {
              return (
                <AttachmentBlock
                  key={block.id}
                  block={block}
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
            <span>Subitem</span>
          </button>
           <button
            onClick={() => onAddBlock(task.id, 'text')}
            className="flex-1 flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-2 transition-colors"
          >
            <PlusIcon />
            <span>Texto</span>
          </button>
          <button
            onClick={handleAddAttachmentClick}
            className="flex-1 flex items-center justify-center gap-2 text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md py-2 transition-colors"
          >
            <PaperClipIcon />
            <span>Anexar</span>
          </button>
        </div>
      </div>
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default TaskCard;
