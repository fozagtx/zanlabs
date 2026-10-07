// Everything the portfolio says lives in this file. Edit it to update the site.

export const profile = {
  name: 'fawuzan',
  handle: 'fozagtx',
  brand: 'zanlabs',
  role: 'Forward-deployed engineer',
  headline: 'I turn rough ideas into shipped agents, onchain rails and dev tools.',
  /** Word in the headline drawn in the accent color. */
  highlight: 'shipped',
  intro:
    'I work where AI agents meet real systems — payments, markets, inboxes and codebases — and take projects from a blank repo to a working product, fast.',
  avatar: 'https://avatars.githubusercontent.com/u/160292135?v=4',
  email: 'hi.fawuzanpima@gmail.com',
  github: 'https://github.com/fozagtx',
  available: true,
  facts: [
    { value: '196', label: 'public repos' },
    { value: '2024', label: 'shipping since' },
    { value: '6+', label: 'languages shipped' },
  ],
  about: [
    'I’m fawuzan, a forward-deployed engineer. I like working close to the problem: take a messy workflow, find the part an agent can own, and ship it.',
    'Most of what I build lands in three places — AI agents that do real work, onchain payment and data rails that agents can use, and tools that make coding agents better at their jobs. A lot of it starts life as a hackathon build.',
  ],
  stack: [
    'TypeScript',
    'Python',
    'Rust',
    'Go',
    'Solidity',
    'React',
    'Astro',
    'LangGraph',
    'Google ADK',
    'Qwen Cloud',
    'Cloud Run',
    'Telegram Bots',
    'Notion API',
  ],
} as const

export type Category = 'agents' | 'onchain' | 'tools'

export const categories: { value: Category | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'agents', label: 'Agents & AI' },
  { value: 'onchain', label: 'Onchain' },
  { value: 'tools', label: 'Tools' },
]

export interface Project {
  name: string
  summary: string
  category: Category
  language: string
  tags: string[]
  /** Month the repo was created, YYYY-MM. */
  shipped: string
  repo: string
  featured?: boolean
  /** Optional bullet points shown in the project dialog. */
  highlights?: string[]
}

const gh = (repo: string) => `https://github.com/fozagtx/${repo}`

