import React, { Component } from 'react';
import ImageView from "react-native-image-progress";
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { View, Text, Dimensions, Platform, ImageBackground } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import { FlatList } from 'react-native-gesture-handler';
import R, { } from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import GoButton from '../../../Library/Components/GoButton'

import Header from '../../../Library/Components/Header/index'


class index extends Component {
    constructor(props) {
        super(props);
        this.unitUnplotedAmenities = null
        this.userHaveVisitedUnplotedAmenities = false
        this.state = {
            windowWidth: Dimensions.get('window').width,
            activeSlide: 0,
            galleryData: null,
            selectedImageInCarosal: [],
            is_modal_unit:false
        };
        this.handleSlideChange = this.handleSlideChange.bind(this);
    }

    componentWillMount() {
        const { navigation } = this.props;
        this.unitUnplotedAmenities = navigation.getParam("unitUnplotedAmenities", null);
        let is_modal_unit = navigation.getParam("is_modal_unit", false);
        this.setState({is_modal_unit})
        var array = []
        for (let i = 0; i < this.unitUnplotedAmenities.length; i++) {
            array[i] = 0
        }
        //alert(this.userGalleryDataArray[0])
        // debugger
        this.setState({
            galleryData: this.unitUnplotedAmenities,
            selectedImageInCarosal: array
        })
    }

    nextButtonPressed = () => {

        this.props.navigation.goBack()
    }

    handleSlideChange(index, index1) {
        // debugger
        //console.log(index, index1)
        //this.setState({ activeSlide: index });
        var arr = this.state.selectedImageInCarosal
        arr[index1] = index
        this.setState({
            selectedImageInCarosal: arr
        })
        //selectedImageInCarosal[index1]
    }

    FlatListItemSeparator = () => {
        return (
            
            <View
                style={{
                    height: 1,
                    width: "100%",
                    backgroundColor: 'gray',
                }}
            />
        );
    }

    render() {
        const { navigation } = this.props;
        return (
            <View style={{ flex: 1, alignContent: 'center', justifyContent: 'flex-start' }}>
                <ImageBackground source={R.images.backgroundImage} style={{
                    flex: 1,
                    backgroundColor: "black",
                    width: wp('100%'),
                    height: hp('100%'),
                }}
                    imageStyle={{
                        resizeMode: 'stretch'
                    }} >
                         <Header backBtnVisible={true} 
                        //  title={this.state.is_modal_unit?"":"Unploted Amenities"} 
                         navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Welcome");
                        }
                    }} />
                    <FlatList scrollIndicatorInsets={{ right: 1 }}
                        data={this.state.galleryData}
                        //ItemSeparatorComponent={this.FlatListItemSeparator}

                        renderItem={({ item, index }) =>
                            <View style={{backgroundColor: "#1e1e1e", borderRadius:6, margin: 10}}>
                                <Text style={{ color: "white", textAlign: "center", fontSize: wp('6%'), lineHeight: wp('6%'), marginTop: hp('1.5%') }}>{item.name}</Text>
                                <Carousel
                                    //   ref={c => {
                                    //     this._carousel = c;
                                    //   }}
                                    data={item.gallery}
                                    layout={'tinder'} layoutCardOffset={`18`}
                                    renderItem={({ item }) => (
                                        <View style={{ justifyContent: 'center', width: wp('92%'), backgroundColor: "#1e1e1e", alignItems: 'center', height: hp('50%') }}>
                                            <Text style={{ color: "white", textAlign: "center", fontSize: wp('3.8%'), lineHeight: wp('5%'), marginTop: hp('.1%') }}>{item.description}</Text>
                                            <ImageView
                                                resizeMode="cover"
                                                style={{
                                                    top: hp("5%"),
                                                    flex: 0.9,
                                                    width: wp('92%'),
                                                    height: null,
                                                    //backgroundColor: 'blue',
                                                    resizeMode: "contain",
                                                }}
                                                source={{ uri: item.image }}>
                                            </ImageView>
                                        </View>
                                    )}
                                    sliderWidth={this.state.windowWidth}
                                    itemWidth={this.state.windowWidth}
                                    onSnapToItem={(index1) => this.handleSlideChange(index1, index)}
                                //onSnapToItem={this.handleSlideChange}
                                />
                                <Pagination
                                    containerStyle={{}}
                                    dotsLength={item.gallery.length}
                                    activeDotIndex={this.state.selectedImageInCarosal[index]}
                                    //activeDotIndex={0}
                                    dotStyle={{ top: hp('0%'), width: 10, height: 10, borderRadius: 5, marginHorizontal: 8, backgroundColor: 'rgba(79, 185, 248, 0.92)' }}
                                    inactiveDotStyle={{
                                        // Define styles for inactive dots here
                                    }}
                                    inactiveDotOpacity={0.4}
                                    inactiveDotScale={0.6} />
                            </View>
                        }>

                    </FlatList>
                    <GoButton disabled={this.diableNextButton} goPressed={() => this.nextButtonPressed()} />

                </ImageBackground>

            </View>
        );
    }
}

export default index;
