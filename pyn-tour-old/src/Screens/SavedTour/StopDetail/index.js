import Moment from 'moment';
import React, { PureComponent } from "react";
import { Animated, Dimensions, FlatList, Image, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View, } from "react-native";
import ImageZoom from 'react-native-image-pan-zoom';
import ImageView from "react-native-image-progress";
import Dialog, { DialogButton, DialogContent, DialogFooter, DialogTitle, SlideAnimation, } from 'react-native-popup-dialog';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { WebView } from 'react-native-webview';

import CopyRight from "../../../Library/Components/Copyright";
import R from "../../../assest/R";

import LoadingIndicator from '../../../Components/LoadingIndicator';
import Header from '../../../Library/Components/Header';
import { customWebviewFontCSS } from '../../../Utils/Helpers';
import { calculateXForStop, calculateYForStop } from "../../TourMapScreen/TourmapScreenHelper";

export default class StopDetail extends PureComponent {

    state = {
        mapImage: "",
        floorPlanGallery: [],
        floorplateImage: "",
        imageContanierHeight: 300,
        isLoading: true,
        isModalVisible: false,
        stopLoacationX: 0,
        stopLoacationY: 0,
        pricingOptions: null,
        showMoreButton: false,
        windowWidth: Dimensions.get('window').width,
        _carousel: null,
        categes: [],
        galleryData: [],
        change: false,
        activeSlide: 0,
        activeSlideUserGallery: 0,
        activeSlideFloorPlan: 0,
        selectedTab: '',
        stopType: "",
        isModalUnit: false,
        showApplyNow:false
    }

    constructor() {
        super()
        this.ImageZoom = null;
        this.ImageViewLocal = null;
        this.markerHeight = 25;
        this.markerWidth = 19;
        this.imageWidth = 1
        this.imageHeight = 1
        this.handleSlideChange = this.handleSlideChange.bind(this);
        this.handleSlideChangeUserGallery = this.handleSlideChangeUserGallery.bind(this);
        this.handleSlideChangeFloorPlan = this.handleSlideChangeFloorPlan.bind(this);

        this.fadeAnim1 = new Animated.Value(0)
        this.fadeAnim2 = new Animated.Value(0)
        this.fadeAnim3 = new Animated.Value(0)
        this.fadeAnim4 = new Animated.Value(0)
        this.fadeAnim5 = new Animated.Value(0)
        this.fadeAnim6 = new Animated.Value(0)
        this.selectedViewOpicity = ""
    }

    //////////////////Default/////////////////////
    componentDidMount() {
        // debugger
        const { navigation } = this.props;
        const stopData = navigation.getParam('stopData', '');
        const showApply = navigation.getParam('showApply');
        this.setState({showApplyNow:showApply});
        this.ChangeThisTitle("FLOOR PLAN")
        if (typeof (stopData !== 'undefined')) {
            this.setUnitData(stopData);
            this.tabData(stopData);
        }
    }

    tabData = (stopData) => {
        // debugger
        if (stopData.floorplan_image.length > 0 && typeof (stopData.floorplan_image) !== 'undefined')
            this.state.categes.push({ cat_id: '1', type: 'FLOORPLAN', cat_name: 'FLOOR\nPLAN', backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.floorplanicon })
        if (stopData.gallery.length > 0 && typeof (stopData.gallery) !== 'undefined')
            this.state.categes.push({ cat_id: '2', type: 'IMAGES', cat_name: 'IMAGES', backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.imagesicons })
        if (stopData.video_link !== "" && typeof (stopData.video_link) !== 'undefined')
            this.state.categes.push({ cat_id: '3', type: 'VIDEO', cat_name: stopData.video_link_button_label, backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.playicon })
        if (stopData.user_gallery_v1.length > 0 && typeof (stopData.user_gallery_v1) !== 'undefined')
            this.state.categes.push({ cat_id: '4', type: 'MYPHOTOS', cat_name: 'MY\nPHOTOS', backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.cameraIcon })
        if (stopData.notes_v1.length > 0 && typeof (stopData.notes_v1.length) !== 'undefined')
            this.state.categes.push({ cat_id: '5', type: 'MYNOTES', cat_name: 'MY\nNOTES', backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.notesIcon })
        if (stopData.floorplate_image !== "" && typeof (stopData.floorplate_image) !== 'undefined')
            this.state.categes.push({ cat_id: '6', type: 'MAP', cat_name: 'MAP', backgroundcolor: 'rgba(52, 52, 52, 0)', buttonicon: R.images.locationIcon })
        if (this.state.categes.length > 0) {
            this.state.categes[0].backgroundcolor = 'black'
            this.setState({ selectedTab: this.state.categes[0].type })
        }
    }

