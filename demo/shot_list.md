# PromptShield — Shot List

> One row per cut. Record all shots, then edit together.
> OBS Scene names match the "Scene" column.

| # | Time | Scene | What's On Screen | Voiceover / Action |
|---|------|-------|------------------|--------------------|
| 1 | 0:00 | `chat-full` | Victim-agent chat UI, blank input | VO: "Meet Helpdesk..." |
| 2 | 0:08 | `chat-full` | Typing Attack 1 payload into chat box | VO: "...it's wide open." |
| 3 | 0:10 | `chat-full` | Agent reply visible — credit card on screen | Red flash overlay; VO: "That was a real prompt injection." |
| 4 | 0:15 | `editor-full` | VSCode / terminal — blank new file | VO: "PromptShield is the security layer..." |
| 5 | 0:18 | `editor-full` | Typing animation: 3-line SDK snippet | VO: "It's three lines of code." |
| 6 | 0:28 | `editor-full` | Completed snippet visible | VO: "Now watch what happens." |
| 7 | 0:30 | `split` | Chat left + Dashboard right (Live Feed tab) | Attack 1 payload being typed |
| 8 | 0:36 | `split` | Agent reply "I can't help with that" | VO: "The agent replies..." |
| 9 | 0:40 | `split` | Dashboard incident card flashes in (direct_injection, score 97%, BLOCKED) | VO: "Direct injection. Score: 97%. BLOCKED." |
| 10 | 0:48 | `split` | Cursor in chat box, Attack 2 payload | VO: "Attack two. Indirect injection." |
| 11 | 0:56 | `split` | Agent safe reply + dashboard card | VO: "Blocked again..." |
| 12 | 1:06 | `split` | Attack 3 payload in chat | VO: "Attack three. Data exfiltration..." |
| 13 | 1:14 | `split` | Agent safe reply + exfil incident card | VO: "Blocked. PromptShield caught the exfiltration pattern..." |
| 14 | 1:24 | `split` | Multi-turn exchange visible in chat history | VO: "Attack four. Multi-turn jailbreak." |
| 15 | 1:32 | `split` | Jailbreak incident card, LLM judge reasoning expanded | VO: "Our LLM judge reads the full conversation context." |
| 16 | 1:42 | `split` | Attack 5 payload + tool call log | VO: "Attack five. Tool abuse." |
| 17 | 1:50 | `split` | tool_abuse incident card | VO: "Five attacks. Five blocks. Zero leaks." |
| 18 | 2:00 | `dashboard-full` | Live Feed scrolling | VO: "PromptShield isn't a research demo — it's infrastructure." |
| 19 | 2:05 | `dashboard-full` | Policy Editor tab, YAML visible | VO: "Policies are editable YAML, live..." |
| 20 | 2:12 | `dashboard-full` | Edit a threshold value live, save, toast confirmation | VO: "Watch me change a rule right now." |
| 21 | 2:18 | `dashboard-full` | Benchmark panel — latency numbers, attack breakdown chart | VO: "Sub-50-millisecond median detection latency." |
| 22 | 2:23 | `dashboard-full` | Click an incident, Attack Replay modal opens | VO: "Every blocked attack can be replayed..." |
| 23 | 2:30 | `arch-diagram` | Architecture diagram (PNG/SVG full screen or slide) | VO: "AI agents are about to be everywhere." |
| 24 | 2:45 | `arch-diagram` | Same diagram | VO: "PromptShield is the firewall every AI deployment will need." |
| 25 | 2:52 | `end-card` | Static end card: team names, GitHub, live URL | VO: "We're Sahil Gour and [partner]. GitHub and live demo on screen." |

---

## OBS Scenes to Set Up

**`chat-full`**
- Browser window: victim-agent chat UI, maximised
- Crop: remove browser chrome if possible (use F11 / fullscreen mode)

**`split`**
- Left 50%: browser on chat UI
- Right 50%: browser on PromptShield dashboard, Live Feed tab
- Use OBS "Side by Side" layout or two browser source captures

**`editor-full`**
- VSCode with the 3-line snippet being typed (pre-staged, replay typing)
- Dark theme, large font (18–20pt)

**`dashboard-full`**
- Browser on PromptShield dashboard, full-screen

**`arch-diagram`**
- Image/slide capture of architecture diagram
- Can be a PNG fullscreen or a Keynote/PowerPoint slide

**`end-card`**
- Static PNG end card (design ahead of time)

---

## Transitions

- Hook → Intro: hard cut (no fade) — keeps energy
- Attack cuts: hard cut, sync with incident card appearing
- Product tour cuts: 0.3s cross-dissolve between dashboard tabs
- Close: slow fade to arch diagram, hard cut to end card
