/**
* Sample React Native App
* https://github.com/facebook/react-native
*
* @format
* @flow
*/
import React, { Component } from "react";
import ImageView from "react-native-image-progress";
import ImageZoom from 'react-native-image-pan-zoom';
import { StyleSheet, View, ImageBackground, Dimensions, Image } from "react-native";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

import R from "../../../assest/R";
import GoButton from '../../../Library/Components/GoButton';
import CopyRight from "../../../Library/Components/Copyright"
import { calculateXForStop } from "../../TourMapScreen/TourmapScreenHelper";
import { calculateYForStop } from "../../TourMapScreen/TourmapScreenHelper";
import Header from '../../../Library/Components/Header/index'


export default class UnitPlotScreen extends Component {
    static navigationOptions = ({ navigation }) => {
        return {
            title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title,
        }
    }
    state = {
        mapImage: "",
        x_plot: '',
        y_plot: '',
        //Why in state, should be the part of property
        imageWidth: 1,
        imageHeight: 1,
        imageContanierHeight: 300,
        //isLoading: true,
        showPoints: false,
    }
    constructor() {
        super()
        this.markerHeight = 25;
        this.markerWidth = 19;
    }


    calculateXForStop = (x) => {
        return calculateXForStop(x, this.state.imageWidth)
    }

    calculateYForStop = (y) => {
        return calculateYForStop(y, this.state.imageHeight, this.state.imageContanierHeight)
    }

    calculateImageSize = (image) => {
        this.setState({
            isLoading: true
        })
        Image.getSize(
            image,
            (width, height) => {
                console.log(width + " wh " + height);
                this.setState({
                    imageHeight: height,
                    imageContanierHeight: height * (Dimensions.get("window").width / width),
                    imageWidth: width,
                    isLoading: false,
                });
            },
            error => {
                this.setState({
                    isLoading: false
                })
                console.warn("Could not get the image size:" + error.message);
            }
        );
    }

    nextButtonPress = () => {
        this.props.navigation.goBack()
    }


    //////////////////Default met/////////////////////
    componentDidMount() {
        const { navigation } = this.props;
        const unitll = navigation.getParam('selectedUnit', '');
        const image = unitll.sitemap_image_url
        this.setState({ 
            mapImage: image,
            title: "Unit " + unitll.marketing_name
        })
        this.setState({ x_plot: unitll.x_plot })
        this.setState({ y_plot: unitll.y_plot })
        this.calculateImageSize(image);

        // this.ChangeThisTitle("Unit " + unitll.marketing_name)

    }

    // ChangeThisTitle = (titleText) => {
    //     const { setParams } = this.props.navigation;
    //     setParams({ title: titleText })
    // }

    drawPath() {
        return (
            <Image
                style={{
                    height: this.markerHeight,
                    width: this.markerWidth,
                    position: "absolute",
                    left: this.calculateXForStop(typeof (this.state.x_plot) !== 'undefined' ? this.state.x_plot : 1),
                    top: this.calculateYForStop(typeof (this.state.y_plot) !== 'undefined' ? this.state.y_plot : 1),
                }}
                source={R.images.star}
            />)
    }

    imageLoaded = () => {
        this.setState({
            showPoints: true
        })
    }

    render() {
        const { navigation } = this.props;
        return (
            <View style={styles.container}>
                <ImageBackground
                    source={R.images.backgroundImage}
                    style={{ backgroundColor: 'black', flex: 1, flexDirection: 'column', }}
                    imageStyle={{    resizeMode: "stretch"}}                >
                          <Header backBtnVisible={true} title={this.state.title} navigation={navigation} onGoBack={() => {
                        if (navigation.goBack()) {
                            navigation.goBack()
                        } else {
                            navigation.replace("Welcome");
                        }
                    }} />
                    <View style={{ flex: 0.7, justifyContent: 'center' }}>
                        <ImageZoom cropWidth={Dimensions.get('window').width}
                            cropHeight={hp('62%')}
                            imageWidth={Dimensions.get("window").width}
                            imageHeight={this.state.imageContanierHeight}>
                            <ImageView
                                resizeMode="contain"
                                style={{
                                    width: Dimensions.get("window").width,
                                    height: this.state.imageContanierHeight,
                                }}
                                source={{ uri: this.state.mapImage }}
                                onLoadEnd={this.imageLoaded}
                                key={this.state.mapImage}
                                imageStyle={{
                                    resizeMode: "contain"
                                }}>
                                {this.state.showPoints ? this.drawPath() : null}
                            </ImageView>
                        </ImageZoom>
                    </View>
                    <GoButton goPressed={() => this.nextButtonPress()} />
                    <CopyRight />
                </ImageBackground>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5FCFF"
    },
    welcome: {
        fontSize: 20,
        textAlign: "center",
        margin: 10
    },
    instructions: {
        textAlign: "center",
        color: "#333333",
        marginBottom: 5
    }
});
//913