import bpy
import hashlib
import importlib.util
import json
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v34
# V33 proved that assigning per-group materials before join+voxel-remesh has almost
# no final-pixel leverage. V34 freezes the complete V30 final crown mesh and assigns
# restrained four-group material regions only AFTER voxel remesh on final polygons.

HERE = os.path.dirname(os.path.abspath(__file__))
V30_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v30.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v30', V30_PATH)
v30 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v30)
v29 = v30.v29
v26 = v29.v26
v23 = v29.v23
v18 = v29.v18
v10 = v29.v10
v8 = v10.v8

MATERIAL_PROFILE = 'POST_REMESH_NEAREST_CENTERLINE_FOUR_REGION_RESPONSE'
MATERIAL_NAMES = (
    'ScoutHairMacroSecondaryLeftV34',
    'ScoutHairMacroPrimaryPearlV34',
    'ScoutHairMacroPrimaryCyanV34',
    'ScoutHairMacroSecondaryRightV34',
)


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def create_materials():
    return (
        v8.hair_material(MATERIAL_NAMES[0], 'ScoutHairFiberV6',
                         (0.80, 0.91, 0.96), 0.36, 0.66, 0.060, 0.15),
        v8.hair_material(MATERIAL_NAMES[1], 'ScoutHairFiberV6',
                         (0.965, 0.995, 1.0), 0.25, 0.84, 0.15, 0.23),
        v8.hair_material(MATERIAL_NAMES[2], 'ScoutHairFiberV6',
                         (0.68, 0.90, 0.98), 0.28, 0.79, 0.12, 0.20),
        v8.hair_material(MATERIAL_NAMES[3], 'ScoutHairFiberV6',
                         (0.74, 0.86, 0.93), 0.38, 0.64, 0.055, 0.14),
    )


def group_samples():
    samples = []
    for points, widths in v30.V30_MACRO_GROUPS:
        centers, _ = v10.sample_centerline(points, widths, subdivisions=12)
        samples.append(tuple(centers))
    return tuple(samples)


def nearest_group(point, samples):
    best_i = 0
    best_d2 = None
    for gi, centers in enumerate(samples):
        d2 = min((point - center).length_squared for center in centers)
        if best_d2 is None or d2 < best_d2:
            best_i = gi
            best_d2 = d2
    return best_i


def assign_post_remesh_material_regions(union):
    materials = create_materials()
    union.data.materials.clear()
    for material in materials:
        union.data.materials.append(material)

    samples = group_samples()
    counts = [0, 0, 0, 0]
    for poly in union.data.polygons:
        gi = nearest_group(poly.center, samples)
        poly.material_index = gi
        counts[gi] += 1

    if any(count == 0 for count in counts):
        raise RuntimeError(f'expected all four post-remesh material regions, got polygon counts {counts}')
    union['postRemeshMaterialRegionAssignment'] = True
    union['materialRegionMethod'] = 'NEAREST_V30_MACRO_CENTERLINE_BY_POLYGON_CENTER'
    union['materialRegionPolygonCountsJson'] = json.dumps(counts)
    union['materialProfile'] = MATERIAL_PROFILE
    return counts


def build_v34(scene):
    union, components = v30.build_refined_macro_union(scene)
    union.name = 'HairCrownPostRemeshMaterialRegionsV34'
    union.data.name = 'HairCrownPostRemeshMaterialRegionsV34Mesh'
    counts = assign_post_remesh_material_regions(union)

    union['sourceAuthoringMethod'] = 'EXACT_V30_FINAL_GEOMETRY_WITH_POST_REMESH_MATERIAL_REGIONS'
    union['v30FinalGeometryFrozen'] = True
    union['v30VertexCoordinatesFrozen'] = True
    union['v30PolygonTopologyFrozen'] = True

    scene['heroVersion'] = 'v34'
    scene['preferredBaselineInput'] = 'v10'
    scene['preferredGeometryInput'] = 'v30'
    scene['controlledVariable'] = 'HAIR_CROWN_POST_REMESH_MATERIAL_REGION_ASSIGNMENT'
    scene['hairSurfaceAuthoringMethod'] = 'EXACT_V30_FINAL_GEOMETRY_WITH_POST_REMESH_MATERIAL_REGIONS'
    scene['v30FinalGeometryFrozen'] = True
    scene['v30VertexCoordinatesFrozen'] = True
    scene['v30PolygonTopologyFrozen'] = True
    scene['postRemeshMaterialRegionAssignment'] = True
    scene['materialRegionMethod'] = 'NEAREST_V30_MACRO_CENTERLINE_BY_POLYGON_CENTER'
    scene['materialRegionPolygonCountsJson'] = json.dumps(counts)
    scene['materialProfile'] = MATERIAL_PROFILE
    scene['v6LightingFrozen'] = True
    scene['v6CameraFrozen'] = True
    scene['v6RendererFrozen'] = True
    return union, components, counts


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

    v23.v18.v10.v8.v6.v5.v2.v1.clear_scene()
    scene = bpy.context.scene
    v23.v18.v10.v8.v6.v5.v2.v1.build_scene(scene)
    v23.v18.v10.v8.v6.v5.v2.geometry_v2(scene)
    v23.v18.v10.v8.v6.v5.geometry_v5(scene)
    union, components, counts = build_v34(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath = output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png) <= 0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered = bpy.data.images.load(output_png, check_existing=False)
    width, height = map(int, rendered.size[:])
    channels = int(rendered.channels)

    receipt = {
        'schemaVersion': 'toolradar.blender.radar-scout-hero.receipt.v34',
        'assetName': 'Radar Scout 3D Static Hero v34',
        'preferredBaselineInput': 'v10',
        'preferredGeometryInput': 'v30',
        'controlledVariable': 'HAIR_CROWN_POST_REMESH_MATERIAL_REGION_ASSIGNMENT',
        'hairSurfaceAuthoringMethod': 'EXACT_V30_FINAL_GEOMETRY_WITH_POST_REMESH_MATERIAL_REGIONS',
        'v30FinalGeometryFrozen': True,
        'v30VertexCoordinatesFrozen': True,
        'v30PolygonTopologyFrozen': True,
        'postRemeshMaterialRegionAssignment': True,
        'materialRegionMethod': 'NEAREST_V30_MACRO_CENTERLINE_BY_POLYGON_CENTER',
        'materialRegionPolygonCounts': counts,
        'materialProfile': MATERIAL_PROFILE,
        'materialNames': list(MATERIAL_NAMES),
        'connectedComponentsAfterRemesh': components,
        'crownObjectsAfterUnion': 1,
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
