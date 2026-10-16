import { Dimensions } from "react-native";
import { StyleSheet,Platform } from "react-native";
import {widthPercentageToDP as wp, heightPercentageToDP as hp} from 'react-native-responsive-screen';

export default StyleSheet.create({
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
    // backgroundColor: 'red',
    // opacity:.9,
    flexDirection: "column",
    alignItems: "center",
    flex: 1.5,
    justifyContent: "center"
  },
  welcomeToTextView: {
    fontSize:hp('5%'),
    color: "white",
    fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light"
  },
  propertyTextNameView: {
    fontSize:hp('4%'),
    color: "white",
    marginTop: 10,
    marginLeft: 12,
    marginRight: 12,
    fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold"
  },
  startTourRoot: {
    flexDirection: "column",
    flex: 2,
    alignItems: "center",
    width: wp('93%'),
    
  },
  bottomImages:{
    width: hp("3.5%"), height: hp('3.5%'),marginTop:hp('2%')
  },
  startTourBtnText: {
    color: "black", 
    marginTop: hp('1%'), 
    marginBottom: hp('1%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    fontSize: 20
  },
  savedTourBtnText: {
    color: "white", 
    marginTop: hp('1%'), 
    marginBottom: hp('1%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    fontSize: 20
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
  startTourButton :{
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
