import React, { useState } from 'react';
import { AttachmentBlock as AttachmentBlockType } from '../types';
import { TrashIcon, GripVerticalIcon, DocumentTextIcon, DownloadIcon, XIcon } from './Icons';

interface AttachmentBlockProps {
  block: AttachmentBlockType;
  onDelete: (id: string) => void;
  onMoveBlock: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const AttachmentBlock: React.FC<AttachmentBlockProps> = ({ block, onDelete, onMoveBlock }) => {
  const [dragOverPosition, setDragOverPosition] = useState<'top' | 'bottom' | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isImage = block.fileType.startsWith('image/');

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
    <>
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
        
        <div className="cursor-grab pt-2 text-gray-500" title="Mover item">
          <GripVerticalIcon />
        </div>
        <div className="w-5 flex-shrink-0" />
        
        <div className="flex-grow bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden">
              {isImage ? (
                <button onClick={() => setIsPreviewOpen(true)} className="w-full h-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-700/50 focus:ring-teal-500 rounded-md transition-all duration-200">
                  <img src={block.dataUrl} alt={block.fileName} className="w-full h-full object-cover" />
                </button>
              ) : (
                <DocumentTextIcon />
              )}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={block.fileName}>
                {block.fileName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(block.size)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <a
              href={block.dataUrl}
              download={block.fileName}
              className="p-2 text-gray-500 hover:text-teal-500 dark:text-gray-400 dark:hover:text-teal-400"
              title="Baixar anexo"
            >
              <DownloadIcon />
            </a>
            <button
              onClick={() => onDelete(block.id)}
              className="p-2 text-gray-500 hover:text-red-500"
              title="Excluir anexo"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {isPreviewOpen && isImage && (
        <div 
            className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4 animate-fade-in-scale"
            onClick={() => setIsPreviewOpen(false)}
            role="dialog"
            aria-modal="true"
        >
            <div className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-lg p-2 shadow-xl" onClick={e => e.stopPropagation()}>
                <img 
                    src={block.dataUrl} 
                    alt={`Pré-visualização de ${block.fileName}`}
                    className="max-w-full max-h-[calc(90vh-1rem)] object-contain rounded" 
                />
                 <button 
                    onClick={() => setIsPreviewOpen(false)} 
                    className="absolute -top-3 -right-3 bg-gray-700 text-white rounded-full p-1.5 hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    aria-label="Fechar pré-visualização"
                >
                    <XIcon />
                </button>
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 text-white p-2 text-center rounded-b-lg text-sm truncate">
                    {block.fileName}
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default AttachmentBlock;
