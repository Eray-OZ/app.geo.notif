import { StyleSheet, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { LocationObject } from 'expo-location';
import MapView from 'react-native-maps';

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;

    async function startLocationTracking() {
      
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Konum izni reddedildi.');
        return; 
      }

      let lastKnownLocation = await Location.getLastKnownPositionAsync();
      if (lastKnownLocation) {
        setLocation(lastKnownLocation);
      }

      let currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(currentLocation);

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced },
        (loc: LocationObject) => {
          setLocation(loc);
        }
      );
    }

    startLocationTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []); 

  console.log('Location:', location);

  return (
    <ThemedView className="flex-1 items-center justify-center p-4">
      
      {errorMsg ? (
        <ThemedText>{errorMsg}</ThemedText>
      ) : 
      !location ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) :
      (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude ?? 37.78825,
            longitude: location?.coords.longitude ?? -122.43245,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={!!location} 
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -30,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
});