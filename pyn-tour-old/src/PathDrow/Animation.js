


import { StyleSheet, View } from "react-native";

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

const cos = Math.cos;
const sin = Math.sin;
const π = Math.PI;
const f_matrix_times = ([[a, b], [c, d]], [x, y]) => [
  a * x + b * y,
  c * x + d * y,
];
const f_rotate_matrix = x => [[cos(x), -sin(x)], [sin(x), cos(x)]];
const f_vec_add = ([a1, a2], [b1, b2]) => [a1 + b1, a2 + b2];

const f_svg_ellipse_arc = (cx, cy, rx, ry, t1, Δ, φ) => {
  /* [
  returns a SVG path element that represent a ellipse.
  cx,cy → center of ellipse
  rx,ry → major minor radius
  t1 → start angle, in radian.
  Δ → angle to sweep, in radian. positive.
  φ → rotation on the whole, in radian
  url: SVG Circle Arc http://xahlee.info/js/svg_circle_arc.html
  Version 2019-06-19
   ] */
  Δ = Δ % (2 * π);
  const rotMatrix = f_rotate_matrix(φ);
  const [sX, sY] = f_vec_add(
    f_matrix_times(rotMatrix, [rx * cos(t1), ry * sin(t1)]),
    [cx, cy],
  );
  const [eX, eY] = f_vec_add(
    f_matrix_times(rotMatrix, [rx * cos(t1 + Δ), ry * sin(t1 + Δ)]),
    [cx, cy],
  );
  const fA = Δ > π ? 1 : 0;
  const fS = Δ > 0 ? 1 : 0;
  return (
    'M ' +
    sX +
    ' ' +
    sY +
    ' A ' +
    [rx, ry, (φ / (2 * π)) * 360, fA, fS, eX, eY].join(' ')
  );
};

const tau = π * 2;
const segments = 4;
const evenly = tau / segments;
const space = evenly * 0.03;
const sweepAngle = evenly - space * 2;

export default () => (
  <View style={styles.container}>
    <Svg
      width="300"
      height="300"
      strokeWidth="7"
      fill="transparent"
      viewBox="0 0 42 42">
      <Circle
        cx="21"
        cy="21"
        fill="#fff"
        strokeWidth="0"
        r="15.91549430918954"
      />
      <Path
        d={f_svg_ellipse_arc(
          21,
          21,
          15.91549430918954,
          15.91549430918954,
          0,
          sweepAngle,
          3 * evenly + space,
        )}
        stroke="red"
      />
      <Path
        d={f_svg_ellipse_arc(
          21,
          21,
          15.91549430918954,
          15.91549430918954,
          0,
          sweepAngle,
          space,
        )}
        stroke="#ffc34d"
      />
      <Path
        d={f_svg_ellipse_arc(
          21,
          21,
          15.91549430918954,
          15.91549430918954,
          0,
          sweepAngle,
          evenly + space,
        )}
        stroke="blue"
      />
      <Path
        d={f_svg_ellipse_arc(
          21,
          21,
          15.91549430918954,
          15.91549430918954,
          0,
          sweepAngle,
          2 * evenly + space,
        )}
        stroke="green"
      />
    </Svg>
  </View>
);
const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
});


// const Circle = ({ // default values used if not given in props
//   radius,
//   color = 'lightslategray',
//   width = 1,
//   dashArray = '0',
//   dashOffset = 0
// }) => (
//     <Circle
//       cx="50%"
//       cy="50%"
//       r={radius}
//       fill="none"
//       style={{
//         stroke: color,
//         transition: 'all 0.3s ease-in-out', // animation duration and easing function
//         strokeWidth: width,
//         strokeDasharray: dashArray,
//         strokeDashoffset: dashOffset
//       }}
//     />
//   );

//   export default class Animation extends Component  {
//   constructor() {
//     super();
//     this.state = { // initial values
//       dashOffset: 0,
//       dashArray: '10, 10',
//       width: 1
//     };
//   }

//   componentDidMount() {
//     setInterval( // change to some random crap every 800 ms
//       () =>
//         this.setState({
//           dashOffset: this.state.dashOffset + 10,
//           dashArray: `${Math.random() * 10}, 10`,
//           width: 1 + Math.random() * 4
//         }),
//       800
//     );
//   }

//   render() {
//     return (
//       <svg>
//         <Circle
//           radius={50}
//           color="#eb26a8"
//           width={this.state.width}
//           dashArray={this.state.dashArray}
//           dashOffset={this.state.dashOffset * 1}
//         />
//         <Circle
//           radius={60}
//           color="#2645eb"
//           width={this.state.width * 2}
//           dashArray={this.state.dashArray}
//           dashOffset={this.state.dashOffset * 4}
//         />
//         <Circle
//           radius={70}
//           width={2}
//           dashArray="1, 5"
//         />
//         <Circle
//           radius={25}
//           width={2}
//           dashArray="1, 5"
//         />
//       </svg>
//     );
//   }
// }

// ReactDOM.render(
//   <Circles />,
//   document.getElementById("mount")
// );
// const KEYS = ['fill', 'stroke', 'strokeDashoffset'];

// function extractPolyPoints(polyPoints) {
//   return polyPoints.replace(/[^e]-/, ' -').split(/(?:\s+|\s*,\s*)/g).join(' ');
// }

