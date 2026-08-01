import { Redirect } from 'expo-router';
import { useSession } from '../../lib/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export default function Index() {
  const { data: session, isPending } = useSession();
  const theme = useTheme();

  if (isPending) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.mutedForeground} />
      </View>
    );
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
