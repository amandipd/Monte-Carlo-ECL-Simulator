-- ECL Results: Final calculated ECL per loan
CREATE TABLE IF NOT EXISTS ecl_results (
    id SERIAL PRIMARY KEY,
    loan_id INTEGER NOT NULL UNIQUE REFERENCES loans(id) ON DELETE CASCADE,
    total_ecl DECIMAL(15,2) NOT NULL CHECK (total_ecl >= 0),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    pd_benchmark_version INTEGER, -- For auditability: which PD benchmark version was used
    notes TEXT
);

-- id | loan_id | total_ecl | calculated_at | pd_benchmark_version | notes

CREATE INDEX idx_ecl_results_loan_id ON ecl_results(loan_id);
CREATE INDEX idx_ecl_results_calculated_at ON ecl_results(calculated_at);
