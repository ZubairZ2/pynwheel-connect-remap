package com.pynwheel.selftour.igloo;

import android.bluetooth.le.ScanSettings;
import android.os.Handler;
import android.util.Log;
import android.util.Pair;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.pynwheel.selftour.igloo.database.StoredKey;
import com.pynwheel.selftour.igloo.database.StoredKeyDao;
import com.pynwheel.selftour.igloo.database.StoredKeyDatabase;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.TimeZone;

import co.igloohome.ble.lock.BleManager;
import co.igloohome.ble.lock.LockStatus;
import co.igloohome.ble.lock.b;
import co.igloohome.ble.lock.DaylightSavings;
import co.igloohome.ble.lock.IglooLock;
import io.reactivex.Completable;
import io.reactivex.CompletableEmitter;
import io.reactivex.CompletableObserver;
import io.reactivex.CompletableOnSubscribe;
import io.reactivex.Single;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Action;
import kotlinx.coroutines.CoroutineScope;
import kotlinx.coroutines.Dispatchers;
import kotlinx.coroutines.Job;


public class IglooModule extends ReactContextBaseJavaModule {


    private static ReactApplicationContext reactContext;
    private ArrayList<IglooLock> foundLocks=new ArrayList<>();
    private Disposable scanDisposable = null;
    private Disposable connectDisposable = null;
    private IglooLock selectedLock = null;

