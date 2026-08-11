import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v14
# V11-V13 established that independently capped crown clumps remain visibly
# modular even after taper, endpoint-flow and visible-tip-count changes.
# V14 changes one representation-level variable only: the top crown becomes a
# single continuous closed shell with low-amplitude embedded crest relief.
# Preserve V10 materials, primary clumps 8-14, all secondary hair, all non-hair
# geometry, lighting, camera, renderer and production boundaries.

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


def add_continuous_crown_shell(name, pearl, cyan):
    # Ellipsoidal scalp cap. The lower ring is intentionally inside/behind the
    # frozen side locks and bangs; only the crown silhouette is the experiment.
    cx, cy, cz = 0.0, -0.05, 3.34
    rx, ry, rz = 1.01, 0.72, 0.86
    azimuth_segments = 40
    ring_count = 10
    max_polar = math.radians(72.0)

    verts = []
    faces = []

    # Top pole first.
    verts.append((cx, cy, cz + rz))

    # Rings run from near-pole to the lower crown boundary.
    for ri in range(1, ring_count + 1):
        t = ri / ring_count
        polar = max_polar * t
        sinp = math.sin(polar)
        cosp = math.cos(polar)
        upper_gain = (1.0 - t) ** 0.72
        for si in range(azimuth_segments):
            az = 2.0 * math.pi * si / azimuth_segments
            # One continuous surface, with broad crest relief embossed into it.
            # Relief is strongest over the front-facing crown (negative Y) and
            # fades to zero at the lower attachment ring to prevent tooth tips.
            front_weight = max(0.0, -math.sin(az))
            crest = 0.5 + 0.5 * math.cos(4.0 * az + 0.35)
            relief = 0.045 * upper_gain * front_weight * (0.35 + 0.65 * crest)
            side_relief = 1.0 + relief
            x = cx + rx * sinp * math.cos(az) * side_relief
            y = cy + ry * sinp * math.sin(az) * side_relief
            z = cz + rz * cosp + 0.050 * upper_gain * front_weight * crest
            verts.append((x, y, z))

    # Pole fan.
    first_ring = 1
    for si in range(azimuth_segments):
        sj = (si + 1) % azimuth_segments
        faces.append((0, first_ring + si, first_ring + sj))

    # Ring quads.
    for ri in range(ring_count - 1):
        a0 = 1 + ri * azimuth_segments
        b0 = 1 + (ri + 1) * azimuth_segments
        for si in range(azimuth_segments):
            sj = (si + 1) % azimuth_segments
            faces.append((a0 + si, b0 + si, b0 + sj, a0 + sj))

    # Close the shell underneath with one interior center vertex. The cap sits
    # within the head/hair overlap and is not intended as visible crown detail.
    bottom_center = len(verts)
    verts.append((cx, cy, cz + 0.18))
    last = 1 + (ring_count - 1) * azimuth_segments
    for si in range(azimuth_segments):
        sj = (si + 1) % azimuth_segments
        faces.append((bottom_center, last + sj, last + si))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(pearl)
    obj.data.materials.append(cyan)

    # Keep exact V10 material parameter response. A small subset of front crest
    # sectors uses the copied cyan material, but there are no separate objects.
    for poly in mesh.polygons:
        poly.use_smooth = True
        if len(poly.vertices) >= 3:
            center = poly.center if hasattr(poly, 'center') else None
        poly.material_index = 0

    # Use face index / azimuth sector to create broad, embedded material accents
    # without creating independent locks or geometry seams.
    pole_faces = azimuth_segments
    for fi, poly in enumerate(mesh.polygons):
        if fi < pole_faces:
            sector = fi
        else:
            sector = fi % azimuth_segments
        # Two restrained cyan accent families; most shell surface stays pearl.
        if sector in range(6, 10) or sector in range(30, 34):
            poly.material_index = 1

    subdiv = obj.modifiers.new(name='ContinuousCrownSubdivision', type='SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2

    obj['sourceAuthoringMethod'] = 'SINGLE_CONTINUOUS_CROWN_SHELL_WITH_EMBEDDED_CREST_RELIEF'
    obj['singleContinuousClosedCrownSurface'] = True
    obj['independentlyCappedCrownClumps'] = 0
    obj['embeddedCrestRelief'] = True
    obj['separateVisibleFiberTubes'] = False
    obj['azimuthSegments'] = azimuth_segments
    obj['crownRings'] = ring_count
    obj['crestReliefFamilies'] = 4
    return obj


def geometry_v14(scene):
    v10.geometry_v10(scene)
    delete_v10_hair()

    pearl = v10.v8.hair_material(
        'ScoutHairMassPearlV14', 'ScoutHairMassPearlV10',
        (0.93, 0.988, 1.0), 0.30, 0.72, 0.10, 0.19,
    )
    cyan = v10.v8.hair_material(
        'ScoutHairMassCyanV14', 'ScoutHairMassCyanV10',
        (0.70, 0.91, 0.98), 0.32, 0.68, 0.08, 0.17,
    )
    depth = v10.v8.hair_material(
        'ScoutHairMassDepthV14', 'ScoutHairMassDepthV10',
        (0.24, 0.52, 0.66), 0.37, 0.58, 0.06, 0.13,
    )

    crown = add_continuous_crown_shell('HairContinuousCrownShellV14', pearl, cyan)
    crown['replacesV10CrownPrimaryClumps'] = 7

    frozen_primary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_PRIMARY[7:], 8):
        obj = v10.add_mass_clump(
            f'HairMassPrimaryV14_{ci:02d}', points, widths,
            pearl if ci % 3 != 0 else cyan,
            front=(0.0, -1.0, 0.0), depth_scale=0.50,
            radial_segments=16, relief_lobes=6 if ci % 2 else 5,
            relief_amount=0.045, phase=(ci % 4) * 0.27,
            root_mass=1.18, depth_bias=-0.004 if ci % 2 else 0.0,
        )
        obj['centerlineAndWidthsFrozenFromV10'] = True
        frozen_primary_count += 1

    secondary_count = 0
    for ci, (points, widths) in enumerate(v10.v8.V6_SECONDARY, 1):
        obj = v10.add_mass_clump(
            f'HairMassDepthV14_{ci:02d}', points, widths,
            depth if ci in (1, 6) else cyan,
            front=(0.0, 1.0, 0.0), depth_scale=0.46,
            radial_segments=14, relief_lobes=5,
            relief_amount=0.042, phase=(ci % 3) * 0.31,
            root_mass=1.15, depth_bias=0.010,
        )
        obj['centerlineAndWidthsFrozenFromV10'] = True
        secondary_count += 1

    scene['heroVersion'] = 'v14'
    scene['preferredBaselineInput'] = 'v10'
    scene['controlledVariable'] = 'HAIR_CROWN_SINGLE_CONTINUOUS_SHELL_WITH_EMBEDDED_CREST_RELIEF'
    scene['hairSurfaceAuthoringMethod'] = 'SINGLE_CONTINUOUS_CROWN_SHELL_WITH_EMBEDDED_CREST_RELIEF'
    scene['v10MaterialResponseFrozen'] = True
    scene['v10EmbeddedReliefPrincipleFrozen'] = True
    scene['replacedV10CrownPrimaryClumps'] = 7
    scene['continuousCrownShells'] = 1
    scene['independentlyCappedCrownClumps'] = 0
    scene['embeddedCrestReliefFamilies'] = 4
    scene['frozenV10PrimaryClumps8Through14'] = frozen_primary_count
    scene['secondaryCenterlinesAndWidthsFrozen'] = True
    scene['sideFramingPrimaryFrozen'] = True
    scene['centralBangsFrozen'] = True
    scene['separateVisibleFiberTubes'] = False
    scene['primaryHairObjects'] = 1 + frozen_primary_count
    scene['secondaryMassClumps'] = secondary_count
    scene['totalHairObjects'] = 1 + frozen_primary_count + secondary_count
    for key in ('ContinuousHead', 'EyeSocketAlignment', 'Body', 'Ears', 'Tablet', 'EnergyTail', 'Lighting', 'Camera', 'Renderer'):
        scene['v6' + key + 'Frozen'] = True
    return frozen_primary_count, secondary_count


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
    frozen_primary_count, secondary_count = geometry_v14(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v14',
        'assetName': 'Radar Scout 3D Static Hero v14',
        'preferredBaselineInput': 'v10',
        'controlledVariable': 'HAIR_CROWN_SINGLE_CONTINUOUS_SHELL_WITH_EMBEDDED_CREST_RELIEF',
        'hairSurfaceAuthoringMethod': 'SINGLE_CONTINUOUS_CROWN_SHELL_WITH_EMBEDDED_CREST_RELIEF',
        'v10MaterialResponseFrozen': True,
        'v10EmbeddedReliefPrincipleFrozen': True,
        'replacedV10CrownPrimaryClumps': 7,
        'continuousCrownShells': 1,
        'independentlyCappedCrownClumps': 0,
        'embeddedCrestReliefFamilies': 4,
        'frozenV10PrimaryClumps8Through14': frozen_primary_count,
        'secondaryCenterlinesAndWidthsFrozen': True,
        'sideFramingPrimaryFrozen': True,
        'centralBangsFrozen': True,
        'separateVisibleFiberTubes': False,
        'primaryHairObjects': 1 + frozen_primary_count,
        'secondaryMassClumps': secondary_count,
        'totalHairObjects': 1 + frozen_primary_count + secondary_count,
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
