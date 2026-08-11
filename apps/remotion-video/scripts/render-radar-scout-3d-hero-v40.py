import bpy
import hashlib
import importlib.util
import json
import math
import os
import sys

# Radar Scout 3D Hero v40
# V37-V39 falsified energy-ratio and aim-only tuning of the broad existing
# lights. V40 returns every V36 light to its exact baseline and ADDS one narrow,
# low-energy crown-targeted spot as an isolated readability probe.

HERE = os.path.dirname(os.path.abspath(__file__))
V36_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v36.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v36_for_v40', V36_PATH)
v36 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v36)

v10 = v36.v10
v1 = v10.v8.v6.v5.v2.v1

KICKER_NAME = 'CrownSpecularKickerV40'
KICKER_LOCATION = (-2.2, -0.9, 5.6)
KICKER_TARGET = (0.0, -0.35, 3.70)
KICKER_ENERGY = 280.0
KICKER_COLOR = (0.55, 0.92, 1.0)
KICKER_SPOT_SIZE = math.radians(43.0)
KICKER_SPOT_BLEND = 0.38
KICKER_SOFT_SIZE = 0.22
LIGHT_PROFILE = 'V36_BASE_LIGHTS_PLUS_DEDICATED_CROWN_SPECULAR_SPOT_V40'


def parse_args():
    argv=sys.argv; args=argv[argv.index('--')+1:] if '--' in argv else []
    if len(args)!=3: raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def light_snapshot(name):
    obj=bpy.data.objects.get(name)
    if obj is None or obj.type!='LIGHT': raise RuntimeError(f'missing light {name}')
    data={'name':name,'type':obj.data.type,'energy':float(obj.data.energy),'color':[float(x) for x in obj.data.color],'location':[float(x) for x in obj.location],'rotationEuler':[float(x) for x in obj.rotation_euler]}
    if hasattr(obj.data,'size'): data['size']=float(obj.data.size)
    if hasattr(obj.data,'shadow_soft_size'): data['shadowSoftSize']=float(obj.data.shadow_soft_size)
    if obj.data.type=='SPOT':
        data['spotSize']=float(obj.data.spot_size); data['spotBlend']=float(obj.data.spot_blend)
    return data


def add_crown_kicker(scene):
    baseline_names=('HeroKey','HeroSoftFill','HeroCyanRim','HeroPurpleRim','HeroWarmKicker','FaceCatchlight')
    before={n:light_snapshot(n) for n in baseline_names}
    expected={'HeroKey':1900.0,'HeroSoftFill':1050.0,'HeroCyanRim':1750.0,'HeroPurpleRim':1400.0,'HeroWarmKicker':560.0,'FaceCatchlight':420.0}
    for n,e in expected.items():
        if abs(before[n]['energy']-e)>1e-6: raise RuntimeError(f'V36 baseline light drifted: {n}')
    if bpy.data.objects.get(KICKER_NAME) is not None: raise RuntimeError('unexpected existing V40 kicker')

    bpy.ops.object.light_add(type='SPOT',location=KICKER_LOCATION)
    spot=bpy.context.object; spot.name=KICKER_NAME
    spot.data.energy=KICKER_ENERGY; spot.data.color=KICKER_COLOR
    spot.data.spot_size=KICKER_SPOT_SIZE; spot.data.spot_blend=KICKER_SPOT_BLEND
    spot.data.shadow_soft_size=KICKER_SOFT_SIZE
    v1.look_at(spot,KICKER_TARGET)
    after={n:light_snapshot(n) for n in baseline_names}
    if before!=after: raise RuntimeError('existing V36 light changed while adding V40 kicker')

    scene['heroVersion']='v40'
    scene['controlledVariable']='HAIR_CROWN_DEDICATED_SPECULAR_KICKER_READABILITY'
    scene['preferredGeometryInput']='v30'; scene['preferredMaterialOwnershipInput']='v34'; scene['preferredSurfaceResponseInput']='v36'; scene['preferredLightingBaselineInput']='v36'
    scene['v30FinalGeometryFrozen']=True; scene['v34MaterialRegionOwnershipFrozen']=True; scene['v36MaterialResponseFrozen']=True
    scene['allV36LightsFrozen']=True; scene['v6CameraFrozen']=True; scene['v6RendererFrozen']=True
    scene['dedicatedCrownLightAdded']=True; scene['dedicatedCrownLightName']=KICKER_NAME
    scene['dedicatedCrownLightLocation']=json.dumps(KICKER_LOCATION); scene['dedicatedCrownLightTarget']=json.dumps(KICKER_TARGET)
    scene['dedicatedCrownLightEnergy']=KICKER_ENERGY; scene['dedicatedCrownLightSpotSizeRadians']=KICKER_SPOT_SIZE; scene['dedicatedCrownLightSpotBlend']=KICKER_SPOT_BLEND
    scene['lightingProfile']=LIGHT_PROFILE
    return before,light_snapshot(KICKER_NAME)


