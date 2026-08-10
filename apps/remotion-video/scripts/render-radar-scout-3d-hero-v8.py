import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v8
# Controlled A/B from preferred static baseline v6.
# Replace broad ribbon surfaces with integrated longitudinal strand bundles.
# Preserve V6 macro centerlines/envelope and all non-hair hero geometry.

HERE = os.path.dirname(os.path.abspath(__file__))
V6_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v6.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v6', V6_PATH)
v6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v6)

V6_PRIMARY = [
    ([(-0.76,-0.02,3.43),(-0.92,-0.18,3.63),(-1.04,-0.29,3.82),(-1.13,-0.34,3.97)], [0.24,0.22,0.14,0.018]),
    ([(-0.57,-0.22,3.53),(-0.67,-0.40,3.76),(-0.70,-0.55,3.98),(-0.69,-0.61,4.12)], [0.25,0.23,0.14,0.018]),
    ([(-0.34,-0.37,3.59),(-0.38,-0.55,3.83),(-0.34,-0.70,4.05),(-0.28,-0.75,4.18)], [0.26,0.23,0.14,0.016]),
    ([(-0.10,-0.44,3.62),(-0.09,-0.62,3.87),(-0.04,-0.76,4.08),(0.02,-0.80,4.20)], [0.27,0.24,0.14,0.016]),
    ([(0.14,-0.43,3.61),(0.19,-0.61,3.86),(0.27,-0.73,4.06),(0.34,-0.76,4.17)], [0.27,0.24,0.14,0.016]),
    ([(0.39,-0.34,3.58),(0.50,-0.51,3.80),(0.62,-0.62,4.00),(0.71,-0.65,4.12)], [0.26,0.23,0.14,0.018]),
    ([(0.62,-0.18,3.50),(0.79,-0.33,3.69),(0.96,-0.40,3.87),(1.08,-0.40,3.99)], [0.24,0.21,0.13,0.018]),
    ([(-0.84,-0.10,3.39),(-1.01,-0.29,3.24),(-1.12,-0.42,3.02),(-1.16,-0.48,2.80)], [0.22,0.20,0.12,0.018]),
    ([(-0.73,-0.35,3.29),(-0.82,-0.52,3.10),(-0.85,-0.64,2.89),(-0.82,-0.69,2.72)], [0.20,0.18,0.10,0.016]),
    ([(0.86,-0.08,3.36),(1.04,-0.25,3.21),(1.16,-0.36,3.00),(1.20,-0.40,2.79)], [0.22,0.20,0.12,0.018]),
    ([(0.77,-0.33,3.27),(0.88,-0.49,3.08),(0.92,-0.60,2.87),(0.90,-0.65,2.70)], [0.20,0.18,0.10,0.016]),
    ([(-0.28,-0.57,3.43),(-0.34,-0.72,3.27),(-0.35,-0.81,3.09),(-0.32,-0.84,2.94)], [0.17,0.15,0.08,0.014]),
    ([(0.02,-0.60,3.45),(0.04,-0.75,3.29),(0.07,-0.83,3.12),(0.11,-0.85,2.98)], [0.18,0.16,0.08,0.014]),
    ([(0.30,-0.56,3.42),(0.37,-0.70,3.25),(0.40,-0.78,3.08),(0.38,-0.81,2.95)], [0.17,0.15,0.08,0.014]),
]

V6_SECONDARY = [
    ([(-0.86,0.10,3.45),(-1.00,0.13,3.30),(-1.08,0.11,3.12)], [0.18,0.13,0.025]),
    ([(-0.54,0.28,3.56),(-0.66,0.34,3.39),(-0.72,0.32,3.20)], [0.18,0.13,0.025]),
    ([(-0.18,0.36,3.62),(-0.25,0.43,3.43),(-0.28,0.40,3.22)], [0.19,0.13,0.025]),
    ([(0.20,0.36,3.61),(0.28,0.43,3.42),(0.31,0.39,3.21)], [0.19,0.13,0.025]),
    ([(0.56,0.27,3.54),(0.68,0.33,3.36),(0.74,0.30,3.18)], [0.18,0.13,0.025]),
    ([(0.88,0.08,3.43),(1.02,0.11,3.28),(1.10,0.09,3.10)], [0.18,0.13,0.025]),
]


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def delete_prefix(prefix):
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def hair_material(name, source_name, base, roughness, anisotropic, coat, sheen):
    mat = bpy.data.materials[source_name].copy()
    mat.name = name
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:
        raise RuntimeError('Principled BSDF missing')
    set_input = v6.v5.v2.v1.set_input
    set_input(bsdf, ['Base Color'], (*base, 1.0))
    set_input(bsdf, ['Roughness'], roughness)
    set_input(bsdf, ['Metallic'], 0.015)
    set_input(bsdf, ['Anisotropic IOR Level', 'Anisotropic'], anisotropic)
    set_input(bsdf, ['Coat Weight', 'Clearcoat'], coat)
    set_input(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], min(0.26, roughness + 0.04))
    set_input(bsdf, ['Sheen Weight'], sheen)
    set_input(bsdf, ['Sheen Roughness'], 0.26)
    return mat


