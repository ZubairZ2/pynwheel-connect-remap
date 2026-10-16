import React, { useEffect, useRef, useState } from "react";
import { Dimensions, FlatList, Image, ImageBackground, Platform, Text, TouchableOpacity, View } from "react-native";
import ImageZoom from 'react-native-image-pan-zoom';
import ImageView from "react-native-image-progress";
import Dialog, { DialogButton, DialogContent, DialogFooter, DialogTitle, SlideAnimation, } from 'react-native-popup-dialog';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import RadioForm from 'react-native-simple-radio-button';
import Icon from "react-native-vector-icons/FontAwesome";
import LoadingIndicator from "../../../Components/LoadingIndicator";
import CopyRight from "../../../Library/Components/Copyright";
import Header from '../../../Library/Components/Header';
import { addOrRemoveUnitFormTour, getUnitsForEditTour } from "../../../Library/ServerCalls/API";
import Singleton from "../../../Singleton";
import R from "../../../assest/R";
import { calculateXForStopNew, calculateYForStopNew } from "../../TourMapScreen/TourmapScreenHelper";
import styles from "./styles";


var radio_props = [
  { label: 'Price: Low to High', value: 0, valueStr: "price_asc" },
  { label: 'Price: High to Low', value: 1, valueStr: "price_desc" },
  { label: 'Floors: Top to Bottom', value: 2, valueStr: "floors_desc" },
  { label: 'Floors: Bottom to Top', value: 3, valueStr: "floors_asc" },
  { label: 'Availability: Soonest to Latest', value: 4, valueStr: "sq_ft_desc" },
  { label: 'Availability: Latest to Soonest', value: 5, valueStr: "sq_ft_asc" },
];

var radio_props_SiteMap = [
  { label: 'Price: Low to High', value: 0, valueStr: "price_asc" },
  { label: 'Price: High to Low', value: 1, valueStr: "price_desc" },
  { label: 'Availability: Soonest to Latest', value: 2, valueStr: "sq_ft_desc" },
  { label: 'Availability: Latest to Soonest', value: 3, valueStr: "sq_ft_asc" },
];

