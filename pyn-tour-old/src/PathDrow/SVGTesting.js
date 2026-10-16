/**
* Sample React Native App
* https://github.com/facebook/react-native
*
* @format
* @flow
*/


import React, { Component } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  NetInfo,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";


import ImageZoom from 'react-native-image-pan-zoom';

import Dialog, { DialogButton, DialogContent, DialogFooter, DialogTitle, SlideAnimation, } from 'react-native-popup-dialog';


//import UnitMaptemp from "../assest/UnitMap.png"
import ImageView from "react-native-image-progress";
import R from "../assest/R";

import { heightPercentageToDP as hp, widthPercentageToDP as wp } from 'react-native-responsive-screen';

import ServerConfig from "../Library/ServerCalls/ServerConfig";


import Svg, {
  Line,
  Polyline
} from 'react-native-svg';
import LoadingIndicator from "../Components/LoadingIndicator";


let endT = false;
let iwidth = 0;
let iheight = 0;
let unit = false;
let check = false;
let count = 1;
let isConnected = true
// let unitIndex=0;
// let end=false;
//https://pynwheel-staging.herokuapp.com/communities/439/floorplates/248/draw_path_points
export function getTourData() {
  // debugger
  let url = `${ServerConfig.BaseURL}/api/v1/path/248.json`
  //const url = "https://pynwheel-staging.herokuapp.com/api/v1/path/248.json"

  return fetch(url, {
    method: "GET",
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }
  }
  )
}


export default class SVGTesting extends Component {


  static navigationOptions = ({ navigation }) => {
    const { state } = navigation;
    return {
      title: typeof (navigation.state.params) === 'undefined' || typeof (navigation.state.params.title) === 'undefined' ? '' : navigation.state.params.title.toUpperCase(),
      // title: `${state.params.title}`,
      //title: typeof `${state.params.title}` ===null?" test11": `${state.params.title}` ,
    };
  };

  state = {
    mapImage: "",
    points: [],
    path: [],
    stopss: [],
    startIndex: -1,
    linePoints: null,
    nextIndex: 0,
    imageWidth: 1,
    imageHeight: 1,
    isLoading: false,
    response: [],
    tourData: [],
    isUnit: false,
    selectedUnitId: -1,
    applyUnitUrl: null,
    showFirstPoint: true,
    unitIndex: 0,
    isEnd: false,
    x: 0,
    y: 0,
    floorName: "",
    isNetConnected: true,
    showPoints: false,
    showNextPoint: true,

    isModalVisible: false,
    pricingOptions: null,


    //width = 1,
    dashArray: 0,
    dashOffset: 1000
  }


  constructor() {
    super()

    this.unitStart = false;
    this.isConnected = true;
    this.ImageZoom = null;


  }



  CheckConnectivity = async () => {
    // For Android devices
    if (Platform.OS === "android") {
      const check = await NetInfo.isConnected.fetch().then(isConnected => {
        if (isConnected) {
          this.isConnected = true
          this.setState({
            isNetConnected: true
          });
        } else {
          this.isConnected = false
          this.setState({
            isNetConnected: false
          });
        }
      });
    } else {
      // For iOS devices
      const check = await NetInfo.isConnected.addEventListener(
        "connectionChange",
        this.handleFirstConnectivityChange
      );
    }
  };

  handleFirstConnectivityChange = isConnected => {
    NetInfo.isConnected.removeEventListener(
      "connectionChange",
      this.handleFirstConnectivityChange
    );

    if (isConnected === false) {
      this.isConnected = false
      this.setState({
        isNetConnected: false
      });
    } else {
      this.isConnected = true
      this.setState({
        isNetConnected: true
      });
    }
  };




  calculateX = (x) => {
    let x1 = 1;
    if (this.state.imageWidth !== 1) {
      x1 = (x / this.state.imageWidth) * Dimensions.get("window").width;
    }
    return x1;
  }

  ChangeThisTitle = (titleText) => {
    const { setParams } = this.props.navigation;
    setParams({ title: titleText })
    //alert('change title call')
  }



