import bpy
import hashlib
import importlib.util
import json
import os
import struct
import sys

# Radar Scout 3D Hero v43
# Boundary-corrected successor to V42. Direct V10↔V41 review still justifies
# crest smoothing, but V42's volume-preserving Laplacian leaked sub-milliscale
# motion into all low/root vertices. V43 snapshots every V41 crown vertex whose
# ORIGINAL z <= 3.72, applies the same top-localized smoothing, then restores
# those exact coordinates before save/render. Topology, material ownership and
# response, V41 lighting, camera and all non-crown content remain frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V41_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v41.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v41_for_v43', V41_PATH)
v41 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v41)

v36 = v41.v36
v10 = v41.v10
v1 = v41.v1

CREST_START_Z = 3.72
CREST_FULL_WEIGHT_Z = 4.02
LAPLACIAN_LAMBDA = 0.22
LAPLACIAN_ITERATIONS = 3
SMOOTH_PROFILE = 'TOP_LOCALIZED_VOLUME_PRESERVING_LAPLACIAN_WITH_EXACT_LOW_ZONE_PIN_RESTORE'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def set_active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def vertex_sha(mesh):
    h = hashlib.sha256()
    for v in mesh.vertices:
        h.update(struct.pack('<fff', *v.co))
    return h.hexdigest()


def indexed_coord_sha(mesh, indices):
    h = hashlib.sha256()
    for i in indices:
        v = mesh.vertices[i]
        h.update(struct.pack('<Ifff', i, *v.co))
    return h.hexdigest()


def topology_material_sha(mesh):
    h = hashlib.sha256()
    for p in mesh.polygons:
        h.update(struct.pack('<II', p.material_index, len(p.vertices)))
        for vi in p.vertices:
            h.update(struct.pack('<I', vi))
    return h.hexdigest()


def material_slot_names(obj):
    return [m.name if m else None for m in obj.data.materials]


