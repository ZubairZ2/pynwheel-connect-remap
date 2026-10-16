import React from 'react';
import ImageView from 'react-native-image-progress';
// import Icon from "react-native-vector-icons/FontAwesome";
import {
  Animated,
  Dimensions,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
import Carousel, { Pagination } from 'react-native-snap-carousel';

import ChatButton from '../../../Library/Components/ChatButton';
import CopyRight from '../../../Library/Components/Copyright';
import GoButton from '../../../Library/Components/GoButton';
import Header from '../../../Library/Components/Header/index';
import VideoPlayButton from '../../../Library/Components/VideoPlayButton';
import Singleton from '../../../Singleton';
import R from '../../../assest/R';

const DIRECTIONAL_TEXT_LINES = 3

export default class index extends React.Component {
  // static navigationOptions = ({ navigation }) => {
  //   const { state } = navigation;
  //   return {
  //     title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title,
  //     //title: `${state.params.title}`,
  //   };
  // };

  constructor() {
    super();
    this.stopData = null;
    this.state = {
      _carousel: null,
      gallery: null,
      tourStopsData: null,
      windowWidth: Dimensions.get('window').width,
      activeSlide: 0,
      selectedImageText: null,
      title: null,
      isUnitEnd: false,
      floorName: '',
      isFromUnit: false,
      formPropertyMap: false,
      stopID: -1,
      applyUnitURL: '',
      unitID: -1,
      type: '',
      showMoreButton: false,
      long_description: '',
      truncatedText: '',
      descriptionOpacity: new Animated.Value(0),
    };
    this.handleSlideChange = this.handleSlideChange.bind(this);
  }

  componentWillMount() {
    // debugger;
    const { navigation } = this.props;
    this.stopData = navigation.getParam('stopData', null);
    this.unitData = navigation.getParam('unitData', '');
    console.log(this.stopData);
    //this.ChangeThisTitle(this.stopData.name)
    // debugger;
    this.setState({
      gallery: this.stopData.gallery,
      tourStopsData: this.stopData,
      title: this.stopData.name,
      isUnitEnd: navigation.getParam('isUnitEnd', false),
      floorName: navigation.getParam('floorName', ''),
      isFromUnit: navigation.getParam('isFromUnit', ''),
      formPropertyMap: navigation.getParam('formPropertyMap', ''),
      stopID: navigation.getParam('stopID', ''),
      unitID: navigation.getParam('unitID', ''),
      applyUnitURL: navigation.getParam('availabilityUrl', ''),

      type: this.stopData.type,
      willShowCamaraButton:
        Singleton.getInstance().getTourSetting().show_camera_button,
      willShowChatButton: Singleton.getInstance().getTourSetting().chat_control,
      selectedImageText:
        this.stopData.gallery.length == 0
          ? ''
          : this.stopData.gallery[0].description,
      // showMoreButton:
      //   this.stopData.gallery.length == 0
      //     ? ''
      //     : this.stopData.gallery[0].show_long_description,
      long_description:
        this.stopData.gallery.length == 0
          ? ''
          : this.stopData.gallery[0].long_description,
      // showMoreButton: this.stopData.show_long_description
    });
  }

  // ChangeThisTitle = (titleText) => {
  //   const { setParams } = this.props.navigation;
  //   setParams({ title: titleText.toUpperCase() })
  // }

  resetDescriptionText = () => {
    this.setState({ showMoreButton: false, truncatedText: '', descriptionOpacity: new Animated.Value(0) })
  }

  galleryLeftButtonPressed = () => {
    this._carousel.snapToPrev();
  };

  galleryRightButtonPressed = () => {
    //alert('Right Pressed')
    // this._carousel.onSnapToItem(this._carousel.activeDotIndex+1)
    this._carousel.snapToNext();
  };

  pressNotes = () => {
    Singleton.getInstance().setNotesClickIncrement();
    this.props.navigation.navigate('Notes', {
      stopData: this.state.isFromUnit
        ? this.state.stopID
        : this.state.tourStopsData.id,
    });
  };

  showDescriptionText() {
    Animated.timing(this.state.descriptionOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  pressCemra = () => {
    Singleton.getInstance().setCameraClickIncrement();

    this.props.navigation.navigate('Camera', {
      stopData: this.state.isFromUnit
        ? this.state.stopID
        : this.state.tourStopsData.id,
    });
  };

  pressVideo = () => {
    this.props.navigation.navigate('MediaPlayer', {
      link: this.state.tourStopsData.video_link,
    });
  };

  pressLetsGo = () => {
    // debugger;
    this.resetDescriptionText();
    console.log('Kalid' + this.state.applyUnitURL);
    if (this.state.isUnitEnd) {
      this.props.navigation.navigate('ThanksUnit', {
        floorPlanName: this.state.floorName,
        unitID: this.state.unitID,
        availabilityUrl: this.state.applyUnitURL,
        unitData: this.unitData,
      });
    } else {
      if (this.state.isFromUnit)
        Singleton.getInstance().setMoveToNextStopOnFloorPlan(true);
      else if (this.state.formPropertyMap)
        Singleton.getInstance().setShouldUserMoveToNextStop(true);
      else Singleton.getInstance().setShouldUserMoveToNextStopOnStopList(true);
      this.props.navigation.goBack();
    }
  };

  handleSlideChange(index) {
    this.setState({
      activeSlide: index,
      selectedImageText: this.state.gallery[index].description,
      // showMoreButton: this.state.gallery[index].show_long_description,
      long_description: this.state.gallery[index].long_description,
      truncatedText: '',
      showMoreButton: false,
      descriptionOpacity: new Animated.Value(0)
    });
  }

  pressChat = () => {
    this.props.navigation.navigate('Chat');
  };

  showMore = () => {
    //alert('hello')
    this.props.navigation.navigate('PrivacyPolicy', {
      title: 'Detail',
      des: this.state.long_description,
    });
    //this.props.navigation.navigate("Chat")
    //<Text onPress={this.showMore} style = {{ color: "red" }}>. . . More {'>'} </Text>
  };

  render() {
    console.log('this.state.selectedImageText', this.state.selectedImageText)
    const { navigation } = this.props;
    return (
      <View style={{ flex: 1, }}>
        <ImageBackground
          source={R.images.backgroundImage}
          style={styles1.backgroundImage}
          imageStyle={{
            resizeMode: 'stretch',
          }}>
          <Header
            backBtnVisible={true}
            title={this.state.title?.toUpperCase()}
            navigation={navigation}
            onGoBack={() => {
              this.resetDescriptionText();
              if (navigation.goBack()) {
                navigation.goBack();
              } else {
                navigation.replace('Welcome');
              }
            }}
          />
          <View
            style={{
              // flex: 0.14,
            }}>
            {/* <View style={{ alignItems: 'center', justifyContent: 'center', flex: .2, opacity: 0 }}>
              <TouchableOpacity onPress={() => this.galleryLeftButtonPressed()}>
                <Icon name="arrow-left" size={20} color="white" />
              </TouchableOpacity>
            </View> */}
            <View style={styles1.descriptionContainer}>
              {/* {this.state.activeSlide === 0?
              <View style={{flex:1,width:'100%'}}>
                <WebView
                style={{ backgroundColor: 'transparent' }}
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
                source={{
                    // html: `<>${this.stopData?.long_stop_description}` 
                    html: ` <head><meta content="initial-scale=1.1, maximum-scale=1.1" name="viewport"></meta>
                        <style>
                        ${customWebviewFontCSS()}
                        </style>
                        </head>
                        <body>
                            ${this.state.long_description}
                        </body>`
                }}
                androidHardwareAccelerationDisabled={true} />
                </View>
                : */}
              {this.state.selectedImageText ?
                <Animated.Text style={[styles1.titleText, 
                  { opacity: this.state.descriptionOpacity }
                ]}
                  onTextLayout={(e) => {
                    if (!this.state.truncatedText && e.nativeEvent.lines.length > DIRECTIONAL_TEXT_LINES) {
                      let text = e.nativeEvent.lines.map((line, index) => index < DIRECTIONAL_TEXT_LINES ? line.text : '').join('')
                      this.setState({
                        showMoreButton: true,
                        truncatedText: text.slice(0, -13)
                      })
                    }
                    this.showDescriptionText();
                  }}>
                  {this.state.showMoreButton ? this.state.truncatedText : this.state.selectedImageText}
                  {this.state.showMoreButton && <Animated.Text onPress={this.showMore} style={[styles1.titleText, styles1.showMoreText, { opacity: this.state.descriptionOpacity }]}>
                    {` . . . More >`}
                  </Animated.Text>}
                </Animated.Text> :
                <Text onPress={this.showMore} style={[styles1.titleText, { textAlign: 'center' }]}>
                  Please take a look around, take your own photos and add some notes if you’d like.
                </Text>
              }
              {/* <Text
                style={{
                  color: 'white',
                  paddingTop: 0,
                  // textAlign: 'center',
                  lineHeight: hp('2.5%'),
                  fontSize: wp('4%'),
                  marginLeft: wp(3),
                  marginRight: wp(3),
                  // marginVertical: hp('1'),
                  marginVertical: wp(3),
                  fontFamily:
                    Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
                }}>
                {this.state.selectedImageText ? this.state.showMoreButton
                  ? this.state.selectedImageText.slice(0, 115)
                  : this.state.selectedImageText : 'Please take a look around, take your own photos and add some notes if you’d like.'}{' '}
                {this.state.showMoreButton ? (
                  <Text
                    onPress={this.showMore}
                    style={{ color: 'rgb(120, 117, 255)' }}>
                    . . . More {'>'}{' '}
                  </Text>
                ) : null}{' '}
              </Text> */}
              {/* } */}
            </View>
            {/* <View style={{ alignItems: 'center', justifyContent: 'center', flex: .2, opacity: 0 }}>
              <TouchableOpacity onPress={() => this.galleryRightButtonPressed()}>
                <Icon name="arrow-right" size={20} color="white" />
              </TouchableOpacity>
            </View> */}
          </View>
          <View
            style={{
              flex: 1, 
              // flex: 0.8,
              flexDirection: 'column',
              alignContent: 'center',
              justifyContent: 'flex-start',
              marginBottom: hp(16) + (wp(32) * 0.7)
            }}>
            <Carousel
              ref={(c) => {
                this._carousel = c;
              }}
              style={{
                width: wp('100%'),
                height: hp('10%'),
                backgroundColor: 'red',
              }}
              data={this.state.gallery}
              renderItem={({ item }) => (
                <ImageView
                  style={{
                    width: wp('100%'),
                    height: hp('48%'),
                    resizeMode: 'contain',
                  }}
                  resizeMode="contain"
                  source={{ uri: item.image }}
                />
              )}
              sliderWidth={this.state.windowWidth}
              itemWidth={this.state.windowWidth}
              onSnapToItem={this.handleSlideChange}
            />
            <Pagination
              dotsLength={this.state.gallery.length}
              activeDotIndex={this.state.activeSlide}
              // containerStyle={{backgroundColor: 'green'}}
              dotStyle={{
                // top: hp('-11%'),
                width: 10,
                height: 10,
                borderRadius: 5,
                marginHorizontal: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
              }}
              inactiveDotStyle={
                {
                  // Define styles for inactive dots here
                }
              }
              inactiveDotOpacity={0.4}
              inactiveDotScale={0.6}
            />
          </View>
          {this.state.type === 'elevator' ? null : (
            <View
              style={{
                // flex: 0.2,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                position: 'absolute',
                bottom: hp(4),
                left: 0, 
                right: 0,
              }}>
              <View
                style={{
                  backgroundColor: 'black',
                  height: hp('10%'),
                  width: wp('41%'),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: hp('10%'),
                    width: wp('41%'),
                  }}
                  onPress={() => this.pressNotes()}>
                  <Animatable.Image
                    // animation="pulse" easing="ease-in-back" iterationCount="infinite"
                    source={R.images.notesIcon}
                    style={{
                      width: wp('7%'),
                      height: hp('7%'),
                      resizeMode: 'contain',
                    }}
                  />
                  <Text
                    style={{
                      color: 'white',
                      textAlign: 'center',
                      fontSize: wp('3%'),
                      fontFamily:
                        Platform.OS === 'android'
                          ? 'GothamLight'
                          : 'Gotham-Light',
                    }}>
                    {' '}
                    ADD NOTES{' '}
                  </Text>
                </TouchableOpacity>
              </View>
              {this.state.willShowCamaraButton ? (
                <View
                  style={{
                    backgroundColor: 'black',
                    height: hp('10%'),
                    width: wp('41%'),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'column',
                      alignItems: 'center',
                      height: hp('10%'),
                      width: wp('41%'),
                    }}
                    onPress={() => this.pressCemra()}>
                    <Animatable.Image
                      // animation="pulse" easing="ease-in-back" iterationCount="infinite"
                      source={R.images.cameraIcon}
                      style={{
                        width: wp('7%'),
                        height: hp('7%'),
                        resizeMode: 'contain',
                      }}
                    />
                    <Text
                      style={{
                        color: 'white',
                        textAlign: 'center',
                        fontSize: wp('3%'),
                        fontFamily:
                          Platform.OS === 'android'
                            ? 'GothamLight'
                            : 'Gotham-Light',
                      }}>
                      {' '}
                      TAKE PHOTOS{' '}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}
          {this.state.tourStopsData.video_link === '' ? null : (
            <VideoPlayButton
              title={this.state.tourStopsData.video_link_button_label}
              goPressed={() => this.pressVideo()}
            />
          )}

          {/* {this.state.willShowChatButton ?
            <View style={styles1.okbuttonContainer} >
              <TouchableOpacity  onPress={() => this.pressChat() }
                style={{ flex: 1 }}>
                <ImageBackground source={R.images.chatBtn} style={{ flex: 1, alignContent: 'center', justifyContent: 'center' }}
                  imageStyle={{
                    resizeMode: 'stretch'
                  }}>
                  <IconBadge
                    MainElement={
                      <View style={{
                        // backgroundColor: '#489EFE',
                        backgroundColor: 'green',
                        width: 50,
                        height: 0,
                        margin: 0
                      }} />
                    }
                    BadgeElement={
                      <Text style={{ color: '#FFFFFF' }}>{this.props.screenProps.unReadmessage}</Text>
                    }
                    IconBadgeStyle={{ width: 30, height: 30, marginTop: -30, backgroundColor: 'red' }
                    }
                    Hidden={this.props.screenProps.unReadmessage == 0}
                  />
                  <Image source={R.images.chat} style={{ alignSelf: 'center', width: 20, height: 20 }} />
                  <Text style={{ color: "white", textAlign: "center", marginTop: 8, fontSize: wp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHAT</Text>
                </ImageBackground>
              </TouchableOpacity>
            </View> : null} */}

          {this.state.willShowChatButton ? (
            <ChatButton goPressed={() => this.pressChat()} />
          ) : null}

          <GoButton goPressed={() => this.pressLetsGo()} />
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}

const styles1 = StyleSheet.create({
  image: {
    width: '100%',
    height: 200,
  },

  backgroundImage: {
    flex: 1,
    backgroundColor: 'black',
    width: null,
    height: null,
  },
  okbuttonContainer: {
    aspectRatio: 1.2 / 1,
    width: wp('32%'),
    position: 'absolute',
    //right: wp('0%'),
    left: wp('0'),
    bottom: hp('15%'),
  },
  descriptionContainer: {
    paddingTop: wp(3),
    paddingHorizontal: wp(3),
    height: hp(14),
  },
  titleText: {
    color: 'white',
    lineHeight: hp(2.6),
    fontSize: wp(4),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
    // width: '100%'
  },
  showMoreText: {
    color: 'rgb(120, 117, 255)',
    textAlign: 'right'
  },
});
