/**
 * The part of the hallway engine that reads a floor SVG — layer detection,
 * path flattening, corridor inference, the graph build, gap bridging, stop
 * snapping — loaded on demand (`import()`), so the Map & Plotting page does
 * not ship it until Detect Hallways runs or a floor's obstacles are needed.
 */
export { detectHallways, obstaclesOf, type DetectFailure, type DetectedHallways } from './extract';
export { elementCentres } from './svg/elementCentre';
export { parseSvgTree } from './svg/svgTree';
