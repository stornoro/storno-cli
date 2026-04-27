/**
 * Landing page for the Storno MCP server.
 * Returns a self-contained HTML page with embedded Tailwind CSS and inline JS.
 * Design matches storno.ro frontend: Public Sans font, blue primary, zinc neutral,
 * rounded-lg cards with border, bg-primary/10 icon rings, decorative circles.
 */

export function getLandingHtml(baseUrl: string): string {
  const mcpUrl = `${baseUrl}/mcp`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Storno MCP Server</title>
  <meta name="description" content="Connect your AI tools to Storno via the Model Context Protocol. Manage invoices, clients, and e-Factura from Claude, Cursor, and more.">
  <link rel="icon" href="https://storno.ro/favicon.ico">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554' },
            muted: '#71717a',
          },
          fontFamily: {
            sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
          },
        },
      },
    }
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    .copy-btn { transition: all 0.15s ease; }
    .copy-btn:active { transform: scale(0.95); }
    .fade-in { animation: fadeIn 0.6s ease-out; }
    .fade-in-delay { animation: fadeIn 0.6s ease-out 0.15s both; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    pre code { font-size: 0.8125rem; line-height: 1.6; }
    .card-hover { transition: box-shadow 0.2s ease, border-color 0.2s ease; }
    .card-hover:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #bfdbfe; }
    .dot-pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    @keyframes float-a {
      0%   { transform: translateY(0px) translateX(0px) rotate(0deg); }
      25%  { transform: translateY(-14px) translateX(6px) rotate(3deg); }
      50%  { transform: translateY(-8px) translateX(-4px) rotate(-2deg); }
      75%  { transform: translateY(-18px) translateX(8px) rotate(4deg); }
      100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
    }
  </style>
</head>
<body class="bg-white text-zinc-900 antialiased">

  <!-- Header — sticky, backdrop-blur, border-b (matches storno.ro) -->
  <header class="bg-white/75 backdrop-blur-lg border-b border-zinc-200 sticky top-0 z-50">
    <div class="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="https://storno.ro" target="_blank" class="flex items-center gap-2">
          <img src="https://storno.ro/_nuxt/logo.DdVqVFnw.png" alt="Storno.ro" class="h-7 w-auto">
        </a>
        <span class="text-xs font-medium bg-primary-500/10 text-primary-600 px-2 py-0.5 rounded-full ring-1 ring-inset ring-primary-500/25">MCP Server</span>
      </div>
      <div class="flex items-center gap-5">
        <div id="status-badge" class="flex items-center gap-1.5 text-sm text-zinc-400">
          <span class="w-2 h-2 rounded-full bg-zinc-300 dot-pulse"></span>
          <span>Checking...</span>
        </div>
        <a href="https://storno.ro" target="_blank" class="text-sm text-muted hover:text-zinc-900 transition-colors hidden sm:block">storno.ro</a>
      </div>
    </div>
  </header>

  <main class="max-w-5xl mx-auto px-6 relative overflow-hidden">

    <!-- Decorative circles (matches auth.vue pattern) -->
    <div class="absolute -top-24 -right-24 w-96 h-96 bg-primary-500/5 rounded-full pointer-events-none"></div>
    <div class="absolute top-96 -left-32 w-[500px] h-[500px] bg-primary-500/5 rounded-full pointer-events-none"></div>

    <!-- Hero -->
    <section class="pt-16 sm:pt-20 pb-14 fade-in relative">
      <div class="max-w-2xl">
        <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 leading-[1.1]">
          Connect your <span class="text-primary-600">AI</span> to Storno
        </h1>
        <p class="mt-5 text-lg text-muted leading-relaxed">Use the Model Context Protocol (MCP) to let Claude, Cursor, and other AI tools manage your invoices, clients, and e-Factura workflow.</p>
      </div>

      <div class="mt-8 flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-4 py-3 max-w-xl shadow-sm">
        <code class="flex-1 text-sm font-mono text-zinc-600 truncate select-all">${mcpUrl}</code>
        <button onclick="copyText('${mcpUrl}', this)" class="copy-btn shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 cursor-pointer px-3 py-1 rounded-lg hover:bg-primary-500/10 transition-colors">Copy URL</button>
      </div>

      <!-- Live status -->
      <div class="mt-5 flex items-center gap-6 flex-wrap">
        <div class="flex items-center gap-2">
          <span id="status-dot" class="w-2.5 h-2.5 rounded-full bg-zinc-300 dot-pulse"></span>
          <span id="status-text" class="text-sm text-zinc-400">Checking...</span>
        </div>
        <div id="status-meta" class="flex items-center gap-5 text-sm text-muted" style="display:none">
          <span>Sessions: <span id="status-sessions" class="font-medium text-zinc-700">-</span></span>
          <span>Uptime: <span id="status-uptime" class="font-medium text-zinc-700">-</span></span>
        </div>
      </div>
    </section>

    <!-- Connect to Claude — primary card -->
    <section class="pb-14 fade-in-delay relative">
      <div class="bg-white border border-zinc-200 rounded-lg p-6 sm:p-8 max-w-2xl shadow-sm">
        <div class="flex items-center gap-3 mb-2">
          <img src="https://storno.ro/_nuxt/logo.DdVqVFnw.png" alt="Storno" class="h-6 w-auto">
          <h2 class="text-xl font-bold text-zinc-900">Connect to Claude</h2>
        </div>
        <p class="text-sm text-muted mb-8 leading-relaxed">Connect Claude to Storno MCP, enabling it to manage invoices, clients, and e-Factura through a simple, secure connection without leaving your conversation.</p>

        <!-- For admins/owners -->
        <h3 class="font-bold text-sm text-zinc-900 mb-3">For Claude account admins/owners</h3>

        <p class="text-sm text-zinc-600 mb-2">First, copy your Integration URL here for your Claude connector:</p>
        <div class="flex items-center gap-2 mb-5">
          <input type="text" readonly value="${mcpUrl}" class="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm font-mono text-zinc-500 outline-none shadow-sm">
          <button onclick="copyText('${mcpUrl}', this)" class="copy-btn shrink-0 border border-zinc-200 hover:border-zinc-300 bg-white text-sm font-medium text-zinc-700 px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow">Copy URL</button>
        </div>

        <p class="text-sm text-zinc-600 mb-3">Then, click the button below to add Storno MCP to your Claude account:</p>
        <a href="https://claude.ai/settings/connectors" target="_blank" class="inline-flex items-center gap-2.5 border border-zinc-200 hover:border-zinc-300 bg-white text-sm font-medium text-zinc-700 px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow mb-4">
          <img src="https://storno.ro/_nuxt/logo.DdVqVFnw.png" alt="" class="h-4 w-auto">
          Add to Claude
        </a>

        <p class="text-sm text-muted mb-5">Paste in your Integration URL from above and click "Add"</p>

        <div class="bg-primary-500/5 border-l-4 border-primary-400 rounded-r-lg px-4 py-3 mb-8">
          <p class="text-sm text-zinc-700"><span class="font-semibold">Note:</span> The added integration will be available to all users in the Claude organization, but each user must authorize their own Storno account.</p>
        </div>

        <!-- For Claude account members -->
        <h3 class="font-bold text-sm text-zinc-900 mb-3">For Claude account members</h3>
        <p class="text-sm text-muted mb-3">Once your Claude account admin/owner has completed the steps above:</p>
        <ol class="space-y-2 text-sm text-zinc-600">
          <li class="flex gap-2.5"><span class="text-muted font-medium">1.</span> Go to <a href="https://claude.ai/settings/connectors" target="_blank" class="text-primary-600 hover:text-primary-700 underline underline-offset-2">claude.ai/settings/connectors</a></li>
          <li class="flex gap-2.5"><span class="text-muted font-medium">2.</span> You should see the Storno integration that your admin added</li>
          <li class="flex gap-2.5"><span class="text-muted font-medium">3.</span> Next to that integration, click "Connect" &mdash; you'll be taken to an OAuth screen</li>
          <li class="flex gap-2.5"><span class="text-muted font-medium">4.</span> Once you've authorized the connection, you can use Storno MCP tools in Claude</li>
          <li class="flex gap-2.5"><span class="text-muted font-medium">5.</span> View, enable, and disable Claude's access to tools with the "Search and Tools" button in chat</li>
        </ol>
      </div>
    </section>

    <!-- Other AI clients -->
    <section class="pb-14 fade-in-delay relative">
      <h2 class="text-2xl font-bold text-zinc-900 mb-6">Other AI clients</h2>
      <div class="grid sm:grid-cols-3 gap-4">

        <!-- Claude Code -->
        <div class="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm card-hover">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center ring-1 ring-inset ring-primary-500/25">
              <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="font-semibold text-zinc-900">Claude Code</h3>
          </div>
          <p class="text-sm text-muted mb-3">Run in your terminal:</p>
          <div class="relative">
            <pre class="bg-zinc-900 rounded-lg p-4 overflow-x-auto"><code class="text-zinc-100">claude mcp add storno \\
  --transport http \\
  ${mcpUrl}</code></pre>
            <button onclick="copyText('claude mcp add storno --transport http ${mcpUrl}', this)" class="copy-btn absolute top-2.5 right-2.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md cursor-pointer transition-colors">Copy</button>
          </div>
        </div>

        <!-- Claude Desktop -->
        <div class="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm card-hover">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center ring-1 ring-inset ring-primary-500/25">
              <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="font-semibold text-zinc-900">Claude Desktop</h3>
          </div>
          <p class="text-sm text-muted mb-3">Add to your MCP config:</p>
          <div class="relative">
            <pre class="bg-zinc-900 rounded-lg p-4 overflow-x-auto"><code class="text-zinc-100">{
  "mcpServers": {
    "storno": {
      "command": "npx",
      "args": ["-y",
        "mcp-remote",
        "${mcpUrl}"]
    }
  }
}</code></pre>
            <button onclick="copyText(JSON.stringify({mcpServers:{storno:{command:'npx',args:['-y','mcp-remote','${mcpUrl}']}}}, null, 2), this)" class="copy-btn absolute top-2.5 right-2.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md cursor-pointer transition-colors">Copy</button>
          </div>
        </div>

        <!-- Cursor / Windsurf -->
        <div class="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm card-hover">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center ring-1 ring-inset ring-primary-500/25">
              <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <h3 class="font-semibold text-zinc-900">Cursor / Windsurf</h3>
          </div>
          <p class="text-sm text-muted mb-3">Add to your MCP config:</p>
          <div class="relative">
            <pre class="bg-zinc-900 rounded-lg p-4 overflow-x-auto"><code class="text-zinc-100">{
  "mcpServers": {
    "storno": {
      "url": "${mcpUrl}"
    }
  }
}</code></pre>
            <button onclick="copyText(JSON.stringify({mcpServers:{storno:{url:'${mcpUrl}'}}}, null, 2), this)" class="copy-btn absolute top-2.5 right-2.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-md cursor-pointer transition-colors">Copy</button>
          </div>
        </div>

      </div>
    </section>

    <!-- Available tools -->
    <section class="pb-16 fade-in-delay relative">
      <h2 class="text-sm font-bold tracking-wide text-zinc-900 uppercase mb-5">Available tools</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <div class="bg-white flex items-start gap-3.5 p-4 rounded-lg border border-zinc-200 shadow-sm card-hover">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary-500/25">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900">Invoicing</h3>
            <p class="text-xs text-muted mt-0.5 leading-relaxed">Create, issue, send invoices & e-Factura</p>
          </div>
        </div>

        <div class="bg-white flex items-start gap-3.5 p-4 rounded-lg border border-zinc-200 shadow-sm card-hover">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary-500/25">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900">Clients & Products</h3>
            <p class="text-xs text-muted mt-0.5 leading-relaxed">Manage contacts, products & services</p>
          </div>
        </div>

        <div class="bg-white flex items-start gap-3.5 p-4 rounded-lg border border-zinc-200 shadow-sm card-hover">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary-500/25">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900">Payments & Receipts</h3>
            <p class="text-xs text-muted mt-0.5 leading-relaxed">Record payments, generate receipts</p>
          </div>
        </div>

        <div class="bg-white flex items-start gap-3.5 p-4 rounded-lg border border-zinc-200 shadow-sm card-hover">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary-500/25">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900">Reports & Exports</h3>
            <p class="text-xs text-muted mt-0.5 leading-relaxed">Financial reports, accounting exports</p>
          </div>
        </div>

        <div class="bg-white flex items-start gap-3.5 p-4 rounded-lg border border-zinc-200 shadow-sm card-hover">
          <div class="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 ring-1 ring-inset ring-primary-500/25">
            <svg class="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900">Company management</h3>
            <p class="text-xs text-muted mt-0.5 leading-relaxed">Companies, settings, document series</p>
          </div>
        </div>

      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="border-t border-zinc-200 bg-white">
    <div class="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted">
      <div class="flex items-center gap-2.5">
        <img src="https://storno.ro/_nuxt/logo.DdVqVFnw.png" alt="Storno.ro" class="h-4 w-auto opacity-50">
        <span>&copy; ${new Date().getFullYear()} Storno.ro</span>
      </div>
      <div class="flex items-center gap-6">
        <a href="https://storno.ro" target="_blank" class="hover:text-zinc-900 transition-colors">Website</a>
        <a href="https://docs.storno.ro" target="_blank" class="hover:text-zinc-900 transition-colors">Docs</a>
        <a href="https://github.com/stornoro/storno-cli" target="_blank" class="hover:text-zinc-900 transition-colors">GitHub</a>
      </div>
    </div>
  </footer>

  <script>
    function copyText(text, btn) {
      navigator.clipboard.writeText(text).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        btn.classList.add('text-emerald-600');
        setTimeout(function() { btn.textContent = orig; btn.classList.remove('text-emerald-600'); }, 1500);
      });
    }

    function formatUptime(seconds) {
      var d = Math.floor(seconds / 86400);
      var h = Math.floor((seconds % 86400) / 3600);
      var m = Math.floor((seconds % 3600) / 60);
      if (d > 0) return d + 'd ' + h + 'h';
      if (h > 0) return h + 'h ' + m + 'm';
      return m + 'm';
    }

    function fetchStatus() {
      fetch('/api/status')
        .then(function(r) { return r.json(); })
        .then(function(data) {
          document.getElementById('status-dot').className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
          document.getElementById('status-dot').style.boxShadow = '0 0 0 3px rgba(16,185,129,0.15)';
          document.getElementById('status-text').textContent = 'Online';
          document.getElementById('status-text').className = 'text-sm font-medium text-emerald-700';
          document.getElementById('status-sessions').textContent = data.activeSessions;
          document.getElementById('status-uptime').textContent = formatUptime(data.uptime);
          document.getElementById('status-meta').style.display = 'flex';
          document.getElementById('status-badge').innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500" style="box-shadow:0 0 0 2px rgba(16,185,129,0.2)"></span><span class="text-sm font-medium text-emerald-700">Online</span>';
        })
        .catch(function() {
          document.getElementById('status-dot').className = 'w-2.5 h-2.5 rounded-full bg-red-500';
          document.getElementById('status-dot').style.boxShadow = '0 0 0 3px rgba(239,68,68,0.15)';
          document.getElementById('status-text').textContent = 'Offline';
          document.getElementById('status-text').className = 'text-sm font-medium text-red-600';
          document.getElementById('status-badge').innerHTML = '<span class="w-2 h-2 rounded-full bg-red-500"></span><span class="text-sm font-medium text-red-600">Offline</span>';
        });
    }

    fetchStatus();
    setInterval(fetchStatus, 30000);
  </script>

</body>
</html>`;
}
