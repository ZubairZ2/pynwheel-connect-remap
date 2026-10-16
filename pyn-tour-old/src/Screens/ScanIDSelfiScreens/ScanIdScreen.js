import React, { Component } from 'react';
import { RNCamera } from 'react-native-camera';
import { Text, View, Platform, ImageBackground, TouchableOpacity, SafeAreaView, PermissionsAndroid } from 'react-native';
import { Autocomplete, withKeyboardAwareScrollView } from "react-native-dropdown-autocomplete";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R from "../../assest/R";
import Spinner from "react-native-loading-spinner-overlay";
import { uploadPicture } from "../../Library/ServerCalls/API"
import CopyRight from "../../Library/Components/Copyright"
import Header from '../../Library/Components/Header/index'

//import { format } from 'util';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';
import LoadingIndicator from '../../Components/LoadingIndicator';


async function requestAll(storagePermission, cameraPermission) {
    var storageStatus, cameraStatus, locationStatus = " ";
    if (!storagePermission) {
        storageStatus = await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
    }
    if (!cameraPermission) {
        cameraStatus = await request(PERMISSIONS.ANDROID.CAMERA);
    }
    // if(!locationPermission){
    //  locationStatus= await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
    // }
    return { storageStatus, cameraStatus };
}

const cameraNotAuthorized = <Text style={{ color: "white" }} >Camera access was not granted. Please go to your phone's settings and allow camera access.</Text>;

class ScanIdScreen extends Component {

    constructor(props) {
        super(props);
        this.cameraPermission = false;
        this.camera = null;
        this.state = {
            isLoading: false,
            imageUri: null,
            photo: null,
            camera: {
                type: RNCamera.Constants.Type.back,
                flashMode: RNCamera.Constants.FlashMode.auto,
                barcodeFinderVisible: false
            }
        };
    }

    componentWillUnmount() {
        this.camera = null;
    }
    componentDidMount() {
        if (Platform.OS == "android") {
            this.checkPermissions();
        }
    }

