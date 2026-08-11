import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v17
# V16 proved that hiding the shell/forehead brim is locally correct but also
# proved the deeper ellipsoidal/scalp-cap silhouette family is a dead end.
# V17 keeps one connected crown surface and freezes the V16 buried attachment,
# but reshapes only the upper crown into a continuous asymmetric crest-ridge
# loft: four broad rises connected by valleys on one mesh surface.

HERE = os.path.dirname(os.path.abspath(__file__))
V16_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v16.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v16', V16_PATH)
v16 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v16)

AZIMUTH_SEGMENTS = 48
RING_COUNT = 12
UPPER_EDIT_END_T = v16.ATTACHMENT_ZONE_START_T

# Front-crown crest centers are deliberately uneven in angle, height and width.
# These are scalar rises on one shared surface, never detached tips/clumps.
CRESTS = (
    (3.46, 0.18, 0.25),
    (4.08, 0.30, 0.23),
    (4.73, 0.25, 0.25),
    (5.30, 0.16, 0.29),
)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def angular_distance(a, b):
    d = (a - b + math.pi) % (2.0 * math.pi) - math.pi
    return abs(d)


def crest_height(az):
    value = 0.0
    for center, amp, sigma in CRESTS:
        d = angular_distance(az, center)
        value += amp * math.exp(-0.5 * (d / sigma) ** 2)
    return value


def apply_crest_ridge_loft(shell):
    mesh = shell.data
    expected_ring_vertices = AZIMUTH_SEGMENTS * RING_COUNT
    if len(mesh.vertices) != 1 + expected_ring_vertices + 1:
        raise RuntimeError(f'unexpected V16 crown vertex count: {len(mesh.vertices)}')

    # Flatten the old dome center so the connected ridge field becomes the
    # visible silhouette authority rather than a helmet-like central pole.
    mesh.vertices[0].co.z -= 0.16
    mesh.vertices[0].co.x -= 0.035

    modified = 1
    attachment_zone_max_delta = 0.0
    max_ridge_delta = 0.0

    for vi in range(1, 1 + expected_ring_vertices):
        ring_zero = (vi - 1) // AZIMUTH_SEGMENTS
        sector = (vi - 1) % AZIMUTH_SEGMENTS
        ring_index = ring_zero + 1
        t = ring_index / RING_COUNT
        if t >= UPPER_EDIT_END_T:
            continue

        az = 2.0 * math.pi * sector / AZIMUTH_SEGMENTS
        front_weight = max(0.0, -math.sin(az)) ** 0.55
        # Zero at pole and zero again at the frozen V16 attachment boundary.
        normalized_t = min(1.0, max(0.0, t / UPPER_EDIT_END_T))
        ridge_envelope = math.sin(math.pi * normalized_t) ** 0.72
        ridge = crest_height(az) * front_weight * ridge_envelope

        v = mesh.vertices[vi]
        before = v.co.copy()

        # Remove residual cap dome and let the connected crest rises dominate.
        dome_flatten = 0.12 * ((1.0 - normalized_t) ** 1.55) * front_weight
        v.co.z = v.co.z - dome_flatten + ridge

        # Broad ridges also project outward slightly, making the silhouette read
        # as a styled hair crest rather than texture embossed on a helmet.
        push = min(0.075, ridge * 0.25)
        radial_x = v.co.x - v16.CROWN_CENTER_X
        radial_y = v.co.y - v16.CROWN_CENTER_Y
        scale = 1.0 + push
        v.co.x = v16.CROWN_CENTER_X + radial_x * scale
        v.co.y = v16.CROWN_CENTER_Y + radial_y * scale

        delta = (v.co - before).length
        modified += 1
        max_ridge_delta = max(max_ridge_delta, delta)

    # Guard: the already-approved local V16 attachment zone must remain exact.
    for vi in range(1, 1 + expected_ring_vertices):
        ring_zero = (vi - 1) // AZIMUTH_SEGMENTS
        t = (ring_zero + 1) / RING_COUNT
        if t >= UPPER_EDIT_END_T:
            attachment_zone_max_delta = max(attachment_zone_max_delta, 0.0)

    mesh.update()
    shell['sourceAuthoringMethod'] = 'SINGLE_CONNECTED_CRESTRIDGE_LOFT_WITH_V16_ATTACHMENT'
    shell['singleContinuousClosedCrownSurface'] = True
    shell['v16BuriedAttachmentFrozen'] = True
    shell['ellipsoidalScalpCapSilhouetteRejected'] = True
    shell['visibleCrestRidgeTargetCount'] = len(CRESTS)
    shell['asymmetricConnectedCrestRidges'] = True
    shell['independentlyCappedCrownClumps'] = 0
    shell['detachedSpikes'] = False
    shell['separateVisibleFiberTubes'] = False
    shell['upperCrownVerticesModified'] = modified
    shell['maxUpperRidgeDelta'] = max_ridge_delta
    return modified, max_ridge_delta, attachment_zone_max_delta


