import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { mediaApi } from '@/api/media';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Image as ImageIcon, Video } from 'lucide-react';
import { useState, useRef } from 'react';
import { Toast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';

export default function MediaPage() {
  const { projectId, portfolioId } = useParams<{ projectId?: string; portfolioId?: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputEmptyRef = useRef<HTMLInputElement>(null);

  const queryKey = projectId ? ['media', 'project', projectId] : ['media', 'portfolio', portfolioId];
  const queryFn = projectId 
    ? () => mediaApi.getByProject(projectId)
    : () => mediaApi.getByPortfolio(portfolioId!);

  const { data: media, isLoading } = useQuery({
    queryKey,
    queryFn,
    enabled: !!(projectId || portfolioId),
  });

  const deleteMutation = useMutation({
    mutationFn: mediaApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setToast({ message: 'Media deleted successfully', type: 'success' });
    },
    onError: (error: any) => {
      setToast({ 
        message: error?.response?.data?.error || 'Failed to delete media', 
        type: 'error' 
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: string }) => {
      return mediaApi.upload(file, {
        project_id: projectId,
        portfolio_id: portfolioId,
        type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setToast({ message: 'Media uploaded successfully', type: 'success' });
      setUploading(false);
    },
    onError: (error: any) => {
      setToast({ 
        message: error?.response?.data?.error || 'Failed to upload media', 
        type: 'error' 
      });
      setUploading(false);
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' : 'other';
    
    uploadMutation.mutate({ file, type });
    
    // Reset input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadEmptyClick = () => {
    fileInputEmptyRef.current?.click();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this media? This action cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const getMediaUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    // Backend serves uploads at /api/media/uploads, but the URL in DB is /uploads/filename
    // So we need to construct: http://localhost:3000/api/media/uploads/filename
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const filename = url.replace('/uploads/', '');
    return `${baseUrl}/media/uploads/${filename}`;
  };

  if (!projectId && !portfolioId) {
    return <div>Project ID or Portfolio ID is required</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Media</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage media files {projectId ? 'for this project' : 'for this portfolio'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleUploadClick}
            disabled={uploading || uploadMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading || uploadMutation.isPending ? 'Uploading...' : 'Upload Media'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || uploadMutation.isPending}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {media && media.length > 0 ? (
            media.map((item) => (
              <Card key={item.id}>
                <CardHeader className="p-0">
                  {item.type === 'image' ? (
                    <img
                      src={getMediaUrl(item.url)}
                      alt={item.filename}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : item.type === 'video' ? (
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      <Video className="w-12 h-12 text-gray-400" />
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-sm font-medium truncate mb-1">{item.filename}</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {(item.file_size / 1024).toFixed(2)} KB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(item.id)}
                    disabled={deleteMutation.isPending}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500 mb-4">No media files yet</p>
                <Button onClick={handleUploadEmptyClick}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Media
                </Button>
                <input
                  ref={fileInputEmptyRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

