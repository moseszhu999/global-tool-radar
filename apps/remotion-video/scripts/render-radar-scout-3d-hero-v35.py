import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v35
# V34 proved post-remesh material ownership works, while its production palette
# was too subtle (0.20/255 crown RGB MAD). A diagnostic probe proved the same
# exact geometry/regions can drive 5.40/255. V35 keeps V34's exact final mesh and
# region ownership and changes only material dynamic range to a production-grade
# middle point: bright central primaries, quieter/darker outer secondaries.

HERE = os.path.dirname(os.path.abspath(__file__))
V34_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v34.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v34', V34_PATH)
v34 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v34)
v30 = v34.v30
v29 = v34.v29
v26 = v34.v26
v23 = v34.v23
v18 = v34.v18
v10 = v34.v10

MATERIAL_PROFILE = 'CALIBRATED_PRIMARY_BRIGHT__SECONDARY_DEPTH_CYAN'
MATERIAL_NAMES = (
    'ScoutHairMacroSecondaryLeftV35',
    'ScoutHairMacroPrimaryPearlV35',
    'ScoutHairMacroPrimaryCyanV35',
    'ScoutHairMacroSecondaryRightV35',
)

# Base color, roughness, anisotropic, coat, sheen.
PROFILES = (
    ((0.56, 0.76, 0.84), 0.43, 0.56, 0.035, 0.11),
    ((0.985, 0.998, 1.00), 0.22, 0.88, 0.20, 0.25),
    ((0.43, 0.79, 0.98), 0.255, 0.84, 0.16, 0.22),
    ((0.48, 0.68, 0.78), 0.45, 0.53, 0.030, 0.10),
)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def calibrate_materials(union):
    setter = v10.v8.v6.v5.v2.v1.set_input
    for i, (material, profile) in enumerate(zip(union.data.materials, PROFILES)):
        material.name = MATERIAL_NAMES[i]
        material.use_nodes = True
        bsdf = material.node_tree.nodes.get('Principled BSDF')
        if bsdf is None:
            raise RuntimeError(f'Principled BSDF missing for V35 material slot {i}')
        base, roughness, anisotropic, coat, sheen = profile
        setter(bsdf, ['Base Color'], (*base, 1.0))
        setter(bsdf, ['Roughness'], roughness)
        setter(bsdf, ['Metallic'], 0.015)
        setter(bsdf, ['Anisotropic IOR Level', 'Anisotropic'], anisotropic)
        setter(bsdf, ['Coat Weight', 'Clearcoat'], coat)
        setter(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], min(0.24, roughness))
        setter(bsdf, ['Sheen Weight', 'Sheen'], sheen)
    union['materialProfile'] = MATERIAL_PROFILE
    union['v34MaterialRegionOwnershipFrozen'] = True
    union['v30FinalGeometryFrozen'] = True


def build_v35(scene):
    union, components, counts = v34.build_v34(scene)
    union.name = 'HairCrownCalibratedMaterialContrastV35'
    union.data.name = 'HairCrownCalibratedMaterialContrastV35Mesh'
    calibrate_materials(union)
    union['sourceAuthoringMethod'] = 'EXACT_V30_GEOMETRY_V34_REGIONS_WITH_CALIBRATED_MATERIAL_CONTRAST'

    scene['heroVersion'] = 'v35'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredGeometryInput'] = 'v30'
    scene['preferredMaterialOwnershipInput'] = 'v34'
    scene['controlledVariable'] = 'HAIR_CROWN_CALIBRATED_POST_REMESH_MATERIAL_CONTRAST'
    scene['hairSurfaceAuthoringMethod'] = 'EXACT_V30_GEOMETRY_V34_REGIONS_WITH_CALIBRATED_MATERIAL_CONTRAST'
    scene['v30FinalGeometryFrozen'] = True
    scene['v34MaterialRegionOwnershipFrozen'] = True
    scene['materialProfile'] = MATERIAL_PROFILE
    scene['v6LightingFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    return union, components, counts


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
    union, components, counts = build_v35(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v35',
        'assetName': 'Radar Scout 3D Static Hero v35',
        'preferredBaselineInput': 'v10',
        'preferredGeometryInput': 'v30',
        'preferredMaterialOwnershipInput': 'v34',
        'controlledVariable': 'HAIR_CROWN_CALIBRATED_POST_REMESH_MATERIAL_CONTRAST',
        'hairSurfaceAuthoringMethod': 'EXACT_V30_GEOMETRY_V34_REGIONS_WITH_CALIBRATED_MATERIAL_CONTRAST',
        'v30FinalGeometryFrozen': True,
        'v34MaterialRegionOwnershipFrozen': True,
        'postRemeshMaterialRegionAssignment': True,
        'materialRegionPolygonCounts': counts,
        'materialProfile': MATERIAL_PROFILE,
        'materialNames': list(MATERIAL_NAMES),
        'materialProfiles': [list(x[0]) + list(x[1:]) for x in PROFILES],
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
