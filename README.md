# Hans (infektyd)

I build local-first AI infrastructure — systems that stay on your hardware, stay inspectable, and don't phone home to the cloud.

Most of my time goes into multi-agent coordination. I run a private [OpenClaw](https://github.com/AgeOfAI-Builders/OpenClaw) setup where multiple LLM agents collaborate through a shared workspace, and I build the tooling around that.

> **⚠️ sudo RSI** — I've been typing so much multi-agent orchestration code that my wrists filed a formal grievance. My carpal tunnels have carpal tunnels. The agents are starting to type for me, which is either the future of AI or a cry for help. Possibly both.
>
> Don't believe me? Here's [42KB of agents writing raw x86-64 assembly while I sat there](https://github.com/infektyd/council/blob/main/examples/transcripts/council_transcript_20260315_101059.md). My keyboard is filing for workers' comp.

### Agent Orchestration

- **[Council](https://github.com/infektyd/council)** — Multi-agent orchestration skill for OpenClaw. Routes tasks to specialized Grok personas (Workhorse, Creative, Speed), runs parallel deliberation with model diversity, synthesizes verdicts, and produces auditable transcripts. Agents self-coordinate through minimal scaffolding — no rigid hierarchies. [Dataset on Hugging Face](https://huggingface.co/datasets/infektyd/council-transcripts).
- **[Sovereign Memory](https://github.com/infektyd/sovereign-memory)** — Local-first memory infrastructure for agent swarms. The core opinion is still: **identity loads whole, knowledge loads chunked.** Agent identity files (`IDENTITY.md`, `SOUL.md`) hydrate as complete documents before retrieved knowledge enters context, so an agent's sense of self doesn't get shredded into RAG fragments. The public package is the portable core: SQLite/WAL, FTS5, FAISS, sentence-transformers embeddings, markdown-aware chunking, write-back learnings, episodic events, memory decay, and graph export. The newer work is the integration layer: an OpenClaw/Hermes bridge that lets running agents use Sovereign Memory through a local socket daemon, with optional Apple Foundation Models extraction/adapter infrastructure kept as local runtime plumbing rather than bundled repo data. No cloud dependency, no remote memory service, no mystery black box.

### Native Apps & Frameworks

- **LobsterTauri** *(in progress)* — Dynamic group chat for controlled agent swarms. React/Vite + Tauri. Agents coordinate as sub-agents, speed-running tasks together in a managed conversation.
- **[llmHub](https://github.com/infektyd/llmHub)** — Native macOS/iOS AI agent platform. Swift 6 with strict concurrency, 8 LLM providers behind a shared protocol (OpenAI, Anthropic, Gemini, Grok, Mistral, OpenRouter, Apple Foundation Models, and OpenClaw for agent-routed requests). Brain/Hand/Loop architecture: Brain owns LLM inference, Hand owns 16 built-in tools + MCP bridge for runtime extension, Loop handles chat orchestration, context compaction, and multi-agent coordination. Agents are discovered dynamically from your OpenClaw gateway — `@mention` routing, concurrent streaming (up to 4 agents), per-agent session keys, and agent roster injection so each agent knows who else is in the conversation. Integrates Sovereign Memory for cross-session recall.
- **[Syntra](https://github.com/infektyd/Syntra)** — My first programming project — a Swift cognitive architecture built on Apple FoundationModels. Three-brain system: Valon (moral/creative, 70%), Modi (analytical/logical, 30%), and Core (synthesis + drift monitoring). It's a consciousness research platform more than a chat framework — cognitive drift tracking, moral continuity enforcement, memory rehearsal, elastic weight consolidation. Vapor server, multi-provider LLM support, cross-platform (iOS/macOS/watchOS/visionOS). I learned Swift, concurrency, and agent architecture by building this.
- **[Syntra-Testing](https://github.com/infektyd/Syntra-Testing)** — Python evaluation framework I built to test Syntra's reasoning and explain the system to myself and anyone else. GSM8K, ARC, and custom benchmarks with automated grading, concurrent evaluation runners, matplotlib visualizations, and PDF report generation. The act of building the test harness taught me more about what Syntra was actually doing than building Syntra did.

### Systems Programming

- **[Binary Forge](https://github.com/infektyd/Binary-Forge)** — Hand-forged x86-64 Linux binaries. No compiler, no libc — raw ELF, direct syscalls, machine code.

---

I favor explicit state, local-first design, and solutions that remain under your control. The goal is infrastructure that's useful regardless of which foundation model is underneath.

Southern NJ · [Hugging Face](https://huggingface.co/infektyd)
