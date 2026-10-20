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
- Agenda (deriveAgendaPermissions): `consulta_general` es management pero **no** tiene `canSeeTechEvents` ni `canSeeHiddenAgendaEvents` (no ve eventos Téc ni paradas ocultas).

5. Funciones Clave
login(email, password): Valida credenciales contra `integrantes.mail` + `integrantes.clave_acceso`.

impersonate(targetUser): Permite a un administrador ver la App como si fuera otro usuario (útil para soporte).

6. Mi Perfil (`ProfileEditModal`)
- Cualquier sesión con `user.id` numérico (incl. invitado por enlace personal `/share/:token`) puede abrir **Mi Perfil** (avatar arriba a la derecha).
- **Contraseña:** no se muestra ni se edita en pantalla. Si no hay `clave_acceso` → **Generar y enviar por mail** (crea clave, la guarda y manda template `acceso_clave` mode `generada`). Si ya hay → **Recuperar por mail** (envía la clave actual, mode `recuperada`). Destino: `integrantes.mail` / email de acceso del formulario.
- Login directo: `https://ofrn-web-app.vercel.app/login` (email + contraseña) para ver todas las giras en las que está convocado/a.
- Mail de alta no estable (`convocatoria_gira` / `ALTA_ACCESO_PERSONAL`): explica Mi Perfil + link app general + CTA «Abrir app» al token personal.

---

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
isEditor: true para roles admin, editor o difusion.

isManagement: Permite acceso a vistas de gestión general.

isPersonal: true para músicos y personal que consulta su propia información.

isGuest: Usuarios con acceso limitado o invitados.

5. Funciones Clave
login(email, password): Valida credenciales contra la tabla integrantes.

impersonate(targetUser): Permite a un administrador ver la App como si fuera otro usuario (útil para soporte).