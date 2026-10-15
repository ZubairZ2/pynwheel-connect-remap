import { StyleSheet, Platform } from 'react-native'
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5FCFF",
    },
    backGroundImage: {
        flex: 1,
        backgroundColor: 'black',
    },
    topCont: {
        // flex: 0.25,
        flex: 1,
        justifyContent: 'center'
    },
    spinnerTextStyle: { color: '#FFF' },
    titleView: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: "center",
    },
    titleText: {
        color: "white",
        textAlign: "center",
        lineHeight: hp('3%'),
        fontSize: wp('4%'),
        marginLeft: wp('3%'),
        marginRight: wp('3%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",
    },
    titleBold: {
        fontFamily: Platform.OS === 'android' ? "GothamBold" : "Gotham-Bold"
    },
    imageCont: {
        // flex: 0.55,
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'green'
    },
    bottomBtnCont: {
        // flex: 0.2,
        padding: 10,
        flex: 1,
        flexGrow: 1,
        justifyContent: 'flex-end',
        paddingBottom: 20,
    },
    contBtn: {
        backgroundColor: '#fecf29',
        height: 50,
        marginHorizontal: 20,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    codeBtnContainer: {
        marginTop: hp(1),
        backgroundColor: 'transparent',
    },
    btnTxt: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: wp('4.5%'),
        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
    },
    image: {
        //width: '100%',
        //height: '100%',
        //flex: 1,
        resizeMode: 'contain'
    },
    moreText: {
        color: "rgb(120, 117, 255)",
        paddingBottom: 10,
        alignSelf: 'center'
    },
    latchLoadinView: {
        height: hp('70'),
        zIndex: 1000,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: wp('4.5%'),
    },
    animatingDot: {
        color: 'white',
        fontSize: 150,
        top: hp('-30')
    },
    waitText: {
        color: 'white',
        top: hp('30'),
        position: 'absolute',
        fontSize: wp('4.5%'),
    },
    showLatchLink: {
        flex: 1,
        width: wp('100%'),
        alignItems: 'center'
    },
    latchWebview: {
        height: hp("100%"),
        width: wp("100%"),
        backgroundColor: 'black'
    }
})
export { styles }