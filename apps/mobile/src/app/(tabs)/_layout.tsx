import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, Users, RefreshCw, Coins, User } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';
import { RADIUS, SPACING, ICON_SIZE } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from 'lib/i18n';
import { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT('nav');

  const icons: Record<string, (props: { color: string; size: number }) => React.ReactNode> = {
    index: (props) => <LayoutDashboard {...props} />,
    matches: (props) => <Users {...props} />,
    exchanges: (props) => <RefreshCw {...props} />,
    points: (props) => <Coins {...props} />,
    profile: (props) => <User {...props} />,
  };

  const labels: Record<string, string> = {
    index: t('dashboard'),
    matches: t('matches'),
    exchanges: t('exchanges'),
    points: t('points'),
    profile: t('profile'),
  };

  return (
    <View
      style={[
        styles.tabBarWrapper,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.background,
          borderTopColor: theme.border,
        },
      ]}
    >
      <View style={styles.tabBarContainer}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const IconComponent = icons[route.name] ?? icons.index;
          const label = labels[route.name] || options.title || route.name;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              {IconComponent({
                color: isFocused ? theme.foreground : theme.mutedForeground,
                size: ICON_SIZE.lg,
              })}

              <ThemedText
                type="badge"
                style={{
                  color: isFocused ? theme.foreground : theme.mutedForeground,
                  fontWeight: isFocused ? '600' : '400',
                  marginTop: 2,
                }}
                numberOfLines={1}
              >
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const t = useT('nav');
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: t('dashboard') }} />
      <Tabs.Screen name="matches" options={{ title: t('matches') }} />
      <Tabs.Screen name="exchanges" options={{ title: t('exchanges') }} />
      <Tabs.Screen name="points" options={{ title: t('points') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING[2],
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
});
