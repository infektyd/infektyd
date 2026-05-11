# Hans (infektyd)

![Location](https://img.shields.io/badge/Southern_NJ-USA-1f6feb?style=flat-square)
![Focus](https://img.shields.io/badge/focus-local--first_AI_infra-7f5af0?style=flat-square)
![Swift](https://img.shields.io/badge/Swift_6-F05138?style=flat-square&logo=swift&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Rust](https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white)
![Apple](https://img.shields.io/badge/Apple_FoundationModels-000000?style=flat-square&logo=apple&logoColor=white)

I build **local-first AI infrastructure** — multi-agent systems that run on your hardware, stay inspectable, and don't depend on the cloud.

Currently building **Praxis**, an agent-first IDE for macOS, alongside the orchestration and memory tooling around a private [OpenClaw](https://github.com/AgeOfAI-Builders/OpenClaw) multi-agent setup.

[![GitHub](https://img.shields.io/badge/GitHub-infektyd-181717?style=flat-square&logo=github)](https://github.com/infektyd)
[![Hugging Face](https://img.shields.io/badge/Hugging_Face-infektyd-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co/infektyd)

## Selected Work

### Praxis · *current focus*
![macOS](https://img.shields.io/badge/macOS-000?style=flat-square&logo=apple) ![iOS](https://img.shields.io/badge/iOS-000?style=flat-square&logo=apple) ![Swift](https://img.shields.io/badge/Swift-F05138?style=flat-square&logo=swift&logoColor=white) ![Status](https://img.shields.io/badge/repo-private-lightgrey?style=flat-square)

Local-first, agent-first IDE. SwiftUI shell over a headless `praxisd` Swift daemon: 7+ LLM providers, 14 tools behind an authorization gate, JSON-RPC, 243+ tests passing. Optional Compose Multiplatform thin client.

### [Council](https://github.com/infektyd/council)
![Agents](https://img.shields.io/badge/Agents-7f5af0?style=flat-square) ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white) ![Dataset](https://img.shields.io/badge/HF_Dataset-FFD21E?style=flat-square&logo=huggingface&logoColor=black)

Multi-agent orchestration skill for OpenClaw. Routes tasks to specialized model personas, runs parallel deliberation, produces auditable transcripts. [Public dataset on Hugging Face](https://huggingface.co/datasets/infektyd/council-transcripts).

### [Sovereign Memory](https://github.com/infektyd/sovereign-memory)
![Agents](https://img.shields.io/badge/Agents-7f5af0?style=flat-square) ![Infra](https://img.shields.io/badge/Infra-1f6feb?style=flat-square) ![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white) ![FAISS](https://img.shields.io/badge/FAISS-0467DF?style=flat-square)

Local-first memory for agent swarms. Core principle: *identity loads whole, knowledge loads chunked.* SQLite/WAL, FTS5, FAISS, sentence-transformers, markdown-aware chunking; OpenClaw bridge via a local socket daemon. No remote memory service.

### [llmHub](https://github.com/infektyd/llmHub)
![macOS](https://img.shields.io/badge/macOS-000?style=flat-square&logo=apple) ![iOS](https://img.shields.io/badge/iOS-000?style=flat-square&logo=apple) ![Swift](https://img.shields.io/badge/Swift_6-F05138?style=flat-square&logo=swift&logoColor=white) ![MCP](https://img.shields.io/badge/MCP-bridge-2ea44f?style=flat-square)

Native AI agent platform. Swift 6 with strict concurrency, 8 LLM providers behind one protocol, Brain/Hand/Loop architecture, 16 built-in tools + MCP bridge, `@mention` routing with concurrent streaming up to 4 agents. Integrates Sovereign Memory.

### [Syntra](https://github.com/infektyd/Syntra)
![Swift](https://img.shields.io/badge/Swift-F05138?style=flat-square&logo=swift&logoColor=white) ![Apple](https://img.shields.io/badge/Apple_FoundationModels-000?style=flat-square&logo=apple) ![Research](https://img.shields.io/badge/Research-c084fc?style=flat-square)

Cognitive-architecture research project on Apple FoundationModels. Three-brain system (Valon / Modi / Core) with drift tracking and elastic weight consolidation. Cross-platform across iOS/macOS/watchOS/visionOS, Vapor server, with a companion Python eval harness covering GSM8K and ARC.

### [Binary Forge](https://github.com/infektyd/Binary-Forge)
![Systems](https://img.shields.io/badge/Systems-0a0a0a?style=flat-square) ![x86_64](https://img.shields.io/badge/x86--64-blue?style=flat-square) ![Linux](https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux&logoColor=black)

Hand-forged x86-64 Linux binaries. No compiler, no libc — raw ELF and direct syscalls.

## Stats

<a href="https://github.com/infektyd">
  <img src="./github-metrics.svg" alt="GitHub metrics" />
</a>

## Tech

Swift 6 (strict concurrency) · SwiftUI · Vapor · Python · Rust · x86-64 assembly · Apple FoundationModels · SQLite / FTS5 · FAISS · sentence-transformers · JSON-RPC · MCP · Compose Multiplatform

---

Southern NJ · [Hugging Face](https://huggingface.co/infektyd)
