// Overview: "Use with AI" page (ai.html): copy buttons and one-click install links.
// Loaded only when company.json mcp.url is set. Check the VS Code and Cursor link formats
// against their current docs when the MCP server goes live.
(function () {
    document.querySelectorAll('[data-copy]').forEach(function (button) {
        button.addEventListener('click', function () {
            const text = document.getElementById(button.getAttribute('data-copy')).textContent.trim();
            navigator.clipboard.writeText(text).then(function () {
                button.textContent = 'Copied';
                setTimeout(function () { button.textContent = 'Copy'; }, 1500);
            });
        });
    });

    const install = document.querySelector('.ai-install');
    if (!install) return;
    const name = install.getAttribute('data-mcp-name');
    const url = install.getAttribute('data-mcp-url');
    document.getElementById('install-vscode').href =
        'vscode:mcp/install?' + encodeURIComponent(JSON.stringify({ name: name, type: 'http', url: url }));
    document.getElementById('install-cursor').href =
        'cursor://anysphere.cursor-deeplink/mcp/install?name=' + encodeURIComponent(name) +
        '&config=' + btoa(JSON.stringify({ url: url }));
})();
