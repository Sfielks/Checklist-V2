
import React from 'react';

interface ColorPaletteProps {
  onSelectColor: (color: string | undefined) => void;
}

const colors = [
  undefined,    // Default color
  '#fca5a5', // Red light
  '#fdba74', // Orange light
  '#fde047', // Yellow light
  '#86efac', // Green light
  '#67e8f9', // Cyan light
  '#93c5fd', // Blue light
  '#d8b4fe', // Purple light
  '#f9a8d4', // Pink light
];

const ColorPalette: React.FC<ColorPaletteProps> = ({ onSelectColor }) => {
  return (
    <div className="absolute top-full right-0 mt-2 z-20 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 w-40">
      <div className="grid grid-cols-3 gap-2">
        {colors.map((color, index) => {
            const isDefault = color === undefined;
            return (
              <button
                key={index}
                onClick={() => onSelectColor(color)}
                className={`w-8 h-8 rounded-full border-2 border-transparent hover:border-gray-500 dark:hover:border-white focus:outline-none focus:border-gray-500 dark:focus:border-white transition-transform transform hover:scale-110 mx-auto ${isDefault ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                style={color ? { backgroundColor: color } : {}}
                aria-label={color ? `Select color ${color}` : 'Reset to default color'}
              />
            );
        })}
      </div>
    </div>
  );
};

export default ColorPalette;
