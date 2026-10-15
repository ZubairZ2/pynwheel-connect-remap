import { View, Button, Dimensions, Image, StyleSheet, Animated, Text } from "react-native";
import R from "../../assest/R"
import ImageZoom from 'react-native-image-pan-zoom';
import ImageView from "react-native-image-progress";
import React from "react";
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default class anima extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    ICenterOn = { x: 0, y: 0, scale: 2, duration: 1111 }
    //this.ImageZoom.centerOn(ICenterOn)
  }
  render() {
    return (
      <View style={{ flex: .7, backgroundColor: 'green', margin: 5 }}>
        {/* <ImageZoom 
        ref={ref => this.ImageZoom = ref} 
        cropWidth={Dimensions.get('window').width} 
        cropHeight={hp('62%')} 
        imageWidth={Dimensions.get("window").width} 
        backgroundColor="green" 
        imageHeight={300}>
          {
            // <ImageView  resizeMode="contain" style={[{ width: Dimensions.get("window").width, height: 200, backgroundColor: 'red' }]} fadeDuration={300} source={{ uri: "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/floorplate/image/261/1576842966-1537461091-floor-3-01-2-01.png" }} onLoadEnd={this.imageLoaded} key={R.images.map}
            //   imageStyle={{ resizeMode: "contain" }}>
            // </ImageView>
            <Image style={{ width: 200, height: 200 }}
              source={{ uri: 'https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/floorplate/image/261/1576842966-1537461091-floor-3-01-2-01.png' }} />
          }
        </ImageZoom> */}
<Text>Many parents feel it is important to schedule their children's free time with different types of organized activities. Others patents want their children to able to use their free time as they please. In my opinion, the best way is to do a little bit of both.
  Many parents want to make sure their children use all their time productively, so they sign them up for sports teams and enroll them in art, music, and language classes. 
  They may do this for any of several resons. Some may want to expose their children to a variety of experience so they can discover waht they enjoy doing. Others may want their children to have chance 
  to develope a range of skils at an early age. And others amy simply need to have a place to send their chilren because 
  they are busy with work or obligations.
  In other families, parents place more value on freedom. They believe that unstructured time allows children the chance to developed their creativity. It can help children learn a sence of independence and 
  responsibility. Some parents undestand, too, that after a long 









  after a long day at school, children need some time to relax.

  I believe that children need both structured and unstructured time. I think participation in classes and sports teams gives children a chance to discover and develop their interests and telents. But also I think that children need some time to be independend and choose their own activity. And of course they need some rest time, just like adults do.

  Spacial opportunitities to lern things outside of school can be very good for children, but free time is just as important. The best way is ti creat a balance between scheduled and unscheduled time.
    </Text>
        <ImageZoom
          //cropWidth={Dimensions.get('window').width}
          //cropHeight={Dimensions.get('window').height}
          ref={ref => this.ImageZoom = ref}
          pinchToZoom={true}
          enableCenterFocus={false}
          centerOn={{ x: 290, y: 290, scale: 1.5, duration: 1111 }}
          cropWidth={300}
          cropHeight={300}
          imageWidth={300}
          imageHeight={300}
        //imageWidth={Dimensions.get('window').width}
        //  imageHeight={Dimensions.get('window').height}
        >
          <Image style={{
            width: 300,
            height: 300
          }}
            source={{ uri: 'https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/floorplate/image/261/1576842966-1537461091-floor-3-01-2-01.png' }} />
        </ImageZoom>
      </View>
    );
  };
}
const styles = StyleSheet.create({
})



