import { createAuthClient } from 'better-auth/react';
import { managedAuthClient } from '@runablehq/managed-auth/client';
export const authClient = createAuthClient({
  baseURL: window.location.origin, basePath: '/api/auth',
  plugins: [managedAuthClient({ applicationId: import.meta.env.VITE_APPLICATION_ID, issuer: import.meta.env.VITE_RUNABLE_AUTH_ISSUER })],
});
export async function finishAuthRedirect() {
  const result = await authClient.managedAuth.handleRedirect();
  if (result?.error) sessionStorage.setItem('admin-auth-error', 'No se pudo iniciar sesión. Usa la cuenta de propietario autorizada.');
  if (sessionStorage.getItem('admin-return') && result) {
    sessionStorage.removeItem('admin-return');
    history.replaceState(null, '', '/admin');
  }
}