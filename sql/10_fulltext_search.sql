-- Full-text search for packs and shops

-- Add search vector columns
ALTER TABLE packs ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Generate search vectors from existing data
UPDATE packs SET search_vector =
  setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(id::text, '')), 'C');

UPDATE shops SET search_vector =
  setweight(to_tsvector('spanish', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('spanish', coalesce(city, '')), 'C') ||
  setweight(to_tsvector('spanish', coalesce(address, '')), 'D');

-- Create GIN indexes for full-text search
CREATE INDEX IF NOT EXISTS idx_packs_search ON packs USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_shops_search ON shops USING GIN(search_vector);

-- Triggers to auto-update search vectors
CREATE OR REPLACE FUNCTION packs_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.id::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER packs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION packs_search_vector_update();

CREATE OR REPLACE FUNCTION shops_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('spanish', coalesce(NEW.city, '')), 'C') ||
    setweight(to_tsvector('spanish', coalesce(NEW.address, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_search_vector_trigger
  BEFORE INSERT OR UPDATE ON shops
  FOR EACH ROW
  EXECUTE FUNCTION shops_search_vector_update();
