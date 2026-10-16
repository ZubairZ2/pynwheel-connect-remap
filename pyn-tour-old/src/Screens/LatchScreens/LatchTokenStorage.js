import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = "latch_access_token";

// Function to store the access token with an expiration time
const storeLatchAccessToken = async (token) => {
    try {
        const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        const data = { token, expirationTime };
        await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify(data));

        // Set a timer to delete the access token after 24 hours
        setTimeout(() => {
            deleteLatchAccessToken();
        }, 24 * 60 * 60 * 1000);
    } catch (error) {
        console.error('Error storing access token:', error);
    }
};

// Function to retrieve the access token from AsyncStorage
const getLatchAccessToken = async () => {
    try {
        const data = await AsyncStorage.getItem(TOKEN_KEY);
        if (data !== null) {
            const { token, expirationTime } = JSON.parse(data);

            // Check if the token is still valid
            if (Date.now() < expirationTime) {
                return token;
            } else {
                // Token expired, delete it
                deleteLatchAccessToken();
            }
        }
    } catch (error) {
        console.error('Error retrieving access token:', error);
    }
    return null;
};

// Function to delete the access token from AsyncStorage
const deleteLatchAccessToken = async () => {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error deleting access token:', error);
    }
};


export { storeLatchAccessToken, getLatchAccessToken, deleteLatchAccessToken };