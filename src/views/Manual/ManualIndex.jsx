import React, { useEffect, useState } from 'react';
import { manualService } from '../../services/manualService';
import { useManual } from '../../context/ManualContext';
import { IconBookOpen, IconChevronRight, IconLoader } from '../../components/ui/Icons';

export default function ManualIndex() {
  const [treeData, setTreeData] = useState({});
  const [loading, setLoading] = useState(true);
  const { openManual } = useManual();

  useEffect(() => {
    loadManual();
  }, []);

  const loadManual = async () => {
    setLoading(true);
    try {
      const data = await manualService.getAll();
      // Reutilizamos la lógica de árbol del admin para agrupar
      const tree = {};
      data.forEach(item => {
        if (!tree[item.category]) tree[item.category] = { roots: [], orphans: [] };
        if (!item.parent_id) tree[item.category].roots.push({ ...item, children: [] });
        else tree[item.category].orphans.push(item);
      });

      Object.keys(tree).forEach(cat => {
        const catData = tree[cat];
        catData.orphans.forEach(child => {
          const parent = catData.roots.find(r => r.id === child.parent_id);
          if (parent) parent.children.push(child);
        });
      });
      setTreeData(tree);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
        <IconBookOpen className="text-indigo-600" size={32} /> Manual del Usuario
      </h1>

      {loading ? <IconLoader className="animate-spin text-indigo-600" /> : 
       Object.entries(treeData).map(([category, { roots }]) => (
        <div key={category} className="mb-8 animate-in fade-in slide-in-from-bottom-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 mb-4 pb-1">
            {category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roots.map(root => (
              <div key={root.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-all group">
                <div 
                  onClick={() => openManual(root.section_key)}
                  className="flex items-center gap-2 font-bold text-slate-700 cursor-pointer hover:text-indigo-600 mb-2"
                >
                  <IconBookOpen size={18} className="text-indigo-200 group-hover:text-indigo-500"/>
                  {root.title}
                </div>
                
                {root.children.length > 0 && (
                  <ul className="pl-7 space-y-1">
                    {root.children.map(child => (
                      <li 
                        key={child.id} 
                        onClick={() => openManual(child.section_key)}
                        className="text-sm text-slate-500 cursor-pointer hover:text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <IconChevronRight size={12}/> {child.title}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}