import { Dimensions } from "react-native";
import { StyleSheet, Platform } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default StyleSheet.create({
  rootView: {
    resizeMode: "contain",
    flex: 1,
    backgroundColor: "#040404",
    padding: 20
  },
  logo: {
    resizeMode: "contain",
    width: 40,
    height: 40,
    marginHorizontal: 5
  },
  btn: {
    flexDirection: "row",
    width: '100%',
    height: "10%",
    alignItems: "center",
    backgroundColor: "#040404",
    padding: 20,
    marginTop: 15
  },
  scheduleCount: {
    backgroundColor: "#8ac865",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    resizeMode: "contain",
    width: 25,
    height: 25,
    marginHorizontal: 10
  },
  header: {
    flexDirection: 'row',
    justifyContent: "space-between",
    alignItems:'center',
    height:hp(10)
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: "#FFF",
    alignSelf: 'center',
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  infoBtn: { 
    width: 20, 
    height: 20, 
    justifyContent: "center", 
    alignItems: 'center', 
    padding: 5, 
    alignSelf: "center" 
  },
  videoContainer: {
    minHeight: "30%",
    width: '100%',
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  text: {
    color: "#FFF",
    fontSize: hp('1.7`%'),
    fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
  },
  unmute: {
    width: 20,
    height: 20,
    resizeMode: 'contain'
  },
  unmuteBtn: {
    position: "absolute",
    right: 10,
    bottom: 20,
    width: 40,
    height: 40,
    backgroundColor: "#404040",
    justifyContent: "center",
    alignItems: 'center',
    borderRadius: 20,
    opacity: 0.5,
    zIndex: 9,
    elevation: 2
  }

});
