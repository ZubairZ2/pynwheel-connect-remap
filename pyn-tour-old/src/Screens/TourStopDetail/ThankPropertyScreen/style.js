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
    justifyContent: 'center',
    flex: 1.4,
  },

  errorTextView: {
    fontSize:hp('2.5%'),
    color: "white",
    lineHeight: 30,
    textAlign:'center',
    padding: hp("1%"),
    textAlignVertical: 'center',
    alignItems: "center",
    fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light"
  },

  welcomeToTextView: {
    fontSize:hp('4%'),
    color: "white",
    textAlign:'center',
    textAlignVertical: 'center',
    alignItems: "center",
    fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light"
  },
  propertyTextNameView: {
    fontSize:hp('4%'),
    color: "white",
    textAlign: 'center',
    marginTop: 10,
    fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold"
  },
  startTourRoot: {
    flexDirection: "column",
    flex: 1.8,
    marginTop: hp('4%'),
    alignItems: "center",
    width: wp('93%'),
    
  },
  bottomImages:{
    width: hp("3.5%"), height: hp('3.5%'),marginTop:hp('2%')
  },
  bottomText:{
    color: "black",marginTop:hp('1%'),marginBottom:hp('1%'),
    fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light"
  },
  bottomTextColor:{
    color: "white",
    marginTop:hp('1%'),
    textAlign:'center',
    marginBottom:hp('1%') ,
    fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light"
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
    height: hp('6.5%'),
    marginRight: 10,
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  savedTourButton: {
    backgroundColor: "black",
    height: hp('6.5%'),
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});
