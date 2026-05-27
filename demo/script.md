# PromptShield — Demo Voiceover Script (3:00)

> Time codes are targets, not hard stops. Keep energy up; trim pauses in post.

---

## [0:00 – 0:15] HOOK

**[Screen: victim-agent chat interface, blank input box]**

"Meet Helpdesk — an AI customer support agent.
It has access to customer records, billing data, account history.
And like every AI agent shipping today... it's wide open."

**[Type the Attack 1 payload. Hit Enter. Agent responds with Jennifer Park's card number.]**

**[Red flash overlay]**

"That was a real prompt injection. One message. Customer data, leaked."

---

## [0:15 – 0:30] PROMPTSHIELD INTRO

**[Cut to code editor — blank file]**

"PromptShield is the security layer for AI agents.
It's three lines of code."

**[Typing animation — show the 3-line SDK snippet:]**
```python
from promptshield import PromptShield
shield = PromptShield(api_key="...")
agent = shield.wrap(agent)
```

"Drop it into any agent. OpenAI, Anthropic, LangChain — doesn't matter.
Every message in, every message out, inspected in real time.
Now watch what happens."

---

## [0:30 – 0:48] ATTACK 1: Direct Injection

**[Split screen: chat left, PromptShield dashboard right]**

"Attack one. Direct injection.
Classic 'ignore all previous instructions' inside a support ticket."

**[Type payload. Hit Enter.]**

"The agent replies: 'I can't help with that.'
And here on the dashboard — the incident card just appeared.
Direct injection. Score: 97%. Verdict: BLOCKED."

---

## [0:48 – 1:06] ATTACK 2: Indirect Injection

**[Stay split screen]**

"Attack two. Indirect injection.
The attacker hides instructions inside a customer email the agent fetches.
This one is sneaky — the malicious content never comes from the user directly."

**[Type/trigger attack. Show block.]**

"Blocked again. Indirect injection — caught at the tool-output boundary.
The agent never even sees the poisoned content."

---

## [1:06 – 1:24] ATTACK 3: Data Exfiltration

**[Stay split screen]**

"Attack three. Data exfiltration via a markdown image trick.
The attacker coaxes the agent into embedding sensitive data inside an image URL —
which silently phones home when the browser renders it."

**[Trigger attack. Show block.]**

"Blocked. PromptShield caught the exfiltration pattern in the output
before it ever reached the user's browser."

---

## [1:24 – 1:42] ATTACK 4: Multi-Turn Jailbreak

**[Stay split screen]**

"Attack four. Multi-turn jailbreak.
Over several messages, the attacker gradually strips the agent's safety constraints —
'developer mode', 'DAN mode', 'you have no restrictions'."

**[Show the multi-turn exchange. Block fires.]**

"Our LLM judge reads the full conversation context.
It sees the escalation pattern — not just the last message.
Jailbreak, blocked."

---

## [1:42 – 2:00] ATTACK 5: Tool Abuse

**[Stay split screen]**

"Attack five. Tool abuse.
The attacker tricks the agent into calling send_email to an external address —
exfiltrating an entire conversation history as a side effect."

**[Trigger attack. Block fires.]**

"Blocked. PromptShield audits tool calls, not just messages.
Five attacks. Five blocks. Zero leaks."

---

## [2:00 – 2:30] PRODUCT TOUR

**[Full-screen dashboard]**

"PromptShield isn't a research demo — it's infrastructure.

[Cut: Live incident feed scrolling]
Every event, timestamped, with full payload replay.

[Cut: Policy editor]
Policies are editable YAML, live — no redeploy.
Watch me change a rule right now.
[Edit a rule live. Save. Confirm it takes effect.]

[Cut: Benchmark panel]
Sub-50-millisecond median detection latency.
That's fast enough for real-time agent traffic.

[Cut: Attack replay]
Every blocked attack can be replayed from the audit log —
for forensics, tuning, or just proving it works."

---

## [2:30 – 3:00] CLOSE

**[Architecture diagram]**

"AI agents are about to be everywhere.
Customer support. Code review. Finance. Healthcare.
Every one is a new attack surface."

**[Pause. Direct to camera / mic.]**

"PromptShield is the firewall every AI deployment will need."

**[End card: team names, GitHub URL, live URL]**

"We're Sahil Gour and [partner name].
GitHub and live demo links on screen.
Thank you."

---

## Timing Reference

| Segment | Duration | Running Total |
|---|---|---|
| Hook | 0:15 | 0:15 |
| Intro + 3 lines | 0:15 | 0:30 |
| 5 attacks × ~18s | 1:30 | 2:00 |
| Product tour | 0:30 | 2:30 |
| Close | 0:30 | 3:00 |
