import { StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  mainBackgroundContainer: {
    backgroundColor: 'black',
    flex: 1,
    flexDirection: 'column',
  },
  mainBackgroundImage: {
    resizeMode: 'stretch'
  },
  spinnerContainer: {
    padding: wp(3),
    // flex: 0.25,
  },
  titleView: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    color: 'white',
    lineHeight: hp('2.6%'),
    fontSize: wp('4%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  nextStopDescText: {
    // marginBottom: 20,
    // marginTop: 10,
  },
  pathContainer: {
    elevation: -1,
    zIndex: -1,
  },
  pathViewImage: {
    resizeMode: 'contain',
  },
  bottomBtnsMainContainer: { 
    width: wp('100'), 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    position: 'absolute',
    bottom: hp('16%'),
  },
  bottomBtnContainer: {
    // width: wp('28'), 
    aspectRatio: 1.45,
    height: wp('20'),
  },
  unlockBtnContainer: {
    // height: hp('12%'),

    alignItems: 'flex-end',
    // marginBottom: hp('-5%'),
    width: wp('100%'),
    position: 'absolute',
    bottom: hp(12)
  },
  unlockBtnSubContainer: {
    width: wp(28),
    aspectRatio: 1.3,
  },
  unlockBtnBackgroundStyle: {
    width: '100%',
    height: '100%',
    alignSelf: 'flex-end',
  },
  unlockBtnImageStyle: {
    resizeMode: 'stretch',
  },
  notWorkingBtnContainer: {
    alignSelf: 'center',
    // top: hp('2%'),
    width: wp('80%'),
    height: hp('3%'),
  },
  rotateBtnMainContainer: {
    // flex: 0.2,
    position: "absolute", 
    bottom: hp(4),
    justifyContent: 'center',
    alignItems: 'center',
    left: 0,
    right: 0
  },
  showMoreText: {
    color: 'rgb(120, 117, 255)',
    textAlign: 'right'
  },
  titlePinText: {
    color: 'white',
    textAlign: 'center',
    lineHeight: hp('2.6%'),
    fontSize: wp('4%'),
    marginLeft: wp('3%'),
    marginRight: wp('3%'),
    marginTop: hp('1%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  mapView: {
    // flex: 0.75,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: hp(16) + (wp(32) * 0.7),
  },
  bottomUnitButtonsView: {
    flex: 0.2,
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
  spinnerTextStyle: { color: '#FFF' },
  okbuttonContainer: {
    aspectRatio: 1.2 / 1,
    width: wp('32%'),
    position: 'absolute',
    left: wp('0'),
    bottom: hp('15%'),
  },
  okbuttonContainer1: {
    aspectRatio: 1.2 / 1,
    width: wp('32%'),
    position: 'absolute',
    left: wp('0'),
    bottom: hp('0%'),
    backgroundColor: 'red',
  },
  okButton: {
    width: wp('95%'),
    height: hp('6.8%'),
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  ok: {
    textAlign: 'center',
    color: 'white',
    fontSize: hp('1.8%'),
    fontFamily: Platform.OS === 'android' ? 'GothamLight' : 'Gotham-Light',
  },
  overlay: {
    flex: 1,
    position: 'absolute',
    left: 0,
    top: 0,
    opacity: 1,
    width: wp('100'),
  },
  userAvatar: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  youAreHereImage: {
    width: 20,
    height: 10,
    marginTop: -10,
    resizeMode: 'stretch',
  },
  userPositionCotainer: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  destinationAvatar: {
    width: 26,
    height: 26,
  },
  positionMainContainer: {
    position: 'absolute',
  },
  youAreHereText: {
    textAlign: "center",
    color: "#FFF",
    fontSize: 10,
    fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold"
  },
  youAreHereContainer: {
    backgroundColor: '#F26639',
    height: 40,
    width: 34,
    justifyContent: 'center',
    marginTop: -43,
    marginLeft: -7,
    borderWidth: 1,
    borderColor: '#FFF'
  },
  youAreHereContainerNotch: {
    bottom: -4,
    position: 'absolute',
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F26639',
  },
  actionBtnContainer: {
    aspectRatio: 1.45 / 1,
    width: wp(32),
    position: 'absolute',
    bottom: hp(16),
  },
  actionBtnSubContainer: {
    width: '100%',
    height: '100%'
  }
});
