-- Loans table: Individual loan data
CREATE TABLE IF NOT EXISTS loans (
    id SERIAL PRIMARY KEY,
    portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
    loan_amount DECIMAL(15,2) NOT NULL CHECK (loan_amount > 0),
    annual_interest_rate DECIMAL(6,4) NOT NULL CHECK (annual_interest_rate >= 0 AND annual_interest_rate <= 1),
    term_months INTEGER NOT NULL CHECK (term_months > 0),
    fico INTEGER CHECK (fico >= 300 AND fico <= 850),
    collateral_id INTEGER REFERENCES collateral_types(id),
    stage INTEGER CHECK (stage IN (1, 2, 3)), -- IFRS 9 stage
    annual_pd DECIMAL(6,5) NOT NULL CHECK (annual_pd >= 0 AND annual_pd <= 1),
    lgd DECIMAL(5,4) NOT NULL CHECK (lgd >= 0 AND lgd <= 1),
    eir DECIMAL(6,4) NOT NULL CHECK (eir >= 0 AND eir <= 1), -- Effective Interest Rate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- id | portfolio id | loan_amount | annual_interest_rate | term_months | fico | collateral_id | stage | annual_pd | lgd | eir | created_at | updated_at

CREATE INDEX idx_loans_portfolio_id ON loans(portfolio_id);
CREATE INDEX idx_loans_fico ON loans(fico);
CREATE INDEX idx_loans_stage ON loans(stage);
CREATE INDEX idx_loans_collateral_id ON loans(collateral_id);
