import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v4
# Controlled A/B against the preferred v2 baseline.
# Only the head / face source-authoring method changes:
# primitive UV head -> one continuous custom-authored dense mesh.
# v2 body silhouette, tablet, energy tail, eyes, ears, hair, materials,
# lighting, camera, renderer and production authority remain frozen.

HERE = os.path.dirname(os.path.abspath(__file__))
V2_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v2.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v2', V2_PATH)
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def gaussian2(x, z, cx, cz, sx, sz):
    return math.exp(-(((x-cx)/sx)**2 + ((z-cz)/sz)**2) * 0.5)


def build_continuous_head_mesh(name, material):
    # Character-space center/radii follow v2 head placement closely.
    center = (0.0, 0.0, 2.74)
    rx, ry, rz = 0.965, 0.815, 0.945
    lat_steps = 72
    lon_steps = 112

    verts = []
    faces = []

    # Dense single surface. No sphere/disc/curve facial overlays are used.
    # The front of the face is -Y in this scene.
    for i in range(lat_steps + 1):
        theta = math.pi * i / lat_steps
        st = math.sin(theta)
        ct = math.cos(theta)
        for j in range(lon_steps):
            phi = 2.0 * math.pi * j / lon_steps
            cp = math.cos(phi)
            sp = math.sin(phi)

            nx = st * cp
            ny = st * sp
            nz = ct

            # Base ellipsoid.
            x = rx * nx
            y = ry * ny
            z = rz * nz

            # Lower-face silhouette: authored jaw taper and chin narrowing.
            lower = max(0.0, (-nz - 0.10) / 0.90)
            jaw_scale = 1.0 - 0.18 * min(1.0, lower)
            x *= jaw_scale

            # Slight temple compression prevents a toy-like round cranium.
            temple = gaussian2(abs(nx), nz, 0.73, 0.10, 0.18, 0.34)
            x *= (1.0 - 0.055 * temple)

            # Only sculpt the visible front hemisphere.
            if ny < -0.18:
                # Local normalized face coordinates.
                fx = x / rx
                fz = z / rz

                # Forehead plane: mild forward sweep in the central upper face.
                forehead = gaussian2(fx, fz, 0.0, 0.45, 0.48, 0.28)
                y -= 0.050 * forehead

                # Brow ridge is integrated into the same surface.
                brow_l = gaussian2(fx, fz, -0.42, 0.22, 0.18, 0.12)
                brow_r = gaussian2(fx, fz,  0.42, 0.22, 0.18, 0.12)
                y -= 0.045 * (brow_l + brow_r)

                # Eye sockets recess around the frozen v2 eye positions.
                socket_l = gaussian2(fx, fz, -0.42, 0.05, 0.22, 0.21)
                socket_r = gaussian2(fx, fz,  0.42, 0.05, 0.22, 0.21)
                y += 0.090 * (socket_l + socket_r)

                # Cheek / malar planes project below and outside the sockets.
                cheek_l = gaussian2(fx, fz, -0.43, -0.22, 0.24, 0.20)
                cheek_r = gaussian2(fx, fz,  0.43, -0.22, 0.24, 0.20)
                y -= 0.070 * (cheek_l + cheek_r)

                # Central muzzle / nose root, authored into the same skin surface.
                bridge = gaussian2(fx, fz, 0.0, -0.05, 0.16, 0.30)
                tip = gaussian2(fx, fz, 0.0, -0.22, 0.13, 0.12)
                y -= 0.055 * bridge + 0.075 * tip

                # Mouth crease is a shallow integrated recess, not a curve object.
                mouth = gaussian2(fx, fz, 0.0, -0.43, 0.28, 0.055)
                y += 0.020 * mouth

                # Chin plane and jaw break.
                chin = gaussian2(fx, fz, 0.0, -0.60, 0.28, 0.17)
                y -= 0.060 * chin
                jaw_l = gaussian2(fx, fz, -0.50, -0.53, 0.22, 0.20)
                jaw_r = gaussian2(fx, fz,  0.50, -0.53, 0.22, 0.20)
                y += 0.030 * (jaw_l + jaw_r)

            verts.append((center[0] + x, center[1] + y, center[2] + z))

    for i in range(lat_steps):
        row = lon_steps
        for j in range(lon_steps):
            nj = (j + 1) % lon_steps
            a = i * row + j
            b = i * row + nj
            c = (i + 1) * row + nj
            d = (i + 1) * row + j
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)

    for poly in obj.data.polygons:
        poly.use_smooth = True

    # Subdivision is deliberately low: the source topology already carries the
    # authored planes, and the modifier only removes residual faceting.
    subd = obj.modifiers.new('HeadSurfaceSubdiv', 'SUBSURF')
    subd.subdivision_type = 'CATMULL_CLARK'
    subd.levels = 1
    subd.render_levels = 1

    obj['sourceAuthoringMethod'] = 'CONTINUOUS_CUSTOM_DENSE_MESH'
    obj['facialPrimitiveOverlays'] = False
    obj['baseTopology'] = f'{lat_steps + 1}x{lon_steps}'
    return obj


def head_method_v4(scene):
    skin = bpy.data.materials['ScoutSkin']

    # Remove v2/v1 primitive head and all primitive/curve nose-mouth overlays.
    for name in ['ScoutHead', 'ScoutNose', 'ScoutSmile']:
        obj = bpy.data.objects.get(name)
        if obj is not None:
            bpy.data.objects.remove(obj, do_unlink=True)

    head = build_continuous_head_mesh('ScoutHeadContinuousV4', skin)

    # Eyes / pupils / glints / ears / hair remain exactly where v2 placed them.
    # This keeps the controlled variable bounded to the head source method.
    scene['heroVersion'] = 'v4'
    scene['controlledVariable'] = 'CONTINUOUS_AUTHORED_HEAD_MESH'
    scene['preferredBaseline'] = 'v2'
    scene['headSourceAuthoringMethod'] = 'CONTINUOUS_CUSTOM_DENSE_MESH'
    scene['facialPrimitiveOverlays'] = False
    scene['v2EyesFrozen'] = True
    scene['v2HairFrozen'] = True
    scene['v2BodyFrozen'] = True
    scene['v2TabletFrozen'] = True
    scene['v2EnergyTailFrozen'] = True
    scene['materialsInheritedFromV1'] = True
    scene['lightingInheritedFromV1'] = True
    scene['cameraInheritedFromV1'] = True
    return head


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

    v2.v1.clear_scene()
    scene = bpy.context.scene
    v2.v1.build_scene(scene)
    v2.geometry_v2(scene)
    head = head_method_v4(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)

    if not os.path.isfile(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v4',
        'assetName': 'Radar Scout 3D Static Hero v4',
        'sourceReference': 'Radar Scout Character Bible Board.png',
        'sourceReferenceRole': 'ART_DIRECTION_REFERENCE',
        'preferredBaseline': 'v2',
        'controlledVariable': 'CONTINUOUS_AUTHORED_HEAD_MESH',
        'headSourceAuthoringMethod': 'CONTINUOUS_CUSTOM_DENSE_MESH',
        'facialPrimitiveOverlays': False,
        'v2EyesFrozen': True,
        'v2HairFrozen': True,
        'v2BodyFrozen': True,
        'v2TabletFrozen': True,
        'v2EnergyTailFrozen': True,
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
        'headObjectName': head.name,
        'headVertexCount': len(head.data.vertices),
        'headPolygonCount': len(head.data.polygons),
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
