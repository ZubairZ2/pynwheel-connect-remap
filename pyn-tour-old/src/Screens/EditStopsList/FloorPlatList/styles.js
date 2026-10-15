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
  itemMainContainer: {
    paddingHorizontal: wp('1.5')
  },
  renderItemcontainer: {
    flex: 1,
    flexDirection: 'row',
  },
  propertyNameContainerView: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  selected: { backgroundColor: "#FA7B5F" },
  list: {
    backgroundColor: "#192338",
    justifyContent: "flex-start",
    alignItems: "center",
    zIndex: -1
  },

  selectedText: {
    color: 'black',
    width: wp('19%'),
    textAlign: 'center',
  },
  normalText: {
    color: 'white',
    width: wp('19%'),
    textAlign: 'center',
  },

  propertyNameContainerView1: {
    height: hp('4%'),
    width: wp('20%'),
    backgroundColor: '#D3D3D3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  propertyNameContainerViewSelected: {
    height: hp('4%'),
    width: wp('20%'),
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContainer: {
    flexDirection: "column",
    marginTop: hp('1'),
    height: hp("4.5%"),
    backgroundColor: "#89C765",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: wp('1.5')
  },
  submitBtnLabel: {
    color: 'black',
    textAlign: "center",
    fontSize: wp('4%'),
    lineHeight: wp('3.5%'),
    marginTop: hp('0%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },
  itemImageContainer: {
    backgroundColor: '#D3D3D3',
    marginVertical: hp('1%'),
  },
  occupySuperContainerView: {
    width: wp('40%'),
    height: hp('18%'),
    backgroundColor: '#D3D3D3'
  },
  imageStyle1: {
    flex: 1,
    resizeMode: 'contain',
    width: "100%",
    height: "100%",
  },
  titleText: {
    fontSize: wp('5%'), //20,
    marginTop: wp('1.5'),
    color: 'white',
    textAlign: 'left',
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold",
  },
  itemText: {
    color: "white",
    fontSize: wp('3.5%'),
    lineHeight: wp('3.5%'),
    marginTop: hp('0%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
  },
  itemIconSpacing: {
    marginLeft: 4,
  },
  itemBottomSpacing: {
    marginBottom: 6,
  },
  flexRow: {
    flexDirection: 'row'
  },
  flexRowAlign: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  roomInfoHorizontalSpacing: {
    marginLeft: wp('3%')
  },
  roomInfoVerticalSpacing: {
    marginBottom: wp('2%')
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
    // backgroundColor: 'red',
    // opacity:.9,
    marginTop: hp('2%'),
    flexDirection: 'row',
    alignItems: "center",
    height: hp('4.5%'),
    justifyContent: "center"
  },
  availableView: {
    // backgroundColor: 'red',
    // opacity:.9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: hp('5.5%')
  },
  welcomeToTextView: {
    marginLeft: wp('2%'),
    fontSize: hp('1.8%'),
    color: "white",
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  footer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  loadMoreBtn: {
    padding: 10,
    backgroundColor: '#800000',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 15,
    textAlign: 'center',
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
