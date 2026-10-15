import React, { useEffect, useRef, useState } from 'react';
import { Text, View, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Header from '../../Library/Components/Header';
const Mapview = ({
    params,
    navigation
}) => {
    const mapRef = useRef()
    // const [latlong, setLatLong] = useState({ lat: "", long: "" })
    useEffect(() => {
        setTimeout(()=>{
            mapRef.current?.forceUpdate()
        },400)
    }, [])
    const lat = navigation.getParam('lat')
    const long = navigation.getParam('long')
    const isAndroid = Platform.OS === "android"
    return (
        <View style={{ flex: 1 }}>
        <Header onGoBack={()=>navigation.goBack()} backBtnVisible />
            {lat && long &&
                <MapView
                    ref={mapRef}
                    style={{ flex: 1 }}
                    region={{
                        latitude: isAndroid? parseFloat(lat) : lat,
                        longitude: isAndroid? parseFloat(long) : long,
                        latitudeDelta: 0.15,
                        longitudeDelta: 0.15,
                    }}
                >
                    <Marker
                        coordinate={{
                            latitude: isAndroid? parseFloat(lat) : lat,
                            longitude: isAndroid? parseFloat(long) : long,
                            latitudeDelta: 0.15,
                            longitudeDelta: 0.15,
                        }}
                    />
                </MapView>}
        </View>
    )
};

export default Mapview;