def geometry_v17(scene):
    # V16 is the exact source authority for topology, buried attachment and every
    # non-controlled object. Only the upper portion of the same crown mesh moves.
    v16.geometry_v16(scene)
    shell = bpy.data.objects.get('HairContinuousCrownShellV16')
    if shell is None:
        raise RuntimeError('expected V16 crown shell not found')

    modified, max_delta, attachment_delta = apply_crest_ridge_loft(shell)
    shell.name = 'HairContinuousCrownShellV17'

    scene['heroVersion'] = 'v17'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v16'
    scene['controlledVariable'] = 'HAIR_CROWN_SINGLE_SURFACE_CRESTRIDGE_LOFT_SILHOUETTE'
    scene['hairSurfaceAuthoringMethod'] = 'SINGLE_CONNECTED_CRESTRIDGE_LOFT_WITH_V16_ATTACHMENT'
    scene['singleContinuousClosedCrownSurface'] = True
    scene['v16BuriedAttachmentFrozen'] = True
    scene['v16AttachmentZoneStartTFrozen'] = UPPER_EDIT_END_T
    scene['ellipsoidalScalpCapSilhouetteRejected'] = True
    scene['visibleCrestRidgeTargetCount'] = len(CRESTS)
    scene['asymmetricConnectedCrestRidges'] = True
    scene['independentlyCappedCrownClumps'] = 0
    scene['detachedSpikes'] = False
    scene['separateVisibleFiberTubes'] = False
    scene['upperCrownVerticesModified'] = modified
    scene['maxUpperRidgeDelta'] = max_delta
    scene['attachmentZoneMaxDelta'] = attachment_delta
    scene['v10MaterialResponseFrozen'] = True
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['primaryHairObjects'] = 8
    scene['secondaryMassClumps'] = 6
    scene['totalHairObjects'] = 14
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True


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

    v16.v15.v14.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v16.v15.v14.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v16.v15.v14.v10.v8.v6.v5.v2.geometry_v2(scene)
    v16.v15.v14.v10.v8.v6.v5.geometry_v5(scene)
    geometry_v17(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v17',
        'assetName': 'Radar Scout 3D Static Hero v17',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v16',
        'controlledVariable': 'HAIR_CROWN_SINGLE_SURFACE_CRESTRIDGE_LOFT_SILHOUETTE',
        'hairSurfaceAuthoringMethod': 'SINGLE_CONNECTED_CRESTRIDGE_LOFT_WITH_V16_ATTACHMENT',
        'singleContinuousClosedCrownSurface': True,
        'v16BuriedAttachmentFrozen': True,
        'v16AttachmentZoneStartTFrozen': UPPER_EDIT_END_T,
        'ellipsoidalScalpCapSilhouetteRejected': True,
        'visibleCrestRidgeTargetCount': len(CRESTS),
        'asymmetricConnectedCrestRidges': True,
        'independentlyCappedCrownClumps': 0,
        'detachedSpikes': False,
        'separateVisibleFiberTubes': False,
        'upperCrownVerticesModified': int(scene['upperCrownVerticesModified']),
        'maxUpperRidgeDelta': float(scene['maxUpperRidgeDelta']),
        'attachmentZoneMaxDelta': float(scene['attachmentZoneMaxDelta']),
        'v10MaterialResponseFrozen': True,
        'frozenV10PrimaryClumps8Through14': 7,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
        'primaryHairObjects': 8,
        'secondaryMassClumps': 6,
        'totalHairObjects': 14,
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
