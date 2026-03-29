

## System Sync Agent — Plano de Implementação

### 1. Design System & Layout
- Dark mode corporativo: fundo azul marinho escuro (`#0A1628`), cards em cinza escuro (`#1A2332`), acentos em azul (`#3B82F6`)
- Layout mobile-first com navegação por tabs na parte inferior (Dashboard, Logs, Configurações)
- Tipografia limpa, ícones técnicos (Lucide)

### 2. Dashboard de Telemetria
- Cards de métricas: Bateria, RAM, Ping, IP
- Usa Browser APIs reais quando disponíveis (Battery API, Network Information API), com fallback para dados simulados realistas
- Indicadores visuais de status (verde/amarelo/vermelho)
- Atualização automática das métricas a cada poucos segundos

### 3. Sistema de PIN (6 dígitos)
- Tela de configuração protegida por PIN numérico de 6 dígitos
- PIN armazenado com hash no localStorage
- Teclado numérico customizado, feedback visual nos dots
- Na tela de config: controle de permissões (localização, diagnóstico, etc.)

### 4. Integração Supabase (Externo)
- Conectar projeto Supabase existente do usuário
- Tabelas necessárias: `commands` (para escutar via Realtime) e `device_logs` (para enviar logs)
- Subscription Realtime na tabela `commands` para receber ações (`update_location`, `system_diagnostic`)
- Inserção de logs na tabela `device_logs` com timestamp, tipo, payload

### 5. Manifesto PWA (Instalável Simples)
- `manifest.json` com nome, ícones, `display: standalone`, cores do tema
- Meta tags mobile no `index.html`
- Sem service worker (funciona no preview do Lovable)

### 6. Cache Local & Sincronização
- Logs pendentes salvos no localStorage quando offline
- Detecção de conectividade via `navigator.onLine` + evento `online`
- Sincronização automática: ao detectar internet, envia todos os logs pendentes ao Supabase
- Indicador visual de status de conexão no dashboard

### Estrutura de Páginas
- `/` — Dashboard com métricas
- `/logs` — Histórico de logs do dispositivo
- `/settings` — Configurações protegidas por PIN

