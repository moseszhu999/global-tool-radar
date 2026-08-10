import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v10
# Method-level correction after v8/v9 showed the visual ceiling of many
# individually beveled curve strands. Preserve V6 macro centerlines/envelope,
# but make every major lock a contiguous volumetric mesh first. Longitudinal
# fiber direction is embedded as shallow surface fluting, never separate tubes.

HERE = os.path.dirname(os.path.abspath(__file__))
V8_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v8.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v8', V8_PATH)
v8 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v8)


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


def sample_centerline(points, widths, subdivisions=4):
    pts = [Vector(p) for p in points]
    out_pts = []
    out_widths = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        wa, wb = widths[i], widths[i + 1]
        for s in range(subdivisions):
            u = s / subdivisions
            # Smoothstep keeps each source control point authoritative while
            # avoiding a visibly faceted tube/lock between the points.
            su = u * u * (3.0 - 2.0 * u)
            out_pts.append(a.lerp(b, su))
            out_widths.append(wa * (1.0 - su) + wb * su)
    out_pts.append(pts[-1])
    out_widths.append(widths[-1])
    return out_pts, out_widths


def frame_axes(pts, index, front):
    if index == 0:
        tangent = (pts[1] - pts[0]).normalized()
    elif index == len(pts) - 1:
        tangent = (pts[-1] - pts[-2]).normalized()
    else:
        tangent = (pts[index + 1] - pts[index - 1]).normalized()
    front_v = Vector(front)
    lateral = front_v.cross(tangent)
    if lateral.length < 1e-6:
        lateral = Vector((1.0, 0.0, 0.0))
    lateral.normalize()
    depth = tangent.cross(lateral)
    if depth.length < 1e-6:
        depth = Vector((0.0, 1.0, 0.0))
    depth.normalize()
    return tangent, lateral, depth


