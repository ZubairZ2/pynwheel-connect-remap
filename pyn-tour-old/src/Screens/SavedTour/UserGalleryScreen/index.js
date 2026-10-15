import React, { Component } from 'react';
import ImageView from "react-native-image-progress";
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { View, Text, Dimensions, Platform, ImageBackground } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';


import R, { } from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import Header from '../../../Library/Components/Header/index'

class index extends Component {
  constructor(props) {
    super(props);
    this.userGalleryDataArray = null
    this.state = {
      windowWidth: Dimensions.get('window').width,
      activeSlide: 0,
      galleryData: null
    };
    this.handleSlideChange = this.handleSlideChange.bind(this);
  }

  componentWillMount() {
    const { navigation } = this.props;
    this.userGalleryDataArray = navigation.getParam("userGalleryDataArray", null);
    // debugger
    this.setState({
      galleryData: this.userGalleryDataArray,
    })
  }

  handleSlideChange(index) {
    this.setState({ activeSlide: index });
  }

  render() {
    const { navigation } = this.props;

    return (
      <View style={{ flex: .8, alignContent: 'center', justifyContent: 'flex-start' }}>
        <ImageBackground source={R.images.backgroundImage} style={{ flex: 1, backgroundColor: "black", width: wp('100%'), height: hp('100%'), }}
          imageStyle={{
            resizeMode: 'stretch'
          }} >
          <Header backBtnVisible={true} title="User Gallery" navigation={navigation} onGoBack={() => {
            if (navigation.goBack()) {
              navigation.goBack()
            } else {
              navigation.replace("Welcome");
            }
          }} />
          <Text style={{ fontSize: 14, justifyContent: 'center', alignContent: 'flex-end', color: 'gray', textAlign: 'right', top: hp('7%'), right: 15,fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
          }}>{this.state.galleryData[this.state.activeSlide].event_time}</Text>
          <Carousel
            data={this.state.galleryData}
            renderItem={({ item }) => (
              <ImageView
                resizeMode="cover"
                style={{ top: hp("8%"),flex: 0.9,width: null,height: null,resizeMode: "contain",}}
                source={{ uri: item.image.url }}>
              </ImageView>
            )}
            sliderWidth={this.state.windowWidth}
            itemWidth={this.state.windowWidth}
            onSnapToItem={this.handleSlideChange}
          />
          <Pagination
            dotsLength={this.state.galleryData.length}
            activeDotIndex={this.state.activeSlide}
            dotStyle={{top: -12, width: 10,height: 10,borderRadius: 5,marginHorizontal: 8,backgroundColor: 'rgba(255, 255, 255, 0.92)'}}
            inactiveDotStyle={{
              // Define styles for inactive dots here
            }}
            inactiveDotOpacity={0.4}
            inactiveDotScale={0.6}
          />
          <CopyRight />
        </ImageBackground>
      </View>
    );
  }
}

export default index;