  calculateYNew = (y) => {
    var y1 = 1;


    if (this.state.imageHeight !== 1) {
      y1 = (y / this.state.imageHeight) * 300

      if ((y1 > (300 / 2))) {
        // if (y1 - 30 > (300 / 2)) {
          y1 = y1 - 5
        // } else {
        //   y1 = y1 - 5
        // }

      }
      else {
        if (y1 - 30 < (300 / 2)) {
          y1 = y1 + 17
        } else {
          y1 = y1 + 5
        }
      }
      //console.warn(y1 + "  y value")
      // console.log(this.state.startIndex+"  "+this.state.nextIndex+' is unit '+this.state.isUnit+"  isEnd "+this.state.isEnd +"  unit i  "+this.state.unitIndex)


    }
    //console.warn(y+' yy')
    return y1;
  }

  calculateY = (y) => {
    var y1 = 1;


    if (this.state.imageHeight !== 1) {
      y1 = (y / this.state.imageHeight) * 300
      if ((y1 > (300 / 2))) {
        if (y1 - 30 > (300 / 2)) {
          y1 = y1 - 18
        } else {
          y1 = y1 - 5
        }
      }
      else {
        // if (y1 - 30 < (300 / 2)) {
          y1 = y1 + 17
        // } else {
        //   y1 = y1 + 5
        // }
      }
    }
    return y1;
  }


  c = (image) => {

    this.setState({
      //isLoading: true
    })
    Image.getSize(
      image,
      (width, height) => {
        //console.log(width + " wh " + height);
        this.setState({
          imageHeight: height,
          imageWidth: width,
          isLoading: false,


          // isUnit:false,

        });
      },
      error => {
        this.setState({
          isLoading: false
        })
        //console.warn("Could not get the image size:" + error.message);
      }
    );

  }

  updateIndex = () => {
    this.setState({
      startIndex: this.state.startIndex < this.state.linePoints.length - 2 ? this.state.startIndex + 1 : this.state.startIndex,
      nextIndex: this.state.nextIndex < this.state.linePoints.length - 1 ? this.state.nextIndex + 1 : this.state.nextIndex,
    })
  }

  // updateIndex = () => {
  //   this.setState({
  //     startIndex: this.state.startIndex < this.state.tourData.length - 2 ? this.state.startIndex + 1 : this.state.startIndex,
  //     nextIndex: this.state.nextIndex < this.state.tourData.length - 1 ? this.state.nextIndex + 1 : this.state.nextIndex,
  //   })
  // }


  setUnit = (check) => {

    // this.setState({
    //   isUnit:this.state.tourData[this.state.nextIndex].unit_amenities.length>1?true:false,
    //   unitIndex:this.state.nextIndex,
    //  // unitData:this.state.tourData[this.state.nextIndex].unit_amenities,
    //   tourData:this.state.tourData[this.state.nextIndex].unit_amenities.length>1? this.state.tourData[this.state.nextIndex].unit_amenities:this.state.response.tour_stop,
    //   startIndex:this.state.tourData[this.state.nextIndex].unit_amenities.length>1? -1:this.state.unitIndex,
    //   nextIndex:this.state.tourData[this.state.nextIndex].unit_amenities.length>1?0:-1,
    //   mapImage:this.state.tourData[this.state.nextIndex].unit_amenities.length>1?this.state.tourData[this.state.nextIndex].image:this.state.response.image,


    // })

    this.setState({
      isUnit: true,
      unitIndex: this.state.nextIndex,
      // unitData:this.state.tourData[this.state.nextIndex].unit_amenities,
      tourData: this.state.tourData[this.state.nextIndex].unit_amenities,
      startIndex: -1,
      nextIndex: 0,
      mapImage: this.state.tourData[this.state.nextIndex].image,
      showPoints: false


    })

  }

