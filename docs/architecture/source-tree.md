# Unified Project Structure

```
berg10/
├── .github/                    
│   └── workflows/             # CI/CD (GitHub Actions)
│       ├── ci.yaml
│       └── deploy.yaml
├── packages/                   # Monolith
│   ├── core/                  # Core engine logic
│   │   ├── src/
│   │   │   ├── group/         # Group management logic
│   │   │   ├── entity/        # Entity mapping logic
│   │   │   ├── index/         # Indexing orchestration
│   │   │   ├── repo/          # semantic-repo interaction
│   │   │   ├── types/         # Core shared types
│   │   │   └── utils/         # Core utilities
│   │   └── tests/
│   ├── connectors/            # Filesystem connectors
│   │   ├── src/
│   │   │   ├── lakefs/        # LakeFS connector
│   │   │   ├── git/           # Git connector
│   │   │   └── types/         # Connector shared types/interfaces
│   │   └── tests/
│   ├── api/                   # REST/gRPC API server
│   │   ├── src/
│   │   │   ├── routes/        # API route handlers
│   │   │   ├── middleware/    # Auth, logging middleware
│   │   │   └── server.ts      # API server entry point
│   │   └── tests/
│   ├── mcp/                   # MCP server
│   │   ├── src/
│   │   │   └── server.ts      # MCP server entry point
│   │   └── tests/
│   ├── cli/                   # berg10 CLI tool
│   │   ├── src/
│   │   │   └── cli.ts         # CLI entry point and commands
│   │   └── tests/
│   ├── shared/                # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/         # Shared TypeScript interfaces
│   │   │   └── utils/         # Shared utility functions
│   │   └── tests/
│   └── config/                # Configuration management
│       └── src/
├── infrastructure/            # IaC definitions (Dockerfile, docker-compose.yaml)
│   ├── Dockerfile
│   └── docker-compose.yaml
├── scripts/                   # Build/deploy scripts
├── docs/                      # Documentation
│   ├── prd/
│   ├── stories/
│   └── architecture.md        # This document
├── .env.example               # Environment template
├── package.json               # Root package.json (defines workspaces)
├── tsconfig.json              # Root TypeScript configuration
└── README.md
```
