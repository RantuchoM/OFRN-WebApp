# Especificación Técnica: Hook useGiraRoster

## 1. Propósito
Administrar el listado de personas convocadas (Roster) para una gira específica, gestionando sus estados y roles.

## 2. Estados del Integrante
- **confirmado**: El integrante participa normalmente.
- **ausente**: El integrante NO participa. Esta bandera es la que dispara el filtrado en todas las demás vistas (Rooming, Transporte).
- **invitado**: Integrantes que no pertenecen a la planta permanente de la orquesta.

## 3. Funciones Críticas
- **updateStatus**: Cambia el estado de un integrante entre confirmado/ausente.
- **addIntegrantes**: Permite sumar nuevas personas al roster manual de la gira.

## 4. Regla de Negocio
- Los cambios en este hook afectan directamente lo que devuelven los servicios de `giraService.js`. Si alguien se marca como 'ausente' aquí, debe desaparecer automáticamente de la visualización de 'Mi Rooming'.