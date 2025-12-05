import { useQuery } from '@tanstack/react-query';
import { templatesApi } from '@/api/templates';
import type { Template } from '@/api/templates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import { useState } from 'react';

interface TemplateSelectorProps {
  selectedTemplateId?: string;
  onSelect: (templateId: string) => void;
  disabled?: boolean;
}

export function TemplateSelector({ selectedTemplateId, onSelect, disabled }: TemplateSelectorProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.getAll,
  });

  if (isLoading) {
    return <div className="text-gray-500">Loading templates...</div>;
  }

  if (!templates || templates.length === 0) {
    return <div className="text-gray-500">No templates available</div>;
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'portfolio':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'gallery':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'showcase':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'portfolio':
        return 'Portfolio';
      case 'gallery':
        return 'Gallery';
      case 'showcase':
        return 'Showcase';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Choose a Template
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Select a template that best fits your content. You can customize colors and settings later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = selectedTemplateId === template.id;
          const colors = template.config?.colors || {};

          return (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => !disabled && onSelect(template.id)}
            >
              <CardHeader className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  {isSelected && (
                    <div className="bg-blue-500 text-white rounded-full p-1">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-1 rounded border ${getCategoryColor(
                      template.category
                    )}`}
                  >
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
                <CardDescription className="text-sm">
                  {template.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {/* Color preview */}
                <div className="flex gap-2 mb-3">
                  {colors.primary && (
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: colors.primary }}
                      title="Primary Color"
                    />
                  )}
                  {colors.secondary && (
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: colors.secondary }}
                      title="Secondary Color"
                    />
                  )}
                  {colors.background && (
                    <div
                      className="w-8 h-8 rounded border border-gray-300"
                      style={{ backgroundColor: colors.background }}
                      title="Background Color"
                    />
                  )}
                </div>

                {/* Features */}
                {template.config?.features && template.config.features.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Features: </span>
                    {template.config.features.slice(0, 3).join(', ')}
                    {template.config.features.length > 3 && '...'}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