    setUnitData = (stopData) => {
        this.setState({
            isLoading: false,
            //mapImage: stopData.floorplan_image,
            floorPlanGallery: stopData.floorplan_image,
            floorplateImage: stopData.floorplate_image,
            stopDescription: stopData.stop_description,
            showMoreButton: stopData.show_long_stop_description,
            galleryData: stopData.gallery,
            userGallery: stopData.user_gallery_v1,
            videoButtonTitle: stopData.video_link_button_label,
            videoLink: stopData.video_link,
            notesDataArray: stopData.notes_v1,
            stopType: stopData.type,
            isModalUnit: stopData.modal_unit
        })
        if (stopData.type === 'unit') {
            this.setState({
                pricingOptions: stopData.stop_data.lease_pricing.sort(function (a, b) { return a - b }),
                effectiveRent: stopData.stop_data.effective_rent,
                availableDate: stopData.stop_data.available_date === null ? "N/A" : Moment(stopData.stop_data.available_date).format('D, MMM Y').toString(),
                availabilityUrl: stopData.stop_data.availability_url,
            })
        }
        this.stopData = stopData;
        // debugger
        this.ChangeThisTitle(this.stopData.type === 'unit' ? 'UNIT ' + this.stopData.name : this.stopData.name)
        if (typeof (stopData.floorplate_image) !== 'undefined' && stopData.floorplate_image !== "") {
            this.calculateImageSize(stopData.floorplate_image);
        }
    }

    changeBackground = item => {
        let categes = JSON.parse(JSON.stringify(this.state.categes));
        for (let x = 0; x < this.state.categes.length; x++) {
            if (this.state.categes[x].cat_id == item.cat_id) {
                categes[x].backgroundcolor = 'black';
                this.setState({ categes: categes, });
            } else {
                categes[x].backgroundcolor = 'rgba(52, 52, 52, 0)';
                this.setState({ categes: categes, });
            }
        }
        this.setState({ selectedTab: item.type })
        if (item.type === "IMAGES") {
            this.setState({ activeSlide: 0 }) // on active reset previous index
        }
    };

    onBackPress = () => {
        this.props.navigation.goBack()
    }

    ////////////////////Helper Mothods////////////////
    handleSlideChange(index) {
        this.setState({ activeSlide: index, });
    }

    handleSlideChangeUserGallery(index) {
        this.setState({ activeSlideUserGallery: index, });
    }

    handleSlideChangeFloorPlan(index) {
        this.setState({ activeSlideFloorPlan: index, });
    }

    resetMapZoomLevel = () => {
        if (this.ImageZoom !== null) {
            this.ImageZoom.reset();
        }
    }

    //////////////////X, Y value mapper methods /////////////////////
    calculateXForStop = (x, isForNextStop) => {
        return calculateXForStop(x, this.imageWidth, isForNextStop)
    }

    calculateYForStop = (y, isForNextStop) => {
        return calculateYForStop(y, this.imageHeight, this.state.imageContanierHeight, isForNextStop)
    }

    ChangeThisTitle = (titleText) => {
        const { setParams } = this.props.navigation;
        setParams({ title: titleText })
    }

