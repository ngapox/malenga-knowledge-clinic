CREATE TABLE public.dse_quotes (
    symbol TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    close NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (symbol, as_of_date)
);