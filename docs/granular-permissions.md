# Sistema de Permisos Granulares (Multi-Rol) - OFRN

## Arquitectura
Se utiliza una columna de tipo Array de Texto (`text[]`) en la tabla `integrantes` llamada `rol_sistema`. Esto permite que un usuario desempeñe múltiples funciones simultáneamente.

## Configuración de Roles
Un usuario puede tener, por ejemplo: `['musico', 'arreglador', 'archivista']`.

## Lógica de Consumo (AuthContext)
El sistema expone flags booleanas basadas en la existencia del rol en el array:

- **isAdmin**: Contiene 'admin'.
- **isArreglador**: Contiene 'arreglador'.
- **isArchivista**: Contiene 'archivista'.
- **isEditor**: Contiene 'admin', 'editor' o 'difusion'.
- **isManagement**: Contiene cualquier rol directivo o de coordinación.

## Cómo asignar roles (SQL)
Para agregar un rol sin borrar los existentes:

```sql
UPDATE integrantes SET rol_sistema = array_append(rol_sistema, 'nuevo_rol') WHERE id = X;
```

---

## Migración: texto → array (Supabase SQL Editor)

Este script convierte la columna `rol_sistema` de `text` a `text[]` y deja los valores actuales como un array de un solo elemento.

```sql
-- 1. Convertir la columna rol_sistema a un array de texto
-- Los valores actuales 'admin' pasan a ser ['admin']
ALTER TABLE public.integrantes 
ALTER COLUMN rol_sistema TYPE text[] 
USING ARRAY[rol_sistema];

-- 2. (Opcional) Asignar roles múltiples de prueba
-- Reemplaza con el ID o mail correspondiente
UPDATE public.integrantes 
SET rol_sistema = ARRAY['editor', 'arreglador', 'archivista'] 
WHERE mail = 'martin.rantucho@gmail.com';
```

## Compatibilidad
- **AuthContext** acepta tanto `rol_sistema` como string (legacy) como array: si viene string, se normaliza a un array de un elemento.
- Se mantiene la exportación de `role` (primer elemento del array) para componentes que dependen de un único rol en formato string.
