import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v9
# Controlled A/B from V8 surface-method direction.
# Keep the V8 integrated strand-bundle representation and exact V6 macro
# centerline envelope; change only bundle organization: authored irregular
# spacing/radii, micro-clump hierarchy and fused-root progressive separation.

HERE = os.path.dirname(os.path.abspath(__file__))
V8_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v8.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v8', V8_PATH)
v8 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v8)

# Six strands per primary clump, deliberately grouped into unequal 2–3 strand
# neighborhoods. These are authored deterministic layouts, not random noise.
PRIMARY_LAYOUTS = (
    ((-0.70,0.76,'pearl'),(-0.53,1.06,'cyan'),(-0.17,0.86,'pearl'),(0.03,1.15,'pearl'),(0.23,0.91,'cyan'),(0.65,0.73,'pearl')),
    ((-0.67,0.80,'cyan'),(-0.39,1.08,'pearl'),(-0.24,0.84,'pearl'),(0.09,1.13,'cyan'),(0.33,0.88,'pearl'),(0.69,0.72,'pearl')),
    ((-0.72,0.74,'pearl'),(-0.50,1.02,'pearl'),(-0.29,0.90,'cyan'),(0.06,1.16,'pearl'),(0.39,0.83,'cyan'),(0.62,0.77,'pearl')),
    ((-0.66,0.78,'cyan'),(-0.48,1.10,'pearl'),(-0.12,0.88,'pearl'),(0.08,1.14,'pearl'),(0.29,0.86,'cyan'),(0.68,0.71,'pearl')),
)

SECONDARY_LAYOUTS = (
    ((-0.67,0.74,'depth'),(-0.44,1.02,'cyan'),(-0.08,1.12,'pearl'),(0.27,0.88,'cyan'),(0.65,0.72,'depth')),
    ((-0.64,0.76,'depth'),(-0.31,1.05,'pearl'),(-0.10,0.91,'cyan'),(0.19,1.11,'pearl'),(0.68,0.70,'depth')),
    ((-0.69,0.72,'depth'),(-0.46,1.00,'cyan'),(0.02,1.14,'pearl'),(0.30,0.90,'pearl'),(0.63,0.75,'depth')),
)

PRIMARY_ROOT_BLEND = (0.16, 0.38, 0.73, 1.00)
SECONDARY_ROOT_BLEND = (0.20, 0.60, 1.00)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def delete_v6_hair():
    for prefix in ('HairRibbonPrimaryV6_', 'HairRibbonDepthV6_', 'HairFiberV6_'):
        for obj in list(bpy.data.objects):
            if obj.name.startswith(prefix):
                bpy.data.objects.remove(obj, do_unlink=True)


def add_fused_bundle_strand(name, points, widths, offset_fraction, material,
                            bevel, radius_scale, root_blend,
                            front=(0.0, -1.0, 0.0), depth_bias=0.0,
                            cadence_bias=0.0):
    pts, axes = v8.local_axes(points, front)
    if len(root_blend) != len(pts):
        raise ValueError('root blend length must match control-point count')

    shifted = []
    for i, (p, axis, width, blend) in enumerate(zip(pts, axes, widths, root_blend)):
        t = i / max(1, len(pts) - 1)
        # Roots converge into a coherent mass, then progressively separate.
        # A tiny authored cadence bias prevents perfectly parallel extrusion
        # without leaving the frozen V6 clump envelope.
        local_fraction = offset_fraction * blend
        local_fraction += cadence_bias * (0.30 + 0.70 * t) * (t - 0.45)
        local_fraction = max(-0.74, min(0.74, local_fraction))
        shifted.append(tuple(
            p + axis * (width * local_fraction) + Vector((0.0, depth_bias * (0.35 + 0.65 * t), 0.0))
        ))

    curve = bpy.data.curves.new(name=name + 'Curve', type='CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 24
    curve.bevel_depth = bevel * radius_scale
    curve.bevel_resolution = 5
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(shifted) - 1)
    for i, (bp, co) in enumerate(zip(spline.bezier_points, shifted)):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
        t = i / max(1, len(shifted) - 1)
        # Larger shared root mass, then tapered lock separation.
        bp.radius = max(0.10, (1.08 - 0.16 * t) * ((1.0 - t) ** 0.52))

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj['sourceAuthoringMethod'] = 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE'
    obj['bundleOrganization'] = 'AUTHORED_IRREGULAR_MICROCLUMPS_WITH_ROOT_FUSION'
    obj['offsetFractionWithinV6Envelope'] = float(offset_fraction)
    obj['rootFusionApplied'] = True
    obj['randomNoiseUsed'] = False
    return obj


