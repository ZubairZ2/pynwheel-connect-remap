import { StyleSheet, Platform } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
export default StyleSheet.create({
  mainContanier: {
    backgroundColor: 'black',
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center'
  },
  logo: {
    flex: 1.8,
    marginTop: hp('4%'),
    alignItems: 'flex-end',
  },
  welcomeView: {
    flex: 1,
    marginTop: hp('3%'),
    alignItems: 'center',
    flexDirection: 'column'
  },
  welcomeText: {
    fontSize: hp('5%'),
    fontWeight: 'bold',
    color: 'white',
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold"

  },
  pnywheel: {
    fontSize: hp('5%'),
    color: 'white',
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"

  },
  propertyView: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp('4%'),
    marginLeft: wp('2%'),
    marginRight: wp('2%'),

  },
  propertyLabel: {
    textAlign: 'center',
    color: 'white',
    fontSize: hp('2.7%'),
    lineHeight: hp('3.7%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"

  },
  skipText: {
    textAlign: 'center',
    color: 'white',
    fontSize: hp('1.7%'),
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold"

  },
  ok: {
    textAlign: 'center',
    color: 'white',
    fontSize: hp('1.4%'),
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold",

  },
  bottomView: {
    flex: 2,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: hp('3%'),
  },

  bottomAddress: {
    flexDirection: 'row',
    borderColor: "white",
    backgroundColor: "black",
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: wp("95%"),
    height: hp("6.8%"),
    marginBottom: hp('2%'),
  },
  okButton: {
    width: wp("95%"),
    height: hp("6.8%"),
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
    alignItems: "center"
  },
  inputStyle: {
    flex: 1,
    height: 40,
    color: "white"
  },

  autocompleteContainer: {
    flex: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 1
  },
  itemText: {
    fontSize: 15,
    margin: 2
  },
  descriptionContainer: {
    // `backgroundColor` needs to be set otherwise the
    // autocomplete input will disappear on text input.
    backgroundColor: '#F5FCFF',
    marginTop: 25,
    height: 200
  },

  selectedPropertText: {
    color: "white",
    marginRight: 10,
  },

  tickIcon: {
    position: 'absolute',
    right: wp('1%')
  },

  infoText: {
    textAlign: 'center'
  },
  spinnerTextStyle: {
    color: '#FFF'
  },
  titleText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 10,
    marginTop: 10,
    textAlign: 'center'
  },  
  directorText: {
    color: 'grey',
    fontSize: 12,
    marginBottom: 10,
    textAlign: 'center'
  },
  openingText: {
    textAlign: 'center'
  },
  slideSubTitle:{ 
    color: "white", 
    textAlign: "center", 
    fontSize: wp('3.2%'), 
    lineHeight: wp('5%'), 
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",marginTop:5,
  },
  slideNextBtn: { 
    justifyContent: 'center', 
    alignItems: 'flex-end', 
    paddingRight:15,
    height: hp('5%'), 
    width: hp('15%') 
  },
})