import React, { Component } from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Animated
} from 'react-native';
import ImageZoom from 'react-native-image-pan-zoom';
import ImageView from 'react-native-image-progress';
import Spinner from 'react-native-loading-spinner-overlay';
import Dialog, {
    DialogButton,
    DialogContent,
    DialogFooter,
    DialogTitle,
    SlideAnimation,
} from 'react-native-popup-dialog';
import {
    heightPercentageToDP as hp,
    widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

import Carousel, { Pagination } from 'react-native-snap-carousel';
import { connect } from 'react-redux';
import ChatButton from '../../Library/Components/ChatButton';
import CopyRight from '../../Library/Components/Copyright';
import GoButton from '../../Library/Components/GoButton';
import VideoPlayButton from '../../Library/Components/VideoPlayButton';
import Singleton from '../../Singleton';
import R from '../../assest/R';

import Header from '../../Library/Components/Header';
import { calculateXForStop, calculateYForStop } from './TourmapScreenHelper';
import LoadingIndicator from '../../Components/LoadingIndicator';

const DIRECTIONAL_TEXT_LINES = 3

class UnitFloorPlan extends Component {
    state = {
        mapImage: '',
        mapImageList: [],
        imageContanierHeight: 300,
        isLoading: true,
        showDirText: true, //ToDo's
        isNetConnected: true,
        isModalVisible: false,
        userLoacationX: 0,
        userLoacationY: 0,
        nextStopX: 0,
        nextStopY: 0,
        pricingOptions: null,
        haveToShowCemeraNotesButton: false,
        showVideoButtom: false,
        showMoreButton: false,
        windowWidth: Dimensions.get('window').width,
        _carousel: null,
        //for units
        long_stop_description: null,
        show_long_description: false,
        stop_description: null,
        truncatedText: '',
        descriptionOpacity: new Animated.Value(0),
    };

    constructor() {
        super();
        this.unitData = null;
        this.isConnected = true;
        this.ImageZoom = null;
        this.ImageViewLocal = null;
        this.markerHeight = 25;
        this.markerWidth = 19;
        this.ViewLoadFirstTime = true;
        this.diableNextButton = false;
        this.userLocationIndex = -1; //set -1, becouse at first stop, app will not show user location
        this.nextStopIndex = 0;
        this.unitAmenitieList = [];
        this.imageWidth = 1;
        this.imageHeight = 1;
        this.userHaveVisitedUnplotedAmenities = false;
        this.handleSlideChange = this.handleSlideChange.bind(this);
    }

    //////////////////Default/////////////////////
    componentDidMount() {
        // // debugger;
        const { navigation } = this.props;
        const unitData = navigation.getParam('unitData', '');
        console.log(unitData);
        // // debugger;
        this.setState({
            willShowCamaraButton:
                Singleton.getInstance().getTourSetting().show_camera_button,
            willShowChatButton: Singleton.getInstance().getTourSetting().chat_control,
        });
        this.ChangeThisTitle('FLOOR PLAN');
        if (typeof (unitData !== 'undefined')) {
            this.setUnitData(unitData);
        }
        this.focusListener = navigation.addListener('didFocus', () => {
            this.ViewDidFcous();
        });
    }

    resetDescriptionText = () => {
        this.setState({ showMoreButton: false, truncatedText: '', descriptionOpacity: new Animated.Value(0) })
    }

    showDescriptionText() {
        Animated.timing(this.state.descriptionOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();
    };

    setUnitData = (unitData) => {
        this.setState({
            isLoading: false,
            mapImage: unitData.image,
            //mapImage: unitData.image_list[0].url,
            mapImageList: unitData.image_list,
            videoLinkButtonLabel: unitData.video_link_button_label,
            showVideoButtom: unitData.video_link === '' ? false : true,
            haveToShowCemeraNotesButton:
                unitData.unit_amenities.length === 0 ? true : false,
            pricingOptions: unitData.stop_data.lease_pricing.sort(function (a, b) {
                return a - b;
            }),
            long_stop_description: unitData?.stop_data?.long_stop_description,
            show_long_description: unitData?.stop_data?.show_long_description,
            stop_description: unitData?.stop_data?.stop_description,
        });
        this.unitData = unitData;
        console.log('this.unitData 0' + this.unitData.unit_id);
        this.unitAmenitieList = unitData.unit_amenities;

        this.ChangeThisTitle(this.unitData.stop_data.floorplan);
        if (typeof (unitData.image !== 'undefined')) {
            this.calculateImageSize(unitData.image);
        }
        if (this.unitAmenitieList.length > 0) {
            // this.setState({
            //     showMoreButton:
            //         this.unitAmenitieList[this.nextStopIndex].show_long_directional_text,
            // });
        }
        if (this.unitData.unit_unploted_amenities.length > 0) {
            this.setState({
                showDirText: false,
                // showMoreButton: false,
            });
        }
    };

    //will be called on every time when screen will appear //Should be delegate
    ViewDidFcous() {
        if (Singleton.getInstance().getMoveToDetailScreen()) {
            this.nextButtonPressed();
            Singleton.getInstance().setMoveToDetailScreen(false);
        } else {
            if (Singleton.getInstance().getMoveToNextStopOnFloorPlan()) {
                this.updateViewForNextStop();
            }
            Singleton.getInstance().setMoveToNextStopOnFloorPlan(false);
        }
    }

    /////////////Move to next Step/////////////////
    nextButtonPressed = () => {
        this.resetDescriptionText();
        // // debugger;
        this.resetMapZoomLevel();
        if (typeof this._carousel !== 'undefined') {
            this._carousel.snapToItem(0);
        }
        // if (isConnected) {
        //this.unitData.Unit_unploted_amenities
        if (
            typeof this.unitData.unit_unploted_amenities[this.nextStopIndex] !==
            'undefined' &&
            this.unitData.unit_unploted_amenities.length > 0 &&
            !this.userHaveVisitedUnplotedAmenities
        ) {
            this.props.navigation.navigate('UnplotedAmenities', {
                unitUnplotedAmenities: this.unitData.unit_unploted_amenities,
                is_modal_unit: this.unitData?.is_modal_unit,
            });
            this.userHaveVisitedUnplotedAmenities = true;
            this.setState({
                showDirText: true,
            });
            if (this.unitAmenitieList.length > 0) {
                // this.setState({
                //     showMoreButton:
                //         this.unitAmenitieList[this.nextStopIndex]
                //             .show_long_directional_text,
                // });
            }
        } else if (
            typeof this.unitAmenitieList[this.nextStopIndex] !== 'undefined'
        ) {
            console.log(
                ' this.unitData.stop_data.availability_url',
                this.unitData.stop_data.availability_url,
            );
            this.props.navigation.navigate('TourStop', {
                stopData: this.unitAmenitieList[this.nextStopIndex],
                isUnitEnd:
                    this.nextStopIndex === this.unitAmenitieList.length - 1
                        ? true
                        : false,
                floorName: this.unitData.stop_data.floorplan,
                isFromUnit: true,
                // unitID: this.unitData.unit_id,
                unitID: this.unitData.floorplan_id,
                stopID: this.unitData.id,
                availabilityUrl: this.unitData.stop_data.availability_url,
                unitData: this.unitData,
            });
        } else {
            this.props.navigation.navigate('ThanksUnit', {
                floorPlanName: this.unitData.stop_data.floorplan,
                unitID: this.unitData.floorplan_id,
                availabilityUrl: this.unitData.stop_data.availability_url,
                unitData: this.unitData,
            });
        }
    };
    onBackPress = () => {
        this.resetDescriptionText();
        console.log('userLocationIndex', this.userLocationIndex);
        if (this.userLocationIndex < 0) {
            this.props.navigation.goBack();
        } else {
            this.updateViewForPreviousStop();
        }
    };

    updateViewForNextStop = () => {
        this.updateIndex();
        this.drawPoints();
        // this.setState({
        //     showMoreButton:
        //         this.unitAmenitieList[this.nextStopIndex].show_long_directional_text,
        // });
    };
    updateViewForPreviousStop = () => {
        this.decIndex();
        this.drawPoints();
        // this.setState({
        //     showMoreButton:
        //         this.unitAmenitieList[this.nextStopIndex]?.show_long_directional_text,
        // });
    };
    ////////////////////Helper Mothods////////////////

    handleSlideChange(index) {
        this.setState({
            activeSlide: index,
            //selectedImageText: this.state.gallery[index].description
        });
    }

    updateIndex = () => {
        (this.userLocationIndex = this.userLocationIndex + 1),
            (this.nextStopIndex = this.nextStopIndex + 1);
    };
    decIndex = () => {
        // decrease index for previous stop
        (this.userLocationIndex = this.userLocationIndex - 1),
            (this.nextStopIndex = this.nextStopIndex - 1);
    };

    resetMapZoomLevel = () => {
        if (this.ImageZoom !== null) {
            this.ImageZoom.reset();
        }
    };

    //////////////////X, Y value mapper methods /////////////////////
    calculateXForStop = (x, isForNextStop) => {
        return calculateXForStop(x, this.imageWidth, isForNextStop);
    };

    calculateYForStop = (y, isForNextStop) => {
        return calculateYForStop(
            y,
            this.imageHeight,
            this.state.imageContanierHeight,
            isForNextStop,
        );
    };

    ChangeThisTitle = (titleText) => {
        const { setParams } = this.props.navigation;
        setParams({ title: titleText });
    };

    calculateImageSize = (image) => {
        console.log('calculateImageSize', image);
        this.setState({ isLoading: true });
        Image.getSize(
            image,
            (width, height) => {
                console.log(width + ' wh ' + height);
                this.setState({
                    imageContanierHeight:
                        height * (Dimensions.get('window').width / width),
                    isLoading: false,
                });
                this.imageWidth = width;
                this.imageHeight = height;
            },
            (error) => {
                this.setState({ isLoading: false });
                console.warn('Could not get the image size:' + error.message);
            },
        );
    };

    ////////////Button actions /////////////
    checkPricing = () => {
        Singleton.getInstance().setUnitPriceClickIncrement();
        this.setState({ isModalVisible: true });
    };

    checkPricingModalHide = () => {
        this.setState({ isModalVisible: false });
    };

    pressRefresh = () => {
        // // debugger;
        Singleton.getInstance().setUnitAvailabilityClickIncrement();
        this.props.navigation.navigate('CheckUnitAvailaibility', {
            floorPlanName: this.unitData.stop_data.floorplan_full_name,
            unitID: this.unitData.floorplan_id,
            navigationForm: 'UnitFloorPlanScreen',
        });
    };

    pressNotes = () => {
        // // debugger;
        Singleton.getInstance().setNotesClickIncrement();
        this.props.navigation.navigate('Notes', { stopData: this.unitData.id });
    };

    pressCemra = () => {
        Singleton.getInstance().setCameraClickIncrement();
        this.props.navigation.navigate('Camera', { stopData: this.unitData.id });
    };
    pressVideo = () => {
        this.props.navigation.navigate('MediaPlayer', {
            link: this.unitData.video_link,
        });
    };

    pressChat = () => {
        this.props.navigation.navigate('Chat');
    };

    imageLoaded = () => {
        //if (this.unitData.unit_unploted_amenities.length > 0 && !this.userHaveVisitedUnplotedAmenities)  {
        this.drawPoints();
        // }
    };
    showMore = () => {
        this.props.navigation.navigate('PrivacyPolicy', {
            title: 'Detail',
            // des: this.unitAmenitieList[this.nextStopIndex].long_directional_text,
            des: this.state.long_stop_description,
        });
        //this.props.navigation.navigate("Chat")
    };
    onUnitShowMore = () => {
        this.props.navigation.navigate('PrivacyPolicy', {
            title: 'Detail',
            des: this.state.long_stop_description,
        });
        //this.props.navigation.navigate("Chat")
    };

    //////////// *****UI****** /////////////
    drawPoints() {
        // // debugger;
        var userLocationX =
            this.userLocationIndex === -1
                ? -50
                : this.calculateXForStop(
                    typeof this.unitAmenitieList[this.userLocationIndex] !== 'undefined'
                        ? this.unitAmenitieList[this.userLocationIndex].x_plot
                        : 1,
                    false,
                );
        var userLocationY =
            this.userLocationIndex === -1
                ? -50
                : this.calculateYForStop(
                    typeof this.unitAmenitieList[this.userLocationIndex] !== 'undefined'
                        ? this.unitAmenitieList[this.userLocationIndex].y_plot
                        : 1,
                    false,
                );
        var nextStopX = this.calculateXForStop(
            typeof this.unitAmenitieList[this.nextStopIndex] !== 'undefined'
                ? this.unitAmenitieList[this.nextStopIndex].x_plot
                : -50,
            true,
        );
        var nextStopY = this.calculateYForStop(
            typeof this.unitAmenitieList[this.nextStopIndex] !== 'undefined'
                ? this.unitAmenitieList[this.nextStopIndex].y_plot
                : -50,
            true,
        );

        this.setState({
            userLoacationX: userLocationX,
            userLoacationY: userLocationY,
            nextStopX: nextStopX,
            nextStopY: nextStopY,
        });
    }
    displayPrice = () => {
        if (!this.unitData?.stop_data?.display_rent) return null;
        return (
            <View style={{ backgroundColor: 'black' }}>
                <TouchableOpacity
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: hp('10%'),
                        width: wp('21%'),
                    }}
                    onPress={() => this.checkPricing()}>
                    <Image
                        source={
                            Singleton.getInstance().getCurrencySymbol() === '£'
                                ? R.images.poundIcon
                                : R.images.dollar
                        }
                        style={{ width: wp('8%'), height: hp('6%'), resizeMode: 'contain' }}
                    />
                    <Text
                        style={{
                            color: 'white',
                            textAlign: 'center',
                            fontSize: wp('2.7%'),
                            lineHeight: wp('3.5%'),
                            marginTop: hp('0%'),
                            fontFamily:
                                Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
                        }}>
                        CHECK{'\n'}PRICING
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    render() {
        return (
            <View style={styles.container}>
                <ImageBackground
                    source={R.images.backgroundImage}
                    style={styles.backGroundImage}
                    imageStyle={{ resizeMode: 'stretch' }}>
                    <Header
                        backBtnVisible={true}
                        title={this.props.navigation?.state?.params?.title?.toUpperCase()}
                        onGoBack={this.onBackPress}
                    />
                    {/* <Spinner
                        visible={this.state.isLoading}
                        textStyle={styles.spinnerTextStyle}
                    /> */}
                    <LoadingIndicator visible={this.state.isLoading} />
                    <View style={styles.titleView}>
                        {this.state.stop_description ?
                            <Animated.Text style={[styles.titleText, { opacity: this.state.descriptionOpacity }]}
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
                                {this.state.showMoreButton ? this.state.truncatedText : this.state.stop_description}
                                {this.state.showMoreButton && 
                                    <Animated.Text onPress={this.showMore}
                                        style={[styles.titleText, styles.showMoreText, { opacity: this.state.descriptionOpacity }]}>
                                        {` . . . More >`}
                                    </Animated.Text>}
                            </Animated.Text> :
                            <Text onPress={this.showMore} style={[styles.titleText, { textAlign: 'center'}]}>
                                Please take a look around, take your own photos and add some notes if you’d like.
                            </Text>
                        }
                        {/* {this.state.long_stop_description ? (
                            <>
                                <Text style={styles.titleText}>
                                    {this.state.stop_description
                                        ? this.state.stop_description.slice(0, 125)
                                        : ''}
                                    {this.state.show_long_description ? (
                                        <Text
                                            onPress={this.onUnitShowMore}
                                            style={{ color: 'rgb(120, 117, 255)' }}>
                                            {' '}
                                            . . . More {'>'}
                                        </Text>
                                    ) : null}
                                </Text>
                            </>
                        ) : (
                            <>
                                <Text style={styles.titleText}>
                                    {this.state.showDirText
                                        &&
                                        Singleton.getInstance().getVirtualTour() !==
                                        'virtual_tour'
                                        ? typeof this.unitAmenitieList[this.nextStopIndex] !==
                                            'undefined'
                                            ? this.unitAmenitieList[this.nextStopIndex]
                                                .directional_text ? this.unitAmenitieList[this.nextStopIndex]
                                                .directional_text : 'Please take a look around, take your own photos and add some notes if you’d like.'
                                            : 'Please take a look around, take your own photos and add some notes if you’d like.'
                                        : ''}
                                    {this.state.showMoreButton ? (
                                        <Text
                                            onPress={this.showMore}
                                            style={{ color: 'rgb(120, 117, 255)' }}>
                                            {' '}
                                            . . . More {'>'}
                                        </Text>
                                    ) : null}
                                </Text>
                            </>
                        )} */}
                        {/* <View style={{ flex: 1, width: "100%" }}>
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
                                                ${this.state.long_stop_description}
                                            </body>`
                                }}
                                androidHardwareAccelerationDisabled={true} />
                        </View>
                        :
                        <> */}
                    </View>
                    <View style={styles.mapView}>
                        {this.state.mapImageList.length > 1 ? (
                            <View>
                                <Carousel
                                    ref={(c) => {
                                        this._carousel = c;
                                    }}
                                    style={{ width: wp('100%'), backgroundColor: 'red' }}
                                    data={this.state.mapImageList} //image_list
                                    renderItem={({ item, index }) => (
                                        <View style={{ width: wp('100%'), top: 10 }}>
                                            {index === 0 ? (
                                                <View style={{ width: wp('100%') }}>
                                                    {this.state.isLoading === false ? (
                                                        <ImageView
                                                            ref={(ref) => (this.ImageViewLocal = ref)}
                                                            resizeMode="contain"
                                                            style={[
                                                                {
                                                                    width: Dimensions.get('window').width,
                                                                    height: this.state.imageContanierHeight,
                                                                },
                                                            ]}
                                                            fadeDuration={300}
                                                            source={{ uri: item.url }}
                                                            onLoadEnd={this.imageLoaded}
                                                            key={item.url}
                                                            imageStyle={{ resizeMode: 'contain' }}>
                                                            {this.state.showDirText ? (
                                                                <View>
                                                                    <Image
                                                                        style={{
                                                                            height: this.markerHeight,
                                                                            width: this.markerWidth,
                                                                            position: 'absolute',
                                                                            left: this.state.userLoacationX,
                                                                            top: this.state.userLoacationY,
                                                                        }}
                                                                        source={R.images.user}
                                                                    />
                                                                    <Image
                                                                        style={{
                                                                            height: 35,
                                                                            width: 35,
                                                                            position: 'absolute',
                                                                            left: this.state.nextStopX,
                                                                            top: this.state.nextStopY,
                                                                        }}
                                                                        source={R.images.gifPulse}
                                                                    />
                                                                </View>
                                                            ) : null}
                                                        </ImageView>
                                                    ) : null}
                                                </View>
                                            ) : (
                                                <ImageView
                                                    style={{
                                                        width: wp('100%'),
                                                        height: hp('48%'),
                                                        resizeMode: 'contain',
                                                    }}
                                                    resizeMode="contain"
                                                    source={{ uri: item.url }}
                                                />
                                            )}
                                        </View>
                                    )}
                                    sliderWidth={this.state.windowWidth}
                                    itemWidth={this.state.windowWidth}
                                    onSnapToItem={this.handleSlideChange}
                                />
                                <Pagination
                                    containerStyle={{ top: hp('-10%') }}
                                    dotsLength={this.state.mapImageList.length}
                                    activeDotIndex={this.state.activeSlide}
                                    //activeDotIndex={0}
                                    dotStyle={{
                                        // top: hp('0%'),
                                        width: 10,
                                        height: 10,
                                        borderRadius: 5,
                                        marginHorizontal: 8,
                                        backgroundColor: 'rgba(79, 185, 248, 0.92)',
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
                        ) : (
                            <ImageZoom
                                ref={(ref) => (this.ImageZoom = ref)}
                                cropWidth={Dimensions.get('window').width}
                                cropHeight={hp('62%')}
                                imageWidth={Dimensions.get('window').width}
                                backgroundColor="green"
                                imageHeight={this.state.imageContanierHeight}>
                                {this.state.isLoading === false ? (
                                    <ImageView
                                        ref={(ref) => (this.ImageViewLocal = ref)}
                                        resizeMode="contain"
                                        style={[
                                            {
                                                width: Dimensions.get('window').width,
                                                height: this.state.imageContanierHeight,
                                                resizeMode: 'contain'
                                            },
                                        ]}
                                        fadeDuration={300}
                                        source={{ uri: this.state.mapImage }}
                                        onLoadEnd={this.imageLoaded}
                                        key={this.state.mapImage}
                                        imageStyle={{ resizeMode: 'contain' }}>
                                        {this.state.showDirText ? (
                                            <View>
                                                <Image
                                                    style={{
                                                        height: this.markerHeight,
                                                        width: this.markerWidth,
                                                        position: 'absolute',
                                                        left: this.state.userLoacationX,
                                                        top: this.state.userLoacationY,
                                                    }}
                                                    source={R.images.user}
                                                />
                                                <Image
                                                    style={{
                                                        height: 35,
                                                        width: 35,
                                                        position: 'absolute',
                                                        left: this.state.nextStopX,
                                                        top: this.state.nextStopY,
                                                    }}
                                                    source={R.images.gifPulse}
                                                />
                                            </View>
                                        ) : null}
                                    </ImageView>
                                ) : null}
                            </ImageZoom>
                        )}
                    </View>
                    {/* {this.state.showVideoButtom ? (
                        <VideoPlayButton
                            title={this.state.videoLinkButtonLabel}
                            goPressed={() => this.pressVideo()}
                        />
                    ) : null}
                    <View style={styles.bottomBtnMainContainer}>
                        <View>
                            {this.props.showChatButton1 ? (
                                <ChatButton
                                    goPressed={() => this.pressChat()}
                                    containerStyle={styles.bottomBtnContainer} />
                            ) : null}
                        </View>
                        <GoButton
                            disabled={this.diableNextButton}
                            goPressed={() => this.nextButtonPressed()}
                            containerStyle={styles.bottomBtnContainer}
                        />
                    </View> */}
                    <View style={styles.bottomUnitButtonsView}>
                        {this.state.willShowCamaraButton ? (
                            <View style={{ backgroundColor: 'black' }}>
                                <TouchableOpacity
                                    style={{
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        height: hp('10%'),
                                        width: wp('21%'),
                                    }}
                                    onPress={() => this.pressCemra()}>
                                    <Image
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
                                            fontSize: wp('2.7%'),
                                            lineHeight: wp('3.5%'),
                                            marginTop: hp('-1%'),
                                            fontFamily:
                                                Platform.OS === 'android'
                                                    ? 'GothamLight'
                                                    : 'Gotham-Light',
                                        }}>
                                        TAKE{'\n'}PHOTOS
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        ) : null}
                        <View style={{ backgroundColor: 'black' }}>
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    height: hp('10%'),
                                    width: wp('21%'),
                                }}
                                onPress={() => this.pressNotes()}>
                                <Image
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
                                        lineHeight: wp('3.5%'),
                                        marginTop: hp('-1%'),
                                        textAlign: 'center',
                                        fontSize: wp('2.7%'),
                                        fontFamily:
                                            Platform.OS === 'android'
                                                ? 'GothamLight'
                                                : 'Gotham-Light',
                                    }}>
                                    ADD{'\n'}NOTES
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {this.displayPrice()}
                        <View style={{ backgroundColor: 'black' }}>
                            <TouchableOpacity
                                style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: hp('10%'),
                                    width: wp('22%'),
                                }}
                                onPress={() => this.pressRefresh()}>
                                <Image
                                    source={R.images.refreshIcon}
                                    style={{
                                        width: wp('8%'),
                                        height: hp('6%'),
                                        resizeMode: 'contain',
                                    }}
                                />
                                <Text
                                    style={{
                                        color: 'white',
                                        textAlign: 'center',
                                        fontSize: wp('2.7%'),
                                        lineHeight: wp('3.5%'),
                                        marginTop: hp('0%'),
                                        fontFamily:
                                            Platform.OS === 'android'
                                                ? 'GothamLight'
                                                : 'Gotham-Light',
                                    }}>
                                    CHECK{'\n'}AVAILABILITY
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    {this.state.showVideoButtom ? (
                        <VideoPlayButton
                            title={this.state.videoLinkButtonLabel}
                            goPressed={() => this.pressVideo()}
                        />
                    ) : null}
                    {this.props.showChatButton1 ? (
                        <ChatButton goPressed={() => this.pressChat()} />
                    ) : null}
                    {/* <AppConsumer>
                        {context => context.buttonStatus ? <ChatButton goPressed={() => this.pressChat()} /> : null}
                    </AppConsumer> */}
                    <GoButton
                        disabled={this.diableNextButton}
                        goPressed={() => this.nextButtonPressed()}
                    />
                </ImageBackground>
                <Dialog
                    visible={this.state.isModalVisible}
                    dialogTitle={<DialogTitle title="Pricing Options" />}
                    footer={
                        <DialogFooter>
                            <DialogButton
                                text="OK"
                                onPress={() => {
                                    this.checkPricingModalHide();
                                }}
                            />
                        </DialogFooter>
                    }
                    dialogAnimation={
                        new SlideAnimation({
                            slideFrom: 'bottom',
                        })
                    }>
                    <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
                        {this.unitData?.stop_data?.display_pricing_options &&
                            this.state.pricingOptions?.length > 0 ? (
                            <FlatList
                                data={this.state.pricingOptions}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={{ bottom: hp('1.5%') }}>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                width: '100%',
                                                height: hp('5.4%'),
                                            }}>
                                            <View style={{ justifyContent: 'center' }}>
                                                <Text
                                                    style={{
                                                        fontSize: hp('2%'),
                                                        fontFamily:
                                                            Platform.OS === 'android'
                                                                ? 'GothamLight'
                                                                : 'Gotham-Light',
                                                        color: 'black',
                                                        margin: wp('2%'),
                                                        textAlign: 'left',
                                                    }}>
                                                    {item.pricing_option}
                                                </Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}></FlatList>
                        ) : (
                            <Text
                                style={{
                                    fontSize: hp('2%'),
                                    fontFamily:
                                        Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
                                    color: 'black',
                                    margin: wp('2%'),
                                    textAlign: 'left',
                                }}>
                                No pricing option available
                            </Text>
                        )}
                    </DialogContent>
                </Dialog>
                <CopyRight />
            </View>
        );
    }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(UnitFloorPlan);

