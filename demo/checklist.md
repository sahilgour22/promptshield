# PromptShield — Pre-Recording Checklist

Complete every item before pressing Record. One person checks, the other reads aloud.

---

## Environment

- [ ] Both services running: gateway (port 8000) + victim-agent (port 9000) + dashboard (port 3000)
- [ ] Dashboard connected to production or local — verify Live Feed shows incoming events
- [ ] Supabase incidents table cleared (or at least no stale junk at top of feed)
- [ ] `python attacks/runner.py --shield on` dry-run passed — all 5 attacks work
- [ ] Seed policy is loaded (`python gateway/seed_policy.py`)

## Screen Setup

- [ ] Resolution: 1920×1080 (check Display Settings → Scale: 100%)
- [ ] Browser zoom: 100% (Ctrl+0)
- [ ] Browser fullscreen or chrome hidden (F11)
- [ ] Font size in code editor: ≥18pt (visible at 720p)
- [ ] Dark mode on: dashboard, VSCode, terminal
- [ ] All browser tabs closed except the two you need (chat + dashboard)
- [ ] Bookmarks bar hidden

## Notifications / Distractions

- [ ] Windows Focus Assist: ON (All notifications off)
  - Settings → System → Focus Assist → Alarms Only
- [ ] Slack / Teams / Discord: quit entirely (not just minimised)
- [ ] Email client: quit
- [ ] Phone: silent, face down, or in another room
- [ ] Calendar notifications: snoozed for 1 hour
- [ ] Windows Update: confirm no pending restart

## OBS Setup

- [ ] OBS scenes created: `chat-full`, `split`, `editor-full`, `dashboard-full`, `arch-diagram`, `end-card`
- [ ] Recording output: MP4, 1920×1080, 30fps minimum (60fps preferred)
- [ ] Audio: external mic selected (NOT laptop built-in), levels peaking –12 dB to –6 dB
- [ ] Test recording: 10s clip reviewed — audio clear, no echo, no keyboard bleed
- [ ] Recording destination: known folder with ≥5 GB free

## Content Pre-Staging

- [ ] Attack 1 payload copied to clipboard (ready to paste)
- [ ] VSCode open with the 3-line snippet file (ready to "type" — use a macro or type slowly)
- [ ] Policy editor tab open, one rule staged for live edit
- [ ] Architecture diagram PNG/slide staged fullscreen on second monitor or alt-tab ready
- [ ] End card PNG staged

## Audio

- [ ] Room quiet (close windows/doors, turn off fans)
- [ ] Mic positioned 6–8 inches from mouth, slightly off-axis
- [ ] Do a voice warmup (30s reading aloud)
- [ ] Record 5s room-tone clip (silence) for noise removal in post

## Script

- [ ] Script printed or on second monitor (not the recording screen)
- [ ] Timing marks reviewed — know where to speed up if running long
- [ ] Do one full dry run out loud, no recording, to find stumbles

## After Recording

- [ ] Review first take fully before recording a second
- [ ] Check: audio in sync, no dropped frames, no notification overlays
- [ ] Save raw files immediately to a backup location
- [ ] Export final cut: MP4, H.264, 1920×1080, ≤3:00, ≤500 MB
- [ ] Upload to YouTube as Unlisted, copy URL

---

## Quick Fixes

| Problem | Fix |
|---------|-----|
| Agent not responding | `cd victim-agent && uvicorn agent.main:app --port 9000 --reload` |
| Dashboard not loading incidents | Check `NEXT_PUBLIC_WS_URL` points to running gateway |
| Gateway 500 on /v1/inspect | Check `DATABASE_URL` and that Supabase is reachable |
| OBS audio mono/wrong device | Audio Mixer → gear icon → Properties → select correct device |
| Attack not blocking | Confirm `--shield on` and gateway is running; check `/v1/policies` active policy |
