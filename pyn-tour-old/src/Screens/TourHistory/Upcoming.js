import React from 'react';
import { View, FlatList } from 'react-native';
import { useDispatch } from 'react-redux';
import { setSelectedCommunity } from '../../redux/actions/selectedCommunityAction';
import Singleton from '../../Singleton';
import Item from './Row';
import Text from '../../Components/CustomText';
const UpcomingTours = ({
  tours,
  navigation
}) => {
  const dispatch = useDispatch()
  return (
    <View style={{ flex: 1 }} >
      {tours.length > 0 ?
        <FlatList
          showsVerticalScrollIndicator={false}
          data={tours}
          keyExtractor={(item, index) => index + ""}
          renderItem={({ item, index }) => <Item
            isUpcoming
            item={item}
            isLast={(index + 1) === tours.length}
            onMap={(lat, long) => {
              navigation.navigate("Mapview", { lat, long })
            }}
            onReschedule={(url) => {
              navigation.navigate("WebView", { applyUnitURL: url, title: "Schedule Tour" })
            }}
            onStartTour={(item) => {
              Singleton.getInstance().setPropertyId(item?.community?.id)
              dispatch(setSelectedCommunity({...item?.community,logo:item?.community?.logo?.url}))
              navigation.navigate("Home")
            }}
          />}
        /> :
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#8d8c8c", textAlign: "center", lineHeight: 20, paddingHorizontal: 15, }}>
            Sorry, you don’t have any upcoming tours! All upcoming tours scheduled with Pynwheel Tour will appear on this page.
          </Text>
        </View>
      }
    </View>
  )
};

export default UpcomingTours;
