import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useColorScheme, ActivityIndicator, View } from 'react-native';
import { ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { useAuthStore } from '../state/useAuthStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAppGroup = segments[0] === '(app)';

    if (!isAuthenticated && inAppGroup) {
      // Force redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (isAuthenticated && !inAppGroup) {
      // Force redirect to app index (Timeline) if authenticated
      router.replace('/(app)');
    }
  }, [isAuthenticated, segments, isLoading]);

  if (isLoading) {
    const bgColor = colorScheme === 'dark' ? '#111827' : '#F3F4F6';
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}


