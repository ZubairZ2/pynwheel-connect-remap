
import ImageView from "react-native-image-progress";
import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from 'react-redux';
import Spinner from "react-native-loading-spinner-overlay";
import { View, Text, Platform, ActivityIndicator, ImageBackground, FlatList, TouchableOpacity, Image, Alert } from "react-native";

import { getFloorPlansForEditTour } from "../../../Library/ServerCalls/API"
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Dialog, { SlideAnimation, DialogContent, DialogTitle, DialogFooter, DialogButton, } from 'react-native-popup-dialog';
import RadioForm, { RadioButton, RadioButtonInput, RadioButtonLabel } from 'react-native-simple-radio-button';
import Gallery from 'react-native-image-gallery';
import Carousel, { Pagination } from 'react-native-snap-carousel';

import styles from "./styles";
import R from "../../../assest/R";
import Singleton from "../../../Singleton";
import CopyRight from "../../../Library/Components/Copyright"
import * as Constants from '../../../Utils/Constants'
import Header from '../../../Library/Components/Header'
import { ImageGallery } from '@georstat/react-native-image-gallery';
import Icon from "react-native-vector-icons/FontAwesome";
import LoadingIndicator from "../../../Components/LoadingIndicator";

var radio_props = [
  { label: 'Price: Low to High', value: 0, valueStr: "price_asc" },
  { label: 'Price: High to Low', value: 1, valueStr: "price_desc" },
  { label: 'Floors: Top to Bottom', value: 2, valueStr: "floors_desc" },
  { label: 'Floors: Bottom to Top', value: 3, valueStr: "floors_asc" },
  { label: 'Sq ft More to Less', value: 4, valueStr: "sq_ft_desc" },
  { label: 'Sq ft Less to More', value: 5, valueStr: "sq_ft_asc" },
];

var radio_props_forSitemap = [
  { label: 'Price: Low to High', value: 0, valueStr: "price_asc" },
  { label: 'Price: High to Low', value: 1, valueStr: "price_desc" },
  { label: 'Sq ft More to Less', value: 2, valueStr: "sq_ft_desc" },
  { label: 'Sq ft Less to More', value: 3, valueStr: "sq_ft_asc" },
];

