# PromptShield — Final Submission Checklist

Complete every item before submitting. Both team members sign off.

---

## Deliverables

- [ ] Deck PDF < 20 MB, named `PromptShield_Deck.pdf`
- [ ] Demo video < 3 min, MP4 H.264, 720p+, uploaded to YouTube as Unlisted
- [ ] GitHub repo public, README clean, all secrets removed
- [ ] Live link verified from an external network (cellular / different Wi-Fi)
- [ ] Live link will stay accessible for 30 days post-submission

## Content Review

- [ ] All 4 deliverables tested by both team members independently
- [ ] Demo video: audio clear, no notifications visible, no stutter
- [ ] Deck: team names, GitHub URL, and live demo URL on the title or closing slide
- [ ] README: setup instructions work from a clean clone (tested on fresh environment)

## Security / Hygiene

- [ ] No `.env` files committed to the repo (`git grep -r "AZURE_OPENAI_API_KEY"` returns nothing)
- [ ] No hardcoded passwords, tokens, or connection strings in source
- [ ] `.gitignore` covers `.env`, `*.pyc`, `node_modules/`, `.next/`
- [ ] Supabase project set to "Paused" protection (or free-tier safeguards noted)

## Production Verification

- [ ] `python scripts/verify_production.py --gateway-url <AZURE_URL> --agent-url <AGENT_URL>` exits 0
- [ ] Dashboard live at Vercel URL, loads with no console errors
- [ ] WebSocket connection established (Live Feed shows events)
- [ ] `/health` returns `{"status":"ok"}` on the Azure URL

## Submission Form

- [ ] Team name entered correctly
- [ ] Category / track selected
- [ ] GitHub repo URL pasted
- [ ] Live demo URL pasted
- [ ] YouTube video URL pasted (Unlisted, not Private)
- [ ] Deck PDF uploaded
- [ ] Submitted before deadline

---

**Signed off by:** __________________ and __________________ on __________________