  exitUnit = (flag) => {


    //console.log(this.state.response.tour_stop.length - 1 + "  length  flag " + flag)

    this.calculateImageSize(this.state.response.image)
    this.setState({
      isUnit: false,
      tourData: this.state.response.tour_stop,
      isEnd: flag,
      //nextIndex:-1, 
      // startIndex: this.state.response.tour_stop.length - 1 > this.state.nextIndex ? this.state.unitIndex : this.state.unitIndex,
      startIndex:this.state.unitIndex,
      nextIndex: this.state.response.tour_stop.length - 1 > this.state.unitIndex ? this.state.unitIndex + 1 : -1,
      mapImage: this.state.response.image,



    })
  }

  endTour = () => {



    this.setState({


      startIndex: this.state.nextIndex,
      nextIndex: -1,
      isEnd: true




    })

  }
  nextButtonPress = () => {

    this.setState({
      points: this.state.points,
    })
    this.updateIndex();

  }

  nextButtonPress = () => {

    // this.CheckConnectivity();

    if (this.ImageZoom !== null) {
      this.ImageZoom.reset();
    }


    // if (isConnected) {

    if (typeof (this.state.tourData[this.state.nextIndex]) !== 'undefined' && this.state.tourData[this.state.nextIndex].type !== "unit") {


      this.ChangeThisTitle("")

      var isUnitEnd = false;
      if (this.state.isUnit && this.state.nextIndex === this.state.tourData.length - 1) {
        isUnitEnd = true;
      }

      //alert(this.state.tourData[this.state.nextIndex].id)
      //console.log(this.state.tourData[this.state.nextIndex].stop_data + "Hello usman")
      this.props.navigation.navigate("TourStop", {
        stopData: this.state.tourData[this.state.nextIndex],
        isUnitEnd: isUnitEnd,
        floorName: this.state.floorName,
        unitId: this.state.selectedUnitId,
        isFromUnit: this.state.isUnit,
        applyUnitURL: this.state.applyUnitUrl,

      })


    }

    if (this.state.isUnit) {
      this.ChangeThisTitle("Floor Plan")
    }

    if (this.state.isUnit === false && typeof (this.state.tourData[this.state.nextIndex]) !== 'undefined' && this.state.tourData[this.state.nextIndex].type === "unit" && this.state.tourData[this.state.nextIndex].unit_amenities.length > 1) {
      // alert("unit")
      console.log("This is unit   " + this.state.startIndex + "   next  " + this.state.nextIndex)
      //this.showFirstPointOnMap(false)
      this.setState({
        showFirstPoint: false,
        floorName: this.state.tourData[this.state.nextIndex].stop_data.floorplan,
        selectedUnitId: this.state.tourData[this.state.nextIndex].id,
        applyUnitUrl: this.state.tourData[this.state.nextIndex].stop_data.availability_url,
        pricingOptions: this.state.tourData[this.state.nextIndex].stop_data.lease_pricing.sort(function (a, b) { return a - b }),
      })
      this.ChangeThisTitle(" Floor Plan")


      this.calculateImageSize(this.state.tourData[this.state.nextIndex].image)

      this.setUnit(true)

      this.unitStart = true

    } else if (this.state.isEnd) {

      console.log("END tour thanks you")
      this.props.navigation.replace("ThankProperty", {
        tourData: this.state.response
      })
    } else if (this.state.isUnit && this.state.nextIndex === this.state.tourData.length - 1) {
      console.log("Unit Exit " + this.state.unitIndex)
      // this.props.navigation.navigate("ThanksUnit")
      //  if(this.state.response.tour_stop.length-1>this.state.nextIndex){
      //   console.log("right")
      //   this.exitUnit(false)

      // }else{
      //   this.exitUnit(true)
      //   console.log("wrong")
      // }
      this.ChangeThisTitle("")
      if (this.state.response.tour_stop.length - 1 > this.state.unitIndex) {
        this.exitUnit(false)
      } else {
        this.exitUnit(true)
      }

    } else if (this.state.isUnit === false && this.state.nextIndex === this.state.tourData.length - 1) {

      console.log("End Tour called")
      this.endTour()
    } else
      if (!this.unitStart) {
        // this.props.navigation.navigate("TourStop")
        console.log("not a unit start")
        this.updateIndex();
      }
      else {
        {

          this.updateIndex();
          console.log("unit start..")
          this.unitStart = false
          this.setState({
            showFirstPoint: true
          })
          //this.showFirstPointOnMap(true)
        }




      }
    // } else {
    //   alert("Please Check your internet connection.")
    // }






  }

