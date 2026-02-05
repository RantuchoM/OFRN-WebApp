// src/views/Giras/GiraAgenda.jsx
import React from 'react';
import UnifiedAgenda from '../../components/agenda/UnifiedAgenda';

export default function GiraAgenda({ supabase, gira, onBack }) {
    return (
        <UnifiedAgenda 
            supabase={supabase} 
            giraId={gira.id} 
            onBack={onBack} 
            title={gira.nombre_gira} 
            
        />
    );
}