import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v2
# Controlled A/B against v1: geometry / silhouette only.
# Materials, lighting, camera intent, renderer and production authority are inherited from v1.

HERE = os.path.dirname(os.path.abspath(__file__))
V1_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v1.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v1', V1_PATH)
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def delete_object(name):
    obj = bpy.data.objects.get(name)
    if obj is not None:
        bpy.data.objects.remove(obj, do_unlink=True)


def delete_prefix(prefix):
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefix):
            bpy.data.objects.remove(obj, do_unlink=True)


def add_tapered_between(name, a, b, radius_a, radius_b, material, vertices=64, bevel=0.035):
    a = Vector(a)
    b = Vector(b)
    mid = (a + b) * 0.5
    length = (b - a).length
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_a,
        radius2=radius_b,
        depth=length,
        location=mid,
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    mod = obj.modifiers.new('SoftEdge', 'BEVEL')
    mod.width = bevel
    mod.segments = 5
    return obj


def add_hair_clump(name, root, tip, root_radius, tip_radius, material, flatten=0.72):
    obj = add_tapered_between(name, root, tip, root_radius, tip_radius, material, vertices=64, bevel=0.045)
    # Flatten one local axis so clumps read as authored blades rather than tubes.
    obj.scale.x = flatten
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def translate_scale_about(objects, center, scale_xyz, delta):
    c = Vector(center)
    sx, sy, sz = scale_xyz
    d = Vector(delta)
    for obj in objects:
        p = obj.location - c
        p = Vector((p.x * sx, p.y * sy, p.z * sz))
        obj.location = c + p + d
        obj.scale.x *= sx
        obj.scale.y *= sy
        obj.scale.z *= sz


