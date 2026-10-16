import React, { Component } from 'react';
import { BackHandler, Image, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { Header } from 'react-navigation-stack';
import R from '../../../assest/R';

export default class CPHeader extends Component {

    onBack = () => {
        const { onGoBack } = this.props
        if (onGoBack) {
            onGoBack()
        }
    }
    backHandler=()=>{
        return true
    }
    componentDidMount(){
        BackHandler.addEventListener("hardwareBackPress",this.backHandler)
    }
    componentWillUnmount(){
        BackHandler.removeEventListener("hardwareBackPress",this.backHandler)
    }
    render() {
        return (
            <View style={styles.container}>
                <SafeAreaView style={{flex:1,flexDirection:"row",backgroundColor:"#000"}}>
                {this.props.backBtnVisible && 
                <TouchableOpacity style={styles.btn} onPress={this.onBack}>
                    <Image
                        source={R.images.backArrow}
                        style={{
                            width: wp('6%'),
                            height: hp('5%'),
                            resizeMode: 'contain',
                            marginLeft: wp('1.5%'),
                        }}
                    />
                </TouchableOpacity>}
                    <Text
                        style={[styles.title, !this.props.backBtnVisible && { marginLeft: 0 }, { fontSize: this.props.titleFontSize ?? 14 }]}>
                        {this.props.title}
                    </Text>
                </SafeAreaView>
            </View>
        );
    }
}

const styles=StyleSheet.create({
    container:{
        backgroundColor: 'black',
        borderWidth: 1,
        borderBottomColor: 'black',
        // marginLeft:-15,
        // marginRight:-15,
        // marginTop:-15,
        flexDirection:"row",
        alignContent:"center",
        minHeight:Header.HEIGHT,
        paddingTop:Platform.OS === "ios"?20:(StatusBar.currentHeight || 0),
        alignItems:"center",
    },
    btn:{
        width:wp(15),
        justifyContent:"center",
        // height:"100%",
        // backgroundColor:"black",
        zIndex:1000
    },
    title:{
        flex:1,
        marginLeft:-wp(15),
        color: 'white',
        fontFamily: Platform.OS === 'android' ?  "GothamBold" :  "Gotham-Bold",
        alignSelf: 'center',
        textAlign: 'center',
      }
})