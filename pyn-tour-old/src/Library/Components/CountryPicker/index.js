import React, { useEffect } from 'react';
import { FlatList, Image, Modal, SafeAreaView, Text, View } from 'react-native';
import R from '../../../assest/R';

const CountryPicker = ({
    visible,
}) => {
 
    const rnederCountries = () => {
        let countriesArray =[]
        for(let key in R.countries){
            countriesArray.push({
                ...R.countries[key],
                symbol:key
            })
        }
        return countriesArray;
    }
    useEffect(()=>{
        rnederCountries()
    },[])
    return (
        <Modal visible={visible}>
            <SafeAreaView style={{ backgroundColor: "yellow", flex: 1 }}>
                <FlatList
                    data={rnederCountries}
                    renderItem={({ item, index }) => {
                        return (
                            <Row  item={item}/>
                        )
                    }}
                />
                <Text>Choose country</Text>

            </SafeAreaView>
        </Modal>
    )
};

const Row = ({item}) => {
    return(
        <View style={{flexDirection:"row"}}>
            <Image source={{uri:item.flag}} />
            <Text>{item.callingCode[0]}</Text>
            <Text>jjjjjjjjj</Text>
        </View>
    )
}

export default CountryPicker;