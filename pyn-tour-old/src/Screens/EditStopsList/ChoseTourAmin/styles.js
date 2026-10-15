import { Dimensions } from "react-native";
import { StyleSheet, Platform } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default StyleSheet.create({
  container: {
    flex: 1,
    width: wp('100%'),
    marginBottom: hp('1%')
  },
  flatListContainer: {
    flex: 2,
  },
  renderItemcontainer: {
    flex: 1,
    flexDirection: 'row',

  },
  emptyComponentContainer: {
    height: hp('80%'),
    justifyContent: 'center',
    alignContent: 'center'
  },
  emptyComponentTxt: { 
    color: "white", 
    textAlign: "center", 
    fontSize: wp('5%'), 
    lineHeight: wp('6.5%'), 
    marginLeft: hp('1%'), 
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", 
  },
  propertyNameContainerView: {
    margin: wp('1.5%'),
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  propertyNameContainerView1: {
    height: hp('5%'),
    // backgroundColor: 'red',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  occupySuperContainerView: {
    width: wp('95%'),
    height: hp('30%'),
    // backgroundColor: 'red'
  },
  actionBtnContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: wp(5),
    alignItems: "center", 
    height: hp('8'), 
    width: wp('90'), 
    backgroundColor: 'black',
    marginBottom: hp('3')
  },
  actionBtnIcon: { 
    width: wp("6%"), 
    height: hp("6%"), 
    resizeMode: "contain", 
    marginRight: wp(3) 
  },
  actionBtnText: { 
    flex: 1,
    color: "white", 
    fontSize: hp('2.3%'), 
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" 
  },

  item: {
    // paddingLeft: 10,
    // paddingRight: 10,

    fontSize: wp('3.5%'), //20,
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    color: 'white',
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold",
  },
  item1: {
    // paddingLeft: 10,
    // paddingRight: 10,
    marginLeft: wp('4%'),
    marginRight: wp('4%'),
    // backgroundColor:'green',
    fontSize: wp('4.5%'), //20,
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
    color: 'white',
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },
  rootView: {
    resizeMode: "contain",
    flex: 5,
    flexDirection: "column",
    backgroundColor: "black",
    alignItems: "center",
  },
  logView: {
    height: 150,
    width: 150,
    resizeMode: "contain",
    justifyContent: 'flex-end',
  },
  welcomeView: {
    flexDirection: 'column',
    alignItems: "center",
    height: hp('7%'),
    justifyContent: "center"
  },
 
  imageStyle1: {
    flex: 1,
    resizeMode: 'contain',
    width: "100%",
    height: "100%",
  },
  availableView: {
    // opacity:.9,
    //backgroundColor: 'green',
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: hp('4%'),
    alignSelf: 'flex-start',
    justifyContent: 'flex-end'
  },
  floorPlanText: {
    fontSize: hp('2%'),
    color: "white",
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold",
  },

  welcomeToTextView: {
    fontSize: hp('2%'),
    color: "white",
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  propertyTextNameView: {
    fontSize: hp('4%'),
    color: "white",
    marginTop: 10,
    marginLeft: 12,
    marginRight: 12,
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold"
  },
  startTourRoot: {
    flexDirection: "column",
    flex: 2,
    alignItems: "center",
    width: wp('93%'),

  },
  bottomImages: {
    width: hp("3.5%"), height: hp('3.5%'), marginTop: hp('2%')
  },
  bottomText: {
    color: "black", marginTop: hp('1%'), marginBottom: hp('1%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  bottomTextColor: {
    color: "white", marginTop: hp('1%'), marginBottom: hp('1%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  // startTourButton: {
  //   flex: 1,
  //   flexDirection: 'column',
  //   backgroundColor: "#F5FCFF",
  //   marginBottom: hp('2%'),
  //   height: hp("12.5%"),
  //   width: wp('93%'),
  //   alignItems: "center",
  //   // justifyContent: "center"
  // },
  resumeTourButton: {
    backgroundColor: "black",
    height: hp('11%'),
    marginRight: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  savedTourButton: {
    backgroundColor: "black",
    height: hp('11%'),
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  startTourButton: {
    flexDirection: "column",
    width: wp("92%"),
    height: hp("11%"),
    backgroundColor: "#D3D3D3",
    alignItems: "center",
    justifyContent: "center"
  },
  saveResumeTour:
  {
    flexDirection: "row",
    marginTop: hp('2%')
  }
});
