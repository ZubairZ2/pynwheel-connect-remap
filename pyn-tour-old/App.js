/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { LogBox, Text } from 'react-native';
import Orientation from 'react-native-orientation';
import { PersistGate } from 'redux-persist/es/integration/react';
import { AppProvider } from './src/Library/Components/MyContext';
import AppNavigator from './src/NewAppNavigator';
import { persistor, store } from './src/redux/store/index';

LogBox.ignoreLogs(["Require cycle:",
  "Animated: `useNativeDriver`",
  "It appears that you are using",
  "Module ZervModule requires",
  "Module IglooModule requires",
  "Unable to find image because imageCountries is undefined"
])
// keeps font scaling static if OS font scale change
Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      unReadmessage: 0,
    }
  }

  async componentDidMount() {
    LogBox.ignoreAllLogs(true)
    Orientation.lockToPortrait()
    // Icon.loadFont();
    // const token = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkQ1UTE2Z3MwbjBYeDV2NUlUcGFWRiJ9.eyJodHRwczovL3Jlc3QubGF0Y2hhY2Nlc3MuY29tL3BhcnRuZXJfdXVpZCI6IjY0YzZmMzliLWM1OTctNDI2YS04NWIyLWU2NzUwYmRhNDYwYiIsImh0dHBzOi8vcmVzdC5sYXRjaGFjY2Vzcy5jb20vcGFydG5lcl9zY29wZSI6eyJ1c2VyX3V1aWQiOiJkMzAxODA3Yi1mZGNhLTQ1NTItOTgxZi01YzE3ZGQ4YjgzMTIifSwiaHR0cHM6Ly9yZXN0LmxhdGNoYWNjZXNzLmNvbS9nZW1pbmlfc2NvcGUiOiJzZGsiLCJpc3MiOiJodHRwczovL2F1dGgucHJvZC5sYXRjaC5jb20vIiwic3ViIjoiZW1haWx8NjRhN2YyM2U3OWVhMTkwMzZjYzNiODIxIiwiYXVkIjpbImh0dHBzOi8vcmVzdC5sYXRjaGFjY2Vzcy5jb20vYWNjZXNzL3NkayIsImh0dHBzOi8vbGF0Y2gtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNjk2NTkzMzIwLCJleHAiOjE2OTY2Nzk3MjAsImF6cCI6ImhvUGZ3TmFjd21tckVLbVlvUFlCM3pEcEQ1aGZVemxEIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsImd0eSI6InBhc3N3b3JkIn0.ZVggzwEEKAZyBBSJeAfQzrNdE1WKUxD6LRf9D-m_705HeC_txEmCZeORj7_cQAyQ0AZmg7srlrubl8_SprfPG6qxihux9ThXdmqDHMVbB8bdfFyIPEA4xE7ms_5FmOiFyCU66Eyb2pQRHgJNGjJ4NXgvUY1nW3OuyYD_wH4b6nPO4QbKkDiLxBfRU8LjQ6nTwK2iBy7Ie58BQbIbdX_KrzayGxi7GyYx55eAdKkM8xgm47OI5HrXfBrD5uwUqP76V1O5gi8o2EH5n8QzCOG94yoRn0BoD3u_bR2dHB4TN4AuUGrWFDVwCN3elIz7_vgFIMsZZ02FnR17RKk4OeVfpA"
    // const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkQ1UTE2Z3MwbjBYeDV2NUlUcGFWRiJ9.eyJodHRwczovL3Jlc3QubGF0Y2hhY2Nlc3MuY29tL3BhcnRuZXJfdXVpZCI6IjY0YzZmMzliLWM1OTctNDI2YS04NWIyLWU2NzUwYmRhNDYwYiIsImh0dHBzOi8vcmVzdC5sYXRjaGFjY2Vzcy5jb20vcGFydG5lcl9zY29wZSI6eyJ1c2VyX3V1aWQiOiJkMzAxODA3Yi1mZGNhLTQ1NTItOTgxZi01YzE3ZGQ4YjgzMTIifSwiaHR0cHM6Ly9yZXN0LmxhdGNoYWNjZXNzLmNvbS9nZW1pbmlfc2NvcGUiOiJzZGsiLCJpc3MiOiJodHRwczovL2F1dGgucHJvZC5sYXRjaC5jb20vIiwic3ViIjoiZW1haWx8NjRhN2YyM2U3OWVhMTkwMzZjYzNiODIxIiwiYXVkIjpbImh0dHBzOi8vcmVzdC5sYXRjaGFjY2Vzcy5jb20vYWNjZXNzL3NkayIsImh0dHBzOi8vbGF0Y2gtcHJvZC51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNjk2ODQ1NTE1LCJleHAiOjE2OTY5MzE5MTUsImF6cCI6ImhvUGZ3TmFjd21tckVLbVlvUFlCM3pEcEQ1aGZVemxEIiwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsImd0eSI6InBhc3N3b3JkIn0.RyP2sV8gJBCgSjQ8kxwRe_HvzxwLgiLl9nfd71vXKODUuKsUDAMuo6G8gPJPa3uUHLo1rTpPXMNr87OOy8msoF1qt9YX8V9N3PG-rR4qk_tmVjppVqDDtLP0QjAWTBBvgBkbpkONeHONiv12n5oG3KshHj537JdnJLHQWDnXv38nx-dXLlSIMETK8Xnb1wlz8Wr26eA09JknQ5Xc8feL6FWxtrdJ3ePl0XbJInnbtSD8_XYrW5Z4lQooxD6yzfHkMDerUHUW4-E3EcmFVJM_N6Tp1QRS69S2u7G8IiTdpcQi8hNuh6OwZSXULTZkNOKZ8vtROq20d76GZxzRCiooHA'
    // initLatch(token, (message) => {
    //   console.log("In Message", { message })
    //   listLatchLocks((res) => {
    //     console.log("In Res", res, typeof (res))
    //     console.log("Item1111", res);
    //     // const UUID = "2D765249-CC6B-453A-883F-68AEA59B30E0"
    //     if (Platform.OS == 'android') {
    //       const UUID = JSON.parse(res)
    //       unlockLatch(UUID, (result) => {
    //         console.log("Unlock Latch", { result })
    //       })
    //     } else {
    //       const UUID = res
    //       unlockLatch(UUID, (result) => {
    //         console.log("Unlock Latch", { result })
    //       })
    //     }
    //   })
    // })
  }

  setCount = (count) => {
    this.setState({ unReadmessage: count })
  }

  render() {
    return (
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AppProvider>
            <AppNavigator enableURLHandling={false} onNavigationStateChange={(preState, newState) => {
              console.log("ROUTE NAME", newState.routes[newState.index].routeName)
            }} theme="dark" screenProps={{
              unReadmessage: this.state.unReadmessage,
              setCount: this.setCount,
            }} />
          </AppProvider>
        </PersistGate>
      </Provider>
    );
  }
}
