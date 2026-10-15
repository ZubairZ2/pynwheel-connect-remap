// This file is possibly not in use

import React from 'react';
import ImageView from "react-native-image-progress";
//import Icon from "react-native-vector-icons/FontAwesome";
import Icon from 'react-native-vector-icons/FontAwesome';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { View, Text, ListView, Image, Platform, ImageBackground, StyleSheet, FlatList, TouchableOpacity, Dimensions } from 'react-native';
import Dialog, { SlideAnimation, DialogContent, DialogTitle, DialogFooter, DialogButton, } from 'react-native-popup-dialog';

import R from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import Singleton from "../../../Singleton"
import Header from '../../../Library/Components/Header/index'

export default class SavedTourSearchScreen extends React.Component {

  // static navigationOptions = ({ navigation }) => {
  //   const { state } = navigation;
  //   return {
  //     title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title,
  //     //title: `${state.params.title}`,
  //   };
  // };

  constructor() {
    super();
    this.value = null
    this.state = {
      _carousel: null,
      gallery: [],
      windowWidth: Dimensions.get('window').width,
      activeSlide: 0,
      selectedImageText: null,
      title: null,
      isUnit: false,
      isModalVisible: false,
      pricingOptions: [],
      showMoreButton : false,
      long_stop_description: ""
      //willShowCamaraButton: Singleton.getInstance().getTourSetting().show_camera_button,
    };
    this.handleSlideChange = this.handleSlideChange.bind(this);
  }

  componentWillMount() {
    const { navigation } = this.props;
    this.value = navigation.getParam("stopData", null);
    // debugger
    if (this.value.type === "unit") {
      this.setState({
        unitID: this.value.unit_id,
        floorPlanName: this.value.stop_data.floorplan,
        pricingOptions: this.value.stop_data.lease_pricing.sort(function (a, b) { return a - b }),
      })
    }

    this.setState({
      isUnit: this.value.type,
      gallery: this.value.gallery,
      selectedImageText: this.value.gallery.length == 0 ? "" : this.value.gallery[0].description,
      title: this.value.name,
      showMoreButton: this.value.gallery.length == 0 ? "" : this.value.gallery[0].show_long_description,
      long_stop_description: this.value.gallery.length == 0 ? "" : this.value.gallery[0].long_stop_description      ,
    });
  }

  // ChangeThisTitle = (titleText) => {
  //   const { setParams } = this.props.navigation;
  //   setParams({ title: this.state.title })
  // }

  galleryLeftButtonPressed = () => {
    this._carousel.snapToPrev();
  }

  galleryRightButtonPressed = () => {
    this._carousel.snapToNext();
  }

  checkPricing = () => {
    this.setState({ isModalVisible: !this.state.isModalVisible });
  }

  pressRefresh = () => {
    this.props.navigation.navigate("CheckUnitAvailaibility", { floorPlanName: this.state.floorPlanName, unitID: this.value.floorplan_id, navigationForm: "TourHighLightStopScreen" })
  }

  pressNotes = () => {
    Singleton.getInstance().setReloadTourHighlights(true)
    this.props.navigation.navigate('Notes', {
      //stopData: this.state.isFromUnit ? this.state.stopID : this.state.tourStopsData.id
      stopData: this.value.id
    });
  }

  pressCemra = () => {
    Singleton.getInstance().setReloadTourHighlights(true)
    this.props.navigation.navigate('Camera', {
      //stopData: this.state.isFromUnit ? this.state.stopID : this.state.tourStopsData.id
      stopData: this.value.id
    });
  }

  showMore = () => {
    //alert('hello')
    // debugger
    this.props.navigation.navigate("PrivacyPolicy", { title: "Detail", des: this.state.long_stop_description });
    //this.props.navigation.navigate("Chat")
    //<Text onPress={this.showMore} style = {{ color: "red" }}>. . . More {'>'} </Text>
  }

  handleSlideChange(index) {
    this.setState({
      activeSlide: index,
      selectedImageText: this.state.gallery[index].description,
      showMoreButton: this.state.gallery[index].show_long_description,
      long_stop_description: this.value.gallery[index].long_stop_description,
    });
  }