const ChoseTourStops = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true)
  const floorPlanID = useRef(0);
  const _carousel = useRef(null);
  let unitFlatListRef = useRef(null);

  const [floorPlan, setfloorPlan] = useState({ id: 0, floorplan_name: '', bedrooms: '', bathrooms: 0, square_feet: 0 });
  const [radioPropsFinal, setradioPropsFinal] = useState(Singleton.getInstance().getIsSitemap() === false ? radio_props : radio_props_SiteMap);

  const [unitList, setUnitList] = useState([]);
  const [floorPlatList, setfloorPlatList] = useState([]);
  const [activeSlide, setactiveSlide] = useState(0);
  const [markerSelectedSlide, setmarkerSelectedSlide] = useState(0);
  const [pricingOptions, setpricingOptions] = useState([])
  const [radiuSelectedValue, setradiuSelectedValue] = useState(0);
  const [isModalVisible, setisModalVisible] = useState(false)
  const [isPriceModalVisible, setisPriceModalVisible] = useState(false)
  const [windowWidth, setwindowWidth] = useState(Dimensions.get('window').width)
  const [selectedItem, setSelectedItem] = useState(null);
  const [Arr, setArray] = useState([]);
  const [priceListVisible, setPriceListVisible] = useState(false);

  const initialDataSorted = useRef(false)

  const floorPlanImage = navigation.getParam('floorPlanImage')

  useEffect(() => {
    floorPlanID.current = navigation.getParam('floorPlan')
    getUserData()
  }, []);

  useEffect(() => {
    if (unitList.length > 0 && !initialDataSorted.current) {
      unitSortHandler()
      console.log('sorting units')
    }
  }, [unitList])

  /////////////////////////////////Server calls
  getUserData = () => {
    // debugger
    getUnitsForEditTour(floorPlanID.current)
      .then(response => response.json())
      .then(responseJson => {
        setIsLoading(false)
        if (typeof (responseJson.floorplan) !== 'undefined' || responseJson.floorplan != null) {
          setfloorPlan(responseJson.floorplan)
        } else { showServerError() }
        if (typeof (responseJson.units) !== 'undefined' || responseJson.units != null) {
          setUnitList(responseJson.units)
        } else { showServerError() }
        if (typeof (responseJson.floorplates) !== 'undefined' || responseJson.floorplates != null || responseJson.floorplates.length) {
          setfloorPlatList(responseJson?.floorplates)
        } else { showServerError() }
      })
      .catch(error => {
        showServerError()
        setIsLoading(false)
      });
  };

  const showServerError = () => {
    setIsLoading(false)
    setTimeout(() => {
      alert('Server Error, Please try again.')
    }, 500);
  }

  const addOrRemoveUnit = (item, index) => {
    setIsLoading(true)
    addOrRemoveUnitFormTour(item.id, "unit", item.floor, item.building)
      .then(response => response.json())
      .then(responseJson => {
        console.log("responseJson", responseJson)
        if (typeof (responseJson.message) !== 'undefined' && responseJson.message != null && responseJson.message === "Last stop can not be removed") {
          setIsLoading(false)
          setTimeout(() => {
            alert(responseJson.message)
          }, 500);
        }

        else if (typeof (responseJson.is_unit_already_available) !== 'undefined' || responseJson.is_unit_already_available != null) {
          setIsLoading(false)
          let UL = [...unitList];
          if (UL.length > index) {
            UL[index] = { ...UL[index], is_unit_already_available: responseJson.is_unit_already_available };
            setUnitList(UL)
          }
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

  //////////////////Selection ///////////////////////////
  const seeOnMap = (item, index) => {
    // debugger
    let newfloorPlatList = [...floorPlatList];
    let index1 = newfloorPlatList.findIndex(el => el.unique_floorplat_unit_identifier === item.unique_unit_identifier);
    _carousel.current.snapToItem(index1, animated = true, fireCallback = true)
    let floorPlat = floorPlatList[index1]
    let imageContanierHeight = floorPlat?.height * (windowWidth / floorPlat?.width)
    let x_pos = calculateXForStop1(typeof (item.x_plot) !== 'undefined' ? item.x_plot : 1, floorPlat?.width, 11)
    let y_pos = calculateYForStop1(typeof (item.y_plot) !== 'undefined' ? item.y_plot : 1, floorPlat?.height, 20, imageContanierHeight)
    var index = 0
    let temp = index++
    let myArr = [temp]
    let Arr1 = myArr.map((a, i) => {
      return <View key={i} style={{ width: 22, height: 22, borderRadius: 22 / 2, backgroundColor: 'transparent', position: "absolute", left: x_pos, top: y_pos, borderColor: "green", borderWidth: 2, }} />
    })
    setArray(Arr1)
    setSelectedItem(item.id)
    setactiveSlide(index1)
    setmarkerSelectedSlide(index1)
  }

  const pressMarker = (item, index) => {
    setSelectedItem(item.id)
    let newUnitList = [...unitList];
    let index1 = newUnitList.findIndex(el => el.id === item.id);
    unitFlatListRef.current.scrollToIndex({ animated: true, index: index1, viewPosition: 0.5 })
    console.log(item, "item")
    console.log(index, "index")
    let floorPlat = floorPlatList[index]

    let imageContanierHeight2 = floorPlat?.height * (Dimensions.get("window").width / floorPlat?.width)
    let x_pos = calculateXForStop1(typeof (item.x_plot) !== 'undefined' ? item.x_plot : 1, floorPlat?.width, 11)
    let y_pos = calculateYForStop1(typeof (item.y_plot) !== 'undefined' ? item.y_plot : 1, floorPlat?.height, 20, imageContanierHeight2)

    var index2 = 0
    let temp = index2++
    let myArr = [temp]
    let Arr1 = myArr.map((a, i) => {
      return <View key={i} style={{ width: 22, height: 22, borderRadius: 22 / 2, backgroundColor: 'transparent', position: "absolute", left: x_pos, top: y_pos, borderColor: "green", borderWidth: 2, }} />
    })
    setArray(Arr1)
    setmarkerSelectedSlide(index)
  }

  const drawUnits = (index, floorPlate) => {
    let imageContanierHeight = floorPlate?.height * (windowWidth / floorPlate?.width)
    // let imageContanierw = floorPlate.width * (Dimensions.get('window').height / floorPlate.height)
    // console.log(floorPlate.height + "--------" + windowWidth + "-------" +floorPlate.width ) 
    console.log("imageContanierH", imageContanierHeight)
    // console.log("imageContanierW", imageContanierw)
    console.log("Floor", floorPlate?.id)
    let unitsList = floorPlate?.floorplate_units?.map((item1) => { return item1; });
    const listItems = unitsList.map((item2) => {
      let x_pos = calculateXForStop1(typeof (item2.x_plot) !== 'undefined' ? item2.x_plot : 1, floorPlate?.width, 6)
      let y_pos = calculateYForStop1(typeof (item2.y_plot) !== 'undefined' ? item2.y_plot : 1, floorPlate?.height, 16, imageContanierHeight)
      return (<TouchableOpacity style={{ backgroundColor: 'blue' }} onPress={() => pressMarker(item2, index)}>
        <Image style={{ height: 17, width: 12, position: "absolute", left: x_pos, top: y_pos }} source={R.images.youAreHereWOT} />
      </TouchableOpacity>)
    });
    return (
      // <ImageZoom ref={ref => ImageZoom = ref} cropWidth={Dimensions.get('window').width} cropHeight={imageContanierHeight} imageWidth={Dimensions.get("window").width} backgroundColor="green" imageHeight={imageContanierHeight}>

      <ImageView ref={ref => ImageViewLocal = ref} resizeMode="contain" style={[{ width: Dimensions.get("window").width, height: imageContanierHeight }]} fadeDuration={300} source={{ uri: floorPlate.image.url }} onLoadEnd={imageLoaded(index, floorPlate)} key={floorPlate?.url}
        imageStyle={{ resizeMode: "contain" }}>
        <View style={{ backgroundColor: 'black' }} >
          <View>{listItems}</View>
          {/* {drawUnits(index, item)} */}
          {index === markerSelectedSlide ? Arr : null}
        </View>
      </ImageView>
      // </ImageZoom>
    )
  }

  //////////////////X, Y value mapper methods /////////////////////
  const calculateXForStop1 = (x, imageWidth, adjest) => {
    return calculateXForStopNew(x, imageWidth, adjest)
  }

  const calculateYForStop1 = (y, imageHeight, adgast, imageContanierHeight) => {
    return calculateYForStopNew(y, imageHeight, adgast, imageContanierHeight)
  }

  const rmCurrencySymbol = (currency) => {
    return Number(currency.replace(/[^0-9\.-]+/g, ""));
  }
  /////////////////////Filter//////////////
  const unitSortHandler = () => {
    setisModalVisible(false)
    // if (Singleton.getInstance().getIsSitemap() === false) {
      if (radiuSelectedValue === 0) {
        unitList.sort((a, b) => rmCurrencySymbol(a.effective_rent) > rmCurrencySymbol(b.effective_rent))
      } else if (radiuSelectedValue === 1) {
        unitList.sort((a, b) => rmCurrencySymbol(a.effective_rent) < rmCurrencySymbol(b.effective_rent))
      } else if (radiuSelectedValue === 2) {
        unitList.sort((a, b) => new Date(...a.available_date_for_filter.split('/').reverse()) - new Date(...b.available_date_for_filter.split('/').reverse()));
      } else if (radiuSelectedValue === 3) {
        unitList.sort((a, b) => new Date(...b.available_date_for_filter.split('/').reverse()) - new Date(...a.available_date_for_filter.split('/').reverse()));
      }
    // } else {
    //   if (radiuSelectedValue === 0) {
    //     unitList.sort((a, b) => rmCurrencySymbol(a.effective_rent) > rmCurrencySymbol(b.effective_rent))
    //   } else if (radiuSelectedValue === 1) {
    //     unitList.sort((a, b) => rmCurrencySymbol(a.effective_rent) < rmCurrencySymbol(b.effective_rent))
    //   } else if (radiuSelectedValue === 2) {
    //     unitList.sort((a, b) => new Date(...a.available_date_for_filter.split('/').reverse()) - new Date(...b.available_date_for_filter.split('/').reverse()));
    //   } else if (radiuSelectedValue === 3) {
    //     unitList.sort((a, b) => new Date(...b.available_date_for_filter.split('/').reverse()) - new Date(...a.available_date_for_filter.split('/').reverse()));
    //   }
    // }
    initialDataSorted.current = true
  }

  const checkPricingModalHide1 = () => {
    setisModalVisible(false)
  }

  const showUnitPricingModel = (item) => {
    setpricingOptions(item.lease_pricing)
    setPriceListVisible(item.display_pricing_options)
    setisPriceModalVisible(true)
  }

  const sortByButtonPressed = () => {
    setisModalVisible(true)
  }

  const handleSlideChange = (index) => {
    setactiveSlide(index)
  }

  const heckPricingModalHide = () => {
    setisPriceModalVisible(false)
  }
  imageLoaded = (index, item) => {
  }

  const backPress = () => {
    navigation.goBack()
  }

  const backToReviewPress = () => {
    navigation.navigate("YourTour")
    //navigation.goBack()
  }

  const enderSeparator = () => {
    return (<View style={{ height: 1, width: "100%", backgroundColor: "gray", }} />);
  };

  const displayRent = (item) => {
    if (!item?.display_rent) return <Text style={{ marginLeft: wp('1%')}}></Text>
    return (
      <TouchableOpacity style={{ height: hp("2.5%")}} onPress={() => showUnitPricingModel(item)}>
        <Text style={{ color: "#89C765", textAlign: "center", textDecorationLine: 'underline', fontSize: wp('4%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{item.effective_rent}/month</Text>
      </TouchableOpacity>
    )
  }

  checkPricingModalHide = () => {
    setisPriceModalVisible(false)
  }

  return (
    <ImageBackground source={R.images.backgroundImage} style={styles.rootView}
      imageStyle={{
        resizeMode: "stretch"
      }}>
      <Header backBtnVisible={true} titleFontSize={16} title="Add units" navigation={navigation} onGoBack={() => {
        navigation.goBack()
        // if(navigation.goBack()){
        //   navigation.goBack()
        // }else{
        //   navigation.replace("Welcome");
        // }
        //props.navigation.replace("TourReview")
      }} />
      {/* <Spinner visible={isLoading} textStyle={{ color: '#FFF' }} /> */}
      <LoadingIndicator visible={isLoading} />
      <View style={styles.welcomeView}>
        <View style={{ width: wp('100%'), marginLeft: wp('2%'), marginTop: hp('0%'), marginBottom: hp('0.5') }}>
          <Text style={styles.floorPlanText}>{floorPlan.floorplan_name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: wp('100%'), paddingHorizontal: wp('2')}}>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: wp('28%') }}>
            {/* <Image source={R.images.bed} style={{ marginLeft: wp('1%'), width: wp("6.5%"), height: hp("4%"), resizeMode: "contain" }} /> */}
            <Icon name="bed" size={18} color="white" />
            <Text style={{ marginLeft: wp('2%'), color: "white", textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{floorPlan.bedrooms} Bed</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: wp('28%') }}>
            {/* <Image source={R.images.bath} style={{ width: wp("6.5%"), height: hp("4%"), resizeMode: "contain" }} /> */}
            <Icon name="bath" size={18} color="white" />
            <Text style={{ marginLeft: wp('2%'), color: "white", textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{floorPlan.bathrooms} Bath </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', width: wp('28%') }}>
            {/* <Image source={R.images.squ} style={{ width: wp("6.5%"), height: hp("3.5%"), resizeMode: "contain" }} /> */}
            <Icon name="expand" size={18} color="white" />
            <Text style={{ marginLeft: wp('2%'), color: "white", textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{floorPlan.square_feet} square feet</Text>
          </View>
        </View>
      </View>
      {/* <View style={{ marginTop: 0, height: hp('35%'), }}>
        <Carousel
          ref={c => { _carousel.current = c; }}
          style={{ width: wp("100%"), backgroundColor: 'red' }}
          data={floorPlatList}//image_list
          renderItem={({ item, index }) =>
            <View style={{ width: wp("100%") }}>
              <View style={{ width: wp("100%"), }}>
                {drawUnits(index, item)} */}
                {/* {isLoading === false ? */}
                {/* <ImageView ref={ref => ImageViewLocal = ref} resizeMode="contain" style={[{backgroundColor: 'blue', width: Dimensions.get("window").width, height: imageContanierHeight.current }]} fadeDuration={300} source={{ uri: item.image.url }} onLoadEnd={imageLoaded(index, item)} key={item.url}
                    imageStyle={{ resizeMode: "contain" }}>
                    <View style={{ backgroundColor: 'black' }} >
                      {drawUnits(index, item)}
                      {index === markerSelectedSlide ? Arr : null}
                    </View>
                  </ImageView> */}
                {/* : null}   */}
              {/* </View>
            </View>}
          sliderWidth={windowWidth}
          itemWidth={windowWidth}
          onSnapToItem={handleSlideChange}
        />
      </View> */}

      <ImageZoom cropWidth={Dimensions.get('window').width}
        cropHeight={hp('30')}
        imageWidth={wp('90')}
        imageHeight={hp('30')}
      >
        <ImageView
          resizeMode="contain"
          style={{ width: wp('90'), height: hp('30') }}
          source={{ uri: floorPlanImage }}
          defaultSource={R.images.placeholder} />
        {/* <Image style={{ width: wp('90'), height: hp('30'), resizeMode: 'contain' }}
            source={{ uri: floorPlatList[0].image?.url}} /> */}
      </ImageZoom>
      {/* <View style={{ width: wp('50%'), height: hp('3%'), alignItems: 'center', justifyContent: 'center', }}>
        {Singleton.getInstance().getIsSitemap() === false ? <Text style={styles.welcomeToTextView}> {activeSlide + 1} of {floorPlatList?.length} floors</Text> : null}
      </View> */}
      <View style={styles.availableView}>
        <View style={{ width: wp('50%'), justifyContent: 'flex-start'}}>
          <Text style={styles.welcomeToTextView}>Available units to visit</Text>
        </View>
        <View style={{ width: wp('50%'), alignItems: 'flex-end', }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: "center", justifyContent: "center", width: wp('30%'), }} onPress={sortByButtonPressed}>
            <Image source={R.images.arrow} style={{ width: wp("5%"), height: hp("3%"), resizeMode: "contain" }} />
            <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), lineHeight: wp('3.5%'), marginLeft: hp('1%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Sort By</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.container}>
        <View style={{ width: wp('100%'), marginTop: hp('1.2%'), height: .5, backgroundColor: 'white' }}></View>
        <FlatList
          ref={(ref) => { unitFlatListRef.current = ref; }}
          keyExtractor={item => item.id.toString()}
          extraData={selectedItem}
          scrollIndicatorInsets={{ right: 1 }} style={styles.flatListContainer} data={unitList} renderItem={({ item, index }) =>
            <View style={ {flex: 1, backgroundColor: "black"} }>
              <View style={styles.propertyNameContainerView}>
                <Text style={styles.item}>Apt: {item.unit_name} </Text>
                {displayRent(item)}
                {/* {Singleton.getInstance().getIsSitemap() === false ? <Text style={{ marginLeft: wp('1%'), marginTop: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Floor: {item.floor}</Text> : null}
                {Singleton.getInstance().getIsSitemap() === false ? <Text style={{ marginLeft: wp('1%'), marginTop: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Buildings: {item.building}</Text> : null} */}
              </View>
              {/* <View style={{ marginTop: hp('1%') }}>
                {displayRent(item)}
                <TouchableOpacity style={{ flexDirection: "column", width: wp("28%"), marginTop: hp('1'), height: hp("4%"), backgroundColor: "#89C765", alignItems: "center", justifyContent: "center" }} onPress={() => seeOnMap(item, index)}>
                  <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.2%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>SEE ON MAP</Text>
                </TouchableOpacity>
              </View> */}
              {/* <View style={{ margin: hp('1.15%'), width: wp('38%') }}> */}
                {/* <Text style={{ height: hp('1.8%'), marginLeft: wp('0%'), marginTop: hp('.5%'), color: "white", textAlign: 'left', fontSize: wp('3.6%'), lineHeight: wp('3.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Availability: {item.available_date}</Text> */}
                <TouchableOpacity style={{ flexDirection: "column", width: wp("85"), height: hp("4.5"), marginBottom: wp('2'), backgroundColor: item.is_unit_already_available ? "#c03b31" : "#89C765", alignSelf: 'center', alignItems: "center", justifyContent: "center" }} onPress={() => addOrRemoveUnit(item, index)}>
                  <Text style={{ color: 'black', textAlign: "center", fontSize: wp('4.5'), letterSpacing: -1, fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{item.is_unit_already_available ? '-  REMOVE FROM TOUR' : '+ ADD TO TOUR'}</Text> 
                </TouchableOpacity>
              {/* </View> */}
            </View>}
          ItemSeparatorComponent={renderSeparator}
          ListFooterComponent={renderSeparator} />
      </View>

      <View style={{  width: wp('85')}}>
        <TouchableOpacity style={[styles.actionBtnContainer, {marginVertical: hp(1)}]} onPress={backPress}>
          <Image source={R.images.floorPlan}
            style={[styles.actionBtnIcon, { tintColor: '#FFA500' }]} />
          <Text style={styles.actionBtnText}>ADD MORE FLOOR PLANS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtnContainer, {marginBottom: hp(3)}]} onPress={backToReviewPress}>
          <Image style={styles.actionBtnIcon} source={R.images.seeTourIcon} />
          <Text style={styles.actionBtnText}>DONE ADDING UNITS</Text>
        </TouchableOpacity>
      </View>
      <Dialog rounded={false} visible={isModalVisible} dialogTitle={<DialogTitle title="Sort Results By" />} footer={<DialogFooter>
        <View style={{ flexDirection: 'row', width: wp("80%"), marginTop: hp('0'), height: hp("8%"), alignItems: 'center', justifyContent: 'space-evenly' }}>
          <TouchableOpacity style={{ flexDirection: "column", width: wp("35%"), marginTop: hp('0'), height: hp("5%"), backgroundColor: "#D3D3D3", alignItems: "center", justifyContent: "center" }} onPress={checkPricingModalHide1}>
            <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.5%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: "column", width: wp("35%"), marginTop: hp('0'), height: hp("5%"), backgroundColor: "#89C765", alignItems: "center", justifyContent: "center" }} onPress={unitSortHandler}>
            <Text style={{ color: 'black', textAlign: "center", fontSize: wp('3.5%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>Sort Units</Text>
          </TouchableOpacity>
        </View>
      </DialogFooter>
      }
        dialogAnimation={new SlideAnimation({
          slideFrom: 'bottom',
        })} >
        <DialogContent style={{ height: hp('35%'), width: wp('80%') }}>
          <View>
            <RadioForm
              radio_props={radioPropsFinal}
              //   labelColor={'#50C900'} 
              buttonSize={16}
              style={{ marginTop: 10 }}
              buttonColor={'#6e6b6d'}
              initial={radiuSelectedValue}
              onPress={(value) => {
                setradiuSelectedValue(value)
                console.log(value)
              }} />
          </View>
        </DialogContent>
      </Dialog>
      <Dialog visible={isPriceModalVisible} dialogTitle={<DialogTitle title="Pricing Options" />} footer={<DialogFooter>
        <DialogButton text="OK" onPress={checkPricingModalHide} />
      </DialogFooter>
      }
        dialogAnimation={new SlideAnimation({
          slideFrom: 'bottom',
        })} >
        <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
          {(priceListVisible && pricingOptions.length > 0) ?
            <FlatList
              data={pricingOptions}
              renderItem={({ item }) =>
                <TouchableOpacity style={{ bottom: hp('1.5%') }} >
                  <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_option}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              } /> :
            <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>
              No pricing option available
            </Text>
          }

        </DialogContent>
      </Dialog>
      <CopyRight />
    </ImageBackground>
  );
}
export default ChoseTourStops;