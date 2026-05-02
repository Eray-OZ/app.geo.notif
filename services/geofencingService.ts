import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { createMMKV } from 'react-native-mmkv';

// Initialize MMKV storage
export const storage = createMMKV();
const REMINDERS_KEY = 'user_reminders';

// Reminder interface with 'note' field
export interface Reminder {
  id: string;
  title: string;
  note: string; // User's custom note for the reminder
  latitude: number;
  longitude: number;
  radius: number;
  isActive: boolean;
  createdAt: number;
}

// Storage helpers
export const getStoredReminders = (): Reminder[] => {
  const data = storage.getString(REMINDERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveReminderToStorage = (reminder: Reminder) => {
  const current = getStoredReminders();
  storage.set(REMINDERS_KEY, JSON.stringify([...current, reminder]));
};

// Task and Category Definitions
export const BACKGROUND_GEOFENCING_TASK = 'BACKGROUND_GEOFENCING_TASK';
export const REMINDER_CATEGORY = 'REMINDER_CATEGORY';

// Register notification actions
Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
  {
    identifier: 'DONE',
    buttonTitle: 'Completed',
    options: { opensAppToForeground: false },
  },
  {
    identifier: 'NOT_DONE',
    buttonTitle: 'Not Completed',
    options: { opensAppToForeground: false },
  },
]);

// Define the background processor
TaskManager.defineTask(BACKGROUND_GEOFENCING_TASK, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error('Geofencing Task Error:', error.message);
    return;
  }

  if (eventType === Location.GeofencingEventType.Enter) {
    const { identifier } = region;
    
    // Attempt to find reminder but don't block the notification if not found
    const reminders = getStoredReminders();
    const reminder = reminders.find(r => r.id === identifier);

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder ? `📍 Reached: ${reminder.title}` : '📍 Location Reached',
          body: reminder ? reminder.note : 'You have entered the designated area.',
          categoryIdentifier: REMINDER_CATEGORY,
          data: { reminderId: identifier },
          sound: true,
          ...({ channelId: 'default' } as any),
        } as Notifications.NotificationContentInput,
        trigger: null,
      });
    } catch (err) {
      console.error('Notification Error:', err);
    }
  }
});

// Permission handling
export const requestGeofencingPermissions = async (): Promise<boolean> => {
  try {
    const { status: n } = await Notifications.requestPermissionsAsync();
    const { status: f } = await Location.requestForegroundPermissionsAsync();
    if (f !== 'granted') return false;
    const { status: b } = await Location.requestBackgroundPermissionsAsync();
    return b === 'granted';
  } catch (e) {
    return false;
  }
};

// Geofence activation with custom note
export const setupGeofence = async (
  latitude: number,
  longitude: number,
  title: string,
  note: string
) => {
  const id = Date.now().toString();
  const newReminder: Reminder = {
    id,
    title,
    note,
    latitude,
    longitude,
    radius: 150,
    isActive: true,
    createdAt: Date.now(),
  };

  try {
    saveReminderToStorage(newReminder);
    await Location.startGeofencingAsync(BACKGROUND_GEOFENCING_TASK, [
      {
        identifier: id,
        latitude,
        longitude,
        radius: 150, // Specified radius
        notifyOnEnter: true,
        notifyOnExit: false,
      },
    ]);
    return id;
  } catch (error) {
    console.error('Geofencing Error:', error);
    throw error;
  }
};

// Helper to delete reminder
export const deleteReminderFromStorage = (id: string) => {
  const current = getStoredReminders();
  const updated = current.filter(r => r.id !== id);
  storage.set(REMINDERS_KEY, JSON.stringify(updated));
  // Optionally stop the task if no more reminders exist or specifically for this ID
};

// Helper to update status (called from notification listener or UI)
export const updateReminderStatus = (id: string, isActive: boolean) => {
  const current = getStoredReminders();
  const updated = current.map(r => r.id === id ? { ...r, isActive } : r);
  storage.set(REMINDERS_KEY, JSON.stringify(updated));
};

// Handle notification button interactions
Notifications.addNotificationResponseReceivedListener(response => {
  const { actionIdentifier, notification } = response;
  const reminderId = notification.request.content.data?.reminderId as string;

  if (actionIdentifier === 'DONE' && reminderId) {
    // Set reminder as inactive when "Completed" is pressed
    updateReminderStatus(reminderId, false);
    console.log(`Reminder ${reminderId} marked as completed.`);
  }
});
