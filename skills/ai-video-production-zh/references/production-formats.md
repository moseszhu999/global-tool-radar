# 正式资产格式选择

| 类型 | 推荐 |
|---|---|
| Logo / icon / UI / 几何 | SVG |
| 照片 / AI 插画 / 电影背景 | PNG / WebP |
| 主体/前景/背景可拆 | Layered PNG/WebP + Depth |
| 大幅旋转/绕拍/骨骼 | GLB / glTF / Blender |
| 标题/字幕/数字 | React / HTML / CSS |

不要把所有 PNG 机械矢量化。

## 2.5D
把背景、主体、前景、光效、遮罩、depth 拆开，用 parallax / camera push / blur / focus 制造空间感。

## 3D
适合：
- 可复用角色
- 产品
- 设备
- 长期主持人/吉祥物
- 需要绕拍的空间

不适合：
- 一次性背景
- 普通字幕
- 只需轻微运动的插画
