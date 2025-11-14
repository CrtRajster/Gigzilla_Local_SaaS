CREATE TABLE licenses (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  license_key UUID UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'trial', -- trial, active, expired, cancelled
  tier VARCHAR(50) DEFAULT 'free', -- free, pro, business
  machine_ids TEXT[], -- Array of allowed machine IDs
  max_devices INTEGER DEFAULT 2,
  valid_until TIMESTAMP,
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email ON licenses(email);
CREATE INDEX idx_license_key ON licenses(license_key);
CREATE INDEX idx_stripe_customer ON licenses(stripe_customer_id);

-- Validation attempts tracking (prevent abuse)
CREATE TABLE validation_attempts (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255),
  ip_address VARCHAR(50),
  machine_id VARCHAR(255),
  success BOOLEAN,
  attempted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_validation_email ON validation_attempts(email);
CREATE INDEX idx_validation_ip ON validation_attempts(ip_address);
