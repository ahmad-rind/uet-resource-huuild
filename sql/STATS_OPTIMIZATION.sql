-- Site Stats Optimization Migration

-- 1. Create site_stats table
CREATE TABLE IF NOT EXISTS public.site_stats (
    key TEXT PRIMARY KEY,
    value BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Initialize stats
INSERT INTO public.site_stats (key, value)
SELECT 'total_resources', COUNT(*) FROM public.resources WHERE status = 'approved'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

INSERT INTO public.site_stats (key, value)
SELECT 'total_contributors', COUNT(DISTINCT uploaded_by) FROM public.resources WHERE status = 'approved'
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- 3. Create/Update function to get dept counts using aggregation but keeping it optimized
-- (Note: Dept counts are slightly more complex to pre-compute individually efficiently without another table, 
-- but given the requirement for "Resources" and "Contributors" to be instant, we focus on those).

-- 4. Create trigger function to update site_stats on resource changes
CREATE OR REPLACE FUNCTION public.update_site_stats_on_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update total_resources
    IF (TG_OP = 'INSERT' AND NEW.status = 'approved') OR (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') THEN
        UPDATE public.site_stats SET value = value + 1, updated_at = NOW() WHERE key = 'total_resources';
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'approved') OR (TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved') THEN
        UPDATE public.site_stats SET value = GREATEST(0, value - 1), updated_at = NOW() WHERE key = 'total_resources';
    END IF;

    -- Update total_contributors (Periodic refresh is safer for contributors to handle distinct counts accurately)
    -- But for simplicity in this trigger, we can just flag it for refresh or do a quick check.
    -- For now, let's just refresh contributor count on any approved change.
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        UPDATE public.site_stats 
        SET value = (SELECT COUNT(DISTINCT uploaded_by) FROM public.resources WHERE status = 'approved'), 
            updated_at = NOW() 
        WHERE key = 'total_contributors';
    END IF;

    RETURN NULL;
END;
$$;

-- 5. Attach triggers
DROP TRIGGER IF EXISTS tr_update_site_stats ON public.resources;
CREATE TRIGGER tr_update_site_stats
AFTEER INSERT OR UPDATE OR DELETE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.update_site_stats_on_change();

-- 6. RPC to get pre-computed stats in one go
CREATE OR REPLACE FUNCTION public.get_site_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_resources BIGINT;
    v_total_contributors BIGINT;
BEGIN
    SELECT value INTO v_total_resources FROM public.site_stats WHERE key = 'total_resources';
    SELECT value INTO v_total_contributors FROM public.site_stats WHERE key = 'total_contributors';
    
    RETURN json_build_object(
        'total_resources', COALESCE(v_total_resources, 0),
        'total_contributors', COALESCE(v_total_contributors, 0)
    );
END;
$$;

-- Grant access
GRANT SELECT ON public.site_stats TO anon;
GRANT SELECT ON public.site_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_site_stats() TO authenticated;
