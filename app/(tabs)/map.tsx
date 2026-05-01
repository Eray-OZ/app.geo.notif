import { StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Location from 'expo-location';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { LocationObject } from 'expo-location';
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LatLng } from 'react-native-maps';




export default function Map() {

    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = useMemo ( () => ['25%', '50%', '70%', '100%'], []);





  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);


  const handleMapPress = (event: any) => {
  console.log("Map pressed!"); 
  const coords = event.nativeEvent.coordinate;
  if (coords) {
    console.log("Lat:", coords.latitude);
    console.log("Long:", coords.longitude);
    setSelectedLocation(coords);
  }
};


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





  return (


    <ThemedView className="flex-1 items-center justify-center p-4">

      <StatusBar barStyle="light-content" />
      
      {errorMsg ? (
        <ThemedText>{errorMsg}</ThemedText>
      ) : 
      !location ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) :
      (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: location?.coords.latitude,
            longitude: location?.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation={!!location}
          onPress={handleMapPress}
        >
        <Marker coordinate={selectedLocation!}/>
        </MapView>


        
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
    container: {
    flex: 1,
    backgroundColor: 'grey',
    padding: 24,
  },
  contentContainer: {
    flex: 1,
    padding: 36,
    alignItems: 'center',
  },
});