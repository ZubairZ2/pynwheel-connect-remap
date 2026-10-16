import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Image, ImageBackground, Platform, StatusBar, Text, TouchableOpacity, View } from "react-native";
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { useSelector } from 'react-redux';

import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { NavigationActions, StackActions } from "react-navigation";
import CopyRight from "../../Library/Components/Copyright";
import R from "../../assest/R";
import styles from "./styles";

const OnboardingScreen = ({ navigation }) => {
    const _carousel = useRef(null);
    const [activeSlideGallery, setactiveSlideGallery] = useState(0);
    const [nextButtonTitle, setnextButtonTitle] = useState("NEXT");
    const loginStaus = useSelector(state => state.persistReducer?.userLoginState);

    const communitiesList = useRef([
        {
            backgroundColor: 'red',
            image: R.images.imgSlide1,
            title: `Looking for a new place to call home?`,
            subtitle: `Schedule tours or visit at your leisure. Customize your tour with the units and amenities you want to see.`,
        },{
            backgroundColor: 'red',
            image: R.images.imgSlide4,
            title: 'Add your own photos and notes.',
            subtitle: 'A built in camera and notepad allow you to personalize your tour, which you can review at any time.',
        },{
        //     backgroundColor: 'red',
        //     image: R.images.imgSlide3,
        //     title: 'Can’t make it to the property? No problem - tour virtually!',
        //     subtitle: 'Take a virtual “walk” and see all the great features waiting for you.',
        // },{
            backgroundColor: 'red',
            image: R.images.imgSlide2,
            title: 'Access model units and common areas.',
            subtitle: ' Automated wayfinding, and onscreen access instructions will guide you through your tour.',
        },
    ]);
    useEffect(() => {
    }, []);

    const resetNavigate=(routeName,params)=>{
        const resetAction = StackActions.reset({
        index: 0,
        actions: [NavigationActions.navigate({ routeName, params: params })],
        });
        navigation.dispatch(resetAction)
    }
    ////////////Move Forward////////////////////
    function pressLetsGo() {
        if (loginStaus === true) {
            resetNavigate("WelcomeTour")
          } else {
            resetNavigate("LoginWithPhone")
          }
        // navigation.navigate("Welcome");
    };

    handleSlideChange1 = (index) => {
        if (index === 2) {
            setnextButtonTitle("LET'S START")
        } else {
            setnextButtonTitle("NEXT")
        }
        setactiveSlideGallery(index)
    }
    function pressPrevious() {
        _carousel.current.snapToItem(activeSlideGallery - 1, animated = true, fireCallback = true)
    }
    function pressNext() {
        _carousel.current.snapToItem(activeSlideGallery + 1, animated = true, fireCallback = true)
        if(activeSlideGallery === 2) {
            // navigation.navigate("Welcome");
            if (loginStaus === true) {
                resetNavigate("WelcomeTour")
              } else {
                resetNavigate("LoginWithPhone")
              }
        }
    }

    return (
        <ImageBackground source={R.images.backgroundImage} style={styles.mainContanier}
            imageStyle={{
                resizeMode: "stretch"
            }}>
 
            <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
            <View style={{ justifyContent: 'center', alignItems: 'flex-end', marginTop: hp('2%'), height: hp('10%'), width: wp('100%'), }}>
                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'center', height: hp('5%'), width: hp('10%') }} onPress={pressLetsGo}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            </View>
            <View style={{ height: hp('75%'), width: wp('100%'), }}>
                <Carousel
                    ref={c => { _carousel.current = c; }}
                    data={communitiesList.current}
                    layout="default"
                    layoutCardOffset={1}
                    renderItem={({ item }) => (
                        <View style={{flex:1, alignItems: 'center', }}>
                            <Image
                                resizeMode="cover"
                                style={{ width:wp(90),height:hp(44),resizeMode: "cover",borderRadius:wp(5)}}
                                source={item.image}>
                            </Image>
                            <View style={{ paddingLeft: wp('4.5%'), paddingRight: ('4.5%'), paddingTop: hp('2%') }}>
                                <Text style={{ color: "white", textAlign: "center", fontSize: wp('3.3%'), lineHeight: wp('5%'), fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold" }}>{item.title}</Text>
                                <Text style={styles.slideSubTitle}>{item.subtitle}</Text>
                            </View>
                        </View>
                    )}
                    sliderWidth={Dimensions.get('window').width}
                    itemWidth={Dimensions.get('window').width}
                    onSnapToItem={(index) => this.handleSlideChange1(index)}
                />
            </View>
            <View style={{ backgroundColor: 'white', height: .2, width: wp('100%'), }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: hp('0%'), height: hp('10%'), width: wp('100%'), }}>
                <TouchableOpacity style={{ justifyContent: 'center', alignItems: 'flex-start',paddingLeft:15, height: hp('5%'), width: hp('15%') }} onPress={pressPrevious}>
                    <Text style={styles.ok}>PREVIOUS</Text>
                </TouchableOpacity>
                <Pagination
                    containerStyle={{}}
                    dotsLength={communitiesList.current.length}
                    activeDotIndex={activeSlideGallery}
                    //activeDotIndex={0}
                    dotStyle={{ top: hp('0%'), width: 7, height: 7, borderRadius: 3.5, marginHorizontal: -10, backgroundColor: 'white' }}
                    inactiveDotStyle={{
                        // Define styles for inactive dots here
                    }}
                    inactiveDotOpacity={0.4}
                    inactiveDotScale={0.6} />
                <TouchableOpacity style={[[styles.slideNextBtn,activeSlideGallery===2&&{ backgroundColor: "#7cc060",width: hp('13%'),marginRight:hp(1) }]]} onPress={pressNext}>
                    <Text style={[styles.ok,activeSlideGallery===2&&{fontWeight:'bold',fontSize:12}]}>{nextButtonTitle}</Text>
                </TouchableOpacity>
            </View>
            <CopyRight />
        </ImageBackground>
    );
}
export default OnboardingScreen

OnboardingScreen['navigationOptions'] = screenProps => ({
    header: null
})
