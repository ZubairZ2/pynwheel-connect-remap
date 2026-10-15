package com.pynwheel.selftour.latch;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.latch.android.sdk.core.LatchClient;
import com.latch.android.sdk.model.InitResult;

import java.util.List;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.regex.Matcher;
import java.util.regex.Pattern;


public class LatchModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "LatchModule";
    private static final String TAG = "LatchModule";

    private ReactContext context;

    public LatchModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }
    // initialize latch
    @ReactMethod
    public void configuereLatch(String token, Callback callback) {
        final ReactApplicationContext reactContext = getReactApplicationContext();

        LatchClient.INSTANCE.initialize(reactContext, token)
                .subscribe(
                        initResult -> {
                            String cn = initResult != null ? initResult.getClass().getName() : "";
                            String s = initResult != null ? initResult.toString() : "";
                            Log.d(TAG, "Latch init class=" + cn + " toString=" + s);

                            if (initResult instanceof InitResult.Success) {
                                callback.invoke("success", "Latch initialization successful");
                            } else if (initResult instanceof InitResult.InvalidToken) {
                                callback.invoke("InvalidToken", null);
                            } else if (initResult instanceof InitResult.PermissionDenied) {
                                callback.invoke("PermissionDenied", null);
                            } else if (initResult instanceof InitResult.UserConsentDenied) {
                                callback.invoke("UserConsentDenied", null);
                            } else if (initResult instanceof InitResult.Error) {
                                String desc = ((InitResult.Error) initResult).getDescription();
                                callback.invoke("Error", desc != null ? desc : s);
                            } else {
                                // Fallback: string patterns (Kotlin / toString may vary)
                                if (s.contains("$Success") || cn.contains("InitResult$Success")) {
                                    callback.invoke("success", "Latch initialization successful");
                                } else if (s.contains("InvalidToken") || cn.contains("InvalidToken")) {
                                    callback.invoke("InvalidToken", null);
                                } else if (s.contains("PermissionDenied") || cn.contains("PermissionDenied")) {
                                    callback.invoke("PermissionDenied", null);
                                } else {
                                    Log.w(TAG, "Unhandled InitResult: " + cn + " " + s);
                                    callback.invoke("Error", s);
                                }
                            }
                        },
                        throwable -> {
                            Log.e(TAG, "Latch initialize failed", throwable);
                            callback.invoke("Error", throwable.getMessage());
                        });
    }

    @ReactMethod
    public void locks(Callback callback) {
        LatchClient.INSTANCE.locks()
                .subscribe(locksResult -> {
                    String responseString = locksResult.toString();
                    List<JSONObject> formattedLocksList = extractLocksFromResponse(responseString);

                    if (!formattedLocksList.isEmpty()) {
                        JSONArray formattedLocksArray = new JSONArray(formattedLocksList);
                        Log.d("Locks", formattedLocksArray.toString());
                        callback.invoke(formattedLocksArray.toString(), formattedLocksArray.toString());
                    } else {
                        Log.d("Locks", "Locks not available");
                        callback.invoke("Locks not available", null);
                    }
                });
    }


    private List<JSONObject> extractLocksFromResponse(String responseString) {
        List<JSONObject> formattedLocksList = new ArrayList<>();
        Pattern pattern = Pattern.compile("Lock\\(uuid=(.*?), name=(.*?), .*?\\)");
        Matcher matcher = pattern.matcher(responseString);

        while (matcher.find()) {
            String uuid = matcher.group(1);
            String name = matcher.group(2);

            JSONObject formattedLock = new JSONObject();
            try {
                formattedLock.put("name", name);
                formattedLock.put("uuid", uuid);
            } catch (JSONException e) {
                e.printStackTrace();
            }

            formattedLocksList.add(formattedLock);
        }

        return formattedLocksList;
    }



    // unlock latch device
    @ReactMethod
    public void unlock(String lockID, Callback callback){
        LatchClient.INSTANCE.unlock(lockID)
                .subscribe(initResult -> {
                    if (initResult.toString().contains("$Success")) {
                        callback.invoke("success", "Unlock successful");
                    }else if (initResult.toString().contains("$BleDisabled")) {
                        callback.invoke("BleDisabled", null);
                    } else {
                        callback.invoke("Error", null);
                    }

                });
    }



    @NonNull
    @Override
    public String getName() {
        return MODULE_NAME;
    }
}
