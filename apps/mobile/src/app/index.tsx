import { Redirect } from 'expo-router';
import { useSession } from '../../lib/auth';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
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
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