def geometry_v9(scene):
    # Build the exact V6 macro hair source first, then remove only its V6 hair
    # surface objects. All non-hair geometry remains inherited/frozen.
    v8.v6.geometry_v6(scene)
    delete_v6_hair()

    # Keep V8 material response fixed; only bundle organization changes.
    pearl = v8.hair_material('ScoutHairBundlePearlV9', 'ScoutHairFiberV6',
                             (0.93, 0.988, 1.0), 0.29, 0.76, 0.12, 0.22)
    cyan = v8.hair_material('ScoutHairBundleCyanV9', 'ScoutHairFiberV6',
                            (0.67, 0.90, 0.98), 0.31, 0.72, 0.10, 0.20)
    depth = v8.hair_material('ScoutHairBundleDepthV9', 'ScoutHairDepthV6',
                             (0.22, 0.50, 0.64), 0.36, 0.62, 0.08, 0.16)
    mats = {'pearl': pearl, 'cyan': cyan, 'depth': depth}

    primary_count = 0
    secondary_count = 0

    for ci, (points, widths) in enumerate(v8.V6_PRIMARY, 1):
        layout = PRIMARY_LAYOUTS[(ci - 1) % len(PRIMARY_LAYOUTS)]
        for si, (off, scale, mat_key) in enumerate(layout, 1):
            cadence = ((ci % 3) - 1) * 0.018 + ((si % 2) * 2 - 1) * 0.010
            add_fused_bundle_strand(
                f'HairBundlePrimaryV9_{ci:02d}_{si:02d}',
                points, widths, off, mats[mat_key], 0.052, scale,
                PRIMARY_ROOT_BLEND,
                depth_bias=-0.0045 * abs(off) + (0.0015 if si % 3 == 0 else 0.0),
                cadence_bias=cadence,
            )
            primary_count += 1

    for ci, (points, widths) in enumerate(v8.V6_SECONDARY, 1):
        layout = SECONDARY_LAYOUTS[(ci - 1) % len(SECONDARY_LAYOUTS)]
        for si, (off, scale, mat_key) in enumerate(layout, 1):
            cadence = ((ci % 2) * 2 - 1) * 0.014 + (si - 3) * 0.004
            add_fused_bundle_strand(
                f'HairBundleDepthV9_{ci:02d}_{si:02d}',
                points, widths, off, mats[mat_key], 0.041, scale,
                SECONDARY_ROOT_BLEND,
                front=(0.0, 1.0, 0.0),
                depth_bias=0.0075 + 0.0015 * (si % 2),
                cadence_bias=cadence,
            )
            secondary_count += 1

    scene['heroVersion'] = 'v9'
    scene['controlledVariable'] = 'HAIR_BUNDLE_IRREGULARITY_AND_ROOT_FUSION'
    scene['hairSurfaceAuthoringMethod'] = 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE'
    scene['bundleOrganizationMethod'] = 'AUTHORED_IRREGULAR_MICROCLUMPS_WITH_ROOT_FUSION'
    scene['v8SurfaceRepresentationFrozen'] = True
    scene['v6PrimaryCenterlinesFrozen'] = True
    scene['v6SecondaryCenterlinesFrozen'] = True
    scene['v6MacroEnvelopeFrozen'] = True
    scene['authoredIrregularSpacing'] = True
    scene['nonUniformRadii'] = True
    scene['microClumpHierarchy'] = True
    scene['rootFusionApplied'] = True
    scene['progressiveRootSeparation'] = True
    scene['randomNoiseUsed'] = False
    scene['primaryBundleStrands'] = primary_count
    scene['secondaryBundleStrands'] = secondary_count
    scene['totalBundleStrands'] = primary_count + secondary_count
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return primary_count, secondary_count


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

    v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v8.v6.v5.v2.v1.build_scene(scene)
    v8.v6.v5.v2.geometry_v2(scene)
    v8.v6.v5.geometry_v5(scene)
    primary_count, secondary_count = geometry_v9(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v9',
        'assetName': 'Radar Scout 3D Static Hero v9',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaselineInput': 'v6',
        'methodDirectionInput': 'v8',
        'controlledVariable': 'HAIR_BUNDLE_IRREGULARITY_AND_ROOT_FUSION',
        'hairSurfaceAuthoringMethod': 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE',
        'bundleOrganizationMethod': 'AUTHORED_IRREGULAR_MICROCLUMPS_WITH_ROOT_FUSION',
        'v8SurfaceRepresentationFrozen': True,
        'v6PrimaryClumpCenterlinesFrozen': len(v8.V6_PRIMARY),
        'v6SecondaryClumpCenterlinesFrozen': len(v8.V6_SECONDARY),
        'v6MacroEnvelopeFrozen': True,
        'authoredIrregularSpacing': True,
        'nonUniformRadii': True,
        'microClumpHierarchy': True,
        'rootFusionApplied': True,
        'progressiveRootSeparation': True,
        'randomNoiseUsed': False,
        'primaryBundleStrands': primary_count,
        'secondaryBundleStrands': secondary_count,
        'totalBundleStrands': primary_count + secondary_count,
        'v6ContinuousHeadFrozen': True,
        'v6EyeSocketAlignmentFrozen': True,
        'v6BodyFrozen': True,
        'v6EarsFrozen': True,
        'v6TabletFrozen': True,
        'v6EnergyTailFrozen': True,
        'v6LightingFrozen': True,
        'v6CameraFrozen': True,
        'v6RendererFrozen': True,
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
        'cameraIntent': 'CHARACTER_BIBLE_3_4_FRONT_HERO',
        'outputTransparent': bool(scene.render.film_transparent),
        'heroPixelsAuthority': 'BLENDER_RENDER',
        'remotionRedrawAllowed': False,
        'heroAssetRedrawn': False,
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
