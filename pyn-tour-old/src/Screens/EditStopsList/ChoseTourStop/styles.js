import { Dimensions } from "react-native";
import { StyleSheet, Platform } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default StyleSheet.create({
  container: {
    flex: 1,
    width: wp('100%'),
    marginBottom: hp('1%'),
  },
  flatListContainer: {
    flex: 2,
  },
  renderItemcontainer: {
    flex: 1,
    flexDirection: 'row',

  },
  actionBtnIcon: {
    width: wp(5), 
    height: wp(5), 
    resizeMode: "contain", 
    marginRight: wp(3),
  },
  propertyNameContainerView: {
    flex: 1,
    margin: wp('2'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  propertyNameContainerView1: {
    height: hp('5%'),
    // backgroundColor: 'red',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  occupySuperContainerView: {
    width: wp('40%'),
    height: hp('20%'),
    backgroundColor: 'red'
  },
  imageStyle1: {
    flex: 1,
    resizeMode: 'contain',
    width: "100%",
    height: "100%",
  },
  item: {
    fontSize: wp('4.5%'), //20,
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
    justifyContent: "center",
    marginBottom: hp('1')
  },
  availableView: {
     //backgroundColor: 'red',
    // opacity:.9,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginTop: hp('1')
  },
  floorPlanText: {
    fontSize: wp('4.5'),
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
  },
  actionBtnContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: wp(5),
    height: hp(8),
    backgroundColor: "black",
  },
  actionBtnText: {
    color: 'white',
    fontSize: wp('4.5'),
    letterSpacing: -1,
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  }
});
