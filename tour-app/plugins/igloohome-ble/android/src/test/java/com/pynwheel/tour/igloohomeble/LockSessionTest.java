package com.pynwheel.tour.igloohomeble;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/** The transitions the plugin relies on: no concurrent scans, connections or unlocks; cleanup from any state. */
public class LockSessionTest {

    @Test
    public void scanThenStop() {
        LockSession s = new LockSession();
        assertEquals(LockSession.Refusal.NONE, s.beginScan());
        assertTrue(s.isScanning());
        assertEquals("a second scan is refused while one runs", LockSession.Refusal.BUSY, s.beginScan());
        s.endScan();
        assertEquals(LockSession.State.IDLE, s.state());
        assertEquals("a new scan may start once the first stopped", LockSession.Refusal.NONE, s.beginScan());
    }

    @Test
    public void connectEndsTheScanAndUnlockNeedsAConnection() {
        LockSession s = new LockSession();
        assertEquals("unlock without a connection", LockSession.Refusal.NOT_CONNECTED, s.beginUnlock());
        s.beginScan();
        assertEquals(LockSession.Refusal.NONE, s.beginConnect());
        assertEquals(LockSession.State.CONNECTING, s.state());
        assertFalse(s.isScanning());
        assertEquals("unlock while still connecting", LockSession.Refusal.NOT_CONNECTED, s.beginUnlock());
        assertEquals("a second connect while connecting", LockSession.Refusal.BUSY, s.beginConnect());
        s.connected("SK3E14001756");
        assertTrue(s.isConnected());
        assertEquals("SK3E14001756", s.connectedLock());
        assertEquals(LockSession.Refusal.NONE, s.beginUnlock());
        assertEquals("a second unlock while unlocking", LockSession.Refusal.BUSY, s.beginUnlock());
        assertEquals("a scan while unlocking", LockSession.Refusal.BUSY, s.beginScan());
        s.endUnlock();
        assertEquals("the connection outlives the unlock, so a second unlock is possible", LockSession.State.CONNECTED, s.state());
        assertEquals(LockSession.Refusal.NONE, s.beginUnlock());
    }

    @Test
    public void failuresAndCleanupReturnToIdle() {
        LockSession s = new LockSession();
        s.beginConnect();
        s.connectFailed();
        assertEquals(LockSession.State.IDLE, s.state());
        assertNull(s.connectedLock());

        s.beginConnect();
        s.connected("L");
        s.beginUnlock();
        s.disconnected();
        assertEquals("disconnect from the middle of an unlock", LockSession.State.IDLE, s.state());
        assertNull(s.connectedLock());
        assertFalse(s.isConnected());

        s.beginScan();
        s.disconnected();
        assertEquals("reset from a scan", LockSession.State.IDLE, s.state());
    }

    @Test
    public void lateCallbacksAreIgnored() {
        LockSession s = new LockSession();
        s.connected("late");
        assertEquals("a connected callback after a disconnect changes nothing", LockSession.State.IDLE, s.state());
        assertNull(s.connectedLock());
        s.endUnlock();
        s.endScan();
        assertEquals(LockSession.State.IDLE, s.state());
    }
}
