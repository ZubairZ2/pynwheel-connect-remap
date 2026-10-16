import React, { Component } from 'react';
import { FlatList, Image, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Spinner from "react-native-loading-spinner-overlay";
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import Dialog, { DialogButton, DialogContent, DialogFooter, DialogTitle, SlideAnimation, } from 'react-native-popup-dialog';
import ChatButton from '../../../Library/Components/ChatButton';
import CopyRight from "../../../Library/Components/Copyright";
import GoButton from '../../../Library/Components/GoButton';
import Header from '../../../Library/Components/Header/index';
import { getUnitOfFloorPlanWithFloorPlanID } from '../../../Library/ServerCalls/API';
import Singleton from "../../../Singleton";
import R from "../../../assest/R";

const loadingMessages = ['Loading available units. . . ', 'Please be patient. . .', 'Almost there. . . ']
class CheckUnitAvailaibility extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            tourStopsData: null,
            floorPlanName: null,
            showActionColom: false,
            showEmptyMessage: false,
            showGoButton: true,
            loadingMessage: loadingMessages[0],
            pricingOptions: [],
            priceListVisible:false,
            isPriceModalVisible:false,
            showApplyNow:false
        };
        this.navigationForm = ""
        this.loadinMessageCounter = 0;
    }
    showLoadingMessage() {
        const interval = setInterval(() => {
            if (this.state.isLoading) {
                if (this.loadinMessageCounter < 2) {
                    this.loadinMessageCounter = this.loadinMessageCounter + 1;
                    this.setState({ loadingMessage: loadingMessages[this.loadinMessageCounter] })
                } else {
                    clearInterval(interval)
                }
            } else {
                clearInterval(interval)
            }
        }, 5000)
    }
    componentDidMount() {
        const { navigation } = this.props;
        this.floorPlanName = navigation.getParam("floorPlanName", null);
        var unitID = navigation.getParam("unitID", null);
        this.navigationForm = navigation.getParam("navigationForm", null);
        var showApplyNow = navigation.getParam("showApply", null);
        console.log("showApplyNow",showApplyNow)
        this.setState({showApplyNow: showApplyNow})

        this.setState({ floorPlanName: this.floorPlanName })
        this.getFloorPlanUnits(unitID)
        if (this.navigationForm !== "TourHighLightStopScreen") {
            this.setState({
                willShowChatButton: Singleton?.getInstance()?.getTourSetting()?.chat_control
            });
        }
        if (this.navigationForm == "TourReviewScreen") {
            this.setState({ showGoButton: false })
        }
    }
    showUnitPricingModel = (item) => {
        this.setState({
            pricingOptions:item.lease_pricing_pynwheel_touch,
            priceListVisible:item.display_pricing_options,
            isPriceModalVisible:true
        })
    }
    checkPricingModalHide = () => {
        this.setState({isPriceModalVisible:false})
      }


    displayRent = (item) => {
        if (!item?.display_rent) return <Text style={{ marginLeft: wp('1%'), marginTop: hp('1%') }}></Text>
        return (
            <TouchableOpacity style={{justifyContent: "center" }} onPress={() => this.showUnitPricingModel(item)}>
                <Text style={[styles.unitText,{ color: "#89C765",textDecorationLine:'underline',}]}>{item.effective_rent}</Text>
            </TouchableOpacity>
        )
    }

    getFloorPlanUnits = (unitID) => {
        // debugger
        this.showLoadingMessage()
        getUnitOfFloorPlanWithFloorPlanID(unitID)
            .then(response => response.json())
            .then(responseJson => {
                // debugger
                if (typeof (responseJson.data) !== 'undefined' || responseJson.data != null) {
                    var unitList = responseJson.data
                    var showApplyClolom = false
                    for (let index = 0; index < unitList.length; index++) {
                        const element = unitList[index];
                        if (element.availability_url !== null) {
                            showApplyClolom = true
                        }
                    }
                    if (Singleton.getInstance().getTourSetting()?.apply_now_self_tour === false) {
                        showApplyClolom = false
                    }
                    this.setState({
                        showActionColom: this.state.showApplyNow ? true : this.state.showApplyNow == false ? false : showApplyClolom ,
                        tourStopsData: unitList,
                        showEmptyMessage: unitList.length === 0 ? true : false,
                        isLoading: false,
                    });

                } else {
                    this.showServerError()
                }
            })
            .catch(error => {
                console.log(error)
                this.showServerError()

            });
    };

    showServerError = () => {
        this.setState({ isLoading: false });
        setTimeout(() => {
            alert('Server Error, Please try again.')
        }, 500);
    }
    seeUnitOnMap = (unit) => {
        this.props.navigation.navigate("UnitPlot", { selectedUnit: unit })
    }

    ListViewItemSeparator = () => {
        return (
            //List Item separator View
            <View style={{ height: 1, width: '100%', backgroundColor: 'white' }} />
        );
    };

    pressOk = () => {
        // debugger
        if (this.navigationForm === "ThanksUnitScreen") {
            if (Singleton.getInstance().getTourSetting().show_map) {
                this.props.navigation.navigate("TourMap")
                Singleton.getInstance().setShouldUserMoveToNextStop(true)
            } else {
                Singleton.getInstance().setShouldUserMoveToNextStopOnStopList(true)
                this.props.navigation.navigate("TourContainer")

            }
        } else if (this.navigationForm === "UnitFloorPlanScreen") {
            this.props.navigation.goBack()
            Singleton.getInstance().setMoveToDetailScreen(true)
        } else if (this.navigationForm === "TourHighLightStopScreen") {
            this.props.navigation.navigate("SavedTour")
        } else if (this.navigationForm === "FloorPlanListScreen") {
            this.props.navigation.goBack()
        }
    }

    applyForUnit = (unit) => {
        // debugger
        Singleton.getInstance().setUnitApplyClickIncrement()
        if (unit.update_apply) {
            this.props.navigation.navigate("ApplyForUnit", { applyUnit: unit })
        } else {
            if (unit.availability_url) {
                this.props.navigation.navigate("WebView", { title: '', applyUnitURL: unit.availability_url })
            } else {
                alert("Services not available.")
            }
        }
    }

    pressChat = () => {
        this.props.navigation.navigate("Chat")
    }

    AvailabilityForFloor = () => {
        this.props.navigation.navigate("CheckFloorPlanAva", {showApply: this.state.showApplyNow})
    }

    render() {
        const { navigation } = this.props;
        const {priceListVisible,isPriceModalVisible,pricingOptions}=this.state
        return (
            <View style={{ flex: 1 }}>
                {/* <StatusBar
              barStyle="light-content"
              backgroundColor="#6a51ae" /> */}
                <ImageBackground source={R.images.backgroundImage} style={styles.backgroundImage} imageStyle={{
                    resizeMode: 'stretch'
                }} >
                    <Header backBtnVisible={true} title={this.state.floorPlanName} navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Welcome");
                        }
                    }} />
                    <Spinner visible={this.state.isLoading} textContent={this.state.loadingMessage} textStyle={{ color: '#FFF' }} />

                    <View style={{ height: 1, backgroundColor: 'white' }} />
                    <View style={styles.header_footer_style}>
                        <Text style={styles.textStyle}>Unit</Text>
                        <Text style={styles.textStyle}>See</Text>
                        <Text style={styles.textStyle}>Date</Text>
                        <Text style={styles.textStyle}>Price</Text>
                        {this.state.showActionColom ? <Text style={styles.textStyle}>Action</Text> : null}
                    </View>
                    <View style={{ height: 1, backgroundColor: 'white' }} />
                    {/* <View style={styles.messageContainer}>
                {!this.state.isLoading ? <Text style={styles.messageText}> {this.state.activeTour === null ? "No Tour found." : "This is what you'll see on your tour! If you want to remove one, just touch the checkmark."} </Text> : null}
              </View> */}
                    <View style={this.navigationForm !== "FloorPlanListScreen" ? styles.tourStopsListContainer : styles.tourStopsListContainer1} >
                        {!this.state.showEmptyMessage ?
                            <FlatList
                                data={this.state.tourStopsData}
                                ItemSeparatorComponent={this.ListViewItemSeparator}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                renderItem={({ item }) =>

                                    <View style={styles.listItemsView}>
                                        {/* { this.state.showActionColom ? :} */}
                                        {this.state.showActionColom ? <View style={styles.listItemsView}>
                                            <View style={styles.unitTextView}>
                                                <Text style={styles.unitText}>{item.marketing_name}</Text>
                                            </View>
                                            <View style={styles.listIconView}>
                                                {item.sitemap_image_url === null ? null : <TouchableOpacity style={styles.listIconView} onPress={() => this.seeUnitOnMap(item)}>
                                                    <Image source={R.images.locationIcon} style={styles.listCheckIcon} />
                                                </TouchableOpacity>}
                                            </View>
                                            <View style={styles.dateView}>
                                                {/* <Text style={styles.listText}> {item.available_date === null ? "N/A" : moment(item.available_date).format("M/D")}</Text> */}
                                                <Text style={styles.listText}> {item.available_date}</Text>
                                            </View>
                                            <View style={styles.priceView}>
                                                {/* <Text style={styles.priceText}> {item.effective_rent}</Text> */}
                                                {this.displayRent(item)}
                                            </View>
                                            {item.availability_url === null ? <View style={styles.applyView} /> : <TouchableOpacity style={styles.applyView} onPress={() => this.applyForUnit(item)}>
                                                <Text style={styles.applyText}>Apply</Text>
                                            </TouchableOpacity>
                                            }
                                        </View> : <View style={styles.listItemsView}>
                                            <View style={styles.unitTextView}>
                                                <Text style={styles.unitText}>{item.marketing_name}</Text>
                                            </View>
                                            <View style={styles.listIconView}>
                                                {item.sitemap_image_url === null ? null : <TouchableOpacity style={styles.listIconView} onPress={() => this.seeUnitOnMap(item)}>
                                                    <Image source={R.images.locationIcon} style={styles.listCheckIcon} />
                                                </TouchableOpacity>}
                                            </View>
                                            <View style={styles.dateView}>
                                                {/* <Text style={styles.listText}> {item.available_date === null ? "N/A" : moment(item.available_date).format("M/D")}</Text> */}
                                                <Text style={styles.listText}> {item.available_date}</Text>
                                            </View>
                                            <View style={styles.priceView}>
                                                {/* <Text style={styles.priceText}> {item.effective_rent}</Text> */}
                                                {this.displayRent(item)}
                                            </View>

                                        </View>}

                                    </View>
                                } />
                            : <View style={{ top: hp('20'), alignItems: 'center', justifyContent: 'center' }} >
                                <Text style={styles.errorTextStyle}>No units are currently available for this particular floor plan. Please check with a leasing consultant to find out about similar floor plans that may suit your needs.</Text>
                            </View>
                        }

                        {/* {this.state.activeTour === null ? null : <GoButton goPressed={() => this.pressOk()} />} */}
                    </View>
                    {this.state.willShowChatButton ? <ChatButton goPressed={() => this.pressChat()} /> : null}
                    {this.state.showGoButton && <GoButton goPressed={() => this.pressOk()} />}
                    {this.navigationForm !== "FloorPlanListScreen" ? <View style={styles.headerContainer} >
                        <TouchableOpacity style={styles.btn} onPress={() => this.AvailabilityForFloor()}>
                            <Text style={styles.bottomButtonText}>SEE AVAILABILITY FOR OTHER FLOOR PLANS</Text>
                        </TouchableOpacity>
                    </View> : null}
                    <Dialog visible={isPriceModalVisible} dialogTitle={<DialogTitle title="Pricing Options" />} footer={<DialogFooter>
                        <DialogButton text="OK" onPress={() => { this.checkPricingModalHide() }} />
                    </DialogFooter>
                    }
                        dialogAnimation={new SlideAnimation({
                            slideFrom: 'bottom',
                        })} >
                        <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
                            {(priceListVisible && pricingOptions.length > 0) ?
                                <FlatList
                                    data={pricingOptions}
                                    renderItem={({ item }) =>
                                            <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                                                <View style={{ justifyContent: 'center', flexDirection:'row' }}>
                                                    <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_month}</Text>
                                                    <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{" - "}</Text>
                                                    <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_rent}</Text>
                                                </View>
                                            </View>
                                    } /> :
                                <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>
                                    No pricing option available
                                </Text>
                            }

                        </DialogContent>
                    </Dialog>
                    <CopyRight />
                </ImageBackground>
            </View>
        );
    }
}