  render() {
    const { navigation } = this.props;
    return (
      <View style={{ flex: 1 }} >
        <ImageBackground source={R.images.backgroundColor} style={styles1.backgroundImage}
          imageStyle={{
            resizeMode: 'stretch'
          }} >
            <Header backBtnVisible={true} title= {this.state.title} navigation={navigation} onGoBack={()=>{
          if(navigation.goBack()){
            navigation.goBack()
          }else{
            navigation.replace("Welcome");
          }
        }} />
          <View style={{ flex: .14, flexDirection: "row" }}>
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: .2, opacity: 0 }}>
              <TouchableOpacity onPress={() => this.galleryLeftButtonPressed()}>
                {/* <Icon name="arrow-left" size={20} color="white" /> */}   
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: "center", justifyContent: "center", flex: .8 }}>
              <Text style={{ color: "white", textAlign: "center", fontSize: wp('4.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> {this.state.selectedImageText} { this.state.showMoreButton ? <Text onPress={this.showMore} style = {{ color: "rgb(120, 117, 255)" }}>. . . More {'>'} </Text> : null } </Text>
            </View>
            <View style={{ alignItems: 'center', justifyContent: 'center', flex: .2, opacity: 0 }}>
              <TouchableOpacity onPress={() => this.galleryRightButtonPressed()}>
                {/* <Icon name="arrow-right" size={20} color="white" /> */}
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flex: .8, flexDirection: 'column', alignContent: 'center', justifyContent: 'flex-start' }}>
            <Carousel
              ref={c => {
                this._carousel = c;
              }}
              data={this.state.gallery}
              renderItem={({ item }) => (
                <ImageView style={{ flex: 0.8, width: null, height: null,
                }}
                  source={{ uri: item.image }} />
              )}
              sliderWidth={this.state.windowWidth}
              itemWidth={this.state.windowWidth}
              onSnapToItem={this.handleSlideChange}
            />
            <Pagination
              dotsLength={this.state.gallery.length}
              activeDotIndex={this.state.activeSlide}
              dotStyle={{ top: hp('-12%'), width: 10, height: 10, borderRadius: 5, marginHorizontal: 8, backgroundColor: 'rgba(255, 255, 255, 0.92)'
              }}
              inactiveDotStyle={{
                // Define styles for inactive dots here
              }}
              inactiveDotOpacity={0.4}
              inactiveDotScale={0.6}
            />
          </View>
          {this.state.isUnit == "unit" ?
            <View style={styles1.bottomUnitButtonsView}>
              <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('30%'), }} onPress={() => this.checkPricing()}>
                  <Image
                    source={Singleton.getInstance().getCurrencySymbol() === '£'?R.images.poundIcon:R.images.dollar}
                    style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain", }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHECK{"\n"}PRICING</Text>
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('30%'), }} onPress={() => this.pressRefresh()}>
                  <Image source={R.images.refreshIcon} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHECK{"\n"}AVAILABILITY</Text>
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", height: hp('10%'), width: wp('21%') }}
                  onPress={() => this.pressNotes()}>
                  <Image source={R.images.notesIcon}
                    style={{ width: wp("7%"), height: hp("7%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", lineHeight: wp('3.5%'), marginTop: hp('-1%'), textAlign: "center", fontSize: wp('2.7%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>ADD{"\n"}NOTES</Text>
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", justifyContent: 'flex-start', height: hp('10%'), width: wp('21%'), }}
                  onPress={() => this.pressCemra()}>
                  <Image source={R.images.cameraIcon}
                    style={{ width: wp("7%"), height: hp("7%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('-1%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>TAKE{"\n"}PHOTOS</Text>
                </TouchableOpacity>
              </View>
            </View>
            : <View style={{ flex: .2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' }}>
              <View style={{ backgroundColor: "black", height: hp('10%'), width: wp('41%'), alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", height: hp('10%'), width: wp('41%') }}
                  onPress={() => this.pressNotes()}>
                  <Image
                    // animation="pulse" easing="ease-in-back" iterationCount="infinite"
                    source={R.images.notesIcon}
                    style={{ width: wp("7%"), height: hp("7%"), resizeMode: "contain" }}
                  />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> ADD NOTES </Text>
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black", height: hp('10%'), width: wp('41%'), alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={{ flexDirection: 'column', alignItems: "center", height: hp('10%'), width: wp('41%'), }}
                  onPress={() => this.pressCemra()}>
                  <Image
                    // animation="pulse" easing="ease-in-back" iterationCount="infinite"
                    source={R.images.cameraIcon}
                    style={{ width: wp("7%"), height: hp("7%"), resizeMode: "contain" }} />
                  <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}> TAKE PHOTOS </Text>
                </TouchableOpacity>
              </View>
            </View>}
          <CopyRight />

        </ImageBackground>
        <Dialog visible={this.state.isModalVisible} dialogTitle={<DialogTitle title="Pricing Options" />} footer={<DialogFooter>
          <DialogButton text="OK" onPress={() => { this.checkPricing() }} />
        </DialogFooter>
        }
          dialogAnimation={new SlideAnimation({
            slideFrom: 'bottom',
          })} >
          <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
            <FlatList
              data={this.state.pricingOptions}
              renderItem={({ item }) =>
                <TouchableOpacity style={{ bottom: hp('1.5%') }} >
                  <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                    {/* <SwipeView onSwipedLeft={() => this.deleteItemById(item.id)}> */}
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_option}</Text>
                    </View>
                    {/* </SwipeView> */}
                  </View>
                </TouchableOpacity>
              }>
            </FlatList>
          </DialogContent>
        </Dialog>
      </View>
    );
  }
}

const styles1 = StyleSheet.create({
  image: { width: '100%', height: 200,},
  listItem: {},
  backgroundImage: { flex: 1, backgroundColor: "black", width: null, height: null,},
  bottomUnitButtonsView: { flex: .2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  pricingView: { backgroundColor: "black", height: hp('10%'), width: wp('27%'), alignItems: "center", justifyContent: "center" },
  pricingTouchableOpacity: { alignItems: "center", justifyContent: "center" },
  refreshView: { backgroundColor: "black", height: hp('10%'), width: wp('27%'), alignItems: "center", justifyContent: "center" },
  refreshTouchableOpacity: { alignItems: "center", justifyContent: "center" },
});