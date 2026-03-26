# 🏥 Módulo de Pacientes (Patients Module)

Este módulo gestiona el ciclo de vida de los pacientes en **Medisys**, desde su auto-registro hasta la gestión de su perfil de salud.

## 📋 Descripción

A diferencia del staff administrativo, los pacientes tienen un punto de entrada público. Este módulo asegura que cualquier persona pueda darse de alta sin intervención manual, pero con un nivel de acceso restringido (`PATIENT`).

## 🛠️ Componentes Clave

- **PatientsController**: Contiene el endpoint público `/register`. No requiere token JWT.
- **RegisterPatientDTO**: Utiliza `OmitType` para heredar las validaciones de `CreateUserDTO` pero eliminando el campo `role` por seguridad.
- **PatientsService**: Gestiona la persistencia en Prisma, asegurando que el usuario nazca con `isActive: true` y rol `PATIENT`.

---

## 🔐 Matriz de Acceso: Pacientes

| Endpoint             | Método | Acceso      | Rol Requerido | Descripción                        |
| :------------------- | :----- | :---------- | :------------ | :--------------------------------- |
| `/patients/register` | `POST` | **Público** | Ninguno       | Auto-registro de nuevos pacientes. |
| `/patients/me`       | `GET`  | Privado     | `PATIENT`     | Ver perfil propio del paciente.    |