def local_axes(points, front):
    pts = [Vector(p) for p in points]
    front_v = Vector(front)
    axes = []
    for i in range(len(pts)):
        if i == 0:
            tangent = (pts[1] - pts[0]).normalized()
        elif i == len(pts) - 1:
            tangent = (pts[-1] - pts[-2]).normalized()
        else:
            tangent = (pts[i + 1] - pts[i - 1]).normalized()
        axis = front_v.cross(tangent)
        if axis.length < 1e-6:
            axis = Vector((1.0, 0.0, 0.0))
        axis.normalize()
        axes.append(axis)
    return pts, axes


def add_bundle_strand(name, points, widths, offset_fraction, material,
                      bevel, front=(0.0, -1.0, 0.0), depth_bias=0.0, radius_scale=1.0):
    pts, axes = local_axes(points, front)
    shifted = [
        tuple(p + axis * (width * offset_fraction) + Vector((0.0, depth_bias, 0.0)))
        for p, axis, width in zip(pts, axes, widths)
    ]
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
        bp.radius = max(0.10, (1.0 - t) ** 0.55)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    obj['sourceAuthoringMethod'] = 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE'
    obj['offsetFractionWithinV6Envelope'] = float(offset_fraction)
    return obj


def geometry_v8(scene):
    v6.geometry_v6(scene)
    delete_prefix('HairRibbonPrimaryV6_')
    delete_prefix('HairRibbonDepthV6_')
    delete_prefix('HairFiberV6_')

    pearl = hair_material('ScoutHairBundlePearlV8', 'ScoutHairFiberV6',
                          (0.93,0.988,1.0), 0.29, 0.76, 0.12, 0.22)
    cyan = hair_material('ScoutHairBundleCyanV8', 'ScoutHairFiberV6',
                         (0.67,0.90,0.98), 0.31, 0.72, 0.10, 0.20)
    depth = hair_material('ScoutHairBundleDepthV8', 'ScoutHairDepthV6',
                          (0.22,0.50,0.64), 0.36, 0.62, 0.08, 0.16)

    primary_offsets = (-0.72,-0.48,-0.24,0.0,0.24,0.48,0.72)
    secondary_offsets = (-0.68,-0.34,0.0,0.34,0.68)
    primary_count = secondary_count = 0

    for ci, (points, widths) in enumerate(V6_PRIMARY, 1):
        for si, off in enumerate(primary_offsets, 1):
            mat = pearl if si in (1,3,5,7) else cyan
            scale = 1.10 if abs(off) < 0.01 else (0.94 if abs(off) < 0.5 else 0.80)
            add_bundle_strand(f'HairBundlePrimaryV8_{ci:02d}_{si:02d}',
                              points, widths, off, mat, 0.050,
                              depth_bias=-0.006 * abs(off), radius_scale=scale)
            primary_count += 1

    for ci, (points, widths) in enumerate(V6_SECONDARY, 1):
        for si, off in enumerate(secondary_offsets, 1):
            mat = depth if si in (1,5) else (cyan if si in (2,4) else pearl)
            scale = 0.90 if abs(off) > 0.5 else 1.0
            add_bundle_strand(f'HairBundleDepthV8_{ci:02d}_{si:02d}',
                              points, widths, off, mat, 0.040,
                              front=(0.0,1.0,0.0), depth_bias=0.008, radius_scale=scale)
            secondary_count += 1

    scene['heroVersion'] = 'v8'
    scene['controlledVariable'] = 'HAIR_STRAND_BUNDLE_SURFACE_METHOD'
    scene['hairSurfaceAuthoringMethod'] = 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE'
    scene['v6PrimaryCenterlinesFrozen'] = True
    scene['v6SecondaryCenterlinesFrozen'] = True
    scene['v6MacroEnvelopeFrozen'] = True
    scene['broadRibbonSurfaceRemoved'] = True
    scene['externalMicroFiberStackingRemoved'] = True
    scene['primaryBundleStrands'] = primary_count
    scene['secondaryBundleStrands'] = secondary_count
    scene['totalBundleStrands'] = primary_count + secondary_count
    for key in ('ContinuousHead','EyeSocketAlignment','Body','Ears','Tablet','EnergyTail','Lighting','Camera','Renderer'):
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

    v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v6.v5.v2.v1.build_scene(scene)
    v6.v5.v2.geometry_v2(scene)
    v6.v5.geometry_v5(scene)
    primary_count, secondary_count = geometry_v8(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v8',
        'assetName': 'Radar Scout 3D Static Hero v8',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaselineInput': 'v6',
        'controlledVariable': 'HAIR_STRAND_BUNDLE_SURFACE_METHOD',
        'hairSurfaceAuthoringMethod': 'INTEGRATED_LONGITUDINAL_STRAND_BUNDLE',
        'v6PrimaryClumpCenterlinesFrozen': len(V6_PRIMARY),
        'v6SecondaryClumpCenterlinesFrozen': len(V6_SECONDARY),
        'v6MacroEnvelopeFrozen': True,
        'broadRibbonSurfaceRemoved': True,
        'externalMicroFiberStackingRemoved': True,
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
        'blenderVersion': '.'.join(map(str, bpy.app.version)),
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
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