def geometry_v2(scene):
    skin = bpy.data.materials['ScoutSkin']
    hair = bpy.data.materials['ScoutHair']
    hair_shadow = bpy.data.materials['ScoutHairShadow']
    suit = bpy.data.materials['ScoutTechSuit']
    suit_panel = bpy.data.materials['ScoutSuitPanel']
    cloak = bpy.data.materials['ScoutCloak']
    cyan = bpy.data.materials['ScoutCyanEmission']
    cyan_hot = bpy.data.materials['ScoutCyanHot']
    purple = bpy.data.materials['ScoutPurpleEmission']
    hologlass = bpy.data.materials['HoloGlass']

    # 1) Refine head / face proportion without changing materials.
    head = bpy.data.objects['ScoutHead']
    head.scale = (0.94, 0.96, 0.93)
    head.location.z += 0.02
    bpy.ops.object.select_all(action='DESELECT')
    head.select_set(True)
    bpy.context.view_layer.objects.active = head
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Eyes slightly smaller and closer, with glints/pupils moved consistently.
    face_objs = []
    for side, sx in [('L', -1), ('R', 1)]:
        eye = bpy.data.objects['ScoutEye' + side]
        pupil = bpy.data.objects['ScoutPupil' + side]
        glint_a = bpy.data.objects['ScoutGlintA' + side]
        glint_b = bpy.data.objects['ScoutGlintB' + side]
        eye.location.x = 0.40 * sx
        pupil.location.x = (0.40 + 0.018) * sx
        glint_a.location.x = (0.40 - 0.065) * sx
        glint_b.location.x = (0.40 + 0.092) * sx
        for obj, factor in [(eye, 0.90), (pupil, 0.88), (glint_a, 0.90), (glint_b, 0.90)]:
            obj.scale *= factor
            face_objs.append(obj)

    # 2) Replace rounded blob tufts with tapered directional clumps.
    for i in range(1, 20):
        delete_object(f'HairTuft{i:02d}')
    back = bpy.data.objects.get('HairBackMass')
    if back:
        back.scale = (0.93, 0.92, 0.82)
        back.location.z -= 0.02

    clumps = [
        # crown fan: root -> pointed tip
        ((-0.62,-0.28,3.46),(-1.18,-0.42,3.82),0.23,0.035),
        ((-0.42,-0.42,3.56),(-0.82,-0.68,4.04),0.24,0.038),
        ((-0.18,-0.50,3.62),(-0.36,-0.82,4.18),0.25,0.040),
        ((0.02,-0.52,3.64),(0.08,-0.88,4.24),0.26,0.040),
        ((0.23,-0.48,3.61),(0.46,-0.80,4.14),0.25,0.038),
        ((0.44,-0.39,3.54),(0.86,-0.66,4.00),0.24,0.036),
        ((0.64,-0.25,3.44),(1.18,-0.40,3.78),0.22,0.034),
        # side locks framing the face
        ((-0.77,-0.28,3.30),(-1.25,-0.50,2.84),0.22,0.030),
        ((-0.72,-0.50,3.17),(-0.96,-0.78,2.66),0.20,0.028),
        ((0.79,-0.26,3.28),(1.26,-0.44,2.83),0.22,0.030),
        ((0.73,-0.49,3.15),(0.99,-0.76,2.64),0.20,0.028),
        # two central bangs create a cleaner forehead hierarchy
        ((-0.17,-0.66,3.30),(-0.28,-0.90,2.91),0.18,0.024),
        ((0.15,-0.67,3.31),(0.27,-0.91,2.93),0.18,0.024),
    ]
    for i, (root, tip, r0, r1) in enumerate(clumps, 1):
        add_hair_clump(f'HairBlade{i:02d}', root, tip, r0, r1, hair, flatten=0.64 if i <= 7 else 0.58)

    # Shadowed short under-clumps keep depth without becoming a round cap.
    for i, (root, tip) in enumerate([
        ((-0.88,0.00,3.40),(-1.12,0.18,3.13)),
        ((0.88,0.00,3.39),(1.12,0.18,3.12)),
        ((-0.48,0.26,3.55),(-0.62,0.48,3.24)),
        ((0.48,0.26,3.54),(0.62,0.48,3.23)),
    ], 1):
        add_hair_clump(f'HairShadowBlade{i:02d}', root, tip, 0.18, 0.028, hair_shadow, flatten=0.60)

    # 3) Replace tube limbs with tapered suit segments + cuffs + glove masses.
    for name in ['UpperArmL','ForeArmL','UpperArmR','ForeArmR','HandL','HandR','PointFingerR','PointFingerTipR']:
        delete_object(name)

    shoulder_l=(-0.70,-0.03,1.26); elbow_l=(-1.06,-0.52,0.90); wrist_l=(-1.27,-0.80,0.70)
    shoulder_r=(0.70,-0.03,1.27); elbow_r=(1.03,-0.48,1.36); wrist_r=(1.30,-0.76,1.55)
    add_tapered_between('UpperArmL_v2', shoulder_l, elbow_l, 0.22, 0.16, suit_panel)
    add_tapered_between('ForeArmL_v2', elbow_l, wrist_l, 0.17, 0.12, suit)
    add_tapered_between('UpperArmR_v2', shoulder_r, elbow_r, 0.22, 0.16, suit_panel)
    add_tapered_between('ForeArmR_v2', elbow_r, wrist_r, 0.17, 0.12, suit)
    v1.add_uv('CuffL_v2', wrist_l, (0.18,0.16,0.14), cyan, 48,24)
    v1.add_uv('CuffR_v2', wrist_r, (0.18,0.16,0.14), cyan, 48,24)
    v1.add_uv('HandL_v2', (-1.34,-0.86,0.65), (0.19,0.15,0.20), skin, 48,24)
    v1.add_uv('HandR_v2', (1.37,-0.84,1.60), (0.19,0.15,0.20), skin, 48,24)
    add_tapered_between('PointFingerR_v2',(1.49,-0.88,1.61),(1.78,-0.98,1.70),0.055,0.035,skin,48,0.018)
    v1.add_uv('PointFingerTipR_v2',(1.80,-0.98,1.71),(0.055,0.045,0.055),skin,32,16)

    # 4) Coherent torso / shoulder / scarf silhouette.
    torso = bpy.data.objects.get('ScoutTorso')
    if torso:
        torso.scale = (0.94, 0.96, 1.03)
    for name in ['ScoutShoulderL','ScoutShoulderR']:
        obj=bpy.data.objects.get(name)
        if obj:
            obj.scale = (1.12,0.92,0.86)
    scarf=bpy.data.objects.get('ScoutScarf')
    if scarf:
        scarf.scale=(0.96,0.92,0.88)
        scarf.location.z -= 0.02

    # Narrow cape upper roots; keep the v1 cloak material and edge-light language.
    for name in ['ScoutCapeL','ScoutCapeR']:
        obj=bpy.data.objects.get(name)
        if obj:
            obj.scale.x *= 0.90
            obj.scale.z *= 1.04
            obj.location.z += 0.02

    # 5) Rebuild the holographic tablet 32% smaller and slightly farther from the face.
    for name in ['HolographicTablet','TabletSweep']:
        delete_object(name)
    delete_prefix('TabletRadarRing')
    tablet_center=(2.22,-1.06,1.46)
    bpy.ops.mesh.primitive_cube_add(size=1.0,location=tablet_center)
    tablet=bpy.context.active_object
    tablet.name='HolographicTablet_v2'
    tablet.scale=(0.54,0.045,0.66)
    tablet.rotation_euler=(math.radians(-4),math.radians(10),math.radians(8))
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    tablet.data.materials.append(hologlass)
    bevel=tablet.modifiers.new('TabletBevel','BEVEL')
    bevel.width=0.075; bevel.segments=6
    for r,mat in [(0.31,cyan),(0.22,purple),(0.13,cyan_hot)]:
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=0.014,
            major_segments=96,minor_segments=14,location=(2.22,-1.125,1.47),rotation=(math.radians(90),0,0))
        ring=bpy.context.active_object
        ring.name=f'TabletRadarRingV2_{int(r*100)}'
        ring.scale=(1.0,1.0,0.76)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ring.data.materials.append(mat)
    v1.add_curve('TabletSweep_v2',[(2.22,-1.15,1.47),(2.37,-1.15,1.61),(2.49,-1.14,1.68)],0.012,cyan_hot)

    # 6) Clarify lower hover silhouette: tighter centerline and tapered energy tail.
    for name in ['EnergyTail1','EnergyTail2','EnergyTail3']:
        delete_object(name)
    for i,(pts,bevel,mat) in enumerate([
        ([(0.05,0.28,-0.10),(0.18,0.34,-0.55),(0.06,0.18,-1.02),(-0.26,0.00,-1.48)],0.17,cyan),
        ([(-0.04,0.20,-0.14),(-0.20,0.20,-0.52),(-0.34,0.02,-0.90),(-0.48,-0.14,-1.30)],0.085,purple),
        ([(0.10,0.12,-0.16),(0.30,0.10,-0.45),(0.35,-0.08,-0.78),(0.25,-0.24,-1.12)],0.048,cyan_hot),
    ],1):
        v1.add_curve(f'EnergyTailV2_{i}',pts,bevel,mat)

    # Keep camera and lighting untouched. Record exact controlled change in scene metadata.
    scene['heroVersion']='v2'
    scene['controlledVariable']='HERO_FORM_DESIGN_SILHOUETTE_GEOMETRY'
    scene['materialsInheritedFromV1']=True
    scene['lightingInheritedFromV1']=True
    scene['cameraInheritedFromV1']=True


