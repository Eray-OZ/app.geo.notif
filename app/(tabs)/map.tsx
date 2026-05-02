import { StyleSheet, ActivityIndicator, StatusBar, TextInput, TouchableOpacity, FlatList} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Location from 'expo-location';
import { useEffect, useState, useMemo, useCallback, useRef, SetStateAction } from 'react';
import { LocationObject } from 'expo-location';
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { LatLng } from 'react-native-maps';


import Geolocation from 'react-native-geolocation-service';
import { debounce } from 'lodash';





export default function Map({onConfirm}: { onConfirm?: (loc: { coords: { lat: number; lng: number }; address: string }) => void }) {

  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo ( () => ['25%', '50%', '70%', '100%'], []);



  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(location ? location.coords : null);




  interface PlacePrediction {
  description: string;
  place_id: string;
}

  const mapRef = useRef<MapView | null>(null);
  const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;
  const [address, setAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]); 
  const [region, setRegion] = useState({
    latitude: location?.coords.latitude,
    longitude: location?.coords.longitude,
    latitudeDelta: 0.012,
    longitudeDelta: 0.012,
  });

  


  const handleMapPress = async (event: any) => {
  console.log("Map pressed!"); 
  const coords = event.nativeEvent.coordinate;
  if (coords) {
    console.log("Lat:", coords.latitude);
    console.log("Long:", coords.longitude);
    setSelectedLocation(coords);  }
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







   // Places autocomplete
  const fetchAutocomplete = debounce(async (text) => {
    if (!text || !GOOGLE_API_KEY) {
      setPredictions([]);
      return;
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        text,
      )}&key=${GOOGLE_API_KEY}&components=country:tr&language=en`;
      const r = await fetch(url);
      const j = await r.json();
      if (j.status === 'OK' && Array.isArray(j.predictions))
        setPredictions(j.predictions);
      else setPredictions([]);
    } catch (e) {
      setPredictions([]);
    }
  }, 300);
  const onSelectPrediction = async (place: { description: SetStateAction<string>; place_id: any; }) => {
    setQuery(place.description);
    setPredictions([]);
    if (!GOOGLE_API_KEY) return;
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&key=${GOOGLE_API_KEY}`;
      const r = await fetch(detailsUrl);
      const j = await r.json();
      if (j.status === 'OK' && j.result?.geometry?.location) {
        const loc = j.result.geometry.location;
        const rgn = { ...region, latitude: loc.lat, longitude: loc.lng };
        setRegion(rgn);
        mapRef.current?.animateToRegion(rgn, 300);
        reverseGeocodeDebounced(loc.lat, loc.lng);
      } else {
        console.warn('place details error:', j.status, j.error_message);
      }
    } catch (e) {
      console.warn('place details fetch failed', e);
    }
  };
  const confirmLocation = () => {
    onConfirm &&
      onConfirm({
        coords: { lat: region.latitude ?? 0, lng: region.longitude ?? 0},
        address,
      });
  };

  



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


        <ThemedView style={{ top:30}}>
          <ThemedView style={styles.searchRow}>
          <TextInput
          placeholder="Search for area or address"
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            fetchAutocomplete(t);
          }}
        />
        </ThemedView>



        {predictions.length > 0 && (
        <ThemedView style={styles.suggestions}>
          <FlatList
            keyboardShouldPersistTaps="always"
            data={predictions}
            keyExtractor={(i) => i.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => onSelectPrediction(item)}
              >
                <ThemedText style={{ color: '#000' }} numberOfLines={1}>
                  {item.description}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
        </ThemedView>
      )}

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


        </ThemedView>
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
    searchRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    elevation: 6,
  },
    suggestions: {
    position: 'absolute',
    top: 64,
    left: 12,
    right: 12,
    backgroundColor: '#fff',
    maxHeight: 200,
    zIndex: 30,
    borderRadius: 8,
    elevation: 8,
  },
  suggestionItem: { padding: 12, borderBottomWidth: 0.5, borderColor: '#fff'},

});