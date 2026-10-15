import React, { Component } from 'react';
import { Image, ImageBackground, Platform, Text, TouchableOpacity, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import Spinner from "react-native-loading-spinner-overlay";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import R from "../../assest/R";

import Config from 'react-native-config';
import CopyRight from "../../Library/Components/Copyright";
import Header from '../../Library/Components/Header/index';
import { InitializeTourFromServer, getFloorPlansForEditTour, uploadPicture } from "../../Library/ServerCalls/API";
import Singleton from '../../Singleton';


class SelfieScreen extends Component {

    constructor(props) {
        super(props);
        this.camera = null;
        this.stopID = null,
            this.timerCount = 0,
            this.state = {
                timer: null,
                isLoading: false,
                cameraOverlyLiding: false,
                loadingText: "Please wait a moment...",
                imageUri: null,
                photo: null,
                camera: {
                    type: RNCamera.Constants.Type.front,
                    flashMode: RNCamera.Constants.FlashMode.auto,
                    barcodeFinderVisible: false
                }
            };
    }

    componentDidMount() {
        const { navigation } = this.props;
        this.stopID = navigation.getParam("stopData", null);
    }
    componentWillUnmount() {
        this.camera = null;
    }

    componentDidMount() {
        this.setState({ loadingText: "" })
    }
    //  uploadPicture(imageURl, endPoint) {
    //     let body = new FormData();
    //     body.append('image', { uri: imageURl, name: 'photo.png', filename: 'imageName.png', type: 'image/png' });
    //     body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    //     body.append('local_testing', true);
    //     let Url = `${ServerConfig.BaseURL}` + endPoint
    //     return fetch(Url, {
    //         method: 'POST',
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'multipart/form-data'
    //         },
    //         body: body
    //     })
    // }

    // Rough implementation. Untested.
    // uploadPicture() {
    //     // debugger
    //     this.setState({
    //         isLoading: true,
    //         cameraOverlyLiding: true
    //     })
    //     let body = new FormData();
    //     body.append('image', { uri: this.state.photo, name: 'photo.png', filename: 'imageName.png', type: 'image/png' });
    //     body.append('tour_user_id', Singleton.getInstance().getTourUserId());
    //     body.append('local_testing', true);
    //     let Url = "https://pynwheel-staging.herokuapp.com/api/v1/tours/1/save_user_selfie"

    //     timeout(7000, fetch(Url, {
    //         method: 'POST',
    //         headers: {
    //             'Accept': 'application/json',
    //             'Content-Type': 'multipart/form-data'
    //         },
    //         body: body
    //     }))
    //         .then(function (response) {

    //             alert('process response')

    //             this.setState({
    //                 isLoading: false
    //             })
    //             setTimeout(() => {
    //                 this.props.navigation.replace("TourReview")
    //             }, 800)

    //             // process response
    //         }).catch(function (error) {
    //             this.setState({ isLoading: false }),
    //                 alert('Something went wrong on server, please try again.')
    //             setTimeout(() => {
    //                 this.props.navigation.navigate("Home");
    //             }, 800)
    //             // alert('might be a timeout error')
    //             // might be a timeout error
    //         })
    // }

    uploadPicture() {
        this.setState({
            isLoading: true,
            cameraOverlyLiding: true
        })
        // debugger
        this.camera = null
        uploadPicture(this.state.photo, "/api/v1/tours/1/save_user_selfie")
            //.then((res) => checkStatus(res))
            .then((res) => res.json())
            .then((res) => {
                this.setState({
                    isLoading: false
                })
                // this.props.navigation.replace("TourReview")
                InitializeTourFromServer()
                    .then(response => response.json())
                    .then(responseJson => {
                        if ((typeof (responseJson) !== 'undefined') || responseJson !== null) {
                            Singleton.getInstance().setBedroomFilter(this.addAfter(responseJson.unit_bedrooms, 0, { id: 0, title: 'Any', value: 'any', is_selected: true }))
                            getFloorPlansForEditTour(4, 1, "any", "price_asc")
                                .then(response => response.json())
                                .then(responseJson1 => {
                                    console.log("responseJson.allow_tours_customization && responseJson1.floorplans.length > 0", responseJson.allow_tours_customization && responseJson1.floorplans.length > 0);
                                    // responseJson.allow_tours_customization && responseJson1.floorplans.length > 0 ? this.props.navigation.navigate("FloorPlatList1") : this.props.navigation.navigate("TourReview")
                                    this.props.navigation.navigate(responseJson.allow_tours_customization ? "CreateTour" : 'NonCustomTour') 
                                })
                                .catch(error => {
                                    console.log(error);
                                });
                        }
                        else { console.log('Selfie Screen Error on Response Screen') }
                    })
                //console.warn("response" + JSON.stringify(res));
            })
            .catch((e) => {
                this.setState({ isLoading: false })
                setTimeout(() => {
                    alert('Something went wrong, please try again.')
                    this.props.navigation.navigate("Home");
                }, 800)
            })
            // .done()
    }

    _onPictureSaved = (event) => {
        const data = event?.nativeEvent?.data ?? event?.data;
        if (!data?.uri) return console.warn('Selfie: Capture failed, no URI');
        this.setState({ photo: data.uri, imageUri: data });
        this.yesUploadImage();
    }

    async takePicture() {
        if (this.camera) {
            try {
                await this.camera.takePictureAsync({ quality: 0.1, base64: true, fastMode: true, id: Date.now() });
            } catch (e) {
                console.warn('Selfie takePicture error:', e);
            }
        } else {
            console.warn('error')
        }
    }

    addAfter(array, index, newItem) {
        return [
            ...array.slice(0, index),
            newItem,
            ...array.slice(index)
        ];
    }

    yesUploadImage() {
        this.uploadPicture();
    }

    pendingView() {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: 'lightgreen',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                <Text>Waiting</Text>
            </View>
        );
    }

    render() {
        const { navigation } = this.props;

        return (
            <View style={styles.container}>
                <Header backBtnVisible={true} title="TAKE A SELFIE" navigation={navigation} onGoBack={() => {
                    if (navigation.goBack()) {
                        navigation.goBack()
                    } else {
                        navigation.replace("Welcome");
                    }
                }} />
                <Spinner
                    textContent={"Please wait a moment..."}
                    visible={this.state.isLoading}
                    //animation= 'fade'
                    children={<ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
                        resizeMode: 'stretch'
                    }} >
                        <Image source={R.images.gifVerifying} style={styles.gifLoader} defaultSource={R.images.gifVerifying} />
                        {Config.ENV === 'lincoln' ? <Text style={styles.listText}>Verifying...</Text> : null}
                    </ImageBackground>} />
                <RNCamera
                    captureAudio={false}
                    ref={ref => { this.camera = ref; }}
                    defaultTouchToFocus
                    flashMode={this.state.camera.flashMode}
                    mirrorImage={false}
                    onFocusChanged={() => { }}
                    onZoomChanged={() => { }}
                    onPictureSaved={this._onPictureSaved}
                    style={styles.preview}
                    type={this.state.camera.type} />
                <ImageBackground source={R.images.overlay1} style={[styles.cameraOverlay, styles.overlay]}
                    imageStyle={{
                        resizeMode: 'stretch'
                    }} >
                    <View style={[styles.bottomOverlay, styles.overlay]}>
                        <View style={styles.messageContainer}>
                            <Text style={styles.messageText}>Please press "ok" below to take a picture of yourself for ID verification.</Text>
                        </View>
                        <TouchableOpacity style={styles.enterBarcodeManualButton} onPress={this.takePicture.bind(this)}>
                            <View style={styles.okButton}>
                                <Text style={styles.ok}>OK</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <CopyRight />
                </ImageBackground>
                {this.state.cameraOverlyLiding ? <View style={{
                    width: wp("100%"),
                    height: hp("91%"),
                    backgroundColor: 'black',
                    Opacity: 0
                }}></View> : null}
            </View>
        );
    }
}

