/*
# Create trash_reports table

## Summary
This migration creates the core table for the EcoReport community trash & environmental problem reporting app.

## New Tables

### trash_reports
Stores community-submitted environmental problem reports including:
- `id` (uuid, primary key) - unique identifier
- `title` (text) - short user-provided title
- `description` (text) - detailed description of the problem
- `category` (text) - AI-classified or user-selected category (e.g. "illegal_dumping", "litter", "pollution", "hazardous_waste", "other")
- `ai_classification` (text) - AI-generated classification/analysis summary
- `latitude` (numeric) - GPS latitude of the report
- `longitude` (numeric) - GPS longitude of the report
- `address` (text) - human-readable address (optional)
- `status` (text) - report status: "open", "in_progress", "resolved"
- `image_url` (text) - optional URL of uploaded image
- `created_at` (timestamptz) - timestamp of submission

## Security
- RLS enabled on trash_reports
- Public read/write (anon + authenticated) since this is a community reporting app with no user accounts
*/

CREATE TABLE IF NOT EXISTS trash_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'other',
  ai_classification text,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'open',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trash_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_reports" ON trash_reports;
CREATE POLICY "public_select_reports" ON trash_reports FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_reports" ON trash_reports;
CREATE POLICY "public_insert_reports" ON trash_reports FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_reports" ON trash_reports;
CREATE POLICY "public_update_reports" ON trash_reports FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_reports" ON trash_reports;
CREATE POLICY "public_delete_reports" ON trash_reports FOR DELETE
TO anon, authenticated USING (true);

-- Index for spatial queries
CREATE INDEX IF NOT EXISTS trash_reports_location_idx ON trash_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS trash_reports_created_at_idx ON trash_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS trash_reports_status_idx ON trash_reports(status);
