import { StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Location from 'expo-location';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { LocationObject } from 'expo-location';
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LatLng } from 'react-native-maps';


import Geolocation from 'react-native-geolocation-service';
import { debounce } from 'lodash';





export default function Map() {

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo ( () => ['25%', '50%', '70%', '100%'], []);



  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(location ? location.coords : null);




  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;
  const [address, setAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);



  


  const handleMapPress = async (event: any) => {
  console.log("Map pressed!"); 
  const coords = event.nativeEvent.coordinate;
  if (coords) {
    console.log("Lat:", coords.latitude);
    console.log("Long:", coords.longitude);
    setSelectedLocation(coords);
    reverseGeocodeDebounced(coords.latitude, coords.longitude);
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





   // Debounced reverse geocode (called onRegionChangeComplete)
  const reverseGeocodeDebounced = useCallback(
    debounce(async (lat, lng) => {
      if (!GOOGLE_API_KEY) {
        setAddress('');
        return;
      }
      setLoadingAddress(true);
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`,
        );

        const json = await res.json();
        if (
          json.status === 'OK' &&
          Array.isArray(json.results) &&
          json.results.length > 0
        ) {
          setAddress(json.results[0].formatted_address);
          console.log('Address:', json.results[0].formatted_address);
        } else {
          setAddress('');
        }
      } catch (e) {
        setAddress('');
      } finally {
        setLoadingAddress(false);
      }
    }, 700),
    [],
  );







  



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
          { selectedLocation != null && (
        <Marker coordinate={selectedLocation!}/>
           )}
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