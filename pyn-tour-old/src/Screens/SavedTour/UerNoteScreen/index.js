import React, { Component } from 'react';
import { View, Text, FlatList, StyleSheet, Platform, ImageBackground } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R, { } from "../../../assest/R";
import CopyRight from "../../../Library/Components/Copyright"
import Header from '../../../Library/Components/Header/index'

class index extends Component {
  constructor(props) {
    super(props);
    this.notesDataArray = null,
      this.state = {
      };
  }
  
  componentWillMount() {
    const { navigation } = this.props;
    this.notesDataArray = navigation.getParam("notesDataArray", null);
  }

  renderSeparator = () => {
    return (
      <View
        style={{ height: 1, width: "100%", backgroundColor: "gray",}}
      />
    );
  };

  render() {
    const { navigation } = this.props;
    return (
      <View style={styles.container}>
        <ImageBackground source={R.images.backgroundImage} style={{ flex: 1, backgroundColor: "black", width: wp('100%'), height: hp('100%'),
        }}
          imageStyle={{ resizeMode: 'stretch' }} >
          <Header backBtnVisible={true} title="User Notes" navigation={navigation} onGoBack={() => {
            if (navigation.goBack()) {
              navigation.goBack()
            } else {
              navigation.replace("Welcome");
            }
          }} />
          <FlatList style={styles.flatListContainer} data={this.notesDataArray} renderItem={({ item, index }) =>
            <View style={styles.renderItemcontainer}>
              <View style={styles.occupySuperContainerView}>
                <View style={styles.propertyNameContainerView}>
                  <Text style={styles.item} multiline={true}>{item.note}</Text>
                  <Text style={styles.itemDate}>{item.event_time}</Text>
                </View>
              </View>
            </View>
          }
            ItemSeparatorComponent={this.renderSeparator}
            ListFooterComponent={this.renderSeparator} />
        </ImageBackground>
        <CopyRight />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, width: wp('100%'), },
  flatListContainer: {  flex: 1,},
  renderItemcontainer: { flex: 1, flexDirection: 'row', },
  occupySuperContainerView: { width: wp('100%'), paddingLeft: wp('2%'), paddingTop: wp('5%'), paddingBottom: wp('5%'), },
  propertyNameContainerView: {  flex: -1,flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start',},
  item: {  fontSize: 18,justifyContent: 'center',color: 'white',fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",},
  itemDate: {fontSize: 14,justifyContent: 'center',color: 'gray',top: 8,fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light",},
})

export default index;