def smoothstep(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def apply_v43_pinned_crest_surface(union, scene):
    mesh = union.data
    before_vertex_count = len(mesh.vertices)
    before_polygon_count = len(mesh.polygons)
    before_vertex_sha = vertex_sha(mesh)
    before_topology_sha = topology_material_sha(mesh)
    before_materials = material_slot_names(union)

    pinned_indices = [v.index for v in mesh.vertices if v.co.z <= CREST_START_Z]
    pinned_coords = {i: mesh.vertices[i].co.copy() for i in pinned_indices}
    pinned_sha_before = indexed_coord_sha(mesh, pinned_indices)

    vg = union.vertex_groups.new(name='V43CrestSmoothWeight')
    weighted = 0
    full_weight = 0
    for v in mesh.vertices:
        if v.co.z <= CREST_START_Z:
            continue
        t = (v.co.z - CREST_START_Z) / max(1e-9, CREST_FULL_WEIGHT_Z - CREST_START_Z)
        w = smoothstep(t)
        if w <= 0.0:
            continue
        vg.add([v.index], w, 'REPLACE')
        weighted += 1
        if w >= 0.999:
            full_weight += 1
    if weighted <= 0:
        raise RuntimeError('V43 crest weight group is empty')

    mod = union.modifiers.new(name='V43CrestVolumePreservingLaplacian', type='LAPLACIANSMOOTH')
    mod.vertex_group = vg.name
    mod.iterations = LAPLACIAN_ITERATIONS
    mod.lambda_factor = LAPLACIAN_LAMBDA
    mod.lambda_border = 0.0
    mod.use_volume_preserve = True
    mod.use_normalized = True
    mod.use_x = True
    mod.use_y = True
    mod.use_z = True
    set_active(union)
    bpy.ops.object.modifier_apply(modifier=mod.name)

    # Critical V43 correction: restore exact V41 low/root coordinates after the
    # volume-preserving modifier, which otherwise introduces a small global shift.
    for i, co in pinned_coords.items():
        mesh.vertices[i].co = co
    mesh.update()
    # Blender 5.2 may consume/detach the deform group while applying the
    # Laplacian modifier. Re-resolve by name and remove only if it still exists.
    residual_vg = union.vertex_groups.get('V43CrestSmoothWeight')
    if residual_vg is not None:
        union.vertex_groups.remove(residual_vg)

    after_vertex_count = len(mesh.vertices)
    after_polygon_count = len(mesh.polygons)
    after_vertex_sha = vertex_sha(mesh)
    after_topology_sha = topology_material_sha(mesh)
    after_materials = material_slot_names(union)
    pinned_sha_after = indexed_coord_sha(mesh, pinned_indices)

    if before_vertex_count != after_vertex_count:
        raise RuntimeError('V43 changed vertex count')
    if before_polygon_count != after_polygon_count:
        raise RuntimeError('V43 changed polygon count')
    if before_topology_sha != after_topology_sha:
        raise RuntimeError('V43 changed topology/material indices')
    if before_materials != after_materials:
        raise RuntimeError('V43 changed material slots')
    if pinned_sha_before != pinned_sha_after:
        raise RuntimeError('V43 exact low-zone pin restore failed')
    if before_vertex_sha == after_vertex_sha:
        raise RuntimeError('V43 crest smoothing produced no coordinate change')

    changed_upper = 0
    max_upper_displacement = 0.0
    # Original unpinned coordinates are no longer stored individually; receipt
    # uses global SHA plus exact pinned SHA as the hard boundary evidence.
    for v in mesh.vertices:
        if v.index not in pinned_coords and v.co.z > CREST_START_Z:
            changed_upper += 1

    scene['heroVersion'] = 'v43'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_CREST_SMOOTHING_WITH_EXACT_LOW_ZONE_PIN_RESTORE'
    scene['preferredDevelopmentInput'] = 'v41'
    scene['v41MacroRootsAndLayoutFrozen'] = True
    scene['v34MaterialOwnershipFrozen'] = True
    scene['v36MaterialResponseFrozen'] = True
    scene['v41LightingFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    scene['nonCrownAssetsFrozen'] = True
    scene['crownTopologyMaterialIndicesFrozen'] = True
    scene['exactLowZonePinRestore'] = True
    scene['crestSurfaceProfile'] = SMOOTH_PROFILE

    return {
        'beforeVertexCount': before_vertex_count,
        'afterVertexCount': after_vertex_count,
        'beforePolygonCount': before_polygon_count,
        'afterPolygonCount': after_polygon_count,
        'beforeVertexSha256': before_vertex_sha,
        'afterVertexSha256': after_vertex_sha,
        'topologyMaterialSha256': after_topology_sha,
        'materialSlots': after_materials,
        'pinnedLowZoneVertexCount': len(pinned_indices),
        'pinnedLowZoneShaBefore': pinned_sha_before,
        'pinnedLowZoneShaAfter': pinned_sha_after,
        'weightedCrestVertices': weighted,
        'fullWeightCrestVertices': full_weight,
        'unpinnedUpperVertexCountAfter': changed_upper,
    }


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v1.clear_scene()
    scene = bpy.context.scene
    v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene)
    v10.v8.v6.v5.geometry_v5(scene)
    union, components, counts, baseline, kicker_before, kicker_after = v41.build_v41(scene)
    crest = apply_v43_pinned_crest_surface(union, scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v43',
        'assetName': 'Radar Scout 3D Static Hero v43',
        'preferredBaselineInput': 'v10',
        'preferredDevelopmentInput': 'v41',
        'controlledVariable': 'HAIR_CROWN_MACRO_CREST_SMOOTHING_WITH_EXACT_LOW_ZONE_PIN_RESTORE',
        'crestSurfaceProfile': SMOOTH_PROFILE,
        'crestStartZ': CREST_START_Z,
        'crestFullWeightZ': CREST_FULL_WEIGHT_Z,
        'laplacianLambda': LAPLACIAN_LAMBDA,
        'laplacianIterations': LAPLACIAN_ITERATIONS,
        'volumePreserve': True,
        'exactLowZonePinRestore': True,
        'v41MacroRootsAndLayoutFrozen': True,
        'v34MaterialOwnershipFrozen': True,
        'v36MaterialResponseFrozen': True,
        'v41LightingFrozen': True,
        'v6CameraFrozen': True,
        'v6RendererFrozen': True,
        'nonCrownAssetsFrozen': True,
        'crownTopologyMaterialIndicesFrozen': True,
        'crestAudit': crest,
        'materialRegionPolygonCounts': counts,
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
        'renderSucceeded': True,
        'fileName': os.path.basename(output_png),
        'fileFormat': 'PNG',
        'width': width,
        'height': height,
        'channels': channels,
        'alphaPresent': channels == 4,
        'fileSizeBytes': os.path.getsize(output_png),
        'sha256': sha256_file(output_png),
        'blendSource': output_blend,
        'blendSha256': sha256_file(output_blend),
        'blenderExecutable': bpy.app.binary_path,
        'blenderVersion': bpy.app.version_string,
        'renderMode': 'background_cli',
        'renderEngine': scene.render.engine,
        'cameraName': scene.camera.name if scene.camera else None,
        'heroPixelsAuthority': 'BLENDER_RENDER',
        'remotionRedrawAllowed': False,
        'canonicalCandidateModified': False,
        'staticHeroVisualGate': 'PENDING_CONTROLLER_REVIEW',
        'humanSelectedForCanonical': False,
        'riggingPerformed': False,
        'animationPerformed': False,
        'publicationAllowed': False,
        'publicationPerformed': False,
        'analyticsObserved': False,
    }
    with open(output_receipt, 'w', encoding='utf-8') as f:
        json.dump(receipt, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
