import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v15
# V14 validated SINGLE_CONTINUOUS_SHELL as the preferred crown representation
# direction but its symmetric ellipsoid read as a helmet / mushroom cap.
# V15 freezes that one-surface topology and changes only macro silhouette plus
# the embedded crest field: lower dome, narrower crown, asymmetric non-periodic
# broad rises. No detached spikes, separate tubes or independently capped locks.

HERE = os.path.dirname(os.path.abspath(__file__))
V14_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v14.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v14', V14_PATH)
v14 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v14)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def angular_distance(a, b):
    d = (a - b + math.pi) % (2.0 * math.pi) - math.pi
    return abs(d)


def crest_field(az):
    # Broad, deliberately non-periodic front-crown rises. These are one smooth
    # scalar field on one surface, not separate locks or capped tip objects.
    crests = (
        (3.38, 0.050, 0.34),
        (4.05, 0.092, 0.30),
        (4.72, 0.074, 0.28),
        (5.32, 0.044, 0.35),
    )
    value = 0.0
    for center, amp, sigma in crests:
        d = angular_distance(az, center)
        value += amp * math.exp(-0.5 * (d / sigma) ** 2)
    return value


def add_asymmetric_continuous_crown(name, pearl, cyan):
    # Lower/narrower than V14 to remove the helmet dome while retaining enough
    # overlap with frozen side locks and bangs to avoid a bald seam.
    cx, cy, cz = -0.015, -0.035, 3.40
    rx, ry, rz = 0.94, 0.665, 0.76
    azimuth_segments = 48
    ring_count = 12
    max_polar = math.radians(74.0)

    verts = [(cx - 0.045, cy - 0.012, cz + rz + 0.025)]
    faces = []

    for ri in range(1, ring_count + 1):
        t = ri / ring_count
        polar = max_polar * t
        sinp, cosp = math.sin(polar), math.cos(polar)
        # Crest influence is strongest through the upper/middle shell and fades
        # smoothly at both pole and attachment ring: no discrete tooth endings.
        crest_envelope = math.sin(math.pi * min(1.0, max(0.0, t))) ** 0.85
        upper_bias = (1.0 - t) ** 0.65
        for si in range(azimuth_segments):
            az = 2.0 * math.pi * si / azimuth_segments
            front_weight = max(0.0, -math.sin(az)) ** 0.70
            crest = crest_field(az) * front_weight * crest_envelope

            # Directional shear prevents a perfectly centered dome. The left
            # side rises earlier; right side rolls down more gradually.
            asym = 0.035 * math.cos(az + 0.42) * front_weight * upper_bias
            radial_relief = 1.0 + 0.028 * front_weight * crest_envelope
            x = cx + rx * sinp * math.cos(az) * radial_relief - 0.035 * upper_bias
            y = cy + ry * sinp * math.sin(az) * radial_relief
            z = cz + rz * cosp + crest + asym
            verts.append((x, y, z))

    first = 1
    for si in range(azimuth_segments):
        sj = (si + 1) % azimuth_segments
        faces.append((0, first + si, first + sj))

    for ri in range(ring_count - 1):
        a0 = 1 + ri * azimuth_segments
        b0 = 1 + (ri + 1) * azimuth_segments
        for si in range(azimuth_segments):
            sj = (si + 1) % azimuth_segments
            faces.append((a0 + si, b0 + si, b0 + sj, a0 + sj))

    bottom_center = len(verts)
    verts.append((cx, cy, cz + 0.16))
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

    for fi, poly in enumerate(mesh.polygons):
        poly.use_smooth = True
        sector = fi % azimuth_segments
        # Broad asymmetrical accents stay on the same continuous geometry.
        if sector in range(7, 11) or sector in range(31, 36):
            poly.material_index = 1
        else:
            poly.material_index = 0

    subdiv = obj.modifiers.new(name='AsymmetricContinuousCrownSubdivision', type='SUBSURF')
    subdiv.subdivision_type = 'CATMULL_CLARK'
    subdiv.levels = 2
    subdiv.render_levels = 2

    obj['sourceAuthoringMethod'] = 'SINGLE_CONTINUOUS_CROWN_SHELL_ASYMMETRIC_CREST_FIELD'
    obj['singleContinuousClosedCrownSurface'] = True
    obj['v14SingleSurfaceTopologyFamilyFrozen'] = True
    obj['independentlyCappedCrownClumps'] = 0
    obj['embeddedCrestRelief'] = True
    obj['asymmetricCrestFamilies'] = 4
    obj['periodicCrestField'] = False
    obj['helmetDomeReduced'] = True
    obj['separateVisibleFiberTubes'] = False
    return obj


def geometry_v15(scene):
    # Build V14 first so all non-controlled objects/materials are inherited from
    # the exact V14 family, then swap only the single crown shell object.
    v14.geometry_v14(scene)
    old = bpy.data.objects.get('HairContinuousCrownShellV14')
    if old is None:
        raise RuntimeError('expected V14 crown shell not found')
    bpy.data.objects.remove(old, do_unlink=True)

    pearl = bpy.data.materials['ScoutHairMassPearlV14']
    cyan = bpy.data.materials['ScoutHairMassCyanV14']
    crown = add_asymmetric_continuous_crown('HairContinuousCrownShellV15', pearl, cyan)
    crown['replacesV14CrownShells'] = 1

    scene['heroVersion'] = 'v15'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredRepresentationInput'] = 'v14'
    scene['controlledVariable'] = 'HAIR_CROWN_CONTINUOUS_SHELL_SILHOUETTE_AND_ASYMMETRIC_CREST_BREAKUP'
    scene['hairSurfaceAuthoringMethod'] = 'SINGLE_CONTINUOUS_CROWN_SHELL_ASYMMETRIC_CREST_FIELD'
    scene['v14SingleSurfaceTopologyFamilyFrozen'] = True
    scene['v10MaterialResponseFrozen'] = True
    scene['replacedV14CrownShells'] = 1
    scene['continuousCrownShells'] = 1
    scene['independentlyCappedCrownClumps'] = 0
    scene['asymmetricCrestFamilies'] = 4
    scene['periodicCrestField'] = False
    scene['helmetDomeReduced'] = True
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

    v14.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v14.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v14.v10.v8.v6.v5.v2.geometry_v2(scene)
    v14.v10.v8.v6.v5.geometry_v5(scene)
    geometry_v15(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v15',
        'assetName': 'Radar Scout 3D Static Hero v15',
        'preferredBaselineInput': 'v10',
        'preferredRepresentationInput': 'v14',
        'controlledVariable': 'HAIR_CROWN_CONTINUOUS_SHELL_SILHOUETTE_AND_ASYMMETRIC_CREST_BREAKUP',
        'hairSurfaceAuthoringMethod': 'SINGLE_CONTINUOUS_CROWN_SHELL_ASYMMETRIC_CREST_FIELD',
        'v14SingleSurfaceTopologyFamilyFrozen': True,
        'v10MaterialResponseFrozen': True,
        'replacedV14CrownShells': 1,
        'continuousCrownShells': 1,
        'independentlyCappedCrownClumps': 0,
        'asymmetricCrestFamilies': 4,
        'periodicCrestField': False,
        'helmetDomeReduced': True,
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
