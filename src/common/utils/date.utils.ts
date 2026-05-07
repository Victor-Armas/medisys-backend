/**
 * Calcula la edad exacta basándose en la fecha de nacimiento.
 * Compara día y mes con la fecha actual para determinar si ya cumplió años este año.
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  // Si el mes actual es menor al de nacimiento, o si es el mismo mes pero
  // el día actual es menor al de nacimiento, aún no cumple años.
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}
