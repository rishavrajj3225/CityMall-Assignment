-- Enable PostGIS extension for geospatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Disasters table
CREATE TABLE disasters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(POINT, 4326),
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]'
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resources table
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(POINT, 4326),
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache table
CREATE TABLE cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Indexes for performance
CREATE INDEX disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX disasters_owner_idx ON disasters (owner_id);
CREATE INDEX disasters_created_idx ON disasters (created_at);

CREATE INDEX reports_disaster_idx ON reports (disaster_id);
CREATE INDEX reports_user_idx ON reports (user_id);
CREATE INDEX reports_created_idx ON reports (created_at);

CREATE INDEX resources_location_idx ON resources USING GIST (location);
CREATE INDEX resources_disaster_idx ON resources (disaster_id);
CREATE INDEX resources_type_idx ON resources (type);

CREATE INDEX cache_expires_idx ON cache (expires_at);

-- Function for nearby resources
CREATE OR REPLACE FUNCTION get_nearby_resources(
    disaster_id UUID,
    center_point GEOGRAPHY,
    radius_meters INTEGER
) RETURNS TABLE (
    id UUID,
    disaster_id UUID,
    name TEXT,
    location_name TEXT,
    location GEOGRAPHY,
    type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.disaster_id,
        r.name,
        r.location_name,
        r.location,
        r.type,
        r.created_at,
        ST_Distance(r.location, center_point) AS distance_meters
    FROM resources r
    WHERE r.disaster_id = get_nearby_resources.disaster_id
    AND r.location IS NOT NULL
    AND ST_DWithin(r.location, center_point, radius_meters)
    ORDER BY ST_Distance(r.location, center_point);
END;
$$ LANGUAGE plpgsql;