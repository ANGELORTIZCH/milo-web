// Qué mostrar cuando Supabase regresa aquí desde el enlace del correo.
//
// Supabase (flujo implícito, como la app) confirma el correo y luego manda a
// la Site URL con la sesión en el fragmento: #access_token=…&type=signup.
// Esta página NO usa esa sesión: solo lee el tipo o el error y borra todo de
// la barra de direcciones para que los tokens no queden a la vista ni en el
// historial. Si el enlace venció o ya se usó, llega ?error=…&error_code=….

/** @typedef {'confirmado' | 'recuperacion' | 'vencido' | 'error' | 'inicio'} Estado */

/**
 * @param {string} url La URL completa de la página.
 * @returns {Estado}
 */
export function estadoDesdeUrl(url) {
  const u = new URL(url);
  const datos = new URLSearchParams(u.search);
  for (const [k, v] of new URLSearchParams(u.hash.replace(/^#/, ''))) datos.set(k, v);

  const codigo = datos.get('error_code') ?? '';
  if (datos.has('error') || codigo) {
    // otp_expired: el enlace venció o ya se había usado.
    return codigo === 'otp_expired' ? 'vencido' : 'error';
  }
  const tipo = datos.get('type');
  // Enlace de "¿Olvidaste tu contraseña?" que cayó aquí y no en
  // nueva-contrasena/ (por ejemplo, si esa URL no está en Redirect URLs).
  if (tipo === 'recovery') return 'recuperacion';
  if (tipo === 'signup' || tipo === 'email' || datos.has('access_token')) return 'confirmado';
  return 'inicio';
}

/** ¿La URL trae algo que hay que quitar de la barra de direcciones? */
export function traeDatos(url) {
  const u = new URL(url);
  return u.search !== '' || u.hash !== '';
}
