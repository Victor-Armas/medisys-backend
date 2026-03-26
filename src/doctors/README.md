# 👨‍⚕️ Módulo de Doctores (Doctors Module)

Este módulo orquestra la información profesional de los médicos y su relación con el sistema de gestión de la clínica.

## 📋 Descripción

Separa la cuenta de usuario básica de los detalles profesionales (cédula, especialidad, consultorio). La creación de doctores está centralizada para asegurar que solo personal verificado sea dado de alta.

## 🛠️ Componentes Clave

- **DoctorsController**: Gestiona la búsqueda (pública/interna) y la creación (administrativa).
- **DoctorsService**: Implementa lógica de negocio para vincular `User` con `DoctorProfile`.
- **AssignDoctorProfileDTO**: Permite actualizar o completar perfiles médicos de usuarios existentes.

---

## 🔐 Matriz de Acceso: Doctores

| Endpoint          | Método | Acceso  | Roles Permitidos              | Propósito                              |
| :---------------- | :----- | :------ | :---------------------------- | :------------------------------------- |
| `/doctors`        | `GET`  | Privado | Todos los roles               | Listado de médicos para agendar citas. |
| `/doctors/:id`    | `GET`  | Privado | Todos los roles               | Ver perfil detallado de un médico.     |
| `/doctors`        | `POST` | Privado | `ADMIN_SYSTEM`, `MAIN_DOCTOR` | Crear un doctor desde cero.            |
| `/doctors/assign` | `POST` | Privado | `ADMIN_SYSTEM`, `MAIN_DOCTOR` | Vincular perfil médico a usuario.      |
