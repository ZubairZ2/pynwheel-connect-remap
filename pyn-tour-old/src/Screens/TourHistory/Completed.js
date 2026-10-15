import React from 'react';
import { View, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import Singleton from '../../Singleton';
import Item from './Row';
import Text from '../../Components/CustomText';
const CompleetedTours = ({
  tours,
  navigation
}) => {
  const userID = useSelector(state => state.persistReducer?.userID);
  return (
    <View style={{ flex: 1 }} >
      {tours.length > 0 ?
        <FlatList
          showsVerticalScrollIndicator={false}
          data={tours}
          keyExtractor={(item, index) => index + ""}
          renderItem={({ item, index }) => <Item
            isCompleted
            item={item}
            isLast={(index + 1) === tours.length}
            onMap={(lat, long) => {
              navigation.navigate("Mapview", { lat, long })
            }}
            onScheduleAnOther={(url) => {
              navigation.navigate("WebView", { applyUnitURL: url, title: "Schedule Tour" })
            }}
            onTourSummary={() => {
              Singleton.getInstance().setTourUserId(userID)
              Singleton.getInstance().setPropertyId(item?.community?.id)
              navigation.navigate("SavedTour", { lastRoute: "TourHistory" })
            }}
          />}
        /> :
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#8d8c8c", textAlign: "center", lineHeight: 20, paddingHorizontal: 15, }}>
            Sorry, you don’t have any completed tours! All scheduled tours taken with Pynwheel Tour will appear on this page.
          </Text>
        </View>
      }
    </View>
  )
};

export default CompleetedTours;
