import React, { useEffect, useState, useRef } from 'react';
import { View, FlatList, StyleSheet, ImageBackground } from 'react-native';
import Item from './ScheduleTourRow';
import { getTourCommunities, getCompletedTours } from '../../Library/ServerCalls/API'
import { useDispatch, useSelector } from 'react-redux';
import R from '../../assest/R';
import Singleton from '../../Singleton';
import { setSelectedCommunity } from '../../redux/actions/selectedCommunityAction';
import Spinner from 'react-native-loading-spinner-overlay';
import Text from '../../Components/CustomText';
import Header from '../../Library/Components/Header'
import LoadingIndicator from '../../Components/LoadingIndicator';
const ScheduleTour = ({
  navigation
}) => {
  const [tours, setTours] = useState([])
  const userID = useSelector(state => state.persistReducer?.userID);
  const dispatch = useDispatch()
  const [isLoading, setLoading] = useState(true)

  const page = useRef(1);
  const perPage = 4;

  useEffect(() => {
    // fetchTourCommunities()
    fetchCompletedTours(1)
  }, [])

  const fetchTourCommunities = () => {
    getTourCommunities(userID)
      .then(response => response.json())
      .then((res) => {
        setLoading(false)
        if (res.status) {
          const { completed } = res?.data
          setTours(completed)
        } else {
          console.log("getTourCommunities(id) error", res)
        }
      })
      .catch((error) => {
        setLoading(false)
      })
  }

  const fetchCompletedTours = (currentPage) => {
    setLoading(true)
    getCompletedTours(userID, currentPage, perPage)
      .then(response => response.json())
      .then((res) => {
        const data = res.tours_data
        if (data?.length > 0) {
          setTours((prev) => [...prev, ...data]);
        } else {
          console.log("getTourCommunities(id) error", res)
        }
        setLoading(false)
      })
      .catch((error) => {
        setLoading(false)
      })
  }

  const loadMoreData = () => {
    if (!isLoading && tours.length > 0 && tours.length === (perPage * page.current)) {
      page.current += 1;
      fetchCompletedTours(page.current)
    }
  }


  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.bgContanier}
      imageStyle={{ resizeMode: "stretch" }} >
      <Header title="Saved Tours" onGoBack={() => navigation.goBack()} backBtnVisible />
      {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading} />
      <FlatList
        // style={{flex: 1}}
        contentContainerStyle={styles.listContentContainer}
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Text style={styles.emptyListText}>
              {isLoading ? "" : `Sorry, you don’t have any saved tours! All tours taken with Pynwheel Tour will appear on this page.`}
            </Text>
          </View>}
        data={tours}
        keyExtractor={(item, index) => index + item.community.id}
        onEndReached={loadMoreData}
        renderItem={({ item, index }) => <Item
          onPress={() => {
            Singleton.getInstance().setPropertyId(item?.community?.id)
            dispatch(setSelectedCommunity(item?.community))
            navigation.navigate("Home")
          }}
          item={{
            community: item.community,
            ...item.tour,
            tour_type: item.tour.tour_status
          }}
          isLast={(index + 1) === tours.length}
          onMap={(lat, long) => navigation.navigate("Mapview", { lat, long })}
          onScheduleAnOther={(url) => navigation.navigate("WebView", { applyUnitURL: url, title: "Schedule Tour" })}
          onTourSummary={() => navigation.navigate("SavedTour", { lastRoute: "TourHistory" })}
        />}
      /> 
    </ImageBackground>
  )
};

export default ScheduleTour;
const styles = StyleSheet.create({
  bgContanier: {
    flex: 1,
    // alignItems: 'center',
  },
  listContentContainer: { 
    paddingBottom: 25 
  },
  emptyListContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  emptyListText: { 
    color: "#8d8c8c", 
    textAlign: "center", 
    lineHeight: 20, 
    paddingHorizontal: 10, 
  }
});