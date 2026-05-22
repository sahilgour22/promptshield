"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Copy, Eye, EyeOff, RefreshCw, Trash2, Check, Plus } from "lucide-react";

// ─── API Keys section ─────────────────────────────────────────
type ApiKey = { id: string; name: string; key: string; created: string; lastUsed: string };

const INIT_KEYS: ApiKey[] = [
  { id: "1", name: "Production",  key: "ps_live_4f8d2a9c1e3b7f6a0d5e8c2b",  created: "2026-05-01", lastUsed: "2 min ago" },
  { id: "2", name: "Development", key: "ps_test_9a2b1c4d5e6f7a8b9c0d1e2f", created: "2026-05-10", lastUsed: "1 hr ago" },
];

function ApiKeysSection() {
  const [keys, setKeys]     = useState<ApiKey[]>(INIT_KEYS);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const toggleReveal = (id: string) => {
    const next = new Set(revealed);
    next.has(id) ? next.delete(id) : next.add(id);
    setRevealed(next);
  };

  const copyKey = (key: string) => { navigator.clipboard.writeText(key); toast.success("API key copied"); };

  const revokeKey = (id: string) => {
    setKeys((k) => k.filter((x) => x.id !== id));
    toast.success("Key revoked");
  };

  const generateKey = () => {
    const name = `Key ${keys.length + 1}`;
    const rand  = Math.random().toString(36).slice(2, 26);
    setKeys((k) => [...k, { id: String(Date.now()), name, key: `ps_live_${rand}`, created: new Date().toISOString().slice(0, 10), lastUsed: "Never" }]);
    toast.success("New API key generated");
  };

  const mask = (k: string) => k.slice(0, 10) + "•".repeat(20);

  return (
    <div className="space-y-3">
      {keys.map((k) => (
        <div key={k.id} className="bg-[#1c1b1d] border border-[#27272A] p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[#e5e1e4]">{k.name}</span>
              <span className="text-[10px] font-mono text-[#86948a]">Created {k.created}</span>
              <span className="text-[10px] text-[#86948a]">· Last used {k.lastUsed}</span>
            </div>
            <code className="text-[12px] font-mono text-[#4edea3]">{revealed.has(k.id) ? k.key : mask(k.key)}</code>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => toggleReveal(k.id)} className="p-1.5 hover:bg-[#2a2a2c] rounded transition-colors">
              {revealed.has(k.id) ? <EyeOff className="w-4 h-4 text-[#86948a]" /> : <Eye className="w-4 h-4 text-[#86948a]" />}
            </button>
            <button onClick={() => copyKey(k.key)} className="p-1.5 hover:bg-[#2a2a2c] rounded transition-colors">
              <Copy className="w-4 h-4 text-[#86948a]" />
            </button>
            <button onClick={() => revokeKey(k.id)} className="p-1.5 hover:bg-[#93000a]/20 rounded transition-colors group">
              <Trash2 className="w-4 h-4 text-[#86948a] group-hover:text-[#ffb4ab]" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={generateKey} className="flex items-center gap-2 px-4 py-2 border border-dashed border-[#27272A] text-[12px] text-[#86948a] hover:border-[#4edea3] hover:text-[#4edea3] transition-colors w-full justify-center">
        <Plus className="w-4 h-4" /> Generate New Key
      </button>
    </div>
  );
}

// ─── Integrations section ─────────────────────────────────────
type Integration = { id: string; name: string; logo: string; description: string; connected: boolean; snippet: string; comingSoon?: boolean };

const INTEGRATIONS: Integration[] = [
  {
    id: "openai", name: "OpenAI", logo: "🟢", description: "GPT-4o, GPT-4 Turbo, and GPT-3.5 via chat completions API",
    connected: true,
    snippet: `from promptshield import Shield
import openai

shield = Shield(api_key="ps_live_...", endpoint="http://localhost:8000")
client = shield.wrap(openai.AsyncOpenAI())

# Drop-in replacement — all calls now inspected automatically
response = await client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": user_input}],
)`,
  },
  {
    id: "anthropic", name: "Anthropic", logo: "🟠", description: "Claude Opus, Sonnet, and Haiku via Messages API",
    connected: false,
    snippet: `from promptshield import Shield
import anthropic

shield = Shield(api_key="ps_live_...", endpoint="http://localhost:8000")
client = shield.wrap(anthropic.AsyncAnthropic())

# Drop-in replacement — wraps all client.messages.create calls
response = await client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": user_input}],
)`,
  },
  {
    id: "langchain", name: "LangChain", logo: "🦜", description: "AgentExecutor and LangGraph CompiledStateGraph via wrap()",
    connected: false,
    snippet: `from promptshield import Shield
from langchain.agents import AgentExecutor

shield = Shield(api_key="ps_live_...", endpoint="http://localhost:8000")
agent = shield.wrap(agent_executor)  # AgentExecutor or CompiledStateGraph

# Shield inspects input + output on every ainvoke call
result = await agent.ainvoke({"input": user_input})`,
  },
  {
    id: "semantic_kernel", name: "Semantic Kernel", logo: "🔵", description: "Middleware plugin for SK pipelines",
    connected: false, comingSoon: true,
    snippet: `# Coming soon — Semantic Kernel support is on the roadmap.
# Follow https://github.com/acme/promptshield for updates.`,
  },
  {
    id: "azure_ai", name: "Azure AI Foundry", logo: "☁️", description: "Azure OpenAI, Phi, and Mistral models via AI Foundry",
    connected: false, comingSoon: true,
    snippet: `# Coming soon — Azure AI Foundry support is on the roadmap.
# In the meantime, use the OpenAI wrapper with your Azure endpoint:
client = shield.wrap(openai.AsyncAzureOpenAI(
    azure_endpoint="https://YOUR_RESOURCE.openai.azure.com",
    api_key="YOUR_AZURE_KEY",
    api_version="2024-02-01",
))`,
  },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  const [connected, setConnected] = useState(integration.connected);
  const [copied, setCopied]       = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(integration.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Snippet copied");
  };

  return (
    <div className={cn(
      "bg-[#1c1b1d] border p-4 space-y-3 transition-colors",
      integration.comingSoon ? "border-[#27272A] opacity-60" : connected ? "border-[#4edea3]/30" : "border-[#27272A]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{integration.logo}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[13px] font-semibold text-[#e5e1e4]">{integration.name}</p>
              {integration.comingSoon && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold font-mono uppercase tracking-wider bg-[#27272A] text-[#86948a] rounded-sm">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#86948a]">{integration.description}</p>
          </div>
        </div>
        <button
          disabled={integration.comingSoon}
          onClick={() => { if (!integration.comingSoon) { setConnected(!connected); toast.success(`${integration.name} ${connected ? "disconnected" : "connected"}`); } }}
          className={cn(
            "w-10 h-5 rounded-full relative transition-colors duration-200",
            integration.comingSoon ? "bg-[#27272A] cursor-not-allowed" : connected ? "bg-[#10b981]" : "bg-[#353437]"
          )}
        >
          <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200", connected ? "right-0.5" : "left-0.5")} />
        </button>
      </div>

      <div className="relative">
        <pre className="bg-[#0e0e10] border border-[#27272A] p-3 text-[11px] font-mono text-[#4edea3] leading-relaxed overflow-x-auto">
          {integration.snippet}
        </pre>
        <button onClick={copy} className="absolute top-2 right-2 p-1 hover:bg-[#1c1b1d] transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-[#4edea3]" /> : <Copy className="w-3.5 h-3.5 text-[#86948a]" />}
        </button>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-[#e5e1e4]">{title}</h3>
        {description && <p className="text-[12px] text-[#86948a] mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

// ─── Coming soon placeholder ─────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="bg-[#1c1b1d] border border-dashed border-[#27272A] p-8 flex flex-col items-center gap-2 text-center">
      <p className="text-[13px] font-semibold text-[#e5e1e4]">{label}</p>
      <p className="text-[12px] text-[#86948a]">This section is coming in the next release.</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="flex items-center px-6 py-4 border-b border-[#27272A] shrink-0">
        <div>
          <h2 className="text-[18px] font-bold text-[#e5e1e4] tracking-tight">Settings</h2>
          <p className="text-[11px] text-[#86948a] mt-0.5">API keys, integrations, and configuration</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-12">

          <Section title="API Keys" description="Use these keys to authenticate the PromptShield SDK and REST API. Treat them like passwords.">
            <ApiKeysSection />
          </Section>

          <div className="h-px bg-[#27272A]" />

          <Section title="Integrations" description="Connect PromptShield to your AI stack with one line of code.">
            <div className="space-y-3">
              {INTEGRATIONS.map((i) => <IntegrationCard key={i.id} integration={i} />)}
            </div>
          </Section>

          <div className="h-px bg-[#27272A]" />

          <Section title="Team" description="Invite team members and manage access control.">
            <ComingSoon label="Team Management" />
          </Section>

          <div className="h-px bg-[#27272A]" />

          <Section title="Webhooks" description="Get notified in real-time when incidents are detected.">
            <ComingSoon label="Webhook Configuration" />
          </Section>

        </div>
      </div>
    </div>
  );
}
