// Proyectos de Supabase a los que esta página puede mandar la contraseña
// nueva, con su llave PUBLICABLE (es pública por diseño; nunca una secreta).
//
// La URL de Supabase sale del token del enlace, pero solo se acepta si está
// aquí: así un enlace alterado no puede hacer que la contraseña se mande a
// otro servidor. Al crear producción (paso 9, parte 2) se agrega su línea.
export const proyectos = {
  // Desarrollo
  'https://huwlylqaqcnzoeuaxxgu.supabase.co': 'sb_publishable_f3n-Fh9_9vG34e26SJKJaA_SWJQLXGR',
};
