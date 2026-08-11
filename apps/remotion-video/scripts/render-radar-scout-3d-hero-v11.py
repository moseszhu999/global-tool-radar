import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v11
# Controlled follow-up to promoted V10. Freeze V10's mass-first family and the
# exact V6 14+6 macro centerline envelope. Change only clump profile taper and
# crown-root continuity; visible strand tubes remain forbidden.

HERE = os.path.dirname(os.path.abspath(__file__))
V10_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v10.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v10', V10_PATH)
v10 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v10)


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


def profile_gain(t, crown_gain=1.20, mid_gain=0.98, tip_gain=0.34):
    if t <= 0.28:
        u = t / 0.28
        s = u * u * (3.0 - 2.0 * u)
        return crown_gain * (1.0 - s) + mid_gain * s
    u = (t - 0.28) / 0.72
    s = u * u * (3.0 - 2.0 * u)
    return mid_gain * (1.0 - s) + tip_gain * s


def crown_overlap_gain(t, overlap=0.18):
    if t >= 0.34:
        return 1.0
    u = t / 0.34
    return 1.0 + overlap * ((1.0 - u) ** 2.4)


def tip_softening(t):
    if t <= 0.72:
        return 1.0, 1.0
    u = (t - 0.72) / 0.28
    return 1.0 - 0.10 * (u ** 1.6), 1.0 - 0.24 * (u ** 1.45)


