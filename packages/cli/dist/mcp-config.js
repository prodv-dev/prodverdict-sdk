export function buildMcpJson(stack) {
    const env = {
        DATABASE_URL: 'postgresql://readonly:...@host/db',
    };
    if (stack === 'paddle-stripe') {
        env.PADDLE_API_KEY = 'your-read-only-paddle-key';
        env.PADDLE_ENVIRONMENT = 'sandbox';
    }
    else {
        env.STRIPE_SECRET_KEY = 'rk_live_...';
    }
    return {
        mcpServers: {
            prodverdict: {
                command: 'npx',
                args: ['-y', '@prodverdict/mcp'],
                env,
            },
        },
    };
}
//# sourceMappingURL=mcp-config.js.map