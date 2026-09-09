import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {calibrate,rotateXZ} from './alignment.mjs';
const $=id=>document.getElementById(id);
let renderer,scene,camera,controls,house,siteworks,info,session,hitSource,anchor;
let stage='preview',freshHit=null,captureRequested=false,anchorEpoch=0,baseYaw=0,lastPoseTime=0;
let offsets={height:0,yaw:0,x:0,z:0},savedCamera;
const world=new THREE.Group(),placement=new THREE.Group();world.add(placement);
const ring=new THREE.Mesh(new THREE.RingGeometry(.10,.14,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xd4f17a,side:THREE.DoubleSide}));
ring.visible=false;ring.matrixAutoUpdate=false;
const marks=new THREE.Group();
function marker(pos,color){const m=new THREE.Mesh(new THREE.SphereGeometry(.11,12,8),new THREE.MeshBasicMaterial({color,depthTest:false}));m.position.fromArray(pos);m.renderOrder=10;marks.add(m);}
function resetOffsets(){offsets={height:0,yaw:0,x:0,z:0};applyOffsets();}
function applyOffsets(){placement.position.set(offsets.x,offsets.height,offsets.z);placement.rotation.set(0,baseYaw+THREE.MathUtils.degToRad(offsets.yaw),0);placement.scale.setScalar(1);$('offsetReadout').textContent=`Height ${offsets.height>=0?'+':''}${offsets.height.toFixed(2)} m · turn ${offsets.yaw>=0?'+':''}${offsets.yaw}°`;}
function setSite(value){if(siteworks)siteworks.visible=value;$('siteToggle').checked=value;$('xrSite').checked=value;}
function resetPreview(){const box=new THREE.Box3().setFromObject(house);const center=box.getCenter(new THREE.Vector3());camera.position.copy(center).add(new THREE.Vector3(-34,25,35));controls.target.copy(center);controls.update();}
function resize(){if(renderer.xr.isPresenting)return;const w=$('viewer').clientWidth,h=$('viewer').clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
async function load(){
 try{
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');renderer.setClearColor(0xe7eae0,1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;$('viewer').appendChild(renderer.domElement);
 scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(45,1,.05,500);scene.add(world,ring);scene.add(new THREE.HemisphereLight(0xffffff,0x666951,2.8));const sun=new THREE.DirectionalLight(0xfff1d8,3);sun.position.set(-20,40,10);scene.add(sun);
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxDistance=150;controls.minDistance=1;controls.maxPolarAngle=Math.PI*.94;
 const loader=new GLTFLoader();
 const [h,i]=await Promise.all([loader.loadAsync('./scheme-j-house.glb'),fetch('./model-info.json').then(r=>{if(!r.ok)throw new Error('Model reference could not load');return r.json();})]);
 house=h.scene;info=i;placement.add(house);marker([0,0,0],0xd4f17a);marker(info.reference.B,0xf9ad74);placement.add(marks);marks.visible=false;resetPreview();resize();$('loading').hidden=true;
 window.addEventListener('resize',resize);renderer.setAnimationLoop(frame);
 loader.loadAsync('./scheme-j-siteworks.glb').then(g=>{siteworks=g.scene;siteworks.visible=(stage==='preview'||stage==='placed')&&$('siteToggle').checked;placement.add(siteworks);}).catch(()=>{$('siteToggle').disabled=true;$('xrSite').disabled=true;$('offlineStatus').textContent='Groundworks failed to load. Reload with a connection to try again.';});
 $('resetView').onclick=resetPreview;$('siteToggle').onchange=e=>setSite(e.target.checked);$('xrSite').onchange=e=>setSite(e.target.checked);
 if(isSecureContext && navigator.xr && await navigator.xr.isSessionSupported('immersive-ar')){$('startAR').disabled=false;$('startAR').textContent='Start onsite AR';$('status').textContent='Full size · manual alignment · camera access required';}
 else{$('startAR').textContent='AR needs Chrome on your phone';$('status').textContent=isSecureContext?'3D preview is available here. Open this link in Chrome on your Galaxy S21 for AR.':'Publish over HTTPS to use AR on your phone.';}
 if(/Android/i.test(navigator.userAgent)&&location.protocol==='https:'){
 const file=new URL('./scheme-j-house.glb',location.href).href;
 $('nativeAR').href=`intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(file)}&mode=ar_preferred&resizable=false&title=Scheme%20J#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(location.href)};end;`;$('nativeAR').hidden=false;
 }
 }catch(e){$('loading').textContent='The 3D model could not load. Reload with a connection.';$('status').textContent=e.message;$('startAR').textContent='Model unavailable';console.error(e);}
}
function clearAnchor(){anchorEpoch++;anchor?.delete();anchor=null;}
function beginPlacement(){clearAnchor();stage='a';freshHit=null;captureRequested=false;baseYaw=0;world.position.set(0,0,0);world.quaternion.identity();resetOffsets();house.visible=false;marks.visible=false;if(siteworks)siteworks.visible=false;$('adjustments').hidden=true;$('capture').hidden=false;$('capture').disabled=true;$('capture').textContent='Set A';$('xrState').textContent='1 / 2 · Find A';$('xrInstruction').textContent='Aim at the ground beneath the north end of the proposed garage door. Move slowly until the ring appears.';}
$('startAR').onclick=async()=>{
 $('startAR').disabled=true;
 try{
 // Request synchronously from the tap; no fetch or capability check before it.
 session=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test','local','dom-overlay'],optionalFeatures:['anchors'],domOverlay:{root:$('overlay')}});
 savedCamera={position:camera.position.clone(),target:controls.target.clone()};controls.enabled=false;
 session.addEventListener('end',endAR,{once:true});
 await renderer.xr.setSession(session);
 const viewerSpace=await session.requestReferenceSpace('viewer');hitSource=await session.requestHitTestSource({space:viewerSpace});
 $('overlay').hidden=false;document.body.classList.add('in-ar');renderer.setClearColor(0x000000,0);lastPoseTime=performance.now();beginPlacement();
 }catch(e){const active=session;session=null;if(active)await active.end().catch(()=>{});endAR();$('status').textContent=`AR could not start: ${e.message}. Check camera permission and Google Play Services for AR, or try simple Android AR.`;}
};
function endAR(){hitSource?.cancel();hitSource=null;clearAnchor();session=null;stage='preview';world.visible=true;ring.visible=false;freshHit=null;captureRequested=false;$('overlay').hidden=true;document.body.classList.remove('in-ar');world.position.set(0,0,0);world.quaternion.identity();baseYaw=0;resetOffsets();house.visible=true;marks.visible=false;setSite($('siteToggle').checked);renderer.setClearColor(0xe7eae0,1);controls.enabled=true;if(savedCamera){camera.position.copy(savedCamera.position);controls.target.copy(savedCamera.target);}resize();requestAnimationFrame(resize);controls.update();$('startAR').disabled=false;}
$('exitAR').onclick=()=>session?.end();$('capture').onclick=()=>{if(freshHit)captureRequested=true;};$('reposition').onclick=beginPlacement;$('resetAdjust').onclick=resetOffsets;
$('overlay').addEventListener('beforexrselect',e=>e.preventDefault());
for(const button of document.querySelectorAll('[data-adjust]'))button.onclick=()=>{
 const [axis,value]=button.dataset.adjust.split(',');const v=Number(value);
 if(axis==='height'||axis==='yaw')offsets[axis]+=v;
 else{
  const xrCamera=renderer.xr.getCamera();const forward=new THREE.Vector3(0,0,-1).applyQuaternion(xrCamera.quaternion);forward.y=0;forward.normalize();const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0));
  const delta=axis==='x'?right.multiplyScalar(v):forward.multiplyScalar(-v);
  delta.applyQuaternion(world.quaternion.clone().invert());offsets.x+=delta.x;offsets.z+=delta.z;
 }
 applyOffsets();
};
function frame(time,xrFrame){
 if(xrFrame&&session){
  const ref=renderer.xr.getReferenceSpace();const tracked=!!xrFrame.getViewerPose(ref);
  if(tracked)lastPoseTime=time;
  if(anchor){const pose=xrFrame.getPose(anchor.anchorSpace,ref);if(pose){world.position.copy(pose.transform.position);world.quaternion.copy(pose.transform.orientation);world.updateMatrixWorld(true);}}
  if(stage==='a'||stage==='b'){
   freshHit=null;ring.visible=false;
   if(hitSource&&tracked){const hits=xrFrame.getHitTestResults(hitSource);if(hits.length){const pose=hits[0].getPose(ref);if(pose){freshHit={point:new THREE.Vector3().copy(pose.transform.position)};ring.matrix.fromArray(pose.transform.matrix);ring.visible=true;}}}
   $('capture').disabled=!freshHit;
   if(captureRequested){captureRequested=false;if(freshHit)capturePoint(freshHit.point,xrFrame,ref);}
  }else if(stage==='placed'){
   $('xrState').textContent=tracked?'Placed · 1:1':'Tracking lost · pause';
  }
  // Hide misregistered geometry during an extended loss of tracking.
  world.visible=time-lastPoseTime<1000;
 }else controls?.update();
 renderer.render(scene,camera);
}
function capturePoint(point,xrFrame,ref){
 if(stage==='a'){
  world.position.copy(point);world.updateMatrixWorld(true);house.visible=false;marks.visible=true;marks.children[1].visible=false;stage='b';$('capture').textContent='Set B';$('xrState').textContent='2 / 2 · Find B';$('xrInstruction').textContent='Walk to the south end of the proposed garage door (5.00 m horizontally from A). Aim at the ground at B.';
  const epoch=anchorEpoch;
  if(xrFrame.createAnchor){xrFrame.createAnchor(new XRRigidTransform({x:point.x,y:point.y,z:point.z}),ref).then(a=>{if(epoch===anchorEpoch&&session)anchor=a;else a.delete();}).catch(()=>{/* Local-space placement remains available. */});}
 }else{
  world.updateMatrixWorld(true);const localB=world.worldToLocal(point.clone());let result;
  try{result=calibrate({x:0,y:0,z:0},localB,info.reference.B);}catch(e){$('xrInstruction').textContent=e.message;return;}
  baseYaw=result.yaw;applyOffsets();stage='placed';ring.visible=false;house.visible=true;marks.children[1].visible=true;setSite($('xrSite').checked);$('capture').hidden=true;$('adjustments').hidden=false;
  const bad=Math.abs(result.error)>.3||Math.abs(result.heightError)>.3;
  $('xrInstruction').textContent=`${bad?'Recheck A/B. ':''}Measured ${result.measured.toFixed(2)} m (plan 5.00 m). Ground-height difference vs model: ${result.heightError>=0?'+':''}${result.heightError.toFixed(2)} m. ${bad?'Placement is approximate.':'Walk slowly; recheck the markers for drift.'}`;
 }
}
$('saveOffline').onclick=async()=>{
 const button=$('saveOffline');button.disabled=true;
 try{
  if(!('serviceWorker' in navigator)||!isSecureContext)throw new Error('Open the published HTTPS page to save it.');
  await navigator.serviceWorker.register('./sw.js',{scope:'./'});const reg=await navigator.serviceWorker.ready;
  await new Promise((resolve,reject)=>{const channel=new MessageChannel();const timeout=setTimeout(()=>reject(new Error('Download timed out. Try again with a stronger connection.')),180000);channel.port1.onmessage=e=>{if(e.data.progress)$('offlineStatus').textContent=e.data.progress;if(e.data.done){clearTimeout(timeout);resolve();}if(e.data.error){clearTimeout(timeout);reject(new Error(e.data.error));}};reg.active.postMessage({type:'CACHE_OFFLINE'},[channel.port2]);});
  $('offlineStatus').textContent='Saved on this phone. Reopen this exact page in airplane mode to confirm before travelling.';button.textContent='Refresh offline copy';
 }catch(e){$('offlineStatus').textContent=e.message;}finally{button.disabled=false;}
};
load();
