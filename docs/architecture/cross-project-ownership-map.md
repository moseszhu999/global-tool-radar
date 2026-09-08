# Global Tool Radar / Video Operation Cross-Project Ownership Map

This repository owns ToolRadar / Video Operation product workflows and contains product-neutral Shared Media infrastructure where explicitly defined as shared. Current runtime truth still comes from each repository's current `main`, open PRs and accepted contracts.

| Project | Repository | Owns | Relationship to this repository |
|---|---|---|---|
| Global Tool Radar / Video Operation | `moseszhu999/global-tool-radar` | Tool discovery, evidence-backed content opportunity workflows, social-content packaging/operations, and shared media contracts/runtime adapters that are explicitly product-neutral | This repository |
| AI Native Platform | `moseszhu999/ai-native-platform` | Shared Workspace, generic Case/Conversation, Plugin/App composition, Agent Runtime abstraction, Capability Router, MCP Gateway, host/channel integration | Can install/route media and content capabilities; does not own render truth or Video Operation publishing logic |
| TrainingOS | `moseszhu999/training-learning-rails` | Education/training truth: learners/classes/schedule/OJT/assessment/evidence interpretation/capability credentials | Consumes Shared Media for course/lesson content through bounded adapters; TrainingOS owns teaching semantics |
| TradeOS / Supply Chain OS | `moseszhu999/chaintrace-app` | Trade/sourcing/supplier/RFQ/quotation/evidence/review truth | May consume Shared Media/document capabilities; TradeOS owns trade semantics and authority |
| PMAI / ProjectOS | `moseszhu999/pmai` | Project/task state, schedule/recovery, execution graph, proposals, HumanCheckpoint and project-change authority | May schedule/coordinate media/content work, but media result/publishing truth remains with this repository |
| AI Execution OS (AIEXE) | `moseszhu999/ai_exe_os` | Execution-control workers, allowed browser/session orchestration, GitHub-native execution evidence and provider compliance gates | May execute bounded content/media tasks; does not own media result truth or publishing decisions |

## Shared Media boundary

Product-neutral Shared Media should expose bounded contracts such as render request/result/evidence and remain reusable by TrainingOS, TradeOS, PMAI and future Domain Apps.

Video Operation keeps product-specific concerns such as:

- social hook and narrative packaging;
- platform-native title/caption/CTA;
- channel packaging and publishing workflow;
- analytics and feedback loops.

Do not push those social/product semantics down into Shared Media.

## Cross-repository protocol

Before changing a contract consumed by another project:

1. read that project's `AGENTS.md` / `CLAUDE.md` and canonical context;
2. re-fetch current main/open PRs/owner scopes;
3. preserve one owner for render truth, domain truth, project truth, publishing truth and execution truth;
4. integrate through versioned adapters/contracts rather than copied pipelines;
5. validate exact-head compatibility before claiming cross-project PASS.
