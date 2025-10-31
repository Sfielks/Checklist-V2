import React, { useState, useRef, useEffect } from 'react';
import { TextBlock as TextBlockType } from '../types';
import { TrashIcon, GripVerticalIcon } from './Icons';

interface TextBlockProps {
  block: TextBlockType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onMoveBlock: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
}

const parseMarkdown = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inUList = false;
  let inOList = false;

  for (const line of lines) {
    if (!line.match(/^\s*[-*] /) && inUList) {
      html += '</ul>\n';
      inUList = false;
    }
    if (!line.match(/^\s*\d+\. /) && inOList) {
      html += '</ol>\n';
      inOList = false;
    }

    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>\n`;
    } else if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${line.substring(2)}</blockquote>\n`;
    } else if (line.match(/^\s*[-*] /)) {
      if (!inUList) {
        html += '<ul>\n';
        inUList = true;
      }
      html += `<li>${line.replace(/^\s*[-*] /, '')}</li>\n`;
    } else if (line.match(/^\s*\d+\. /)) {
      if (!inOList) {
        html += '<ol>\n';
        inOList = true;
      }
      html += `<li>${line.replace(/^\s*\d+\. /, '')}</li>\n`;
    } else {
      html += `<p>${line}</p>\n`;
    }
  }

  if (inUList) html += '</ul>\n';
  if (inOList) html += '</ol>\n';

  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>');
};


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
      {dragOverPosition === 'top' && <div className="absolute top-0 left-0 right-0 h-0.5 bg-teal-400 z-10"></div>}
      {dragOverPosition === 'bottom' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 z-10"></div>}
      <div className="cursor-grab text-gray-500" title="Mover item">
        <GripVerticalIcon />
      </div>
      <div className="w-5 flex-shrink-0" />
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          className="w-full bg-gray-700/50 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none overflow-hidden text-gray-300 -m-2"
          rows={1}
        />
      ) : (
        <div 
          onClick={() => setIsEditing(true)} 
          className="prose-styles whitespace-pre-wrap cursor-pointer flex-grow p-2 -m-2 rounded-md hover:bg-gray-700/50 w-full"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(block.text || ' ') }}
        />
      )}
      <button
        onClick={() => onDelete(block.id)}
        className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default TextBlock;