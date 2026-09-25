const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const createTimestamp = () => new Date().toLocaleTimeString('pt-PT', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const buildMetrics = (status) => {
  const base = {
    cpu: 22 + Math.random() * 50,
    memory: 20 + Math.random() * 60,
    uptime: status === 'running' ? Math.floor(Math.random() * 240) + 12 : 0
  };

  return {
    cpu: Number(base.cpu.toFixed(1)),
    memory: Number(base.memory.toFixed(1)),
    uptime: `${base.uptime}h`
  };
};

let servers = [
  {
    id: 1,
    name: 'API Gateway',
    type: 'Node.js',
    port: 3001,
    status: 'running',
    command: 'npm run start',
    logs: ['Servidor inicializado', 'Conexão estável', 'Health check OK'],
    metrics: buildMetrics('running')
  },
  {
    id: 2,
    name: 'Database',
    type: 'PostgreSQL',
    port: 5432,
    status: 'running',
    command: 'postgres',
    logs: ['Banco ativo', 'Backups concluídos', 'Sincronização OK'],
    metrics: buildMetrics('running')
  },
  {
    id: 3,
    name: 'WebSocket Hub',
    type: 'Socket.io',
    port: 8080,
    status: 'stopped',
    command: 'node hub.js',
    logs: ['Serviço parado manualmente', 'Último reinício: ontem'],
    metrics: buildMetrics('stopped')
  }
];

const findServer = (id) => servers.find(server => server.id === Number(id));

const updateMetrics = (server) => {
  server.metrics = buildMetrics(server.status);
  return server;
};

app.get('/api/servers', (req, res) => {
  res.json(servers.map(server => ({ ...server, metrics: updateMetrics({ ...server }).metrics })));
});

app.get('/api/servers/:id', (req, res) => {
  const server = findServer(req.params.id);

  if (!server) {
    return res.status(404).json({ message: 'Servidor não encontrado.' });
  }

  updateMetrics(server);
  return res.json(server);
});

app.post('/api/servers', (req, res) => {
  const { name, type, port, command } = req.body;

  if (!name || !type || !port || !command) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }

  const newServer = {
    id: Date.now(),
    name,
    type,
    port: Number(port),
    status: 'stopped',
    command,
    logs: ['Servidor adicionado ao gestor'],
    metrics: buildMetrics('stopped')
  };

  servers.push(newServer);
  return res.status(201).json(newServer);
});

app.post('/api/servers/:id/start', (req, res) => {
  const server = findServer(req.params.id);

  if (!server) {
    return res.status(404).json({ message: 'Servidor não encontrado.' });
  }

  server.status = 'running';
  server.logs.unshift(`${createTimestamp()} - Serviço iniciado`);
  updateMetrics(server);

  return res.json(server);
});

app.post('/api/servers/:id/stop', (req, res) => {
  const server = findServer(req.params.id);

  if (!server) {
    return res.status(404).json({ message: 'Servidor não encontrado.' });
  }

  server.status = 'stopped';
  server.logs.unshift(`${createTimestamp()} - Serviço parado`);
  updateMetrics(server);

  return res.json(server);
});

app.post('/api/servers/:id/restart', (req, res) => {
  const server = findServer(req.params.id);

  if (!server) {
    return res.status(404).json({ message: 'Servidor não encontrado.' });
  }

  server.status = 'restarting';
  server.logs.unshift(`${createTimestamp()} - Reinício em curso`);
  updateMetrics(server);

  setTimeout(() => {
    server.status = 'running';
    server.logs.unshift(`${createTimestamp()} - Reinício concluído`);
    updateMetrics(server);
  }, 1500);

  return res.json(server);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Gestor de servidores ativo em http://localhost:${PORT}`);
});
