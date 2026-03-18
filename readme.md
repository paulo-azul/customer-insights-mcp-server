# 🧠 Customer Insights - MCP Server

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

This repository contains the **Model Context Protocol (MCP) Server** for the Customer Insights Copilot. It acts as an isolated backend service, establishing a standardized communication layer between any AI Agent (Frontend) and the Supabase database.

By using the MCP, this server acts as a **Single Source of Truth**. The AI does not need to know how to connect to the database; it simply asks this server for the available tools and requests their execution.

## 🛠️ Available Tools (Capabilities)

This server exposes the following tools to the AI via the `stdio` transport layer. Each tool is strictly typed using Zod schemas to prevent invalid database operations:

* `list_clients`: Retrieves a list of all registered clients, ordered by creation date.
* `get_client_by_id`: Fetches the details of a specific client using their UUID.
* `create_client`: Inserts a new client into the database (requires name and email).
* `update_client`: Safely updates an existing client's data (strictly limited to name, email, enterprise, and telephone).
* `delete_client`: Permanently removes a client from the system.

## 🚀 Installation & Setup

### Prerequisites
* Node.js (v20 or higher)
* A Supabase project with a `client` table.

### 1. Install Dependencies
Navigate to the root folder of this server and install the required packages:
```bash
npm install
```
### 2. Configure Environment Variables
Create a .env file in the root of this project (01_mcp_server/.env) and add your Supabase credentials:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
Note: We use the SERVICE_ROLE_KEY here because this server acts as an administrative backend, bypassing Row Level Security (RLS) policies for tool execution. Never expose this key in the frontend.

### 🔌 How it Works (Usage)
Unlike traditional HTTP REST APIs, this server communicates via standard input/output (stdio). It is not meant to be started as a standalone web server.

Instead, the client application (e.g., the Next.js app, Claude Desktop, or Cursor IDE) executes this script as a subprocess:

```bash
npx tsx /absolute/path/to/01_mcp_server/index.ts
```

The server will automatically resolve its own .env file regardless of where the command was initiated from, ensuring a reliable connection to Supabase.

### Author: Paulo Teles Serra Azul