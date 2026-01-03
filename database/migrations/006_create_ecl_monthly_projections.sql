-- ECL Monthly Projections: Month-by-month breakdown for visualization
CREATE TABLE IF NOT EXISTS ecl_monthly_projections (
    id SERIAL PRIMARY KEY,
    ecl_result_id INTEGER NOT NULL REFERENCES ecl_results(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month > 0),
    ead DECIMAL(15,2) NOT NULL CHECK (ead >= 0), -- Exposure at Default
    marginal_pd DECIMAL(10,8) NOT NULL CHECK (marginal_pd >= 0 AND marginal_pd <= 1),
    discount_factor DECIMAL(10,8) NOT NULL CHECK (discount_factor > 0 AND discount_factor <= 1),
    ecl DECIMAL(15,2) NOT NULL CHECK (ecl >= 0), -- Expected Credit Loss for this month
    UNIQUE(ecl_result_id, month)
);

CREATE INDEX idx_ecl_projections_result_id ON ecl_monthly_projections(ecl_result_id);
CREATE INDEX idx_ecl_projections_month ON ecl_monthly_projections(month);
