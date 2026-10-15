
import { black } from 'ansi-colors';
import React, { Component, PureComponent } from 'react';
import ImageView from "react-native-image-progress";
//import { HeaderBackButton } from 'react-navigation';
import { StackActions, NavigationActions } from 'react-navigation';
import HeaderBackButton from 'react-navigation-stack';
import Icon from "react-native-vector-icons/FontAwesome";
import Spinner from "react-native-loading-spinner-overlay";
import { WebView } from 'react-native-webview';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Platform, StyleSheet, Text, View, FlatList, Image, ImageBackground, TouchableOpacity, Modal } from 'react-native';
import Dialog, { SlideAnimation, DialogContent, DialogTitle, DialogFooter, DialogButton, } from 'react-native-popup-dialog';

import R from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import { getFloorPlanFromServer } from '../../../Library/ServerCalls/API';
import Singleton from "../../../Singleton"
import Header from '../../../Library/Components/Header/index'

import Carousel, { Pagination } from 'react-native-snap-carousel';
import LoadingIndicator from '../../../Components/LoadingIndicator';


export default class FloorPlanList extends PureComponent {

    constructor() {
        super();
        var cellItem = null;
        var cellIndex = 0;
        var dataSetForOptionButton = []

        this.handleSlideChange = this.handleSlideChange.bind(this);
        this.state = {
            activeTour: null,
            tourStopsData: null,
            isLoading: false,
            showShareTourButton: false,
            isModalVisible: false,
            galleryData: [],
            activeSlide: 0,
            selectedFloorPalnName: "",
            showApplyNow: false
        };
    }

    // static navigationOptions = ({ navigation }) => {
    //   return {
    //     headerLeft: (<HeaderBackButton tintColor={'white'} onPress={() => { navigation.navigate("Home") }} />)
    //   }
    // }

    componentDidMount() {
        this.getFloorPlanData()
    }

    sharePressed = () => {
        this.props.navigation.navigate('Share', {
            tourID: this.state.activeTour.id
        });
    }

    getFloorPlanData = () => {
        this.setState({ isLoading: true });
        getFloorPlanFromServer()
            .then(response => response.json())
            .then(responseJson => {
                if (typeof (responseJson.floorplans) !== 'undefined' || responseJson.floorplans != null) {
                    this.setState({
                        tourStopsData: responseJson.floorplans,
                    });
                    // if (responseJson.tours.length > 0) {
                    //     var activeTourTemp = responseJson.tours[0]
                    //     this.setState({
                    //         activeTour: activeTourTemp,
                    //         tourStopsData: activeTourTemp.visited_tour,
                    //     });
                    // }
                    this.setState({ isLoading: false });
                } else {
                    this.showServerError()
                }
            })
            .catch(error => {
                this.showServerError()
            });
    };

    showServerError = () => {
        this.setState({ isLoading: false });
        this.setState({ message: " Server Error." })
        setTimeout(() => {
            alert('Server Error, Please try again.')
        }, 500);
    }

    cameraPressed = (index) => {
        this.props.navigation.navigate('UserGallery', {
            userGalleryDataArray: this.state.tourStopsData[index].user_gallery_v1
        });
    }
    notesPressed = (index) => {
        // debugger
        this.props.navigation.navigate('UerNote', {
            notesDataArray: this.state.tourStopsData[index].notes_v1
        });
    }

    handleSlideChange(index) {
        this.setState({ activeSlide: index, });
    }

    locationPressed = (index) => {
        this.props.navigation.navigate('MediaPlayer', { link: this.state.tourStopsData[index].video_link });
    }

    renderSeparator = () => {
        return (
            <View style={{ height: 1, width: "100%", backgroundColor: "gray", }}
            />
        );
    };

    pressRefresh = (item) => {
        // debugger
        this.props.navigation.push("CheckUnitAvailaibility", { floorPlanName: item.name, unitID: item.id, navigationForm: "FloorPlanListScreen", showApply: this.state.showApplyNow })
    }

    floorPlanGallery = (item) => {
        if (item.floorplan_images.length > 0) {
            this.setState({ isModalVisible: true })

            this.setState({
                galleryData: item.floorplan_images,
                selectedFloorPalnName: item.name
            });
        } else {
            alert('No floor plan image found.')
        }

    }

