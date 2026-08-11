import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v7
# Controlled A/B from preferred static baseline v6.
# ONLY hair micro-fiber density and hair material response may change.
# V6 macro hair silhouette/clump layout/base fiber paths and every non-hair
# hero component, light, camera, renderer and production-truth boundary remain frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V6_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v6.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v6', V6_PATH)
v6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v6)


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def tune_principled(mat, *, base, roughness, coat, coat_roughness, anisotropic, sheen):
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf is None:
        raise RuntimeError(f'Principled BSDF missing in {mat.name}')
    set_input = v6.v5.v2.v1.set_input
    set_input(bsdf, ['Base Color'], (*base, 1.0))
    set_input(bsdf, ['Roughness'], roughness)
    set_input(bsdf, ['Metallic'], 0.01)
    set_input(bsdf, ['Coat Weight', 'Clearcoat'], coat)
    set_input(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], coat_roughness)
    set_input(bsdf, ['Anisotropic IOR Level', 'Anisotropic'], anisotropic)
    set_input(bsdf, ['Sheen Weight', 'Sheen'], sheen)

    # Low-amplitude micro-normal breakup removes the single broad plastic highlight
    # without changing macro geometry or factual/identity-bearing form.
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.name = mat.name + '_FiberMicroNoise'
    noise.inputs['Scale'].default_value = 28.0
    noise.inputs['Detail'].default_value = 3.0
    noise.inputs['Roughness'].default_value = 0.58
    bump = nodes.new('ShaderNodeBump')
    bump.name = mat.name + '_FiberMicroBump'
    bump.inputs['Strength'].default_value = 0.075
    bump.inputs['Distance'].default_value = 0.028
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    if 'Normal' in bsdf.inputs:
        links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def extract_bezier_points(obj):
    if obj.type != 'CURVE' or not obj.data.splines:
        raise RuntimeError(f'expected curve for {obj.name}')
    spline = obj.data.splines[0]
    if spline.type != 'BEZIER':
        raise RuntimeError(f'expected BEZIER curve for {obj.name}')
    return [Vector(bp.co) for bp in spline.bezier_points]


def offset_fiber_points(points, offset_x, offset_y, offset_z, end_splay=0.0):
    out = []
    n = max(1, len(points) - 1)
    for i, p in enumerate(points):
        t = i / n
        # Keep roots tight, allow only microscopic widening toward the tip.
        splay = end_splay * (t * t)
        out.append((
            p.x + offset_x * (0.55 + 0.45 * t) + splay,
            p.y + offset_y * (0.55 + 0.45 * t),
            p.z + offset_z * (0.35 + 0.65 * t),
        ))
    return out


