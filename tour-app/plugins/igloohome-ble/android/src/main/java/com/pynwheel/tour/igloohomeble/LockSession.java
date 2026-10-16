package com.pynwheel.tour.igloohomeble;

/**
 * The one state machine behind the plugin, kept free of Android and SDK
 * types so it can be unit tested on the JVM: at most one scan, one
 * connection and one unlock at a time, and every transition the plugin
 * methods are allowed to make.
 *
 *   IDLE ──startScan──▶ SCANNING ──stopScan──▶ IDLE
 *   IDLE / SCANNING ──connect──▶ CONNECTING ──connected──▶ CONNECTED ──unlock──▶ UNLOCKING ──done──▶ CONNECTED
 *   any ──disconnect / reset──▶ IDLE
 */
public final class LockSession {

    public enum State { IDLE, SCANNING, CONNECTING, CONNECTED, UNLOCKING }

    /** Why a transition was refused: the plugin maps it to the JS error code. */
    public enum Refusal { NONE, BUSY, NOT_CONNECTED }

    private State state = State.IDLE;
    private String connectedLock = null;

    public synchronized State state() {
        return state;
    }

    public synchronized String connectedLock() {
        return connectedLock;
    }

    /** A scan may start when nothing else is running. */
    public synchronized Refusal beginScan() {
        if (state != State.IDLE) return Refusal.BUSY;
        state = State.SCANNING;
        return Refusal.NONE;
    }

    /** Stopping a scan is always allowed; it only changes anything while scanning. */
    public synchronized void endScan() {
        if (state == State.SCANNING) state = State.IDLE;
    }

    /** Connecting ends the scan (the SDK requires it) and refuses while a connection or unlock is in progress. */
    public synchronized Refusal beginConnect() {
        if (state == State.CONNECTING || state == State.CONNECTED || state == State.UNLOCKING) return Refusal.BUSY;
        state = State.CONNECTING;
        return Refusal.NONE;
    }

    public synchronized void connected(String lockName) {
        if (state != State.CONNECTING) return;
        state = State.CONNECTED;
        connectedLock = lockName;
    }

    /** A failed connection goes back to idle. */
    public synchronized void connectFailed() {
        if (state == State.CONNECTING) {
            state = State.IDLE;
            connectedLock = null;
        }
    }

    public synchronized Refusal beginUnlock() {
        if (state == State.UNLOCKING) return Refusal.BUSY;
        if (state != State.CONNECTED) return Refusal.NOT_CONNECTED;
        state = State.UNLOCKING;
        return Refusal.NONE;
    }

    /** The unlock finished (opened or refused): the connection is still up. */
    public synchronized void endUnlock() {
        if (state == State.UNLOCKING) state = State.CONNECTED;
    }

    /** Dropping the connection, cancelling a connection attempt or an unlock in flight. */
    public synchronized void disconnected() {
        state = State.IDLE;
        connectedLock = null;
    }

    public synchronized boolean isScanning() {
        return state == State.SCANNING;
    }

    public synchronized boolean isConnected() {
        return state == State.CONNECTED || state == State.UNLOCKING;
    }
}