    checkPricingModalHide = () => {
        this.setState({ activeSlide: 0 });
        this.setState({ isModalVisible: false });
    }
    render() {
        const { navigation } = this.props;
        var showApplyNow = navigation.getParam("showApply", null);
        this.setState({showApplyNow: showApplyNow});
        console.log("showApplyNow1234", this.state.showApplyNow)


        return (
            <ImageBackground
                source={R.images.backgroundColor}
                style={{ resizeMode: "contain", flex: 1, flexDirection: "column", backgroundColor: "black", alignItems: "center" }}
                imageStyle={{ resizeMode: "stretch" }}>
                <Header backBtnVisible={true} title="AVAILABLE FLOOR PLAN" navigation={navigation} onGoBack={() => {
                    if (navigation.goBack()) {
                        navigation.goBack()
                    } else {
                        navigation.replace("Welcome");
                    }
                }} />
                {/* <Spinner visible={this.state.isLoading} textStyle={{ color: '#FFF' }} /> */}
                <LoadingIndicator visible={this.state.isLoading} />
                <View style={styles.container}>
                    <FlatList scrollIndicatorInsets={{ right: 1 }} style={styles.flatListContainer} data={this.state.tourStopsData} renderItem={({ item, index }) =>
                        <View style={styles.renderItemcontainer}>
                            <TouchableOpacity onPress={() => this.floorPlanGallery(item)} style={styles.occupySuperContainerView}>
                                <ImageView
                                    resizeMode="cover" style={styles.imageStyle} source={{ uri: item.thumbnail_image }} defaultSource={R.images.placeholder} key={this.state.thumbnail_image} />
                            </TouchableOpacity>
                            <View style={styles.propertyNameContainerView}>
                                <Text style={styles.item}> {item.name} </Text>
                                <Text style={{ fontSize: 14, top: 15, left: 5, color: 'gray', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" }}>{item.bedrooms_bathrooms}</Text>
                                <Text style={{ fontSize: 14, top: 20, left: 5, color: 'gray', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" }}>{item.square_footage}</Text>
                            </View>
                            <View style={styles.occupySuperContainerView}>
                                <View style={{ backgroundColor: "black" }}>
                                    <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", height: hp('10%'), width: wp('22%'), }} onPress={() => this.pressRefresh(item)}>
                                        <Image source={R.images.refreshIcon} style={{ width: wp("8%"), height: hp("6%"), resizeMode: "contain" }} />
                                        <Text style={{ color: "white", textAlign: "center", fontSize: wp('2.7%'), lineHeight: wp('3.5%'), marginTop: hp('0%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHECK{"\n"}AVAILABILITY</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>}
                        ItemSeparatorComponent={this.renderSeparator}
                        ListFooterComponent={this.renderSeparator} />
                </View>
                <Dialog
                    style={{ borderBottomColor: "red", borderBottomWidth: 50 }}
                    visible={this.state.isModalVisible} dialogTitle={<DialogTitle title={this.state.selectedFloorPalnName} />} footer={<DialogFooter>
                        <DialogButton text="OK" onPress={() => { this.checkPricingModalHide() }} />
                    </DialogFooter>}
                    dialogAnimation={new SlideAnimation({
                        slideFrom: 'bottom',
                    })} >
                    <DialogContent style={{ height: hp('45%'), width: wp('80%') }}>
                        <View style={{ height: hp('45%'), width: wp('70%'), }}>
                            <Carousel
                                data={this.state.galleryData}
                                renderItem={({ item }) => (
                                    <ImageView
                                        resizeMode="contain"
                                        style={{ flex: 1.0, width: wp('70%'), }}
                                        source={{ uri: item.imageURL }}>
                                    </ImageView>
                                )}
                                sliderWidth={400}
                                itemWidth={400}
                                // itemHeight={200}
                                onSnapToItem={this.handleSlideChange}
                            />
                            <Pagination
                                dotsLength={this.state.galleryData.length}
                                activeDotIndex={this.state.activeSlide}
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
}

// saveCurrentRowItemAndIndex(item, index) {

//     this.cellItem = item
//     this.cellIndex = index
//     this.dataSetForOptionButton = []

//     if (item.user_gallery.length > 0) {
//         this.dataSetForOptionButton.push({ key: 0, type: "camera" })
//     }
//     if (item.gallery.length > 0) {
//         this.dataSetForOptionButton.push({ key: 1, type: "search" })
//     }
//     if (item.notes.length > 0) {
//         this.dataSetForOptionButton.push({ key: 2, type: "notes" })
//     }
//     if (item.video_link !== "") {
//         this.dataSetForOptionButton.push({ key: 3, type: "location" })
//     }

// }



const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: wp('100%'),
        marginBottom: hp('2%')
    },
    flatListContainer: {
        flex: 2,
    },
    renderItemcontainer: {
        flex: 1,
        flexDirection: 'row',
    },
    occupySuperContainerView: {
        width: 100,
        height: 100,
        padding: 5,
    },

    propertyNameContainerView: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },

    optionsSubInternalContainer: {
        flex: 1,
        padding: 2,
    },

    optionsSubInternalContainerButton: {
        width: wp('11%'),
        height: hp('5%'),
        padding: 3,
        marginHorizontal: 3,
        backgroundColor: "black",
    },

    item: {
        // paddingLeft: 10,
        // paddingRight: 10,
        top: 10,
        fontSize: wp('3.5%'), //20,
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
        color: 'white',
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },

    touchableOpacityStyle: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: "100%",
        height: "100%",
    },
    imageStyle: {
        flex: 1,
        resizeMode: 'contain',
        width: "100%",
        height: "100%",
    },

    buttonText: {
        fontSize: 13,
        fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold",
    },
})  