const FloorPlatListScreen = ({ navigation }) => {

  const [isLoading, setIsLoading] = useState(true)
  const bedroomFilter = useRef("any");
  const radioValueStr = useRef("price_asc")
  const offset = useRef(1);
  const perPage = useRef(4);

  const [floorPlanList, setFloorPlanList] = useState([]);
  const [radioPropsFinal, setradioPropsFinal] = useState(Singleton.getInstance().getIsSitemap() === false ? radio_props : radio_props_forSitemap);
  const [floorPlanGellry, setfloorPlanGellrys] = useState([]);
  const [floorPlanName, setfloorPlanName] = useState("");
  const [radiuSelectedValue, setradiuSelectedValue] = useState(0);
  const [isModalVisible, setisModalVisible] = useState(false)
  const [isGalleyModelVisible, setisGalleyModelVisible] = useState(false)
  const [showLoadMoreButton, setshowLoadMoreButton] = useState(false)
  const [categroy, updateCategory] = useState(Singleton.getInstance().getBedroomFilter());
  const [activeSlide, setactiveSlide] = useState(0)
  const [isOpen, setIsOpen] = useState(false);
  const [showBedroomFilters, setShowBedroomFilters] = useState(null)
  const [isShowSortedFilters, setIsShowSortedFilters] = useState(null)
  const openGallery = () => setIsOpen(true);
  const closeGallery = () => setIsOpen(false);

  // const renderHeaderComponent = (image, currentIndex) => {
  //   return <View style={{ backgroundColor: 'red' }}></View>;
  //   //return <Header currentIndex={currentIndex} />;
  // };
  // const renderFooterComponent = (image, currentIndex) => {
  //   return <Footer total={floorPlanGellry.length} currentIndex={currentIndex} />;
  // };
  useEffect(() => {
    // Promise.all([getShowBedroomFilters(), getFloorPlans([])])
    getFloorPlans([]);
    //setradioPropsFinal({Singleton.getInstance().getIsSitemap() === false ? )
    return () => {
    backFunction()
    }
  }, []);

  backFunction = () => {
    const { params } = navigation.state;
    params.callTourReviewScreen()
  }

  // const getShowBedroomFilters = async (floorplans) => {
    // try {
    //   const response = await getFloorPlansForEditTour(
    //     perPage.current,
    //     offset.current,
    //     bedroomFilter.current,
    //     radioValueStr.current
    //   );

    //   const responseJson = await response.json();

      // if (responseJson.floorplans) {
      //   if (responseJson.floorplans.length === 0) {
      //     setShowBedroomFilters(() => false)
      //     setIsShowSortedFilters(() => false)
      //     return
      //   }
      //   const firstBedroom = responseJson.floorplans[0].bedrooms
      //   for (let i = 0; i < responseJson.floorplans.length; i++) {
      //     if (responseJson.floorplans[i].bedrooms !== firstBedroom) {
      //       setShowBedroomFilters(() => true)
      //       setIsShowSortedFilters(() => true)
      //       return
      //     }
      //   }
      //   setShowBedroomFilters(() => false)
      //   setIsShowSortedFilters(() => true)
      // }
    // } catch (error) {
    //   console.log("error", error);
    // }
  // };

  getFloorPlans = (oldData) => {
    // debugger
    setIsLoading(true)
    setshowLoadMoreButton(false)
    getFloorPlansForEditTour(perPage.current, offset.current, bedroomFilter.current, radioValueStr.current)
      .then(response => response.json())
      .then(responseJson => {
        if (typeof (responseJson.pagination) !== 'undefined' || responseJson.pagination != null) {
          offset.current = responseJson.pagination.next
          perPage.current = responseJson.pagination.per_page
          setshowLoadMoreButton(responseJson.pagination.pages === responseJson.pagination.current_page ? false : true)

        }
        if (typeof (responseJson.floorplans) !== 'undefined' || responseJson.floorplans != null) {
          console.log("oldData", oldData)
          const data = [...oldData, ...responseJson.floorplans]
          setFloorPlanList(data);
          setIsLoading(false)
        } else {
          showServerError()
          setIsLoading(false)
        }
      })
      .catch(error => {
        showServerError()
        setIsLoading(false)
      });
  };

  showServerError = () => {
    setIsLoading(false)
    setTimeout(() => {
      alert('Server Error, Please try again.')
    }, 500);
  }

  pressRefresh = () => {
    setisModalVisible(true)
  }

  const updateOnPress = (index) => {
    let categories = categroy.map((item) => {
      // item.selected = false;
      return item;
    });

    if (categories[index].id === 0) {
      categories = categories.map((item) => {
        if (item.id === 0)
          item.is_selected = true;
        else
          item.is_selected = false;
        return item;
      });
    } else {
      const result = categories[index].is_selected;
      categories[index].is_selected = !result //categories[index].selected;
      categories[0].is_selected = false
    }

    bedroomFilter.current = ""
    for (let index = 0; index < categories.length; index++) {
      const element = categories[index];
      if (element.is_selected)
        bedroomFilter.current = bedroomFilter.current + element.value + ","
    }
    if (bedroomFilter.current === "") {
      categories[0].is_selected = true
      bedroomFilter.current = "any,"
    }

    setFloorPlanList(() => []);
    offset.current = 1;
    perPage.current = 4
    getFloorPlans([])
    updateCategory(categories);
  };

  floorPlanGallery = (item) => {
    if (item.floorplan_images.length > 0) {
      setfloorPlanGellrys(item.floorplan_images)
      setfloorPlanName(item.name)
      //setisModalVisible(true)
      setisGalleyModelVisible(true)
    } else {
      alert('No Image Found.')
    }
  }
  explore = (item) => {
    navigation.navigate("ChoseTourStop", { floorPlan: item.id, floorPlanImage: item.thumbnail_image })
  }

  backPress = () => {
    console.log("hrlooo      moto")
    navigation.goBack()
  }

  checkPricingModalHide = () => {
    setisModalVisible(false)
  }

  galleryModelHide = () => {
    //setisModalVisible(false)
    setisGalleyModelVisible(false)
  }

  handleSlideChange = (index) => {
    setactiveSlide(index)
  }

  sortFloorPlanFilterApply = () => {
    setisModalVisible(false)
    radioValueStr.current = radioPropsFinal[radiuSelectedValue].valueStr
    console.log("radioValueStr.current", radioValueStr.current)
    setFloorPlanList(() => []);
    offset.current = 1;
    perPage.current = 4
    getFloorPlans([])
  }

  renderFooter = () => {
    return (
      <>
        {floorPlanList.length > 0 ? <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => getFloorPlans(floorPlanList)}
            //On Click of button load more data
            style={styles.loadMoreBtn}>
            <Text style={styles.btnText}>LOAD MORE RESULTS</Text>
            {isLoading ? (
              // <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} />
              <LoadingIndicator visible={isLoading} />
              ) : null}
          </TouchableOpacity>
        </View> : null}
      </>
    );
  };

  renderSeparator = () => {
    return (<View style={{ height: 1, width: "100%", backgroundColor: "gray", }} />);
  };

  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header backBtnVisible={true} titleFontSize={16} title="First, select your desired floor plan" navigation={navigation} onGoBack={() => {
        //navigation.goBack()
        if (navigation.goBack()) {
          navigation.goBack()
        } else {
          // navigation.replace("TourReview");
        }
        //this.props.navigation.replace("TourReview")
      }} />
      {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading} />
      {
        categroy?.length > 1 &&
        <View style={styles.welcomeView}>
          <View style={{ width: wp('23%') }}>
            <Text style={styles.welcomeToTextView}>Required Bedrooms</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{}}
            data={categroy}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              return (
                <TouchableOpacity onPress={() => updateOnPress(index)}>
                  <View style={item.is_selected ? styles.propertyNameContainerView1 : styles.propertyNameContainerViewSelected}>
                    <Text style={item.is_selected ? styles.selectedText : styles.normalText}>{item.title}</Text>
                    <View style={item.is_selected ? { width: .5, height: hp('5%'), backgroundColor: 'black', } : { width: .5, height: hp('5%'), backgroundColor: 'white', }}></View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      }
      <View style={styles.availableView}>
        <View style={{ width: wp('50%'), justifyContent: 'flex-start', flex: 1 }}>
          <Text style={styles.welcomeToTextView}>Available Floor Plans</Text>
        </View>
        {
          floorPlanList?.length > 1 &&
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: "center", justifyContent: "center", height: hp('5%'), width: wp('30%'), }} onPress={pressRefresh}>
            <Image source={R.images.arrow} style={{ width: wp("5%"), height: hp("3%"), resizeMode: "contain" }} />
            <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), lineHeight: wp('3.5%'), marginLeft: hp('1%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Sort By</Text>
          </TouchableOpacity>
        }
      </View>
      <View style={styles.container}>
        <View style={{ width: wp('100%'), marginTop: hp('1.2%'), height: .5, backgroundColor: 'white' }}></View>
        <FlatList scrollIndicatorInsets={{ right: 1 }}
          style={styles.flatListContainer}
          data={floorPlanList}
          enableEmptySections={true}
          ListFooterComponent={showLoadMoreButton ? renderFooter() : null}
          ListEmptyComponent={
            <View style={{
              height: hp('80%'),
              justifyContent: 'center',
              alignContent: 'center'
            }}>
              {!isLoading && <Text style={{ color: "white", textAlign: "center", fontSize: wp('5%'), lineHeight: wp('6.5%'), marginLeft: hp('1%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>
                No Available Floor Plans
              </Text>}
            </View>
        }
          renderItem={({ item, index }) =>
            <View style={styles.itemMainContainer}>
              <View style={styles.renderItemcontainer}>
                {/* <ImageView
              resizeMode="cover" style={styles.imageStyle} source={{ uri: item.thumbnail_image }}/> */}
                <View style={styles.propertyNameContainerView}>
                  <Text style={styles.titleText}>{item.name}</Text>
                  <View>
                    <View style={[styles.flexRow, styles.roomInfoVerticalSpacing]}>
                      <View style={styles.flexRowAlign}>
                        {/* <Image source={R.images.bed} style={{ width: wp("6.5%"), height: hp("4%"), resizeMode: "contain" }} /> */}
                        <Icon name="bed" size={18} color="white" />
                        <Text style={[styles.itemText, styles.itemIconSpacing]}>{item.bedrooms}</Text>
                      </View>
                      <View style={[styles.flexRowAlign, styles.roomInfoHorizontalSpacing]}>
                        {/* <Image source={R.images.bath} style={{ width: wp("6.5%"), height: hp("4%"), resizeMode: "contain" }} /> */}
                        <Icon name="bath" size={18} color="white" />
                        <Text style={[styles.itemText, styles.itemIconSpacing]}>{item.bathrooms}</Text>
                      </View>
                    </View>
                    <View style={styles.flexRowAlign}>
                      {/* <Image source={R.images.squ} style={{ width: wp("6.5%"), height: hp("3.5%"), resizeMode: "contain" }} /> */}
                      <Icon name="expand" size={18} color="white" />
                      <Text style={[styles.itemText, styles.itemIconSpacing]}>{item.square_footage}</Text>
                    </View>
                  </View>
                  {/* {Singleton.getInstance().getIsSitemap() === false ? <Text style={{ marginLeft: wp('1%'), marginTop: hp('.8%'), color: "white", textAlign: "center", fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Floors: {item.floors}</Text> : null}
                {Singleton.getInstance().getIsSitemap() === false ? <Text style={{ marginLeft: wp('1%'), marginTop: hp('.8%'), color: "white", textAlign: "center", fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Buildings: {item.buildings}</Text> : null} */}
                  <View>
                    <Text style={[styles.itemText, styles.itemBottomSpacing]}>Available Units: {item.vacant_units}</Text>
                    {/* <Text style={{ marginLeft: wp('1%'), marginTop: hp('.8%'), color: "white", textAlign: "center", fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Availability: {item.availability}</Text> */}
                    <Text style={styles.itemText}>Starting At: {item.up_to}</Text>
                  </View>
                </View>
                <View style={styles.itemImageContainer}>
                  <TouchableOpacity onPress={() => floorPlanGallery(item)} style={styles.occupySuperContainerView}>
                    <ImageView resizeMode="contain" style={styles.imageStyle1} source={{ uri: item.thumbnail_image }} defaultSource={R.images.placeholder} />
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity style={styles.submitBtnContainer} onPress={() => explore(item)}>
                <Text style={styles.submitBtnLabel}>SELECT UNITS WITH THIS FLOOR PLAN</Text>
              </TouchableOpacity>
            </View>
          }
          ItemSeparatorComponent={renderSeparator}
        />
      </View>
      {/* <View>
        <TouchableOpacity style={{ flexDirection: "column", width: wp("90%"), marginTop: hp('0'), marginBottom: hp('2'), height: hp("6%"), backgroundColor: "black", alignItems: "center", justifyContent: "center" }} onPress={() => { navigation.goBack() }}>
          <Text style={{ color: 'white', textAlign: "center", fontSize: hp('1.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>
            BACK
          </Text>
        </TouchableOpacity>
      </View> */}
      {/* <ImageGallery
        close={closeGallery}
        isOpen={isOpen}
        images={floorPlanGellry}
      // renderHeaderComponent={renderHeaderComponent}
      // renderFooterComponent={renderFooterComponent}
      /> */}
      {/* <Gallery
        style={{ flex: 1, backgroundColor: 'black' }}
        images={floorPlanGellry}
      /> */}
      <Dialog
        rounded={false}
        visible={isModalVisible}
        dialogTitle={<DialogTitle
          title="Sort Results By" />}
        footer={
          <DialogFooter>
            {/* <DialogButton text="Sort Floor Plans" onPress={() => { this.checkPricingModalHide() }} /> */}
            <View style={{ flexDirection: 'row', width: wp("80%"), marginTop: hp('0'), height: hp("8%"), alignItems: 'center', justifyContent: 'space-evenly' }}>
              <TouchableOpacity style={{ flexDirection: "column", width: wp("35%"), marginTop: hp('0'), height: hp("5%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center" }}
                onPress={checkPricingModalHide}>
                <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.5%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: "column", width: wp("35%"), marginTop: hp('0'), height: hp("5%"), backgroundColor: "#89C765", alignItems: "center", justifyContent: "center" }}
                onPress={sortFloorPlanFilterApply}>
                <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.5%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>
                  Sort Floor Plans
                </Text>
              </TouchableOpacity>
            </View>
          </DialogFooter>
        }
        dialogAnimation={new SlideAnimation({
          slideFrom: 'bottom',
        })} >
        <DialogContent style={{ height: hp('36%'), width: wp('80%') }}>
          <View>
            <RadioForm
              radio_props={radioPropsFinal}
              // labelColor={'#50C900'}
              buttonSize={16}
              style={{ marginTop: 10 }}
              buttonColor={'#6e6b6d'}
              initial={radiuSelectedValue}
              onPress={(value) => {
                setradiuSelectedValue(value)
                console.log(value)
              }}
            />
          </View>
        </DialogContent>
      </Dialog>

      <Dialog
        style={{ borderBottomColor: "red", borderBottomWidth: 50 }}
        visible={isGalleyModelVisible} dialogTitle={<DialogTitle title={floorPlanName} />} footer={<DialogFooter>
          <DialogButton text="OK" onPress={galleryModelHide} />
        </DialogFooter>}
        dialogAnimation={new SlideAnimation({
          slideFrom: 'bottom',
        })} >
        <DialogContent style={{ height: hp('45%'), width: wp('80%') }}>
          <View style={{ height: hp('45%'), width: wp('70%'), }}>
            <Carousel
              data={floorPlanGellry}
              renderItem={({ item }) => (
                <ImageView
                  resizeMode="contain"
                  style={{ flex: 1.0, width: wp('70%'), }}
                  source={{ uri: item.url }}>
                </ImageView>
              )}
              sliderWidth={400}
              itemWidth={400}
              // itemHeight={200}
              onSnapToItem={handleSlideChange}
            />
            <Pagination
              dotsLength={floorPlanGellry.length}
              activeDotIndex={activeSlide}
              dotStyle={{ top: 0, width: 10, height: 10, borderRadius: 5, marginHorizontal: -4, backgroundColor: 'black' }}
              inactiveDotStyle={{}}
              containerStyle={{ alignSelf: 'center' }}
              inactiveDotOpacity={0.4}
              inactiveDotScale={0.6}
            />
          </View>
        </DialogContent>

      </Dialog>
      <CopyRight />
    </ImageBackground>
  );
}
export default FloorPlatListScreen;