import React from 'react';
import { View, FlatList } from 'react-native';
import Item from './Row';
import Text from '../../Components/CustomText';
const ExpiredTours = ({
  tours,
  navigation
}) => (
  <View style={{ flex: 1 }} >
    {tours.length > 0 ?
      <FlatList
        showsVerticalScrollIndicator={false}
        data={tours}
        keyExtractor={(item, index) => index + ""}
        renderItem={({ item, index }) => <Item
          item={item}
          isExpired
          isLast={(index + 1) === tours.length}
          onMap={(lat, long) => {
            navigation.navigate("Mapview", { lat, long })
          }}
          onReschedule={(url) => {
            navigation.navigate("WebView", { applyUnitURL: url, title: "Schedule Tour" })
          }}
          onTourSummary={() => {
            navigation.navigate("SavedTour", { lastRoute: "TourHistory" })
          }}
        />}
      /> :
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8d8c8c", textAlign: "center", lineHeight: 20, paddingHorizontal: 15, }}>You don’t have any missed tours! This page will list any tour appointments with Pynwheel Tour that were scheduled and not conducted.</Text>
      </View>
    }
  </View>
);

export default ExpiredTours;
