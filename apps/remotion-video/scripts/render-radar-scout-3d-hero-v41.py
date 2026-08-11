import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v41
# Energy-only calibration of the validated V40 dedicated crown spot mechanism.
# V40 position/target/color/cone/blend/softness and all V36 scene content remain
# frozen. Only CrownSpecularKickerV40 energy changes from 280 to 900.

HERE=os.path.dirname(os.path.abspath(__file__))
V40_PATH=os.path.join(HERE,'render-radar-scout-3d-hero-v40.py')
spec=importlib.util.spec_from_file_location('radar_scout_hero_v40_for_v41',V40_PATH)
v40=importlib.util.module_from_spec(spec); spec.loader.exec_module(v40)
v36=v40.v36; v10=v40.v10; v1=v40.v1

BASE_KICKER_ENERGY=280.0
V41_KICKER_ENERGY=900.0
LIGHT_PROFILE='V40_DEDICATED_CROWN_SPOT__ENERGY_CALIBRATED_900'


def parse_args():
    argv=sys.argv; args=argv[argv.index('--')+1:] if '--' in argv else []
    if len(args)!=3: raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def light_snapshot(name):
    obj=bpy.data.objects.get(name)
    if obj is None or obj.type!='LIGHT': raise RuntimeError(f'missing light {name}')
    d={'name':name,'type':obj.data.type,'energy':float(obj.data.energy),'color':[float(x) for x in obj.data.color],'location':[float(x) for x in obj.location],'rotationEuler':[float(x) for x in obj.rotation_euler]}
    if hasattr(obj.data,'size'): d['size']=float(obj.data.size)
    if hasattr(obj.data,'shadow_soft_size'): d['shadowSoftSize']=float(obj.data.shadow_soft_size)
    if obj.data.type=='SPOT': d['spotSize']=float(obj.data.spot_size); d['spotBlend']=float(obj.data.spot_blend)
    return d


def build_v41(scene):
    union,components,counts=v36.build_v36(scene)
    baseline,kicker_before=v40.add_crown_kicker(scene)
    if abs(kicker_before['energy']-BASE_KICKER_ENERGY)>1e-6: raise RuntimeError('unexpected V40 kicker energy')
    spot=bpy.data.objects[v40.KICKER_NAME]
    before_without_energy=dict(kicker_before); before_without_energy.pop('energy')
    spot.data.energy=V41_KICKER_ENERGY
    kicker_after=light_snapshot(v40.KICKER_NAME)
    after_without_energy=dict(kicker_after); after_without_energy.pop('energy')
    if before_without_energy!=after_without_energy: raise RuntimeError('V41 kicker changed beyond energy')
    for name,snapshot in baseline.items():
        if light_snapshot(name)!=snapshot: raise RuntimeError(f'V36 light drifted in V41: {name}')

    scene['heroVersion']='v41'
    scene['controlledVariable']='HAIR_CROWN_DEDICATED_SPECULAR_KICKER_ENERGY_CALIBRATION'
    scene['preferredGeometryInput']='v30'; scene['preferredMaterialOwnershipInput']='v34'; scene['preferredSurfaceResponseInput']='v36'; scene['preferredLightingBaselineInput']='v36'; scene['preferredLightingMechanismInput']='v40'
    scene['v30FinalGeometryFrozen']=True; scene['v34MaterialRegionOwnershipFrozen']=True; scene['v36MaterialResponseFrozen']=True; scene['allV36LightsFrozen']=True; scene['v40KickerGeometryFrozen']=True; scene['v6CameraFrozen']=True; scene['v6RendererFrozen']=True
    scene['baseKickerEnergy']=BASE_KICKER_ENERGY; scene['v41KickerEnergy']=V41_KICKER_ENERGY; scene['lightingProfile']=LIGHT_PROFILE
    return union,components,counts,baseline,kicker_before,kicker_after


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
    union,components,counts,baseline,kicker_before,kicker_after=build_v41(scene)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend); scene.render.filepath=output_png; bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png)<=0: raise RuntimeError('render did not produce a non-empty PNG')
    rendered=bpy.data.images.load(output_png,check_existing=False); width,height=map(int,rendered.size[:]); channels=int(rendered.channels)
    receipt={'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v41','assetName':'Radar Scout 3D Static Hero v41','preferredBaselineInput':'v10','preferredGeometryInput':'v30','preferredMaterialOwnershipInput':'v34','preferredSurfaceResponseInput':'v36','preferredLightingBaselineInput':'v36','preferredLightingMechanismInput':'v40','controlledVariable':'HAIR_CROWN_DEDICATED_SPECULAR_KICKER_ENERGY_CALIBRATION','lightingProfile':LIGHT_PROFILE,
      'v30FinalGeometryFrozen':True,'v34MaterialRegionOwnershipFrozen':True,'v36MaterialResponseFrozen':True,'allV36LightsFrozen':True,'v40KickerGeometryFrozen':True,'v6CameraFrozen':True,'v6RendererFrozen':True,'baseKickerEnergy':BASE_KICKER_ENERGY,'v41KickerEnergy':V41_KICKER_ENERGY,'baselineLights':baseline,'kickerBefore':kicker_before,'kickerAfter':kicker_after,'materialRegionPolygonCounts':counts,'connectedComponentsAfterRemesh':components,'crownObjectsAfterUnion':1,
      'renderSucceeded':True,'fileName':os.path.basename(output_png),'fileFormat':'PNG','width':width,'height':height,'channels':channels,'alphaPresent':channels==4,'fileSizeBytes':os.path.getsize(output_png),'sha256':sha256_file(output_png),'blendSource':output_blend,'blendSha256':sha256_file(output_blend),'blenderExecutable':bpy.app.binary_path,'blenderVersion':bpy.app.version_string,'renderMode':'background_cli','renderEngine':scene.render.engine,'cameraName':scene.camera.name if scene.camera else None,
      'heroPixelsAuthority':'BLENDER_RENDER','remotionRedrawAllowed':False,'canonicalCandidateModified':False,'staticHeroVisualGate':'PENDING_CONTROLLER_REVIEW','humanSelectedForCanonical':False,'riggingPerformed':False,'animationPerformed':False,'publicationAllowed':False,'publicationPerformed':False,'analyticsObserved':False}
    with open(output_receipt,'w',encoding='utf-8') as f: json.dump(receipt,f,ensure_ascii=False,indent=2); f.write('\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
