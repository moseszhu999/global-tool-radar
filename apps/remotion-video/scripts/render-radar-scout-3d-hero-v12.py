import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v12
# Controlled follow-up after V11 showed that taper-only refinement was not a
# decisive phone-scale improvement. Preserve V10's mass-first contiguous-clump
# representation and every non-hair production boundary. Change only the last
# two control points of the seven crown/top-fan primary clumps so the crown can
# read as grouped directional flow instead of evenly spaced radial wedges.

HERE = os.path.dirname(os.path.abspath(__file__))
V10_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v10.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v10', V10_PATH)
v10 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v10)


CROWN_FLOW_TARGETS = {
    # left flow family
    1: (-0.98, -0.43, 3.95),
    2: (-0.82, -0.56, 4.06),
    3: (-0.60, -0.67, 4.12),
    # center flow family
    4: (-0.14, -0.76, 4.15),
    5: (0.14, -0.75, 4.12),
    # right flow family
    6: (0.55, -0.61, 4.05),
    7: (0.82, -0.47, 3.96),
}

CROWN_FLOW_FAMILIES = {
    1: 'LEFT_SWEEP', 2: 'LEFT_SWEEP', 3: 'LEFT_SWEEP',
    4: 'CENTER_SWEEP', 5: 'CENTER_SWEEP',
    6: 'RIGHT_SWEEP', 7: 'RIGHT_SWEEP',
}


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


def crown_flow_points(index, points):
    """Change only crown outer flow; root + first mid control point stay exact."""
    pts = [Vector(p) for p in points]
    if index not in CROWN_FLOW_TARGETS:
        return [tuple(p) for p in pts]

    target = Vector(CROWN_FLOW_TARGETS[index])
    original_tip = pts[-1].copy()
    delta = target - original_tip

    # Keep control points 0 and 1 byte-equivalent in value. Translate the
    # penultimate point by only part of the tip delta so the outer third bends
    # into the new family direction rather than kinking at the last segment.
    pts[-2] = pts[-2] + delta * 0.42
    pts[-1] = target
    return [tuple(p) for p in pts]


def geometry_v12(scene):
    # V10 remains the representation authority. Build it first to freeze all
    # non-controlled geometry/material/light/camera behavior, then replace only
    # its mass clumps with the same V10 generator using seven edited crown paths.
    v10.geometry_v10(scene)
    delete_v10_hair()

    pearl = v10.v8.hair_material(
        'ScoutHairMassPearlV12', 'ScoutHairMassPearlV10',
        (0.93, 0.988, 1.0), 0.30, 0.72, 0.10, 0.19,
    )
    cyan = v10.v8.hair_material(
        'ScoutHairMassCyanV12', 'ScoutHairMassCyanV10',
        (0.70, 0.91, 0.98), 0.32, 0.68, 0.08, 0.17,
    )
    depth = v10.v8.hair_material(
        'ScoutHairMassDepthV12', 'ScoutHairMassDepthV10',
        (0.24, 0.52, 0.66), 0.37, 0.58, 0.06, 0.13,
    )

    primary_count = 0
    edited_crown_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_PRIMARY, 1):
        authored_points = crown_flow_points(ci, points)
        obj = v10.add_mass_clump(
            f'HairMassPrimaryV12_{ci:02d}', authored_points, widths,
            pearl if ci % 3 != 0 else cyan,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.050 if ci <= 7 else 0.045,
            phase=(ci % 4) * 0.27, root_mass=1.18,
            depth_bias=-0.004 if ci % 2 else 0.0,
        )
        if ci <= 7:
            obj['crownMacroFlowEdited'] = True
            obj['crownFlowFamily'] = CROWN_FLOW_FAMILIES[ci]
            obj['rootAndFirstMidControlPointsFrozen'] = True
            edited_crown_count += 1
        else:
            obj['centerlineFrozenFromV10'] = True
        primary_count += 1

    secondary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_SECONDARY, 1):
        obj = v10.add_mass_clump(
            f'HairMassDepthV12_{ci:02d}', points, widths,
            depth if ci in (1, 6) else cyan,
            front=(0.0, 1.0, 0.0), depth_scale=0.46,
            radial_segments=14, relief_lobes=5,
            relief_amount=0.042, phase=(ci % 3) * 0.31,
            root_mass=1.15, depth_bias=0.010,
        )
        obj['centerlineFrozenFromV10'] = True
        secondary_count += 1

    scene['heroVersion'] = 'v12'
    scene['preferredBaselineInput'] = 'v10'
    scene['controlledVariable'] = 'HAIR_CROWN_MACRO_FLOW_AND_TIP_CLUSTERING'
    scene['hairSurfaceAuthoringMethod'] = 'MASS_FIRST_CROWN_MACRO_FLOW_CLUSTERING'
    scene['v10RepresentationFamilyFrozen'] = True
    scene['v10MassFirstGeneratorFrozen'] = True
    scene['v10MaterialResponseFrozen'] = True
    scene['crownEditedPrimaryClumps'] = edited_crown_count
    scene['crownFlowFamilyCount'] = 3
    scene['crownRootAndFirstMidControlPointsFrozen'] = True
    scene['sideFramingPrimaryCenterlinesFrozen'] = True
    scene['centralBangCenterlinesFrozen'] = True
    scene['secondaryCenterlinesFrozen'] = True
    scene['crownWidthsFrozen'] = True
    scene['contiguousVolumetricClumps'] = True
    scene['embeddedFiberRelief'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['primaryMassClumps'] = primary_count
    scene['secondaryMassClumps'] = secondary_count
    scene['totalMassClumps'] = primary_count + secondary_count
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return primary_count, secondary_count, edited_crown_count


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
    primary_count, secondary_count, edited_crown_count = geometry_v12(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v12',
        'assetName': 'Radar Scout 3D Static Hero v12',
        'preferredBaselineInput': 'v10',
        'controlledVariable': 'HAIR_CROWN_MACRO_FLOW_AND_TIP_CLUSTERING',
        'hairSurfaceAuthoringMethod': 'MASS_FIRST_CROWN_MACRO_FLOW_CLUSTERING',
        'v10RepresentationFamilyFrozen': True,
        'v10MassFirstGeneratorFrozen': True,
        'v10MaterialResponseFrozen': True,
        'crownEditedPrimaryClumps': edited_crown_count,
        'crownFlowFamilyCount': 3,
        'crownRootAndFirstMidControlPointsFrozen': True,
        'sideFramingPrimaryCenterlinesFrozen': True,
        'centralBangCenterlinesFrozen': True,
        'secondaryCenterlinesFrozen': True,
        'crownWidthsFrozen': True,
        'contiguousVolumetricClumps': True,
        'embeddedFiberRelief': True,
        'separateVisibleFiberTubes': False,
        'primaryMassClumps': primary_count,
        'secondaryMassClumps': secondary_count,
        'totalMassClumps': primary_count + secondary_count,
        'crownTipTargets': {str(k): list(v) for k, v in CROWN_FLOW_TARGETS.items()},
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
