# Scheme J onsite AR

Open `https://tgrunshaw.github.io/arview/j/` after publication, directly in Chrome on Android. The Samsung Galaxy S21 5G is on Google's ARCore supported-device list. Update Chrome, Google Play Services for AR and the Google app.

The primary viewer uses WebXR with ground hit testing, DOM overlay controls, and optional session anchors. Models use metres, with scale fixed at 1.0. There is no GPS positioning, persistent site anchor, automatic occlusion, or survey-grade registration. The simple Android Scene Viewer link is a fallback with automatic placement and no A/B calibration.

## Onsite workflow

1. Before leaving, open the HTTPS page and select **Save for onsite use**. Wait for confirmation, then reopen the same page in airplane mode to check the saved copy. Browser storage is not guaranteed permanent. A native Scene Viewer launch still needs a connection.
2. Establish the proposed north and south garage doorway jamb positions, A and B, from the design. They are 5.00 metres apart horizontally. The plan on the page is a reference diagram, not a surveyed setting-out drawing. These are not existing physical markers.
3. Start AR, scan textured ground near A, place the ring on its ground projection and select **Set A**. Walk to B and select **Set B**.
4. The viewer uses A for translation and B for heading, never rescaling the architecture. It reports measured horizontal distance and ground-height difference relative to the original model terrain. A discrepancy over 30 cm triggers a recheck message; this threshold is a usability cue, not an accuracy specification.
5. Adjust height, heading and position as needed. Groundworks are off by default so the camera view of the real ground stays visible. Optional groundworks show proposed surfaces, cuts, retaining, lawn, hedge and outdoor items.
6. Walk slowly and recheck A/B after travelling far, losing tracking or returning to the model. Restart placement when needed. Tracking drift can be significant over a house-sized area. Do not use it to determine construction or boundary positions.

## Export provenance

- Source: saved `model/24_design_J.blend`, exported 9 September 2026. The source and linked `00_base.blend` were not saved or modified by the export.
- Geometry: evaluated saved meshes, including Boolean openings. No old Scheme G/I massing was substituted.
- Mobile materials: 7 simple PBR materials for the house; 8 for siteworks. Original texture/procedural materials are approximated, with no landscape photo backdrop.
- House: 15,548 triangles, approximately 1.2 MB. Groundworks: 95,315 triangles, approximately 7.9 MB. Combined groundworks mode is heavier than the default house-only mode.
- GLB X points east, Y up, Z south, relative to A. See `model-info.json` for the exact origin, calibration points, terrain object, relative floor heights and source fingerprints.
- Ground reference is sampled from original model terrain, not Google's terrain or an onsite measurement. A = Blender (-15.353332, 7.174633, -6.433838). B = (-18.136253, 3.020676, -6.662674).
- Proposed garage floor is approximately 0.166 m BELOW the original ground at A, so this viewer deliberately does not lift the lowest model point to the detected ground plane.

## Deployment

Copy the entire `j/` directory into the repository publishing root. GitHub Pages should serve it at `/arview/j/`. Keep the `vendor` directory and both GLBs together. No build step, API key, analytics or third-party CDN is required. All links are relative so the page also works under another HTTPS subdirectory. The service worker controls only its own directory.

Existing top-level G/I and combined viewers need no changes. The model binaries will be publicly downloadable if published to the existing public GitHub Pages site.

## Validation and remaining check

Both GLBs pass Khronos glTF Validator 2.0.0-dev.3.10 with zero errors and warnings. The exported files were reimported into Blender and rendered for visual review. Calibration tests cover eight headings, translation, mismatched distance and height, short baselines and fixed scale. JavaScript syntax and local asset serving were checked.

The actual camera session, outdoor tracking performance, Android fallback and offline reload must still be verified on the Galaxy S21. Desktop 3D/model validation cannot establish those results.

## Dependencies and references

Three.js 0.180.0 is vendored under its MIT licence (`vendor/THREE-LICENSE.txt`). GLTFLoader's local BufferGeometryUtils import path is adapted to the flat vendor directory.

- https://developers.google.com/ar/devices
- https://developers.google.com/ar/develop/scene-viewer
- https://developers.google.com/ar/develop/anchors
- https://threejs.org/docs/pages/WebXRManager.html
