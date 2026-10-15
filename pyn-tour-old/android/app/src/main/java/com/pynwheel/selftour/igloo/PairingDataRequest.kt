package com.pynwheel.selftour.igloo

import androidx.annotation.Keep

@Keep
data class PairingDataRequest(
    /**
     * returned value from IglooLock.pair() function
     */
    val payload: String,
    /**
     * tz database id
     */
    val timezone: String
)

@Keep
data class PairingDataResponse(
    val bluetoothAdminKey: String,
    val masterPin: String
)