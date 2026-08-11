import bpy
import hashlib
import json
import math
import os
import sys
from mathutils import Vector

# Radar Scout 3D Hero v1
# Character Bible: pale white/blue hair, large glossy eyes, pointed ears,
# twin glowing antennae, teal cloak, dark technical suit, radar emblem,
# hovering energy tail and holographic radar UI.
# Blender owns the hero pixels; Remotion must not redraw this asset.


def args_after_double_dash():
    argv = sys.argv
    return argv[argv.index('--') + 1:] if '--' in argv else []


def parse_args():
    args = args_after_double_dash()
    if len(args) != 3:
        raise SystemExit('expected: OUTPUT_PNG OUTPUT_BLEND OUTPUT_RECEIPT')
    return tuple(os.path.abspath(x) for x in args)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def look_at(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()


def set_input(node, names, value):
    for name in names:
        if name in node.inputs:
            node.inputs[name].default_value = value
            return True
    return False


def make_principled(name, base, metallic=0.0, roughness=0.35,
                    emission=None, emission_strength=0.0,
                    subsurface=0.0, clearcoat=0.0,
                    noise_scale=None, noise_strength=0.0):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get('Principled BSDF')
    if bsdf is None:
        raise RuntimeError('Principled BSDF node missing')
    set_input(bsdf, ['Base Color'], (*base, 1.0))
    set_input(bsdf, ['Metallic'], metallic)
    set_input(bsdf, ['Roughness'], roughness)
    set_input(bsdf, ['Subsurface Weight', 'Subsurface'], subsurface)
    set_input(bsdf, ['Coat Weight', 'Clearcoat'], clearcoat)
    set_input(bsdf, ['Coat Roughness', 'Clearcoat Roughness'], min(0.35, roughness))
    if emission is not None:
        set_input(bsdf, ['Emission Color', 'Emission'], (*emission, 1.0))
        set_input(bsdf, ['Emission Strength'], emission_strength)
    if noise_scale:
        noise = nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = noise_scale
        noise.inputs['Detail'].default_value = 5.0
        noise.inputs['Roughness'].default_value = 0.65
        bump = nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = noise_strength
        bump.inputs['Distance'].default_value = 0.08
        links.new(noise.outputs['Fac'], bump.inputs['Height'])
        if 'Normal' in bsdf.inputs:
            links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def add_uv(name, location, scale, material, segments=64, rings=32):
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments, ring_count=rings, radius=1.0, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def add_ico(name, location, scale, material, subdivisions=4):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def add_curve(name, points, bevel, material, cyclic=False):
    curve = bpy.data.curves.new(name=name + 'Curve', type='CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 16
    curve.bevel_depth = bevel
    curve.bevel_resolution = 6
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def cylinder_between(name, a, b, radius, material):
    a = Vector(a)
    b = Vector(b)
    mid = (a + b) * 0.5
    length = (b - a).length
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=radius, depth=length, location=mid)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (b - a).to_track_quat('Z', 'Y')
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    return obj


def add_disc(name, location, radius, depth, material,
             rotation=(math.radians(90), 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=96, radius=radius, depth=depth, location=location, rotation=rotation
    )
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('MicroBevel', 'BEVEL')
    bevel.width = min(0.035, depth * 0.45)
    bevel.segments = 4
    return obj


def add_ear(name, side, skin_mat, inner_mat):
    sx = 1 if side == 'R' else -1
    verts = [
        (1.02*sx, -0.06, 2.94), (1.92*sx, 0.02, 3.18), (1.10*sx, 0.08, 2.56),
        (1.04*sx, 0.32, 2.92), (1.78*sx, 0.30, 3.13), (1.10*sx, 0.35, 2.62),
    ]
    faces = [(0,1,2), (3,5,4), (0,3,4,1), (1,4,5,2), (2,5,3,0)]
    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(skin_mat)
    bevel = obj.modifiers.new('EarBevel', 'BEVEL')
    bevel.width = 0.06
    bevel.segments = 4
    add_uv(name + 'Inner', (1.22*sx, -0.015, 2.93), (0.38, 0.08, 0.20), inner_mat, 40, 20)
    return obj


def add_cape_panel(name, side, cloak_mat, edge_mat):
    sx = 1 if side == 'R' else -1
    verts = [
        (0.55*sx, 0.20, 1.70), (1.34*sx, 0.38, 1.52), (1.62*sx, 0.68, 0.28),
        (0.92*sx, 0.88, -0.52), (0.26*sx, 0.44, -0.18), (0.40*sx, 0.10, 1.42),
    ]
    mesh = bpy.data.meshes.new(name + 'Mesh')
    mesh.from_pydata(verts, [], [(0,1,2,3,4,5)])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(cloak_mat)
    solid = obj.modifiers.new('CapeSolidify', 'SOLIDIFY')
    solid.thickness = 0.055
    bevel = obj.modifiers.new('CapeBevel', 'BEVEL')
    bevel.width = 0.05
    bevel.segments = 4
    subd = obj.modifiers.new('CapeSubdiv', 'SUBSURF')
    subd.levels = 2
    subd.render_levels = 2
    seam = [
        (0.57*sx,0.16,1.66), (1.30*sx,0.36,1.48),
        (1.58*sx,0.67,0.30), (0.92*sx,0.86,-0.49),
    ]
    add_curve(name + 'EdgeLight', seam, 0.018, edge_mat)
    return obj


def add_area(name, location, energy, size, color, target=(0,0,1.7)):
    bpy.ops.object.light_add(type='AREA', location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.energy = energy
    obj.data.shape = 'DISK'
    obj.data.size = size
    obj.data.color = color
    look_at(obj, target)
    return obj


def build_scene(scene):
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 2048
    scene.render.resolution_y = 2048
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.render.image_settings.color_depth = '8'
    scene.render.image_settings.compression = 18

    if scene.world is None:
        scene.world = bpy.data.worlds.new('World')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs['Color'].default_value = (0.004, 0.009, 0.018, 1.0)
        bg.inputs['Strength'].default_value = 0.12

    skin = make_principled('ScoutSkin', (0.66,0.91,0.96), 0.02,0.34,
                           subsurface=0.08,clearcoat=0.18,noise_scale=7.5,noise_strength=0.08)
    skin_inner = make_principled('ScoutSkinInner', (0.16,0.56,0.66), 0.03,0.42,
                                 emission=(0.08,0.32,0.42), emission_strength=0.4)
    hair = make_principled('ScoutHair', (0.84,0.97,1.0), 0.05,0.20,
                           clearcoat=0.34,noise_scale=9.0,noise_strength=0.16)
    hair_shadow = make_principled('ScoutHairShadow', (0.22,0.48,0.62), 0.08,0.28,
                                  clearcoat=0.25)
    eye = make_principled('ScoutEyeGlass', (0.003,0.025,0.07), 0.08,0.06,
                          emission=(0.01,0.11,0.24),emission_strength=0.32,clearcoat=0.62)
    pupil = make_principled('ScoutPupil', (0.0,0.006,0.018), 0.0,0.05)
    eye_glint = make_principled('EyeGlint', (1,1,1), 0.0,0.04,
                                emission=(0.75,1,1),emission_strength=1.8)
    suit = make_principled('ScoutTechSuit', (0.018,0.055,0.105), 0.46,0.27,
                           clearcoat=0.24,noise_scale=18.0,noise_strength=0.11)
    suit_panel = make_principled('ScoutSuitPanel', (0.035,0.16,0.22), 0.62,0.20,
                                 clearcoat=0.32,noise_scale=24.0,noise_strength=0.07)
    cloak = make_principled('ScoutCloak', (0.015,0.38,0.46), 0.20,0.30,
                            clearcoat=0.18,noise_scale=5.0,noise_strength=0.15)
    cloak_edge = make_principled('ScoutCloakEdge', (0.04,0.72,0.78), 0.16,0.16,
                                 emission=(0.18,0.95,1.0),emission_strength=3.2)
    cyan = make_principled('ScoutCyanEmission', (0.02,0.56,0.72), 0.12,0.10,
                           emission=(0.08,0.86,1.0),emission_strength=5.4)
    cyan_hot = make_principled('ScoutCyanHot', (0.55,1.0,1.0), 0.04,0.07,
                               emission=(0.45,1.0,1.0),emission_strength=9.0)
    purple = make_principled('ScoutPurpleEmission', (0.24,0.10,0.52), 0.18,0.16,
                             emission=(0.36,0.22,1.0),emission_strength=4.8)
    hologlass = make_principled('HoloGlass', (0.03,0.24,0.34), 0.22,0.12,
                                emission=(0.04,0.55,0.72),emission_strength=1.4,clearcoat=0.38)

    # Head / ears / eyes
    add_uv('ScoutHead', (0,0,2.72), (1.03,0.85,1.02), skin, 96,64)
    add_ear('ScoutEarL','L',skin,skin_inner)
    add_ear('ScoutEarR','R',skin,skin_inner)
    for sx in (-1,1):
        side = 'R' if sx > 0 else 'L'
        x = 0.43*sx
        add_uv('ScoutEye'+side, (x,-0.79,2.78), (0.33,0.16,0.43), eye,80,48)
        add_uv('ScoutPupil'+side, (x+0.02*sx,-0.945,2.77), (0.14,0.032,0.22), pupil,56,28)
        add_uv('ScoutGlintA'+side, (x-0.075*sx,-0.984,2.98), (0.065,0.025,0.075), eye_glint,32,16)
        add_uv('ScoutGlintB'+side, (x+0.105*sx,-0.978,2.69), (0.028,0.018,0.034), eye_glint,24,12)
    add_uv('ScoutNose', (0,-0.86,2.48), (0.10,0.08,0.08), skin_inner,32,16)
    add_curve('ScoutSmile', [(-0.24,-0.862,2.30),(0,-0.90,2.23),(0.25,-0.86,2.31)], 0.018, hair_shadow)

    # Hair mass + authored tufts
    add_uv('HairBackMass', (0,0.08,3.46), (1.02,0.76,0.72), hair_shadow,80,48)
    tufts = [
        ((-0.72,-0.38,3.50),(0.38,0.23,0.68),(-0.28,0.08,0.38)),
        ((-0.38,-0.55,3.66),(0.34,0.21,0.76),(-0.18,-0.05,0.24)),
        ((0,-0.62,3.72),(0.37,0.20,0.80),(0,0,0)),
        ((0.39,-0.52,3.64),(0.34,0.20,0.74),(0.16,0.02,-0.28)),
        ((0.74,-0.34,3.47),(0.36,0.22,0.66),(0.24,-0.05,-0.45)),
        ((-0.86,-0.12,3.23),(0.28,0.22,0.60),(-0.08,0.38,0.44)),
        ((0.87,-0.10,3.22),(0.29,0.22,0.60),(0.08,-0.38,-0.44)),
        ((-0.55,-0.68,3.21),(0.25,0.18,0.54),(-0.24,0.16,0.18)),
        ((0.56,-0.68,3.20),(0.25,0.18,0.54),(0.24,-0.16,-0.18)),
        ((-0.18,-0.79,3.16),(0.26,0.14,0.49),(-0.16,0.08,0.05)),
        ((0.19,-0.80,3.15),(0.27,0.14,0.49),(0.17,-0.08,-0.05)),
    ]
    for i,(loc,scale,rot) in enumerate(tufts,1):
        tuft = add_ico(f'HairTuft{i:02d}', loc, scale, hair,4)
        tuft.rotation_euler = rot

    # Antennae
    roots=[(-0.38,0.01,3.98),(0.38,0.01,3.98)]
    tips=[(-0.72,-0.12,4.62),(0.76,-0.10,4.61)]
    for i,(root,tip) in enumerate(zip(roots,tips),1):
        mid=((root[0]+tip[0])*0.5,-0.04,(root[2]+tip[2])*0.5+0.12)
        add_curve(f'Antenna{i}', [root,mid,tip], 0.035, suit_panel)
        add_uv(f'AntennaOrb{i}', tip, (0.13,0.13,0.13), cyan_hot,48,24)

    # Scarf / torso / cloak
    bpy.ops.mesh.primitive_torus_add(major_radius=0.68,minor_radius=0.19,
        major_segments=96,minor_segments=32,location=(0,0.02,1.79),rotation=(math.radians(90),0,0))
    scarf=bpy.context.active_object
    scarf.name='ScoutScarf'
    scarf.scale=(1.0,0.82,1.0)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bpy.ops.object.shade_smooth()
    scarf.data.materials.append(cloak)
    add_uv('ScoutTorso',(0,0.07,0.85),(0.78,0.58,1.12),suit,80,48)
    add_uv('ScoutShoulderL',(-0.72,0.02,1.25),(0.34,0.38,0.42),suit_panel,48,24)
    add_uv('ScoutShoulderR',(0.72,0.02,1.25),(0.34,0.38,0.42),suit_panel,48,24)
    add_cape_panel('ScoutCapeL','L',cloak,cloak_edge)
    add_cape_panel('ScoutCapeR','R',cloak,cloak_edge)

    # Chest armor and radar emblem
    add_disc('ChestPlate',(0,-0.58,0.90),0.48,0.10,suit_panel)
    add_disc('RadarEmblemOuter',(0,-0.645,0.91),0.32,0.055,cyan)
    add_disc('RadarEmblemInner',(0,-0.687,0.91),0.21,0.035,hologlass)
    add_curve('RadarSweep',[(0,-0.725,0.91),(0.12,-0.735,1.03),(0.23,-0.72,1.08)],0.022,cyan_hot)
    add_uv('RadarCenter',(0,-0.745,0.91),(0.055,0.028,0.055),cyan_hot,32,16)
    for i,(x,z) in enumerate([(-0.43,0.47),(0.43,0.47),(-0.36,1.28),(0.36,1.28)],1):
        add_disc(f'SuitNode{i}',(x,-0.55,z),0.075,0.035,cyan if i<3 else purple)

    # Arms and hands; right arm presents holographic UI.
    shoulder_l=(-0.73,-0.02,1.23); elbow_l=(-1.18,-0.56,0.80); hand_l=(-1.38,-0.90,0.63)
    shoulder_r=(0.73,-0.02,1.23); elbow_r=(1.17,-0.55,1.37); hand_r=(1.55,-0.92,1.64)
    for nm,a,b in [
        ('UpperArmL',shoulder_l,elbow_l),('ForeArmL',elbow_l,hand_l),
        ('UpperArmR',shoulder_r,elbow_r),('ForeArmR',elbow_r,hand_r),
    ]:
        cylinder_between(nm,a,b,0.16,suit)
    add_uv('HandL',hand_l,(0.24,0.18,0.22),skin,48,24)
    add_uv('HandR',hand_r,(0.24,0.18,0.22),skin,48,24)
    cylinder_between('PointFingerR',(1.63,-0.93,1.65),(1.98,-1.02,1.72),0.055,skin)
    add_uv('PointFingerTipR',(1.99,-1.02,1.72),(0.07,0.055,0.07),skin,28,14)

    # Holographic tablet; no generated factual UI text is embedded.
    bpy.ops.mesh.primitive_cube_add(size=1.0,location=(2.36,-1.12,1.50))
    tablet=bpy.context.active_object
    tablet.name='HolographicTablet'
    tablet.scale=(0.78,0.055,0.94)
    tablet.rotation_euler=(math.radians(-4),math.radians(10),math.radians(8))
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    tablet.data.materials.append(hologlass)
    bevel=tablet.modifiers.new('TabletBevel','BEVEL')
    bevel.width=0.10; bevel.segments=6
    for r,mat in [(0.46,cyan),(0.33,purple),(0.20,cyan_hot)]:
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=0.018,
            major_segments=96,minor_segments=16,location=(2.36,-1.205,1.52),
            rotation=(math.radians(90),0,0))
        ring=bpy.context.active_object
        ring.name=f'TabletRadarRing{int(r*100)}'
        ring.scale=(1.0,1.0,0.74)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ring.data.materials.append(mat)
    add_curve('TabletSweep',[(2.36,-1.23,1.52),(2.58,-1.23,1.76),(2.75,-1.22,1.86)],0.015,cyan_hot)

    # Hovering energy tail and spatial rings.
    tail_paths=[
        ([(0.12,0.30,-0.12),(0.34,0.42,-0.70),(0.08,0.28,-1.28),(-0.42,0.04,-1.72)],0.20,cyan),
        ([(0.05,0.18,-0.18),(-0.15,0.22,-0.72),(-0.48,0.06,-1.18),(-0.74,-0.10,-1.52)],0.11,purple),
        ([(0.18,0.10,-0.22),(0.52,0.10,-0.55),(0.67,-0.12,-0.95),(0.46,-0.38,-1.40)],0.07,cyan_hot),
    ]
    for i,(pts,bevel,mat) in enumerate(tail_paths,1):
        add_curve(f'EnergyTail{i}',pts,bevel,mat)
    for i,(r,z,mat) in enumerate([(0.72,-1.50,cyan),(1.03,-1.64,purple),(1.33,-1.78,cyan)],1):
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=0.024,
            major_segments=120,minor_segments=16,location=(0,0.20,z))
        ring=bpy.context.active_object
        ring.name=f'HoverRing{i}'
        ring.scale=(1.0,0.52,1.0)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ring.data.materials.append(mat)

    # Holographic arcs behind the character add readable spatial depth.
    for i,(r,depth,rot,mat) in enumerate([
        (2.15,0.020,(math.radians(90),0,math.radians(12)),cyan),
        (2.42,0.017,(math.radians(84),math.radians(8),math.radians(-8)),purple),
        (2.72,0.014,(math.radians(94),math.radians(-10),math.radians(18)),cyan),
    ],1):
        bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=depth,
            major_segments=128,minor_segments=12,location=(0,0.72,1.30),rotation=rot)
        ring=bpy.context.active_object
        ring.name=f'HeroRadarHalo{i}'
        ring.data.materials.append(mat)

    for i,p in enumerate([
        (-1.85,0.4,2.15),(-1.52,-0.2,3.55),(1.35,0.55,3.82),(1.74,0.42,0.28),
        (-1.24,0.34,-0.78),(1.14,0.30,-0.62),(-2.04,0.5,1.05),(2.02,0.48,2.70),
    ],1):
        add_ico(f'HeroParticle{i}',p,(0.055,0.055,0.055),cyan_hot if i%2 else purple,2)

    # Character Bible preferred 3/4 front hero angle.
    bpy.ops.object.camera_add(location=(6.6,-11.8,4.8))
    cam=bpy.context.active_object
    cam.name='RadarScoutHeroCamera'
    cam.data.lens=72
    look_at(cam,(0.15,0.0,1.35))
    scene.camera=cam

    # Lighting is designed to separate skin/hair/glass/cloth/metal instead of
    # hiding weak geometry behind generic glow.
    add_area('HeroKey',(4.6,-5.6,7.4),1900,4.2,(0.78,0.95,1.0),(0,0,1.7))
    add_area('HeroSoftFill',(-4.8,-4.2,3.4),1050,4.8,(0.40,0.72,1.0),(0,0,1.5))
    add_area('HeroCyanRim',(-3.8,2.4,5.8),1750,3.1,(0.08,0.82,1.0),(0,0,1.7))
    add_area('HeroPurpleRim',(4.4,2.7,2.8),1400,2.7,(0.42,0.20,1.0),(0,0,1.5))
    add_area('HeroWarmKicker',(2.2,0.8,-1.4),560,2.0,(1.0,0.34,0.12),(0,0,0.7))
    bpy.ops.object.light_add(type='POINT',location=(0,-3.1,0.9))
    fill=bpy.context.active_object
    fill.name='FaceCatchlight'
    fill.data.energy=420
    fill.data.color=(0.42,0.86,1.0)


