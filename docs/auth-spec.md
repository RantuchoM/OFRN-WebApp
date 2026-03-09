Especificación Técnica: Contexto de Autenticación (AuthContext)
1. Propósito
Gestionar la identidad del usuario, los permisos por rol y el estado de la sesión dentro de la OFRN-WebApp. Es la fuente única de verdad para la identidad del integrante.

2. Identidad del Usuario (User Object)
El objeto user (o activeUser) representa a un integrante de la base de datos.

ID Crítico: user.id es un Número Entero (Integer) que corresponde a la PK de la tabla integrantes.

No confundir: Este ID es distinto al UUID de texto que maneja Supabase Auth internamente. Toda la lógica de logística (Rooming, Transporte, Viáticos) usa el ID numérico.

3. Propiedades Expuestas
user: Objeto con datos del integrante (nombre, apellido, mail, id).

userId: Alias directo de user.id.

role: Rol del sistema normalizado en minúsculas.

4. Lógica de Permisos (Banderas)
- isEditor: true para roles `admin`, `editor` o `curador`.
- isCurador: true si el array `rol_sistema` contiene `curador` (curaduría de repertorio global).
- isManagement: Permite acceso a vistas de gestión general; incluye `admin`, `editor`, `curador`, `coord_general`, `consulta_general`, `produccion_general`, `director`.
- isPersonal: true para músicos y personal que consulta su propia información.
- isGuest: Usuarios con acceso limitado o invitados.

5. Funciones Clave
login(email, password): Valida credenciales contra la tabla integrantes.

impersonate(targetUser): Permite a un administrador ver la App como si fuera otro usuario (útil para soporte).Especificación Técnica: Contexto de Autenticación (AuthContext)
1. Propósito
Gestionar la identidad del usuario, los permisos por rol y el estado de la sesión dentro de la OFRN-WebApp. Es la fuente única de verdad para la identidad del integrante.

2. Identidad del Usuario (User Object)
El objeto user (o activeUser) representa a un integrante de la base de datos.

ID Crítico: user.id es un Número Entero (Integer) que corresponde a la PK de la tabla integrantes.

No confundir: Este ID es distinto al UUID de texto que maneja Supabase Auth internamente. Toda la lógica de logística (Rooming, Transporte, Viáticos) usa el ID numérico.

3. Propiedades Expuestas
user: Objeto con datos del integrante (nombre, apellido, mail, id).

userId: Alias directo de user.id.

role: Rol del sistema normalizado en minúsculas.

4. Lógica de Permisos (Banderas)
isEditor: true para roles admin, editor o difusion.

isManagement: Permite acceso a vistas de gestión general.

isPersonal: true para músicos y personal que consulta su propia información.

isGuest: Usuarios con acceso limitado o invitados.

5. Funciones Clave
login(email, password): Valida credenciales contra la tabla integrantes.

impersonate(targetUser): Permite a un administrador ver la App como si fuera otro usuario (útil para soporte).