  showFirstPointOnMap = (check) => {

    this.setState({
      showFirstPoint: false
    })
  }




  getData = (rersponse) => {

    // this.setState({
    //   //isLoading: true
    // })
    //alert(rersponse.floorplat.standard_image_url)
    if (typeof (rersponse.floorplat.standard_image_url !== 'undefined')) {
      //console.log(floorplat.standard_image_url + "  ii" + "Image")
      //alert(rersponse.floorplat.standard_image_url)
      this.calculateImageSize(rersponse.floorplat.standard_image_url);
    } else {
      console.log(rersponse.image + "  test")
      alert("else called")
    }


    //var tours1 = tours.tour_stop.splice(  3,4)

    //console.log(tours)
    // alert(rersponse.floorplat.standard_image_url)
    // console.log(floorplat.standard_image_url + " hello moto")
    this.setState({
      mapImage: rersponse.floorplat.standard_image_url,

      // isLoading: false,
      //response: rersponse,
      //tourData: rersponse.path_points
      linePoints: rersponse.path_points

    })



  }

  drowAllPoints = () => {


    var pathPOints = [];
    var PATH = [];
    var stops = [];

    for (let i = 0; i < this.state.linePoints.length; i++) {
      //console.warn(this.calculateY(typeof (this.state.linePoints[i].y) !== 'undefined' ? (this.state.linePoints[i].y) : 1) + "I value" + i + "Old" + (this.state.linePoints[i].y))



      pathPOints.push(
        //<View key={i}>
        <View key={i}
          style={{
            height: 5, //hp('5%'), //25,
            width: 5, //wp('8%'),  // 20,
            position: "absolute",
            backgroundColor: 'red',
            // left: this.state.startIndex === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].x : 1),
            // top: this.state.startIndex === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].y : 1),

            left: i === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[i].x) !== 'undefined' ? (this.state.linePoints[i].x) : 1),
            top: i === -1 ? this.calculateYNew(0) : this.calculateYNew(typeof (this.state.linePoints[i].y) !== 'undefined' ? (this.state.linePoints[i].y) : 1),



            // left:this.tourData[this.state.startIndex],
            // top: this.tourData[this.state.startIndex],
          }}
        //name="map-marker" 
        //size={20} 
        //source={you_are_here_pin}
        //color="#900"
        />
        //</View>
      )




      if (this.state.linePoints[i].neighbour_units.length !== 0) {


        //console.warn(i + "in neighbor" + this.state.linePoints[i].neighbour_units[0].x_plot)
        stops.push(
          <View key={i}>



            <Image key={i}
              style={{
                height: 15, //hp('5%'), //25,
                width: 13, //wp('8%'),  // 20,
                position: "absolute",
                // left: this.state.startIndex === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].x : 1),
                // top: this.state.startIndex === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].y : 1),

                left: i === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[i].neighbour_units[0].x_plot) !== 'undefined' ? (this.state.linePoints[i].neighbour_units[0].x_plot) : 1),
                top: i === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[i].neighbour_units[0].y_plot) !== 'undefined' ? (this.state.linePoints[i].neighbour_units[0].y_plot) : 1),



