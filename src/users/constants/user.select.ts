export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  middleName: true,
  lastNamePaternal: true,
  lastNameMaternal: true,
  role: true,
  phone: true,
  photoUrl: true,
  isActive: true,
  mustChangePassword: true, // ← nuevo
  passwordChangedAt: true, // ← nuevo (auditoría)
  createdAt: true,
} as const;
