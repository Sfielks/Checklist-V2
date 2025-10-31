
import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { TextBlock as TextBlockType } from '../types';
import { TrashIcon, GripVerticalIcon } from './Icons';
import EditingToolbar from './EditingToolbar';

interface TextBlockProps {
  block: TextBlockType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMoveBlock: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
}

const TextBlock: React.FC<TextBlockProps> = ({ block, onUpdate, onDelete, onMoveBlock }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(block.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      handleTextChange({ target: textareaRef.current } as any);
    }
  }, [isEditing]);
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
  }

  const handleBlur = () => {
    setIsEditing(false);
    if (text.trim() === '') {
        onDelete(block.id);
    } else if (text !== block.text) {
        onUpdate(block.id, text);
    }
  };

  const handleBoldClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = text.substring(start, end);
    const newText = `${text.substring(0, start)}**${selectedText}**${text.substring(end)}`;
    
    setText(newText);
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(end + 2, end + 2);
    }, 0);
  };

  const handleListClick = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;

    let lineStart = start;
    while (lineStart > 0 && value[lineStart - 1] !== '\n') {
        lineStart--;
    }

    let lineEnd = end;
    while (lineEnd < value.length && value[lineEnd] !== '\n') {
        lineEnd++;
    }

    const selectedLinesText = value.substring(lineStart, lineEnd);
    const lines = selectedLinesText.split('\n');
    
    const isAlreadyList = lines.every(line => line.trim().startsWith('- ') || line.trim() === '');
    let newLinesText = '';
    let charChange = 0;

    if (isAlreadyList) {
        newLinesText = lines.map(line => {
            if (line.trim().startsWith('- ')) {
                charChange -= 2;
                return line.replace(/-\s/, '');
            }
            return line;
        }).join('\n');
    } else {
        newLinesText = lines.map(line => {
            if (line.trim() !== '') {
                charChange += 2;
                return `- ${line}`;
            }
            return line;
        }).join('\n');
    }

    const newText = value.substring(0, lineStart) + newLinesText + value.substring(lineEnd);
    setText(newText);
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(end + charChange, end + charChange);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleBlur();
    }
     if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleBoldClick();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
        e.preventDefault();
        handleListClick();
    }
  };
  
  useEffect(() => {
      setText(block.text);
  }, [block.text])
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', block.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    setDragOverPosition(e.clientY < midpoint ? 'top' : 'bottom');
  };

  const handleDragLeave = () => {
    setDragOverPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (sourceId && sourceId !== block.id) {
        onMoveBlock(sourceId, block.id, dragOverPosition === 'top' ? 'before' : 'after');
    }
    setDragOverPosition(null);
  };

  return (
    <div 
        className="flex items-start space-x-3 group py-1.5 relative"
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
    >
      {dragOverPosition === 'top' && <div className="absolute top-0 left-0 right-0 h-2 bg-teal-500 rounded shadow-[0_0_12px_2px] shadow-teal-400/60 z-10"></div>}
      {dragOverPosition === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-2 bg-teal-500 rounded shadow-[0_0_12px_2px] shadow-teal-400/60 z-10"></div>}
      <div className="cursor-grab text-gray-500" title="Mover item">
        <GripVerticalIcon />
      </div>
      <div className="w-5 flex-shrink-0" />
      <div className="w-full relative">
        {isEditing ? (
          <>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full bg-gray-100/50 dark:bg-gray-700/50 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none overflow-hidden text-gray-900 dark:text-gray-200 -m-2"
              rows={1}
            />
            <EditingToolbar onBold={handleBoldClick} onList={handleListClick} />
          </>
        ) : (
          <div 
            onClick={() => setIsEditing(true)} 
            className="prose-styles dark:prose-styles max-w-none cursor-pointer p-2 -m-2 rounded-md hover:bg-gray-200/50 dark:hover:bg-gray-700/50 w-full"
            dangerouslySetInnerHTML={{ __html: block.text.trim() ? marked(block.text) as string : '<p><span class="text-gray-500 dark:text-gray-400 italic">Bloco de texto vazio</span></p>' }}
          />
        )}
      </div>
      <button
        onClick={() => onDelete(block.id)}
        className="text-gray-400 dark:text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default TextBlock;