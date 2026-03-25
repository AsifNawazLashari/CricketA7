import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { MatchProvider } from '../context/MatchContext';
import { ToastProvider } from '../context/ToastContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <MatchProvider>
        <ToastProvider>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
          </Stack>
        </ToastProvider>
      </MatchProvider>
    </AuthProvider>
  );
}
