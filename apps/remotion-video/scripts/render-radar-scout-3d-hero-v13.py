import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v13
# V12 validated crown macro-flow editing as a direction but showed that seven
# independent closed crown clumps inevitably resolve as a regular sawtooth row.
# V13 therefore changes one higher-level variable only: crown compound topology.
# Replace the seven V10 top-fan clumps with four broader compound crown masses.
# Preserve the V10 mass-first generator/material response, primary clumps 8-14,
# every secondary clump, all non-hair geometry, lighting, camera and renderer.

HERE = os.path.dirname(os.path.abspath(__file__))
V10_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v10.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v10', V10_PATH)
v10 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v10)


# Four broad crest groups replace V10 primary crown clumps 1-7. Their roots
# overlap deliberately so the first read is one crown mass, not seven petals.
COMPOUND_CROWN = [
    (
        [(-0.72, -0.12, 3.47), (-0.83, -0.28, 3.65), (-0.88, -0.40, 3.83), (-0.91, -0.45, 3.96)],
        [0.36, 0.32, 0.20, 0.052],
        'LEFT_OUTER',
    ),
    (
        [(-0.34, -0.34, 3.58), (-0.40, -0.50, 3.78), (-0.42, -0.63, 3.98), (-0.43, -0.68, 4.11)],
        [0.40, 0.35, 0.21, 0.050],
        'LEFT_CENTER',
    ),
    (
        [(0.15, -0.39, 3.60), (0.20, -0.54, 3.79), (0.25, -0.65, 3.97), (0.30, -0.69, 4.09)],
        [0.40, 0.35, 0.21, 0.050],
        'RIGHT_CENTER',
    ),
    (
        [(0.55, -0.25, 3.53), (0.66, -0.39, 3.70), (0.74, -0.48, 3.86), (0.79, -0.50, 3.97)],
        [0.36, 0.31, 0.19, 0.052],
        'RIGHT_OUTER',
    ),
]


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def delete_v10_hair():
    for prefix in ('HairMassPrimaryV10_', 'HairMassDepthV10_'):
        for obj in list(bpy.data.objects):
            if obj.name.startswith(prefix):
                bpy.data.objects.remove(obj, do_unlink=True)


def geometry_v13(scene):
    v10.geometry_v10(scene)
    delete_v10_hair()

    pearl = v10.v8.hair_material(
        'ScoutHairMassPearlV13', 'ScoutHairMassPearlV10',
        (0.93, 0.988, 1.0), 0.30, 0.72, 0.10, 0.19,
    )
    cyan = v10.v8.hair_material(
        'ScoutHairMassCyanV13', 'ScoutHairMassCyanV10',
        (0.70, 0.91, 0.98), 0.32, 0.68, 0.08, 0.17,
    )
    depth = v10.v8.hair_material(
        'ScoutHairMassDepthV13', 'ScoutHairMassDepthV10',
        (0.24, 0.52, 0.66), 0.37, 0.58, 0.06, 0.13,
    )

    crown_count = 0
    for ci, (points, widths, family) in enumerate(COMPOUND_CROWN, 1):
        obj = v10.add_mass_clump(
            f'HairMassCompoundCrownV13_{ci:02d}', points, widths,
            pearl if ci in (1, 3) else cyan,
            front=(0.0, -1.0, 0.0), depth_scale=0.53,
            radial_segments=18, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.046, phase=(ci % 4) * 0.24,
            root_mass=1.22, depth_bias=-0.003 if ci % 2 else 0.0,
        )
        obj['compoundCrownMass'] = True
        obj['compoundCrownFamily'] = family
        obj['replacesV10CrownPrimaryCount'] = 7
        obj['visibleCrownTipTargetCount'] = 4
        crown_count += 1

    # Freeze V10 primary clumps 8-14 exactly: two side-framing pairs + three bangs.
    frozen_primary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_PRIMARY[7:], 8):
        obj = v10.add_mass_clump(
            f'HairMassPrimaryV13_{ci:02d}', points, widths,
            pearl if ci % 3 != 0 else cyan,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.050 if ci <= 7 else 0.045,
            phase=(ci % 4) * 0.27, root_mass=1.18,
            depth_bias=-0.004 if ci % 2 else 0.0,
        )
        obj['centerlineAndWidthsFrozenFromV10'] = True
        frozen_primary_count += 1

    secondary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_SECONDARY, 1):
        obj = v10.add_mass_clump(
            f'HairMassDepthV13_{ci:02d}', points, widths,
            depth if ci in (1, 6) else cyan,
            front=(0.0, 1.0, 0.0), depth_scale=0.46,
            radial_segments=14, relief_lobes=5,
            relief_amount=0.042, phase=(ci % 3) * 0.31,
            root_mass=1.15, depth_bias=0.010,
        )
        obj['centerlineAndWidthsFrozenFromV10'] = True
        secondary_count += 1

    primary_total = crown_count + frozen_primary_count
    total = primary_total + secondary_count
    scene['heroVersion'] = 'v13'
    scene['preferredBaselineInput'] = 'v10'
    scene['controlledVariable'] = 'HAIR_CROWN_COMPOUND_MASS_AND_VISIBLE_TIP_COUNT_REDUCTION'
    scene['hairSurfaceAuthoringMethod'] = 'MASS_FIRST_COMPOUND_CROWN_TOPOLOGY'
    scene['v10MassFirstGeneratorFrozen'] = True
    scene['v10MaterialResponseFrozen'] = True
    scene['v10EmbeddedFiberReliefPrincipleFrozen'] = True
    scene['replacedV10CrownPrimaryClumps'] = 7
    scene['compoundCrownMasses'] = crown_count
    scene['visibleCrownTipTargetCount'] = 4
    scene['frozenV10PrimaryClumps8Through14'] = frozen_primary_count
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['contiguousVolumetricClumps'] = True
    scene['embeddedFiberRelief'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['primaryMassClumps'] = primary_total
    scene['secondaryMassClumps'] = secondary_count
    scene['totalMassClumps'] = total
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return crown_count, frozen_primary_count, secondary_count


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

    v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v10.v8.v6.v5.v2.v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene)
    v10.v8.v6.v5.geometry_v5(scene)
    crown_count, frozen_primary_count, secondary_count = geometry_v13(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)
    primary_total = crown_count + frozen_primary_count

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v13',
        'assetName': 'Radar Scout 3D Static Hero v13',
        'preferredBaselineInput': 'v10',
        'controlledVariable': 'HAIR_CROWN_COMPOUND_MASS_AND_VISIBLE_TIP_COUNT_REDUCTION',
        'hairSurfaceAuthoringMethod': 'MASS_FIRST_COMPOUND_CROWN_TOPOLOGY',
        'v10MassFirstGeneratorFrozen': True,
        'v10MaterialResponseFrozen': True,
        'v10EmbeddedFiberReliefPrincipleFrozen': True,
        'replacedV10CrownPrimaryClumps': 7,
        'compoundCrownMasses': crown_count,
        'visibleCrownTipTargetCount': 4,
        'frozenV10PrimaryClumps8Through14': frozen_primary_count,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
        'contiguousVolumetricClumps': True,
        'embeddedFiberRelief': True,
        'separateVisibleFiberTubes': False,
        'primaryMassClumps': primary_total,
        'secondaryMassClumps': secondary_count,
        'totalMassClumps': primary_total + secondary_count,
        'compoundCrownDefinition': [
            {'family': family, 'points': [list(p) for p in points], 'widths': list(widths)}
            for points, widths, family in COMPOUND_CROWN
        ],
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
