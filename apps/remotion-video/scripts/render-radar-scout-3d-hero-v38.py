import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v38
# Rim/specular-only controlled experiment from V36.
# V37 showed that redistributing constant key+fill energy had negligible local
# readability leverage. V38 therefore returns key/fill to the V36 baseline and
# changes only the energy balance between the two existing rim lights while
# preserving their combined energy, positions, colors, sizes and every non-rim
# scene property.

HERE = os.path.dirname(os.path.abspath(__file__))
V36_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v36.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v36_for_v38', V36_PATH)
v36 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v36)

v34 = v36.v34
v30 = v36.v30
v23 = v36.v23
v18 = v36.v18
v10 = v36.v10
v1 = v10.v8.v6.v5.v2.v1

BASE_CYAN_RIM_ENERGY = 1750.0
BASE_PURPLE_RIM_ENERGY = 1400.0
V38_CYAN_RIM_ENERGY = 2100.0
V38_PURPLE_RIM_ENERGY = 1050.0
COMBINED_RIM_ENERGY = 3150.0
LIGHT_PROFILE = 'CONSTANT_TOTAL_RIM_POWER__CROWN_BIASED_CYAN_RIM_2_TO_1'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def light_snapshot(name):
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'LIGHT':
        raise RuntimeError(f'missing light {name}')
    return {
        'name': name,
        'type': obj.data.type,
        'energy': float(obj.data.energy),
        'color': [float(x) for x in obj.data.color],
        'location': [float(x) for x in obj.location],
        'rotationEuler': [float(x) for x in obj.rotation_euler],
        'size': float(getattr(obj.data, 'size', 0.0)),
    }


def apply_v38_lighting(scene):
    names = (
        'HeroKey', 'HeroSoftFill', 'HeroCyanRim', 'HeroPurpleRim',
        'HeroWarmKicker', 'FaceCatchlight'
    )
    before = {name: light_snapshot(name) for name in names}
    if abs(before['HeroKey']['energy'] - 1900.0) > 1e-6:
        raise RuntimeError('V36 HeroKey baseline drifted')
    if abs(before['HeroSoftFill']['energy'] - 1050.0) > 1e-6:
        raise RuntimeError('V36 HeroSoftFill baseline drifted')
    if abs(before['HeroCyanRim']['energy'] - BASE_CYAN_RIM_ENERGY) > 1e-6:
        raise RuntimeError('unexpected HeroCyanRim baseline energy')
    if abs(before['HeroPurpleRim']['energy'] - BASE_PURPLE_RIM_ENERGY) > 1e-6:
        raise RuntimeError('unexpected HeroPurpleRim baseline energy')

    bpy.data.objects['HeroCyanRim'].data.energy = V38_CYAN_RIM_ENERGY
    bpy.data.objects['HeroPurpleRim'].data.energy = V38_PURPLE_RIM_ENERGY
    after = {name: light_snapshot(name) for name in names}

    for name in names:
        if name in ('HeroCyanRim', 'HeroPurpleRim'):
            continue
        if before[name] != after[name]:
            raise RuntimeError(f'non-target light changed: {name}')
    for name in ('HeroCyanRim', 'HeroPurpleRim'):
        b = dict(before[name]); a = dict(after[name])
        b.pop('energy'); a.pop('energy')
        if b != a:
            raise RuntimeError(f'target rim changed beyond energy: {name}')
    if abs((after['HeroCyanRim']['energy'] + after['HeroPurpleRim']['energy']) - COMBINED_RIM_ENERGY) > 1e-6:
        raise RuntimeError('combined rim energy drifted')

    scene['heroVersion'] = 'v38'
    scene['controlledVariable'] = 'HAIR_CROWN_RIM_SPECULAR_DIRECTIONALITY_AND_CROWN_EDGE_READABILITY'
    scene['preferredGeometryInput'] = 'v30'
    scene['preferredMaterialOwnershipInput'] = 'v34'
    scene['preferredSurfaceResponseInput'] = 'v36'
    scene['preferredLightingBaselineInput'] = 'v36'
    scene['v30FinalGeometryFrozen'] = True
    scene['v34MaterialRegionOwnershipFrozen'] = True
    scene['v36MaterialResponseFrozen'] = True
    scene['v36KeyFillFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    scene['lightingPositionsFrozen'] = True
    scene['lightingColorsFrozen'] = True
    scene['nonTargetLightsFrozen'] = True
    scene['rimCombinedEnergyFrozen'] = True
    scene['baseRimRatio'] = BASE_CYAN_RIM_ENERGY / BASE_PURPLE_RIM_ENERGY
    scene['v38RimRatio'] = V38_CYAN_RIM_ENERGY / V38_PURPLE_RIM_ENERGY
    scene['lightingProfile'] = LIGHT_PROFILE
    return before, after


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
    union, components, counts = v36.build_v36(scene)
    before, after = apply_v38_lighting(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v38',
        'assetName': 'Radar Scout 3D Static Hero v38',
        'preferredBaselineInput': 'v10',
        'preferredGeometryInput': 'v30',
        'preferredMaterialOwnershipInput': 'v34',
        'preferredSurfaceResponseInput': 'v36',
        'preferredLightingBaselineInput': 'v36',
        'controlledVariable': 'HAIR_CROWN_RIM_SPECULAR_DIRECTIONALITY_AND_CROWN_EDGE_READABILITY',
        'lightingProfile': LIGHT_PROFILE,
        'v30FinalGeometryFrozen': True,
        'v34MaterialRegionOwnershipFrozen': True,
        'v36MaterialResponseFrozen': True,
        'v36KeyFillFrozen': True,
        'v6CameraFrozen': True,
        'v6RendererFrozen': True,
        'lightingPositionsFrozen': True,
        'lightingColorsFrozen': True,
        'nonTargetLightsFrozen': True,
        'rimCombinedEnergyFrozen': True,
        'baseCyanRimEnergy': BASE_CYAN_RIM_ENERGY,
        'basePurpleRimEnergy': BASE_PURPLE_RIM_ENERGY,
        'baseRimRatio': BASE_CYAN_RIM_ENERGY / BASE_PURPLE_RIM_ENERGY,
        'v38CyanRimEnergy': V38_CYAN_RIM_ENERGY,
        'v38PurpleRimEnergy': V38_PURPLE_RIM_ENERGY,
        'v38RimRatio': V38_CYAN_RIM_ENERGY / V38_PURPLE_RIM_ENERGY,
        'combinedRimEnergy': COMBINED_RIM_ENERGY,
        'lightsBefore': before,
        'lightsAfter': after,
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