    public IglooModule(ReactApplicationContext context) {
        super(context);
        reactContext = context;
    }
    private void sendEvent(ReactContext reactContext, String eventName, @Nullable String params) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit(eventName, params);
    }

    @Override
    public String getName() {
        return "IglooModule";
    }
   //This method is used to initialize
    @ReactMethod
    public void initIgloo(Promise promise) {
        try {
            promise.resolve(TimeZone.getDefault().getID());
        } catch (Exception error){
            promise.reject("1",error.getMessage());
        }
    }
    @ReactMethod
    public void scan(Promise promise){
        Log.i("SCANNING","started");
        foundLocks.clear();
        WritableArray list= Arguments.createArray();
        try {
            scanDisposable = new BleManager(reactContext).scan(new ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),new Handler())
                    .observeOn(AndroidSchedulers.mainThread())
                    .subscribe(it->{
                        Log.i("SCANNING","found lock: " + it.getName());
                        sendEvent(reactContext,"iglooLockScanEvent",it.getName());
                        if (!foundLocks.contains(it)) {
                            foundLocks.add(it);
                        }
                            },error->{
                        Log.e("Scan Lock error", error.getMessage());
                        sendEvent(reactContext,"iglooLockScanEvent","ERROR:" + error.getMessage());
                    });
            promise.resolve(list);
        } catch (Exception e) {
            Log.e("SCANNING", "scan() threw: " + e.getMessage());
            promise.reject("SCAN_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void connect(String name,String bltKey,Promise promise){
        Log.e("Connecting with key",bltKey+"");
        if(!scanDisposable.isDisposed()) { scanDisposable.dispose(); }
        if (connectDisposable !=null && !connectDisposable.isDisposed()){connectDisposable.dispose();}
        selectedLock=getLockByName(name);
        Log.e("connction start 3",bltKey+"");
        connectDisposable=selectedLock.connectByStringKey(reactContext,bltKey)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(it->{
                    Log.e("connction start 4",bltKey+"");
                    promise.resolve(it.getName());
                },error->{
                    Log.e("connction start 5",error.getMessage()+"");
                    promise.reject(error.getMessage());
                });
    }
    @ReactMethod
    public void disposeConnection(Promise promise){
        if (connectDisposable !=null && !connectDisposable.isDisposed()){
            connectDisposable.dispose();
            promise.resolve(" Native: disposed");
        }else {
            promise.resolve(" Native: disposed");
            //promise.reject(" Native: already disposed");
        }
    }
    @ReactMethod
    public void pair(String lockName, ReadableArray ranges, Integer gmtOffset,Promise promise){
         selectedLock=getLockByName(lockName);
        if (selectedLock !=null){
            selectedLock.pair(null,gmtOffset,null,Utils.toDayLightSavingsCollection(ranges),null)
                    .subscribe(it->{
                       promise.resolve(it);
                       Log.e("Paired",it);
                    },error->{
                        Log.e("pair error",error.getMessage());
                        promise.reject(error.getMessage());
                    });
        }else {
            promise.resolve("lock is not available");
        }
    }
    @ReactMethod
    public void commitPairing(String bltKey,String pin,Promise promise) {
        Integer epoch = null;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.N) {
            epoch = Math.toIntExact(System.currentTimeMillis() / 1000);
        }
        //Disconnecting from the lock is required after unpairing is successful.
        selectedLock.commitPairing(epoch)
                .andThen(Single.just(new Pair(epoch,new PairingDataResponse(bltKey,pin))))
                .subscribe(it->{
                    promise.resolve("commit pairing done with key:"+it);
                },error->{
                    promise.reject(error.getMessage());
                });
    }
    @ReactMethod
    public void pairStatus(Promise promise){
        if (selectedLock !=null){
            promise.resolve(selectedLock.getPairedStatus());
        }else {
            promise.reject("No lock connected");
        }
    }
    @ReactMethod
    public void unpair(Promise promise){
        if (selectedLock !=null){
            Log.i("Unpairing","--------->");
            selectedLock.unpair()
                    .subscribe(() -> {
                        promise.resolve("success");
                    },error->{
                        promise.reject(error);
                    });

        }else {
            promise.reject("no selected Lock");
        }
    }
    @ReactMethod
    public void unlock(Promise promise){
        Log.d("unlocking----->","YES");
        Integer ts=(int) (System.currentTimeMillis() / 1000);
        selectedLock.unlock(Long.valueOf(ts),ts)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(()->{
                    promise.resolve("success");
                },error->{
                    promise.reject(error);
                });
    }

    @ReactMethod
    public void lock(Promise promise){
        Log.d("locking----->","YES");
        Integer ts=(int) (System.currentTimeMillis() / 1000);
        selectedLock.lock(Long.valueOf(ts),0)
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(()->{
                    promise.resolve("success");
                },error->{
                    promise.reject(error);
                });
    }
    @ReactMethod
    public void autoRelock(Integer time,Promise promise){
        if (selectedLock !=null){
            Integer ts=(int) (System.currentTimeMillis() / 1000);
            selectedLock.setAutoRelock(true,time,ts)
                    .subscribe(()->{
                        promise.resolve("success");
                    },error->{
                        promise.reject(error);
                    });
        }else{
            promise.reject("No lock connected");
        }
    }
    @ReactMethod
    public void status(String name,Promise promise){
        Integer ts=(int) (System.currentTimeMillis() / 1000);
        selectedLock=getLockByName(name);
        if (selectedLock !=null){
            selectedLock.getLockStatus(ts)
                    .subscribe(st->{
                        promise.resolve(st);
                    },error->{
                        promise.reject(error);
                    });
        }else{
            promise.reject("No lock connected");
        }
    }
    @ReactMethod
    public void logs(Promise promise){
        if (selectedLock !=null){
            Integer ts=(int) (System.currentTimeMillis() / 1000);
            selectedLock.getLogs(Long.valueOf(ts),ts)
                    .subscribe(res->{
                        promise.resolve(res.toString());
                    },error->{
                        promise.reject(error);
                    });
        }else {
            promise.reject("No lock connected");
        }
    }
    @ReactMethod
    public void lockExist(String name,Promise promise){
        boolean exist=false;
        for (int i=0;i<foundLocks.size();i++){
            if (foundLocks.get(i).getName()==name){
                exist=true;
            }
        }
        promise.resolve(exist);
    }
    @ReactMethod
    public void isLockOpen(Promise promise){
        Integer ts=(int) (System.currentTimeMillis() / 1000);
        if (selectedLock != null){
            selectedLock.isLockOpen(ts)
                    .subscribe(it->{
                        promise.resolve(it);
                    });
        }else{
            promise.resolve(false);
        }
    }
    private IglooLock getLockByName(String name){
        for (int i=0; i<foundLocks.size(); i++){
            if (foundLocks.get(i).getName().equals(name)){
                return foundLocks.get(i);
            }
        }
        return null;
    }

}
