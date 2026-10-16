import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput, Modal, FlatList, SafeAreaView } from 'react-native';
import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen'

// Load country data directly from the local JSON
const countriesData = require('react-native-country-picker-modal/lib/assets/data/countries-emoji.json');

// Country code to emoji flag
const countryCodeToFlag = (code: string) => {
    return code
        .toUpperCase()
        .split('')
        .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');
};

// Build sorted countries list once
const countriesList = Object.keys(countriesData)
    .map(cca2 => ({
        cca2,
        name: countriesData[cca2].name?.common || countriesData[cca2].name || '',
        callingCode: countriesData[cca2].callingCode || [],
        flag: countryCodeToFlag(cca2),
    }))
    .filter(c => c.callingCode.length > 0 && c.name)
    .sort((a, b) => a.name.localeCompare(b.name));

interface IfirstChildProps {
    updatePhoneNumber: (phone: string, valid: boolean) => void,
    onUpdateCountry: (country: any) => void,
    onUpdateNumber: (number: any) => void,
    onRef: (ref: any) => void,
    phoneParam: { number: number, country: any },
    disable: boolean
}

const isAndroid = Platform.OS === 'android';

const PhoneNumber: React.FC<IfirstChildProps> = ({ updatePhoneNumber, onRef, onUpdateCountry, onUpdateNumber, phoneParam, disable }) => {

    const [countryCode, setCountryCode] = useState('US')
    const [country, setCountry] = useState<any>()
    const [callinCode, setCallingCode] = useState('1')
    const [pickerVisible, setPickerVisible] = useState(false)
    const [phone, setPhone] = useState("")
    const [filter, setFilter] = useState("")
    const phoneIsValid = useRef(false)

    useEffect(() => {
        if (phoneParam) {
            updatePhone(phoneParam)
        }
    }, [phoneParam])

    const updatePhone = (p: any) => {
        if (p.country) {
            onSelectCountry(p.country)
        }
        let callingCode = "1"
        if (p.country) {
            callingCode = p.country.callingCode[0]
        }
        setPhone(p.number)
        updatePhoneNumber("+" + callingCode + p.number, true)
    }

    const onSelectCountry = (selectedCountry: any) => {
        if (selectedCountry) {
            setCountryCode(selectedCountry.cca2)
            setCountry(selectedCountry)
            setCallingCode(selectedCountry.callingCode[0])
            updatePhoneNumber(('+' + selectedCountry.callingCode[0] + phone), phoneIsValid.current)
            if (onUpdateCountry) {
                onUpdateCountry(selectedCountry)
            }
        }
    }

    const onPickerSelect = (item: any) => {
        onSelectCountry({
            cca2: item.cca2,
            callingCode: item.callingCode,
            name: item.name,
        })
        setPickerVisible(false)
        setFilter("")
    }

    const validatePhoneNumer = (text: string) => {
        let reg = /^[0-9][A-Za-z0-9 -]*$/;
        if (reg.test(text) === false && text.length !== 0) {
            return
        }
        onUpdateNumber(text)
        if (String(text).length < 9) {
            setPhone(text)
            phoneIsValid.current = false
            updatePhoneNumber(('+' + callinCode + text), false)
            return false;
        }
        else {
            setPhone(text)
            phoneIsValid.current = true
            updatePhoneNumber(('+' + callinCode + text), true)
        }
    }

    const filteredCountries = filter
        ? countriesList.filter(c =>
            c.name.toLowerCase().includes(filter.toLowerCase()) ||
            c.cca2.toLowerCase().includes(filter.toLowerCase()) ||
            c.callingCode.some((code: string) => code.includes(filter))
        )
        : countriesList;

    return (
        <View style={{ flexDirection: 'row', marginTop: hp('0%'), width: wp('93.5%') }}>
            <View style={{ opacity: 0.8, width: wp('24%'), height: isAndroid ? hp("6%") : wp('10%'), alignItems: 'center', justifyContent: 'center' }}>
                {disable ?
                    <Text style={{ color: "#FFF" }}>+{callinCode}</Text> :
                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                        <Text style={{ fontSize: hp(2.3) }}>{countryCodeToFlag(countryCode)}</Text>
                        <Text style={{ color: "#FFF", fontSize: hp(2), marginLeft: 4 }}>+{callinCode}</Text>
                    </TouchableOpacity>
                }
            </View>
            <View style={styles.bottomAddress}>
                <TextInput value={phone}
                    editable={!disable}
                    onChangeText={(text) => validatePhoneNumer(text)}
                    placeholderTextColor='white' keyboardType="phone-pad"
                    textContentType="none" maxLength={10} placeholder="Phone Number"
                    style={{
                        flex: 1,
                        backgroundColor: "black",
                        color: "white",
                        height: hp("5.1%"),
                        fontSize: phone ? hp(2.3) : hp(1.8),
                        borderLeftColor: "#FFF",
                        borderWidth: 1,
                        paddingLeft: 10,
                        fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
                    }} />
            </View>

            <Modal visible={pickerVisible} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#333' }}>
                        <TouchableOpacity onPress={() => { setPickerVisible(false); setFilter(""); }}>
                            <Text style={{ color: '#fff', fontSize: 16, paddingRight: 15 }}>✕</Text>
                        </TouchableOpacity>
                        <TextInput
                            style={{ flex: 1, color: '#fff', fontSize: 16, backgroundColor: '#222', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}
                            placeholder="Search country..."
                            placeholderTextColor="#888"
                            value={filter}
                            onChangeText={setFilter}
                            autoFocus
                        />
                    </View>
                    <FlatList
                        data={filteredCountries}
                        keyExtractor={(item) => item.cca2}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                onPress={() => onPickerSelect(item)}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15, borderBottomWidth: 0.5, borderBottomColor: '#333' }}
                            >
                                <Text style={{ fontSize: 22, marginRight: 10 }}>{item.flag}</Text>
                                <Text style={{ color: '#fff', fontSize: 15, flex: 1 }} numberOfLines={1}>{item.name}</Text>
                                <Text style={{ color: '#888', fontSize: 14 }}>+{item.callingCode[0]}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomAddress: {
        marginLeft: hp('2%'),
        flex: 1,
        paddingVertical: 2,
    },
})

export default PhoneNumber;
