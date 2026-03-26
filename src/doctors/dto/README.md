Cmd + Shift + V (Mac) para ver en tabla

## DTO Strategy – Doctors Module

| DTO                    | ¿Cuándo se usa? (Caso de Uso)                                                                                | Campos que pide (Estructura)                                    | Lógica Técnica                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| CreateUserDTO          | Registro estándar. Para crear personal administrativo o recepcionistas que no requieren perfil médico.       | Email, Password, Nombre, Rol                                    | Es la base de la cuenta de usuario.                                               |
| CreateDoctorDTO        | Registro **Full**. Cuando das de alta a un doctor desde cero en un solo formulario (Cuenta + Perfil).        | Email, Password, Nombre + Cédula, Especialidad, Dirección, etc. | Es un `IntersectionType`. Une los datos de usuario con los de doctor.             |
| AssignDoctorProfileDTO | Vinculación. Cuando ya existe el usuario en la base de datos y el Admin solo le añade el perfil profesional. | userId + Cédula, Especialidad, Dirección, etc.                  | Extiende la base médica y añade el ID del usuario ya existente.                   |
| UpdateDoctorDTO        | Edición de perfil. Cuando el doctor entra a su configuración para cambiar su dirección o especialidad.       | Cualquier campo médico (todos son opcionales)                   | Es un `PartialType`. Permite cambiar solo lo necesario sin enviar todo el objeto. |
