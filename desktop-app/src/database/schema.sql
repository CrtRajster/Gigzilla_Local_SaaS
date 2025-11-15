-- Gigzilla SQLite Database Schema
-- Local-first data storage for freelancer management
-- All data stays on user's computer, never sent to backend

-- ==========================================
-- CLIENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);

-- ==========================================
-- PROJECTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT '€',
  status TEXT NOT NULL DEFAULT 'to_start' CHECK(status IN ('to_start', 'working', 'done', 'paid')),
  deadline TEXT,
  started_at TEXT,
  completed_at TEXT,
  paid_at TEXT,
  invoice_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_deadline ON projects(deadline);

-- ==========================================
-- INVOICES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  project_id TEXT,
  client_id TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT '€',
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'paid', 'overdue')),
  items TEXT, -- JSON array of line items
  notes TEXT,
  due_date TEXT,
  sent_at TEXT,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ==========================================
-- MESSAGES TABLE (for future unified messaging)
-- ==========================================

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  platform TEXT NOT NULL CHECK(platform IN ('email', 'upwork', 'fiverr', 'whatsapp', 'instagram', 'linkedin', 'twitter', 'discord', 'telegram', 'direct')),
  direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
  subject TEXT,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT 0,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_platform ON messages(platform);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

-- ==========================================
-- SETTINGS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('string', 'number', 'boolean', 'json')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==========================================
-- ACTIVITY LOG TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT, -- JSON
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(type);

-- ==========================================
-- TRIGGERS FOR updated_at
-- ==========================================

-- Clients
CREATE TRIGGER IF NOT EXISTS update_clients_timestamp
AFTER UPDATE ON clients
FOR EACH ROW
BEGIN
  UPDATE clients SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Projects
CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
AFTER UPDATE ON projects
FOR EACH ROW
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Invoices
CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp
AFTER UPDATE ON invoices
FOR EACH ROW
BEGIN
  UPDATE invoices SET updated_at = datetime('now') WHERE id = NEW.id;
END;

-- Settings
CREATE TRIGGER IF NOT EXISTS update_settings_timestamp
AFTER UPDATE ON settings
FOR EACH ROW
BEGIN
  UPDATE settings SET updated_at = datetime('now') WHERE key = NEW.key;
END;

-- ==========================================
-- TRIGGERS FOR AUTO-STATUS UPDATES
-- ==========================================

-- Auto-update invoice status to overdue
CREATE TRIGGER IF NOT EXISTS check_invoice_overdue
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN NEW.status = 'sent' AND NEW.due_date IS NOT NULL AND date(NEW.due_date) < date('now')
BEGIN
  UPDATE invoices SET status = 'overdue' WHERE id = NEW.id;
END;

-- Auto-set project started_at when status changes to 'working'
CREATE TRIGGER IF NOT EXISTS set_project_started_at
AFTER UPDATE OF status ON projects
FOR EACH ROW
WHEN NEW.status = 'working' AND OLD.status != 'working' AND NEW.started_at IS NULL
BEGIN
  UPDATE projects SET started_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-set project completed_at when status changes to 'done'
CREATE TRIGGER IF NOT EXISTS set_project_completed_at
AFTER UPDATE OF status ON projects
FOR EACH ROW
WHEN NEW.status = 'done' AND OLD.status != 'done' AND NEW.completed_at IS NULL
BEGIN
  UPDATE projects SET completed_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-set project paid_at when status changes to 'paid'
CREATE TRIGGER IF NOT EXISTS set_project_paid_at
AFTER UPDATE OF status ON projects
FOR EACH ROW
WHEN NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_at IS NULL
BEGIN
  UPDATE projects SET paid_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-set invoice sent_at when status changes to 'sent'
CREATE TRIGGER IF NOT EXISTS set_invoice_sent_at
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN NEW.status = 'sent' AND OLD.status != 'sent' AND NEW.sent_at IS NULL
BEGIN
  UPDATE invoices SET sent_at = datetime('now') WHERE id = NEW.id;
END;

-- Auto-set invoice paid_at when status changes to 'paid'
CREATE TRIGGER IF NOT EXISTS set_invoice_paid_at
AFTER UPDATE OF status ON invoices
FOR EACH ROW
WHEN NEW.status = 'paid' AND OLD.status != 'paid' AND NEW.paid_at IS NULL
BEGIN
  UPDATE invoices SET paid_at = datetime('now') WHERE id = NEW.id;
END;

-- ==========================================
-- DEFAULT SETTINGS
-- ==========================================

INSERT OR IGNORE INTO settings (key, value, type) VALUES
  ('app_version', '1.0.0', 'string'),
  ('currency_default', '€', 'string'),
  ('invoice_due_days', '14', 'number'),
  ('offline_grace_days', '7', 'number'),
  ('theme', 'light', 'string'),
  ('backup_enabled', 'true', 'boolean'),
  ('backup_interval_days', '7', 'number');

-- ==========================================
-- VIEWS FOR ANALYTICS
-- ==========================================

-- Client revenue view
CREATE VIEW IF NOT EXISTS v_client_revenue AS
SELECT
  c.id,
  c.name,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT i.id) as invoice_count,
  COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as total_revenue,
  COALESCE(SUM(CASE WHEN i.status = 'sent' THEN i.amount ELSE 0 END), 0) as pending_revenue,
  COALESCE(SUM(CASE WHEN i.status = 'overdue' THEN i.amount ELSE 0 END), 0) as overdue_revenue,
  COUNT(CASE WHEN p.status IN ('working', 'to_start') THEN 1 END) as active_projects
FROM clients c
LEFT JOIN projects p ON c.id = p.client_id
LEFT JOIN invoices i ON c.id = i.client_id
GROUP BY c.id;

-- Monthly revenue view
CREATE VIEW IF NOT EXISTS v_monthly_revenue AS
SELECT
  strftime('%Y-%m', paid_at) as month,
  COUNT(*) as invoice_count,
  SUM(amount) as total_revenue
FROM invoices
WHERE status = 'paid' AND paid_at IS NOT NULL
GROUP BY strftime('%Y-%m', paid_at)
ORDER BY month DESC;

-- Project pipeline view
CREATE VIEW IF NOT EXISTS v_project_pipeline AS
SELECT
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM projects
GROUP BY status;
