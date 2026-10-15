package com.pynwheel.selftour.igloo;

import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import co.igloohome.ble.lock.DaylightSavings;

public class Utils {
    public  static Collection<DaylightSavings> toDayLightSavingsCollection(ReadableArray readableArray){
        List<DaylightSavings> list = new ArrayList<>();
        for (int i=0; i<readableArray.size(); i++){
            ReadableMap object=readableArray.getMap(i);
            list.add(new DaylightSavings(
                    object.getInt("year"),
                    object.getInt("start_date"),
                    object.getInt("end_date"),
                    object.getInt("offset")
            ));
        }
        return list;
    }
}
