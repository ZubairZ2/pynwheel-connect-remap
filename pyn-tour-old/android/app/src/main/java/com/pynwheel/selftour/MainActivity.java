package com.pynwheel.selftour;

import com.facebook.react.ReactActivity;

public class MainActivity extends ReactActivity {

  @Override
  protected void onDestroy() {
    super.onDestroy();
    com.zerv.zervcustomersdk.mainview.MainActivity main= new com.zerv.zervcustomersdk.mainview.MainActivity(this);
    main.onDestroy();
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */


  @Override
  protected String getMainComponentName() {
    return "SelfTour";
  }
}
