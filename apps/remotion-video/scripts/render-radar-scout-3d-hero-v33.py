import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v33
# Geometry lane is frozen at V30. V33 changes only the material response of the
# four authored macro crown groups so validated geometry is readable at phone scale.
# No points, widths, voxel settings, camera, lights, renderer or non-crown assets change.

HERE = os.path.dirname(os.path.abspath(__file__))
V30_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v30.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v30', V30_PATH)
v30 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v30)
v29 = v30.v29
v26 = v29.v26
v23 = v29.v23
v18 = v29.v18
v10 = v29.v10
v8 = v10.v8

VOXEL_SIZE = v29.VOXEL_SIZE
MATERIAL_PROFILE = 'PRIMARY_BRIGHT_ANISOTROPIC__SECONDARY_DARKER_ROUGHER'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def create_macro_materials():
    return (
        v8.hair_material('ScoutHairMacroSecondaryLeftV33', 'ScoutHairFiberV6',
                         (0.78, 0.90, 0.95), 0.38, 0.64, 0.055, 0.14),
        v8.hair_material('ScoutHairMacroPrimaryPearlV33', 'ScoutHairFiberV6',
                         (0.965, 0.995, 1.0), 0.245, 0.84, 0.16, 0.24),
        v8.hair_material('ScoutHairMacroPrimaryCyanV33', 'ScoutHairFiberV6',
                         (0.62, 0.875, 0.985), 0.275, 0.80, 0.13, 0.21),
        v8.hair_material('ScoutHairMacroSecondaryRightV33', 'ScoutHairFiberV6',
                         (0.70, 0.84, 0.91), 0.40, 0.62, 0.050, 0.13),
    )


def build_material_response_union(scene):
    # Exact V10 production geometry/materials establish all frozen non-crown assets.
    v10.geometry_v10(scene)
    for ci in range(1, 8):
        obj = bpy.data.objects.get(f'HairMassPrimaryV10_{ci:02d}')
        if obj is None:
            raise RuntimeError(f'missing V10 crown object {ci}')
        bpy.data.objects.remove(obj, do_unlink=True)

    materials = create_macro_materials()
    crown = []
    # Exact V30 geometry inputs: same points and width arrays, no mutation.
    for gi, (points, widths) in enumerate(v30.V30_MACRO_GROUPS, 1):
        obj = v29.add_macro_group(f'HairMacroMaterialV33_{gi:02d}', points, widths, materials[gi - 1], gi=gi)
        v18.apply_all_modifiers(obj)
        crown.append(obj)

    pearl_bridge = bpy.data.materials['ScoutHairMassPearlV10']
    bridge = v18.add_buried_root_bridge(pearl_bridge)
    union = v18.join_objects(crown + [bridge], crown[0])
    union.name = 'HairCrownMaterialResponseUnionV33'
    union.data.name = 'HairCrownMaterialResponseUnionV33Mesh'
    union.data.remesh_mode = 'VOXEL'
    union.data.remesh_voxel_size = VOXEL_SIZE
    union.data.remesh_voxel_adaptivity = 0.0
    union.data.use_remesh_fix_poles = True
    union.data.use_remesh_preserve_volume = True
    union.data.use_remesh_preserve_attributes = True
    v18.set_active(union)
    bpy.ops.object.voxel_remesh()
    for poly in union.data.polygons:
        poly.use_smooth = True

    components = v18.connected_component_count(union.data)
    if components != 1:
        raise RuntimeError(f'expected one connected crown after V33 remesh, got {components}')

    union['sourceAuthoringMethod'] = 'V30_GEOMETRY_WITH_FOUR_GROUP_MATERIAL_RESPONSE_HIERARCHY'
    union['v30GeometryInputsFrozen'] = True
    union['v30MacroPointsFrozen'] = True
    union['v30MacroWidthsFrozen'] = True
    union['v30VoxelSettingsFrozen'] = True
    union['materialProfile'] = MATERIAL_PROFILE
    union['materialGroupCount'] = 4
    union['connectedComponentsAfterRemesh'] = components
    union['crownObjectsAfterUnion'] = 1

    scene['heroVersion'] = 'v33'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredGeometryInput'] = 'v30'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_GROUP_MATERIAL_RESPONSE_HIERARCHY'
    scene['hairSurfaceAuthoringMethod'] = 'V30_GEOMETRY_WITH_FOUR_GROUP_MATERIAL_RESPONSE_HIERARCHY'
    scene['v30GeometryInputsFrozen'] = True
    scene['v30MacroPointsFrozen'] = True
    scene['v30MacroWidthsFrozen'] = True
    scene['v30VoxelSettingsFrozen'] = True
    scene['materialProfile'] = MATERIAL_PROFILE
    scene['materialGroupCount'] = 4
    scene['connectedComponentsAfterRemesh'] = components
    scene['crownObjectsAfterUnion'] = 1
    scene['v6LightingFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    return union, components


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

    v23.v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v23.v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v23.v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v23.v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components = build_material_response_union(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v33',
        'assetName': 'Radar Scout 3D Static Hero v33',
        'preferredBaselineInput': 'v10',
        'preferredGeometryInput': 'v30',
        'controlledVariable': 'HAIR_CROWN_MACRO_GROUP_MATERIAL_RESPONSE_HIERARCHY',
        'hairSurfaceAuthoringMethod': 'V30_GEOMETRY_WITH_FOUR_GROUP_MATERIAL_RESPONSE_HIERARCHY',
        'v30GeometryInputsFrozen': True,
        'v30MacroPointsFrozen': True,
        'v30MacroWidthsFrozen': True,
        'v30VoxelSettingsFrozen': True,
        'materialProfile': MATERIAL_PROFILE,
        'materialGroupCount': 4,
        'materialNames': [m.name for m in create_macro_materials()],
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
