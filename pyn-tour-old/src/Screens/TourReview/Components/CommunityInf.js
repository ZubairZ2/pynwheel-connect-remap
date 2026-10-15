import React from 'react';
import { Image, View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Text from '../../../Components/CustomText';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import R from '../../../assest/R';
const TAGS=["MAP","PHONE","CHAT"]
const CommunityInfo = ({
    info,
    navigation,
    onBackPress
}) =>{
    const {community_logo,community_name,community_phone,community_address,community_latitude,community_longitude,chat_enabled}=info
    const iconBtnPress = (TAG) => {
        switch (TAG) {
            case TAGS[0]:
                navigation.navigate("Mapview", { lat:community_latitude, long:community_longitude })
                break;
            case TAGS[1]:
                Linking.openURL(`tel:${community_phone}`)
                break;
            case TAGS[2]:
            navigation.navigate("Chat")
            break;
        }
    }
    return (
    <View style={styles.container}>
        <View style={{ flexDirection: 'row', alignItems: "center" }}>
            <TouchableOpacity onPress={()=>{
                onBackPress()
                // navigation.goBack()
                // if (navigation.goBack()) {
                //     console.log('BACK_BUTTON');
                //     navigation.navigate('Home')
                //   } else {
                //     navigation.replace("Home")
                //   }
            }}>
                <Image source={R.images.backArrow} resizeMode="contain" style={styles.backArrowIcon} />
            </TouchableOpacity>
            <Image source={community_logo?.url?{uri:community_logo?.url}:R.images.logoFinal} resizeMode="cover" style={styles.communityLogo} />
            <View style={{ marginLeft: 20 }}>
                <Text numberOfLines={1} style={styles.communityName}>{community_name}</Text>
                <Text numberOfLines={2} style={{ color: "#FFF",width:wp(50),lineHeight:22,marginTop:5 }}>{community_address}</Text>
            </View>
        </View>
        {/* <View style={styles.iconsContainer}>
            <TouchableOpacity onPress={()=>iconBtnPress(TAGS[0])} style={styles.iconBtn}>
                <Image source={R.images.locationIcon} style={styles.icon} />
                <Text style={{ color: "#FFF" }}>MAP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>iconBtnPress(TAGS[1])} style={styles.iconBtn}>
                <Image source={R.images.call} style={styles.icon} />
                <Text style={{ color: "#FFF" }}>CALL US</Text>
            </TouchableOpacity>
            {chat_enabled &&
                <TouchableOpacity onPress={()=>iconBtnPress(TAGS[2])} style={styles.iconBtn}>
                <Image source={R.images.chat} style={styles.icon} />
                <Text style={{ color: "#FFF" }}>CHAT</Text>
            </TouchableOpacity>
            }

        </View> */}
    </View>
)};

export default CommunityInfo;
const styles = StyleSheet.create({
    container: { 
        width: "100%", 
        // flex: 1, 
        paddingVertical: 10,
    },
    backArrowIcon: {
        width:25,
        height:25,
        marginLeft:5
      },
      communityLogo: {
        width:90,
        height:90,
        borderWidth:1,
        borderRadius:50,
        marginLeft:15
      },
      communityName: { 
        fontWeight: "bold", 
        fontSize: 20, 
        color: "#FFF",
        width:wp(55)
    },
      iconsContainer: {
        flexDirection:'row',
        justifyContent:"space-between",
        flex:1,
        alignItems:'center',
        paddingHorizontal:10
      },
      iconBtn: {
        backgroundColor:"#000",
        flexDirection:"row",
        padding:5,
        justifyContent:'center',
        alignItems:'center',
        width:'30%',
        height:hp(5)
      },
      icon: {
        width:25,
        height:25,
        marginRight:10
      },
})