def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    output_png, output_blend, output_receipt = parse_args()
    for p in (output_png, output_blend, output_receipt):
        os.makedirs(os.path.dirname(p), exist_ok=True)

    v1.clear_scene()
    scene=bpy.context.scene
    v1.build_scene(scene)
    geometry_v2(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath=output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(output_png) or os.path.getsize(output_png)<=0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered=bpy.data.images.load(output_png,check_existing=False)
    width,height=map(int,rendered.size[:])
    channels=int(rendered.channels)
    receipt={
        'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v2',
        'assetName':'Radar Scout 3D Static Hero v2',
        'comparisonBase':'Radar Scout 3D Static Hero v1',
        'controlledVariable':'HERO_FORM_DESIGN_SILHOUETTE_GEOMETRY',
        'sourceReference':'Radar Scout Character Bible Board.png',
        'sourceReferenceRole':'ART_DIRECTION_REFERENCE',
        'renderSucceeded':True,
        'fileName':os.path.basename(output_png),
        'fileFormat':'PNG',
        'width':width,'height':height,'channels':channels,
        'alphaPresent':channels==4,
        'fileSizeBytes':os.path.getsize(output_png),
        'sha256':sha256_file(output_png),
        'blendSource':output_blend,
        'blendSha256':sha256_file(output_blend),
        'blenderExecutable':sys.argv[0],
        'blenderVersion':bpy.app.version_string,
        'renderMode':'background_cli',
        'renderEngine':scene.render.engine,
        'cameraName':scene.camera.name if scene.camera else None,
        'cameraIntent':'CHARACTER_BIBLE_3_4_FRONT_HERO',
        'outputTransparent':bool(scene.render.film_transparent),
        'heroPixelsAuthority':'BLENDER_RENDER',
        'remotionRedrawAllowed':False,
        'heroAssetRedrawn':False,
        'materialsInheritedFromV1':True,
        'lightingInheritedFromV1':True,
        'cameraInheritedFromV1':True,
        'objectCount':len(scene.objects),
        'materialCount':len(bpy.data.materials),
        'geometryChanges':[
            'smaller refined head/eye proportions',
            'tapered directional hair blade hierarchy',
            'tapered suit limbs plus cuffs/gloves',
            'coherent torso/scarf/cape silhouette',
            '32-percent smaller repositioned holographic tablet',
            'tighter tapered lower energy-tail silhouette',
        ],
        'canonicalCandidateModified':False,
        'staticHeroVisualGate':'PENDING_CONTROLLER_REVIEW',
        'humanSelectedForCanonical':False,
        'riggingPerformed':False,
        'animationPerformed':False,
        'publicationAllowed':False,
        'publicationPerformed':False,
        'analyticsObserved':False,
    }
    with open(output_receipt,'w',encoding='utf-8') as f:
        json.dump(receipt,f,indent=2)
        f.write('\n')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__':
    main()
