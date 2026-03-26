export const ValidationMessages = {
  // Mensajes generales
  IS_NOT_EMPTY: 'Este campo es obligatorio',
  IS_STRING: 'Este campo debe ser texto',
  IS_EMAIL: 'El email no tiene un formato válido',
  MIN_LENGTH: (min: number) => `Debe tener al menos ${min} caracteres`,
  IS_UUID: 'El ID no es válido',
  IS_ARRAY: 'Debe enviarse como un arreglo',
  IS_ENUM: 'El valor seleccionado no es válido',

  // Mensajes específicos de Doctor
  ADDRESS_REQUIRED: 'La Calle es obligatoria',
  NUMHOME_REQUIRED: 'El numero de casa es obligatorio',
  COLONY_REQUIRED: 'La colonia es obligatorio',
  CITY_REQUIRED: 'La ciudad es obligatoria',
  STATE_REQUIRED: 'El estado es obligatorio',
  ZIP_CODE_REQUIRED: 'El código postal es obligatorio',
  PROFESSIONAL_LICENSE_REQUIRED: 'La cédula profesional es obligatoria',

  // Mensajes para clinicIds
  CLINIC_IDS_ARRAY: 'Los consultorios deben enviarse como un array',
  CLINIC_IDS_INVALID: 'Uno o más consultorios tienen un ID inválido',
  AT_LEAST_ONE_CLINIC: 'Debe seleccionar al menos un consultorio',

  //Inputs Comunes
  FIRSTNAME_REQUIRED: 'El primer nombre es obligatorio',
  LASTNAMEPATERNAL_REQUIRED: 'El primer nombre es obligatorio',
  LASTNAMEMATERNAL_REQUIRED: 'El primer nombre es obligatorio',

  // Firma
  SIGNATURE_URL: 'La firma debe ser una URL válida',
} as const;
