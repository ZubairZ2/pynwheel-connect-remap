(function (global) {

  // panzoom@9 bundled inline — eliminates CDN dependency (CSP-safe)
  (function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.panzoom=f()}})(function(){var define,module,exports;return function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r}()({1:[function(require,module,exports){"use strict";var wheel=require("wheel");var animate=require("amator");var eventify=require("ngraph.events");var kinetic=require("./lib/kinetic.js");var createTextSelectionInterceptor=require("./lib/makeTextSelectionInterceptor.js");var domTextSelectionInterceptor=createTextSelectionInterceptor();var fakeTextSelectorInterceptor=createTextSelectionInterceptor(true);var Transform=require("./lib/transform.js");var makeSvgController=require("./lib/makeSvgController.js");var makeDomController=require("./lib/makeDomController.js");var defaultZoomSpeed=1;var defaultDoubleTapZoomSpeed=1.75;var doubleTapSpeedInMS=300;var clickEventTimeInMS=200;module.exports=createPanZoom;function createPanZoom(domElement,options){options=options||{};var panController=options.controller;if(!panController){if(makeSvgController.canAttach(domElement)){panController=makeSvgController(domElement,options)}else if(makeDomController.canAttach(domElement)){panController=makeDomController(domElement,options)}}if(!panController){throw new Error("Cannot create panzoom for the current type of dom element")}var owner=panController.getOwner();var storedCTMResult={x:0,y:0};var isDirty=false;var transform=new Transform;if(panController.initTransform){panController.initTransform(transform)}var filterKey=typeof options.filterKey==="function"?options.filterKey:noop;var pinchSpeed=typeof options.pinchSpeed==="number"?options.pinchSpeed:1;var bounds=options.bounds;var maxZoom=typeof options.maxZoom==="number"?options.maxZoom:Number.POSITIVE_INFINITY;var minZoom=typeof options.minZoom==="number"?options.minZoom:0;var boundsPadding=typeof options.boundsPadding==="number"?options.boundsPadding:.05;var zoomDoubleClickSpeed=typeof options.zoomDoubleClickSpeed==="number"?options.zoomDoubleClickSpeed:defaultDoubleTapZoomSpeed;var beforeWheel=options.beforeWheel||noop;var beforeMouseDown=options.beforeMouseDown||noop;var speed=typeof options.zoomSpeed==="number"?options.zoomSpeed:defaultZoomSpeed;var transformOrigin=parseTransformOrigin(options.transformOrigin);var textSelection=options.enableTextSelection?fakeTextSelectorInterceptor:domTextSelectionInterceptor;validateBounds(bounds);if(options.autocenter){autocenter()}var frameAnimation;var lastTouchEndTime=0;var lastTouchStartTime=0;var pendingClickEventTimeout=0;var lastMouseDownedEvent=null;var lastMouseDownTime=new Date;var lastSingleFingerOffset;var touchInProgress=false;var panstartFired=false;var mouseX;var mouseY;var clickX;var clickY;var pinchZoomLength;var smoothScroll;if("smoothScroll"in options&&!options.smoothScroll){smoothScroll=rigidScroll()}else{smoothScroll=kinetic(getPoint,scroll,options.smoothScroll)}var moveByAnimation;var zoomToAnimation;var multiTouch;var paused=false;listenForEvents();var api={dispose:dispose,moveBy:internalMoveBy,moveTo:moveTo,smoothMoveTo:smoothMoveTo,centerOn:centerOn,zoomTo:publicZoomTo,zoomAbs:zoomAbs,smoothZoom:smoothZoom,smoothZoomAbs:smoothZoomAbs,showRectangle:showRectangle,pause:pause,resume:resume,isPaused:isPaused,getTransform:getTransformModel,getMinZoom:getMinZoom,setMinZoom:setMinZoom,getMaxZoom:getMaxZoom,setMaxZoom:setMaxZoom,getTransformOrigin:getTransformOrigin,setTransformOrigin:setTransformOrigin,getZoomSpeed:getZoomSpeed,setZoomSpeed:setZoomSpeed};eventify(api);var initialX=typeof options.initialX==="number"?options.initialX:transform.x;var initialY=typeof options.initialY==="number"?options.initialY:transform.y;var initialZoom=typeof options.initialZoom==="number"?options.initialZoom:transform.scale;if(initialX!=transform.x||initialY!=transform.y||initialZoom!=transform.scale){zoomAbs(initialX,initialY,initialZoom)}return api;function pause(){releaseEvents();paused=true}function resume(){if(paused){listenForEvents();paused=false}}function isPaused(){return paused}function showRectangle(rect){var clientRect=owner.getBoundingClientRect();var size=transformToScreen(clientRect.width,clientRect.height);var rectWidth=rect.right-rect.left;var rectHeight=rect.bottom-rect.top;if(!Number.isFinite(rectWidth)||!Number.isFinite(rectHeight)){throw new Error("Invalid rectangle")}var dw=size.x/rectWidth;var dh=size.y/rectHeight;var scale=Math.min(dw,dh);transform.x=-(rect.left+rectWidth/2)*scale+size.x/2;transform.y=-(rect.top+rectHeight/2)*scale+size.y/2;transform.scale=scale}function transformToScreen(x,y){if(panController.getScreenCTM){var parentCTM=panController.getScreenCTM();var parentScaleX=parentCTM.a;var parentScaleY=parentCTM.d;var parentOffsetX=parentCTM.e;var parentOffsetY=parentCTM.f;storedCTMResult.x=x*parentScaleX-parentOffsetX;storedCTMResult.y=y*parentScaleY-parentOffsetY}else{storedCTMResult.x=x;storedCTMResult.y=y}return storedCTMResult}function autocenter(){var w;var h;var left=0;var top=0;var sceneBoundingBox=getBoundingBox();if(sceneBoundingBox){left=sceneBoundingBox.left;top=sceneBoundingBox.top;w=sceneBoundingBox.right-sceneBoundingBox.left;h=sceneBoundingBox.bottom-sceneBoundingBox.top}else{var ownerRect=owner.getBoundingClientRect();w=ownerRect.width;h=ownerRect.height}var bbox=panController.getBBox();if(bbox.width===0||bbox.height===0){return}var dh=h/bbox.height;var dw=w/bbox.width;var scale=Math.min(dw,dh);transform.x=-(bbox.left+bbox.width/2)*scale+w/2+left;transform.y=-(bbox.top+bbox.height/2)*scale+h/2+top;transform.scale=scale}function getTransformModel(){return transform}function getMinZoom(){return minZoom}function setMinZoom(newMinZoom){minZoom=newMinZoom}function getMaxZoom(){return maxZoom}function setMaxZoom(newMaxZoom){maxZoom=newMaxZoom}function getTransformOrigin(){return transformOrigin}function setTransformOrigin(newTransformOrigin){transformOrigin=parseTransformOrigin(newTransformOrigin)}function getZoomSpeed(){return speed}function setZoomSpeed(newSpeed){if(!Number.isFinite(newSpeed)){throw new Error("Zoom speed should be a number")}speed=newSpeed}function getPoint(){return{x:transform.x,y:transform.y}}function moveTo(x,y){transform.x=x;transform.y=y;keepTransformInsideBounds();triggerEvent("pan");makeDirty()}function moveBy(dx,dy){moveTo(transform.x+dx,transform.y+dy)}function keepTransformInsideBounds(){var boundingBox=getBoundingBox();if(!boundingBox)return;var adjusted=false;var clientRect=getClientRect();var diff=boundingBox.left-clientRect.right;if(diff>0){transform.x+=diff;adjusted=true}diff=boundingBox.right-clientRect.left;if(diff<0){transform.x+=diff;adjusted=true}diff=boundingBox.top-clientRect.bottom;if(diff>0){transform.y+=diff;adjusted=true}diff=boundingBox.bottom-clientRect.top;if(diff<0){transform.y+=diff;adjusted=true}return adjusted}function getBoundingBox(){if(!bounds)return;if(typeof bounds==="boolean"){var ownerRect=owner.getBoundingClientRect();var sceneWidth=ownerRect.width;var sceneHeight=ownerRect.height;return{left:sceneWidth*boundsPadding,top:sceneHeight*boundsPadding,right:sceneWidth*(1-boundsPadding),bottom:sceneHeight*(1-boundsPadding)}}return bounds}function getClientRect(){var bbox=panController.getBBox();var leftTop=client(bbox.left,bbox.top);return{left:leftTop.x,top:leftTop.y,right:bbox.width*transform.scale+leftTop.x,bottom:bbox.height*transform.scale+leftTop.y}}function client(x,y){return{x:x*transform.scale+transform.x,y:y*transform.scale+transform.y}}function makeDirty(){isDirty=true;frameAnimation=window.requestAnimationFrame(frame)}function zoomByRatio(clientX,clientY,ratio){if(isNaN(clientX)||isNaN(clientY)||isNaN(ratio)){throw new Error("zoom requires valid numbers")}var newScale=transform.scale*ratio;if(newScale<minZoom){if(transform.scale===minZoom)return;ratio=minZoom/transform.scale}if(newScale>maxZoom){if(transform.scale===maxZoom)return;ratio=maxZoom/transform.scale}var size=transformToScreen(clientX,clientY);transform.x=size.x-ratio*(size.x-transform.x);transform.y=size.y-ratio*(size.y-transform.y);if(bounds&&boundsPadding===1&&minZoom===1){transform.scale*=ratio;keepTransformInsideBounds()}else{var transformAdjusted=keepTransformInsideBounds();if(!transformAdjusted)transform.scale*=ratio}triggerEvent("zoom");makeDirty()}function zoomAbs(clientX,clientY,zoomLevel){var ratio=zoomLevel/transform.scale;zoomByRatio(clientX,clientY,ratio)}function centerOn(ui){var parent=ui.ownerSVGElement;if(!parent)throw new Error("ui element is required to be within the scene");var clientRect=ui.getBoundingClientRect();var cx=clientRect.left+clientRect.width/2;var cy=clientRect.top+clientRect.height/2;var container=parent.getBoundingClientRect();var dx=container.width/2-cx;var dy=container.height/2-cy;internalMoveBy(dx,dy,true)}function smoothMoveTo(x,y){internalMoveBy(x-transform.x,y-transform.y,true)}function internalMoveBy(dx,dy,smooth){if(!smooth){return moveBy(dx,dy)}if(moveByAnimation)moveByAnimation.cancel();var from={x:0,y:0};var to={x:dx,y:dy};var lastX=0;var lastY=0;moveByAnimation=animate(from,to,{step:function(v){moveBy(v.x-lastX,v.y-lastY);lastX=v.x;lastY=v.y}})}function scroll(x,y){cancelZoomAnimation();moveTo(x,y)}function dispose(){releaseEvents()}function listenForEvents(){owner.addEventListener("mousedown",onMouseDown,{passive:false});owner.addEventListener("dblclick",onDoubleClick,{passive:false});owner.addEventListener("touchstart",onTouch,{passive:false});owner.addEventListener("keydown",onKeyDown,{passive:false});wheel.addWheelListener(owner,onMouseWheel,{passive:false});makeDirty()}function releaseEvents(){wheel.removeWheelListener(owner,onMouseWheel);owner.removeEventListener("mousedown",onMouseDown);owner.removeEventListener("keydown",onKeyDown);owner.removeEventListener("dblclick",onDoubleClick);owner.removeEventListener("touchstart",onTouch);if(frameAnimation){window.cancelAnimationFrame(frameAnimation);frameAnimation=0}smoothScroll.cancel();releaseDocumentMouse();releaseTouches();textSelection.release();triggerPanEnd()}function frame(){if(isDirty)applyTransform()}function applyTransform(){isDirty=false;panController.applyTransform(transform);triggerEvent("transform");frameAnimation=0}function onKeyDown(e){var x=0,y=0,z=0;if(e.keyCode===38){y=1}else if(e.keyCode===40){y=-1}else if(e.keyCode===37){x=1}else if(e.keyCode===39){x=-1}else if(e.keyCode===189||e.keyCode===109){z=1}else if(e.keyCode===187||e.keyCode===107){z=-1}if(filterKey(e,x,y,z)){return}if(x||y){e.preventDefault();e.stopPropagation();var clientRect=owner.getBoundingClientRect();var offset=Math.min(clientRect.width,clientRect.height);var moveSpeedRatio=.05;var dx=offset*moveSpeedRatio*x;var dy=offset*moveSpeedRatio*y;internalMoveBy(dx,dy)}if(z){var scaleMultiplier=getScaleMultiplier(z*100);var offset=transformOrigin?getTransformOriginOffset():midPoint();publicZoomTo(offset.x,offset.y,scaleMultiplier)}}function midPoint(){var ownerRect=owner.getBoundingClientRect();return{x:ownerRect.width/2,y:ownerRect.height/2}}function onTouch(e){beforeTouch(e);clearPendingClickEventTimeout();if(e.touches.length===1){return handleSingleFingerTouch(e,e.touches[0])}else if(e.touches.length===2){pinchZoomLength=getPinchZoomLength(e.touches[0],e.touches[1]);multiTouch=true;startTouchListenerIfNeeded()}}function beforeTouch(e){if(options.onTouch&&!options.onTouch(e)){return}e.stopPropagation();e.preventDefault()}function beforeDoubleClick(e){clearPendingClickEventTimeout();if(options.onDoubleClick&&!options.onDoubleClick(e)){return}e.preventDefault();e.stopPropagation()}function handleSingleFingerTouch(e){lastTouchStartTime=new Date;var touch=e.touches[0];var offset=getOffsetXY(touch);lastSingleFingerOffset=offset;var point=transformToScreen(offset.x,offset.y);mouseX=point.x;mouseY=point.y;clickX=mouseX;clickY=mouseY;smoothScroll.cancel();startTouchListenerIfNeeded()}function startTouchListenerIfNeeded(){if(touchInProgress){return}touchInProgress=true;document.addEventListener("touchmove",handleTouchMove);document.addEventListener("touchend",handleTouchEnd);document.addEventListener("touchcancel",handleTouchEnd)}function handleTouchMove(e){if(e.touches.length===1){e.stopPropagation();var touch=e.touches[0];var offset=getOffsetXY(touch);var point=transformToScreen(offset.x,offset.y);var dx=point.x-mouseX;var dy=point.y-mouseY;if(dx!==0&&dy!==0){triggerPanStart()}mouseX=point.x;mouseY=point.y;internalMoveBy(dx,dy)}else if(e.touches.length===2){multiTouch=true;var t1=e.touches[0];var t2=e.touches[1];var currentPinchLength=getPinchZoomLength(t1,t2);var scaleMultiplier=1+(currentPinchLength/pinchZoomLength-1)*pinchSpeed;var firstTouchPoint=getOffsetXY(t1);var secondTouchPoint=getOffsetXY(t2);mouseX=(firstTouchPoint.x+secondTouchPoint.x)/2;mouseY=(firstTouchPoint.y+secondTouchPoint.y)/2;if(transformOrigin){var offset=getTransformOriginOffset();mouseX=offset.x;mouseY=offset.y}publicZoomTo(mouseX,mouseY,scaleMultiplier);pinchZoomLength=currentPinchLength;e.stopPropagation();e.preventDefault()}}function clearPendingClickEventTimeout(){if(pendingClickEventTimeout){clearTimeout(pendingClickEventTimeout);pendingClickEventTimeout=0}}function handlePotentialClickEvent(e){if(!options.onClick)return;clearPendingClickEventTimeout();var dx=mouseX-clickX;var dy=mouseY-clickY;var l=Math.sqrt(dx*dx+dy*dy);if(l>5)return;pendingClickEventTimeout=setTimeout(function(){pendingClickEventTimeout=0;options.onClick(e)},doubleTapSpeedInMS)}function handleTouchEnd(e){clearPendingClickEventTimeout();if(e.touches.length>0){var offset=getOffsetXY(e.touches[0]);var point=transformToScreen(offset.x,offset.y);mouseX=point.x;mouseY=point.y}else{var now=new Date;if(now-lastTouchEndTime<doubleTapSpeedInMS){if(transformOrigin){var offset=getTransformOriginOffset();smoothZoom(offset.x,offset.y,zoomDoubleClickSpeed)}else{smoothZoom(lastSingleFingerOffset.x,lastSingleFingerOffset.y,zoomDoubleClickSpeed)}}else if(now-lastTouchStartTime<clickEventTimeInMS){handlePotentialClickEvent(e)}lastTouchEndTime=now;triggerPanEnd();releaseTouches()}}function getPinchZoomLength(finger1,finger2){var dx=finger1.clientX-finger2.clientX;var dy=finger1.clientY-finger2.clientY;return Math.sqrt(dx*dx+dy*dy)}function onDoubleClick(e){beforeDoubleClick(e);var offset=getOffsetXY(e);if(transformOrigin){offset=getTransformOriginOffset()}smoothZoom(offset.x,offset.y,zoomDoubleClickSpeed)}function onMouseDown(e){clearPendingClickEventTimeout();if(beforeMouseDown(e))return;lastMouseDownedEvent=e;lastMouseDownTime=new Date;if(touchInProgress){e.stopPropagation();return false}var isLeftButton=e.button===1&&window.event!==null||e.button===0;if(!isLeftButton)return;smoothScroll.cancel();var offset=getOffsetXY(e);var point=transformToScreen(offset.x,offset.y);clickX=mouseX=point.x;clickY=mouseY=point.y;document.addEventListener("mousemove",onMouseMove);document.addEventListener("mouseup",onMouseUp);textSelection.capture(e.target||e.srcElement);return false}function onMouseMove(e){if(touchInProgress)return;triggerPanStart();var offset=getOffsetXY(e);var point=transformToScreen(offset.x,offset.y);var dx=point.x-mouseX;var dy=point.y-mouseY;mouseX=point.x;mouseY=point.y;internalMoveBy(dx,dy)}function onMouseUp(){var now=new Date;if(now-lastMouseDownTime<clickEventTimeInMS)handlePotentialClickEvent(lastMouseDownedEvent);textSelection.release();triggerPanEnd();releaseDocumentMouse()}function releaseDocumentMouse(){document.removeEventListener("mousemove",onMouseMove);document.removeEventListener("mouseup",onMouseUp);panstartFired=false}function releaseTouches(){document.removeEventListener("touchmove",handleTouchMove);document.removeEventListener("touchend",handleTouchEnd);document.removeEventListener("touchcancel",handleTouchEnd);panstartFired=false;multiTouch=false;touchInProgress=false}function onMouseWheel(e){if(beforeWheel(e))return;smoothScroll.cancel();var delta=e.deltaY;if(e.deltaMode>0)delta*=100;var scaleMultiplier=getScaleMultiplier(delta);if(scaleMultiplier!==1){var offset=transformOrigin?getTransformOriginOffset():getOffsetXY(e);publicZoomTo(offset.x,offset.y,scaleMultiplier);e.preventDefault()}}function getOffsetXY(e){var offsetX,offsetY;var ownerRect=owner.getBoundingClientRect();offsetX=e.clientX-ownerRect.left;offsetY=e.clientY-ownerRect.top;return{x:offsetX,y:offsetY}}function smoothZoom(clientX,clientY,scaleMultiplier){var fromValue=transform.scale;var from={scale:fromValue};var to={scale:scaleMultiplier*fromValue};smoothScroll.cancel();cancelZoomAnimation();zoomToAnimation=animate(from,to,{step:function(v){zoomAbs(clientX,clientY,v.scale)},done:triggerZoomEnd})}function smoothZoomAbs(clientX,clientY,toScaleValue){var fromValue=transform.scale;var from={scale:fromValue};var to={scale:toScaleValue};smoothScroll.cancel();cancelZoomAnimation();zoomToAnimation=animate(from,to,{step:function(v){zoomAbs(clientX,clientY,v.scale)},done:triggerZoomEnd})}function getTransformOriginOffset(){var ownerRect=owner.getBoundingClientRect();return{x:ownerRect.width*transformOrigin.x,y:ownerRect.height*transformOrigin.y}}function publicZoomTo(clientX,clientY,scaleMultiplier){smoothScroll.cancel();cancelZoomAnimation();return zoomByRatio(clientX,clientY,scaleMultiplier)}function cancelZoomAnimation(){if(zoomToAnimation){zoomToAnimation.cancel();zoomToAnimation=null}}function getScaleMultiplier(delta){var sign=Math.sign(delta);var deltaAdjustedSpeed=Math.min(.25,Math.abs(speed*delta/128));return 1-sign*deltaAdjustedSpeed}function triggerPanStart(){if(!panstartFired){triggerEvent("panstart");panstartFired=true;smoothScroll.start()}}function triggerPanEnd(){if(panstartFired){if(!multiTouch)smoothScroll.stop();triggerEvent("panend")}}function triggerZoomEnd(){triggerEvent("zoomend")}function triggerEvent(name){api.fire(name,api)}}function parseTransformOrigin(options){if(!options)return;if(typeof options==="object"){if(!isNumber(options.x)||!isNumber(options.y))failTransformOrigin(options);return options}failTransformOrigin()}function failTransformOrigin(options){console.error(options);throw new Error(["Cannot parse transform origin.","Some good examples:",'  "center center" can be achieved with {x: 0.5, y: 0.5}','  "top center" can be achieved with {x: 0.5, y: 0}','  "bottom right" can be achieved with {x: 1, y: 1}'].join("\n"))}function noop(){}function validateBounds(bounds){var boundsType=typeof bounds;if(boundsType==="undefined"||boundsType==="boolean")return;var validBounds=isNumber(bounds.left)&&isNumber(bounds.top)&&isNumber(bounds.bottom)&&isNumber(bounds.right);if(!validBounds)throw new Error("Bounds object is not valid. It can be: "+"undefined, boolean (true|false) or an object {left, top, right, bottom}")}function isNumber(x){return Number.isFinite(x)}function isNaN(value){if(Number.isNaN){return Number.isNaN(value)}return value!==value}function rigidScroll(){return{start:noop,stop:noop,cancel:noop}}function autoRun(){if(typeof document==="undefined")return;var scripts=document.getElementsByTagName("script");if(!scripts)return;var panzoomScript;for(var i=0;i<scripts.length;++i){var x=scripts[i];if(x.src&&x.src.match(/\bpanzoom(\.min)?\.js/)){panzoomScript=x;break}}if(!panzoomScript)return;var query=panzoomScript.getAttribute("query");if(!query)return;var globalName=panzoomScript.getAttribute("name")||"pz";var started=Date.now();tryAttach();function tryAttach(){var el=document.querySelector(query);if(!el){var now=Date.now();var elapsed=now-started;if(elapsed<2e3){setTimeout(tryAttach,100);return}console.error("Cannot find the panzoom element",globalName);return}var options=collectOptions(panzoomScript);console.log(options);window[globalName]=createPanZoom(el,options)}function collectOptions(script){var attrs=script.attributes;var options={};for(var j=0;j<attrs.length;++j){var attr=attrs[j];var nameValue=getPanzoomAttributeNameValue(attr);if(nameValue){options[nameValue.name]=nameValue.value}}return options}function getPanzoomAttributeNameValue(attr){if(!attr.name)return;var isPanZoomAttribute=attr.name[0]==="p"&&attr.name[1]==="z"&&attr.name[2]==="-";if(!isPanZoomAttribute)return;var name=attr.name.substr(3);var value=JSON.parse(attr.value);return{name:name,value:value}}}autoRun()},{"./lib/kinetic.js":2,"./lib/makeDomController.js":3,"./lib/makeSvgController.js":4,"./lib/makeTextSelectionInterceptor.js":5,"./lib/transform.js":6,amator:7,"ngraph.events":9,wheel:10}],2:[function(require,module,exports){module.exports=kinetic;function kinetic(getPoint,scroll,settings){if(typeof settings!=="object"){settings={}}var minVelocity=typeof settings.minVelocity==="number"?settings.minVelocity:5;var amplitude=typeof settings.amplitude==="number"?settings.amplitude:.25;var cancelAnimationFrame=typeof settings.cancelAnimationFrame==="function"?settings.cancelAnimationFrame:getCancelAnimationFrame();var requestAnimationFrame=typeof settings.requestAnimationFrame==="function"?settings.requestAnimationFrame:getRequestAnimationFrame();var lastPoint;var timestamp;var timeConstant=342;var ticker;var vx,targetX,ax;var vy,targetY,ay;var raf;return{start:start,stop:stop,cancel:dispose};function dispose(){cancelAnimationFrame(ticker);cancelAnimationFrame(raf)}function start(){lastPoint=getPoint();ax=ay=vx=vy=0;timestamp=new Date;cancelAnimationFrame(ticker);cancelAnimationFrame(raf);ticker=requestAnimationFrame(track)}function track(){var now=Date.now();var elapsed=now-timestamp;timestamp=now;var currentPoint=getPoint();var dx=currentPoint.x-lastPoint.x;var dy=currentPoint.y-lastPoint.y;lastPoint=currentPoint;var dt=1e3/(1+elapsed);vx=.8*dx*dt+.2*vx;vy=.8*dy*dt+.2*vy;ticker=requestAnimationFrame(track)}function stop(){cancelAnimationFrame(ticker);cancelAnimationFrame(raf);var currentPoint=getPoint();targetX=currentPoint.x;targetY=currentPoint.y;timestamp=Date.now();if(vx<-minVelocity||vx>minVelocity){ax=amplitude*vx;targetX+=ax}if(vy<-minVelocity||vy>minVelocity){ay=amplitude*vy;targetY+=ay}raf=requestAnimationFrame(autoScroll)}function autoScroll(){var elapsed=Date.now()-timestamp;var moving=false;var dx=0;var dy=0;if(ax){dx=-ax*Math.exp(-elapsed/timeConstant);if(dx>.5||dx<-.5)moving=true;else dx=ax=0}if(ay){dy=-ay*Math.exp(-elapsed/timeConstant);if(dy>.5||dy<-.5)moving=true;else dy=ay=0}if(moving){scroll(targetX+dx,targetY+dy);raf=requestAnimationFrame(autoScroll)}}}function getCancelAnimationFrame(){if(typeof cancelAnimationFrame==="function")return cancelAnimationFrame;return clearTimeout}function getRequestAnimationFrame(){if(typeof requestAnimationFrame==="function")return requestAnimationFrame;return function(handler){return setTimeout(handler,16)}}},{}],3:[function(require,module,exports){module.exports=makeDomController;module.exports.canAttach=isDomElement;function makeDomController(domElement,options){var elementValid=isDomElement(domElement);if(!elementValid){throw new Error("panzoom requires DOM element to be attached to the DOM tree")}var owner=domElement.parentElement;domElement.scrollTop=0;if(!options.disableKeyboardInteraction){owner.setAttribute("tabindex",0)}var api={getBBox:getBBox,getOwner:getOwner,applyTransform:applyTransform};return api;function getOwner(){return owner}function getBBox(){return{left:0,top:0,width:domElement.clientWidth,height:domElement.clientHeight}}function applyTransform(transform){domElement.style.transformOrigin="0 0 0";domElement.style.transform="matrix("+transform.scale+", 0, 0, "+transform.scale+", "+transform.x+", "+transform.y+")"}}function isDomElement(element){return element&&element.parentElement&&element.style}},{}],4:[function(require,module,exports){module.exports=makeSvgController;module.exports.canAttach=isSVGElement;function makeSvgController(svgElement,options){if(!isSVGElement(svgElement)){throw new Error("svg element is required for svg.panzoom to work")}var owner=svgElement.ownerSVGElement;if(!owner){throw new Error("Do not apply panzoom to the root <svg> element. "+"Use its child instead (e.g. <g></g>). "+"As of March 2016 only FireFox supported transform on the root element")}if(!options.disableKeyboardInteraction){owner.setAttribute("tabindex",0)}var api={getBBox:getBBox,getScreenCTM:getScreenCTM,getOwner:getOwner,applyTransform:applyTransform,initTransform:initTransform};return api;function getOwner(){return owner}function getBBox(){var boundingBox=svgElement.getBBox();return{left:boundingBox.x,top:boundingBox.y,width:boundingBox.width,height:boundingBox.height}}function getScreenCTM(){var ctm=owner.getCTM();if(!ctm){return owner.getScreenCTM()}return ctm}function initTransform(transform){var screenCTM=svgElement.getCTM();if(screenCTM===null){screenCTM=document.createElementNS("http://www.w3.org/2000/svg","svg").createSVGMatrix()}transform.x=screenCTM.e;transform.y=screenCTM.f;transform.scale=screenCTM.a;owner.removeAttributeNS(null,"viewBox")}function applyTransform(transform){svgElement.setAttribute("transform","matrix("+transform.scale+" 0 0 "+transform.scale+" "+transform.x+" "+transform.y+")")}}function isSVGElement(element){return element&&element.ownerSVGElement&&element.getCTM}},{}],5:[function(require,module,exports){module.exports=makeTextSelectionInterceptor;function makeTextSelectionInterceptor(useFake){if(useFake){return{capture:noop,release:noop}}var dragObject;var prevSelectStart;var prevDragStart;var wasCaptured=false;return{capture:capture,release:release};function capture(domObject){wasCaptured=true;prevSelectStart=window.document.onselectstart;prevDragStart=window.document.ondragstart;window.document.onselectstart=disabled;dragObject=domObject;dragObject.ondragstart=disabled}function release(){if(!wasCaptured)return;wasCaptured=false;window.document.onselectstart=prevSelectStart;if(dragObject)dragObject.ondragstart=prevDragStart}}function disabled(e){e.stopPropagation();return false}function noop(){}},{}],6:[function(require,module,exports){module.exports=Transform;function Transform(){this.x=0;this.y=0;this.scale=1}},{}],7:[function(require,module,exports){var BezierEasing=require("bezier-easing");var animations={ease:BezierEasing(.25,.1,.25,1),easeIn:BezierEasing(.42,0,1,1),easeOut:BezierEasing(0,0,.58,1),easeInOut:BezierEasing(.42,0,.58,1),linear:BezierEasing(0,0,1,1)};module.exports=animate;module.exports.makeAggregateRaf=makeAggregateRaf;module.exports.sharedScheduler=makeAggregateRaf();function animate(source,target,options){var start=Object.create(null);var diff=Object.create(null);options=options||{};var easing=typeof options.easing==="function"?options.easing:animations[options.easing];if(!easing){if(options.easing){console.warn("Unknown easing function in amator: "+options.easing)}easing=animations.ease}var step=typeof options.step==="function"?options.step:noop;var done=typeof options.done==="function"?options.done:noop;var scheduler=getScheduler(options.scheduler);var keys=Object.keys(target);keys.forEach(function(key){start[key]=source[key];diff[key]=target[key]-source[key]});var durationInMs=typeof options.duration==="number"?options.duration:400;var durationInFrames=Math.max(1,durationInMs*.06);var previousAnimationId;var frame=0;previousAnimationId=scheduler.next(loop);return{cancel:cancel};function cancel(){scheduler.cancel(previousAnimationId);previousAnimationId=0}function loop(){var t=easing(frame/durationInFrames);frame+=1;setValues(t);if(frame<=durationInFrames){previousAnimationId=scheduler.next(loop);step(source)}else{previousAnimationId=0;setTimeout(function(){done(source)},0)}}function setValues(t){keys.forEach(function(key){source[key]=diff[key]*t+start[key]})}}function noop(){}function getScheduler(scheduler){if(!scheduler){var canRaf=typeof window!=="undefined"&&window.requestAnimationFrame;return canRaf?rafScheduler():timeoutScheduler()}if(typeof scheduler.next!=="function")throw new Error("Scheduler is supposed to have next(cb) function");if(typeof scheduler.cancel!=="function")throw new Error("Scheduler is supposed to have cancel(handle) function");return scheduler}function rafScheduler(){return{next:window.requestAnimationFrame.bind(window),cancel:window.cancelAnimationFrame.bind(window)}}function timeoutScheduler(){return{next:function(cb){return setTimeout(cb,1e3/60)},cancel:function(id){return clearTimeout(id)}}}function makeAggregateRaf(){var frontBuffer=new Set;var backBuffer=new Set;var frameToken=0;return{next:next,cancel:next,clearAll:clearAll};function clearAll(){frontBuffer.clear();backBuffer.clear();cancelAnimationFrame(frameToken);frameToken=0}function next(callback){backBuffer.add(callback);renderNextFrame()}function renderNextFrame(){if(!frameToken)frameToken=requestAnimationFrame(renderFrame)}function renderFrame(){frameToken=0;var t=backBuffer;backBuffer=frontBuffer;frontBuffer=t;frontBuffer.forEach(function(callback){callback()});frontBuffer.clear()}function cancel(callback){backBuffer.delete(callback)}}},{"bezier-easing":8}],8:[function(require,module,exports){var NEWTON_ITERATIONS=4;var NEWTON_MIN_SLOPE=.001;var SUBDIVISION_PRECISION=1e-7;var SUBDIVISION_MAX_ITERATIONS=10;var kSplineTableSize=11;var kSampleStepSize=1/(kSplineTableSize-1);var float32ArraySupported=typeof Float32Array==="function";function A(aA1,aA2){return 1-3*aA2+3*aA1}function B(aA1,aA2){return 3*aA2-6*aA1}function C(aA1){return 3*aA1}function calcBezier(aT,aA1,aA2){return((A(aA1,aA2)*aT+B(aA1,aA2))*aT+C(aA1))*aT}function getSlope(aT,aA1,aA2){return 3*A(aA1,aA2)*aT*aT+2*B(aA1,aA2)*aT+C(aA1)}function binarySubdivide(aX,aA,aB,mX1,mX2){var currentX,currentT,i=0;do{currentT=aA+(aB-aA)/2;currentX=calcBezier(currentT,mX1,mX2)-aX;if(currentX>0){aB=currentT}else{aA=currentT}}while(Math.abs(currentX)>SUBDIVISION_PRECISION&&++i<SUBDIVISION_MAX_ITERATIONS);return currentT}function newtonRaphsonIterate(aX,aGuessT,mX1,mX2){for(var i=0;i<NEWTON_ITERATIONS;++i){var currentSlope=getSlope(aGuessT,mX1,mX2);if(currentSlope===0){return aGuessT}var currentX=calcBezier(aGuessT,mX1,mX2)-aX;aGuessT-=currentX/currentSlope}return aGuessT}function LinearEasing(x){return x}module.exports=function bezier(mX1,mY1,mX2,mY2){if(!(0<=mX1&&mX1<=1&&0<=mX2&&mX2<=1)){throw new Error("bezier x values must be in [0, 1] range")}if(mX1===mY1&&mX2===mY2){return LinearEasing}var sampleValues=float32ArraySupported?new Float32Array(kSplineTableSize):new Array(kSplineTableSize);for(var i=0;i<kSplineTableSize;++i){sampleValues[i]=calcBezier(i*kSampleStepSize,mX1,mX2)}function getTForX(aX){var intervalStart=0;var currentSample=1;var lastSample=kSplineTableSize-1;for(;currentSample!==lastSample&&sampleValues[currentSample]<=aX;++currentSample){intervalStart+=kSampleStepSize}--currentSample;var dist=(aX-sampleValues[currentSample])/(sampleValues[currentSample+1]-sampleValues[currentSample]);var guessForT=intervalStart+dist*kSampleStepSize;var initialSlope=getSlope(guessForT,mX1,mX2);if(initialSlope>=NEWTON_MIN_SLOPE){return newtonRaphsonIterate(aX,guessForT,mX1,mX2)}else if(initialSlope===0){return guessForT}else{return binarySubdivide(aX,intervalStart,intervalStart+kSampleStepSize,mX1,mX2)}}return function BezierEasing(x){if(x===0){return 0}if(x===1){return 1}return calcBezier(getTForX(x),mY1,mY2)}}},{}],9:[function(require,module,exports){module.exports=function eventify(subject){validateSubject(subject);var eventsStorage=createEventsStorage(subject);subject.on=eventsStorage.on;subject.off=eventsStorage.off;subject.fire=eventsStorage.fire;return subject};function createEventsStorage(subject){var registeredEvents=Object.create(null);return{on:function(eventName,callback,ctx){if(typeof callback!=="function"){throw new Error("callback is expected to be a function")}var handlers=registeredEvents[eventName];if(!handlers){handlers=registeredEvents[eventName]=[]}handlers.push({callback:callback,ctx:ctx});return subject},off:function(eventName,callback){var wantToRemoveAll=typeof eventName==="undefined";if(wantToRemoveAll){registeredEvents=Object.create(null);return subject}if(registeredEvents[eventName]){var deleteAllCallbacksForEvent=typeof callback!=="function";if(deleteAllCallbacksForEvent){delete registeredEvents[eventName]}else{var callbacks=registeredEvents[eventName];for(var i=0;i<callbacks.length;++i){if(callbacks[i].callback===callback){callbacks.splice(i,1)}}}}return subject},fire:function(eventName){var callbacks=registeredEvents[eventName];if(!callbacks){return subject}var fireArguments;if(arguments.length>1){fireArguments=Array.prototype.splice.call(arguments,1)}for(var i=0;i<callbacks.length;++i){var callbackInfo=callbacks[i];callbackInfo.callback.apply(callbackInfo.ctx,fireArguments)}return subject}}}function validateSubject(subject){if(!subject){throw new Error("Eventify cannot use falsy object as events subject")}var reservedWords=["on","fire","off"];for(var i=0;i<reservedWords.length;++i){if(subject.hasOwnProperty(reservedWords[i])){throw new Error("Subject cannot be eventified, since it already has property '"+reservedWords[i]+"'")}}}},{}],10:[function(require,module,exports){module.exports=addWheelListener;module.exports.addWheelListener=addWheelListener;module.exports.removeWheelListener=removeWheelListener;function addWheelListener(element,listener,useCapture){element.addEventListener("wheel",listener,useCapture)}function removeWheelListener(element,listener,useCapture){element.removeEventListener("wheel",listener,useCapture)}},{}]},{},[1])(1)});

  const PynMapSDKMethods = {
    // ----------------------------------------------------
    // INIT
    // ----------------------------------------------------
    init(cfg) {
      if (this._initialized) return;
      this._initialized = true;

      // 1) Base config first — do NOT store the apiKey on this.config
      this.config = {
        container:        cfg.container,
        propertyId:       cfg.propertyId,
        environment:      cfg.environment || "production",
        showZoomControls: cfg.showZoomControls !== false,
        floor:            cfg.defaultFloor != null ? String(cfg.defaultFloor) : null,
        onUnitHover:      typeof cfg.onUnitHover      === "function" ? cfg.onUnitHover      : null,
        offUnitHover: typeof cfg.offUnitHover === "function" ? cfg.offUnitHover : null,
        onUnitClick:      typeof cfg.onUnitClick      === "function" ? cfg.onUnitClick      : null,
        onReady:          typeof cfg.onReady      === "function" ? cfg.onReady      : null
      };

      // 2) Store styles from config only
      const cfgStyles = cfg.styles || {};
      this.config.styles = {
        ...cfgStyles,
        unitColors: { ...(cfgStyles.unitColors || {}) },
        unitLabels:  { ...(cfgStyles.unitLabels  || {}) }
      };

      this.container = document.querySelector(cfg.container);
      if (!this.container) {
        console.error("PynMapSDK: Container not found:", cfg.container);
        return;
      }

      this._showLoading("Verifying partner...");

      if (!cfg.apiKey)     return this._showError("API Key is required.");
      if (!cfg.propertyId) return this._showError("propertyId is required.");

      // Pull the API key into a local variable only — it will NOT be
      // stored anywhere on the SDK object after _verifyPartner returns.
      const apiKey     = cfg.apiKey;
      const propertyId = cfg.propertyId;

      // VERIFY (one-time X-API-Key) → get session token → FETCH CONFIG → LOAD SVGs → BOOT
      this._verifyPartner(apiKey, propertyId)
        .then(v => {
          if (!v.success) return this._showError(v.error);

          // Store the short-lived token; the raw API key is now out of scope.
          this._sessionToken = v.sessionToken;

          this._showLoading("Loading property map...");
          return this._fetchConfig();
        })
        .then(r => {
          if (!r?.success) return this._showError(r?.error || "Config load error");
          this._storeConfig(r.data);
          this._showLoading("Loading SVG maps...");
          return this._loadActiveSVG();
        })
        .then(() => {
          if (!this._hasAnyMap()) return this._showError("No maps found.");

          if (!this._mapExists(this.activeMapId)) {
            this.activeMapId = this._getDefaultMapId();
          }

          return this._loadPanZoom()
            .then(() => this._bootAfterSVGLoad())
            .catch(() => this._bootAfterSVGLoad());
        })
        .catch(() => this._showError("Unexpected SDK error."));
    },

    // ----------------------------------------------------
    // BOOT AFTER SVG LOAD
    // ----------------------------------------------------
    _bootAfterSVGLoad() {
      this._renderMaps();

      // Bind events early (always!)
      this._bindUnitEvents();

      // If floor given → switch to that floor's map (no fill — highlight must be called explicitly)
      if (this.config.floor) {
        this.changeFloor(this.config.floor);
      }

      this._isReady = true;
      if (this.config.onReady) this.config.onReady();
    },

    // ----------------------------------------------------
    // PARTNER API CALLS
    // ----------------------------------------------------
    /**
     * One-time call with X-API-Key.
     * Returns { success, sessionToken } on success.
     * The session token is used for all subsequent calls.
     */
    async _verifyPartner(apiKey, propertyId) {
      try {
        const url = `${this._apiBase()}/api/partner/maps/authorized?propertyId=${propertyId}`;
        const res = await fetch(url, { headers: { "X-API-Key": apiKey } });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Invalid API Key" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: "Partner verification failed" };
        }

        const data = await res.json();
        return { success: true, sessionToken: data.session_token };
      } catch {
        return { success: false, error: "Network error verifying partner" };
      }
    },

    /**
     * Fetch map config using the session token (no API key, no propertyId in URL).
     * The backend resolves the property from the token.
     */
    async _fetchConfig() {
      try {
        const url = `${this._apiBase()}/api/partner/maps/fetch_data?map_type=ops`;
        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${this._sessionToken}` }
        });

        if (!res.ok) {
          if (res.status === 401) return { success: false, error: "Session invalid or expired" };
          if (res.status === 404) return { success: false, error: "Property not found" };
          return { success: false, error: `Server error (${res.status})` };
        }

        return { success: true, data: await res.json() };
      } catch {
        return { success: false, error: "Network error loading config" };
      }
    },


    // ----------------------------------------------------
    // MAP DATA STORAGE
    // ----------------------------------------------------
    _storeConfig(data) {
      this.data.sitemap     = data.sitemap     || null;
      this.data.floorplates = data.floorplates || [];
      this.data.floorplans  = data.floorplans  || [];
      this.data.units       = data.units       || [];
      this.data.amenities   = data.amenities   || [];

      this._indexUnits();
    },

    _indexUnits() {
      this.unitsByMap = {};
      this.pointerIdsByMap = {};
      this.unitsByPointerIdByMap = {};

      (this.data.units || []).forEach(u => {
        const mapId = String(u.mapId);
        if (!this.unitsByMap[mapId]) this.unitsByMap[mapId] = [];
        if (!this.pointerIdsByMap[mapId]) this.pointerIdsByMap[mapId] = [];
        if (!this.unitsByPointerIdByMap[mapId]) this.unitsByPointerIdByMap[mapId] = {};

        this.unitsByMap[mapId].push(u);

        const pid = u.pointerData?.id ? String(u.pointerData.id) : null;
        if (pid) {
          this.pointerIdsByMap[mapId].push(pid);
          this.unitsByPointerIdByMap[mapId][pid] = u;
        }
      });
    },

    // ----------------------------------------------------
    // SVG LOADING
    // The real storage URL is never sent to the browser.
    // We pass only mapId + mapType; the server resolves the URL.
    // ----------------------------------------------------
    // Loads only the map that will be shown first:
    // config.floor > server defaultFloor > sitemap > floorplates[0]
    async _loadActiveSVG() {
      const floor = this.config.floor ?? this.data.property?.map?.defaultFloor;
      let primaryEntry = null;

      if (floor != null) {
        const fp = this._findFloorplateByFloor(String(floor));
        if (fp) primaryEntry = { mapId: String(fp.mapId), mapType: fp.mapType || "floorplate" };
      }

      if (!primaryEntry && this.data.sitemap) {
        primaryEntry = { mapId: String(this.data.sitemap.mapId), mapType: this.data.sitemap.mapType || "sitemap" };
      }

      if (!primaryEntry && this.data.floorplates.length > 0) {
        const fp = this.data.floorplates[0];
        primaryEntry = { mapId: String(fp.mapId), mapType: fp.mapType || "floorplate" };
      }

      if (primaryEntry) {
        const svg = await this._loadSVGIfNeeded(primaryEntry.mapId, primaryEntry.mapType);
        if (svg) this.svgCache[primaryEntry.mapId] = svg;
      }
    },

    // Deduplicates concurrent fetches for the same map.
    async _loadSVGIfNeeded(mapId, mapType) {
      const id = String(mapId);
      if (this.svgCache[id]) return this.svgCache[id];

      if (!this._svgLoadingPromises[id]) {
        this._svgLoadingPromises[id] = this._loadSVG(id, mapType).then(svg => {
          if (svg) this.svgCache[id] = svg;
          delete this._svgLoadingPromises[id];
          return svg;
        });
      }

      return this._svgLoadingPromises[id];
    },

    /**
     * Fetch an SVG using the session token.
     * The request URL contains only opaque IDs — no storage URLs.
     */
    // Returns a sessionStorage key versioned by updatedAt so a new SVG upload
    // produces a different key → cache miss → fresh fetch automatically.
    _svgCacheKey(mapId) {
      const id = String(mapId);
      if (this.data.sitemap && String(this.data.sitemap.mapId) === id) {
        return `pyn_svg_${id}_${this.data.sitemap.updatedAt || ''}`;
      }
      const fp = (this.data.floorplates || []).find(f => String(f.mapId) === id);
      return `pyn_svg_${id}_${fp?.updatedAt || ''}`;
    },

    async _loadSVG(mapId, mapType) {
      const cacheKey = this._svgCacheKey(mapId);

      // localStorage persists across tabs and sessions — versioned key ensures
      // a fresh fetch whenever the SVG is updated (updatedAt changes).
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return this._parseSVG(cached);
      } catch {}

      try {
        const requestUrl =
          `${this._apiBase()}/api/partner/maps/fetch_svg_image` +
          `?map_id=${encodeURIComponent(mapId)}&map_type=${encodeURIComponent(mapType)}`;

        const response = await fetch(requestUrl, {
          headers: { "Authorization": `Bearer ${this._sessionToken}` },
          cache: 'default'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
        }

        const svgText    = await response.text();
        const svgElement = this._parseSVG(svgText);

        if (!svgElement) {
          throw new Error("No <svg> element found in the response.");
        }

        // Store in localStorage. Remove any stale entry for this mapId first.
        try {
          const prefix = `pyn_svg_${mapId}_`;
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k !== cacheKey && k.startsWith(prefix)) localStorage.removeItem(k);
          }
          localStorage.setItem(cacheKey, svgText);
        } catch {}

        return svgElement;
      } catch (error) {
        console.error("_loadSVG failed:", error);
        return null;
      }
    },

    _parseSVG(svgText) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, "image/svg+xml");
      return doc.querySelector("svg");
    },


    // ----------------------------------------------------
    // RENDER MAPS
    // ----------------------------------------------------
    _renderMaps() {
      const c = this.container;
      c.innerHTML = "";               // remove any previous SVG + controls
      c.style.position = "relative";

      if (!this.activeMapId || !this._mapExists(this.activeMapId)) return;

      const svg = this.svgCache[this.activeMapId];
      if (!svg) return;

      const clone = svg.cloneNode(true);
      clone.setAttribute("data-map-id", this.activeMapId);
      clone.style.display = "block";

      // Apply global text styles (once per SVG)
      this._applyGlobalLabelStyles(clone, this.config.styles.unitLabels);

      // AUTO SCALE SVG: fit inside whatever container partner gives
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
      clone.style.width = "100%";
      clone.style.height = "100%";

      c.appendChild(clone);

      if (this.config.showZoomControls) {
        this._renderZoomControls();
      }

      // Enable pan/zoom on the newly rendered SVG
      this._enablePanZoom(clone);

      // Container should constrain the SVG
      c.style.overflow   = "hidden";
      c.style.touchAction = "none";

      this._renderAllMarkersForMap();
    },


    // ----------------------------------------------------
    // PAN & ZOOM
    // ----------------------------------------------------
    _loadPanZoom() {
      return Promise.resolve();
    },

    _enablePanZoom(svgEl) {
      if (!window.panzoom) return;

      if (svgEl._pz) {
        try { svgEl._pz.dispose(); } catch {}
      }

      // touch-action:none lets panzoom own all touch gestures on every device
      svgEl.style.touchAction = "none";
      if (svgEl.parentNode) svgEl.parentNode.style.touchAction = "none";

      svgEl._pz = panzoom(svgEl, {
        minZoom: 0.5,
        maxZoom: 10,
        bounds: true,
        boundsPadding: 0.1,
      });

      // Defer so the browser finishes layout before we read clientWidth/Height
      setTimeout(() => this._centerSvg(svgEl), 0);
    },

    _centerSvg(svgEl) {
      const pz = svgEl && svgEl._pz;
      if (!pz) return;
      // The SVG is width:100% height:100% with preserveAspectRatio="xMidYMid meet",
      // so the SVG renderer already fits and centers the content. Panzoom just needs
      // to sit at scale=1, translate=(0,0) — any other value shrinks the element
      // below its container and exposes the background.
      pz.zoomAbs(0, 0, 1);
      pz.moveTo(0, 0);
    },

        // ----------------------------------------------------
    // MANUAL SELECT / UNSELECT (PUBLIC API)
    // ----------------------------------------------------
    selectUnit(unitId, colorCode) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit = units.find(u =>
        String(u.unitId) === id ||
        String(u.id) === id ||
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid = String(unit.pointerData.id);
      const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      const styles = this.config.styles;
      const fillColor =
        colorCode ||
        styles.unitColors.hover ||
        styles.unitColors.available;

      el.style.fill = fillColor;
      this._selectedUnitId = unit.unitId;

      const root = el.closest("g") || el;
      root.classList.add("pyn-highlight");
      root.style.cursor = "pointer";
    },

    unselectUnit(unitId) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const id = String(unitId);
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit = units.find(u =>
        String(u.unitId) === id ||
        String(u.id) === id ||
        String(u.pointerData?.id) === id
      );

      if (!unit?.pointerData?.id) return;

      const pid = String(unit.pointerData.id);
      const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return;

      const styles = this.config.styles;
      const status = this._unitStatus(unit);

      el.style.fill = styles.unitColors[status] || styles.unitColors.available;
      if (String(this._selectedUnitId) === String(unit.unitId)) {
        this._selectedUnitId = null;
      }
    },

    zoomIn() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      const r = (svg.parentElement || svg).getBoundingClientRect();
      svg._pz.smoothZoom(r.left + r.width / 2, r.top + r.height / 2, 1.25);
    },

    zoomOut() {
      const svg = this._getActiveSvg();
      if (!svg || !svg._pz) return;
      const r = (svg.parentElement || svg).getBoundingClientRect();
      svg._pz.smoothZoom(r.left + r.width / 2, r.top + r.height / 2, 1 / 1.25);
    },

    // ----------------------------------------------------
    // FLOOR / MAP CHANGE
    // ----------------------------------------------------
    async changeMap(mapId) {
      const id = String(mapId);

      if (!this._mapExists(id)) {
        const mapType = this._getMapTypeForId(id);
        if (!mapType) return;
        this._showLoading("Loading floor...");
        const svg = await this._loadSVGIfNeeded(id, mapType);
        if (!svg) return;
      }

      this.activeMapId = id;
      this._lastHoverPid = null;

      this._renderMaps();
      this._bindUnitEvents();
    },

    async changeFloor(floorNumber, onReady) {
      const fp = this._findFloorplateByFloor(floorNumber);

      if (!fp) return;

      const floorMapId = String(fp.mapId);

      if (this.activeMapId !== floorMapId) {
        await this.changeMap(floorMapId);
      }

      if (typeof onReady === "function") onReady();
    },


    // ----------------------------------------------------
    // HIGHLIGHT: UNITS
    // ----------------------------------------------------
    _highlightAllUnits() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const styles = this.config.styles;
      const units = this.unitsByMap[this.activeMapId] || [];

      units.forEach(unit => {
        const pid = unit.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status] || styles.unitColors.available;

        // this._applyLabelTextStyles(el, styles.unitLabels);

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
        root.style.cursor = "pointer";
      });
    },

    _highlightUnitsForFloor(floorNumber) {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      this._clearUnitStyles();

      const styles = this.config.styles;
      const units = (this.unitsByMap[this.activeMapId] || []).filter(
        u => String(u.floor) === String(floorNumber)
      );

      units.forEach(u => {
        const pid = u.pointerData?.id;
        if (!pid) return;

        const el = activeSvg.querySelector(`#${CSS.escape(String(pid))}`);
        if (!el) return;

        const status = this._unitStatus(u);
        el.style.fill = styles.unitColors[status];

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
        root.style.cursor = "pointer";
      });
    },

    /**
     * Public: highlight one or many units by unitId.
     */

    highlightUnits(unitIds) {
      if (!unitIds) return;

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = Array.isArray(unitIds)
        ? unitIds.map(String)
        : [String(unitIds)];

      const units = this.unitsByMap[this.activeMapId] || [];

      this._clearUnitStyles();

      const styles = this.config.styles;

      ids.forEach(id => {
        const unit = units.find(u =>
          String(u.unitId) === id ||
          String(u.pointerData?.id) === id
        );

        if (!unit?.pointerData?.id) return;

        const pid = String(unit.pointerData.id);
        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const status = this._unitStatus(unit);
        el.style.fill = styles.unitColors[status];

        const root = el.closest("g") || el;
        root.classList.add("pyn-highlight");
        root.style.cursor = "pointer";
      });
    },
    // ----------------------------------------------------
    // MARKERS (PUBLIC API)
    // ----------------------------------------------------
    addMarker(cfg) {
      if (!cfg || !cfg.id) {
        console.warn("PynMapSDK.addMarker: id is required");
        return;
      }

      this.markers[String(cfg.id)] = {
        id:        String(cfg.id),
        unitId:    cfg.unitId   != null ? String(cfg.unitId)  : null,
        floor:     cfg.floor    != null ? String(cfg.floor)   : null,
        position:  cfg.position || null,
        icon:      cfg.icon     || null,
        cursor:    cfg.cursor   || "default",
        draggable: !!cfg.draggable,
        onClick:   typeof cfg.onClick === "function" ? cfg.onClick : null,
        onDrag:    typeof cfg.onDrag  === "function" ? cfg.onDrag  : null,
        _el:       null,
      };

      this._renderMarker(String(cfg.id));
    },

    removeMarker(id) {
      const key = String(id);
      const marker = this.markers[key];
      if (!marker) return;

      if (marker._el && marker._el.parentNode) {
        marker._el.parentNode.removeChild(marker._el);
      }
      delete this.markers[key];
    },

    clearMarkers() {
      Object.keys(this.markers).forEach(id => this.removeMarker(id));
    },

    // ----------------------------------------------------
    // MARKERS (INTERNAL)
    // ----------------------------------------------------
    _getOrCreateMarkerLayer(svg) {
      let layer = svg.querySelector(".pyn-markers-layer");
      if (!layer) {
        layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        layer.setAttribute("class", "pyn-markers-layer");
        svg.appendChild(layer);
      }
      return layer;
    },

    _unitCenter(unitId, svg) {
      const units = this.unitsByMap[this.activeMapId] || [];
      const unit = units.find(u =>
        String(u.unitId) === String(unitId) ||
        String(u.id)     === String(unitId) ||
        String(u.pointerData?.id) === String(unitId)
      );
      if (!unit?.pointerData?.id) return null;

      const pid = String(unit.pointerData.id);
      const el = svg.querySelector(`#${CSS.escape(pid)}`);
      if (!el) return null;

      const bbox = el.getBBox();
      return { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
    },

    _renderMarker(markerId) {
      const marker = this.markers[String(markerId)];
      if (!marker) return;

      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      // Only show on the matching floor if floor is specified
      if (marker.floor != null) {
        const fp = this._findFloorplateByFloor(marker.floor);
        if (!fp || String(fp.mapId) !== this.activeMapId) return;
      }

      // Remove stale element if re-rendering after a floor change
      if (marker._el && marker._el.parentNode) {
        marker._el.parentNode.removeChild(marker._el);
        marker._el = null;
      }

      // Resolve SVG-space position
      let pos = marker.position ? { ...marker.position } : null;
      if (!pos && marker.unitId) {
        pos = this._unitCenter(marker.unitId, activeSvg);
      }
      if (!pos) return;

      const icon   = marker.icon   || {};
      const size   = icon.size     || [32, 32];
      const anchor = icon.anchor   || [0.5, 0.5];

      const x = pos.x - size[0] * anchor[0];
      const y = pos.y - size[1] * anchor[1];

      const ns    = "http://www.w3.org/2000/svg";
      const imgEl = document.createElementNS(ns, "image");
      imgEl.setAttribute("href",   icon.url || "");
      imgEl.setAttribute("x",      x);
      imgEl.setAttribute("y",      y);
      imgEl.setAttribute("width",  size[0]);
      imgEl.setAttribute("height", size[1]);
      imgEl.style.cursor = marker.cursor || "default";
      imgEl.setAttribute("data-pyn-marker-id", marker.id);

      if (marker.onClick) {
        imgEl.addEventListener("click", (e) => {
          e.stopPropagation();
          marker.onClick(marker);
        });
      }

      if (marker.draggable) {
        this._makeDraggableMarker(imgEl, marker, activeSvg);
      }

      this._getOrCreateMarkerLayer(activeSvg).appendChild(imgEl);
      marker._el = imgEl;
    },

    _renderAllMarkersForMap() {
      Object.keys(this.markers).forEach(id => {
        const marker = this.markers[id];
        if (marker._el && marker._el.parentNode) {
          marker._el.parentNode.removeChild(marker._el);
          marker._el = null;
        }
        this._renderMarker(id);
      });
    },

    _makeDraggableMarker(imgEl, marker, svg) {
      imgEl.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const startSVG    = this._screenToSVG(svg, e.clientX, e.clientY);
        const startImgPos = {
          x: parseFloat(imgEl.getAttribute("x")),
          y: parseFloat(imgEl.getAttribute("y")),
        };

        const onMove = (e) => {
          const pt = this._screenToSVG(svg, e.clientX, e.clientY);
          imgEl.setAttribute("x", startImgPos.x + (pt.x - startSVG.x));
          imgEl.setAttribute("y", startImgPos.y + (pt.y - startSVG.y));
        };

        const onUp = (e) => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup",   onUp);

          const pt     = this._screenToSVG(svg, e.clientX, e.clientY);
          const finalX = startImgPos.x + (pt.x - startSVG.x);
          const finalY = startImgPos.y + (pt.y - startSVG.y);

          marker.position = { x: finalX, y: finalY };
          if (marker.onDrag) marker.onDrag(marker, { x: finalX, y: finalY });
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup",   onUp);
      });
    },

    _screenToSVG(svg, clientX, clientY) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    },

    // ----------------------------------------------------
    // CALLBACK REGISTRATION / REMOVAL
    // ----------------------------------------------------
    onReady(fn) {
      if (typeof fn !== "function") return;
      if (this._isReady) {
        fn();
      } else {
        this.config.onReady = fn;
      }
    },


    // ----------------------------------------------------
    // FAST UNIT EVENTS (DELEGATED)
    // ----------------------------------------------------
    _bindUnitEvents() {
      const svg = this._getActiveSvg();
      if (!svg) return;

      const mapId = this.activeMapId;
      const byPointer = this.unitsByPointerIdByMap[mapId] || {};
      const pointerIds = this.pointerIdsByMap[mapId] || [];

      // 1) Mark "unit roots" once: we put data-pyn-unit-pid on the group (if any) or on the element itself.
      pointerIds.forEach(pid => {
        const el = svg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        const root = el.closest("g") || el; // whole box area
        root.dataset.pynUnitPid = pid;
        // cursor is set only when the unit gets highlighted
      });

      // 2) Attach at most ONE set of listeners per SVG
      if (svg._pynEventsBound) return;
      svg._pynEventsBound = true;

      svg.addEventListener("mouseover", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid = root.dataset.pynUnitPid;
        if (!pid || this._lastHoverPid === pid) return;

        this._lastHoverPid = pid;

        const unit = byPointer[pid];
        if (!unit) return;

        // Apply hover color unless the unit is already selected
        if (String(unit.unitId) !== String(this._selectedUnitId)) {
          const el = svg.querySelector(`#${CSS.escape(pid)}`);
          if (el) {
            const hoverColor = this.config.styles.unitColors.hover || this.config.styles.unitColors.available;
            el.style.fill = hoverColor;
          }
        }

        if (this.config.onUnitHover) {
          this.config.onUnitHover(unit);
        }
      });

      svg.addEventListener("mouseout", (e) => {
        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root) return;

        const pid = root.dataset.pynUnitPid;
        if (!root.contains(e.relatedTarget) && this._lastHoverPid === pid) {
          this._lastHoverPid = null;

          const unit = byPointer[pid];
          if (unit) {
            if (String(unit.unitId) !== String(this._selectedUnitId)) {
              const el = svg.querySelector(`#${CSS.escape(pid)}`);
              if (el) {
                const status = this._unitStatus(unit);
                el.style.fill = this.config.styles.unitColors[status] || this.config.styles.unitColors.available;
              }
            }
            if (this.config.offUnitHover) {
              this.config.offUnitHover(unit);
            }
          }
        }
      });

      // Touch support: tap to select — no fill change
      let _touch = null;
      let _suppressNextClick = false;

      svg.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) { _touch = null; return; }
        const t = e.touches[0];
        const root = t.target.closest("[data-pyn-unit-pid]");
        _touch = { x: t.clientX, y: t.clientY, time: Date.now(), root: root || null };
      }, { passive: true });

      svg.addEventListener("touchend", (e) => {
        if (!_touch) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - _touch.x;
        const dy = t.clientY - _touch.y;
        const wasTap = Math.sqrt(dx * dx + dy * dy) < 8 && (Date.now() - _touch.time) < 250;
        const root = _touch.root;
        _touch = null;

        if (!root || !wasTap || !root.classList.contains("pyn-highlight")) return;
        const pid = root.dataset.pynUnitPid;
        const unit = byPointer[pid];
        if (!unit) return;

        _suppressNextClick = true;
        setTimeout(() => { _suppressNextClick = false; }, 500);
        if (this.config.onUnitClick) this.config.onUnitClick(unit);
      }, { passive: true });

      svg.addEventListener("touchcancel", () => { _touch = null; }, { passive: true });

      // Click (desktop) — suppressed after a touch tap to avoid double-fire
      svg.addEventListener("click", (e) => {
        if (_suppressNextClick) return;

        const root = e.target.closest("[data-pyn-unit-pid]");
        if (!root || !root.classList.contains("pyn-highlight")) return;

        const pid = root.dataset.pynUnitPid;
        if (!pid) return;

        const unit = byPointer[pid];
        if (!unit) return;

        if (this.config.onUnitClick) {
          this.config.onUnitClick(unit);
        }
      });
    },


    // ----------------------------------------------------
    // INTERNAL CLEARING
    // ----------------------------------------------------
    _clearUnitStyles() {
      const activeSvg = this._getActiveSvg();
      if (!activeSvg) return;

      const ids = this.pointerIdsByMap[this.activeMapId] || [];

      ids.forEach(pid => {
        const el = activeSvg.querySelector(`#${CSS.escape(pid)}`);
        if (!el) return;

        el.style.fill = "";
        el.style.stroke = "";
        el.style.strokeWidth = "";

        // remove highlight from polygon AND parent <g>
        const root = el.closest("g") || el;
        root.classList.remove("pyn-highlight");
        root.style.cursor = "";

        el.classList.remove("pyn-selected-unit");
        el.classList.remove("pyn-highlight");
      });
    },


    // ----------------------------------------------------
    // HELPERS
    // ----------------------------------------------------

    _renderZoomControls() {
      // Remove old controls if re-rendered
      const old = this.container.querySelector(".pyn-zoom-controls");
      if (old) old.remove();

      const wrapper = document.createElement("div");
      wrapper.className = "pyn-zoom-controls";

      Object.assign(wrapper.style, {
        position: "absolute",
        right: "12px",
        top: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        zIndex: "999999"
      });

      const btnStyle = {
        width: "34px",
        height: "34px",
        background: "#ffffff",
        borderRadius: "6px",
        border: "1px solid #ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer",
        boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
        userSelect: "none"
      };

      // PLUS button
      const plus = document.createElement("div");
      plus.innerText = "+";
      Object.assign(plus.style, btnStyle);
      plus.onclick = () => this.zoomIn();

      // MINUS button
      const minus = document.createElement("div");
      minus.innerText = "−";
      Object.assign(minus.style, btnStyle);
      minus.onclick = () => this.zoomOut();

      wrapper.appendChild(plus);
      wrapper.appendChild(minus);

      this.container.appendChild(wrapper);
    },

    _unitStatus(_unit) {
      // if (unit.model_unit) return "model";
      // if (unit.available === false && unit.sold) return "leased";
      // if (unit.unit_status === "occupied_on_notice") return "notice";
      // if (unit.unit_status === "occupied") return "leased";
      // if (!unit.floorplan_name) return "missing";
      return "available";
    },

    _findFloorplateByFloor(floorNumber) {
      const fn = Number(floorNumber);
      if (isNaN(fn)) return null;

      for (const fp of this.data.floorplates) {
        const range = String(fp.range).trim(); // e.g. "1-4" or "3"

        if (range.includes("-")) {
          const [min, max] = range.split("-").map(Number);
          if (fn >= min && fn <= max) return fp;
        } else {
          if (fn === Number(range)) return fp;
        }
      }

      return null;
    },

    // _applyLabelTextStyles(el, textStyles) {
    //   const g = el.closest("g");
    //   if (!g) return;

    //   const texts = g.querySelectorAll("text");
    //   texts.forEach(t => {
    //     t.style.fontFamily = textStyles.fontFamily;
    //     t.style.fontSize = textStyles.fontSize;
    //     t.style.fill = textStyles.fontColor;
    //     t.style.pointerEvents = "none";
    //   });
    // },

    _applyGlobalLabelStyles(svg, textStyles) {
      if (!svg || svg._pynTextStyled) return;  // prevent re-running

      const elements = svg.querySelectorAll("text, tspan");
      elements.forEach(el => {
        el.style.fontFamily = textStyles.fontFamily;
        el.style.fontSize = textStyles.fontSize;
        el.style.fill = textStyles.fontColor;
        el.style.pointerEvents = "none"; // ensure labels don't block clicks
      });

      svg._pynTextStyled = true; // mark as styled
    },

    _getActiveSvg() {
      return this.container.querySelector(`svg[data-map-id="${this.activeMapId}"]`);
    },

    _mapExists(id) {
      return !!this.svgCache[id];
    },

    _hasAnyMap() {
      return Object.keys(this.svgCache).length > 0;
    },

    _getDefaultMapId() {
      if (this.data.sitemap && this.svgCache[String(this.data.sitemap.mapId)])
        return String(this.data.sitemap.mapId);
      return Object.keys(this.svgCache)[0];
    },

    _getMapTypeForId(mapId) {
      const id = String(mapId);
      if (this.data.sitemap && String(this.data.sitemap.mapId) === id)
        return this.data.sitemap.mapType || "sitemap";
      const fp = this.data.floorplates.find(f => String(f.mapId) === id);
      return fp ? (fp.mapType || "floorplate") : null;
    },

    _showLoading(msg) {
      this._showStatus(msg, false);
    },

    _showError(msg) {
      this._showStatus(msg, true);
    },

    _showStatus(text, isError) {
      this.container.innerHTML = "";
      const box = document.createElement("div");
      Object.assign(box.style, {
        background: "#fff",
        padding: "10px 18px",
        borderRadius: "6px",
        fontSize: "14px",
        color: isError ? "#b91c1c" : "#444",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
      });
      box.innerText = text;

      this.container.style.display = "flex";
      this.container.style.alignItems = "center";
      this.container.style.justifyContent = "center";
      this.container.appendChild(box);
    },

    _apiBase() {
      if (this.config.environment  === "staging") {
        return "https://pynwheel-staging.herokuapp.com";
      }

      // return "http://localhost:3000";
      return "https://pynwheelconnect.com"; // production
    }
  };

  // ----------------------------------------------------
  // FACTORY
  // ----------------------------------------------------
  function createMapInstance(cfg) {
    const instance = Object.assign(Object.create(null), PynMapSDKMethods, {
      _initialized: false,
      _isReady: false,
      _sessionToken: null,
      config: null,
      container: null,
      activeMapId: null,
      data: { sitemap: null, floorplates: [], units: [], floorplans: [], amenities: [] },
      unitsByMap: {},
      pointerIdsByMap: {},
      unitsByPointerIdByMap: {},
      svgCache: {},
      _svgLoadingPromises: {},
      _lastHoverPid: null,
      _selectedUnitId: null,
      markers: {},
    });
    instance.init(cfg);
    return instance;
  }

  // ----------------------------------------------------
  // GLOBAL EXPOSED API
  // ----------------------------------------------------
  if (!global.PynMapSDK) {
    global.PynMapSDK = {
      create(cfg) {
        return createMapInstance(cfg);
      },
    };
  }

})(window);