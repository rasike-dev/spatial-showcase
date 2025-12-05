-- Templates table for portfolio templates
CREATE TABLE IF NOT EXISTS templates (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'portfolio', -- 'portfolio', 'gallery', 'showcase'
  preview_image_url VARCHAR(500),
  config JSONB DEFAULT '{}', -- Template configuration (scenes, layouts, colors, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO templates (id, name, description, category, preview_image_url, config) VALUES
(
  'creative-portfolio',
  'Creative Portfolio',
  'A versatile template perfect for artists, designers, and creatives. Features a main hall with gallery rooms and project showcases.',
  'portfolio',
  '/templates/creative-portfolio-preview.jpg',
  '{
    "scenes": ["main_hall", "gallery", "projects", "about", "contact"],
    "layout": "hub-and-spoke",
    "colors": {
      "primary": "#6366f1",
      "secondary": "#8b5cf6",
      "background": "#1e1e2e"
    },
    "features": ["gallery", "projects", "about", "contact"]
  }'::jsonb
),
(
  'photography-gallery',
  'Photography Gallery',
  'Designed for photographers and visual artists. Emphasizes large image displays with minimal distractions.',
  'gallery',
  '/templates/photography-gallery-preview.jpg',
  '{
    "scenes": ["main_hall", "gallery", "photo_gallery", "about"],
    "layout": "gallery-focused",
    "colors": {
      "primary": "#000000",
      "secondary": "#ffffff",
      "background": "#0a0a0a"
    },
    "features": ["gallery", "photo_gallery", "about"]
  }'::jsonb
),
(
  'project-showcase',
  'Project Showcase',
  'Ideal for developers, architects, and professionals showcasing their work. Highlights projects with detailed descriptions.',
  'showcase',
  '/templates/project-showcase-preview.jpg',
  '{
    "scenes": ["main_hall", "projects", "innovation_lab", "about", "contact"],
    "layout": "project-focused",
    "colors": {
      "primary": "#3b82f6",
      "secondary": "#10b981",
      "background": "#111827"
    },
    "features": ["projects", "innovation_lab", "about", "contact"]
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Update trigger for templates
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

