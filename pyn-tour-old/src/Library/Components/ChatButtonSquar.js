import React from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { connect } from 'react-redux';

import IconBadge from 'react-native-icon-badge';
import { ringBell } from '../../Utils/Helpers';
import R from "../../assest/R";
import { resetMessageCount, setUnreadMessageCount, setUnreadMessageLastCount } from '../../redux/actions/chatActions';


class ChatButtonSquar extends React.Component {
    constructor() {
        super()
        this.navigating = false
    }
    state = {}
    ringBell =  () => {
        if (this.navigating) {
            this.navigating = false
            return
        }
        ringBell()
    }

    componentDidUpdate() {
        // debugger
        console.log('Chat con componentDidUpdate this.props.height')
        console.log('his.props.height', this.props.height)
        if (this.props.unreadMessageCount1 > 0 && this.props.unreadMessageCount1 !== this.props.unreadMessageLastCount1) {
            console.log('IN Chat con componentDidUpdate ')
            this.ringBell()
            this.props.unreadMessageLastCount(this.props.unreadMessageCount1)
        }
    }
    render() {
        return (
            <View style={{ height: hp(this.props.height), width: wp(this.props.width),}} >   
            {/* <View style={{ height: hp('9%'), width: wp('30%') }} >    */}
                <TouchableOpacity disabled={this.props.disabled} onPress={
                    () => {
                        this.navigating = true
                        this.props.resetMessageCount1()
                        this.props.goPressed()
                    }}
                    style={{ flex: 1, backgroundColor: 'black', alignContent: 'center', justifyContent: 'center' }}>
                    {/* <ImageBackground source={R.images.chatBtn} style={{ flex: 1, alignContent: 'center', justifyContent: 'center' }}
                        imageStyle={{
                            resizeMode: 'stretch'
                        }}> */}
                    <IconBadge
                        MainElement={
                            <View style={{ backgroundColor: 'green', width: 0, height: 0, margin: 0 }} />
                        }
                        BadgeElement={
                            <Text style={{ color: '#FFFFFF' }}>{this.props.unreadMessageCount1}</Text>
                        }
                        IconBadgeStyle={{ width: 30, height: 30, marginTop: -30, backgroundColor: "rgb(223,101,142)" }
                        }
                        Hidden={this.props.unreadMessageCount1 == 0}
                    />
                    <Image source={R.images.chat} style={{ alignSelf: 'center', width: 28, height: 28, marginTop: 8 }} />
                    <Text style={{ color: "white", textAlign: "center", marginTop: 12, fontSize: wp('2.5%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", }}>CHAT</Text>
                    {/* </ImageBackground> */}
                </TouchableOpacity>
            </View>
        )
    }
}

export default connect(mapStateToPropsps, mapDispatchToProps)(ChatButtonSquar)
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

