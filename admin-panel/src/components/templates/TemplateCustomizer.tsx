import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/api/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Palette } from 'lucide-react';

interface TemplateCustomizerProps {
  templateId: string;
  settings: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
}

export function TemplateCustomizer({ templateId, settings, onSettingsChange }: TemplateCustomizerProps) {
  // Always call useQuery to maintain hook order, but disable when no templateId
  const { data: template } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templatesApi.getById(templateId!),
    enabled: !!templateId,
  });

  const colors = settings?.colors || template?.config?.colors || {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    background: '#1e1e2e',
  };

  const handleColorChange = (colorKey: string, value: string) => {
    const newColors = { ...colors, [colorKey]: value };
    onSettingsChange({
      ...settings,
      colors: newColors,
    });
  };

  // Early return if no templateId or template not loaded - but hooks are already called above
  if (!templateId) {
    return null;
  }

  if (!template) {
    return <div className="text-gray-500">Loading template...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          <CardTitle>Customize Template</CardTitle>
        </div>
        <CardDescription>
          Customize the colors and appearance of your {template.name} template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color Customization */}
        <div>
          <h3 className="text-sm font-medium mb-4">Color Scheme</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Color
              </label>
              <div className="flex gap-3 items-center">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: colors.primary }}
                />
                <Input
                  type="color"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  className="w-24 h-10"
                />
                <Input
                  type="text"
                  value={colors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Secondary Color
              </label>
              <div className="flex gap-3 items-center">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: colors.secondary }}
                />
                <Input
                  type="color"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  className="w-24 h-10"
                />
                <Input
                  type="text"
                  value={colors.secondary}
                  onChange={(e) => handleColorChange('secondary', e.target.value)}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Background Color
              </label>
              <div className="flex gap-3 items-center">
                <div
                  className="w-12 h-12 rounded border border-gray-300"
                  style={{ backgroundColor: colors.background }}
                />
                <Input
                  type="color"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  className="w-24 h-10"
                />
                <Input
                  type="text"
                  value={colors.background}
                  onChange={(e) => handleColorChange('background', e.target.value)}
                  placeholder="#1e1e2e"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div>
          <h3 className="text-sm font-medium mb-4">Preview</h3>
          <div
            className="p-6 rounded-lg border-2 border-gray-200"
            style={{ backgroundColor: colors.background }}
          >
            <div className="space-y-3">
              <div
                className="h-12 rounded flex items-center px-4 text-white font-medium"
                style={{ backgroundColor: colors.primary }}
              >
                Primary Color Sample
              </div>
              <div
                className="h-12 rounded flex items-center px-4 text-white font-medium"
                style={{ backgroundColor: colors.secondary }}
              >
                Secondary Color Sample
              </div>
              <div className="text-gray-300 text-sm">
                This is how your portfolio will look with these colors
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="outline"
          onClick={() => {
            onSettingsChange({
              ...settings,
              colors: template.config?.colors || {
                primary: '#6366f1',
                secondary: '#8b5cf6',
                background: '#1e1e2e',
              },
            });
          }}
        >
          Reset to Default
        </Button>
      </CardContent>
    </Card>
  );
}