def add_mass_clump(name, points, widths, material, *, front=(0.0, -1.0, 0.0),
                   depth_scale=0.50, radial_segments=16, relief_lobes=6,
                   relief_amount=0.055, phase=0.0, root_mass=1.16,
                   depth_bias=0.0):
    centers, sampled_widths = sample_centerline(points, widths, subdivisions=4)
    verts = []
    faces = []

    for ri, (center, width) in enumerate(zip(centers, sampled_widths)):
        t = ri / max(1, len(centers) - 1)
        _, lateral, depth = frame_axes(centers, ri, front)

        # Hair should read as mass first. Root is intentionally broad and
        # smooth; embedded relief increases only after the clump separates.
        root_gain = 1.0 + (root_mass - 1.0) * ((1.0 - t) ** 2.2)
        half_width = max(0.016, width * root_gain)
        half_depth = max(0.012, width * depth_scale * root_gain)
        relief_strength = relief_amount * (0.20 + 0.80 * (t ** 0.72))

        for si in range(radial_segments):
            theta = 2.0 * math.pi * si / radial_segments
            # Low-amplitude longitudinal fluting is part of the contiguous
            # mesh surface. It cannot detach into visible cable/antenna tubes.
            flute = 1.0 + relief_strength * math.cos(relief_lobes * theta + phase)
            side = math.cos(theta) * half_width * flute
            deep = math.sin(theta) * half_depth * flute
            co = center + lateral * side + depth * deep + Vector((0.0, depth_bias, 0.0))
            verts.append(tuple(co))

    rings = len(centers)
    for ri in range(rings - 1):
        a0 = ri * radial_segments
        b0 = (ri + 1) * radial_segments
        for si in range(radial_segments):
            sj = (si + 1) % radial_segments
            faces.append((a0 + si, a0 + sj, b0 + sj, b0 + si))

    # End caps keep every lock a closed contiguous volume.
    faces.append(tuple(reversed(tuple(range(radial_segments)))))
    last = (rings - 1) * radial_segments
    faces.append(tuple(last + i for i in range(radial_segments)))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)

    for poly in mesh.polygons:
        poly.use_smooth = True

    subdiv = obj.modifiers.new(name='MassFirstSubdivision', type='SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2

    obj['sourceAuthoringMethod'] = 'MASS_FIRST_CONTIGUOUS_CLUMP_WITH_EMBEDDED_FIBER_RELIEF'
    obj['embeddedFiberRelief'] = True
    obj['separateVisibleFiberTubes'] = False
    obj['rootMassFusion'] = True
    obj['radialSegments'] = radial_segments
    obj['reliefLobes'] = relief_lobes
    obj['reliefAmount'] = relief_amount
    return obj


def geometry_v10(scene):
    # Exact V6 remains the macro authority for all non-hair geometry and the
    # hair centerline/width envelope. Replace only its hair surface objects.
    v8.v6.geometry_v6(scene)
    delete_v6_hair()

    pearl = v8.hair_material('ScoutHairMassPearlV10', 'ScoutHairFiberV6',
                             (0.93, 0.988, 1.0), 0.30, 0.72, 0.10, 0.19)
    cyan = v8.hair_material('ScoutHairMassCyanV10', 'ScoutHairFiberV6',
                            (0.70, 0.91, 0.98), 0.32, 0.68, 0.08, 0.17)
    depth = v8.hair_material('ScoutHairMassDepthV10', 'ScoutHairDepthV6',
                             (0.24, 0.52, 0.66), 0.37, 0.58, 0.06, 0.13)

    primary_count = 0
    secondary_count = 0

    for ci, (points, widths) in enumerate(v8.V6_PRIMARY, 1):
        material = pearl if ci % 3 != 0 else cyan
        add_mass_clump(
            f'HairMassPrimaryV10_{ci:02d}', points, widths, material,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.050 if ci <= 7 else 0.045,
            phase=(ci % 4) * 0.27, root_mass=1.18,
            depth_bias=-0.004 if ci % 2 else 0.0,
        )
        primary_count += 1

    for ci, (points, widths) in enumerate(v8.V6_SECONDARY, 1):
        material = depth if ci in (1, 6) else cyan
        add_mass_clump(
            f'HairMassDepthV10_{ci:02d}', points, widths, material,
            front=(0.0, 1.0, 0.0), depth_scale=0.46,
            radial_segments=14, relief_lobes=5,
            relief_amount=0.042, phase=(ci % 3) * 0.31,
            root_mass=1.15, depth_bias=0.010,
        )
        secondary_count += 1

    scene['heroVersion'] = 'v10'
    scene['controlledVariable'] = 'HAIR_CLUMP_MASS_FIRST_SURFACE_WITH_EMBEDDED_FIBER_RELIEF'
    scene['hairSurfaceAuthoringMethod'] = 'MASS_FIRST_CONTIGUOUS_CLUMP_WITH_EMBEDDED_FIBER_RELIEF'
    scene['v6PrimaryCenterlinesFrozen'] = True
    scene['v6SecondaryCenterlinesFrozen'] = True
    scene['v6MacroEnvelopeFrozen'] = True
    scene['contiguousVolumetricClumps'] = True
    scene['embeddedFiberRelief'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['rootMassFusion'] = True
    scene['primaryMassClumps'] = primary_count
    scene['secondaryMassClumps'] = secondary_count
    scene['totalMassClumps'] = primary_count + secondary_count
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
    primary_count, secondary_count = geometry_v10(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v10',
        'assetName': 'Radar Scout 3D Static Hero v10',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaselineInput': 'v6',
        'controlledVariable': 'HAIR_CLUMP_MASS_FIRST_SURFACE_WITH_EMBEDDED_FIBER_RELIEF',
        'hairSurfaceAuthoringMethod': 'MASS_FIRST_CONTIGUOUS_CLUMP_WITH_EMBEDDED_FIBER_RELIEF',
        'v6PrimaryClumpCenterlinesFrozen': len(v8.V6_PRIMARY),
        'v6SecondaryClumpCenterlinesFrozen': len(v8.V6_SECONDARY),
        'v6MacroEnvelopeFrozen': True,
        'contiguousVolumetricClumps': True,
        'embeddedFiberRelief': True,
        'separateVisibleFiberTubes': False,
        'rootMassFusion': True,
        'primaryMassClumps': primary_count,
        'secondaryMassClumps': secondary_count,
        'totalMassClumps': primary_count + secondary_count,
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