def geometry_v7(scene):
    # V6 owns macro silhouette. We only tune the already-created hair materials.
    hair_fiber = bpy.data.materials.get('ScoutHairFiberV6')
    hair_depth = bpy.data.materials.get('ScoutHairDepthV6')
    if hair_fiber is None or hair_depth is None:
        raise RuntimeError('V6 hair materials missing; V7 must be layered on exact V6 geometry')

    tune_principled(
        hair_fiber,
        base=(0.885, 0.972, 1.0), roughness=0.305,
        coat=0.12, coat_roughness=0.31, anisotropic=0.82, sheen=0.24,
    )
    tune_principled(
        hair_depth,
        base=(0.205, 0.505, 0.64), roughness=0.34,
        coat=0.08, coat_roughness=0.34, anisotropic=0.72, sheen=0.16,
    )

    pearl_micro = hair_fiber.copy()
    pearl_micro.name = 'ScoutHairMicroPearlV7'
    tune_principled(
        pearl_micro,
        base=(0.91, 0.985, 1.0), roughness=0.33,
        coat=0.08, coat_roughness=0.35, anisotropic=0.88, sheen=0.30,
    )
    cyan_micro = hair_depth.copy()
    cyan_micro.name = 'ScoutHairMicroCyanV7'
    tune_principled(
        cyan_micro,
        base=(0.32, 0.67, 0.78), roughness=0.36,
        coat=0.05, coat_roughness=0.38, anisotropic=0.78, sheen=0.20,
    )

    base_fibers = [
        bpy.data.objects.get(f'HairFiberV6_{i:02d}') for i in range(1, 25)
    ]
    if any(obj is None for obj in base_fibers):
        missing = [i for i, obj in enumerate(base_fibers, 1) if obj is None]
        raise RuntimeError(f'V6 base fiber paths missing: {missing}')

    # Three close siblings around every V6 fiber path. Offsets stay tiny so the
    # V6 macro silhouette/clump layout remains visually frozen.
    sibling_offsets = [
        (-0.018, -0.004, 0.008),
        ( 0.016,  0.002,-0.006),
        (-0.006, -0.008,-0.012),
    ]
    micro_count = 0
    for i, obj in enumerate(base_fibers, 1):
        points = extract_bezier_points(obj)
        side_sign = -1.0 if i % 2 else 1.0
        for j, (ox, oy, oz) in enumerate(sibling_offsets, 1):
            material = cyan_micro if ((i + j) % 7 == 0) else pearl_micro
            pts = offset_fiber_points(
                points,
                ox * side_sign,
                oy,
                oz,
                end_splay=(0.006 * side_sign if j == 3 else 0.0),
            )
            v6.add_fiber_strand(
                f'HairMicroFiberV7_{i:02d}_{j:02d}',
                pts,
                material,
                bevel=0.0036 if j < 3 else 0.0030,
            )
            micro_count += 1

    # Additional short boundary fibers create clump-edge breakup, but terminate
    # inside the existing V6 silhouette rather than extending it.
    edge_count = 0
    selected = (1, 3, 5, 7, 8, 10, 12, 14, 16, 18, 20, 22, 24)
    for k, i in enumerate(selected, 1):
        points = extract_bezier_points(base_fibers[i - 1])
        if len(points) < 3:
            continue
        p0, p1, p2 = points[0], points[1], points[-1]
        side = -1.0 if i % 2 else 1.0
        short = [
            (p0.x + 0.010 * side, p0.y - 0.006, p0.z + 0.004),
            (p1.x + 0.020 * side, p1.y - 0.010, p1.z + 0.006),
            (p2.x - 0.010 * side, p2.y + 0.006, p2.z - 0.018),
        ]
        v6.add_fiber_strand(
            f'HairBoundaryFiberV7_{k:02d}', short,
            cyan_micro if k % 4 == 0 else pearl_micro,
            bevel=0.0028,
        )
        edge_count += 1

    scene['heroVersion'] = 'v7'
    scene['controlledVariable'] = 'HAIR_FIBER_DENSITY_AND_MATERIAL_RESPONSE'
    scene['hairMacroSilhouetteFrozen'] = True
    scene['v6PrimaryClumpLayoutFrozen'] = True
    scene['v6SecondaryClumpLayoutFrozen'] = True
    scene['v6BaseFiberPathsFrozen'] = True
    scene['hairMicroFiberSiblingCount'] = micro_count
    scene['hairBoundaryFiberCount'] = edge_count
    scene['hairMicroNormalBreakupAdded'] = True
    scene['hairAnisotropicResponseRetuned'] = True
    scene['hairBroadCoatHighlightReduced'] = True
    return micro_count, edge_count


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v6.v5.v2.v1.build_scene(scene)
    v6.v5.v2.geometry_v2(scene)
    v6.v5.geometry_v5(scene)
    primary_count, secondary_count, base_strand_count = v6.geometry_v6(scene)
    micro_count, boundary_count = geometry_v7(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v7',
        'assetName': 'Radar Scout 3D Static Hero v7',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaselineInput': 'v6',
        'controlledVariable': 'HAIR_FIBER_DENSITY_AND_MATERIAL_RESPONSE',
        'v6HairSourceAuthoringMethod': 'LAYERED_RIBBON_CLUMPS_AND_FIBER_STRANDS',
        'hairPrimaryClumpsFrozen': primary_count,
        'hairSecondaryClumpsFrozen': secondary_count,
        'hairBaseFiberPathsFrozen': base_strand_count,
        'hairMicroFiberSiblingCount': micro_count,
        'hairBoundaryFiberCount': boundary_count,
        'hairTotalVisibleCurveFibers': base_strand_count + micro_count + boundary_count,
        'hairMacroSilhouetteFrozen': True,
        'hairMicroNormalBreakupAdded': True,
        'hairAnisotropicResponseRetuned': True,
        'hairBroadCoatHighlightReduced': True,
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
        json.dump(receipt, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
