/*
 * Mobile translations - French.
 * Structure mirrors en.ts for easy drop-in of translated keys later.
 */
import en from './en';
export default {
  ...(en as any),
  common: { ...(en as any).common, appName: "Échange de Compétences" },
  nav: {
    ...(en as any).nav,
    dashboard: 'Tableau de bord',
    matches: 'Correspondances',
    exchanges: 'Échanges',
    points: 'Points',
    profile: 'Profil',
    notifications: 'Notifications',
    referrals: 'Parrainages',
    signIn: 'Se connecter',
    signUp: "S'inscrire",
    signOut: 'Se déconnecter',
  },
  localeSwitcher: {
    label: 'Langue',
    en: 'Anglais',
    fr: 'Français',
    es: 'Espagnol',
    pt: 'Portugais',
  },
  dashboard: {
    ...(en as any).dashboard,
    title: 'Tableau de bord',
    welcomeBack: 'Bienvenue, {name} !',
    description: 'Aperçu de votre activité',
    quickStats: 'Statistiques rapides',
    activeExchanges: 'Échanges actifs',
    completedSessions: 'Sessions terminées',
    pointsBalance: 'Solde de points',
    pendingRequests: 'Demandes en attente',
  },
  matches: {
    ...(en as any).matches,
    title: 'Trouver des correspondances',
    description: 'Découvrez des personnes qui maîtrisent ce que vous voulez apprendre.',
  },
  points: {
    ...(en as any).points,
    title: 'Points et paiements',
    balance: 'Solde',
    purchase: 'Acheter',
    withdraw: 'Retirer',
    history: 'Historique',
  },
  onboarding: {
    ...(en as any).onboarding,
    welcomeTitle: 'Bienvenue sur Skil-Ex, {name} !',
    welcomeDesc: 'Une visite rapide pour commencer à échanger.',
    doneTitle: 'Tout est prêt !',
    next: 'Continuer',
    skip: 'Ignorer',
  },
  referrals: {
    ...(en as any).referrals,
    title: 'Inviter des amis',
    description: 'Gagnez des points pour chaque ami qui s\'inscrit.',
  },
};
