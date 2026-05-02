import { StyleSheet, ActivityIndicator, StatusBar, TextInput, TouchableOpacity, FlatList, Button} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Location from 'expo-location';
import { setupGeofence } from '@/services/geofencingService';
import { useEffect, useState, useMemo, useCallback, useRef, SetStateAction } from 'react';
import { LocationObject } from 'expo-location';
import MapView, {PROVIDER_GOOGLE, Marker} from 'react-native-maps';
import { LatLng } from 'react-native-maps';
import { debounce } from 'lodash';





export default function Map({onConfirm}: { onConfirm?: (loc: { coords: { lat: number; lng: number }; address: string }) => void }) {



 

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
  const {coords, name} = event.nativeEvent.coordinate;
  if (coords) {
    reverseGeocodeDebounced(coords.latitude, coords.longitude);
    setQuery(name);

  }
};


  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    async function startLocationTracking() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied.');
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

          setSelectedLocation({ latitude: lat, longitude: lng });
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





  const handleSetReminder = async () => {
    if (!selectedLocation) {
      alert('Please select a location on the map first.');
      return;
    }

    try {
      // Start geofencing with 150m radius using our service
      await setupGeofence(
        selectedLocation.latitude,
        selectedLocation.longitude,
        address || 'Designated Area'
      );
      alert('Reminder set successfully! You will be notified when you enter this area.');
      confirmLocation();
    } catch (error) {
      alert('Failed to set reminder. Please try again.');
      console.error(error);
    }
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
          onPoiClick={(e) => {
            const { coordinate, name } = e.nativeEvent;
            reverseGeocodeDebounced(coordinate.latitude, coordinate.longitude);
            setQuery(name);
          }}
          ref={mapRef}
        >
          { selectedLocation != null && (
        <Marker coordinate={selectedLocation}/>
           )}
        </MapView>






      <ThemedView style={styles.addressCard}>
        <ThemedView style={{ flex: 1 }}>
          {loadingAddress ? (
            <ActivityIndicator />
          ) : (
            <>
              <ThemedText style={styles.addressLabel}>Selected address</ThemedText>
              <ThemedText numberOfLines={2} style={styles.addressText}>
                {address}
              </ThemedText>
            </>
          )}
        </ThemedView>



        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleSetReminder}
          disabled={loadingAddress}
        >
          <ThemedText
          style={{ color: '#fff', fontWeight: '600' }}>Set Reminder</ThemedText>
        </TouchableOpacity>
      </ThemedView>


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
  addressCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 20,
    zIndex: 20,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
  },
  addressLabel: { fontSize: 12, color: '#000', backgroundColor: '#fff'},
  addressText: { fontSize: 14, fontWeight: '600', color: '#000', backgroundColor: '#fff'},
  confirmBtn: {
    backgroundColor: '#ff4d4d',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 12,
  },

});