const styles = StyleSheet.create({

    listItem: {
    },
    backgroundImage: {
        flex: 1,
        // height:Dimensions.get("window").height,
        // width:Dimensions.get("window").width,
        // height: "100%",
        width: null,
        height: null,
        // resizeMode: 'contain'
    },
    headerContainer: {
        // flex: .13,
        width: "100%",
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: hp(4) + 5,
    },
    bottom: {
        flex: 1,
        justifyContent: 'flex-end',
        marginBottom: 0
    },
    bottomButtonText: {
        fontSize: hp('1.7%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        // color: '#95C574',
        color: "#000",
        textAlign: 'left'
    },
    messageContainer: {
        width: "100%",
        flex: .2,
        // aspectRatio: 2.7/1,
        justifyContent: 'center',
        alignItems: 'center',
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
    tourStopsListContainer: {
        width: "100%",
        // height: hp('80%'),
        flex: 1,
        marginBottom: hp(16) + (wp(32) * 0.69),
        //height: this.navigationForm !== "FloorPlanListScreen" ? "90%" : "100%",
        //backgroundColor: 'red',
        // aspectRatio: 2/1,
        //flex: .84,
    },
    tourStopsListContainer1: {
        width: "100%",
        flex: 1,
        // height: hp('85%')
        marginBottom: hp(16) + (wp(32) * 0.69),
        //height: this.navigationForm !== "FloorPlanListScreen" ? "90%" : "100%",
        //backgroundColor: 'red',
        // aspectRatio: 2/1,
        //flex: .84,
    },
    okbuttonContainer: {
        aspectRatio: 1.3 / 1,
        width: wp('32%'),
        position: 'absolute',
        right: wp('0%'),
        bottom: hp('16%'),
    },
    okButton: {
        width: wp("95%"),
        height: hp("6.8%"),
        backgroundColor: "#D3D3D3",
        justifyContent: "center",
        alignItems: "center"
    },

    listCheckIcon:
    {
        width: hp("3%"),
        height: hp("3%"),
        resizeMode: "contain",
    },
    listTeamsButton:
    {
        bottom: hp('2%'),
        justifyContent: 'space-around',
        //backgroundColor: 'green',
    },
    listItemsView:
    {
        flexDirection: 'row',
        justifyContent: 'space-around',
        //justifyContent: 'space-between',
        width: '100%',
        height: hp('7%'),
        backgroundColor: 'black',
    },
    dateView:
    {
        width: wp('21%'),
        justifyContent: 'center',
        alignItems: 'center',
        //backgroundColor: 'green',
    },
    priceText:
    {
        fontSize: hp('2.1%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: 'white',
        //margin: wp('2%'),
        //textAlign: 'left'
    },
    listIconView:
    {
        width: wp('17%'),
        justifyContent: 'center',
        alignItems: 'center',
        //backgroundColor: 'green',
    },
    priceView:
    {
        width: wp('20%'),
        justifyContent: 'center',
        alignItems: 'center',
        //backgroundColor: 'green',
    },
    unitTextView:
    {
        width: wp('18%'),
        justifyContent: 'center',
        alignItems: 'center',
        //backgroundColor: 'blue',
    },
    unitText:
    {
        fontSize: hp('2.0%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: 'white',
        margin: wp('.5%'),
        textAlign: 'left'
    },
    listTextView:
    {
        justifyContent: 'center',
        //backgroundColor: 'red',
    },
    header_footer_style: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        height: hp('7%'),
        //backgroundColor: '#606070',
        backgroundColor: 'black',
    },
    textStyle: {
        textAlign: 'center',
        color: 'white',
        fontSize: hp('2.6%'),
    },
    errorTextStyle: {
        textAlign: 'center',
        fontSize: hp('2.1%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: 'white',
        lineHeight: 25,
        margin: wp('2%'),
    },
    listText:
    {
        fontSize: hp('2.3%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: 'white',
        margin: wp('2%'),
        textAlign: 'left'
    },
    applyView:
    {
        width: wp('24%'),
        justifyContent: 'center',
        alignItems: 'center',
        //backgroundColor: 'brown',
    },
    applyText:
    {
        fontSize: hp('2.3%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
        color: '#95C574',
        margin: wp('2%'),
        textAlign: 'left',
        textDecorationLine:'underline',
    },
    btn: {
        justifyContent: "center",
        alignItems: "center",
        width: wp("92%"),
        height: hp("6%"),
        backgroundColor: "#D3D3D3",
        // marginBottom: 50
    }
});
// export default withKeyboardAwareScrollView(NotesScreen);
export default CheckUnitAvailaibility;