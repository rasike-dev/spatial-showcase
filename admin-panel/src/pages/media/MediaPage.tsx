import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { mediaApi } from '@/api/media';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Upload, Image as ImageIcon, Video, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { Toast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';

export default function MediaPage() {
  const { projectId, portfolioId } = useParams<{ projectId?: string; portfolioId?: string }>();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaName, setMediaName] = useState('');
  const [mediaTitle, setMediaTitle] = useState('');
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
      console.error('[MediaPage] Delete error:', error);
      let errorMessage = 'Failed to delete media';
      
      if (error?.response?.data?.error) {
        if (typeof error.response.data.error === 'string') {
          errorMessage = error.response.data.error;
        } else if (error.response.data.error?.message) {
          errorMessage = error.response.data.error.message;
        } else {
          errorMessage = JSON.stringify(error.response.data.error);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setToast({
        message: errorMessage,
        type: 'error'
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type, name, title }: { file: File; type: string; name?: string; title?: string }) => {
      return mediaApi.upload(file, {
        project_id: projectId,
        portfolio_id: portfolioId,
        type,
        name: name || undefined,
        title: title || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setToast({ message: 'Media uploaded successfully', type: 'success' });
      setUploading(false);
      // Reset form and close dialog
      setSelectedFile(null);
      setMediaName('');
      setMediaTitle('');
      setShowUploadDialog(false);
    },
    onError: (error: any) => {
      console.error('[MediaPage] Upload error:', error);
      let errorMessage = 'Failed to upload media';
      
      if (error?.response?.data?.error) {
        // If error is a string, use it directly
        if (typeof error.response.data.error === 'string') {
          errorMessage = error.response.data.error;
        } else if (error.response.data.error?.message) {
          errorMessage = error.response.data.error.message;
        } else {
          errorMessage = JSON.stringify(error.response.data.error);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setToast({ 
        message: errorMessage, 
        type: 'error' 
      });
      setUploading(false);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    // Pre-fill name and title from filename if not already set
    if (!mediaName) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setMediaName(nameWithoutExt);
    }
    if (!mediaTitle) {
      const titleWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setMediaTitle(titleWithoutExt);
    }
    setShowUploadDialog(true);
    
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

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    setUploading(true);
    const type = selectedFile.type.startsWith('image/') ? 'image' : 
                 selectedFile.type.startsWith('video/') ? 'video' : 'other';
    
    uploadMutation.mutate({ 
      file: selectedFile, 
      type,
      name: mediaName.trim() || undefined,
      title: mediaTitle.trim() || undefined,
    });
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setMediaName('');
    setMediaTitle('');
    setShowUploadDialog(false);
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
                  <p className="text-xs text-gray-500 mb-2">
                    {(item.file_size / 1024).toFixed(2)} KB
                  </p>
                  
                  {/* Name field */}
                  {item.name && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-400 mb-0.5">Name:</p>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {item.name}
                      </p>
                    </div>
                  )}
                  
                  {/* Title field */}
                  {item.title && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-0.5">Title:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {item.title}
                      </p>
                    </div>
                  )}
                  
                  {/* Show placeholder if no name/title */}
                  {!item.name && !item.title && (
                    <p className="text-xs text-gray-400 italic mb-3">
                      No name/title set
                    </p>
                  )}
                  
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

      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="relative">
              <CardTitle>Upload Media</CardTitle>
              <CardDescription>
                Set the name and title for this media file
              </CardDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4"
                onClick={handleCancelUpload}
                disabled={uploading || uploadMutation.isPending}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedFile && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium">Selected File:</p>
                  <p className="text-sm text-gray-600">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
              
              <div>
                <label htmlFor="media-name" className="block text-sm font-medium mb-2">
                  Name <span className="text-gray-500 text-xs">(display name)</span>
                </label>
                <Input
                  id="media-name"
                  type="text"
                  value={mediaName}
                  onChange={(e) => setMediaName(e.target.value)}
                  placeholder="Enter media name"
                  disabled={uploading || uploadMutation.isPending}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown as the primary name below the media in VR
                </p>
              </div>

              <div>
                <label htmlFor="media-title" className="block text-sm font-medium mb-2">
                  Title <span className="text-gray-500 text-xs">(subtitle)</span>
                </label>
                <Input
                  id="media-title"
                  type="text"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  placeholder="Enter media title"
                  disabled={uploading || uploadMutation.isPending}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be shown as the title below the name in VR
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleCancelUpload}
                  disabled={uploading || uploadMutation.isPending}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadSubmit}
                  disabled={uploading || uploadMutation.isPending || !selectedFile}
                  className="flex-1"
                >
                  {uploading || uploadMutation.isPending ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