def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    output_png,output_blend,output_receipt=parse_args()
    for p in (output_png,output_blend,output_receipt):
        os.makedirs(os.path.dirname(p),exist_ok=True)
    clear_scene()
    scene=bpy.context.scene
    build_scene(scene)
    bpy.ops.wm.save_as_mainfile(filepath=output_blend)
    scene.render.filepath=output_png
    bpy.ops.render.render(write_still=True)
    if not os.path.isfile(output_png) or os.path.getsize(output_png)<=0:
        raise RuntimeError('render did not produce a non-empty PNG')
    rendered=bpy.data.images.load(output_png,check_existing=False)
    width,height=map(int,rendered.size[:])
    channels=int(rendered.channels)
    receipt={
        'schemaVersion':'toolradar.blender.radar-scout-hero.receipt.v1',
        'assetName':'Radar Scout 3D Static Hero v1',
        'sourceReference':'Radar Scout Character Bible Board.png',
        'sourceReferenceRole':'ART_DIRECTION_REFERENCE',
        'renderSucceeded':True,
        'fileName':os.path.basename(output_png),
        'fileFormat':'PNG',
        'width':width,
        'height':height,
        'channels':channels,
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
        'objectCount':len(scene.objects),
        'materialCount':len(bpy.data.materials),
        'keyObjects':['ScoutHead','ScoutEyeL','ScoutEyeR','HairBackMass','ScoutScarf',
                      'ScoutTorso','RadarEmblemOuter','HolographicTablet','EnergyTail1',
                      'AntennaOrb1','AntennaOrb2'],
        'keyMaterials':['ScoutSkin','ScoutHair','ScoutEyeGlass','ScoutTechSuit','ScoutCloak',
                        'ScoutCyanEmission','ScoutPurpleEmission','HoloGlass'],
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
