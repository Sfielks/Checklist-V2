
import React, { useState, useRef, useEffect } from 'react';
import { SubItemBlock } from '../types';
import { TrashIcon, CheckCircleIcon, CircleIcon, PlusCircleIcon, GripVerticalIcon } from './Icons';

/**
 * @interface SubItemProps
 * @description Props for the SubItem component.
 * @property {SubItemBlock} subItem - The sub-item data.
 * @property {(id: string) => void} onToggle - Function to call when the sub-item is toggled.
 * @property {(id: string, text: string) => void} onUpdate - Function to call when the sub-item text is updated.
 * @property {(id: string) => void} onDelete - Function to call when the sub-item is deleted.
 * @property {(parentId: string) => void} onAddNestedSubItem - Function to call when a nested sub-item is added.
 * @property {(sourceId: string, targetId: string, position: 'before' | 'after') => void} onMoveBlock - Function to call when the block is moved.
 * @property {number} [level=0] - The nesting level of the sub-item.
 */
interface SubItemProps {
  subItem: SubItemBlock;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddNestedSubItem: (parentId: string) => void;
  onMoveBlock: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  level?: number;
}

/**
 * A component that displays a sub-item within a task.
 * @param {SubItemProps} props - The component props.
 * @returns {React.ReactElement} The rendered sub-item component.
 */
const SubItem: React.FC<SubItemProps> = ({ subItem, onToggle, onUpdate, onDelete, onAddNestedSubItem, onMoveBlock, level = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(subItem.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [isEditing]);
  
  useEffect(() => {
    setText(subItem.text);
  }, [subItem.text]);

  /**
   * Handles the blur event for the textarea.
   */
  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() === '') {
        onDelete(subItem.id);
    } else if (text !== subItem.text) {
        onUpdate(subItem.id, text);
    }
  };

  /**
   * Handles the change event for the textarea.
   * @param {React.ChangeEvent<HTMLTextAreaElement>} e - The change event.
   */
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
  }

  /**
   * Handles the key down event for the textarea.
   * @param {React.KeyboardEvent<HTMLTextAreaElement>} e - The key down event.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
  };

  /**
   * Handles the start of a drag event.
   * @param {React.DragEvent} e - The drag event.
   */
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', subItem.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  /**
   * Handles a drag over event to determine the drop position.
   * @param {React.DragEvent} e - The drag event.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    setDragOverPosition(e.clientY < midpoint ? 'top' : 'bottom');
  };

  /**
   * Handles a drag leave event to reset the drop position.
   */
  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  /**
   * Handles a drop event to move the block.
   * @param {React.DragEvent} e - The drop event.
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== subItem.id) {
        onMoveBlock(sourceId, subItem.id, dragOverPosition === 'top' ? 'before' : 'after');
    }
    setDragOverPosition(null);
  };

  return (
    <div style={{ paddingLeft: `${level * 28}px` }} className="relative">
       {dragOverPosition === 'top' && <div className="absolute top-0 left-0 right-0 h-2 bg-teal-500 rounded shadow-[0_0_12px_2px] shadow-teal-400/60 z-10"></div>}
       {dragOverPosition === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-2 bg-teal-500 rounded shadow-[0_0_12px_2px] shadow-teal-400/60 z-10"></div>}
      <div 
        className="flex items-center space-x-3 group py-1.5"
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="cursor-grab text-gray-400 dark:text-gray-500" title="Mover item">
            <GripVerticalIcon />
        </div>
        <button onClick={() => onToggle(subItem.id)} className="flex-shrink-0">
          {subItem.completed ? <CheckCircleIcon /> : <CircleIcon />}
        </button>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextareaChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`flex-grow bg-transparent focus:outline-none resize-none overflow-hidden ${
              subItem.completed ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-800 dark:text-gray-300'
            }`}
            rows={1}
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-grow cursor-pointer whitespace-pre-wrap ${
              subItem.completed ? 'line-through text-gray-500 dark:text-gray-500' : 'text-gray-800 dark:text-gray-300'
            }`}
          >
            {subItem.text || <span className="text-gray-500 italic">Subitem vazio</span>}
          </span>
        )}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {level < 2 && (
              <button
                  onClick={() => onAddNestedSubItem(subItem.id)}
                  className="text-gray-500 hover:text-teal-500 dark:text-gray-400 dark:hover:text-teal-400 mr-2"
                  title="Adicionar subitem aninhado"
              >
                  <PlusCircleIcon />
              </button>
            )}
            <button
                onClick={() => onDelete(subItem.id)}
                className="text-gray-500 hover:text-red-500"
                title="Excluir subitem"
            >
                <TrashIcon />
            </button>
        </div>
      </div>
      <div>
        {subItem.children.map(child => (
          <SubItem
            key={child.id}
            subItem={child}
            onToggle={onToggle}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAddNestedSubItem={onAddNestedSubItem}
            onMoveBlock={onMoveBlock}
            level={level + 1}
          />
        ))}
      </div>
    </div>
  );
};

export default SubItem;
