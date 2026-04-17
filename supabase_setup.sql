-- 1. Create Tables
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    wholesale_password_hash TEXT NOT NULL,
    master_password_hash TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'FOLDER',
    customer_price REAL,
    wholesale_price REAL,
    sort_order INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT NOT NULL,
    age INTEGER,
    address TEXT,
    mobile TEXT,
    new_power_right_sph TEXT,
    new_power_right_cyl TEXT,
    new_power_right_axis TEXT,
    new_power_right_add TEXT,
    new_power_left_sph TEXT,
    new_power_left_cyl TEXT,
    new_power_left_axis TEXT,
    new_power_left_add TEXT,
    old_power_right_sph TEXT,
    old_power_right_cyl TEXT,
    old_power_right_axis TEXT,
    old_power_right_add TEXT,
    old_power_left_sph TEXT,
    old_power_left_cyl TEXT,
    old_power_left_axis TEXT,
    old_power_left_add TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_presets (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS form_preset_fields (
    id SERIAL PRIMARY KEY,
    preset_id INTEGER REFERENCES form_presets(id),
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    order_index INTEGER NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_preset_fields ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
-- Security Note: These policies are basic. For production, consider using Supabase Auth
-- to restrict write access to authorized users only.

-- Categories: Anyone can read, but you can hide wholesale_price column in Supabase UI if needed.
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Wholesale access categories" ON categories FOR ALL USING (true); -- In reality, check wholesale_password

CREATE POLICY "Enable all for customers" ON customers FOR ALL USING (true);
CREATE POLICY "Enable all for presets" ON form_presets FOR ALL USING (true);
CREATE POLICY "Enable all for fields" ON form_preset_fields FOR ALL USING (true);
CREATE POLICY "Enable all for settings" ON settings FOR ALL USING (true);

-- 4. Password Verification Function (RPC)
CREATE OR REPLACE FUNCTION verify_wholesale_password(input_password TEXT, is_master BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN AS $$
DECLARE
    stored_password TEXT;
BEGIN
    IF is_master THEN
        SELECT master_password_hash INTO stored_password FROM settings ORDER BY id ASC LIMIT 1;
    ELSE
        SELECT wholesale_password_hash INTO stored_password FROM settings ORDER BY id ASC LIMIT 1;
    END IF;

    -- If no password set, and input is empty string, return true (unlocked by default if reset)
    -- Otherwise compare input
    IF stored_password IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN stored_password = input_password;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Sequence Synchronization Function
CREATE OR REPLACE FUNCTION sync_sequences()
RETURNS VOID AS $$
BEGIN
    -- Sync categories sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'categories_id_seq') THEN
        PERFORM setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 0) + 1, false);
    END IF;

    -- Sync customers sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'customers_id_seq') THEN
        PERFORM setval('customers_id_seq', COALESCE((SELECT MAX(id) FROM customers), 0) + 1, false);
    END IF;

    -- Sync form_presets sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'form_presets_id_seq') THEN
        PERFORM setval('form_presets_id_seq', COALESCE((SELECT MAX(id) FROM form_presets), 0) + 1, false);
    END IF;

    -- Sync form_preset_fields sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'form_preset_fields_id_seq') THEN
        PERFORM setval('form_preset_fields_id_seq', COALESCE((SELECT MAX(id) FROM form_preset_fields), 0) + 1, false);
    END IF;

    -- Sync settings sequence
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'settings_id_seq') THEN
        PERFORM setval('settings_id_seq', COALESCE((SELECT MAX(id) FROM settings), 0) + 1, false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
