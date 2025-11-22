import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* This automatically loads index.jsx as the first screen */}
    </Stack>
  );
}