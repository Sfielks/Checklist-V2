import React from 'react';
import { BoldIcon } from './Icons';

interface EditingToolbarProps {
  onBold: () => void;
}

const EditingToolbar: React.FC<EditingToolbarProps> = ({ onBold }) => {
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
      {/* Other buttons like Italic, etc. can be added here */}
    </div>
  );
};

export default EditingToolbar;
