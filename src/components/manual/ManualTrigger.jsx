import React from 'react';
import { useManual } from '../../context/ManualContext';
import { IconBookOpen } from '../../components/ui/Icons';

const ManualTrigger = ({ section, size = 'md', className = "" }) => {
  const { openManual } = useManual();

  const sizes = {
    sm: { btn: "w-6 h-6", icon: 14 },
    md: { btn: "w-8 h-8", icon: 16 },
    lg: { btn: "w-10 h-10", icon: 20 }
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openManual(section);
      }}
      className={`inline-flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-md transition-all duration-200 border border-indigo-100 ${sizes[size].btn} ${className}`}
      title="Ver ayuda"
    >
      <IconBookOpen size={sizes[size].icon} />
    </button>
  );
};

export default ManualTrigger;