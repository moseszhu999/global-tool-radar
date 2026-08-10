import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v3
# Controlled A/B against v2: facial identity + character sculpt only.
# Body silhouette, tablet, energy-tail envelope, materials, lighting and camera stay v2.

HERE = os.path.dirname(os.path.abspath(__file__))
V2_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v2.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v2', V2_PATH)
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)
v1 = v2.v1


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


def add_face_ellipsoid(name, location, scale, material, rotation=(0,0,0)):
    obj = v1.add_uv(name, location, scale, material, 72, 40)
    obj.rotation_euler = rotation
    return obj


def add_eye_arc(name, points, bevel, material):
    return v1.add_curve(name, points, bevel, material)


def add_secondary_hair(name, root, tip, r0, r1, material, flatten=0.48):
    return v2.add_hair_clump(name, root, tip, r0, r1, material, flatten=flatten)


def facial_sculpt_v3(scene):
    skin = bpy.data.materials['ScoutSkin']
    skin_inner = bpy.data.materials['ScoutSkinInner']
    hair = bpy.data.materials['ScoutHair']
    hair_shadow = bpy.data.materials['ScoutHairShadow']
    pupil_mat = bpy.data.materials['ScoutPupil']
    cyan = bpy.data.materials['ScoutCyanEmission']
    cyan_hot = bpy.data.materials['ScoutCyanHot']
    hologlass = bpy.data.materials['HoloGlass']

    # Freeze body / prop / tail geometry from v2; only face-head-hair region changes below.

    # 1) Refine the head from a single round volume toward a stylized sculpted cranium.
    head = bpy.data.objects['ScoutHead']
    head.scale = (0.985, 0.975, 0.955)
    head.location.z += 0.015
    bpy.ops.object.select_all(action='DESELECT')
    head.select_set(True)
    bpy.context.view_layer.objects.active = head
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # 2) Add subtle cheek / jaw / brow volumes in the same skin material.
    # These are deliberately shallow so they merge visually into the head instead of reading as stickers.
    add_face_ellipsoid('CheekPlaneL_v3', (-0.49,-0.735,2.49), (0.25,0.075,0.20), skin,
                       (math.radians(-6),math.radians(-8),math.radians(-10)))
    add_face_ellipsoid('CheekPlaneR_v3', (0.49,-0.735,2.49), (0.25,0.075,0.20), skin,
                       (math.radians(-6),math.radians(8),math.radians(10)))
    add_face_ellipsoid('JawPlane_v3', (0,-0.725,2.29), (0.44,0.070,0.20), skin,
                       (math.radians(2),0,0))
    add_face_ellipsoid('BrowPlaneL_v3', (-0.39,-0.725,3.06), (0.35,0.065,0.13), skin,
                       (math.radians(-4),math.radians(-4),math.radians(9)))
    add_face_ellipsoid('BrowPlaneR_v3', (0.39,-0.725,3.06), (0.35,0.065,0.13), skin,
                       (math.radians(-4),math.radians(4),math.radians(-9)))

    # 3) Eye framing: slightly narrower eyes, visible iris layer, upper lids and asymmetric brows.
    for side, sx in [('L',-1),('R',1)]:
        eye = bpy.data.objects['ScoutEye'+side]
        pupil = bpy.data.objects['ScoutPupil'+side]
        eye.scale = (0.93,0.96,0.94)
        pupil.scale = (0.86,0.96,0.88)
        eye.location.z -= 0.025
        pupil.location.z -= 0.020

        # Glassy cyan iris disc behind the dark pupil.
        v1.add_disc(
            f'ScoutIris{side}_v3',
            (0.40*sx,-0.952,2.755),
            0.115,0.020,hologlass,
            rotation=(math.radians(90),0,0),
        )
        # smaller dark center tightens gaze
        add_face_ellipsoid(f'ScoutIrisCore{side}_v3', (0.40*sx,-0.978,2.755),
                           (0.075,0.022,0.105), pupil_mat)

        # Upper eyelid arc gives the eyes an authored expression rather than exposed spheres.
        x0=0.40*sx
        lid_pts=[
            (x0-0.27*sx,-0.966,2.98),
            (x0,-1.005,3.055),
            (x0+0.28*sx,-0.963,2.97),
        ]
        add_eye_arc(f'UpperLid{side}_v3',lid_pts,0.025,hair_shadow)

    # Slight asymmetry creates alert/scout personality.
    add_eye_arc('BrowAccentL_v3',[(-0.69,-0.862,3.18),(-0.42,-0.905,3.22),(-0.18,-0.87,3.17)],0.020,hair_shadow)
    add_eye_arc('BrowAccentR_v3',[(0.18,-0.87,3.16),(0.43,-0.91,3.20),(0.70,-0.85,3.13)],0.020,hair_shadow)

    # 4) Replace generic v1/v2 nose-smile with a tighter scout expression.
    delete_object('ScoutNose')
    delete_object('ScoutSmile')
    add_face_ellipsoid('ScoutNose_v3',(0,-0.885,2.49),(0.070,0.045,0.060),skin_inner)
    add_eye_arc('ScoutMouth_v3',[(-0.18,-0.905,2.30),(0.015,-0.935,2.265),(0.21,-0.90,2.325)],0.016,hair_shadow)
    add_eye_arc('ScoutMouthAccent_v3',[(0.02,-0.938,2.265),(0.12,-0.94,2.245)],0.010,skin_inner)

    # 5) Signature scout facial cue: small scanner nodes at the temples, using existing cyan materials.
    for side,sx in [('L',-1),('R',1)]:
        v1.add_uv(f'TempleScanner{side}_v3',(0.82*sx,-0.625,2.67),(0.075,0.038,0.075),cyan,36,18)
        v1.add_curve(f'TempleTrace{side}_v3',[
            (0.76*sx,-0.655,2.72),(0.88*sx,-0.62,2.84),(0.91*sx,-0.55,2.98)
        ],0.012,cyan_hot)

    # 6) Hair secondary breakup, without changing the v2 primary silhouette envelope.
    secondary = [
        ((-0.52,-0.55,3.70),(-0.72,-0.76,3.93),0.10,0.018),
        ((-0.25,-0.62,3.78),(-0.33,-0.85,4.03),0.10,0.017),
        ((0.05,-0.64,3.80),(0.10,-0.88,4.07),0.105,0.017),
        ((0.32,-0.58,3.75),(0.44,-0.81,4.00),0.10,0.017),
        ((0.58,-0.49,3.66),(0.76,-0.70,3.88),0.095,0.016),
        ((-0.77,-0.49,3.24),(-0.93,-0.72,2.94),0.085,0.014),
        ((0.78,-0.47,3.23),(0.95,-0.70,2.92),0.085,0.014),
        ((-0.08,-0.75,3.31),(-0.15,-0.91,3.03),0.075,0.012),
        ((0.11,-0.75,3.32),(0.18,-0.91,3.04),0.075,0.012),
    ]
    for i,(root,tip,r0,r1) in enumerate(secondary,1):
        add_secondary_hair(f'HairSecondary{i:02d}_v3',root,tip,r0,r1,hair if i<=5 else hair_shadow)

    # Antenna root collars integrate the signature elements into the hairstyle.
    for i,(x,z) in enumerate([(-0.38,3.98),(0.38,3.98)],1):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.10,minor_radius=0.020,major_segments=48,minor_segments=12,
            location=(x,-0.005,z),rotation=(math.radians(90),0,0)
        )
        collar=bpy.context.active_object
        collar.name=f'AntennaRootCollar{i}_v3'
        collar.data.materials.append(cyan)

    scene['heroVersion']='v3'
    scene['controlledVariable']='FACIAL_IDENTITY_AND_CHARACTER_SCULPT'
    scene['v2BodySilhouetteFrozen']=True
    scene['v2TabletFrozen']=True
    scene['v2EnergyTailFrozen']=True
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
    for p in (output_png,output_blend,output_receipt):
        os.makedirs(os.path.dirname(p),exist_ok=True)

    v1.clear_scene()
    scene=bpy.context.scene
    v1.build_scene(scene)
    v2.geometry_v2(scene)
    facial_sculpt_v3(scene)

    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath=output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(output_png) or os.path.getsize(output_png)<=0:
        raise RuntimeError('render did not produce a non-empty PNG')

    rendered=bpy.data.images.load(output_png,check_existing=False)
    width,height=map(int,rendered.size[:])
    channels=int(rendered.channels)
    receipt={
        'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v3',
        'assetName':'Radar Scout 3D Static Hero v3',
        'comparisonBase':'Radar Scout 3D Static Hero v2',
        'controlledVariable':'FACIAL_IDENTITY_AND_CHARACTER_SCULPT',
        'sourceReference':'Radar Scout Character Bible Board.png',
        'renderSucceeded':True,
        'fileName':os.path.basename(output_png),
        'fileFormat':'PNG','width':width,'height':height,'channels':channels,
        'alphaPresent':channels==4,'fileSizeBytes':os.path.getsize(output_png),
        'sha256':sha256_file(output_png),'blendSource':output_blend,
        'blendSha256':sha256_file(output_blend),'blenderExecutable':sys.argv[0],
        'blenderVersion':bpy.app.version_string,'renderMode':'background_cli',
        'renderEngine':scene.render.engine,'cameraName':scene.camera.name if scene.camera else None,
        'cameraIntent':'CHARACTER_BIBLE_3_4_FRONT_HERO','outputTransparent':bool(scene.render.film_transparent),
        'heroPixelsAuthority':'BLENDER_RENDER','remotionRedrawAllowed':False,'heroAssetRedrawn':False,
        'v2BodySilhouetteFrozen':True,'v2TabletFrozen':True,'v2EnergyTailFrozen':True,
        'materialsInheritedFromV1':True,'lightingInheritedFromV1':True,'cameraInheritedFromV1':True,
        'objectCount':len(scene.objects),'materialCount':len(bpy.data.materials),
        'facialSculptChanges':[
            'shallow cheek jaw and brow sculpt planes',
            'narrower eye framing with cyan glass iris layer',
            'authored upper lids and asymmetric brows',
            'refined nose mouth expression',
            'temple scanner identity cue',
            'secondary hair-clump breakup',
            'antenna root collars',
        ],
        'canonicalCandidateModified':False,'staticHeroVisualGate':'PENDING_CONTROLLER_REVIEW',
        'humanSelectedForCanonical':False,'riggingPerformed':False,'animationPerformed':False,
        'publicationAllowed':False,'publicationPerformed':False,'analyticsObserved':False,
    }
    with open(output_receipt,'w',encoding='utf-8') as f:
        json.dump(receipt,f,indent=2); f.write('\n')
    print(json.dumps(receipt,indent=2))


if __name__=='__main__':
    main()
