import 'react-native-gesture-handler';

import { colors } from '@/ui/Sheet';
import { useLibrary } from '@/store/library';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import { Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const load = useLibrary((state) => state.load);
  const [loaded, error] = useFonts({
    Fraunces_700Bold,
    Fraunces_600SemiBold,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loaded || error) void SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={styles.stage}>
      <StatusBar style="dark" />
      <View style={styles.device}>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: colors.paper } }} />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: colors.desk },
  device: { flex: 1, width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: colors.paper },
});
