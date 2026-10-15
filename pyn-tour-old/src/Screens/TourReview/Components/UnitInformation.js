import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, FlatList } from 'react-native';
import R from '../../../assest/R';
import Text from '../../../Components/CustomText';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import GallaryModel from './GallaryModel';
import Dialog, { SlideAnimation, DialogContent, DialogTitle, DialogFooter, DialogButton, } from 'react-native-popup-dialog';
import moment from 'moment';

const UnitInformation = ({
    info,
    onDelete,
    navigation,
    currency_symbol
}) => {
    const { bathrooms, bedrooms, building, floor, floorplan_image, name, pricing, stop_type, floorplan_id, available, available_date, modal_unit, primary_floorplan, secondary_floorplan, show_apply_now } = info
    const [gallaryVisible, setGallaryVisible] = useState(false)
    const [fpImages, setFPImages] = useState([])
    const [pricingOptions, setPricingOptions] = useState([])
    const [modelVisible, setModelVisible] = useState(false)
    const [showApplyNow, setShowApplyNow] = useState(false)
    useEffect(() => {
        console.log("currency_symbol", currency_symbol)
        setShowApplyNow(() => show_apply_now)
        let imgs = []
        if (primary_floorplan) {
            imgs.push({ source: { uri: primary_floorplan } })
        }
        if (secondary_floorplan) {
            imgs.push({ source: { uri: secondary_floorplan } })
        }
        setFPImages(imgs)
        setPricingOptions(info?.lease_pricing)
    }, [])
    const availabilityDate = () => {
        if (!available_date) return null;
        const date = moment(available_date)
        return date.format('DD') + " " + date.format('MMMM')
    }
    const renderFloor = () => {
        if (floor) {
            if (stop_type === "unit") {
                return <Text style={styles.rowSubtitle}>Floor:{floor}</Text>
            }
        }
        return null
    }
    const renderBuilding = () => {
        if (stop_type) {
            if (stop_type === "unit") {
                if (building) {
                    return <Text style={styles.rowSubtitle}>Building:{building}</Text>
                }
            }
        }
        return null
    }
    return (
        <View>
            <GallaryModel onClose={() => { setGallaryVisible(false) }} isVisible={gallaryVisible} images={fpImages} />
            <View style={{ flexDirection: 'row', marginVertical: 5, marginHorizontal: 10, alignItems: 'center' }}>
                <TouchableOpacity onPress={() => {
                    if (fpImages.length > 0) {
                        setGallaryVisible(true)
                    }
                }}>
                    <Image source={floorplan_image ? { uri: floorplan_image } : R.images.imagesicons} resizeMode="cover" style={styles.rowMap} />
                </TouchableOpacity>
                <View style={{ flex: 1, height: wp(20), justifyContent: "space-between", marginLeft: 10 }}>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.rowTitle}>{name}</Text>
                        {renderFloor()}
                        {renderBuilding()}
                    </View>

                    {stop_type === "unit" &&
                        <>
                            <View style={styles.smallRow}>
                                <View style={{ flexDirection: 'row', }}>
                                    <Image style={styles.smallIcon} resizeMode="contain" source={R.images.bed} />
                                    <Text style={{ color: "#FFF" }}>{bedrooms} Bed</Text>
                                </View>

                                <View style={{ flexDirection: 'row', marginLeft: 10 }}>
                                    <Image style={styles.smallIcon} resizeMode="contain" source={R.images.bath} />
                                    <Text style={{ color: "#FFF" }}>{bathrooms} Bath</Text>
                                </View>
                            </View>

                            <View style={styles.smallRow}>
                                {!modal_unit && <View style={{ flexDirection: 'row' }}>
                                    <Image style={styles.smallIcon} resizeMode="contain" source={currency_symbol === '£' ? R.images.poundIcon : R.images.dollar} />
                                    {pricingOptions?.length > 0 ?
                                        <TouchableOpacity onPress={() => setModelVisible(true)}>
                                            <Text style={[styles.rowSubtitle2, { color: "#89C765", }]}>{pricing}</Text>
                                        </TouchableOpacity> :
                                        <Text style={styles.rowSubtitle2}>{pricing}</Text>
                                    }
                                </View>
                                }

                                <View style={{ flexDirection: 'row', marginLeft: 10 }}>
                                    {
                                        available_date &&
                                        <Image style={styles.smallIcon} resizeMode="contain" source={R.images.refreshIcon} />
                                    }
                                    {available && !modal_unit ?
                                        <Text style={styles.rowSubtitle2}>{availabilityDate()}</Text> :
                                        <Text onPress={() => {
                                            navigation.navigate("CheckUnitAvailaibility",
                                                {
                                                    floorPlanName: name,
                                                    unitID: floorplan_id,
                                                    navigationForm: "TourReviewScreen",
                                                    showApply: showApplyNow
                                                })
                                        }} style={styles.rowSubtitle2}>Check Availability</Text>
                                    }
                                </View>
                            </View>
                        </>
                    }

                </View>
                <TouchableOpacity onPress={onDelete}>
                    <Image source={R.images.deleteIcon} resizeMode="contain" style={styles.icon} />
                </TouchableOpacity>
            </View>
            <View style={styles.divider} />

            <Dialog visible={modelVisible} dialogTitle={<DialogTitle title="Pricing Options" />} footer={<DialogFooter>
                <DialogButton text="OK" onPress={() => { setModelVisible(false) }} />
            </DialogFooter>
            }
                dialogAnimation={new SlideAnimation({
                    slideFrom: 'bottom',
                })} >
                <DialogContent style={{ height: hp('30%'), width: wp('80%') }}>
                    {pricingOptions?.length > 0 ?
                        <FlatList
                            data={pricingOptions}
                            renderItem={({ item }) =>
                                <TouchableOpacity style={{ bottom: hp('1.5%') }} >
                                    <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                                        <View style={{ justifyContent: 'center' }}>
                                            <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_option}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            }>
                        </FlatList> :
                        <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>
                            No pricing option available
                        </Text>
                    }
                </DialogContent>
            </Dialog>

        </View>
    )
};

export default UnitInformation;
const styles = StyleSheet.create({
    icon: {
        width: 25,
        height: 25,
        marginRight: 10
    },
    smallIcon: {
        width: 15,
        height: 15,
        marginRight: 5
    },
    smallRow: {
        flexDirection: 'row',
        marginTop: 10,
    },
    rowMap: {
        width: wp(20),
        height: wp(20),
    },
    rowTitle: {
        color: "#FFF",
        fontSize: 16
    },
    rowSubtitle: {
        color: "#919090",
        fontSize: 10
    },
    rowSubtitle2: {
        color: "#FFF",
        fontSize: 12
    },
    divider: {
        backgroundColor: "#4f4d4d",
        width: "90%",
        height: 1.2,
        alignSelf: "center",
        marginVertical: 10
    }
})