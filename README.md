# Hans (infektyd)

I build local-first AI infrastructure — systems that stay on your hardware, stay inspectable, and don't depend on cloud APIs at runtime.

Most of my time right now goes into multi-agent coordination. I run a private [OpenClaw](https://github.com/AgeOfAI-Builders/OpenClaw) setup where multiple LLM agents collaborate through a shared workspace, and I'm building the tooling around that:

- **[Sovereign Memory](https://github.com/infektyd/sovereign-memory)** — Local memory system for agent swarms. Hybrid FTS5 + FAISS retrieval, cross-encoder re-ranking, markdown-aware chunking, write-back memory, context window budgeting. The agents built V1 and V2 themselves; V3.1 is the cleaned-up version.
- **LobsterTauri** *(in progress)* — Dynamic group chat for controlled agent swarms. React/Vite + Tauri. Agents coordinate as sub-agents, speed-running tasks together in a managed conversation.
- **[Syntra](https://github.com/infektyd/Syntra)** — Swift AI morality framework. Vapor server, multi-provider LLM support, tool registry, and context management.
- **[llmHub](https://github.com/infektyd/llmHub)** — Native macOS/iOS AI client with Brain/Hand/Loop architecture and MCP support.
- **[Binary Forge](https://github.com/infektyd/Binary-Forge)** — Hand-forged x86-64 Linux binaries. No compiler, no libc — raw ELF, direct syscalls, machine code.
- **[Syntra-Testing](https://github.com/infektyd/Syntra-Testing)** — Python evaluation framework for testing LLM agent reasoning, tool use, and conversation quality.

I favor explicit state, local-first design, and solutions that remain under your control. The goal is infrastructure that's useful regardless of which foundation model is underneath.

Del Haven, NJ · [Hugging Face](https://huggingface.co/infektyd)
