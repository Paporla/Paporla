export const ROLES = {
  USER: 'user',
  COMERCIO: 'comercio',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
} as const

export const ROLE_LABELS = {
  user: 'Usuario',
  comercio: 'Comercio',
  admin: 'Administrador',
  super_admin: 'Super Administrador',
}

export const isAdmin = (role: string) => {
  return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN
}
