# Diagrama de flujo — Registro de ingreso a ensayos de ensamble

**Orquesta Filarmónica de Río Negro (OFRN)**

> Versión interactiva con renderizado visual: abrir [`diagrama-flujo.html`](./diagrama-flujo.html) en el navegador.

---

## Flujo principal del integrante

```mermaid
flowchart TD
    A([Integrante autenticado<br/>accede a su Agenda]) --> B{¿Es el día<br/>del ensayo?}
    B -->|No| Z([Check-in no disponible])
    B -->|Sí| C[Pulsa Registrar hora de llegada]
    C --> D{¿GPS<br/>disponible?}

    D -->|Sí| E[Dispositivo obtiene coordenadas<br/>alta precisión + precisión en m]
    E --> F[Servidor valida ensayo<br/>y fecha Argentina]
    F --> G[Registro modo GPS<br/>hora servidor + coords + distancia a sede]
    G --> H([Confirmación con hora de ingreso])

    D -->|No| I{¿Alternativa?}
    I -->|QR compañero| J[Compañero con GPS genera QR<br/>válido 20 s, un solo uso]
    J --> K[Integrante escanea QR]
    K --> L[Servidor valida token<br/>y registra modo peer_pase]
    L --> H

    I -->|Sin ubicación| M[Registro sin coordenadas<br/>modo GPS, coords nulas]
    M --> F

    G --> O{¿Compañero necesita<br/>pase QR?}
    O -->|Sí| J
    O -->|No| P([Fin])
    H --> P
```

---

## Flujo de supervisión y auditoría (Gestión)

```mermaid
flowchart LR
    subgraph GESTION["Gestión → Asistencia a ensayos"]
        R1[Filtrar fechas y ensambles]
        R2[Vista matriz o por persona]
        R3{¿Registro con<br/>coordenadas?}
        R3 -->|Sí| R4[Ver en mapa<br/>+ distancia a sede]
        R3 -->|No| R5[Identificar modo<br/>QR / sin GPS]
        R4 --> R6[Exportar Excel / PDF]
        R5 --> R6
        R2 --> R3
    end

    GESTION --> AUD([Control ex post<br/>RRHH / legisladores])
```

---

## Leyenda de modalidades

| Modalidad | Descripción |
|-----------|-------------|
| **GPS directo** | Coordenadas propias del integrante. Evidencia geográfica principal. |
| **Pase QR (`peer_pase`)** | Ubicación del compañero presente. Token efímero 20 s, uso único. |