def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): h.update(chunk)
    return h.hexdigest()


def main():
    output_png,output_blend,output_receipt=parse_args()
    for p in (output_png,output_blend,output_receipt): os.makedirs(os.path.dirname(p),exist_ok=True)
    v1.clear_scene(); scene=bpy.context.scene; v1.build_scene(scene)
    v10.v8.v6.v5.v2.geometry_v2(scene); v10.v8.v6.v5.geometry_v5(scene)
    union,components,counts=v36.build_v36(scene)
    baseline,kicker=add_crown_kicker(scene)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend); scene.render.filepath=output_png; bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png)<=0: raise RuntimeError('render did not produce a non-empty PNG')
    rendered=bpy.data.images.load(output_png,check_existing=False); width,height=map(int,rendered.size[:]); channels=int(rendered.channels)
    receipt={'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v40','assetName':'Radar Scout 3D Static Hero v40','preferredBaselineInput':'v10','preferredGeometryInput':'v30','preferredMaterialOwnershipInput':'v34','preferredSurfaceResponseInput':'v36','preferredLightingBaselineInput':'v36','controlledVariable':'HAIR_CROWN_DEDICATED_SPECULAR_KICKER_READABILITY','lightingProfile':LIGHT_PROFILE,
      'v30FinalGeometryFrozen':True,'v34MaterialRegionOwnershipFrozen':True,'v36MaterialResponseFrozen':True,'allV36LightsFrozen':True,'v6CameraFrozen':True,'v6RendererFrozen':True,'dedicatedCrownLightAdded':True,'baselineLights':baseline,'dedicatedCrownLight':kicker,'dedicatedCrownLightTarget':list(KICKER_TARGET),'materialRegionPolygonCounts':counts,'connectedComponentsAfterRemesh':components,'crownObjectsAfterUnion':1,
      'renderSucceeded':True,'fileName':os.path.basename(output_png),'fileFormat':'PNG','width':width,'height':height,'channels':channels,'alphaPresent':channels==4,'fileSizeBytes':os.path.getsize(output_png),'sha256':sha256_file(output_png),'blendSource':output_blend,'blendSha256':sha256_file(output_blend),'blenderExecutable':bpy.app.binary_path,'blenderVersion':bpy.app.version_string,'renderMode':'background_cli','renderEngine':scene.render.engine,'cameraName':scene.camera.name if scene.camera else None,
      'heroPixelsAuthority':'BLENDER_RENDER','remotionRedrawAllowed':False,'canonicalCandidateModified':False,'staticHeroVisualGate':'PENDING_CONTROLLER_REVIEW','humanSelectedForCanonical':False,'riggingPerformed':False,'animationPerformed':False,'publicationAllowed':False,'publicationPerformed':False,'analyticsObserved':False}
    with open(output_receipt,'w',encoding='utf-8') as f: json.dump(receipt,f,ensure_ascii=False,indent=2); f.write('\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