// function getStrokeDashoffset(nextProps, prevProps) {
//     const strokeDasharray = getStrokeDasharray(nextProps.strokeDasharray) || getStrokeDasharray(prevProps.strokeDasharray);
//     return strokeDasharray ? (+nextProps.strokeDashoffset || +prevProps.strokeDashoffset || 0) : null;
// }


// function getInitialState() {
//     const anim = new Animated.Value(0);
//     const fillOpacity = anim.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 1],
//     });
//     const offset = fillOpacity.interpolate({
//       inputRange: [0, 1],
//       outputRange: [0, 10],
//     });
//     const strokeOpacity = offset.interpolate({
//       inputRange: [0, 10],
//       outputRange: [0, 1],
//       extrapolateRight: 'clamp',
//     });
//     const path = anim.interpolate({
//       inputRange: [0, 1],
//       outputRange: ['M20,20L20,80L80,80L80,20Z', 'M40,40L33,60L60,60L65,40Z'],
//     });
//     const fill = strokeOpacity.interpolate({
//       inputRange: [0, 1],
//       outputRange: ['rgba(255, 0, 0, 0.5)', 'rgba(0, 255, 0, 0.99)'],
//     });
//     const oneToFivePx = offset.interpolate({
//       inputRange: [0, 10],
//       outputRange: ['1px', '5px'],
//     });
//     return { anim, fillOpacity, offset, strokeOpacity, path, fill, oneToFivePx };
//   }

// export default class Animation extends Component {

//   constructor(props) {
//     super(props);
//     this.state = {};
//     this.updateCache(props);
// }
// updateCache(props) {
//     let i = 0;
//     this.points = [];
//     while (props['px' + i] != null) {
//         this.points.push({ x: props['px' + i], y: props['py' + i] });
//         i++;
//     }
// }
// componentWillReceiveProps(nextProps) {
//     this.updateCache(nextProps);
// }

// setNativeProps = (props) => {
//   // if some pxn or pyn exists in props that means we need to recreate d
//   if (this.points.some((key, i) => props['px' + i] != null || props['py' + i] != null)) {
//       props.d = this.createPropsD(props, this.totalKeys);
//   }
//   // BUG: getNativeElement() is not a function https://github.com/react-native-community/react-native-svg/issues/180
//   // this._component.setNativeProps(props);
//   this._component && this._component.root && this._component.root.setNativeProps(props);
//   // this._component.root.setNativeProps(props);
// }
// pointsToString(props) {
//   return this.points.reduce((acc, point, i) => {
//       const propX = props['px' + i];
//       const propY = props['py' + i];
//       const x = propX != null ? propX : point.x;
//       const y = propY != null ? propY : point.y;
//       return acc + x + ',' + y + ' ';
//   }, '');
// }
// createPropsD = (props) => {
//   const points = this.pointsToString(props);
//   // https://github.com/react-native-community/react-native-svg/blob/master/elements/Polygon.js
//   return `M${extractPolyPoints(points)}z`;
// }



// render() {
//   return (
//     <View>
//     <AnimatedSVGPaths
//       strokeColor={"red"}
//       strokeWidth={5}
//       duration={10000}
//       height={600}
//       width={600}
//       scale={0.5}
//       delay={100}
//       //ds={ds}
//     />
//   </View>
//   );
// }
// }



// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "black"
//     },
//     upperContainer: {
//         flex: 2.5,
//         justifyContent: "flex-end",
//         alignItems: "center"
//     },
//     middleContainer: {
//         flex: 0.5
//     },
//     bottomContainer: {
//         flex: 2,
//         justifyContent: "center"
//     },
//     bottomButtonsContainer: {
//         flex: 0.5,
//         justifyContent: "space-around",
//         flexDirection: "row",
//         marginBottom: 20
//     },
//     upperContainerText: {
//         fontSize: wp("9.5%"),
//         fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
//         textAlign: "center",
//         color: "white"
//     },
//     middleContainerText: {
//         fontSize: wp("5.5%"),
//         fontFamily: "Gotham-Light",
//         textAlign: "center",
//         marginTop: 20,
//         color: "darkgray"
//     },
//     middleContainerText2: {
//         fontSize: wp("5.5%"),
//         fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
//         textAlign: "center",
//         color: "darkgray"
//     },
//     bottomContainerText: {
//         fontSize: wp("5%"),
//         fontFamily: Platform.OS === "android" ? "GothamLight" : "Gotham-Light",
//         textAlign: "center",
//         color: "white",
//         lineHeight: hp("4%"),
//         marginLeft: wp("3%"),
//         marginRight: wp("3%")
//     },
//     noThanksButtonView: {
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "black",
//         width: "45%",
//         height: 50
//     },
//     yesButtonView: {
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "white",
//         width: "45%",
//         height: 50
//     },

//     yesButton: {
//         fontSize: wp("3%")
//         //fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light",
//     },

//     noButton: {
//         fontSize: wp("3%"),
//         color: "white"
//         //fontFamily: Platform.OS === 'android' ?  "GothamLight" :  "Gotham-Light",
//     }
// });







// import React, { Component } from 'react';



// export default class Animation extends Component {




//   render() {
//     const { fillOpacity, offset, strokeOpacity, path, fill, oneToFivePx } = this.state;
//     return (
//       <View style={styles.container}>

//       </View>
//     );
//   }
// }

// const styles = StyleSheet.create({
//   container: {
//     backgroundColor: '#ecf0f1',
//   },
// });