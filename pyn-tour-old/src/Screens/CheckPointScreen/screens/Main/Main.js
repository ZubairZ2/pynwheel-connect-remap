import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import DropDown from '../../components/DropDown/DropDown';
import styles from './style';
import BackgroundImage from '../../../../Library/Components/PageBackgroundImage';
import CPHeader from '../../../../Library/Components/Header';

const document = [
  {label: "Driver's License", value: 'Driving'},
  {label: 'ID', value: 'Id'},
  {label: 'Passport', value: 'Passport'},
  {label: 'PassportCard', value: 'PCard'},
  {label: 'International ID', value: 'IID'},
];

export class Main extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      document: document[0].value,
      loading: false,
      images: [],
      camera: false,
    };
  }

  changeCategory = (value) => {
    this.setState(
      {
        document: value,
        loading: true,
      },
      () => {
        // console.log(this.state.document);
        setTimeout(() => {
          this.setState({
            loading: false,
          });
        }, 800);
      },
    );
  };

  documentScan = () => {
    this.props.navigation.navigate('FrontView', {
      document: this.state.document,
    });
  };

  setInImageArr = (picture) => {
    this.setState(
      {
        camera: false,
      },
      () => {
        switch (this.state.document) {
          case 'Passport':
            setTimeout(() => {
              this.props.navigation.navigate('Selfie', {
                document: 'Passport',
                img: picture,
              });
            }, 250);

            break;
          case 'Driving':
            this.setState(
              {
                images: [...this.state.images, picture],
              },
              () => {
                if (this.state.images.length == 2) {
                  setTimeout(() => {
                    this.props.navigation.navigate('Selfie', {
                      document: 'Driving',
                      img: this.state.images,
                    });
                  }, 250);
                }
              },
            );
            break;
          case 'Id':
            setTimeout(() => {
              this.props.navigation.navigate('Selfie', {
                document: 'Id',
                img: picture,
              });
            }, 250);
            break;
        }
      },
    );
  };

  onGoBack=()=>{
    if(this.props.navigation.goBack()){
      this.props.navigation.goBack()
    }else{
      this.props.navigation.replace("Home")
    }
  }
  render() {
    console.log(this.state.document);
    return (
      <View style={{flex:1}}>
        <CPHeader title="ID VERIFICATION" backBtnVisible onGoBack={this.onGoBack}/>
      <BackgroundImage style={styles.constainer}>

        <Text style={styles.document}>Select your document type</Text>

        <View style={{marginBottom: 20}}>
          <DropDown
            label={document[0]}
            arr={document}
            selectType={(value) => this.changeCategory(value)}
          />
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={() => {
            this.documentScan();
          }}>
          <Text style={styles.verify}>OK</Text>
        </TouchableOpacity>
      </BackgroundImage>
      </View>
    );
  }
}

export default Main;