function mapStateToPropsps(state) {
    return {
        showChatButton1: state.chatReducer && state.chatReducer.showChatButton,
    };
}

function mapDispatchToProps(dispatch) {
    return {
        //setUnreadMegCount: payload => dispatch(setUnreadMessageCount(payload)),
        //setChatButtonStatus: payload => dispatch(setShowChatButton(payload)),
    };
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5FCFF' },
    backGroundImage: { backgroundColor: 'black', flex: 1, flexDirection: 'column' },
    titleView: { height: hp(14), paddingTop: wp(3), paddingHorizontal: wp(3), alignItems: 'center', justifyContent: 'center' },
    titleText: {
        color: 'white',
        lineHeight: hp(2.6),
        fontSize: wp(4),
        fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
        width: '100%'
    },
    showMoreText: {
        color: 'rgb(120, 117, 255)',
        textAlign: 'right'
    },
    mapView: { flex: 1, justifyContent: 'center', overflow: 'hidden', marginBottom: hp(16) + (wp(32) * 0.7) },
    bottomUnitButtonsView: {
        // flex: 0.2,
        position: 'absolute',
        bottom: hp(4),
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    bottomPricingView: {
        backgroundColor: 'green',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
    },
    pricingView: {
        backgroundColor: 'black',
        height: hp('10%'),
        width: wp('41%'),
        alignItems: 'center',
    },
    pricingTouchableOpacity: {
        alignItems: 'center',
        justifyContent: 'center',
        height: hp('10%'),
        width: wp('41%'),
    },
    refreshView: {
        backgroundColor: 'black',
        height: hp('10%'),
        width: wp('41%'),
        alignItems: 'center',
        justifyContent: 'center',
    },
    refreshTouchableOpacity: {
        alignItems: 'center',
        justifyContent: 'center',
        height: hp('10%'),
        width: wp('41%'),
    },
    okbuttonContainer: {
        aspectRatio: 1.2 / 1,
        width: wp('32%'),
        position: 'absolute',
        left: wp('0'),
        bottom: hp('15%'),
    },
    bottomBtnContainer: {
        width: wp('28'),
        aspectRatio: 1.45,
    },
    bottomBtnMainContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: wp('100')
    }
});

//913