const styles = {

    backgroundImage: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: null,
        height: null,
    },

    container: {
        flex: 1,
        backgroundColor: 'black'
    },
    preview: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'black',

    },
    overlay: {
        position: 'absolute',
        padding: 16,
        right: 0,
        left: 0,
        alignItems: 'center'
    },
    cameraOverlay: {
        bottom: 0,
        width: wp("100%"),
        height: hp("91%"),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    bottomOverlay: {
        bottom: 0,
        width: wp("100%"),
        height: hp("90%"),
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    enterBarcodeManualButton: {
        padding: 15,
        //backgroundColor: 'white',
        position: 'absolute',
        bottom: 20,
        borderRadius: 40
    },

    messageContainer: {
        width: wp('90%'),
        height: hp('8%'),
        position: 'absolute',
        top: hp('16%'),
        // aspectRatio: 2.7/1,
    },
    gifLoader: {
        width: Config.ENV === 'lincoln' ? wp("70%") : wp("100%"),
        height: Config.ENV === 'lincoln' ? hp("30%") : hp("100%"),
        marginBottom: Config.ENV === 'lincoln' ? hp("3%") : 0,
        resizeMode: 'contain',
    },

    okButton: {
        width: wp("95%"),
        height: hp("6.8%"),
        backgroundColor: "#D3D3D3",
        justifyContent: "center",
        alignItems: "center"
    },

    ok: {
        textAlign: 'center',
        color: 'black',
        fontSize: hp('1.8%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },

    messageText: {
        fontSize: hp('2.1%'),
        color: 'white',
        marginLeft: wp('3%'),
        marginRight: wp('3%'),
        lineHeight: hp('3.2%'),
        textAlign: 'center',
        justifyContent: 'center',
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },

    listText:
    {
        fontSize: hp('3%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: 'white',
        textAlign: 'center',
    }

};

//export default withKeyboardAwareScrollView(SelfieScreen);
export default SelfieScreen;