export const projects: Project[] = [
  {
    name: 'Seeri',
    summary: 'A financial deep-research skill that gives agents verifiable research on anything onchain.',
    category: 'agents',
    language: 'Python',
    tags: ['Research', 'Agent skill', 'Finance'],
    shipped: '2026-06',
    repo: gh('seeri'),
    featured: true,
  },
  {
    name: 'Alt402',
    summary: 'Pay-per-call altcoin discovery for AI agents — agents pay per request instead of holding a subscription.',
    category: 'onchain',
    language: 'TypeScript',
    tags: ['AI agents', 'Pay-per-call', 'Crypto data'],
    shipped: '2026-09',
    repo: gh('Alt402'),
    featured: true,
  },
  {
    name: 'Repromo',
    summary: 'An AI showrunner that turns a website or GitHub repo into a demo video, built on Qwen Cloud and Alibaba DashScope.',
    category: 'agents',
    language: 'TypeScript',
    tags: ['Qwen', 'LangGraph', 'Video', 'Hackathon'],
    shipped: '2026-07',
    repo: gh('repromo'),
    featured: true,
  },
  {
    name: 'Ecorouter',
    summary: 'A payment router that lets agents pay for services onchain.',
    category: 'onchain',
    language: 'Astro',
    tags: ['Payments', 'Agents'],
    shipped: '2026-09',
    repo: gh('ecorouter'),
  },
  {
    name: 'Detectr',
    summary: 'An AI forensic “agent society” on Qwen Cloud, where specialist agents work a case together.',
    category: 'agents',
    language: 'TypeScript',
    tags: ['Qwen', 'LangGraph', 'Multi-agent', 'Hackathon'],
    shipped: '2026-07',
    repo: gh('detectr'),
  },
  {
    name: 'Stamp',
    summary: 'An agent that reconciles live Gmail invoices and waits for a human to approve before creating a draft.',
    category: 'agents',
    language: 'Python',
    tags: ['Gmail', 'Human-in-the-loop', 'Invoices'],
    shipped: '2026-08',
    repo: gh('stamp'),
  },
  {
    name: 'Scar',
    summary: 'Stored Corrections And Recall: a HydraDB graph of coding-agent errors and the human corrections that fixed them.',
    category: 'tools',
    language: 'Python',
    tags: ['HydraDB', 'Coding agents', 'Memory'],
    shipped: '2026-08',
    repo: gh('scar'),
  },
  {
    name: 'Clarus',
    summary: 'A safety check to run before you buy a random token on BNB Chain.',
    category: 'onchain',
    language: 'Shell',
    tags: ['BNB Chain', 'Token safety'],
    shipped: '2026-09',
    repo: gh('Clarus'),
  },
  {
    name: 'UltraX',
    summary: 'Predictive intelligence for stocks on OKX.',
    category: 'onchain',
    language: 'TypeScript',
    tags: ['OKX', 'Markets', 'Prediction'],
    shipped: '2026-09',
    repo: gh('UltraX'),
  },
  {
    name: 'VersedAI',
    summary: 'An AI lab for high-school students, with a Google ADK tutor running on Cloud Run.',
    category: 'agents',
    language: 'TypeScript',
    tags: ['Google ADK', 'Cloud Run', 'Education'],
    shipped: '2026-08',
    repo: gh('VersedAI'),
  },
  {
    name: 'Seeka',
    summary: 'A Telegram bot that finds hackathons, competitions and contests with Exa + Firecrawl and files them in Notion.',
    category: 'agents',
    language: 'TypeScript',
    tags: ['Telegram', 'Exa', 'Firecrawl', 'Notion'],
    shipped: '2026-09',
    repo: gh('seeka'),
  },
  {
    name: 'Synk',
    summary: 'A rescue audit for sites built with Lovable.',
    category: 'tools',
    language: 'TypeScript',
    tags: ['Lovable', 'Audit'],
    shipped: '2026-05',
    repo: gh('Synk'),
  },
  {
    name: 'Redacto',
    summary: 'Local privacy for AI chats — redact sensitive data before you upload a file.',
    category: 'tools',
    language: 'JavaScript',
    tags: ['Privacy', 'Local-first'],
    shipped: '2026-09',
    repo: gh('Redacto'),
  },
  {
    name: 'Problem Finder',
    summary: 'A skill that forces a problem-discovery pass before an agent jumps to solutions.',
    category: 'tools',
    language: 'Shell',
    tags: ['Agent skill', 'Product thinking'],
    shipped: '2026-08',
    repo: gh('problem-finder'),
  },
  {
    name: 'Quild',
    summary: 'Just-in-time content writing for startup founders.',
    category: 'agents',
    language: 'TypeScript',
    tags: ['Content', 'Founders'],
    shipped: '2026-08',
    repo: gh('Quild'),
  },
]

export const services = [
  {
    title: 'AI agents & automation',
    body: 'Agents that do real work — research, reconciliation, forensics, tutoring — built with LangGraph, Google ADK, Qwen Cloud and agent skills, with a human kept in the loop where it matters.',
  },
  {
    title: 'Onchain payments & data',
    body: 'Pay-per-call APIs for agents, payment routing for onchain services, token safety checks and market intelligence.',
  },
  {
    title: 'Tools for coding agents',
    body: 'Skills and workflows that make coding agents better: problem-discovery passes, a recall graph of past mistakes, audits for AI-built sites and local redaction before data leaves your machine.',
  },
  {
    title: 'Hackathons & rapid prototypes',
    body: 'Comfortable going from a blank repo to a working demo under a deadline. Several of the projects above began as hackathon track entries.',
  },
]

export const languageColors: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572a5',
  Astro: '#ff5a03',
  Shell: '#89e051',
  Rust: '#dea584',
  Go: '#00add8',
  Solidity: '#aa6746',
}