    calculateImageSize = (image) => {
        //this.setState({ isLoading: true })
        Image.getSize(
            image,
            (width, height) => {
                this.setState({
                    imageContanierHeight: height * (Dimensions.get("window").width / width),
                    isLoading: false,
                });
                this.imageWidth = width
                this.imageHeight = height
                this.drawPoints()
            },
            error => {
                this.setState({ isLoading: false })
                console.warn("Could not get the image size:" + error.message);
            }
        );
    }

    ////////////Button actions /////////////
    checkPricing = () => {
        this.setState({ isModalVisible: true });
    }

    checkPricingModalHide = () => {
        this.setState({ isModalVisible: false });
    }

    fadeIn(opicity) {
        Animated.timing(opicity, {
            toValue: 1,
            duration: 1000
        }).start(() => { this.fadeIn1(opicity) });
    };

    fadeIn1(opicity) {
        // // debugger
        // this.selectedViewOpicity = new Animated.Value(0)
        // this.selectedViewOpicity = opicity
    }

    fadeOut(opicity) {
        Animated.timing(opicity, {
            toValue: 0,
            duration: 500
        }).start(() => { });
    };
    renderItemDescription = (item) => {
        return item?.description !== "" &&
            <View style={{ height: hp('20') }}>
                <View style={{ marginLeft: wp('3%'), alignItems: 'flex-start', justifyContent: 'flex-start', }}>
                    <Text style={{ marginTop: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>DESCRIPTION</Text>
                    <Text style={{ marginTop: hp('.5%'), color: "white", textAlign: 'left', fontSize: wp('4.6%'), lineHeight: 25, fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{item?.description} {item?.show_long_description ? <Text onPress={() => this.showMore(item?.long_stop_description)} style={{ color: "rgb(52, 124, 178)", fontSize: wp('5%'), }}>. . . More {'>'} </Text> : null}</Text>
                </View>
            </View>
    }
    renderUnitDescription = (itemType) => {
        return this.state.stopDescription !== "" ? <View style={{ height: hp('20'), width: '100%' }}>
            {itemType === 'FLOORPLAN' ?
                <View style={{ flex: 1 }}>
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
                                ${this.stopData?.long_stop_description}
                            </body>`
                        }}
                        androidHardwareAccelerationDisabled={true} />
                </View> :
                <View style={{ marginLeft: wp('3%'), alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                    <Text style={{ marginTop: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>DESCRIPTION</Text>
                    <Text style={{ marginTop: hp('.5%'), color: "white", textAlign: 'center', fontSize: wp('4.6%'), lineHeight: 25, fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{this.state.stopDescription.slice(0, 140)} {this.state.showMoreButton ? <Text onPress={() => this.showMore(this.stopData?.long_stop_description)} style={{ color: "rgb(52, 124, 178)", fontSize: wp('5%'), }}>. . . More {'>'} </Text> : null}</Text>
                </View>
            }
        </View> : null
    }

    selectItems = item => {
        switch (this.state.selectedTab) {
            case 'FLOORPLAN':
                // this.fadeOut(this.fadeAnim2)
                this.fadeIn(this.fadeAnim1)
                this.fadeAnim2 = new Animated.Value(0)
                this.fadeAnim3 = new Animated.Value(0)
                this.fadeAnim4 = new Animated.Value(0)
                this.fadeAnim5 = new Animated.Value(0)
                this.fadeAnim6 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim1, position: "absolute", top: 10, alignItems: 'flex-start', justifyContent: 'flex-start', }}>
                    {this.renderUnitDescription('FLOORPLAN')}
                    <Text style={{ marginLeft: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>FLOOR PLAN</Text>
                    <Carousel
                        data={this.state.floorPlanGallery}
                        renderItem={({ item }) => (
                            <ImageView resizeMode="contain" key={item.url}
                                style={{ width: wp('92%'), height: hp('35%'), resizeMode: "contain", marginLeft: hp('1%'), marginTop: hp('1%') }}
                                source={{ uri: item.url }}>
                            </ImageView>
                        )}
                        sliderWidth={this.state.windowWidth}
                        itemWidth={this.state.windowWidth}
                        onSnapToItem={this.handleSlideChangeFloorPlan}
                    />
                    <Pagination
                        dotsLength={this.state.floorPlanGallery.length}
                        activeDotIndex={this.state.activeSlideFloorPlan}
                        dotStyle={{ top: 0, width: 10, height: 10, borderRadius: 5, marginHorizontal: -4, backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
                        inactiveDotStyle={{}}
                        containerStyle={{ alignSelf: 'center' }}
                        inactiveDotOpacity={0.4}
                        inactiveDotScale={0.6}
                    />
                </Animated.View>
                // break;
            case 'IMAGES':
                // this.fadeOut(this.fadeAnim1)
                this.fadeIn(this.fadeAnim2)
                this.fadeAnim1 = new Animated.Value(0)
                this.fadeAnim3 = new Animated.Value(0)
                this.fadeAnim4 = new Animated.Value(0)
                this.fadeAnim5 = new Animated.Value(0)
                this.fadeAnim6 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim2, position: "absolute", top: 10, alignItems: 'flex-start', justifyContent: 'flex-start', }}>
                    {this.renderItemDescription(this.state?.galleryData[this.state?.activeSlide])}
                    <Text style={{ marginLeft: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>IMAGES</Text>
                    <Carousel
                        data={this.state.galleryData}
                        renderItem={({ item }) => (
                            <ImageView resizeMode="contain" key={item.image}
                                style={{ width: wp('92%'), height: hp('35%'), resizeMode: "contain", marginLeft: hp('1%'), marginTop: hp('1%') }}
                                source={{ uri: item.image }}>
                            </ImageView>
                        )}
                        sliderWidth={this.state.windowWidth}
                        itemWidth={this.state.windowWidth}
                        onSnapToItem={this.handleSlideChange}
                    />
                    <Pagination
                        dotsLength={this.state.galleryData.length}
                        activeDotIndex={this.state.activeSlide}
                        dotStyle={{ top: 0, width: 10, height: 10, borderRadius: 5, marginHorizontal: -4, backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
                        inactiveDotStyle={{}}
                        containerStyle={{ alignSelf: 'center' }}
                        inactiveDotOpacity={0.4}
                        inactiveDotScale={0.6}
                    />
                </Animated.View>
                // break;
            case 'VIDEO':
                this.fadeIn(this.fadeAnim3)
                this.fadeAnim1 = new Animated.Value(0)
                this.fadeAnim2 = new Animated.Value(0)
                this.fadeAnim4 = new Animated.Value(0)
                this.fadeAnim5 = new Animated.Value(0)
                this.fadeAnim6 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim3, position: "absolute", top: 10, width: wp('100%'), height: hp('45%'), backgroundColor: 'transparent' }}>
                    {this.renderUnitDescription()}
                    <Text style={{ marginLeft: wp('2%'), color: "white", textAlign: 'left', fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{this.state.videoButtonTitle}</Text>
                    <WebView style={{ backgroundColor: 'transparent', marginLeft: 10, marginRight: 10, marginTop: hp('1%') }}
                        source={{ uri: this.state.videoLink }}
                        onNavigationStateChange={this.handleWebViewNavigationStateChange}
                        onLoadEnd={this.loadEnded}
                        onError={this.loadError}
                        onHttpError={this.loadError1}
                        allowsInlineMediaPlayback={true}
                    />
                </Animated.View>
                // break;
            case 'MYPHOTOS':
                this.fadeIn(this.fadeAnim4)
                this.fadeAnim1 = new Animated.Value(0)
                this.fadeAnim2 = new Animated.Value(0)
                this.fadeAnim3 = new Animated.Value(0)
                this.fadeAnim5 = new Animated.Value(0)
                this.fadeAnim6 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim4, position: "absolute", top: 10, alignItems: 'flex-start', justifyContent: 'flex-start', }}>
                    {this.renderUnitDescription()}
                    <Text style={{ marginLeft: hp('1%'), color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>MY PHOTOS</Text>
                    <Carousel
                        data={this.state.userGallery}
                        renderItem={({ item }) => (
                            <ImageView resizeMode="contain" key={item.image.url}
                                style={{ width: wp('92%'), height: hp('35%'), resizeMode: "contain", marginLeft: hp('1%'), marginTop: hp('1%'), }}
                                source={{ uri: item.image.url }}>
                            </ImageView>
                        )}
                        sliderWidth={this.state.windowWidth}
                        itemWidth={this.state.windowWidth}
                        onSnapToItem={this.handleSlideChangeUserGallery}
                    />
                    <Pagination
                        dotsLength={this.state.userGallery.length}
                        activeDotIndex={this.state.activeSlideUserGallery}
                        dotStyle={{ top: 0, width: 10, height: 10, borderRadius: 5, marginHorizontal: -4, backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
                        inactiveDotStyle={{}}
                        containerStyle={{ alignSelf: 'center' }}
                        inactiveDotOpacity={0.4}
                        inactiveDotScale={0.6}
                    />
                </Animated.View>
                // break;
            case 'MYNOTES':
                this.fadeIn(this.fadeAnim5)
                this.fadeAnim1 = new Animated.Value(0)
                this.fadeAnim2 = new Animated.Value(0)
                this.fadeAnim3 = new Animated.Value(0)
                this.fadeAnim4 = new Animated.Value(0)
                this.fadeAnim6 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim5, position: "absolute", top: 10, width: wp('100%'), height: hp('45%') }}>
                    {this.renderUnitDescription()}
                    <Text style={{ marginLeft: wp('2%'), color: "white", textAlign: 'left', fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>MY NOTES</Text>
                    <FlatList style={styles.flatListContainer} data={this.state.notesDataArray} renderItem={({ item, index }) =>
                        <View style={styles.renderItemcontainer}>
                            <View style={styles.occupySuperContainerView}>
                                <View style={styles.propertyNameContainerView}>
                                    <Text style={styles.item} multiline={true}>{item.note}</Text>
                                    <Text style={styles.itemDate}>{item.event_time}</Text>
                                </View>
                            </View>
                        </View>
                    }
                        ItemSeparatorComponent={this.renderSeparator}
                        ListFooterComponent={this.renderSeparator} />
                </Animated.View>
                // break;
            case 'MAP':
                this.fadeIn(this.fadeAnim6)
                this.fadeAnim1 = new Animated.Value(0)
                this.fadeAnim2 = new Animated.Value(0)
                this.fadeAnim3 = new Animated.Value(0)
                this.fadeAnim4 = new Animated.Value(0)
                this.fadeAnim5 = new Animated.Value(0)
                return <Animated.View style={{ opacity: this.fadeAnim6, position: "absolute", top: 10, width: wp('100%'), height: hp('45%') }}>
                    {this.renderUnitDescription()}
                    <Text style={{ marginLeft: wp('2%'), marginBottom: wp('1%'), color: "white", textAlign: 'left', fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>MAP</Text>
                    <View style={{ height: this.state.imageContanierHeight, justifyContent: 'center', }}>
                        {/* <ImageZoom ref={ref => this.ImageZoom = ref} cropWidth={Dimensions.get('window').width} cropHeight={hp('45%')} imageWidth={Dimensions.get("window").width} backgroundColor="green" imageHeight={this.state.imageContanierHeight}>
                                {this.state.isLoading === false ?
                                    <ImageView ref={ref => this.ImageViewLocal = ref} resizeMode="contain" style={[{ width: Dimensions.get("window").width, height: this.state.imageContanierHeight, }]} fadeDuration={300} source={{ uri: this.state.floorplateImage }} onLoadEnd={this.imageLoaded} key={this.state.mapImage}
                                        imageStyle={{ resizeMode: "contain" }}>
                                        {this.state.showDirText ? <View >
                                            <Image
                                                style={{ height: this.markerHeight, width: this.markerWidth, position: "absolute", left: this.state.userLoacationX, top: this.state.userLoacationY, }}
                                                source={R.images.user}
                                            />
                                            <Image
                                                style={{ height: 35, width: 35, position: "absolute", left: this.state.nextStopX, top: this.state.nextStopY, }}
                                                source={R.images.gifPulse}
                                            />
                                        </View> : null}
                                    </ImageView>
                                    : null}
                            </ImageZoom> */}
                        <ImageZoom ref={ref => this.ImageZoom = ref} cropWidth={Dimensions.get('window').width} cropHeight={this.state.imageContanierHeight} imageWidth={Dimensions.get("window").width} imageHeight={this.state.imageContanierHeight}>
                            {this.state.isLoading === false ?
                                <ImageView ref={ref => this.ImageViewLocal = ref} resizeMode="contain" style={[{ width: Dimensions.get("window").width, height: this.state.imageContanierHeight, }]} fadeDuration={300} source={{ uri: this.state.floorplateImage }} onLoadEnd={this.imageLoaded} key={this.state.floorplateImage}
                                    imageStyle={{ resizeMode: "contain" }}>
                                    <View >
                                        <Image
                                            style={{ height: 35, width: 35, position: "absolute", left: this.state.stopLoacationX, top: this.state.stopLoacationY, }}
                                            source={R.images.gifPulse}
                                        />
                                    </View>
                                </ImageView>
                                : null}
                        </ImageZoom>
                    </View>
                </Animated.View>
                // break;
            default:
            // Alert.alert("NUMBER NOT FOUND");
        }
    }

    imageLoaded = () => {
        console.log("imageLoaded")
        this.drawPoints()
    }

    showMore = (long_stop_description) => {
        if (long_stop_description) {
            this.props.navigation.navigate("PrivacyPolicy", { title: "Description", des: long_stop_description });
        }
    }

    applyForUnit = () => {
        // debugger
        if (this.stopData.update_apply) {
            this.props.navigation.navigate("ApplyForUnit", { applyUnit: this.stopData })
        } else {
            if (this.stopData.availability_url) {
                this.props.navigation.navigate("WebView", { title: '', applyUnitURL: this.stopData.availability_url })
            } else {
                alert("Services not available.")
            }
        }
    }

    //////////// *****UI****** /////////////
    drawPoints() {
        // debugger
        this.setState({
            stopLoacationX: this.calculateXForStop(typeof (this.stopData.x_plot) !== 'undefined' ? this.stopData.x_plot : 1),
            stopLoacationY: this.calculateYForStop(typeof (this.stopData.y_plot) !== 'undefined' ? this.stopData.y_plot : 1),
        })
    }
    displayPrice = () => {
        if (!this.stopData?.stop_data?.display_rent) return null
        return (
            <View style={{ marginLeft: wp('3'), alignItems: 'flex-start', justifyContent: 'center' }}>
                <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>PRICE</Text>
                <Text onPress={() => this.checkPricing()} style={{ marginTop: hp('.6'), textDecorationLine: 'underline', color: "rgb(52, 124, 178)", textAlign: "center", fontSize: wp('5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{this.state.effectiveRent}</Text>
            </View>
        )
    }

    render() {
        return (
            <View style={styles.container}>
                <ImageBackground source={R.images.backgroundImage} style={styles.backGroundImage}
                    imageStyle={{ resizeMode: "stretch" }}>
                    <Header backBtnVisible={true}
                        title={this.props.navigation?.state?.params?.title?.toUpperCase()}
                        onGoBack={this.onBackPress} />
                    {/* <Spinner visible={this.state.isLoading} textStyle={styles.spinnerTextStyle} /> */}
                    <LoadingIndicator visible={this.state.isLoading}  />
                    <View style={styles.tabButtonsView}>
                        {this.state.categes.map((item, key) => (
                            <View style={{ height: hp('10%'), flex: 1 }}>
                                <TouchableOpacity style={{ backgroundColor: item.backgroundcolor, flexDirection: 'column', alignItems: "center", height: hp('10%') }}
                                    onPress={() => this.changeBackground(item)}>
                                    <Image source={item.buttonicon}
                                        style={{ marginTop: hp('1.2'), width: wp("6.5%"), height: hp("4%"), resizeMode: "contain" }} />
                                    <Text style={{ color: "white", lineHeight: wp('3.5%'), marginTop: hp('.5%'), textAlign: "center", fontSize: wp('2.9%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{item.cat_name}</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={{ backgroundColor: 'black', flexDirection: 'row', height: hp('.1') }}></View>
                    {(this.state.stopType === 'unit' && !this.state.isModalUnit) ? <View style={{ flexDirection: 'row', height: hp('10') }}>
                        {this.displayPrice()}
                        <View style={{ marginLeft: wp('10'), alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Text style={{ color: "white", textAlign: "center", fontSize: wp('3%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>AVAILABLE</Text>
                            <Text style={{ marginTop: hp('.6'), color: "white", textAlign: "center", fontSize: wp('5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>{this.state.availableDate}</Text>
                        </View>
                        <View style={{ marginLeft: wp('10'), alignItems: 'center', justifyContent: 'center', width: wp('25%') }}>
                            {this.state.showApplyNow &&
                                <TouchableOpacity style={{ justifyContent: "center", alignItems: "center", backgroundColor: "white", height: hp('4%'), width: "100%", }} onPress={() => this.applyForUnit()}>
                                    <Text style={{ fontSize: wp("3.5%") }}>APPLY</Text>
                                </TouchableOpacity>
                            }
                        </View>
                    </View> : null}

                    <View style={{ marginLeft: wp('0%'), height: hp('50%'), width: wp('100%') }}>
                        {this.selectItems()}
                    </View>
                </ImageBackground>
                <Dialog visible={this.state.isModalVisible} dialogTitle={<DialogTitle title="Pricing Options" />} footer={<DialogFooter>
                    <DialogButton text="OK" onPress={() => { this.checkPricingModalHide() }} />
                </DialogFooter>
                }
                    dialogAnimation={new SlideAnimation({
                        slideFrom: 'bottom',
                    })} >
                    <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
                        {(this.stopData?.stop_data?.display_pricing_options && this.state.pricingOptions?.length > 0) ?
                            <FlatList
                                data={this.state.pricingOptions}
                                renderItem={({ item }) =>
                                    <TouchableOpacity style={{ bottom: hp('1.5%') }} >
                                        <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                                            <View style={{ justifyContent: 'center' }}>
                                                <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_option}</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                }>
                            </FlatList> :
                            <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>
                                No pricing option available
                            </Text>
                        }
                    </DialogContent>
                </Dialog>
                <CopyRight />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#F5FCFF" },
    backGroundImage: { backgroundColor: 'black', flex: 1, flexDirection: 'column' },
    titleText: { color: "white", textAlign: "center", lineHeight: hp('2.5%'), fontSize: wp('4.5%'), marginLeft: wp('6%'), marginRight: wp('6%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" },
    tabButtonsView: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', },
    flatListContainer: { flex: 1, },
    renderItemcontainer: { flex: 1, flexDirection: 'row', },
    occupySuperContainerView: { width: wp('100%'), paddingLeft: wp('2%'), paddingTop: wp('5%'), paddingBottom: wp('5%'), },
    propertyNameContainerView: { flex: -1, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', },
    item: { fontSize: 18, justifyContent: 'center', color: 'white', fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", },
    itemDate: { fontSize: 14, justifyContent: 'center', color: 'gray', top: 8, fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", },
});
//913