def add_profiled_mass_clump(name, points, widths, material, *,
                            front=(0.0, -1.0, 0.0), depth_scale=0.50,
                            radial_segments=16, relief_lobes=6,
                            relief_amount=0.050, phase=0.0,
                            crown_gain=1.20, mid_gain=0.98,
                            tip_gain=0.34, crown_overlap=0.18,
                            depth_bias=0.0):
    centers, sampled_widths = v10.sample_centerline(points, widths, subdivisions=4)
    verts, faces = [], []

    for ri, (center, source_width) in enumerate(zip(centers, sampled_widths)):
        t = ri / max(1, len(centers) - 1)
        _, lateral, depth = v10.frame_axes(centers, ri, front)
        authored_profile = profile_gain(t, crown_gain, mid_gain, tip_gain)
        overlap_gain = crown_overlap_gain(t, crown_overlap)
        tip_width_gain, tip_depth_gain = tip_softening(t)
        half_width = max(0.012, source_width * authored_profile * overlap_gain * tip_width_gain)
        half_depth = max(0.009, source_width * depth_scale * authored_profile * overlap_gain * tip_depth_gain)

        # Keep V10's fiber relief subordinate to the mass. Root and tip relief
        # are deliberately reduced so crown continuity and taper remain primary.
        relief_window = math.sin(math.pi * max(0.0, min(1.0, t))) ** 0.72
        relief_strength = relief_amount * (0.16 + 0.84 * relief_window)
        for si in range(radial_segments):
            theta = 2.0 * math.pi * si / radial_segments
            flute = 1.0 + relief_strength * math.cos(relief_lobes * theta + phase)
            side = math.cos(theta) * half_width * flute
            deep = math.sin(theta) * half_depth * flute
            co = center + lateral * side + depth * deep + Vector((0.0, depth_bias, 0.0))
            verts.append(tuple(co))

    rings = len(centers)
    for ri in range(rings - 1):
        a0, b0 = ri * radial_segments, (ri + 1) * radial_segments
        for si in range(radial_segments):
            sj = (si + 1) % radial_segments
            faces.append((a0 + si, a0 + sj, b0 + sj, b0 + si))
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
    subdiv = obj.modifiers.new(name='ProfileTaperSubdivision', type='SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2

    obj['sourceAuthoringMethod'] = 'MASS_FIRST_PROFILE_TAPER_AND_CROWN_CONTINUITY'
    obj['v10RepresentationFamilyFrozen'] = True
    obj['v6MacroCenterlinesFrozen'] = True
    obj['embeddedFiberRelief'] = True
    obj['separateVisibleFiberTubes'] = False
    obj['profileTaperHierarchy'] = True
    obj['crownRootContinuity'] = True
    obj['softenedTipProfile'] = True
    return obj


def geometry_v11(scene):
    # Build V10 first so non-controlled geometry remains identical, then replace
    # only the V10 mass clumps with this single-variable profile experiment.
    v10.geometry_v10(scene)
    delete_v10_hair()

    pearl = v10.v8.hair_material('ScoutHairMassPearlV11', 'ScoutHairMassPearlV10',
                                 (0.93, 0.988, 1.0), 0.30, 0.72, 0.10, 0.19)
    cyan = v10.v8.hair_material('ScoutHairMassCyanV11', 'ScoutHairMassCyanV10',
                                (0.70, 0.91, 0.98), 0.32, 0.68, 0.08, 0.17)
    depth = v10.v8.hair_material('ScoutHairMassDepthV11', 'ScoutHairMassDepthV10',
                                 (0.24, 0.52, 0.66), 0.37, 0.58, 0.06, 0.13)

    primary_count = 0
    secondary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_PRIMARY, 1):
        add_profiled_mass_clump(
            f'HairMassPrimaryV11_{ci:02d}', points, widths,
            pearl if ci % 3 != 0 else cyan,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.046 if ci <= 7 else 0.042,
            phase=(ci % 4) * 0.27,
            crown_gain=1.23 if ci <= 7 else 1.19,
            mid_gain=0.97,
            tip_gain=0.36 if ci in (2, 4, 6, 9, 11, 13) else 0.33,
            crown_overlap=0.22 if ci <= 7 else 0.17,
            depth_bias=-0.004 if ci % 2 else 0.0,
        )
        primary_count += 1

    for ci, (points, widths) in enumerate(v10.v8.V6_SECONDARY, 1):
        add_profiled_mass_clump(
            f'HairMassDepthV11_{ci:02d}', points, widths,
            depth if ci in (1, 6) else cyan,
            front=(0.0, 1.0, 0.0), depth_scale=0.46,
            radial_segments=14, relief_lobes=5, relief_amount=0.038,
            phase=(ci % 3) * 0.31, crown_gain=1.18, mid_gain=0.96,
            tip_gain=0.34, crown_overlap=0.16, depth_bias=0.010,
        )
        secondary_count += 1

    scene['heroVersion'] = 'v11'
    scene['controlledVariable'] = 'HAIR_CLUMP_PROFILE_TAPER_AND_CROWN_CONTINUITY'
    scene['hairSurfaceAuthoringMethod'] = 'MASS_FIRST_PROFILE_TAPER_AND_CROWN_CONTINUITY'
    scene['preferredBaselineInput'] = 'v10'
    scene['v10RepresentationFamilyFrozen'] = True
    scene['v6PrimaryCenterlinesFrozen'] = True
    scene['v6SecondaryCenterlinesFrozen'] = True
    scene['v6MacroEnvelopeFrozen'] = True
    scene['contiguousVolumetricClumps'] = True
    scene['embeddedFiberRelief'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['profileTaperHierarchy'] = True
    scene['crownRootContinuity'] = True
    scene['softenedTipProfile'] = True
    scene['primaryMassClumps'] = primary_count
    scene['secondaryMassClumps'] = secondary_count
    scene['totalMassClumps'] = primary_count + secondary_count
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

    v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v10.v8.v6.v5.v2.v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene)
    v10.v8.v6.v5.geometry_v5(scene)
    primary_count, secondary_count = geometry_v11(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)
    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v11',
        'assetName': 'Radar Scout 3D Static Hero v11',
        'preferredBaselineInput': 'v10',
        'controlledVariable': 'HAIR_CLUMP_PROFILE_TAPER_AND_CROWN_CONTINUITY',
        'hairSurfaceAuthoringMethod': 'MASS_FIRST_PROFILE_TAPER_AND_CROWN_CONTINUITY',
        'v10RepresentationFamilyFrozen': True,
        'v6PrimaryClumpCenterlinesFrozen': len(v10.v8.V6_PRIMARY),
        'v6SecondaryClumpCenterlinesFrozen': len(v10.v8.V6_SECONDARY),
        'v6MacroEnvelopeFrozen': True,
        'contiguousVolumetricClumps': True,
        'embeddedFiberRelief': True,
        'separateVisibleFiberTubes': False,
        'profileTaperHierarchy': True,
        'crownRootContinuity': True,
        'softenedTipProfile': True,
        'primaryMassClumps': primary_count,
        'secondaryMassClumps': secondary_count,
        'totalMassClumps': primary_count + secondary_count,
        'renderSucceeded': True,
        'fileName': os.path.basename(output_png),
        'fileFormat': 'PNG',
        'width': width, 'height': height, 'channels': channels,
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
