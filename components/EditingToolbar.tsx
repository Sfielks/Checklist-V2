

import React from 'react';
import { BoldIcon, ListBulletIcon, StrikethroughIcon } from './Icons';

interface EditingToolbarProps {
  onBold: () => void;
  onStrikethrough: () => void;
  // FIX: Made `onList` prop optional. The toolbar is used in SubItem, which is a list item itself
  // and doesn't require list creation functionality within its text. This change resolves the type error.
  onList?: () => void;
}

const EditingToolbar: React.FC<EditingToolbarProps> = ({ onBold, onStrikethrough, onList }) => {
  return (
    <div className="absolute -bottom-10 left-0 bg-white dark:bg-gray-700 shadow-lg rounded-md border border-gray-200 dark:border-gray-600 flex items-center p-1 z-10">
      <button
        onClick={onBold}
        onMouseDown={(e) => e.preventDefault()} // Prevent textarea from losing focus
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
        title="Negrito (Ctrl+B)"
      >
        <BoldIcon />
      </button>
      <button
        onClick={onStrikethrough}
        onMouseDown={(e) => e.preventDefault()}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
        title="Tachado (Ctrl+Shift+X)"
      >
        <StrikethroughIcon />
      </button>
      {onList && (
        <button
          onClick={onList}
          onMouseDown={(e) => e.preventDefault()}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
          title="Lista com marcadores (Ctrl+L)"
        >
          <ListBulletIcon />
        </button>
      )}
    </div>
  );
};

export default EditingToolbar;