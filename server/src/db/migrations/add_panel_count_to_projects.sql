-- Migration: Add panel_count column to projects table
-- This allows users to define the number of panels per room/level
-- Each project represents one room/level in the spatial showcase

-- Add panel_count column with default value of 1
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS panel_count INTEGER DEFAULT 1;

-- Update existing projects to have panel_count = 1 if NULL
UPDATE projects 
SET panel_count = 1 
WHERE panel_count IS NULL;

-- Add constraint to ensure panel_count is between 1 and 20
-- Drop constraint if it exists first (to allow re-running migration)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_panel_count_range' 
        AND conrelid = 'projects'::regclass
    ) THEN
        ALTER TABLE projects DROP CONSTRAINT check_panel_count_range;
    END IF;
END $$;

ALTER TABLE projects 
ADD CONSTRAINT check_panel_count_range 
CHECK (panel_count >= 1 AND panel_count <= 20);

-- Add comment to document the column
COMMENT ON COLUMN projects.panel_count IS 'Number of panels to display for this project/room/level (1-20)';

