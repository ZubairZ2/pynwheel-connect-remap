package com.pynwheel.selftour;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.content.Context;
import android.content.Intent;
import android.location.LocationManager;
import android.os.Build;
import android.os.Handler;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import com.android.volley.AuthFailureError;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableNativeArray;
import com.facebook.react.bridge.WritableNativeMap;
import com.zerv.zervcustomersdk.Entities.CustomerList;
import com.zerv.zervcustomersdk.Entities.DeviceData;
import com.zerv.zervcustomersdk.Entities.NearbyDeviceData;
import com.zerv.zervcustomersdk.Entities.ZBleDevice;
import com.zerv.zervcustomersdk.SDK.ZervBleSensitiveStatus;
import com.zerv.zervcustomersdk.SDK.ZervPushLogResponse;
import com.zerv.zervcustomersdk.SDK.ZervSDK;
import com.zerv.zervcustomersdk.SDK.ZervSDKResponseDelegate;
import com.zerv.zervcustomersdk.SDK.ZervUserRole;
import com.zerv.zervcustomersdk.authenticator.ZervSdkOpenGate;
import com.zerv.zervcustomersdk.mainview.MainActivity;
import com.zerv.zervcustomersdk.processorObjects.ZervConfirmOTPResponseBean;
import com.zerv.zervcustomersdk.processorObjects.ZervConfirmOTPResponser;
import com.zerv.zervcustomersdk.processorObjects.ZervCustomerListResponser;
import com.zerv.zervcustomersdk.processorObjects.ZervLocationResponser;
import com.zerv.zervcustomersdk.processorObjects.ZervOTPResponser;
import com.zerv.zervcustomersdk.service.LogsData;
import com.zerv.zervcustomersdk.userdatastore.Credential;
import com.zerv.zervcustomersdk.utils.Constants;
import com.zerv.zervcustomersdk.utils.Helper;
import com.zerv.zervcustomersdk.utils.SystemUtils;
import com.zerv.zervcustomersdk.zervpermissions.ZervPermissions;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import pub.devrel.easypermissions.EasyPermissions;

public class ZervModule extends ReactContextBaseJavaModule implements ZervSDKResponseDelegate {

    private static ReactApplicationContext reactContext;
    public com.zerv.zervcustomersdk.mainview.MainActivity activityMain;
    public Credential credential = Credential.INSTANCE;
    public int env = 1;
    public  String configureStatus = "";
    public  String authCustomerStatus = "";
    public ZervSDK zervSDK = ZervSDK.getInstance(mActivity, this);
    public static Activity mActivity;
    private volatile static ZervModule mInstance;
    //public static ZervModule mInstance;
    public static Context mCtx;
    public RequestQueue mRequestQueue;
    public DeviceData onDiscoverReaderData = null;
    public NearbyDeviceData nearbyDevice = null;
    public ZBleDevice deviceConnectionSuccessData = null;
    public static WritableArray applist;
    private static final String TAG = "ZervModule";


    private String serviceMsg = "";
    public String rssi_val = "1";

    ZervModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }

    // initializing activity
    private ZervModule(Activity mActivity) {
        this.mActivity = mActivity;
    }

    // returning instance of current class
    public static ZervModule getInstance(Activity mActivity) {
        if (mInstance == null) {
            synchronized (ZervModule.class) {
                mInstance = new ZervModule(mActivity);

            }
        }
        return mInstance;
    }

    @Override
    public String getName() {
        return "ZervModule";
    }

    //This method is used to configure the environemnet
    @ReactMethod
    public void configure(String environment, Promise promise) {
        ZervSDK.currentActivity = getReactApplicationContext().getCurrentActivity();
        zervSDK.setEnableReaderNotifications(true);
        zervSDK.setEnableAppConfirmationWhileConnectingToReader(true);

        //Notification icon cahnge

        ZervSDK.notification_icon = R.drawable.zerv_logo;

        String applicationName = getReactApplicationContext().getString(R.string.app_name);
        ZervSDK.bundleIdentifier = applicationName;

        //If you want to disable notification popup/UI then uncomment below line.
        //zervSDK.DisableNotificationUI = true;

        if(environment.toUpperCase().equals("Production".toUpperCase())){
            env = 1;
            configureStatus= "Successfully to configure Production SDK";
        }
        else if(environment.toUpperCase().equals("UAT".toUpperCase())){
            env = 2;
            configureStatus = "Successfully to configure Stage SDK";

        } else if(environment.toUpperCase().equals("Integ".toUpperCase())){
            env = 3;
            configureStatus = "Successfully to configure Stage SDK";

        }else if(environment.toUpperCase().equals("Development".toUpperCase())){
            env = 4;
            configureStatus = "Successfully to configure Development SDK";
        }else if(environment.toUpperCase().equals("Demo".toUpperCase())){
            env = 6;
            configureStatus = "Successfully to configure Demo SDK";
        }else if(environment.toUpperCase().equals("qa".toUpperCase())) {
            env = 5;
            configureStatus = "Successfully to configure qa SDK";
        }
        else{
            env = 1;
            configureStatus= "Successfully to configure Production SDK";
        }

        zervSDK.configure(env);

        promise.resolve(configureStatus);

    }

    //init and restore methods
    @ReactMethod
    public void initAndRestoreSession(String mobile, Promise promise) {
        try {
            ZervSDK.currentActivity = getReactApplicationContext().getCurrentActivity();
            ZervSdkOpenGate.currentActivity = getReactApplicationContext().getCurrentActivity();
            String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
            if (!phnum.isEmpty()) {
                if (Helper.getOtpStatus(getReactApplicationContext().getCurrentActivity())) {
                    // if(SystemUtils.getBooleanFromSP(getReactApplicationContext().getCurrentActivity(), "authenticationvalue")){
                    if (Helper.getOtpValidation(getReactApplicationContext().getCurrentActivity())) {
                        ZervSDK.isUserAuthenticated = true;
                        Log.d("Tokennn",SystemUtils.getStringFromSP(getReactApplicationContext().getCurrentActivity(), ZervSDK.ACCESS_TOKEN));
                        activityMain = new MainActivity(getReactApplicationContext().getCurrentActivity());
                        activityMain.onResume();

                        promise.resolve("User Already Authenticated");
                    } else {
                        promise.reject("initAndRestoreSession failure");
                    }
                } else {
                    ZervSDK.isUserAuthenticated = true;
                    activityMain = new MainActivity(getReactApplicationContext().getCurrentActivity());
                    activityMain.onResume();
                    promise.resolve("User Already Authenticated");
                }
            } else {
                promise.reject("initAndRestoreSession failure");
            }

        } catch (Exception e) {
            promise.reject("initAndRestoreSession failure");
        }
    }

    //This method is used to getting the token from the customer
    @ReactMethod
    public void authenticateCustomer(ReadableMap readableMap,Promise promise){
        ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).setAutoUnlockMode(getReactApplicationContext().getCurrentActivity(), false);

        String username = readableMap.getString("userName");
        String password = readableMap.getString("password");

        StringRequest strRequest = new StringRequest(Request.Method.POST,
                Constants.GET_AccessCode_URL,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        try {
                            JSONObject tokenObj = new JSONObject(response);
                            Helper.setAuthToken(getReactApplicationContext().getCurrentActivity(),tokenObj.getString("token"));
                            promise.resolve(tokenObj.getString("token"));
                        } catch (Exception e) {

                            e.printStackTrace();
                            promise.reject("Authenticate Customer Failure");
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        promise.reject("Authenticate Customer Failure");

                    }
                }) {
            @Override
            protected Map<String, String> getParams() {
                Map<String, String> params = new HashMap<String, String>();
                return params;
            }

            @Override
            public Map<String, String> getHeaders() throws AuthFailureError {
                Map<String, String> params = new HashMap<String, String>();
                String compactJws = Jwts.builder().claim("username", username).claim("password", password)
                        .signWith(SignatureAlgorithm.HS256,
                                "kBj92ySJaVshpJQYv8EQU1sPRXvaqa4jZfMHdjJVgAhQY7sn6elmr8bxQ1v6a5OP"
                                        .getBytes())
                        .compact();

                params.put("Authorization", compactJws);
                return params;
            }
        };
        RequestQueue requestQueue = Volley.newRequestQueue(getReactApplicationContext());
        requestQueue.add(strRequest);
    }


    //This method is used to for validated the user Phone number
    @ReactMethod
    public void authenticateUser(String phoneNumber,Promise promise) {

        String unique_id = Helper.getUUID(getReactApplicationContext().getCurrentActivity());
        Log.d("authenticateUser:::",ZervSDK.getAppInfo(getReactApplicationContext().getCurrentActivity()));

        ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).getUserDetails_v2(getReactApplicationContext().getCurrentActivity(), phoneNumber, new ZervCustomerListResponser() {
            @Override
            public void OnResponse(ArrayList<CustomerList> arrayList) {
                ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).getZervAuthenticationCode(
                        phoneNumber, unique_id, new ZervOTPResponser() {
                            @Override
                            public void OnResponse() {
                                promise.resolve("Authenticate User Success");
                                Helper.setPhoneNumber(getReactApplicationContext().getCurrentActivity(), phoneNumber);
                            }

                            @Override
                            public void OnError() {
                                promise.reject("Unable to get user status");
                            }
                        });
            }

            @Override
            public void OnError(String s) {
                promise.reject("No Details Found");
            }
        });
    }

    //This method is used to for validated the user otp and begins session
    @ReactMethod
    public void validateUserOTP(ReadableMap readableMap,Promise promise) {
        String phoneNumber = readableMap.getString("phoneNumber");
        String otpCode = readableMap.getString("otp");

        try {
            String uuid = Helper.getUUID(getReactApplicationContext().getCurrentActivity());
            final String phoneNumber2 = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).confirmAuthenticationCode(

                    phoneNumber2, uuid, otpCode, new ZervConfirmOTPResponser() {
                        @Override
                        public void OnResponse(ZervConfirmOTPResponseBean zervConfirmOTPResponseBean) {
                            SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), SystemUtils.USER_SESSION_DATA_OTP, otpCode);
                            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).getLocations(phoneNumber2,
                                    uuid, otpCode, new ZervLocationResponser() {
                                        @Override
                                        public void OnResponse() {
                                            promise.resolve("Validate User OTP Success");
                                        }

                                        @Override
                                        public void OnError() {
                                            promise.reject("Unable to get Credentials");

                                        }
                                    });
                        }

                        @Override
                        public void OnError() {
//                            SystemUtils.saveBooleanInSP(getReactApplicationContext().getCurrentActivity(), "authenticationvalue",false);

                            promise.reject("Validate User OTP Failure");
                        }
                    });
        } catch (Exception exe1){
            promise.reject("Please Authenticate User First");
        }
    }

    //This method is used to for refresh Credentials
    @ReactMethod
    public void refreshCredentials(String status,Promise promise) {
        try {
            String uuid = Helper.getUUID(getReactApplicationContext().getCurrentActivity());
            final String phoneNumber = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
            final String otpCode = SystemUtils.getStringFromSP(getReactApplicationContext().getCurrentActivity(), SystemUtils.USER_SESSION_DATA_OTP);
            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).getLocations(phoneNumber,
                    uuid, otpCode, new ZervLocationResponser() {
                        @Override
                        public void OnResponse() {
                            Log.d(TAG, "OnResponse: "+ZervSDK.getAccessPlaces().size()+","+ZervSDK.getAccessPermissions().size());
                            Log.d(TAG, "OnResponse: complete"+ZervSDK.getAccessPermissions());
                            promise.resolve("Successfully Refreshed!");
                        }

                        @Override
                        public void OnError() {
                            promise.reject("Unable to get Credentials");
                        }

                    });
        }
        catch (Exception e){
            Log.e(TAG, "refreshCredentials: Exception:"+e.getMessage());
        }
    }

    // This method is used to stop ble service
    @ReactMethod
    public void stopService(String status,Promise promise) {

        String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());

        if (phnum.isEmpty() || phnum == null) {

            promise.reject("Please Authenticate phoneNumber");

        } else {
            try {

                activityMain = new MainActivity(getReactApplicationContext().getCurrentActivity());
                activityMain.onDestroy();

                promise.resolve("Service stopped!");

            } catch (Exception e) {
                promise.reject(e);
            }
        }
    }

    // This method is used to stop ble scan

    @ReactMethod
    public void stopScan(String status,Promise promise) {

        String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
        if (phnum.isEmpty() || phnum == null) {

            promise.reject("Please Authenticate phoneNumber");

        } else {
            try {

                ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).stopScan();
                promise.resolve("Stop scan!");

            } catch (Exception e) {
                promise.reject(e);
            }
        }
    }

    // This method is used to start ble scan

    @ReactMethod
    public void startScan(String status,Promise promise) {
        String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
        if (phnum.isEmpty() || phnum == null) {

            promise.reject("Please Authenticate phoneNumber");

        } else {
            try {
                ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).startScan();
                promise.resolve("Start scan!");
            } catch (Exception e) {
                promise.reject(e);
            }
        }
    }

    // This method is used to push logs
    @ReactMethod
    public void pushLogs(String status,Promise promise) {

        String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
        if (phnum.isEmpty() || phnum == null) {
            promise.reject("Please Authenticate phoneNumber");

        } else {
            try {

                ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).pushLogFiles(new ZervPushLogResponse() {
                                                                                                                        @Override
                                                                                                                        public void onPushLogSuccess() {
                                                                                                                            Log.d(TAG, "pushLogFiles: >>> onPushLogSuccess: ");

                                                                                                                            promise.resolve("Successfully uploaded Log Files");
                                                                                                                        }

                                                                                                                        @Override
                                                                                                                        public void onPushLogFailed(String s) {
                                                                                                                            Log.d(TAG, "pushLogFiles: >>> onPushLogFailed: ");
                                                                                                                            promise.reject(s);
                                                                                                                        }
                                                                                                                    }
                );

                //             promise.resolve("");

            } catch (Exception e) {
                promise.reject(e);
            }
        }
    }


    //This method is used to for clear session
    @ReactMethod
    public void logout(String msg,Promise promise) {

        String phnum = Helper.getPhoneNumber(getReactApplicationContext().getCurrentActivity());
        if (phnum.isEmpty() || phnum == null) {

            promise.reject("Please Authenticate phoneNumber");

        } else {
            try {

                zervSDK.logout(getReactApplicationContext().getCurrentActivity());
                Helper.setOtpStatus(getReactApplicationContext().getCurrentActivity(), true);

                activityMain = new MainActivity(getReactApplicationContext().getCurrentActivity());
                activityMain.onDestroy();

                SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), ZervSDK.AUTH_RESUT, "");
                SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), Constants.SECURE_USERNAME_KEY, "");
                SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), Constants.SECURE_PASSWORD_KEY, "");
                SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), SystemUtils.USER_SESSION_DATA_PHONE, "");
                SystemUtils.saveStringInSP(getReactApplicationContext().getCurrentActivity(), SystemUtils.USER_SESSION_DATA_OTP, "");

                promise.resolve("Successfully Logged Out");

            } catch (Exception e) {
                promise.reject(e);
            }
        }
    }

    //This method is used to for save the Device RSSI
    @ReactMethod
    public void saveDeviceRSSI(Integer rssi,Promise promise) {

        Log.d("saveDeviceRSSI: ","rssival:"+rssi);
        try{
            switch (rssi) {
                case 0:
                    zervSDK.saveDeviceRSSI(ZervBleSensitiveStatus.Low);
                    break;
                case 1:
                    zervSDK.saveDeviceRSSI(ZervBleSensitiveStatus.Normal);
                    break;
                case 2:
                    zervSDK.saveDeviceRSSI(ZervBleSensitiveStatus.Medium);
                    break;
                case 3:
                    zervSDK.saveDeviceRSSI(ZervBleSensitiveStatus.High);
                    break;
                default:
                    zervSDK.saveDeviceRSSI(ZervBleSensitiveStatus.Normal);
                    break;
            }

            Log.d("getDeviceRSSICheck1:","getrssival:"+ZervSDK.getDeviceRSSI(getReactApplicationContext().getApplicationContext()));

            String rssival = zervSDK.getDeviceRSSI(getReactApplicationContext().getApplicationContext());

            Log.d("getDeviceRSSICheck:","getrssival:"+rssival);

            switch (rssival) {
                case ZervBleSensitiveStatus.Low :
                    rssi_val = "0";
                    break;
                case ZervBleSensitiveStatus.Normal:
                    rssi_val = "1";
                    break;
                case ZervBleSensitiveStatus.Medium:
                    rssi_val = "2";
                    break;
                case ZervBleSensitiveStatus.High:
                    rssi_val = "3";
                    break;
                default:
                    rssi_val = "1";
                    break;
            }

            Log.d("saveDeviceRSSI: ","rssival:"+rssival);

            promise.resolve(rssi_val);

        }catch(Exception e){
            // in here there is a reference to the Logger
            Log.d("onReaderDiscoverData: ","Fail");
        }

    }

    //This method is used to for get the Device RSSI

    @ReactMethod
    public void getDeviceRSSI(String rssi,Promise promise) {


        String rssival = zervSDK.getDeviceRSSI(getReactApplicationContext().getApplicationContext());

        Log.d("getDeviceRSSI: ","rssival:"+rssival);
        try{

            switch (rssival) {
                case ZervBleSensitiveStatus.Low :
                    rssi_val = "0";
                    break;
                case ZervBleSensitiveStatus.Normal:
                    rssi_val = "1";
                    break;
                case ZervBleSensitiveStatus.Medium:
                    rssi_val = "2";
                    break;
                case ZervBleSensitiveStatus.High:
                    rssi_val = "3";
                    break;
                default:
                    rssi_val = "1";
                    break;
            }

            Log.d("getDeviceRSSI1: ","rssival:"+rssi_val);

            promise.resolve(rssi_val);

        }catch(Exception e){
            // in here there is a reference to the Logger
            Log.d("onReaderDiscoverData: ","Fail");
        }

    }

    //This method is used to for set the User Role
    @ReactMethod
    public void setUserRole(Integer setUserRole,Promise promise) {

        Log.d("setUserRole: ","setUserRole:"+setUserRole);
        try{
            if (setUserRole == 1){
                ZervSDK.saveAppInfo(getReactApplicationContext().getApplicationContext(), ZervUserRole.Visitor);
            }else {
                ZervSDK.saveAppInfo(getReactApplicationContext().getApplicationContext(), ZervUserRole.User);
            }
            Log.d("setUserRole: ","setUserRole:"+setUserRole);
            promise.resolve("Success");

        }catch(Exception e){
            // in here there is a reference to the Logger
            Log.d("setUserRole: ","Fail");
        }

    }


    //This method is used to for Discover Readers
    @ReactMethod
    public void onReaderDiscover(String msg,Promise promise) {

        try {
            WritableArray app_list = new WritableNativeArray();
            try {

                WritableMap info = new WritableNativeMap();

                info.putInt("rssi", onDiscoverReaderData.getRssi());
                info.putString("serialNumber", onDiscoverReaderData.getSerialNumber());
                info.putString("location", onDiscoverReaderData.getLocationName());
                info.putString("subLocation", onDiscoverReaderData.getSubLocationName());
                info.putString("locationFriendly", onDiscoverReaderData.getLocationFriendly());
                info.putString("subLocationFriendly", onDiscoverReaderData.getSubLocationFriendly());

                app_list.pushMap(info);
            } catch (Exception ex) {
                System.err.println("Exception: " + ex.getMessage());
            }
            applist = app_list;

            promise.resolve(applist);

        } catch (Exception e) {
            Log.d("onReaderDiscoverData: ","Fail");
        }
    }

    //This method is used to for Set AutoUnlock Mode

    @ReactMethod
    public void setAutoUnlockMode(int setAutoUnlockMode,Promise promise) {
        Log.d("TAG", "setAutoUnlockStatus: "+setAutoUnlockMode);
        if (setAutoUnlockMode == 1){
            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).setAutoUnlockMode(getReactApplicationContext().getCurrentActivity(), false);

        }else{
            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).setAutoUnlockMode(getReactApplicationContext().getCurrentActivity(), true);
        }
        promise.resolve("Success");
    }

    //This method is used to for show Assign NearBy Devices

    @ReactMethod
    public void assignNearByReadersData(String msg,Promise promise) {

        try {

            WritableArray app_list = new WritableNativeArray();

            try {

                WritableMap info = new WritableNativeMap();

                info.putString("deviceMACId", nearbyDevice.getDeviceMACId());
                info.putString("rssi", nearbyDevice.getRssi());
                info.putString("location", nearbyDevice.getLocationName());
                info.putString("subLocation", nearbyDevice.getSubLocationName());
                info.putString("locationFriendly", nearbyDevice.getLocationFriendlyName());
                info.putString("subLocationFriendly", nearbyDevice.getSubLocationFriendlyName());
                info.putString("uniqueName", nearbyDevice.getUniqueName());

                app_list.pushMap(info);
            } catch (Exception ex) {
                System.err.println("Exception: " + ex.getMessage());
            }
            applist = app_list;
            promise.resolve(applist);

        } catch (Exception e) {
            Log.d("assignNearByReadersData: ","Fail");
        }
    }

    //This method is used to for connceting Device

    @ReactMethod
    public void connectDevice(String msg,Promise promise) {

        boolean isDeviceConnect =  false;
        boolean mode = ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).getAutoUnlockMode(getReactApplicationContext().getCurrentActivity());
        if(!mode){
            isDeviceConnect = true;

            ZervSdkOpenGate.getOpenGateInstance(getReactApplicationContext().getCurrentActivity()).connectDevice(msg);

            if(isDeviceConnect){

                new Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {

                        try {
                            WritableArray app_list = new WritableNativeArray();
                            try {

                                WritableMap info = new WritableNativeMap();

                                info.putString("MacId", deviceConnectionSuccessData.getMacId());
                                info.putInt("RSSI", deviceConnectionSuccessData.getRSSI());
                                info.putString("LocationName", deviceConnectionSuccessData.getLocationName());
                                info.putString("SubLocationName", deviceConnectionSuccessData.getSubLocationName());
                                info.putString("LocationFriendlyName", deviceConnectionSuccessData.getLocationFriendlyName());
                                info.putString("SubLocationFriendlyName", deviceConnectionSuccessData.getSubLocationFriendlyName());

                                app_list.pushMap(info);
                            } catch (Exception ex) {
                                System.err.println("Exception: " + ex.getMessage());
                            }
                            applist = app_list;

                            promise.resolve(applist);

                        } catch (Exception e) {
                            Log.d("assignNearByReadersData: ","Fail");
                        }
                    }
                },10000);

            }
        }
        else{
            isDeviceConnect = false;
            promise.resolve("");
        }
    }




    //This method is used to show readers info
    @ReactMethod
    public void getAllReaders(String msg,Promise promise) {

        try{
            try {
                WritableArray app_list = new WritableNativeArray();
                try {

                    WritableMap info = new WritableNativeMap();

                    info.putInt("rssi", onDiscoverReaderData.getRssi());
                    info.putString("serialNumber", onDiscoverReaderData.getSerialNumber());
                    info.putString("location", onDiscoverReaderData.getLocationName());
                    info.putString("subLocation", onDiscoverReaderData.getSubLocationName());
                    info.putString("locationFriendly", onDiscoverReaderData.getLocationFriendly());
                    info.putString("subLocationFriendly", onDiscoverReaderData.getSubLocationFriendly());
                    info.putString("uniqueName", onDiscoverReaderData.getUniqueName());

                    app_list.pushMap(info);
                } catch (Exception ex) {
                    System.err.println("Exception: " + ex.getMessage());
                }
                applist = app_list;
                Log.d("getAllReaders: ",app_list.toString());
                promise.resolve(applist);

            } catch (Exception e) {
                Log.d("getAllReaders: ","Fail");
            }

        }catch(Exception e){
            // in here there is a reference to the Logger
            Log.d("getAllReaders: ","Fail");
        }
    }

    //This method is used to for check InternetStatus

    @ReactMethod
    public void internetConnectionStatus(String status,Promise promise) {
        String internetConnectionStatus = ZervPermissions.internetConnectionStatus(getReactApplicationContext().getCurrentActivity());
        promise.resolve(internetConnectionStatus);
    }

    //This method is used to for check BLE Status
    @ReactMethod
    public void bluetoothPermissionStatus(String status,Promise promise) {
        String bluetoothPermissionStatus = ZervPermissions.bluetoothPermissionStatus();
        promise.resolve(bluetoothPermissionStatus);
    }

    //This method is used to for check BLE Status
    @ReactMethod
    public void locationPermissionStatus(String status,Promise promise) {
        String locationPermissionStatus = ZervPermissions.locationPermissionStatus(getReactApplicationContext().getCurrentActivity());

        if (ZervPermissions.locationPermissionStatus(getReactApplicationContext().getCurrentActivity()) == "OFF") {
            // permissionsAlert(PermissionsActivity.this, "Location Service", "Location is turned OFF");
            locationPermissionStatus = "Location is turned OFF";
        } else {
            // permissionsAlert(PermissionsActivity.this, "Location Service", ZervPermissions.checkLocationPermissionState(PermissionsActivity.this));
            locationPermissionStatus = "Location is "+ZervPermissions.checkLocationPermissionState(getReactApplicationContext().getCurrentActivity());
        }

        promise.resolve(locationPermissionStatus);
    }

    //This method is used to for check BLE Status
    @ReactMethod
    public void batterySettingStatus(String status,Promise promise) {
        String batterySettingStatus = ZervPermissions.batterySettingStatus(getReactApplicationContext().getCurrentActivity());
        promise.resolve(batterySettingStatus);
    }


    //callback meyhods
    @Override
    public void onInitSuccess() { }

    @Override
    public void onInitFailure(String errorMessage) {}

    @Override
    public void onConfigurationSuccess() {}

    @Override
    public void onConfigurationFailure(String errorMessage) {
        configureStatus = errorMessage;
    }

    @Override
    public void onCustomerAuthenticationSuccess() { }

    @Override
    public void onCustomerAuthenticationFailure(String errorMessage) { }

    @Override
    public void onAuthenticateUserSuccess() {
        authCustomerStatus = "Success User";
    }

    @Override
    public void onAuthenticateUserFailure(String errorMessage) {
        authCustomerStatus = errorMessage;
    }

    @Override
    public void onValidateUserOTPSuccess() {}
    @Override
    public void onValidateUserOTPFailure(String errorMessage) {}

    @Override
    public void onLogoutSuccess() {}


    @Override
    public void onLogoutFailure(String errorMessage) { }

    @Override
    public void onRefreshCredentialSuccess() {}

    @Override
    public void stopService() {
        serviceMsg = "Service stopped!";
    }

    @Override
    public void onRefreshCredentialFailure(String errorMessage) {}
    @Override
    public Boolean readerConnectConfirmation(DeviceData deviceData) {
        Log.d("Zerv_Reader_DeviceData",deviceData.toString());
        //ZervSdkOpenGate.saveLog("Confirmation Reader Before Connecting:"+deviceData.toString()+",_isInfo: true");
        return true;
    }

    @Override
    public void onReaderDiscovered(DeviceData deviceData) {

        onDiscoverReaderData = deviceData;

        Log.d("Zerv_DeviceData",onDiscoverReaderData.getLocationName());

        //  ZervSdkOpenGate.saveLog("Discovered Readers:"+deviceData.toString()+",_isInfo: true");
    }

    @Override
    public void readerData(DeviceData deviceData) {}

    @Override
    public void onPushLogSuccess() {}

    @Override
    public void onPushLogFailed(String s) {}

    @Override
    public void onScanNearbyDevice(NearbyDeviceData nearbyDeviceData) {
        nearbyDevice = nearbyDeviceData;
        Log.d("Zerv_DeviceData",nearbyDevice.getDeviceMACId());
    }

    @Override
    public void onScanNearbyDevice(ArrayList<NearbyDeviceData> arrayList) {

    }

    @Override
    public void onScanNearbyDeviceFailure(String s) { }

    @Override
    public void onStartScan(String s) {
        Toast.makeText(getReactApplicationContext().getApplicationContext(),s,Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onStopScan(String s) {
        Toast.makeText(getReactApplicationContext().getApplicationContext(),s,Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onGetCustomerInfoSuccess(ArrayList arrayList) {

    }

    @Override
    public void onGetCustomerInfoFailed(String s) {

    }

    @Override
    public void onReaderLogsData(LogsData logsData) {}

    @Override
    public void deviceConnection(String s) {}

    @Override
    public void deviceConnectionTimeout(String s) {}

    @Override
    public void deviceConnectionFailure(String s) {}
    @Override
    public void deviceConnectionSuccess(ZBleDevice zBleDevice) {
        Log.d("TAG", "deviceConnectionSuccess:123 "+zBleDevice);
        deviceConnectionSuccessData = zBleDevice;
    }


    @ReactMethod
    public void isGPSEnabled(Promise promise) {
        LocationManager locationManager =
                (LocationManager) getReactApplicationContext().getSystemService(Context.LOCATION_SERVICE);
        promise.resolve(locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER));
    }
    @ReactMethod
    public void openGPSSettings() {
        Intent gpsSettingsIntent= new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
//        mActivity.startActivityForResult(gpsSettingsIntent,0);
        reactContext.getCurrentActivity().startActivityForResult(gpsSettingsIntent,0);
    }

    @ReactMethod
    public void isBluetoothEnabled(Promise promise){
        BluetoothAdapter mBluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
        if (mBluetoothAdapter == null) {
            // Device does not support Bluetooth
            promise.resolve(false);
        } else if (!mBluetoothAdapter.isEnabled()) {
            // Bluetooth is not enabled :)
            promise.resolve(false);
        } else {
            // Bluetooth is enabled
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void requestBluetoothPermission(Promise promise){
        String[] perms = {Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_SCAN};
        String[] perms1 = {Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_CONNECT};
        String[] perms2 = {Manifest.permission.BLUETOOTH, Manifest.permission.BLUETOOTH};
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.S){
            Log.i("BL Permission Android->12 Connect ", String.valueOf(EasyPermissions.hasPermissions(reactContext,Manifest.permission.BLUETOOTH_CONNECT)));
            Log.i("BL Permission Android->12 Scan", String.valueOf(EasyPermissions.hasPermissions(reactContext,Manifest.permission.BLUETOOTH_SCAN)));
            boolean scanAllowed = true;
            boolean connectAllowed = true;
            if (!EasyPermissions.hasPermissions(reactContext,perms)){
                EasyPermissions.requestPermissions(reactContext.getCurrentActivity(),"Pynwheel requires location permission",2,perms);
                promise.reject("Not Allowed","Permission requested Bluetooth scan");
                scanAllowed=false;
            }
            if(!EasyPermissions.hasPermissions(reactContext,perms1)){
                EasyPermissions.requestPermissions(reactContext.getCurrentActivity(),"Pynwheel requires location permission",2,perms1);
                promise.reject("Not Allowed","Permission requested Bluetooth connect");
                connectAllowed=false;
            }
            if(scanAllowed && connectAllowed){
                promise.resolve("Allowed");
            }
        }else{
            if(!EasyPermissions.hasPermissions(reactContext,perms2)){
                EasyPermissions.requestPermissions(reactContext.getCurrentActivity(),"Pynwheel requires location permission",2,perms2);
                promise.reject("Not Allowed","Permission requested Bluetooth");
            }
            else{
                promise.resolve("Allowed");
            }
        }
    }
}
