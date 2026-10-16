import React, {useState, useEffect} from 'react';
import {View, Platform} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';

const document = [
  {label: "Driver's License", value: 'Driving'},
  {label: 'State ID', value: 'Id'},
  {label: 'Passport', value: 'Passport'},
];

const DropDown = (props) => {
  const [items, setItems] = useState(props.arr);
  var controller;
  useEffect(() => {
    controller.selectItem(props.label);
  }, [props.label]);

  const changeItem = (item) => {
    props.selectType(item.value);
  };

  return (
    <>
      <DropDownPicker
        controller={(instance) => (controller = instance)}
        defaultNull={props.arr == null}
        defaultValue={document[0].value}
        items={props.arr}
        // placeholder="Select an Document"
        containerStyle={{height: 50}}
        style={{
          flexDirection: 'row',
          backgroundColor: 'black',
          width: '100%',
          borderColor: 'black',
          zIndex: 10,
        }}
        itemStyle={{
          marginLeft: 6,
          width: '100%',
          justifyContent: 'flex-start',
        }}
        labelStyle={{
          fontSize: 14,
          color: '#646464',
          fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light"
        }}
        arrowColor={'#fff'}
        dropDownStyle={{
          backgroundColor: 'black',
          width: '100.60%',
          marginLeft: '-0.3%',
          borderColor: 'transparent',
        }}
        activeItemStyle={{
          // backgroundColor: '#151515',
          width: '100%',
          flexDirection: 'row',
          marginLeft: 6,
          // paddingVertical: 0,
        }}
        onChangeItem={(item) => changeItem(item)}
      />
    </>
  );
};

export default DropDown;
