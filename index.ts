import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

// Define o caminho absoluto para o ficheiro de configuracao de ambiente
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Inicializa a ligacao com o banco de dados Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cria a instancia do servidor do Model Context Protocol
const server = new Server({
  name: "customer-insights-mcp",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// Define as ferramentas disponiveis que a inteligencia artificial podera aceder
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_clients",
      description: "Lista todos os clientes cadastrados na base de dados.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_client_by_id",
      description: "Busca os detalhes de um cliente especifico pelo ID.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"]
      }
    },
    {
      name: "create_client",
      description: "Cadastra um novo cliente no sistema.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          enterprise: { type: "string" },
          telephone: { type: "string" },
        },
        required: ["name", "email"]
      }
    },
    {
      name: "update_client",
      description: "Atualiza os dados de um cliente existente.",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "O UUID do cliente que sera editado."
          },
          updates: {
            type: "object",
            description: "Campos a serem atualizados. Use apenas as chaves permitidas.",
            properties: {
              name: { type: "string" },
              email: { type: "string" },
              enterprise: { type: "string" },
              telephone: { type: "string" }
            }
          }
        },
        required: ["id", "updates"]
      }
    },
    {
      name: "delete_client",
      description: "Remove um cliente permanentemente do sistema.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"]
      }
    }
  ]
}));

// Executa a logica especifica da ferramenta solicitada
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "list_clients": {
        const { data, error } = await supabase.from('client').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        result = data;
        break;
      }
      case "get_client_by_id": {
        const { data, error } = await supabase.from('client').select('*').eq('id', String(args?.id)).single();
        if (error) throw error;
        result = data;
        break;
      }
      case "create_client": {
        const { data, error } = await supabase.from('client').insert([{
          name: String(args?.name),
          email: String(args?.email),
          enterprise: args?.enterprise ? String(args.enterprise) : null,
          telephone: args?.telephone ? String(args.telephone) : null,
          user_id: "00000000-0000-0000-0000-000000000000"
        }]).select().single();
        if (error) throw error;
        result = { message: "Cliente criado com sucesso!", data };
        break;
      }
      case "update_client": {
        const { data, error } = await supabase.from('client').update(args?.updates as object).eq('id', String(args?.id)).select().single();
        if (error) throw error;
        result = { message: "Dados atualizados com sucesso!", data };
        break;
      }
      case "delete_client": {
        const { error } = await supabase.from('client').delete().eq('id', String(args?.id));
        if (error) throw error;
        result = { message: `Cliente ${args?.id} removido com sucesso.` };
        break;
      }
      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
    };

  } catch (error: any) {
    console.error(`Erro ao executar ${name}:`, error);
    return {
      content: [{ type: "text", text: `Erro: ${error.message}` }],
      isError: true
    };
  }
});

// Configura o servidor Express
const app = express();

// Ativa o CORS para permitir ligacoes do frontend
app.use(cors());

// Variavel global para manter o estado do transporte
let transport: SSEServerTransport;

// Rota inicial para estabelecer a ligacao de eventos enviados pelo servidor
app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

// Rota para receber as mensagens enviadas pelo cliente NextJS
app.post("/messages", async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("O transporte SSE não foi inicializado.");
  }
});

// Inicia o servidor web na porta especificada
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor MCP rodando na porta ${PORT} via HTTP SSE`);
});