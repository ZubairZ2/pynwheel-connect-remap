import React, { useEffect, useState } from 'react';
import { ImageBackground, useWindowDimensions, Dimensions, View, TouchableOpacity, Image } from 'react-native';
import Spinner from 'react-native-loading-spinner-overlay';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { useSelector } from 'react-redux';
import R from '../../assest/R';
import Text from '../../Components/CustomText';
import { getTourCommunities } from '../../Library/ServerCalls/API';
import CompleetedTours from './Completed';
import ExpiredTours from './Expired';
import styles from './style'
import UpcomingTours from './Upcoming';
import Header from '../../Library/Components/Header';
import { resetNavigate } from '../../Utils/Helpers';
import LoadingIndicator from '../../Components/LoadingIndicator';

const TITLES = ["Upcoming Tours", "Completed Tours", "Missed Tours"]
const TourHistory = ({
  navigation
}) => {
  const [types, setTypes] = useState({ upcoming: [], completed: [], exipred: [] })
  const userID = useSelector(state => state.persistReducer?.userID);
  const [isLoading, setLoading] = useState(true)
  const [screenTitle, setTitle] = useState(TITLES[0])
  const [index, setIndex] = React.useState(0);

  useEffect(() => {
    getTourCommunities(userID)
      .then(response => response.json())
      .then((res) => {
        setLoading(false)
        if (res.status) {
          const { upcoming, exipred, completed } = res?.data
          setTypes({
            completed,
            exipred,
            upcoming
          })
        } else {
          alert("Server error")
        }
      })
      .catch((error) => {
        setLoading(false)
      })
  }, [])
  TourHistory.navigationOptions = ({ navigation }) => {
    return {
      title: navigation.getParam("title") || "Upcoming Tours"
    }
  }
  const onScheduleTour = () => {
    navigation.navigate("Welcome", { lastScreen: "TourHistory" })
  }

  const UpcomingRoute = () => (
    <UpcomingTours tours={types.upcoming} navigation={navigation} />
  );
  const CompletedRoute = () => (
    <CompleetedTours tours={types.completed} navigation={navigation} />
  );
  const ExpiredRoute = () => (
    <ExpiredTours tours={types.exipred} navigation={navigation} />
  );


  const renderScene = SceneMap({
    upcoming: UpcomingRoute,
    completed: CompletedRoute,
    expired: ExpiredRoute,
  });
  const [routes] = React.useState([
    { key: 'upcoming', title: 'UPCOMING' },
    { key: 'completed', title: 'COMPLETED' },
    { key: 'expired', title: 'EXPIRED' },
  ]);
  const layout = useWindowDimensions();
  const renderTabBar = props => {
    return (
      <TabBar
        {...props}
        renderIndicator={() => null}
        renderLabel={({ color, focused, route }) => {
          return (<Text style={{
            padding: 3,
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 13,
            width: Dimensions.get("screen").width / 3.8,
            paddingVertical: 13,
            backgroundColor: focused ? "#bababa" : 'transparent',
            color: focused ? "#000" : "#bababa"
          }}>
            {route.title}
          </Text>)
        }}
        style={{ backgroundColor: 'transparent' }}
      />
    )
  };
  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header onGoBack={() => (resetNavigate(navigation,"WelcomeTour"))} backBtnVisible title={TITLES[index]} />
      {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading} />
      <TabView
        showPageIndicator={false}
        tabBarPosition='bottom'
        navigationState={{ index, routes }}
        renderScene={renderScene}
        renderTabBar={renderTabBar}
        onIndexChange={(index) => {setIndex(index)}}
        initialLayout={{ width: layout.width }}
      />
      {/* <View style={styles.floatingBtn}>
        <TouchableOpacity
          onPress={onScheduleTour}
          style={styles.floatingBtnSub}>
          <Image source={R.images.plus} style={{ width: 30, height: 30, resizeMode: "contain" }} />
          <Text style={styles.floatingBtnTxt}>SCHEDULE TOUR</Text>
        </TouchableOpacity>
      </View> */}
    </ImageBackground>
  );
}

export default TourHistory;
