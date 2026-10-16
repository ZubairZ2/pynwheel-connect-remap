import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, ImageBackground, Platform, Text, TouchableOpacity, View } from "react-native";
import ImageView from "react-native-image-progress";
import Dialog, { DialogButton, DialogContent, DialogFooter, DialogTitle, SlideAnimation, } from 'react-native-popup-dialog';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import LoadingIndicator from "../../../Components/LoadingIndicator";
import CopyRight from "../../../Library/Components/Copyright";
import Header from '../../../Library/Components/Header';
import { addOrRemoveUnitFormTour, getAmenitiesForEditTour } from "../../../Library/ServerCalls/API";
import R from "../../../assest/R";
import { calculateXForStopNew, calculateYForStopNew } from "../../TourMapScreen/TourmapScreenHelper";
import styles from "./styles";



const ChoseTourAmenities = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true)
  const floorPlanID = useRef(0);
  const _carousel = useRef(null);
  let unitFlatListRef = useRef(null);

  const [floorPlan, setfloorPlan] = useState({ id: 0, floorplan_name: '', bedrooms: '', bathrooms: 0, square_feet: 0 });
  const [unitList, setUnitList] = useState([]);
  const [floorPlatList, setfloorPlatList] = useState([]);
  const [activeSlide, setactiveSlide] = useState(0);
  const [activeSlideGallery, setactiveSlideGallery] = useState(0);
  const [markerSelectedSlide, setmarkerSelectedSlide] = useState(0);
  const [windowWidth, setwindowWidth] = useState(Dimensions.get('window').width)
  const [selectedItem, setSelectedItem] = useState(null);
  const [Arr, setArray] = useState([]);
  const [isGalleyModelVisible, setisGalleyModelVisible] = useState(false)
  const [floorPlanGellry, setfloorPlanGellrys] = useState([]);
  const [floorPlanName, setfloorPlanName] = useState("");

  useEffect(() => {
    floorPlanID.current = 524//navigation.getParam('floorPlan')
    getUserData()
    return () => {
      this.backFunction()
  }
  }, []);

  backFunction = () => {
    const { params } = navigation.state;
    params.callTourReviewScreen()
  }

  /////////////////////////////////Server calls
  getUserData = () => {
    // debugger
    getAmenitiesForEditTour()
      .then(response => response.json())
      .then(responseJson => {
        console.log("responseJson ", responseJson)
        setIsLoading(false)
        if (typeof (responseJson.amenities) !== 'undefined' || responseJson.amenities != null) {
          const availableAmenities = responseJson.amenities.filter((amenity) => !amenity.is_amenity_already_available);
          setUnitList(availableAmenities)
        } else { showServerError() }
        if (typeof (responseJson.floorplates) !== 'undefined' || responseJson.floorplates != null) {
          console.log(JSON.stringify(responseJson.floorplates),"this is here")
          setfloorPlatList(responseJson.floorplates)
        } else { showServerError() }
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

  addOrRemoveUnit = (item, index) => {
    setIsLoading(true)
    addOrRemoveUnitFormTour(item.id, "amenity", item.floor, item.building)
      .then(response => response.json())
      .then(responseJson => {
        if (typeof (responseJson.message) !== 'undefined' && responseJson.message != null && responseJson.message === "Last stop can not be removed") {
          setIsLoading(false)
          setTimeout(() => {
            alert(responseJson.message)
          }, 500);
        }
        else if (typeof (responseJson.is_unit_already_available) !== 'undefined' || responseJson.is_unit_already_available != null) {
          setIsLoading(false)
          // let UL = [...unitList];
          // if (UL.length > index) {
          //   UL[index] = { ...UL[index], is_amenity_already_available: responseJson.is_unit_already_available };
          //   setUnitList(UL)
          // }
          const updateList = unitList.filter((_, i) => i !== index)
          setUnitList(updateList)
        } else {
          showServerError()
          setIsLoading(false)
        }
      })
      .catch(error => {
        showServerError()
        setIsLoading(false)
      });
  }

  floorPlanGallery = (item) => {
    console.log("item 1", item)
    if (item.amenity_galleries.length > 0) {
      setfloorPlanGellrys(item.amenity_galleries)
      setfloorPlanName(item.amenity_name) 
      //setisModalVisible(true)
      setisGalleyModelVisible(true)
    } else {
      alert('No Image Found.')
    }
  }

  galleryModelHide = () => {
    //setisModalVisible(false)
    setisGalleyModelVisible(false)
  }

  //////////////////Selection ///////////////////////////
  seeOnMap = (item, index) => {
    let newfloorPlatList = [...floorPlatList];
    // debugger
    let index1 = newfloorPlatList.findIndex(el => el.unique_floorplat_amenity_identifier === item.unique_amenity_identifier);
    _carousel.current.snapToItem(index1, animated = true, fireCallback = true)
    let floorPlat = floorPlatList[index1]
    let imageContanierHeight = floorPlat.height * (windowWidth / floorPlat.width)
    let x_pos = this.calculateXForStop1(typeof (item.x_plot) !== 'undefined' ? item.x_plot : 1, floorPlat.width, 13)
    let y_pos = this.calculateYForStop1(typeof (item.y_plot) !== 'undefined' ? item.y_plot : 1, floorPlat.height, 20, imageContanierHeight)
    var index = 0
    let temp = index++
    let myArr = [temp]
    let Arr1 = myArr.map((a, i) => {
      return <View key={i} style={{ width: 25, height: 25, borderRadius: 25 / 2, backgroundColor: 'transparent', position: "absolute", left: x_pos, top: y_pos, borderColor: "red", borderWidth: 2, }} />
    })
    setArray(Arr1)
    setSelectedItem(item.id)
    setactiveSlide(index1)
    setmarkerSelectedSlide(index1)
  }

  pressMarker = (item, index) => {
    setSelectedItem(item.id)
    let newUnitList = [...unitList];
    let index1 = newUnitList.findIndex(el => el.id === item.id);
    unitFlatListRef.current.scrollToIndex({ animated: true, index: index1, viewPosition: 0.5 })
    let floorPlat = floorPlatList[index]
    let imageContanierHeight2 = floorPlat.height * (Dimensions.get("window").width / floorPlat.width)
    let x_pos = this.calculateXForStop1(typeof (item.x_plot) !== 'undefined' ? item.x_plot : 1, floorPlat.width, 13)
    let y_pos = this.calculateYForStop1(typeof (item.y_plot) !== 'undefined' ? item.y_plot : 1, floorPlat.height, 20, imageContanierHeight2)
    var index2 = 0
    let temp = index2++
    let myArr = [temp]
    let Arr1 = myArr.map((a, i) => {
      return <View key={i} style={{ width: 25, height: 25, borderRadius: 25 / 2, backgroundColor: 'transparent', position: "absolute", left: x_pos, top: y_pos, borderColor: "red", borderWidth: 2, }} />
    })
    setArray(Arr1)
    setmarkerSelectedSlide(index)
  }

  drawUnits = (index, floorPlate) => {
    let imageContanierHeight = floorPlate.height * (windowWidth / floorPlate.width)
    // let imageContanierw = floorPlate.width * (Dimensions.get('window').height / floorPlate.height)
    // console.log(floorPlate.height + "--------" + windowWidth + "-------" +floorPlate.width ) 
    console.log("imageContanierH", imageContanierHeight)
    // console.log("imageContanierW", imageContanierw)
    console.log("Floor", floorPlate.id)
    let unitsList = floorPlate.floorplate_amenities.map((item1) => { return item1; });
    const listItems = unitsList.map((item2) => {
      let x_pos = this.calculateXForStop1(typeof (item2.x_plot) !== 'undefined' ? item2.x_plot : 1, floorPlate.width, 9)
      let y_pos = this.calculateYForStop1(typeof (item2.y_plot) !== 'undefined' ? item2.y_plot : 1, floorPlate.height, 16, imageContanierHeight)
      return (<TouchableOpacity onPress={() => this.pressMarker(item2, index)}>
        <Image style={{ height: 18, width: 18, position: "absolute", left: x_pos, top: y_pos }} source={R.images.cameraAlt} /></TouchableOpacity>)
    });
    return (<ImageView ref={ref => this.ImageViewLocal = ref} resizeMode="contain" style={[{ width: Dimensions.get("window").width, height: imageContanierHeight }]} fadeDuration={300} source={{ uri: floorPlate.image.url }} onLoadEnd={this.imageLoaded(index, floorPlate)} key={floorPlate.url}
      imageStyle={{ resizeMode: "contain" }}>
      <View style={{ backgroundColor: 'black' }} >
        <View>{listItems}</View>
        {/* {this.drawUnits(index, item)} */}
        {index === markerSelectedSlide ? Arr : null}
      </View>
    </ImageView>)
  }

  //////////////////X, Y value mapper methods /////////////////////
  calculateXForStop1 = (x, imageWidth, adjest) => {
    return calculateXForStopNew(x, imageWidth, adjest)
  }

  calculateYForStop1 = (y, imageHeight, adgast, imageContanierHeight) => {
    return calculateYForStopNew(y, imageHeight, adgast, imageContanierHeight)
  }

  handleSlideChange = (index) => {
    setactiveSlide(index)
  }

  handleSlideChange1 = (index) => {
    setactiveSlideGallery(index)
  }

  backPress = () => {
    navigation.goBack()
  }

  imageLoaded = (index, item) => {
  }

  renderSeparator = () => {
    return (<View style={{ height: 1, width: "100%", backgroundColor: "gray", }} />);
  };

  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header backBtnVisible={true} titleFontSize={16} title="Add amenities" navigation={navigation} onGoBack={() => {
        if (navigation.goBack()) {
          navigation.goBack()
        } else {
          // navigation.replace("TourReview");
        }
      }} />
      {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading} />
      {/* <View style={{ marginTop: 0, height: hp('33%')  }}>
        <Carousel
          ref={c => { _carousel.current = c; }}
          style={{ width: wp("100%"), backgroundColor: 'red' }}
          data={floorPlatList}//image_list
          renderItem={({ item, index }) =>
            <View style={{ width: wp("100%"), }}>
              <View style={{ width: wp("100%"),  }}>
                {this.drawUnits(index, item)}
              </View>
            </View>}
          sliderWidth={windowWidth}
          itemWidth={windowWidth}
          onSnapToItem={this.handleSlideChange} />
      </View> */}
      {/* {Singleton.getInstance().getIsSitemap() === false ? <View style={{ width: wp('50%'), height: hp('3%'), alignItems: 'center', justifyContent: 'center', }}>
      <Text style={styles.welcomeToTextView}> {activeSlide + 1} of {floorPlatList.length} floors</Text>
      </View> : null}
      <View style={styles.availableView}>
        <View style={{ width: wp('60%'), justifyContent: 'flex-start', marginLeft: wp('2%'), marginTop:hp('1%') }}>
          <Text style={styles.welcomeToTextView}>Available amenities to visit</Text>
        </View>
      </View> */}
      <View style={styles.container}>
        <View style={{ width: wp('100%'), marginTop: hp('1.2%'), height: .5, backgroundColor: 'white' }}></View>
        <FlatList
          ref={(ref) => { unitFlatListRef.current = ref; }}
          keyExtractor={item => item.id.toString()}
          extraData={selectedItem}
          ListEmptyComponent={
            <View style={styles.emptyComponentContainer}>
              {!isLoading && <Text style={styles.emptyComponentTxt}>
                No Available Amenities
              </Text>}
            </View>
          }
          scrollIndicatorInsets={{ right: 1 }} style={styles.flatListContainer}
          data={unitList}
          renderItem={({ item, index }) =>
            <View style={selectedItem === item.id ? { flex: 1, flexDirection: 'column', backgroundColor: "#575757" } : { flex: 1, flexDirection: 'column', backgroundColor: "black" }}>
              <View style={styles.propertyNameContainerView}>
                <Text style={styles.item}> {item.amenity_name} </Text>
              </View>
              <View style={{ backgroundColor: '#D3D3D3', margin: hp('1.5%'), }}>
                <TouchableOpacity style={styles.occupySuperContainerView} onPress={() => this.floorPlanGallery(item)} >
                  <ImageView resizeMode="cover" style={styles.imageStyle1} source={{ uri: item.image.url }} defaultSource={R.images.placeholder} />
                </TouchableOpacity>
              </View>
              {/* <View style={{ margin: hp('1%'), flexDirection: 'row', justifyContent: 'space-evenly'  }}>
                <TouchableOpacity style={{ flexDirection: "column", width: wp("47%"), marginTop: hp('1'), height: hp("5%"), backgroundColor: "#89C765", alignItems: "center", justifyContent: "center" }} onPress={() => this.seeOnMap(item, index)}>
                  <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>SEE ON MAP</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: "column", width: wp("47%"), marginTop: hp('1'), height: hp("5%"), backgroundColor: item.is_amenity_already_available ? "#c03b31" : "#89C765", alignItems: "center", justifyContent: "center" }} onPress={() => this.addOrRemoveUnit(item, index)}>
                  {item.is_amenity_already_available ? <Text style={{ color: 'white', textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>- REMOVE</Text> : <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> + ADD TO TOUR </Text>}
                </TouchableOpacity>
              </View> */}
              <TouchableOpacity style={{ flexDirection: "column", width: wp("90"), alignSelf: 'center', marginVertical: hp('1'), height: hp("5%"), backgroundColor: "#89C765", alignItems: "center", justifyContent: "center" }} onPress={() => this.addOrRemoveUnit(item, index)}>
                <Text style={{ color: 'black', textAlign: "center", fontSize: wp('4'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> + ADD TO TOUR </Text>
              </TouchableOpacity>
            </View>}
          ItemSeparatorComponent={this.renderSeparator}
          ListFooterComponent={this.renderSeparator} />
      </View>
      <TouchableOpacity style={styles.actionBtnContainer}
        onPress={() => navigation.goBack()}>
        <Image source={R.images.seeTourIcon}
          style={styles.actionBtnIcon} />
        <Text style={styles.actionBtnText}>DONE ADDING AMENITIES</Text>
      </TouchableOpacity>
      {/* <View>
        <TouchableOpacity style={{ flexDirection: "column", width: wp("95%"), marginTop: hp('0'), marginBottom: hp('2'), height: hp("6%"), backgroundColor: "black", alignItems: "center", justifyContent: "center" }} onPress={() => this.backPress()}>
          <Text style={{ color: 'white', textAlign: "center", fontSize: hp('1.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>BACK</Text>
        </TouchableOpacity>
      </View> */}
      <Dialog
        style={{ borderBottomColor: "red", borderBottomWidth: 50 }}
        visible={isGalleyModelVisible} dialogTitle={<DialogTitle title={floorPlanName}/>} footer={<DialogFooter>
          <DialogButton text="OK" onPress={() => { this.galleryModelHide() }} />
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
                  source={{ uri: item.image.url }}>
                </ImageView>
              )}
              sliderWidth={400}
              itemWidth={400}
              // itemHeight={200}
              onSnapToItem={this.handleSlideChange1}
            />
            <Pagination
              dotsLength={floorPlanGellry.length}
              activeDotIndex={activeSlideGallery}
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
export default ChoseTourAmenities;