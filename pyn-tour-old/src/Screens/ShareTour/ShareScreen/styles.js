import { StyleSheet, Platform } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default StyleSheet.create({
  mainContanier: {
    backgroundColor: 'black',
    flex: 1,
  },

  logo: {
    flex: 1.8,
    marginTop: hp('10%'),
    alignItems: 'stretch',
    backgroundColor: 'red'
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
    flex: 0.5,
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
  ok: {
    textAlign: 'center',
    color: 'black',
    fontSize: hp('1.8%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"

  },
  mainView: {
    flex: 10,
  },

  nameView: {
    flexDirection: 'column',
    marginTop: hp('1%'),
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: wp("95%"),
    height: hp("11%"),
  },
  recepientNameView: {
    flexDirection: 'column',

    justifyContent: 'center',
    alignItems: 'flex-start',
    width: wp("95%"),
    height: hp("11%"),
  },
  phoneNumberView: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: wp("95%"),
    height: hp("11%"),
  },
  emailAddressView: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: wp("95%"),
    height: hp("11%"),
  },

  InputTextView: {
    flexDirection: 'row',
    backgroundColor: "black",
    justifyContent: 'center',
    alignItems: 'center',
    height: hp("6.8%"),
    marginTop: hp('.8%'),
  },

  phoneNumber: {
    flexDirection: 'row',
    backgroundColor: "black",
    justifyContent: 'center',
    alignItems: 'center',
    width: wp('62%'),
    height: hp("6.8%"),
    marginTop: hp('.5%'),
  },
  okButton: {
    width: wp("95%"),
    height: hp("6.8%"),
    backgroundColor: "#D3D3D3",
    justifyContent: "center",
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
  }
})