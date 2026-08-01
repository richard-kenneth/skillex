import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { Collapsible } from '@/components/ui/collapsible';
import { SPACING, MAX_CONTENT_WIDTH, RADIUS } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabTwoScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + 60 + SPACING[3],
  };
  const theme = useTheme();

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: SPACING[6],
      paddingBottom: SPACING[4],
    },
  });

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <ThemedText type="screenTitle">Explore</ThemedText>
          <ThemedText type="bodySmall" muted style={styles.centerText}>
            This starter app includes example{'\n'}code to help you get started.
          </ThemedText>

          <ExternalLink href="https://docs.expo.dev/router/introduction">
            <View style={[styles.linkButton, { backgroundColor: theme.secondary }]}>
              <ThemedText type="label">Learn more</ThemedText>
              <SymbolView
                name="chevron.right"
                size={12}
                weight="medium"
                tintColor={theme.foreground}
              />
            </View>
          </ExternalLink>
        </View>

        <View style={styles.sectionsWrapper}>
          <Collapsible title="File-based routing">
            <ThemedText type="body">
              This app has two screens:{' '}
              <ThemedText type="label">app/(tabs)/index.tsx</ThemedText> and{' '}
              <ThemedText type="label">app/(tabs)/explore.tsx</ThemedText>
            </ThemedText>
            <ThemedText type="body" style={{ marginTop: 8 }}>
              The layout file in <ThemedText type="label">app/(tabs)/_layout.tsx</ThemedText>{' '}
              sets up the tab navigator.
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/router/introduction">
              <ThemedText type="label" style={{ marginTop: 8 }}>Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Android, iOS, and web support">
            <ThemedText type="body">
              You can open this project on Android, iOS, and the web. To open the web version, press{' '}
              <ThemedText type="label">w</ThemedText> in the terminal running this project.
            </ThemedText>
          </Collapsible>

          <Collapsible title="Images">
            <ThemedText type="body">
              For static images, you can use the <ThemedText type="label">@2x</ThemedText> and{' '}
              <ThemedText type="label">@3x</ThemedText> suffixes to provide files for
              different screen densities.
            </ThemedText>
            {/* <Image
              source={require('@/assets/images/react-logo.png')}
              style={styles.imageReact}
            /> */}
            <ExternalLink href="https://docs.expo.dev/development/introduction/">
              <ThemedText type="label" style={{ marginTop: 8 }}>Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Custom fonts">
            <ThemedText type="body">
              Open <ThemedText type="label">app/_layout.tsx</ThemedText> to see how to load{' '}
              <ThemedText type="body">custom fonts such as Inter.</ThemedText>
            </ThemedText>
            <ExternalLink href="https://docs.expo.dev/versions/latest/sdk/font">
              <ThemedText type="label" style={{ marginTop: 8 }}>Learn more</ThemedText>
            </ExternalLink>
          </Collapsible>

          <Collapsible title="Light and dark mode components">
            <ThemedText type="body">
              This template has light and dark mode support. The{' '}
              <ThemedText type="label">useTheme</ThemedText> hook lets you inspect
              the current theme mode and access themed colors.
            </ThemedText>
          </Collapsible>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MAX_CONTENT_WIDTH,
    flexGrow: 1,
  },
  titleContainer: {
    gap: SPACING[3],
    alignItems: 'center',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[6],
  },
  centerText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  linkButton: {
    flexDirection: 'row',
    paddingHorizontal: SPACING[4],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    gap: SPACING[1],
    alignItems: 'center',
  },
  sectionsWrapper: {
    gap: SPACING[5],
    paddingHorizontal: SPACING[4],
    paddingTop: SPACING[3],
  },
  imageReact: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: SPACING[3],
  },
});
