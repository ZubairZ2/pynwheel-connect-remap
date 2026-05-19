/* Pynwheel LDP Unit Map Manager - Standalone */
(function () {
    'use strict';
  
    let hasInitializedMap = false;
    let sdkLoadRequested = false;
  
    // ====== CONFIG YOU WILL MOST LIKELY CHANGE ======
    const CONFIG = {
      apiKey: '88ebc96efd10f0b0af44ced6031d8813',
      propertyId: 3540,
      showZoomControls: true,
      styles: {
        unitColors: {
          available: '#ffd958',
          hover: '#fdb502'
        }
      }
    };
  
    function getEmbeddedUnitMapData() {
      // Mirrors your cshtml: <input id="pynwheelAptUnitMapData" ... />
      // Optional: only used if you embed JSON in the standalone HTML.
      const el = document.getElementById('pynwheelAptUnitMapData');
      if (!el || !el.value) return null;
  
      try {
        return JSON.parse(el.value);
      } catch (e) {
        console.warn('pynwheelAptUnitMapData is not valid JSON', e);
        return null;
      }
    }
  
    function initPynwheel() {
      if (hasInitializedMap) return;
  
      const pynMapEl = document.getElementById('pynMap');
      if (!pynMapEl) return;
  
      // if (!window.PynMapSDK || typeof window.PynMapSDK.init !== 'function') {
      //   console.error('PynMapSDK is not available.');
      //   return;
      // }
  
      console.log('init Pynwheel map in standalone app');
  
      // Optional: get embedded data if you decide to place it in index.html
      const embeddedData = getEmbeddedUnitMapData();
      if (embeddedData) {
        console.log('Embedded map data found:', embeddedData);
        // NOTE: Only do something with it if your SDK/integration needs it.
      }
  
      // Track currently selected unit
      let selectedUnitId = null;
      const SELECTION_COLOR = '#fdb502';
  
      const inlineMap = PynMapSDK.create({
        container: '#pynMap',
        apiKey: CONFIG.apiKey,
        propertyId: CONFIG.propertyId,
        showZoomControls: CONFIG.showZoomControls,
        styles: CONFIG.styles,
        onReady: function () {
          console.log('PynMapSDK is ready');
        },
        onUnitHover: function (unit) { console.log('Hover:', unit); },
        offUnitHover: function () {
          console.log("off hover");
        },
        onUnitClick: function (unit) {
          console.log('Click:', unit);
          
          // If clicking the same unit, unselect it
          if (selectedUnitId === unit.unitId) {
            inlineMap.unselectUnit(selectedUnitId);
            selectedUnitId = null;
            return;
          }
          
          // If a different unit was previously selected, unselect it
          if (selectedUnitId !== null) {
            inlineMap.unselectUnit(selectedUnitId);
          }
          
          // Select the new unit with custom color
          inlineMap.selectUnit(unit.unitId, SELECTION_COLOR);
          selectedUnitId = unit.unitId;
        }
      });
  
      hasInitializedMap = true;
  
      // ====== FLOOR SELECTOR ======
      const floorButtons = document.querySelectorAll('.floorBtn[data-floor]');
      floorButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          const floorId = btn.getAttribute('data-floor');
          if (inlineMap && typeof inlineMap.setFloor === 'function') {
            inlineMap.setFloor(floorId);
          } else if (inlineMap && typeof inlineMap.changeFloor === 'function') {
            inlineMap.changeFloor(floorId);
          } else {
            console.warn('PynMapSDK: no setFloor/changeFloor method found on map instance');
          }
          // Update active state
          floorButtons.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
  
      const zoomInBtn = document.querySelector('.pynwheelLDPjs-zoomIn');
      const zoomOutBtn = document.querySelector('.pynwheelLDPjs-zoomOut');
  
      // if (zoomInBtn) zoomInBtn.onclick = () => window.PynMapSDK.zoomIn();
      // if (zoomOutBtn) zoomOutBtn.onclick = () => window.PynMapSDK.zoomOut();
    }
  
    function loadSdkAndInit() {
      if (sdkLoadRequested) return;
  
      if (window.PynMapSDK) {
        initPynwheel();
        return;
      }
  
      sdkLoadRequested = true;
  
      const script = document.createElement('script');
      script.src = 'https://pynwheelconnect.com/sdk/pyn-map-sdk.js';
      script.onload = initPynwheel;
      script.onerror = function () {
        sdkLoadRequested = false;
        console.error('Failed to load PynMapSDK script.');
      };
      document.head.appendChild(script);
    }
  
    function openMapModal() {
      const modal = document.getElementById('pynwheelMapModal');
      if (!modal) return;
  
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
  
      if (!hasInitializedMap) {
        loadSdkAndInit();
      } else {
        window.requestAnimationFrame(function () {
          window.dispatchEvent(new Event('resize'));
        });
      }
    }
  
    function closeMapModal() {
      const modal = document.getElementById('pynwheelMapModal');
      if (!modal) return;
  
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  
    function bindModalEvents() {
      const openButton = document.querySelector('[data-map-open]');
      const closeButtons = document.querySelectorAll('[data-map-close]');
  
      if (openButton) {
        openButton.addEventListener('click', openMapModal);
      }
  
      closeButtons.forEach(function (button) {
        button.addEventListener('click', closeMapModal);
      });
  
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeMapModal();
        }
      });
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        bindModalEvents();
        loadSdkAndInit();
      });
    } else {
      bindModalEvents();
      loadSdkAndInit();
    }
  })();