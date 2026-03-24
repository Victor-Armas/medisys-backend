# medisys-backend

API REST para sistema de gestión de consultorio médico, construida con NestJS 11, Prisma 7 y PostgreSQL. Arquitectura modular preparada para multi-consultorio y expansión futura a app móvil.

---

## Stack tecnológico

| Capa          | Tecnología                          |
| ------------- | ----------------------------------- |
| Framework     | NestJS 11                           |
| ORM           | Prisma 7                            |
| Base de datos | PostgreSQL                          |
| Autenticación | JWT + Passport                      |
| Validación    | class-validator / class-transformer |
| Hashing       | bcryptjs                            |
| Runtime       | Node.js                             |

---

## Requisitos previos

- Node.js 20+
- PostgreSQL corriendo localmente o en Railway/Render
- Variables de entorno configuradas (ver sección `.env`)

---

## Instalación

```bash
npm install
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/medisys"
JWT_SECRET="tu_secreto_muy_largo_y_seguro"
JWT_EXPIRES_IN="7d"
PORT=3001
```

---

## Comandos disponibles

```bash
# Desarrollo con hot reload
npm run start:dev

# Producción
npm run build
npm run start:prod

# Generar cliente de Prisma
npx prisma generate

# Correr migraciones
npx prisma migrate dev

# Poblar base de datos con usuario inicial
npx prisma migrate dev --seed

# Abrir Prisma Studio (explorador visual de BD)
npx prisma studio

# Linting
npm run lint

# Formateo de código
npm run format
```

---

## Estructura del proyecto

```
medisys-backend/
├── prisma/
│   ├── migrations/          # Historial de migraciones SQL
│   ├── schema.prisma        # Modelos de base de datos
│   └── seed.ts              # Usuario inicial para desarrollo
├── src/
│   ├── auth/
│   │   ├── dto/             # Validación de datos de entrada
│   │   ├── guards/          # JwtAuthGuard
│   │   ├── strategies/      # JwtStrategy (Passport)
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── prisma/              # PrismaModule global + PrismaService
│   ├── users/               # UsersModule + UsersService
│   ├── app.module.ts        # Módulo raíz
│   └── main.ts              # Bootstrap + configuración global
├── prisma.config.ts         # Configuración de Prisma 7
├── tsconfig.json
└── package.json
```

---

## Módulos implementados

### Auth (`/api/auth`)

Autenticación basada en JWT con control de acceso por roles.

| Método | Endpoint          | Acceso        | Descripción                           |
| ------ | ----------------- | ------------- | ------------------------------------- |
| POST   | `/api/auth/login` | Público       | Login con email y password            |
| GET    | `/api/auth/me`    | JWT requerido | Retorna datos del usuario autenticado |

### Users

Servicio interno. Expone `findByEmail()` y `create()` para uso de otros módulos. No tiene controller propio aún.

---

## Roles del sistema

| Rol                 | Descripción                                |
| ------------------- | ------------------------------------------ |
| `ADMIN_SISTEMA`     | Administrador global de la plataforma      |
| `ADMIN_CONSULTORIO` | Administrador de un consultorio específico |
| `DOCTOR`            | Médico — acceso a expedientes y recetas    |
| `RECEPCIONISTA`     | Gestión de citas y pacientes               |

---

## Decisiones técnicas importantes

**Prisma 7 con adapter-pg**
Prisma 7 requiere pasar el adapter explícitamente en el constructor. El cliente se genera en `generated/prisma/` (no en `node_modules`). PrismaService usa `super({ adapter })`.

**PrismaModule global**
Decorado con `@Global()` para que `PrismaService` esté disponible en todos los módulos sin importarlo individualmente.

**Path aliases en runtime**
Los alias `@auth/*`, `@users/*` definidos en `tsconfig.json` no funcionan en runtime con CommonJS. Los imports usan rutas relativas directas. El alias `@prisma-client` solo funciona en el seed con `tsx`.

**Seed con tsx**
El cliente generado de Prisma 7 es ESM. Para correr el seed fuera de NestJS se usa `tsx` en lugar de `ts-node`.

---

## Usuario de prueba (seed)

```
Email:    doctor@clinica.mx
Password: Admin1234!
Rol:      DOCTOR
```

---

## Módulos planificados (roadmap)

- [ ] Usuarios — CRUD completo con control por roles
- [ ] Pacientes
- [ ] Citas médicas
- [ ] Expediente clínico
- [ ] Recetas médicas PDF (React PDF + Cloudinary)
- [ ] Multi-consultorio
- [ ] Refresh tokens
- [ ] Portal paciente (futuro)
- [ ] Laboratorio clínico (futuro)

---

## Hosting recomendado

| Servicio         | Plataforma                     |
| ---------------- | ------------------------------ |
| Backend API      | Railway o Render               |
| Base de datos    | PostgreSQL en Railway o Render |
| Archivos médicos | Cloudinary                     |
| Frontend         | Vercel                         |
