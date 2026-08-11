import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v6
# Controlled A/B from preferred static baseline v5.
# Only hair source authoring / hair-specific surface response may change.
# v5 continuous head, eyes, body, ears, tablet, energy tail, lighting, camera,
# renderer and production authority remain frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V5_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v5.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v5', V5_PATH)
v5 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v5)


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def delete_prefix(prefix):
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def copy_hair_material(name, source_name, base, roughness, coat, anisotropic):
    source = bpy.data.materials[source_name]
    mat = source.copy()
    mat.name = name
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:
        raise RuntimeError('Principled BSDF node missing in copied hair material')
    v1 = v5.v2.v1
    v1.set_input(bsdf, ['Base Color'], (*base, 1.0))
    v1.set_input(bsdf, ['Roughness'], roughness)
    v1.set_input(bsdf, ['Metallic'], 0.02)
    v1.set_input(bsdf, ['Coat Weight', 'Clearcoat'], coat)
    v1.set_input(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], min(0.22, roughness))
    v1.set_input(bsdf, ['Anisotropic IOR Level', 'Anisotropic'], anisotropic)
    return mat


def add_ribbon_clump(name, points, widths, material, thickness=0.028, front=(0.0, -1.0, 0.0)):
    if len(points) != len(widths) or len(points) < 3:
        raise ValueError('ribbon clump requires equal point/width arrays with >= 3 points')
    pts = [Vector(p) for p in points]
    front_v = Vector(front)
    verts = []
    for i, (p, width) in enumerate(zip(pts, widths)):
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
        # Slight progressive twist keeps the clump from reading as a flat paper card.
        twist = (i / max(1, len(pts) - 1) - 0.5) * 0.18
        axis = (axis + Vector((0.0, twist, 0.0))).normalized()
        verts.append(tuple(p - axis * width))
        verts.append(tuple(p + axis * width))

    faces = []
    for i in range(len(pts) - 1):
        a = i * 2
        faces.append((a, a + 1, a + 3, a + 2))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for poly in obj.data.polygons:
        poly.use_smooth = True

    solid = obj.modifiers.new('HairRibbonSolidify', 'SOLIDIFY')
    solid.thickness = thickness
    solid.offset = 0.0
    bevel = obj.modifiers.new('HairRibbonBevel', 'BEVEL')
    bevel.width = min(0.035, thickness * 0.9)
    bevel.segments = 3
    subd = obj.modifiers.new('HairRibbonSubdiv', 'SUBSURF')
    subd.subdivision_type = 'CATMULL_CLARK'
    subd.levels = 2
    subd.render_levels = 2
    obj['sourceAuthoringMethod'] = 'LAYERED_CURVED_RIBBON_CLUMP'
    return obj


def add_fiber_strand(name, points, material, bevel=0.010):
    obj = v5.v2.v1.add_curve(name, points, bevel, material)
    obj.data.resolution_u = 20
    obj.data.bevel_resolution = 5
    obj['sourceAuthoringMethod'] = 'BEZIER_FIBER_STRAND'
    return obj


