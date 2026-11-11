// Lógica de "Crea tu contraseña nueva" (sin interfaz, para probarla con
// node --test). El enlace de "¿Olvidaste tu contraseña?" llega con la sesión
// de recuperación en el fragmento: #access_token=…&type=recovery. Se usa SOLO
// para guardar la contraseña nueva y se borra de la barra de direcciones.

/** Mínimo de la app (core/auth/validaciones.dart). */
export const MINIMO = 8;

/**
 * Qué trae el enlace.
 * @param {string} url
 * @param {Record<string, string>} proyectos URL de Supabase → llave publicable.
 * @param {number} ahora Segundos desde 1970 (para revisar si venció).
 * @returns {{estado: 'formulario', token: string, supabaseUrl: string, llave: string}
 *   | {estado: 'vencido' | 'sinEnlace' | 'error'}}
 */
export function leerEnlace(url, proyectos, ahora = Date.now() / 1000) {
  const u = new URL(url);
  const datos = new URLSearchParams(u.search);
  for (const [k, v] of new URLSearchParams(u.hash.replace(/^#/, ''))) datos.set(k, v);

  const codigo = datos.get('error_code') ?? '';
  if (datos.has('error') || codigo) return { estado: codigo === 'otp_expired' ? 'vencido' : 'error' };

  const token = datos.get('access_token');
  if (!token || datos.get('type') !== 'recovery') return { estado: 'sinEnlace' };

  const datosToken = leerToken(token);
  if (!datosToken) return { estado: 'error' };
  if (typeof datosToken.exp === 'number' && datosToken.exp <= ahora) return { estado: 'vencido' };

  // La URL sale del emisor del token (https://<ref>.supabase.co/auth/v1), pero
  // solo si es uno de nuestros proyectos.
  const supabaseUrl = String(datosToken.iss ?? '').replace(/\/auth\/v1\/?$/, '');
  const llave = Object.hasOwn(proyectos, supabaseUrl) ? proyectos[supabaseUrl] : undefined;
  if (!llave) return { estado: 'error' };
  return { estado: 'formulario', token, supabaseUrl, llave };
}

/** Contenido (payload) de un JWT, o null si no se puede leer. */
export function leerToken(token) {
  try {
    const parte = token.split('.')[1];
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const texto = new TextDecoder().decode(Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0)));
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Mensaje si la contraseña no sirve, o null si está bien. */
export function revisarContrasena(contrasena, repetida) {
  if (contrasena.length < MINIMO) return `La contraseña debe tener al menos ${MINIMO} caracteres.`;
  if (contrasena !== repetida) return 'Las contraseñas no coinciden. Escríbelas igual.';
  return null;
}

/**
 * Guarda la contraseña en Supabase Auth con la sesión de recuperación y
 * luego cierra esa sesión (solo esta; no las de las tablets).
 * @returns {Promise<'listo' | 'vencido' | 'debil' | 'misma' | 'sinInternet' | 'error'>}
 */
export async function guardarContrasena({ supabaseUrl, llave, token, contrasena }, pedir = fetch) {
  const cabeceras = {
    apikey: llave,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  let respuesta;
  try {
    respuesta = await pedir(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: cabeceras,
      body: JSON.stringify({ password: contrasena }),
    });
  } catch {
    return 'sinInternet';
  }
  if (respuesta.ok) {
    try {
      await pedir(`${supabaseUrl}/auth/v1/logout?scope=local`, { method: 'POST', headers: cabeceras });
    } catch {
      // Si no se pudo cerrar, la sesión de recuperación vence sola.
    }
    return 'listo';
  }
  let codigo = '';
  try {
    codigo = (await respuesta.json()).error_code ?? '';
  } catch {
    // Sin cuerpo JSON.
  }
  if (codigo === 'same_password') return 'misma';
  if (codigo === 'weak_password') return 'debil';
  if (respuesta.status === 401 || respuesta.status === 403) return 'vencido';
  if (['session_not_found', 'session_expired', 'bad_jwt'].includes(codigo)) return 'vencido';
  return 'error';
}

/** Texto para el usuario de cada resultado que no es "listo". */
export const mensajes = {
  debil: 'Esa contraseña no se permite. Usa una más larga o menos común.',
  misma: 'Esa es tu contraseña de antes. Escribe una diferente.',
  sinInternet:
    'No hay internet. Lo que escribiste se queda: conéctate a una red y vuelve a tocar "Guardar contraseña".',
  error: 'No se pudo guardar. Intenta de nuevo en un momento.',
};
