/*
 * Mobile translations - Spanish.
 * Placeholder scaffold: structure is 1:1 with en.ts so translators can fill in
 * values progressively. Falls back to English for any missing key at runtime.
 */
import en from './en';
export default {
  ...(en as any),
  common: { ...(en as any).common, appName: 'Intercambio de Habilidades' },
  nav: {
    ...(en as any).nav,
    dashboard: 'Panel',
    matches: 'Coincidencias',
    exchanges: 'Intercambios',
    points: 'Puntos',
    profile: 'Perfil',
    notifications: 'Notificaciones',
    referrals: 'Recomendaciones',
    signIn: 'Iniciar sesión',
    signUp: 'Registrarse',
    signOut: 'Cerrar sesión',
  },
  localeSwitcher: {
    label: 'Idioma',
    en: 'Inglés',
    fr: 'Francés',
    es: 'Español',
    pt: 'Portugués',
  },
  dashboard: {
    ...(en as any).dashboard,
    title: 'Panel',
    welcomeBack: '¡Bienvenido, {name}!',
    description: 'Resumen de tu actividad',
    quickStats: 'Estadísticas rápidas',
    activeExchanges: 'Intercambios activos',
    completedSessions: 'Sesiones completadas',
    pointsBalance: 'Saldo de puntos',
    pendingRequests: 'Solicitudes pendientes',
  },
  matches: {
    ...(en as any).matches,
    title: 'Buscar coincidencias',
    description: 'Encuentra personas con habilidades que quieras aprender',
  },
  points: {
    ...(en as any).points,
    title: 'Puntos y pagos',
    balance: 'Saldo',
    purchase: 'Comprar',
    withdraw: 'Retirar',
    history: 'Historial',
  },
  onboarding: {
    ...(en as any).onboarding,
    welcomeTitle: '¡Bienvenido a Skil-Ex, {name}!',
    welcomeDesc: 'Un recorrido rápido para intercambiar habilidades.',
    doneTitle: '¡Todo listo!',
    next: 'Continuar',
    skip: 'Omitir por ahora',
  },
  referrals: {
    ...(en as any).referrals,
    title: 'Invitar amigos',
    description: 'Gana puntos por cada amigo que se registre.',
  },
};
