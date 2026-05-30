# A Team — Decision Tree

> **How to read this:** Start at the top. Follow the arrow that matches your situation. Every node is mandatory — you cannot skip a gate.

```mermaid
flowchart TD
    START(["🎯 What are you about to do?"])

    START --> F1{New feature\nor component}
    START --> F2{Bug or test\nfailure}
    START --> F3{Build is\nbroken}
    START --> F4{New API\nendpoint}
    START --> F5{DB schema\nchange}
    START --> F6{Claiming\ndone}
    START --> F7{About to\nmerge}
    START --> F8{Production\nis down}
    START --> F9{Performance\nproblem}
    START --> F10{Architecture\ndecision}
    START --> F11{Code was\nwritten}

    %% --- FEATURE FLOW ---
    F1 --> A1["🧠 brainstorming\n(design first, always)"]
    A1 --> A2["📋 writing-plans\n(phased plan, exact file paths)"]
    A2 --> A3["🌿 using-git-worktrees\n(isolate before touching code)"]
    A3 --> A4["🔴 test-driven-development\n(RED before GREEN)"]
    A4 --> A5["🤖 subagent-driven-development\n(dispatch per task)"]
    A5 --> A6["👁️ code-reviewer\n(after every change)"]
    A6 --> GATE_MERGE

    %% --- BUG FLOW ---
    F2 --> B1["🔍 debugger agent\n(Phase 1: root cause first)"]
    B1 --> B2{"Root cause\nfound?"}
    B2 -->|No — 3+ attempts| B3["🛑 STOP\narchitectural problem\ntalk to human"]
    B2 -->|Yes| B4["🔴 test-driven-development\n(write failing test first)"]
    B4 --> B5["✅ verification-before-completion\n(run test, read output)"]
    B5 --> A6

    %% --- BUILD FLOW ---
    F3 --> C1["🔧 build-error-resolver\n(collect ALL errors first)"]
    C1 --> C2["Fix incrementally\none error at a time"]
    C2 --> C3["✅ verification-before-completion\n(build passes)"]

    %% --- API FLOW ---
    F4 --> D1["📄 api-contract-first\n(OpenAPI / protobuf before code)"]
    D1 --> D2["Contract review\n(naming, errors, versioning, security)"]
    D2 --> D3["✅ Contract approved"]
    D3 --> A2

    %% --- DB MIGRATION FLOW ---
    F5 --> E1["🗄️ data-migration\n(write rollback plan first)"]
    E1 --> E2["Classify risk\n(additive / rename / drop)"]
    E2 --> E3{"Risk level"}
    E3 -->|Low| E4["Single deploy\ndry run in staging"]
    E3 -->|High| E5["Multi-phase deploy\ntest DOWN migration"]
    E4 --> E6["✅ Verify row counts\nbefore and after"]
    E5 --> E6

    %% --- DONE FLOW ---
    F6 --> G1["✅ verification-before-completion\nStep 1–4: run command, read output"]
    G1 --> G2{"Output\nconfirms claim?"}
    G2 -->|No| G3["Fix issue\nre-verify from Step 1"]
    G3 --> G1
    G2 -->|Yes| G4["🧹 Step 5: prune workspace\n(delete logs, stack traces)"]
    G4 --> G5["Report done ✓"]

    %% --- MERGE FLOW ---
    F7 --> GATE_MERGE
    GATE_MERGE["🔒 /quality-gate"]
    GATE_MERGE --> H1["🔍 harness-optimizer\n(pipeline audit — did agents actually run checks?)"]
    H1 --> H2{"AUDIT.md\nverdict?"}
    H2 -->|BLOCK MERGE| H3["Route back to\nfailing agents"]
    H3 --> H1
    H2 -->|PASS| H4["Parallel reviews"]
    H4 --> H5["👁️ code-reviewer"]
    H4 --> H6["🔐 security-reviewer"]
    H4 --> H7["🗣️ language reviewer\n(go/python/rust/kotlin\nswift/flutter/infra/ai)"]
    H5 & H6 & H7 --> H8{"Any CRITICAL\nor HIGH?"}
    H8 -->|Yes| H9["Fix findings\nre-run gate"]
    H9 --> GATE_MERGE
    H8 -->|No| H10["✅ Clear to merge"]

    %% --- INCIDENT FLOW ---
    F8 --> I1["🚨 incident-response\nDeclare immediately"]
    I1 --> I2["Phase 1: Detect\n(what, who, when)"]
    I2 --> I3["Phase 2: Contain\n(rollback > hotfix)"]
    I3 --> I4["Phase 3: Diagnose\n(evidence, not guesses)"]
    I4 --> I5["Phase 4: Resolve\n(one change, verify recovery)"]
    I5 --> I6["Phase 5: Post-mortem\n(within 48h, blameless)"]

    %% --- PERFORMANCE FLOW ---
    F9 --> J1["📊 performance-profiler\nestablish baseline FIRST"]
    J1 --> J2["Profile with correct tool\n(pprof / py-spy / Instruments / DevTools)"]
    J2 --> J3["Locate the actual bottleneck\n(not the assumed one)"]
    J3 --> J4["Apply ONE change"]
    J4 --> J5["performance-audit\nmeasure again — hard numbers only"]
    J5 --> J6{"Improvement\nconfirmed?"}
    J6 -->|No — inconclusive| J3
    J6 -->|Yes| J7["✅ Report with\nbefore/after delta"]

    %% --- ARCHITECTURE FLOW ---
    F10 --> K1["🏛️ architect agent\n(produces ADR)"]
    K1 --> K2["Trade-off analysis\n(pros / cons / alternatives)"]
    K2 --> K3["ADR written and\nadded to docs/"]
    K3 --> K4{"Ambiguous\nimplementation?"}
    K4 -->|Yes| K5["Orchestrator: AMB-NNN\nto Veto Buffer"]
    K5 --> K6["Human resolves\nbefore dispatch"]
    K4 -->|No| A2

    %% --- CODE REVIEW FLOW ---
    F11 --> L1["Check File Claims\nin ROUTING.md"]
    L1 --> L2{"File claimed\nby another agent?"}
    L2 -->|Yes| L3["BLOCK\nwait for claim release"]
    L2 -->|No| L4["👁️ code-reviewer\n(Surgical Changes check\n+ quality + security)"]
    L4 --> L5{"Language\nspecialist needed?"}
    L5 -->|Go| L6["go-reviewer"]
    L5 -->|Python| L7["python-reviewer"]
    L5 -->|Kotlin| L8["kotlin-reviewer"]
    L5 -->|Swift| L9["swift-reviewer"]
    L5 -->|Flutter| L10["flutter-reviewer"]
    L5 -->|Rust| L11["rust-reviewer"]
    L5 -->|IaC| L12["infra-reviewer"]
    L5 -->|LLM code| L13["ai-reviewer"]
    L5 -->|None needed| L14["✅ Review complete"]
    L6 & L7 & L8 & L9 & L10 & L11 & L12 & L13 --> L14

    %% Styling
    classDef gate fill:#dc2626,color:#fff,stroke:#991b1b,font-weight:bold
    classDef skill fill:#2563eb,color:#fff,stroke:#1d4ed8
    classDef agent fill:#7c3aed,color:#fff,stroke:#5b21b6
    classDef decision fill:#d97706,color:#fff,stroke:#92400e
    classDef ok fill:#16a34a,color:#fff,stroke:#15803d
    classDef stop fill:#374151,color:#fff,stroke:#1f2937

    class GATE_MERGE,G1,D1,E1 gate
    class A1,A2,A3,A4,A5,B4,B5,C2,D2,E2,E4,E5,G4,J1,J2,J3,J4,J5,I1,I2,I3,I4,I5,I6 skill
    class B1,C1,H5,H6,H7,K1,L4,L6,L7,L8,L9,L10,L11,L12,L13,H1 agent
    class F1,F2,F3,F4,F5,F6,F7,F8,F9,F10,F11,B2,E3,G2,H2,H8,J6,K4,L2,L5 decision
    class G5,H10,J7,K3,C3,E6,L14 ok
    class B3,H9,H3,L3 stop
```

---

## Quick Reference — Mandatory Sequences

| Situation | Required sequence |
|-----------|------------------|
| New feature | `brainstorming` → `writing-plans` → `using-git-worktrees` → `TDD` → `subagent-driven-dev` → `code-reviewer` → `/quality-gate` |
| Bug fix | `debugger` (Phase 1) → `TDD` → `verification-before-completion` → `code-reviewer` |
| New API | `api-contract-first` (contract approved) → `writing-plans` → implement |
| DB change | `data-migration` (rollback plan) → staging dry-run → verify row counts |
| Claiming done | `verification-before-completion` Steps 1–5 (run + read + prune) |
| Any merge | `harness-optimizer` → `/quality-gate` → all clear |
| Production down | `incident-response` phases 1–5 → post-mortem |
| Performance issue | `performance-profiler` (baseline) → profile → 1 change → `performance-audit` (measure) |
