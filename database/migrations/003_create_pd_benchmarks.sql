-- PD Benchmarks: FICO-to-PD lookup table (versioned for auditability)
CREATE TABLE IF NOT EXISTS pd_benchmarks (
    id SERIAL PRIMARY KEY,
    fico_min INTEGER NOT NULL CHECK (fico_min >= 300 AND fico_min <= 850),
    fico_max INTEGER NOT NULL CHECK (fico_max >= 300 AND fico_max <= 850),
    annual_pd DECIMAL(6,5) NOT NULL CHECK (annual_pd >= 0 AND annual_pd <= 1),
    version INTEGER NOT NULL DEFAULT 1,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(fico_min, fico_max, version)
);

-- id | fico_min | fico_max | annual_pd | version | effective_date | created_at

CREATE INDEX idx_pd_benchmarks_fico ON pd_benchmarks(fico_min, fico_max);
CREATE INDEX idx_pd_benchmarks_version ON pd_benchmarks(version, effective_date);

-- Insert sample PD benchmarks (version 1)
-- These are example values - adjust based on your risk model
INSERT INTO pd_benchmarks (fico_min, fico_max, annual_pd, version, effective_date) VALUES
    (300, 579, 0.15, 1, '2024-01-01'),
    (580, 669, 0.10, 1, '2024-01-01'),
    (670, 739, 0.05, 1, '2024-01-01'),
    (740, 799, 0.02, 1, '2024-01-01'),
    (800, 850, 0.01, 1, '2024-01-01')
ON CONFLICT (fico_min, fico_max, version) DO NOTHING;
