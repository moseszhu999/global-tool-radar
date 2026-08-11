import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v16
# V15 retained the preferred SINGLE_CONTINUOUS_SHELL representation and reduced
# the symmetric helmet dome, but direct phone-scale review still showed a clear
# cap-brim read at the lower/front shell boundary above the forehead.
#
# V16 freezes the complete V15 crown shell above its attachment zone and changes
# only the final ~32% of the front-facing lower rings: pull them inward/back into
# the head and bury them downward behind the frozen V10 bangs. No new crest
# topology, materials, detached locks, side hair, secondary hair, lighting,
# camera, renderer, rig, animation or canonical candidate changes are allowed.

HERE = os.path.dirname(os.path.abspath(__file__))
V15_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v15.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v15', V15_PATH)
v15 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v15)

AZIMUTH_SEGMENTS = 48
RING_COUNT = 12
ATTACHMENT_ZONE_START_T = 0.68
CROWN_CENTER_X = -0.015
CROWN_CENTER_Y = -0.035
FRONT_RADIAL_INSET = 0.10
FRONT_REARWARD_SHIFT = 0.14
FRONT_VERTICAL_BURY = 0.18


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def smoothstep01(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


def refine_front_attachment(shell):
    mesh = shell.data
    expected_ring_vertices = AZIMUTH_SEGMENTS * RING_COUNT
    # v15 mesh layout: pole vertex 0, 12x48 ring vertices 1..576, then one
    # hidden underside center vertex. This guard prevents silent drift.
    if len(mesh.vertices) != 1 + expected_ring_vertices + 1:
        raise RuntimeError(f'unexpected V15 crown vertex count: {len(mesh.vertices)}')

    modified = 0
    max_upper_delta = 0.0
    for vi in range(1, 1 + expected_ring_vertices):
        ring_zero = (vi - 1) // AZIMUTH_SEGMENTS
        sector = (vi - 1) % AZIMUTH_SEGMENTS
        ring_index = ring_zero + 1
        t = ring_index / RING_COUNT
        az = 2.0 * math.pi * sector / AZIMUTH_SEGMENTS
        front_weight = max(0.0, -math.sin(az)) ** 0.80

        if t <= ATTACHMENT_ZONE_START_T or front_weight <= 0.0:
            continue

        u = (t - ATTACHMENT_ZONE_START_T) / (1.0 - ATTACHMENT_ZONE_START_T)
        blend = smoothstep01(u) * front_weight
        v = mesh.vertices[vi]
        before = v.co.copy()

        # Shrink only the front/lower shell back toward its own centerline,
        # then push it rearward and downward so the frozen bangs occlude the
        # attachment instead of exposing a horizontal cap-brim edge.
        radial = 1.0 - FRONT_RADIAL_INSET * blend
        v.co.x = CROWN_CENTER_X + (v.co.x - CROWN_CENTER_X) * radial
        v.co.y = v.co.y + FRONT_REARWARD_SHIFT * blend
        v.co.z = v.co.z - FRONT_VERTICAL_BURY * blend

        delta = (v.co - before).length
        modified += 1
        if t <= ATTACHMENT_ZONE_START_T:
            max_upper_delta = max(max_upper_delta, delta)

    mesh.update()
    shell['sourceAuthoringMethod'] = 'V15_SINGLE_SHELL_WITH_BURIED_FOREHEAD_ATTACHMENT'
    shell['v15SingleSurfaceTopologyFrozen'] = True
    shell['v15UpperShellFrozenAboveAttachmentZone'] = True
    shell['attachmentZoneStartT'] = ATTACHMENT_ZONE_START_T
    shell['frontAttachmentRadialInset'] = FRONT_RADIAL_INSET
    shell['frontAttachmentRearwardShift'] = FRONT_REARWARD_SHIFT
    shell['frontAttachmentVerticalBury'] = FRONT_VERTICAL_BURY
    shell['attachmentVerticesModified'] = modified
    shell['visibleCapBrimTargetRemoved'] = True
    shell['independentlyCappedCrownClumps'] = 0
    shell['separateVisibleFiberTubes'] = False
    return modified, max_upper_delta


def geometry_v16(scene):
    # Exact V15 is the authority. Build it unchanged, then edit only the guarded
    # lower/front attachment zone of its one crown shell.
    v15.geometry_v15(scene)
    shell = bpy.data.objects.get('HairContinuousCrownShellV15')
    if shell is None:
        raise RuntimeError('expected V15 crown shell not found')

    modified, max_upper_delta = refine_front_attachment(shell)
    shell.name = 'HairContinuousCrownShellV16'

    scene['heroVersion'] = 'v16'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v15'
    scene['controlledVariable'] = 'HAIR_CROWN_SHELL_FOREHEAD_ATTACHMENT_AND_BRIM_REMOVAL'
    scene['hairSurfaceAuthoringMethod'] = 'V15_SINGLE_SHELL_WITH_BURIED_FOREHEAD_ATTACHMENT'
    scene['v15SingleSurfaceTopologyFrozen'] = True
    scene['v15UpperShellFrozenAboveAttachmentZone'] = True
    scene['v15ReducedDomeFrozen'] = True
    scene['v15AsymmetricCrestFieldFrozen'] = True
    scene['v10MaterialResponseFrozen'] = True
    scene['attachmentZoneStartT'] = ATTACHMENT_ZONE_START_T
    scene['frontAttachmentRadialInset'] = FRONT_RADIAL_INSET
    scene['frontAttachmentRearwardShift'] = FRONT_REARWARD_SHIFT
    scene['frontAttachmentVerticalBury'] = FRONT_VERTICAL_BURY
    scene['attachmentVerticesModified'] = modified
    scene['upperShellMaxDelta'] = max_upper_delta
    scene['visibleCapBrimTargetRemoved'] = True
    scene['continuousCrownShells'] = 1
    scene['independentlyCappedCrownClumps'] = 0
    scene['frozenV10PrimaryClumps8Through14'] = 7
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['separateVisibleFiberTubes'] = False
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

    v15.v14.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v15.v14.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v15.v14.v10.v8.v6.v5.v2.geometry_v2(scene)
    v15.v14.v10.v8.v6.v5.geometry_v5(scene)
    geometry_v16(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v16',
        'assetName': 'Radar Scout 3D Static Hero v16',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v15',
        'controlledVariable': 'HAIR_CROWN_SHELL_FOREHEAD_ATTACHMENT_AND_BRIM_REMOVAL',
        'hairSurfaceAuthoringMethod': 'V15_SINGLE_SHELL_WITH_BURIED_FOREHEAD_ATTACHMENT',
        'v15SingleSurfaceTopologyFrozen': True,
        'v15UpperShellFrozenAboveAttachmentZone': True,
        'v15ReducedDomeFrozen': True,
        'v15AsymmetricCrestFieldFrozen': True,
        'v10MaterialResponseFrozen': True,
        'attachmentZoneStartT': ATTACHMENT_ZONE_START_T,
        'frontAttachmentRadialInset': FRONT_RADIAL_INSET,
        'frontAttachmentRearwardShift': FRONT_REARWARD_SHIFT,
        'frontAttachmentVerticalBury': FRONT_VERTICAL_BURY,
        'attachmentVerticesModified': int(scene['attachmentVerticesModified']),
        'upperShellMaxDelta': float(scene['upperShellMaxDelta']),
        'visibleCapBrimTargetRemoved': True,
        'continuousCrownShells': 1,
        'independentlyCappedCrownClumps': 0,
        'frozenV10PrimaryClumps8Through14': 7,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
        'separateVisibleFiberTubes': False,
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
