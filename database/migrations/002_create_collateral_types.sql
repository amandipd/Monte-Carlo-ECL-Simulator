-- Collateral types: Maps assets to LGD factors
CREATE TABLE IF NOT EXISTS collateral_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    lgd_factor DECIMAL(5,4) NOT NULL CHECK (lgd_factor >= 0 AND lgd_factor <= 1),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default collateral types
INSERT INTO collateral_types (name, lgd_factor, description) VALUES
    ('Auto', 0.45, 'Automobile collateral'),
    ('Real Estate', 0.35, 'Real estate collateral'),
    ('Unsecured', 0.65, 'No collateral'),
    ('Equipment', 0.50, 'Business equipment collateral')
ON CONFLICT (name) DO NOTHING;


-- id | name | lgd_factor | description | created_at