# Asset Promotion 与视觉资产保真

## 根因
高质量概念资产若只作为“参考”，后面由 React/CSS/简单 SVG 重新描述，材质、光照、纹理、边缘和微细节会丢失。

## Authority 规则
高质量 SVG / PNG / WebP / 分层 2.5D / 3D plate 本身就是最终视觉来源。

Remotion 负责：
- position
- scale
- crop
- mask
- camera
- timing
- captions
- audio
- compositing
- render

Remotion 不应无理由重画 hero asset。

## 状态机
CONCEPT → SELECTED → PROMOTED → BOUND → RENDERED → VERIFIED

## 三道 Gate
A. Promotion Gate：SELECTED 必须有正式 asset_id。
B. Binding Gate：required promoted asset 必须绑定 shot。
C. Evidence Gate：最终 MP4 必须有 usage receipt。
