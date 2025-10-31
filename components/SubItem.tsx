import React, { useState, useRef, useEffect } from 'react';
import { SubItemBlock } from '../types';
import { TrashIcon, CheckCircleIcon, CircleIcon, PlusCircleIcon } from './Icons';

interface SubItemProps {
  subItem: SubItemBlock;
  onToggle: (id: string) => void;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onAddNestedSubItem: (parentId: string) => void;
  level?: number;
}

const SubItem: React.FC<SubItemProps> = ({ subItem, onToggle, onUpdate, onDelete, onAddNestedSubItem, level = 0 }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(subItem.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  
  useEffect(() => {
    setText(subItem.text);
  }, [subItem.text]);


  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() === '') {
        onDelete(subItem.id);
    } else {
        onUpdate(subItem.id, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div style={{ paddingLeft: `${level * 28}px` }}>
      <div className="flex items-center space-x-3 group py-1.5">
        <button onClick={() => onToggle(subItem.id)} className="flex-shrink-0">
          {subItem.completed ? <CheckCircleIcon /> : <CircleIcon />}
        </button>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`flex-grow bg-transparent border-b border-teal-500 focus:outline-none ${
              subItem.completed ? 'line-through text-gray-500' : 'text-gray-300'
            }`}
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-grow cursor-pointer ${
              subItem.completed ? 'line-through text-gray-500' : 'text-gray-300'
            }`}
          >
            {subItem.text}
          </span>
        )}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => onAddNestedSubItem(subItem.id)}
                className="text-gray-400 hover:text-teal-400 mr-2"
                title="Adicionar subitem aninhado"
            >
                <PlusCircleIcon />
            </button>
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
            level={level + 1}
          />
        ))}
      </div>
    </div>
  );
};

export default SubItem;