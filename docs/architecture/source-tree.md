# Unified Project Structure

```
berg10/
├── .github/                    
│   └── workflows/         # CI/CD (GitHub Actions)
│       ├── ci.yaml
│       └── deploy.yaml
├── packages/              # Monolith
│   ├── core/              # Core engine logic
│   │   ├── group/         # Group management logic
│   │   ├── entity/        # Entity mapping logic
│   │   ├── index/         # Indexing orchestration
│   │   ├── repo/          # semantic-repo interaction
│   │   ├── types/         # Core shared types
│   │   └── utils/         # Core utilities
│   ├── connectors/        # Filesystem connectors
│   │   ├── lakefs/        # LakeFS connector
│   │   ├── git/           # Git connector
│   │   └── types/         # Connector shared types/interfaces
│   ├── api/               # REST/gRPC API server
│   │   ├── routes/        # API route handlers
│   │   ├── middleware/    # Auth, logging middleware
│   │   └── server.ts      # API server entry point
│   ├── mcp/               # MCP server
│   │   └── server.ts      # MCP server entry point
│   ├── cli/               # berg10 CLI tool
│   │   └── cli.ts         # CLI entry point and commands
│   ├── shared/            
│       └── types/         # Global shared types/interfaces
├── infrastructure/            # IaC definitions (Dockerfile, docker-compose.yaml)
│   ├── Dockerfile
│   └── docker-compose.yaml
├── scripts/                   # Build/deploy scripts
├── docs/                      # Documentation
│   ├── prd/
│   ├── stories/
│   └── architecture.md        
├── test/                      # Centralized folder for all tests
├── config/                    # Configuration management
├── .env.example               # Environment template
├── package.json               # Root package.json (defines workspaces)
├── tsconfig.json              # Root TypeScript configuration
└── README.md
```