                // left:this.tourData[this.state.startIndex],
                // top: this.tourData[this.state.startIndex],
              }}
              //name="map-marker" 
              //size={20} 
              source={R.images.go_here_pin}
            //color="#900"
            />






          </View>
        )
      }
    }



    for (let i = 0; i < this.state.linePoints.length - 1; i++) {

      //console.warn(this.calculateY(typeof (this.state.linePoints[i].y) !== 'undefined' ? (this.state.linePoints[i].y) : 1) + "I value" + i + "Old" + (this.state.linePoints[i].y))
      PATH.push(

        //   <Line
        //   x1="0"
        //   y1="0"
        //   x2="100"
        //   y2="100"
        //   stroke="blue"
        //   strokeWidth="2"
        // />
        //<View key={i}>
        <Line key={i}
          x1={i === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[i].x) !== 'undefined' ? this.state.linePoints[i].x : 1)}
          y1={i === -1 ? this.calculateYNew(0) : this.calculateYNew(typeof (this.state.linePoints[i].y) !== 'undefined' ? this.state.linePoints[i].y : 1)}

          // x1= "0"
          // y1= "0"
          x2={i === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[i + 1].x) !== 'undefined' ? this.state.linePoints[i + 1].x : 1)}
          y2={i === -1 ? this.calculateYNew(0) : this.calculateYNew(typeof (this.state.linePoints[i + 1].y) !== 'undefined' ? this.state.linePoints[i + 1].y : 1)}
          stroke="blue"
          strokeWidth="2"


        // style={{
        //  //height: 32, //hp('5%'), //25,
        //   //width: 25, //wp('8%'),  // 20,
        //   //position: "absolute",
        //   // left: this.state.startIndex === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].x : 1),
        //   // top: this.state.startIndex === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].y : 1),

        //   x1: i === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[i].x) !== 'undefined' ? this.state.linePoints[i].x : 1),
        //   y1: i === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[i].y) !== 'undefined' ? this.state.linePoints[i].y : 1)



        //   // left:this.tourData[this.state.startIndex],
        //   // top: this.tourData[this.state.startIndex],
        // }}
        //name="map-marker" 
        //size={20} 
        //source={you_are_here_pin}
        //color="#900"
        />
        //</View>
      )
    }

    this.setState({
      path: PATH,
    })


    this.setState({
      stopss: stops,
    })

    this.setState({
      points: pathPOints,
    })



  }



  componentDidMount() {


    setInterval( // change to some random crap every 800 ms
      () =>
        this.setState({
          dashOffset: this.state.dashOffset - 1,
          // dashArray: `${Math.random() * 10}, 10`,
          // dashArray: `${Math.random() * 10}`,
          //width: 1 + Math.random() * 4
        }),
      10
    );

    // const { navigation } = this.props;
    // const tours = navigation.getParam('tours', '');
    // const image = navigation.getParam('image', '');
    // const startX = navigation.getParam('startX', '');
    // const startY = navigation.getParam('startY', '');

    // this.setBlinking()


    // NetInfo.getConnectionInfo().then(handleConnectivityChange);
    // NetInfo.addEventListener('connectionChange', handleConnectivityChange);

    //alert("hello moto")
    // debugger
    //this.getTourData();


  }

  getTourData = () => {
    getTourData()
      .then(response => response.json())
      .then(responseJson => {
        //console.log(responseJson.floorplat.standard_image_url)
        this.getData(responseJson);
        //alert("hello moto")
        //  var startPoint1  = activeTour.tour_stop[0]
        //  var tourStopsTemp1 = responseJson.tours[0].tour_stop.splice(0, 1)
        //    alert(tourStopsTemp1.length)
        //   ////  //tourData = tourStopData
        //   //  activeTour = activeTour
        //  tourStopsTemp = activeTour.tour_stop
        //alert(responseJson.tours[0].tour_stop.length)
        //alert(activeTourTemp.tour_key)
        //var   startPoint  = activeTour1.tour_stop[0]
        //var tourStopData = activeTour1.tour_stop.splice(0, 1)
        //tourData: responseJson.tours[0].tour_stop, 
        //startPoint  : startPoint,
        // startX:responseJson.tours[0].x_plot,

      })
      .catch(error => {
        this.setState({
          isLoading: false
        });
        console.log(error);
      });
  };

  drawPoints() {
    var stops = [58, 240, 68, 4, 5];
    var stope = [140, 124, 155, 4, 5];


    return (


      <View>



        <Image
          style={{
            height: 32, //hp('5%'), //25,
            width: 25, //wp('8%'),  // 20,
            position: "absolute",
            // left: this.state.startIndex === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].x : 1),
            // top: this.state.startIndex === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[this.state.startIndex]) !== 'undefined' ? this.state.linePoints[this.state.startIndex].y : 1),

            left: this.state.startIndex === -1 ? this.calculateX(0) : this.calculateX(typeof (this.state.linePoints[this.state.startIndex].x) !== 'undefined' ? this.state.linePoints[this.state.startIndex].x : 1),
            top: this.state.startIndex === -1 ? this.calculateY(0) : this.calculateY(typeof (this.state.linePoints[this.state.startIndex].y) !== 'undefined' ? this.state.linePoints[this.state.startIndex].y : 1),



            // left:this.tourData[this.state.startIndex],
            // top: this.tourData[this.state.startIndex],
          }}
          //name="map-marker" 
          //size={20} 
          source={R.images.youAreHerePin}
        //color="#900"
        />






      </View>
    );
  }


  // drawPoints() {
  //   var stops = [58, 240, 68, 4, 5];
  //   var stope = [140, 124, 155, 4, 5];

  //   return (
  //     <View>


  //       {this.state.isUnit === true && this.state.showFirstPoint === false ? null :
  //         <Image
  //           style={{
  //             height: 32, //hp('5%'), //25,
  //             width: 25, //wp('8%'),  // 20,
  //             position: "absolute",
  //             left: this.state.startIndex === -1 ? this.calculateX(this.state.response.x_plot) : this.calculateX(typeof (this.state.tourData[this.state.startIndex]) !== 'undefined' ? this.state.tourData[this.state.startIndex].x_plot : 1),
  //             top: this.state.startIndex === -1 ? this.calculateY(this.state.response.y_plot) : this.calculateY(typeof (this.state.tourData[this.state.startIndex]) !== 'undefined' ? this.state.tourData[this.state.startIndex].y_plot : 1),
  //             // left:this.tourData[this.state.startIndex],
  //             // top: this.tourData[this.state.startIndex],
  //           }}
  //           //name="map-marker" 
  //           //size={20} 
  //           source={you_are_here_pin}
  //         //color="#900"
  //         />
  //       }



  //       <Image
  //         style={{
  //           height: 32, // hp('5%'), //25,
  //           width: 25, // wp('8%'),  // 20,
  //           //opacity:this.state.showNextPoint?0:1,
  //           opacity: 1,
  //           position: "absolute",
  //           left: this.state.nextIndex === -1 ? this.calculateX(this.state.response.x_plot) : this.calculateX((typeof (this.state.tourData[this.state.nextIndex]) !== 'undefined') ? this.state.tourData[this.state.nextIndex].x_plot : 1),
  //           top: this.state.nextIndex === -1 ? this.calculateY(this.state.response.y_plot) : this.calculateY((typeof (this.state.tourData[this.state.nextIndex]) !== 'undefined') ? this.state.tourData[this.state.nextIndex].y_plot : 1),
  //         }}
  //         source={go_here_pin}
  //       //name="map-marker" 
  //       //size={20} 
  //       //color="#008000"
  //       />



  //     </View>
  //   );
  // }

  calculateImageSize = (image) => {

    // this.setState({
    //   isLoading: true
    // })
    //alert(image)
    //console.warn("calculate call")
    Image.getSize(
      image,
      (width, height) => {
        console.log(width + " wh " + height);
        this.setState({
          imageHeight: height,
          imageWidth: width,
          isLoading: false,


          // isUnit:false,

        });
        this.drowAllPoints()
      },
      error => {
        this.setState({
          isLoading: false
        })
        //console.warn("Could not get the image size:" + error.message);
      }
    );

  }


  checkPricing = () => {
    // alert('Check Pricing')

    this.setState({ isModalVisible: !this.state.isModalVisible });
  }

  pressRefresh = () => {
    alert('Check Availability')
  }
  pressDownload = () => {
    alert('Download')
  }

  pressChat = () => {
    alert('khalid Chat')
  }

  imageLoaded = () => {

    this.setState({
      showPoints: true
    })
  }





  setBlinking = () => {
    setInterval(() => {
      this.setState(previousState => {
        return { showNextPoint: !previousState.showNextPoint };
      });
    },
      // Define blinking time in milliseconds
      500
    );
  }

  render() {
    // const width = Dimensions.get("window").width;



    return (
      <View style={styles.container}>
        <ImageBackground
          source={R.images.backgroundImage}
          style={{
            backgroundColor: 'black',
            flex: 1,
            flexDirection: 'column',
          }}
          imageStyle={{
            resizeMode: "stretch"
          }}
        >


          {/* <Spinner
            visible={this.state.isLoading}
            // textContent={"Loading..."}
            textStyle={styles.spinnerTextStyle}
          /> */}
          <LoadingIndicator visible={this.state.isLoading} />

          <View style={{ flex: .2, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" }}>


            {/* <Text style={{ color: "white", textAlign: "center", lineHeight: hp('4%'), fontSize: wp('4.5%'), marginLeft: wp('6%'), marginRight: wp('6%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" }}> {this.state.isEnd ? "Your tour is completed!  Let's go back where you started." : (typeof (this.state.tourData[this.state.nextIndex]) !== "undefined" ? this.state.tourData[this.state.nextIndex].type === "unit" ? "Now let's go to " + this.state.tourData[this.state.nextIndex].name + ". Use code 2384 to enter. " : this.state.tourData[this.state.nextIndex].directional_text : "")}</Text> */}
            <Text style={{ color: "white", textAlign: "center", lineHeight: hp('4%'), fontSize: wp('4.5%'), marginLeft: wp('6%'), marginRight: wp('6%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light" }}> </Text>

          </View>

          <View style={{ flex: 0.6 }}>
            <ImageZoom cropWidth={Dimensions.get('window').width}
              cropHeight={300}
              imageWidth={Dimensions.get("window").width}
              imageHeight={300}>





              <ImageView
                resizeMode="contain"

                style={{ width: Dimensions.get("window").width, height: 300 }}


                // source={require("./images/level3.jpg")}
                //source={{ uri: this.state.isUnit ? this.state.imageUnit : this.state.image }}
                source={{ uri: this.state.mapImage }}
                onLoadEnd={this.imageLoaded}
                key={this.state.mapImage}
                imageStyle={{
                  resizeMode: "contain"
                }}

              >
                <Svg

                  backgroundColor="blue"
                  height="300"
                  width={Dimensions.get("window").width}

                // height="400"
                // width="500"
                >




                  {/* <Line from= {{x:10 , y: 20}} to = {{x: 10, y: 100}} style= "5px solid orange"> </Line> */}

                  {/* // <Line
//   from={{x: 10, y: 20}}
//   to={{x: 10, y: 100}}
//   style="5px solid orange"
// /> */}

                  <Svg height="200" width="200">
                    {/* <Path
                      d="M25 10 L98 65 L70 25 L16 77 L11 30 L0 4 L90 50 L50 10 L11 22 L77 95 L20 25" */}
                    <Polyline
                      points="10,10 20,12 30,20 40,60 60,70 95,90"
                      fill="none"
                      stroke="red"
                      //strokeDasharray="2 5"
                      // strokeDasharray="10"
                      // strokeDashoffset={24.5}

                      strokeDasharray="1000"
                      //strokeDashoffset= "1000"
                      //transition= 'all 0.3s ease-in-out'
                      //strokeDasharray = {this.state.dashArray}
                      strokeDashoffset={this.state.dashOffset}
                    // style={{

                    //   //stroke: color,
                    //   transition: 'all 0.3s ease-in-out', // animation duration and easing function
                    //   //strokeWidth: width,
                    //   strokeDasharray: this.state.dashArray,
                    //   strokeDashoffset: this.state.dashOffset
                    // }}

                    />

                    {/* <Line x1="0" y1="0" x2="100" y2="100" stroke="red" strokeWidth="2" strokeDasharray = "5" /> */}
                  </Svg>
                  {/* {this.state.points} */}


                  {/* {this.state.path} */}

                  {/* {this.state.stopss} */}
                  {/* <Line
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    stroke="blue"
                    strokeWidth="2"
                  /> */}
                </Svg>
                {/* //{this.state.showPoints ?  this.drawPoints() : null}drowAllPoints */}
              </ImageView>

            </ImageZoom>





            {/* <Button
title="Next"
onPress={() => {
this.nextButtonPress()
}}
/> */}
            <View style={{
              //aspectRatio: 1.3 / 1,
              height: hp('12%'),
              width: wp('32%'),
              visible: false,
              opacity: 0,
              position: 'absolute',
              right: wp('0%'),
              bottom: hp('0%'),
            }} >
              <TouchableOpacity onPress={() => this.nextButtonPress()}
                style={{ flex: 1 }}
              // onPress={() => navigate('HomeScreen')}
              >
                <ImageBackground source={R.images.goButtonImage} style={{ flex: 1 }}
                  imageStyle={{
                    resizeMode: 'stretch'
                  }} >
                </ImageBackground>

              </TouchableOpacity>
            </View>
          </View>

          {this.state.isUnit ?
            <View style={{ flex: .2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', }}>


              <View style={{ backgroundColor: "black", height: hp('10%'), width: wp('27%'), alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center" }} onPress={() => this.checkPricing()}>

                  {/* <Icon name="dollar" size={35} color="green" /> */}
                  <Image
                    source={R.images.dollar}
                    style={{
                      position: 'absolute',
                      width: wp("4.5%"),
                      height: hp("4.5%"),
                      resizeMode: "contain"
                    }}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black", height: hp('10%'), width: wp('27%'), alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center" }} onPress={() => this.pressRefresh()}>
                  <Image
                    source={R.images.refreshIcon}
                    style={{
                      position: 'absolute',
                      width: wp("7%"),
                      height: hp("7%"),
                      resizeMode: "contain"
                    }}
                  />
                </TouchableOpacity>
              </View>
              <View style={{ backgroundColor: "black", height: hp('10%'), width: wp('27%'), alignItems: "center", justifyContent: "center" }}>
                <TouchableOpacity style={{ alignItems: "center", justifyContent: "center" }} onPress={() => this.pressChat()}>
                  <Image
                    source={R.images.messageIcon}
                    style={{
                      position: 'absolute',
                      width: wp("7%"),
                      height: hp("7%"),
                      resizeMode: "contain"
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>
            : <View style={{ flex: .2, flexDirection: 'row', justifyContent: "flex-end" }}>

              <TouchableOpacity style={{ alignItems: "center", justifyContent: "center", position: "absolute", bottom: 5, backgroundColor: "black", height: hp("7%"), width: Dimensions.get('window').width }} onPress={() => this.pressChat()}>
                <Image
                  source={R.images.messageIcon}
                  style={{

                    width: wp("7%"),
                    height: hp("7%"),
                    resizeMode: "contain"
                  }}
                />
              </TouchableOpacity>

            </View>

          }

        </ImageBackground>

        <Dialog
          visible={this.state.isModalVisible}
          opacity="0"
          dialogTitle={<DialogTitle title="Pricing Options" />}
          footer={<DialogFooter>

            <DialogButton
              text="OK"
              onPress={() => { this.checkPricing() }}
            />
          </DialogFooter>
          }
          dialogAnimation={new SlideAnimation({
            slideFrom: 'bottom',
          })}
        >
          <DialogContent style={{ height: hp('30%'), width: wp('80%'), opacity: 0 }}>
            <FlatList
              data={this.state.pricingOptions}
              renderItem={({ item }) =>
                <TouchableOpacity style={{ bottom: hp('1.5%') }} >
                  <View style={{ flexDirection: 'row', width: '100%', height: hp('5.4%') }}>
                    {/* <SwipeView onSwipedLeft={() => this.deleteItemById(item.id)}> */}

                    <View style={{ justifyContent: 'center' }}>
                      <Text style={{ fontSize: hp('2%'), fontFamily: Platform.OS === 'android' ? "GothamLight" : "Gotham-Light", color: 'black', margin: wp('2%'), textAlign: 'left' }}>{item.pricing_option}</Text>
                    </View>
                    {/* </SwipeView> */}
                  </View>
                </TouchableOpacity>
              }>
            </FlatList>
          </DialogContent>
        </Dialog>


      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // justifyContent: "center",
    // alignItems: "center",
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