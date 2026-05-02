import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import * as Location from 'expo-location/build/Location';
import * as TaskManager from 'expo-task-manager';



Notifications.setNotificationHandler({
  handleNotification: async () : Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,    
    shouldShowList: true,
  }),
});





export const unstable_settings = {
  anchor: '(tabs)',
};



export default function RootLayout() {
  const colorScheme = useColorScheme();


  useEffect(() => {
    const getPermissions = async () : Promise<void> => {
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        console.warn('User denied notification permissions.');
      }

   
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  
      if (foregroundStatus !== 'granted') {
    console.log('Foreground permission denied.');
    return;
  }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();

    if (backgroundStatus === 'granted') {
    console.log('Background permission granted.');
  } else {
    console.log('Background permission denied. Geofencing will not work.');
  }

    };
    void getPermissions();
  }, []);



  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
