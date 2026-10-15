module.exports = {
    assets: ["./src/assest/font/"], // stays the same
    dependencies: {
        'react-native-video': {
            platforms: {
                android: null, // disable Android platform auto linking
            },
        },
    },
  };