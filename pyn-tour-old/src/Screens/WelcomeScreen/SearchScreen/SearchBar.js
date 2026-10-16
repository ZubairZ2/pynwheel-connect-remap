import React, { Component } from 'react';

import {
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  BackHandler,
  StatusBar,
  ImageBackground,
  Alert,
} from 'react-native';
// import Singleton from "../../../Singleton";
import R from "../../../assest/R";
import { connect } from 'react-redux'
import { setSelectedCommunity } from '../../../redux/actions/selectedCommunityAction';

import Header from '../../../Library/Components/Header/index'

import { widthPercentageToDP as wp, heightPercentageToDP as hp, } from 'react-native-responsive-screen';
var { height, width } = Dimensions.get('window');

class SearchBar extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dataSource: [],
      //isLoading: true,
      text: '',
      move: false,
      selectedPropertyName: "",
      layout: {
        height: height,
        width: width,
      },
      search: true,
      found: true,
      communityName: ''
    };
  }
  selectCommunity = (item) => {
    this.props.setCommunity(item)
    // let single = Singleton.getInstance();
    // single.setName(item.name);
    this.props.navigation.goBack();
  };

  componentDidMount() {
    const { navigation } = this.props;
    const communities = navigation.getParam("communities", null);
    const name = navigation.getParam("name", "Enter Property Name");
    this.setState({
      //dataSource : communities,
      //isLoading: false,
      selectedPropertyName: name
    });
  }

  SearchFilterFunction(text) {
    const { navigation } = this.props;
    const communities = navigation.getParam("communities", null);
    //var results = [];
    var newData = []
    if (text !== "") {
      newData = communities?.filter(function (item) {
        const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
        const textData = text.toUpperCase();
        return itemData.indexOf(textData) > -1;
      });
    } else {
      newData = []
    }

    this.setState({
      dataSource: newData,
      text: text,
    });
  }

  searchInputP = () => {
    const { height, width } = Dimensions.get('window');
    const styles = StyleSheet.create({
      searchInputPart: {
        width: wp('100%'),
      },
      contetntInSearch: {
        // marginTop: hp('5%'),
        justifyContent: 'center',
        alignItems: 'center',
      },
      logoStyle: {
        width: hp('25%'),
        height: hp('20%'),
        // backgroundColor: 'orange',
      },
      searchIcon: {
        width: hp('3%'),
        height: hp('3%'),
        marginRight: hp('2%'),
        // backgroundColor: 'orange',
      },
      textInputStyle: {
        fontFamily: 'Gotham-Light',
        marginLeft: hp('2%'),
        marginRight: hp('2%'),
        marginTop: hp('2%'),
        height: hp('6%'),
        //borderWidth: 1,
        paddingLeft: 10,
        // paddingLeft: 10,
        borderColor: 'white',
        color: 'white',
        //backgroundColor: '#FFFFFF',
        backgroundColor: 'black',
      },
      searchButton: {
        backgroundColor: '#030200',
        height: hp('6%'),
        marginLeft: hp('2%'),
        marginRight: hp('2%'),
        marginTop: hp('3.5%'),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
      },
      searchText: {
        fontSize: hp('2.5%'),
        color: 'white',
      },
    });
    return (
      <View style={styles.searchInputPart}>
        <ScrollView  horizontal={false}>
          <TextInput
            placeholderTextColor="white"
            style={styles.textInputStyle}
            onChangeText={(text) => this.SearchFilterFunction(text)}
            value={this.state.text}
            underlineColorAndroid="transparent"
            placeholder="Search Properties"
            disableFullscreenUI={true}
          />
        </ScrollView>
      </View>
    );
  };

  searchResultsP = () => {
    const { height, width } = Dimensions.get('window');
    const styles = StyleSheet.create({
      searchResultsPart: {
        flex: 1,
        width: wp('100%'),
        marginRight: wp('2%'),
        // backgroundColor: 'black',
      },
      textStyle: {
        fontFamily: 'Gotham-Light',
        color: 'white',
        width: wp ('85'),
        lineHeight: 32,
        // backgroundColor: 'red',
        // height: hp ('10'),
        fontSize: hp('2.1%'),
      },
      textRightStyle: {
        textAlign: "right",
        // backgroundColor:"orange",
        fontFamily: 'Gotham-Light',
        color: 'grey',
        fontSize: hp('2%'),
        marginTop: hp('0.3%'),
      },
      textAddressStyle: {
        fontFamily: 'Gotham-Light',
        marginTop: hp('0.8%'),
        color: 'white',
        fontSize: hp('1.5%'),
      },
      TextStyle: {
        fontFamily: 'Gotham-Light',
        fontSize: hp('1.6%'),
        color: 'white',
        marginTop: hp('2%'),
        marginLeft: hp('2%'),
      },
      searchIcon: {
        width: hp('2.3%'),
        height: hp('2.3%'),
        marginTop: hp('0.5%'),
      },
    });
    var maxlimit = 15;
    return (
      <View style={styles.searchResultsPart}>
        <Text style={styles.TextStyle}>SEARCH RESULTS</Text>
        {this.state.dataSource?.length != 0 ? (
          <View style={{ flex: 1 }}>
            <FlatList keyboardShouldPersistTaps={'handled'}
              data={this.state.dataSource || []}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', flex: 1, justifyContent: 'space-between', borderTopWidth: 0.3, paddingTop: 10, paddingBottom: 10, borderColor: 'grey', borderBottomWidth: 0.5, }}
                  onPress={() => this.selectCommunity(item)}>
                  <View onPress={() => this.selectCommunity(item)} style={{ flexDirection: 'column', paddingRight: 10, justifyContent: "center"}}>
                    <Text style={styles.textStyle}>{item.name}</Text>
                    <Text style={styles.textAddressStyle}>{item.company_name}</Text>
                  </View>
                  {/* <View style={{ flexDirection: 'row', paddingTop: 5, flexGrow: 1, backgroundColor: 'green'}}>
                    <Text style={[styles.textRightStyle, { flexGrow: 1, marginRight: 10 }]}>
                    </Text>
                    <Image resizeMode="contain" style={styles.searchIcon}></Image>
                  </View> */}
                </TouchableOpacity>
              )}
              enableEmptySections={true}
              style={{ margin: hp('2%'), zIndex: 1000 }}
                keyExtractor={(item, index) => index.toString()}
            />
          </View>
        ) : (
            <View
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{
                textAlign: 'center',
                color: 'white',
                fontSize: hp('1.8%'),
                lineHeight: hp('3.7%'),
                fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
              }}>Type the property name into the search bar above.</Text>
              <Text style={{
                textAlign: 'center',
                color: 'white',
                fontSize: hp('1.8%'),
                lineHeight: hp('3.7%'),
                fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
              }}>Can't find the property your're looking for?</Text>
              <Text style={{
                textAlign: 'center',
                color: 'white',
                fontSize: hp('1.8%'),
                lineHeight: hp('3.7%'),
                fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
              }}>Sorry, they must not have Pynwheel Tour set up! :(</Text>
            </View>
          )}
      </View>
    );
  };

  render() {
    const { navigation } = this.props;
    const { height, width } = Dimensions.get('window');
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        backgroundColor: '#1a2228',
        flexDirection: 'row',
      },
      container1: {
        flex: 1,
        flexDirection: 'column',
      },
    });
    return (
      
      <>
        <StatusBar hidden={false} />
        <ImageBackground source={R.images.backgroundImage} style={{
          backgroundColor: 'black',
          flex: 1,
          flexDirection: 'column',
          alignItems: 'center'
        }}
          imageStyle={{
            resizeMode: "stretch"
          }}>
             <Header backBtnVisible={true} title= "SEARCH PROPERTY NAME" navigation={navigation} onGoBack={()=>{
          if(navigation.goBack()){
            navigation.goBack()
          }else{
            navigation.replace("Welcome");
          }
        }} />
          <View style={styles.container1}>
            {this.searchInputP()}
            {this.searchResultsP()}
          </View>
        </ImageBackground>
      </>
    );
  }
}

//export default SearchBar;
export default connect(mapStateToPropsps, mapDispatchToProps)(SearchBar)
function mapStateToPropsps(state) {
  return {
    counter: state.counter
  }
}

function mapDispatchToProps(dispatch) {
  return {
    //increaseCounter: (payload) => dispatch({ type: 'SELECTED_COMMUNITY', payload })
    setCommunity: payload => dispatch(setSelectedCommunity(payload))
  }
}