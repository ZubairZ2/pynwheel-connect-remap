// rollup.config.mjs
export default {
  input: "pyn-map-sdk.js",
  treeshake: false,
  output: {
    file: "../dist/pyn-map-sdk.js",
    format: "iife"
  }
};