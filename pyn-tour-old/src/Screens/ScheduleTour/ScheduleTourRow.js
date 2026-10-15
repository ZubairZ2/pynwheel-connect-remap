import React from 'react';
import { Dimensions, Image, Linking, StyleSheet, TouchableOpacity, View } from 'react-native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Text from '../../Components/CustomText';
import { formatAMPM, getMonthName } from '../../Utils/Helpers';
import R from '../../assest/R';

const Item = ({
    onPress,
    onMap,
    isLast,
    item
}) => {
    const {address,city,state,zip,email,logo,name,phone,latitude,longitude,schedule_tour_url}=item?.community
    const getFormatedTime = () => {
        if (item?.tour_type === 'guided_tour' || item?.tour_type === 'self_tour') {
            return item?.tour_time;
            // const tobj = item?.tour_time ? new Date(item?.tour_time) : new Date()
            // const dateStr = tobj.getDate() + " " + getMonthName(tobj.getMonth()) + ", " + tobj.getFullYear() + " - "
            // return dateStr + formatAMPM(tobj)
        } else {
            return ''
        }
      }
      const getName = () => {
        const str = new String(name)
        if(str.length > 20){
            return str.substring(0,23)
        }
        return str
    }
    return(
    <TouchableOpacity onPress={onPress} style={styles.container}>
        <View style={styles.mainRow}>
            <View style={styles.iconCont}>
                <Image source={logo?.url ? { uri: logo.url } : R.images.logoFinal} resizeMode="contain" style={styles.icon} />
                <View style={{ width: Dimensions.get("screen").width, flexDirection: "row", marginTop: 10  }}>
                        <Text style={[styles.title, { fontSize: 13, textAlign: 'center', width: 90 }]}>{item?.display_tour_type}</Text>
                    <Text style={[styles.title, { marginLeft: 0 }]}>{getFormatedTime()}</Text>
                </View>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between",width:"75%" }}>
                <View style={{ marginLeft: 10,width:"72%", }}>
                    <Text style={[styles.text, { fontWeight: "bold" }]}>{getName()}</Text>
                    <Text style={[styles.text, { marginTop: 10,fontSize:16, lineHeight: 18 }]}>{address + " " + city}</Text>
                        <Text style={[styles.text, { marginTop: 10, fontSize: 16, lineHeight: 18 }]}>{state + " " + zip}</Text>
                </View>
                <View style={{ width: "25%",marginLeft:5, justifyContent: "space-between",alignItems:'flex-end',paddingRight:"5%" }}>
                    <TouchableOpacity onPress={()=>{
                        Linking.openURL(`tel:${phone}`)
                    }}>
                        <Image style={styles.iconSM} source={R.images.call} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>onMap(latitude,longitude)}>
                        <Image style={styles.iconSM} source={R.images.locationIcon} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
        {isLast?null:<View style={styles.divider} />}
    </TouchableOpacity>
)};

export default Item;

const styles = StyleSheet.create({
    container: {
        marginTop:hp(2)
    },
    mainRow: {
        flexDirection: "row",
    },
    iconCont: {
        width: 82,
        height: 82,
        borderRadius: 40,
        padding: 2,
        backgroundColor: "#000",
        marginLeft:6
    },
    icon: {
        width: 80,
        height: 80,
        borderRadius:40
    },
    title: {
        color: "#8d8c8c",
        marginTop: 10
    },
    divider: {
        backgroundColor: '#4c4a4a',
        height: 2,
        width: "95%",
        alignSelf: "center",
        marginTop: 40
    },
    text: {
        color: "#FFF"
    },
    iconSM: {
        width: 25,
        height: 25,
        marginTop: 20,
    },
})