    checkPermissions = () => {

        Promise.all([
            check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE),
            check(PERMISSIONS.ANDROID.CAMERA),
        ]).then(([storageStatus, cameraStatus]) => {
            if (storageStatus != "granted") {
                this.storagePermission = false;
            }
            if (cameraStatus != "granted") {
                this.cameraPermission = false;
            }
            requestAll(this.storagePermission, this.cameraPermission).then(status => {

                if (status.storageStatus == "granted") {
                    this.storagePermission = true;
                }
                if (status.cameraStatus == "granted") {
                    this.cameraPermission = true;
                }
            }).catch(error => console.log(error));

        });
    }

    uploadPicture() {
        this.setState({
            isLoading: true
        })
        uploadPicture(this.state.photo, "/api/v1/tours/1/save_user_id_card")
            //.then((res) => checkStatus(res))
            .then((res) => res.json())
            .then((res) => {
                console.log("response" + JSON.stringify(res));
            })
            .catch((e) => console.log(e))
            .done(console.log("Hello Moto"))
        this.setState({ isLoading: false })
        this.props.navigation.replace("SelfieScreen")
    }

    checkPermissionForAndroid = async () => {
        const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
        const storage = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        if (granted) {
            this.cameraPermission = true;
        }
        if (!storage) {
            const grantedStorage = PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
            if (grantedStorage) {
                this.storagePermission = true;
            }
        }
    }

    _onPictureSaved = (event) => {
        const data = event?.nativeEvent?.data ?? event?.data;
        if (!data?.uri) return console.warn('ScanId: Capture failed, no URI');
        this.setState({ photo: data.uri, imageUri: data });
        this.yesUploadImage();
    }

    async takePicture() {
        if (Platform.OS == "android") {
            this.checkPermissionForAndroid()
        }
        if ((Platform.OS == "ios" && this.camera) || (this.camera && Platform.OS == "android" && this.storagePermission && this.cameraPermission)) {
            try {
                await this.camera.takePictureAsync({ quality: 0.1, base64: true, fastMode: true, id: Date.now() });
            } catch (e) {
                console.warn('ScanId takePicture error:', e);
            }
        } else {
            alert("Please enable camera or storage permission from settings")
            console.warn('error')
        }
    }

    yesUploadImage() {
        // alert("yes upload image called")
        this.uploadPicture();
    }

    pendingView() {
        return (
            <View
                style={{ flex: 1, backgroundColor: 'lightgreen', justifyContent: 'center', alignItems: 'center', }}>
                <Text>Waiting</Text>
            </View>
        );
    }

    render() {
        const { navigation } = this.props;
        return (
            <View style={styles.container}>
                <Header backBtnVisible={true} title="SCAN YOUR ID" navigation={navigation} onGoBack={() => {
                    if (navigation.goBack()) {
                        navigation.goBack()
                    } else {
                        navigation.replace("Welcome");
                    }
                }} />
                {/* <Spinner
                    visible={this.state.isLoading}
                    animation={"fade"}
                    textStyle={{ color: '#FFF' }} /> */}
                <LoadingIndicator visible={this.state.isLoading}/>
                <RNCamera
                    captureAudio={false}
                    ref={ref => { this.camera = ref; }}
                    androidCameraPermissionOptions={{
                        title: 'Permission to use camera',
                        message: 'Portico need your permission to use your camera',
                        buttonPositive: 'Ok',
                    }}
                    defaultTouchToFocus
                    flashMode={this.state.camera.flashMode}
                    mirrorImage={false}
                    onFocusChanged={() => { }}
                    onZoomChanged={() => { }}
                    onPictureSaved={this._onPictureSaved}
                    style={styles.preview}
                    type={this.state.camera.type}
                />
                <ImageBackground source={R.images.overlay} style={[styles.overlay, styles.bottomOverlay]}
                    imageStyle={{ resizeMode: 'stretch' }} >
                    <View style={[styles.overlay, styles.bottomOverlay]}>
                        <View style={styles.messageContainer}>
                            <Text style={styles.messageText}> First, Please scan your ID by holding it face-up in the square below.</Text>
                        </View>
                        <TouchableOpacity style={styles.enterBarcodeManualButton} onPress={this.takePicture.bind(this)}>
                            <View style={styles.okButton}>
                                <Text style={styles.ok}>OK</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <CopyRight />
                </ImageBackground>
            </View>
        );
    }
}

const styles = {
    container: { flex: 1, backgroundColor: 'black' },
    backgroundImage: { flex: 1, width: null, height: null, },
    cameraLoading: { flex: 1, alignSelf: 'center' },
    cameraNotAuthorized: {
        padding: 20 * 2,
        paddingTop: 35 * 2
    },
    preview: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'black'},
    overlay: { position: 'absolute', padding: 16, right: 0, left: 0, alignItems: 'center' },
    cameraOverlay: { bottom: 0, width: wp("100%"), height: hp("90%"), flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    bottomOverlay: { bottom: 0, width: wp("100%"), height: hp("91%"), flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    enterBarcodeManualButton: { padding: 15, position: 'absolute', bottom: 20, },
    messageContainer: { width: wp('90%'), height: hp('8%'), position: 'absolute', top: hp('16%'), },
    okButton: { width: wp("95%"), height: hp("6.8%"), backgroundColor: "#D3D3D3", justifyContent: "center", alignItems: "center" },
    ok: { textAlign: 'center', color: 'black', fontSize: hp('1.8%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" },
    messageText: { fontSize: hp('2.1%'), color: 'white', marginLeft: wp('3%'), marginRight: wp('3%'), lineHeight: hp('3.2%'), textAlign: 'center', justifyContent: 'center', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", },
};

//export default withKeyboardAwareScrollView(ScanIdScreen);
export default ScanIdScreen;