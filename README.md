# MediSys Backend

API backend de MediSys, una plataforma de gestión médica orientada a centralizar procesos clínicos y administrativos.

El backend expone servicios REST para autenticación, usuarios, pacientes, citas, consultas, recetas y gestión de archivos, manteniendo separadas las reglas de negocio, acceso a datos y validaciones.

## Funcionalidades principales

- API REST para los módulos principales de MediSys.
- Autenticación con JWT.
- Control de acceso por roles.
- Gestión de pacientes, citas y consultas.
- Generación y manejo de recetas y documentos.
- Carga y gestión de archivos.
- Validación de datos y manejo estructurado de errores.
- Documentación de endpoints con Swagger.

## Tecnologías

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- JWT / Passport
- Swagger
- Cloudinary
- Jest

## Arquitectura

La aplicación está organizada por módulos y servicios para mantener separadas las responsabilidades de autenticación, lógica de negocio, persistencia y exposición de endpoints.

La capa de datos utiliza Prisma sobre PostgreSQL y el frontend se mantiene en un repositorio independiente.

Frontend del proyecto: https://github.com/Victor-Armas/medisys-frontend

Las credenciales y configuraciones sensibles se gestionan mediante variables de entorno y no se documentan en este README.