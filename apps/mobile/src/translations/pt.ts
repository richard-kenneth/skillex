/*
 * Mobile translations - Portuguese (Brazil).
 * Structure mirrors en.ts for easy drop-in of translated keys later.
 */
import en from './en';
export default {
  ...(en as any),
  common: { ...(en as any).common, appName: 'Troca de Habilidades' },
  nav: {
    ...(en as any).nav,
    dashboard: 'Painel',
    matches: 'Combinações',
    exchanges: 'Trocas',
    points: 'Pontos',
    profile: 'Perfil',
    notifications: 'Notificações',
    referrals: 'Indicações',
    signIn: 'Entrar',
    signUp: 'Criar conta',
    signOut: 'Sair',
  },
  localeSwitcher: {
    label: 'Idioma',
    en: 'Inglês',
    fr: 'Francês',
    es: 'Espanhol',
    pt: 'Português',
  },
  dashboard: {
    ...(en as any).dashboard,
    title: 'Painel',
    welcomeBack: 'Bem-vindo(a), {name}!',
    description: 'Visão geral da sua atividade',
    quickStats: 'Estatísticas rápidas',
    activeExchanges: 'Trocas ativas',
    completedSessions: 'Sessões concluídas',
    pointsBalance: 'Saldo de pontos',
    pendingRequests: 'Solicitações pendentes',
  },
  matches: {
    ...(en as any).matches,
    title: 'Encontrar combinações',
    description: 'Descubra pessoas com habilidades que você quer aprender.',
  },
  points: {
    ...(en as any).points,
    title: 'Pontos e pagamentos',
    balance: 'Saldo',
    purchase: 'Comprar',
    withdraw: 'Sacar',
    history: 'Histórico',
  },
  onboarding: {
    ...(en as any).onboarding,
    welcomeTitle: 'Bem-vindo ao Skil-Ex, {name}!',
    welcomeDesc: 'Um guia rápido para começar a trocar habilidades.',
    doneTitle: 'Tudo pronto!',
    next: 'Continuar',
    skip: 'Pular por agora',
  },
  referrals: {
    ...(en as any).referrals,
    title: 'Convidar amigos',
    description: 'Ganhe pontos para cada amigo que se cadastrar.',
  },
};
