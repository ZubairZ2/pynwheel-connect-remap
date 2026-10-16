import React from 'react';
import { Image, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import IconBadge from 'react-native-icon-badge';
import { connect } from 'react-redux';
import { ringBell } from '../../Utils/Helpers';
import R from "../../assest/R";
import { resetMessageCount, setUnreadMessageCount, setUnreadMessageLastCount } from '../../redux/actions/chatActions';
class ChatButton extends React.Component {
    constructor() {
        super()
        this.navigating = false
    }
    state = {
    }
    ringBell = () => {
        if (this.navigating) {
            this.navigating = false
            return
        }
        ringBell()
    }

    componentDidUpdate() {
        if (this.props.unreadMessageCount1 > 0 && this.props.unreadMessageCount1 !== this.props.unreadMessageLastCount1) {
            this.ringBell()
            this.props.unreadMessageLastCount(this.props.unreadMessageCount1)
        }
    }

    render() {
        return (
            <View style={this.props.containerStyle ?? style.okbuttonContainer} >
                {/* <AppConsumer>
                {context => {
                if(context.MyName > 0 && context.chatButtonLastCount !== context.MyName){
                    this.ringBell()
                    context.setChatButtonLastCount(context.MyName)
                }
                if(context.MyName === 0 && context.chatButtonLastCount !== 0){
                    context.resetCount()
                }  */}
                <TouchableOpacity disabled={this.props.disabled} onPress={
                    () => {
                        this.navigating = true
                        this.props.resetMessageCount1()
                        this.props.goPressed()
                    }}
                    style={{ flex: 1 }}>
                    <ImageBackground source={R.images.chatBtn} style={{ flex: 1, alignContent: 'center', justifyContent: 'center' }}
                        imageStyle={{
                            resizeMode: 'stretch'
                        }}>
                        <IconBadge
                            MainElement={
                                <View style={{
                                    backgroundColor: 'green',
                                    width: 0,
                                    height: 0,
                                    margin: 0
                                }} />
                            }
                            BadgeElement={
                                <Text style={{ color: '#FFFFFF' }}>{this.props.unreadMessageCount1}</Text>
                            }
                            IconBadgeStyle={{ width: 30, height: 30, marginTop: -30, backgroundColor: "rgb(223,101,142)" }
                            }
                            Hidden={this.props.unreadMessageCount1 == 0}
                        />
                        <Image source={R.images.chat} style={{ alignSelf: 'center', width: 20, height: 20 }} />
                        <Text style={{ color: "white", textAlign: "center", marginTop: 8, fontSize: wp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHAT</Text>
                    </ImageBackground>
                </TouchableOpacity>
                {/* }}
                </AppConsumer> */}
            </View>
        )
    }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(ChatButton)
function mapStateToPropsps(state) {
    return {
        unreadMessageCount1: state.chatReducer && state.chatReducer.unreadMessageCount,
        unreadMessageLastCount1: state.chatReducer && state.chatReducer.unreadMessageLastCount
    }
}

function mapDispatchToProps(dispatch) {
    return {
        setUnreadMegCount: payload => dispatch(setUnreadMessageCount(payload)),
        unreadMessageLastCount: payload => dispatch(setUnreadMessageLastCount(payload)),
        resetMessageCount1: payload => dispatch(resetMessageCount()),
    }
}
const style = StyleSheet.create({
    okbuttonContainer: {
        aspectRatio: 1.2 / 1,
        width: wp('28%'),
        position: 'absolute',
        left: wp('0'),
        bottom: hp('15%'),
    },
})
