import React from 'react';
import { useManual } from '../../context/ManualContext';
import { IconBookOpen } from '../ui/Icons';

export default function ManualTrigger({ section, size = 'md', className = '' }) {
  const { openManual, showTriggers } = useManual(); 

  // --- LA LÓGICA DE ORO ---
  // Si el usuario decidió ocultar las ayudas, este componente no renderiza nada.
  if (!showTriggers) return null;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); 
        openManual(section);
      }}
      className={`rounded-full flex items-center justify-center transition-all duration-200 bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white border border-sky-200 shadow-sm hover:shadow ${sizeClasses[size]} ${className}`}
      title="Ver ayuda del manual"
    >
      <IconBookOpen size={iconSizes[size]} />
    </button>
  );
}