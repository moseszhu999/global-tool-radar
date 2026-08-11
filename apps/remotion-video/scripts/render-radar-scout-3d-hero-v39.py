import bpy
import hashlib
import importlib.util
import json
import os
import sys

# Radar Scout 3D Hero v39
# V37/V38 show that energy-ratio redistribution has negligible readability
# leverage. V39 returns all light energies to the V36 baseline and changes only
# the AIM of the existing high-left cyan rim. Its position, energy, color and
# size remain exact V36 values. The original target z=1.7 is below the authored
# crown mass (roughly z=3.4..4.2); V39 aims that same rim at the crown region.

HERE = os.path.dirname(os.path.abspath(__file__))
V36_PATH = os.path.join(HERE, 'render-radar-scout-3d-hero-v36.py')
spec = importlib.util.spec_from_file_location('radar_scout_hero_v36_for_v39', V36_PATH)
v36 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v36)

v10 = v36.v10
v1 = v10.v8.v6.v5.v2.v1

BASE_CYAN_RIM_TARGET = (0.0, 0.0, 1.7)
V39_CYAN_RIM_TARGET = (0.0, -0.2, 3.65)
LIGHT_PROFILE = 'V36_BASE_ENERGY__CYAN_RIM_CROWN_AIM_TARGET_ONLY'


def parse_args():
    argv = sys.argv
    args = argv[argv.index('--') + 1:] if '--' in argv else []
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def light_snapshot(name):
    obj=bpy.data.objects.get(name)
    if obj is None or obj.type!='LIGHT': raise RuntimeError(f'missing light {name}')
    return {'name':name,'type':obj.data.type,'energy':float(obj.data.energy),'color':[float(x) for x in obj.data.color],'location':[float(x) for x in obj.location],'rotationEuler':[float(x) for x in obj.rotation_euler],'size':float(getattr(obj.data,'size',0.0))}


def apply_v39_lighting(scene):
    names=('HeroKey','HeroSoftFill','HeroCyanRim','HeroPurpleRim','HeroWarmKicker','FaceCatchlight')
    before={n:light_snapshot(n) for n in names}
    expected={'HeroKey':1900.0,'HeroSoftFill':1050.0,'HeroCyanRim':1750.0,'HeroPurpleRim':1400.0,'HeroWarmKicker':560.0,'FaceCatchlight':420.0}
    for n,e in expected.items():
        if abs(before[n]['energy']-e)>1e-6: raise RuntimeError(f'V36 baseline energy drifted: {n}')

    cyan=bpy.data.objects['HeroCyanRim']
    v1.look_at(cyan,V39_CYAN_RIM_TARGET)
    after={n:light_snapshot(n) for n in names}

    for n in names:
        if n!='HeroCyanRim':
            if before[n]!=after[n]: raise RuntimeError(f'non-target light changed: {n}')
        else:
            for k in ('type','energy','color','location','size'):
                if before[n][k]!=after[n][k]: raise RuntimeError(f'HeroCyanRim changed beyond aim: {k}')
            if before[n]['rotationEuler']==after[n]['rotationEuler']:
                raise RuntimeError('HeroCyanRim aim did not change')

    scene['heroVersion']='v39'
    scene['controlledVariable']='HAIR_CROWN_CYAN_RIM_AIM_TARGET_READABILITY'
    scene['preferredGeometryInput']='v30'
    scene['preferredMaterialOwnershipInput']='v34'
    scene['preferredSurfaceResponseInput']='v36'
    scene['preferredLightingBaselineInput']='v36'
    scene['v30FinalGeometryFrozen']=True
    scene['v34MaterialRegionOwnershipFrozen']=True
    scene['v36MaterialResponseFrozen']=True
    scene['allLightEnergiesFrozen']=True
    scene['cyanRimPositionColorSizeFrozen']=True
    scene['nonTargetLightsFrozen']=True
    scene['v6CameraFrozen']=True
    scene['v6RendererFrozen']=True
    scene['baseCyanRimTarget']=json.dumps(BASE_CYAN_RIM_TARGET)
    scene['v39CyanRimTarget']=json.dumps(V39_CYAN_RIM_TARGET)
    scene['lightingProfile']=LIGHT_PROFILE
    return before,after


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
    before,after=apply_v39_lighting(scene)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath=output_png; bpy.ops.render.render(write_still=True)
    if not os.path.exists(output_png) or os.path.getsize(output_png)<=0: raise RuntimeError('render did not produce a non-empty PNG')
    rendered=bpy.data.images.load(output_png,check_existing=False); width,height=map(int,rendered.size[:]); channels=int(rendered.channels)
    receipt={
      'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v39','assetName':'Radar Scout 3D Static Hero v39','preferredBaselineInput':'v10','preferredGeometryInput':'v30','preferredMaterialOwnershipInput':'v34','preferredSurfaceResponseInput':'v36','preferredLightingBaselineInput':'v36','controlledVariable':'HAIR_CROWN_CYAN_RIM_AIM_TARGET_READABILITY','lightingProfile':LIGHT_PROFILE,
      'v30FinalGeometryFrozen':True,'v34MaterialRegionOwnershipFrozen':True,'v36MaterialResponseFrozen':True,'allLightEnergiesFrozen':True,'cyanRimPositionColorSizeFrozen':True,'nonTargetLightsFrozen':True,'v6CameraFrozen':True,'v6RendererFrozen':True,
      'baseCyanRimTarget':list(BASE_CYAN_RIM_TARGET),'v39CyanRimTarget':list(V39_CYAN_RIM_TARGET),'lightsBefore':before,'lightsAfter':after,'materialRegionPolygonCounts':counts,'connectedComponentsAfterRemesh':components,'crownObjectsAfterUnion':1,
      'renderSucceeded':True,'fileName':os.path.basename(output_png),'fileFormat':'PNG','width':width,'height':height,'channels':channels,'alphaPresent':channels==4,'fileSizeBytes':os.path.getsize(output_png),'sha256':sha256_file(output_png),'blendSource':output_blend,'blendSha256':sha256_file(output_blend),'blenderExecutable':bpy.app.binary_path,'blenderVersion':bpy.app.version_string,'renderMode':'background_cli','renderEngine':scene.render.engine,'cameraName':scene.camera.name if scene.camera else None,
      'heroPixelsAuthority':'BLENDER_RENDER','remotionRedrawAllowed':False,'canonicalCandidateModified':False,'staticHeroVisualGate':'PENDING_CONTROLLER_REVIEW','humanSelectedForCanonical':False,'riggingPerformed':False,'animationPerformed':False,'publicationAllowed':False,'publicationPerformed':False,'analyticsObserved':False}
    with open(output_receipt,'w',encoding='utf-8') as f: json.dump(receipt,f,ensure_ascii=False,indent=2); f.write('\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))

if __name__=='__main__': main()
