import { StyleSheet } from 'react-native'

export default StyleSheet.create({
  rootView: {
    resizeMode: "contain",
    flex: 1,
    backgroundColor: "black",
  },
  floatingBtn: {
    position: "absolute",
    right: 0,
    bottom: "20%",
    backgroundColor: "#bababa",
    padding: 20,
    borderTopLeftRadius: 60,
    borderBottomLeftRadius: 60
  },
  floatingBtnSub: {
    justifyContent: "center",
    alignItems: "center"
  },
  floatingBtnTxt: { 
    color: "#000",
    marginTop: 10, 
    fontWeight: "bold" 
  }
});