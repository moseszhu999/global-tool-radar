import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v37
# Lighting-only controlled experiment from V36.
# Preserve exact V30 crown geometry, V34 post-remesh material regions,
# V36 material response, camera, light positions/colors, rim lights, kicker,
# catchlight, renderer and all non-light scene content.
# Change only HeroKey/HeroSoftFill energy distribution while preserving
# their combined energy at 2950 W-equivalent Blender units.

HERE = os.path.dirname(os.path.abspath(__file__))
V36_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v36.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v36', V36_PATH)
v36 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v36)

v35 = v36.v35
v34 = v36.v34
v30 = v36.v30
v23 = v36.v23
v18 = v36.v18
v10 = v36.v10
v1 = v10.v8.v6.v5.v2.v1

BASE_KEY_ENERGY = 1900.0
BASE_FILL_ENERGY = 1050.0
V37_KEY_ENERGY = 2250.0
V37_FILL_ENERGY = 700.0
COMBINED_KEY_FILL_ENERGY = 2950.0
LIGHT_PROFILE = 'CONSTANT_TOTAL_KEY_FILL_POWER__KEY_DOMINANT_3P21_TO_1'


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


def apply_v37_lighting(scene):
    before = {name: light_snapshot(name) for name in (
        'HeroKey', 'HeroSoftFill', 'HeroCyanRim', 'HeroPurpleRim',
        'HeroWarmKicker', 'FaceCatchlight'
    )}
    if abs(before['HeroKey']['energy'] - BASE_KEY_ENERGY) > 1e-6:
        raise RuntimeError('unexpected HeroKey baseline energy')
    if abs(before['HeroSoftFill']['energy'] - BASE_FILL_ENERGY) > 1e-6:
        raise RuntimeError('unexpected HeroSoftFill baseline energy')

    bpy.data.objects['HeroKey'].data.energy = V37_KEY_ENERGY
    bpy.data.objects['HeroSoftFill'].data.energy = V37_FILL_ENERGY

    after = {name: light_snapshot(name) for name in before}
    for name in before:
        if name in ('HeroKey', 'HeroSoftFill'):
            continue
        if before[name] != after[name]:
            raise RuntimeError(f'non-target light changed: {name}')
    for name in ('HeroKey', 'HeroSoftFill'):
        b = dict(before[name]); a = dict(after[name])
        b.pop('energy'); a.pop('energy')
        if b != a:
            raise RuntimeError(f'target light changed beyond energy: {name}')

    if abs((after['HeroKey']['energy'] + after['HeroSoftFill']['energy']) - COMBINED_KEY_FILL_ENERGY) > 1e-6:
        raise RuntimeError('key+fill combined energy drifted')

    scene['heroVersion'] = 'v37'
    scene['controlledVariable'] = 'HAIR_CROWN_LIGHTING_KEY_FILL_RATIO_AND_SPECULAR_READABILITY'
    scene['preferredGeometryInput'] = 'v30'
    scene['preferredMaterialOwnershipInput'] = 'v34'
    scene['preferredSurfaceResponseInput'] = 'v36'
    scene['v30FinalGeometryFrozen'] = True
    scene['v34MaterialRegionOwnershipFrozen'] = True
    scene['v36MaterialResponseFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    scene['lightingPositionsFrozen'] = True
    scene['lightingColorsFrozen'] = True
    scene['nonTargetLightsFrozen'] = True
    scene['keyFillCombinedEnergyFrozen'] = True
    scene['baseKeyFillRatio'] = BASE_KEY_ENERGY / BASE_FILL_ENERGY
    scene['v37KeyFillRatio'] = V37_KEY_ENERGY / V37_FILL_ENERGY
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
    before, after = apply_v37_lighting(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v37',
        'assetName': 'Radar Scout 3D Static Hero v37',
        'preferredBaselineInput': 'v10',
        'preferredGeometryInput': 'v30',
        'preferredMaterialOwnershipInput': 'v34',
        'preferredSurfaceResponseInput': 'v36',
        'controlledVariable': 'HAIR_CROWN_LIGHTING_KEY_FILL_RATIO_AND_SPECULAR_READABILITY',
        'lightingProfile': LIGHT_PROFILE,
        'v30FinalGeometryFrozen': True,
        'v34MaterialRegionOwnershipFrozen': True,
        'v36MaterialResponseFrozen': True,
        'v6CameraFrozen': True,
        'v6RendererFrozen': True,
        'lightingPositionsFrozen': True,
        'lightingColorsFrozen': True,
        'nonTargetLightsFrozen': True,
        'keyFillCombinedEnergyFrozen': True,
        'baseKeyEnergy': BASE_KEY_ENERGY,
        'baseFillEnergy': BASE_FILL_ENERGY,
        'baseKeyFillRatio': BASE_KEY_ENERGY / BASE_FILL_ENERGY,
        'v37KeyEnergy': V37_KEY_ENERGY,
        'v37FillEnergy': V37_FILL_ENERGY,
        'v37KeyFillRatio': V37_KEY_ENERGY / V37_FILL_ENERGY,
        'combinedKeyFillEnergy': COMBINED_KEY_FILL_ENERGY,
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