def geometry_v6(scene):
    # Delete only the v2 hair construction inherited by v5.
    delete_prefix('HairBlade')
    delete_prefix('HairShadowBlade')
    delete_prefix('HairBackMass')

    hair_fiber = copy_hair_material(
        'ScoutHairFiberV6', 'ScoutHair',
        base=(0.90, 0.985, 1.0), roughness=0.235, coat=0.30, anisotropic=0.58,
    )
    hair_depth = copy_hair_material(
        'ScoutHairDepthV6', 'ScoutHairShadow',
        base=(0.24, 0.56, 0.69), roughness=0.30, coat=0.20, anisotropic=0.42,
    )

    # Primary directional clumps: broad curved ribbons instead of cones/spikes.
    primary = [
        # crown / top fan
        ([(-0.76,-0.02,3.43),(-0.92,-0.18,3.63),(-1.04,-0.29,3.82),(-1.13,-0.34,3.97)], [0.24,0.22,0.14,0.018]),
        ([(-0.57,-0.22,3.53),(-0.67,-0.40,3.76),(-0.70,-0.55,3.98),(-0.69,-0.61,4.12)], [0.25,0.23,0.14,0.018]),
        ([(-0.34,-0.37,3.59),(-0.38,-0.55,3.83),(-0.34,-0.70,4.05),(-0.28,-0.75,4.18)], [0.26,0.23,0.14,0.016]),
        ([(-0.10,-0.44,3.62),(-0.09,-0.62,3.87),(-0.04,-0.76,4.08),(0.02,-0.80,4.20)], [0.27,0.24,0.14,0.016]),
        ([(0.14,-0.43,3.61),(0.19,-0.61,3.86),(0.27,-0.73,4.06),(0.34,-0.76,4.17)], [0.27,0.24,0.14,0.016]),
        ([(0.39,-0.34,3.58),(0.50,-0.51,3.80),(0.62,-0.62,4.00),(0.71,-0.65,4.12)], [0.26,0.23,0.14,0.018]),
        ([(0.62,-0.18,3.50),(0.79,-0.33,3.69),(0.96,-0.40,3.87),(1.08,-0.40,3.99)], [0.24,0.21,0.13,0.018]),
        # side framing locks
        ([(-0.84,-0.10,3.39),(-1.01,-0.29,3.24),(-1.12,-0.42,3.02),(-1.16,-0.48,2.80)], [0.22,0.20,0.12,0.018]),
        ([(-0.73,-0.35,3.29),(-0.82,-0.52,3.10),(-0.85,-0.64,2.89),(-0.82,-0.69,2.72)], [0.20,0.18,0.10,0.016]),
        ([(0.86,-0.08,3.36),(1.04,-0.25,3.21),(1.16,-0.36,3.00),(1.20,-0.40,2.79)], [0.22,0.20,0.12,0.018]),
        ([(0.77,-0.33,3.27),(0.88,-0.49,3.08),(0.92,-0.60,2.87),(0.90,-0.65,2.70)], [0.20,0.18,0.10,0.016]),
        # softer central bangs
        ([(-0.28,-0.57,3.43),(-0.34,-0.72,3.27),(-0.35,-0.81,3.09),(-0.32,-0.84,2.94)], [0.17,0.15,0.08,0.014]),
        ([(0.02,-0.60,3.45),(0.04,-0.75,3.29),(0.07,-0.83,3.12),(0.11,-0.85,2.98)], [0.18,0.16,0.08,0.014]),
        ([(0.30,-0.56,3.42),(0.37,-0.70,3.25),(0.40,-0.78,3.08),(0.38,-0.81,2.95)], [0.17,0.15,0.08,0.014]),
    ]
    for i, (points, widths) in enumerate(primary, 1):
        add_ribbon_clump(f'HairRibbonPrimaryV6_{i:02d}', points, widths, hair_fiber, thickness=0.030)

    # Secondary depth clumps fill gaps without recreating a helmet/back sphere.
    secondary = [
        ([(-0.86,0.10,3.45),(-1.00,0.13,3.30),(-1.08,0.11,3.12)], [0.18,0.13,0.025]),
        ([(-0.54,0.28,3.56),(-0.66,0.34,3.39),(-0.72,0.32,3.20)], [0.18,0.13,0.025]),
        ([(-0.18,0.36,3.62),(-0.25,0.43,3.43),(-0.28,0.40,3.22)], [0.19,0.13,0.025]),
        ([(0.20,0.36,3.61),(0.28,0.43,3.42),(0.31,0.39,3.21)], [0.19,0.13,0.025]),
        ([(0.56,0.27,3.54),(0.68,0.33,3.36),(0.74,0.30,3.18)], [0.18,0.13,0.025]),
        ([(0.88,0.08,3.43),(1.02,0.11,3.28),(1.10,0.09,3.10)], [0.18,0.13,0.025]),
    ]
    for i, (points, widths) in enumerate(secondary, 1):
        add_ribbon_clump(f'HairRibbonDepthV6_{i:02d}', points, widths, hair_depth, thickness=0.024, front=(0.0, 1.0, 0.0))

    # Fine directional fibers / flyaways break the remaining CG-plastic silhouette.
    strands = [
        [(-0.78,-0.32,3.57),(-0.99,-0.48,3.77),(-1.15,-0.50,3.91)],
        [(-0.63,-0.43,3.64),(-0.79,-0.62,3.86),(-0.86,-0.68,4.01)],
        [(-0.48,-0.52,3.68),(-0.57,-0.70,3.93),(-0.57,-0.75,4.10)],
        [(-0.30,-0.58,3.71),(-0.34,-0.76,3.99),(-0.30,-0.79,4.14)],
        [(-0.12,-0.61,3.73),(-0.10,-0.80,4.00),(-0.05,-0.82,4.16)],
        [(0.08,-0.61,3.73),(0.12,-0.79,4.00),(0.18,-0.80,4.15)],
        [(0.28,-0.57,3.70),(0.35,-0.75,3.96),(0.43,-0.76,4.11)],
        [(0.48,-0.49,3.66),(0.60,-0.66,3.90),(0.70,-0.66,4.05)],
        [(0.67,-0.39,3.60),(0.84,-0.55,3.81),(0.98,-0.54,3.95)],
        [(-0.91,-0.31,3.37),(-1.12,-0.45,3.20),(-1.24,-0.51,3.00)],
        [(-0.78,-0.48,3.25),(-0.94,-0.63,3.06),(-1.00,-0.69,2.85)],
        [(0.93,-0.28,3.34),(1.14,-0.41,3.17),(1.27,-0.46,2.98)],
        [(0.82,-0.45,3.23),(0.99,-0.59,3.03),(1.06,-0.64,2.83)],
        [(-0.37,-0.69,3.35),(-0.44,-0.81,3.17),(-0.45,-0.84,3.00)],
        [(0.40,-0.67,3.33),(0.48,-0.78,3.16),(0.49,-0.81,2.99)],
        [(-0.98,0.03,3.51),(-1.15,0.05,3.40),(-1.26,0.00,3.27)],
        [(0.99,0.01,3.49),(1.17,0.02,3.37),(1.28,-0.03,3.24)],
        [(-0.52,0.31,3.58),(-0.66,0.40,3.45),(-0.76,0.39,3.29)],
        [(0.55,0.30,3.57),(0.70,0.39,3.43),(0.80,0.37,3.27)],
        [(-0.10,0.39,3.65),(-0.15,0.48,3.49),(-0.18,0.45,3.31)],
        [(0.13,0.39,3.64),(0.19,0.47,3.48),(0.22,0.44,3.30)],
        [(-0.23,-0.78,3.28),(-0.28,-0.88,3.14),(-0.27,-0.90,3.00)],
        [(0.20,-0.79,3.27),(0.25,-0.88,3.13),(0.24,-0.90,2.99)],
        [(0.02,-0.82,3.31),(0.04,-0.91,3.16),(0.07,-0.92,3.02)],
    ]
    for i, points in enumerate(strands, 1):
        add_fiber_strand(f'HairFiberV6_{i:02d}', points, hair_fiber, bevel=0.009 if i <= 15 else 0.007)

    scene['heroVersion'] = 'v6'
    scene['controlledVariable'] = 'HAIR_GROOM_AND_STRAND_SURFACE'
    scene['hairSourceAuthoringMethod'] = 'LAYERED_RIBBON_CLUMPS_AND_FIBER_STRANDS'
    scene['hairPrimaryClumps'] = len(primary)
    scene['hairSecondaryClumps'] = len(secondary)
    scene['hairFiberStrands'] = len(strands)
    scene['hairSpecificMaterialChanged'] = True
    scene['v5ContinuousHeadFrozen'] = True
    scene['v5EyeSocketAlignmentFrozen'] = True
    scene['v5BodyFrozen'] = True
    scene['v5EarsFrozen'] = True
    scene['v5TabletFrozen'] = True
    scene['v5EnergyTailFrozen'] = True
    scene['lightingInheritedFromV1'] = True
    scene['cameraInheritedFromV1'] = True
    return len(primary), len(secondary), len(strands)


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

    v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v5.v2.v1.build_scene(scene)
    v5.v2.geometry_v2(scene)
    v5.geometry_v5(scene)
    primary_count, secondary_count, strand_count = geometry_v6(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)

    if not os.path.isfile(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v6',
        'assetName': 'Radar Scout 3D Static Hero v6',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaselineInput': 'v5',
        'controlledVariable': 'HAIR_GROOM_AND_STRAND_SURFACE',
        'hairSourceAuthoringMethod': 'LAYERED_RIBBON_CLUMPS_AND_FIBER_STRANDS',
        'hairPrimaryClumps': primary_count,
        'hairSecondaryClumps': secondary_count,
        'hairFiberStrands': strand_count,
        'hairSpecificMaterialChanged': True,
        'v5ContinuousHeadFrozen': True,
        'v5EyeSocketAlignmentFrozen': True,
        'v5BodyFrozen': True,
        'v5EarsFrozen': True,
        'v5TabletFrozen': True,
        'v5EnergyTailFrozen': True,
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
        'blenderExecutable': sys.argv[0],
        'blenderVersion': bpy.app.version_string,
        'renderMode': 'background_cli',
        'renderEngine': scene.render.engine,
        'cameraName': scene.camera.name if scene.camera else None,
        'cameraIntent': 'CHARACTER_BIBLE_3_4_FRONT_HERO',
        'outputTransparent': bool(scene.render.film_transparent),
        'heroPixelsAuthority': 'BLENDER_RENDER',
        'remotionRedrawAllowed': False,
        'heroAssetRedrawn': False,
        'objectCount': len(bpy.data.objects),
        'materialCount': len(bpy.data.materials),
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
        json.dump(receipt, f, indent=2)
        f.write('\n')
    print(json.dumps(receipt, indent=2))


if __name__ == '__main__':
    main()
