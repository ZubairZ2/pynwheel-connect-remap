import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, Image, Alert, ImageBackground, Animated } from 'react-native';
import R from '../../assest/R';
import { setOnboardingCount } from './../../redux/actions/persistPropertyAction'

import { useDispatch, useSelector } from 'react-redux';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { NavigationActions, StackActions } from 'react-navigation';
import AppUpgrateView from "../../Library/Components/AppUpgrateView"
import { getAppStoreVersionFromServer } from '../../Library/ServerCalls/API';
import * as Constants from '../../Utils/Constants'


const Launch = ({ navigation }) => {
    const dispatch = useDispatch();
    const loginStaus = useSelector(state => state.persistReducer && state.persistReducer.userLoginState);
    const onboarding = useSelector(state => state.persistReducer && state.persistReducer.onboardingCount);
    const barWidth = useRef(new Animated.Value(200)).current;
    const [updateAppView, setUpdateAppView] = useState(true);
    const [appStoreLink, setAppStoreLink] = useState(false);

    useEffect(() => {

        // debugger
        Animated.timing(barWidth, {
            toValue: 100,//progress,
            duration: 1000,//animDuration,
            useNativeDriver: false,
        }).start(() => { 
            checkAppVersionFromStore()
         });
    }, []);

    const checkAppVersionFromStore = () => {
        getAppStoreVersionFromServer()
            .then(response => response.json())
            .then(responseJson => {
                // debugger
                if (typeof (responseJson.data.allow_usage) !== "undefined") {
                    setUpdateAppView(responseJson.data.allow_usage)
                    setAppStoreLink(responseJson.data.redirect_url)
                    // console.log("redirect_url", responseJson.data.redirect_url)
                    checkUserStatus(responseJson.data.allow_usage)
                }
            })
            .catch(error => {
                setTimeout(() => {
                    alert(Constants.SERVER_ERROR_MESSAGE)
                }, 800);
                console.log(error);
            });
    };


    const resetNavigate = (routeName, params) => {
        const resetAction = StackActions.reset({
            index: 0,
            actions: [NavigationActions.navigate({ routeName, params: params })],
        });
        navigation.dispatch(resetAction)
    }

    const checkUserStatus = (isAllow) => {
        if (isAllow) {
            if (onboarding < 3) {
                resetNavigate("OnboardingScreen");
                dispatch(setOnboardingCount(onboarding + 1))
            } else {
                // navigation.navigate("TourHistory")
                if (loginStaus === true) {
                    resetNavigate("WelcomeTour")
                } else {
                    resetNavigate("LoginWithPhone")
                }
            }
        }
    }
    return (
        <>
            {updateAppView === false ? <AppUpgrateView storeUrl={appStoreLink} /> :
                <ImageBackground source={R.images.bg} style={styles.bgContanier}
                    imageStyle={{ resizeMode: "stretch", }}>
                    <Animated.View style={{ marginTop: barWidth }}>
                        <Image source={R.images.tourLogoWhite}
                            style={styles.logoImage} />
                    </Animated.View>
                </ImageBackground>
            }
        </>
    );
};

const styles = StyleSheet.create({
    bgContanier: {
        flex: 1,
        alignItems: 'center',
    },
    container: {
        marginTop: hp('0%'),
    },
    logoImage: {
        width: wp("94%"),
        height: hp('18%'),
        marginTop: hp('20%'),
        resizeMode: "contain",
    },

    spinnerTextStyle: { color: '#FFF' },
});

export default Launch;