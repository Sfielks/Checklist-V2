
import React from 'react';

/**
 * @interface ConfirmationDialogProps
 * @description Props for the ConfirmationDialog component.
 * @property {boolean} isOpen - Whether the dialog is open.
 * @property {() => void} onClose - Function to call when the dialog is closed.
 * @property {() => void} onConfirm - Function to call when the action is confirmed.
 * @property {string} title - The title of the dialog.
 * @property {string} message - The message to display in the dialog.
 */
interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

/**
 * A component that displays a confirmation dialog.
 * @param {ConfirmationDialogProps} props - The component props.
 * @returns {React.ReactElement | null} The rendered confirmation dialog or null if it is not open.
 */
const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-teal-600 dark:text-teal-400 mb-2">{title}</h3>
          <p className="text-gray-700 dark:text-gray-300">{message}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end items-center gap-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
