import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

// 1. Task Name Definition (Must be consistent)
export const BACKGROUND_GEOFENCING_TASK = 'BACKGROUND_GEOFENCING_TASK';

// 2. Define the Background Task
// This block runs when the OS detects a geofence event even if the app is closed.
TaskManager.defineTask(BACKGROUND_GEOFENCING_TASK, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error('Geofencing Task Error:', error.message);
    return;
  }

  // Triggered when entering the specified region
  if (eventType === Location.GeofencingEventType.Enter) {
    const { identifier } = region;

    try {
      // Send a local notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📍 Location Reached',
          body: identifier || 'You have entered the designated area.',
          sound: true,
        },
        trigger: null,
      });

      // Requirement: Stop and clear this specific geofence after notification
      await Location.stopGeofencingAsync(BACKGROUND_GEOFENCING_TASK);
      console.log(`Geofence cleared for: ${identifier}`);

    } catch (err) {
      console.error('Notification or cleanup error:', err);
    }
  }
});

// 3. Sequential Permission Request
// Requests Foreground first, then Background as required by Expo/OS.
export const requestGeofencingPermissions = async (): Promise<boolean> => {
  try {
    const { status: notificationStatus } = await Notifications.requestPermissionsAsync();

    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      alert('Foreground location permission is required.');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus !== 'granted') {
      alert('Background location permission is required for Geofencing.');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Permission error:', error);
    return false;
  }
};

// 4. Start Geofencing Function
// Configured with 150m radius and High Accuracy
export const setupGeofence = async (
  latitude: number,
  longitude: number,
  identifier: string
) => {
  try {
    await Location.startGeofencingAsync(BACKGROUND_GEOFENCING_TASK, [
      {
        identifier,
        latitude,
        longitude,
        radius: 150, // Specified radius
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);
    return true;
  } catch (error) {
    console.error('Failed to start geofencing:', error);
    throw error;
  }
};
