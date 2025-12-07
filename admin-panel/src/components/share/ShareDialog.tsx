import { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { shareApi } from '@/api/share';
import type { ShareLink } from '@/api/share';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, ExternalLink, X } from 'lucide-react';
import { Toast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { QRCodeSVG } from 'qrcode.react';

interface ShareDialogProps {
  portfolioId: string;
  onClose?: () => void;
}

export function ShareDialog({ portfolioId, onClose }: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const hasGeneratedRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () => {
      console.log('[ShareDialog] Generating share link for portfolio:', portfolioId);
      return shareApi.generate(portfolioId);
    },
    onSuccess: (data) => {
      console.log('[ShareDialog] Share link generated successfully:', data);
      setShareLink(data);
      setToast({ message: 'Share link generated successfully!', type: 'success' });
      hasGeneratedRef.current = true;
    },
    onError: (error: any) => {
      console.error('[ShareDialog] Error generating share link:', error);
      console.error('[ShareDialog] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        code: error?.code
      });
      
      // Reset flag on error so user can retry
      hasGeneratedRef.current = false;
      
      // Handle rate limit error specifically
      if (error?.response?.status === 429) {
        setToast({
          message: 'Too many requests. Please wait a moment and try again.',
          type: 'error',
        });
      } else {
        const errorMessage = error?.message || error?.response?.data?.error || 'Failed to generate share link. Please check your connection and try again.';
        setToast({
          message: errorMessage,
          type: 'error',
        });
      }
    },
  });

  // Log when dialog opens (auto-generation disabled for debugging)
  useEffect(() => {
    if (!portfolioId) {
      console.warn('[ShareDialog] No portfolioId provided');
      return;
    }
    
    console.log('[ShareDialog] ========== DIALOG OPENED ==========');
    console.log('[ShareDialog] Portfolio ID:', portfolioId);
    console.log('[ShareDialog] Current state:', {
      isPending: mutation.isPending,
      isError: mutation.isError,
      isSuccess: mutation.isSuccess,
      hasGenerated: hasGeneratedRef.current,
      shareLink: !!shareLink
    });
    console.log('[ShareDialog] Auto-generation DISABLED - user must click button');
    console.log('[ShareDialog] ====================================');
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioId]);

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink.shareUrl);
      setToast({ message: 'Link copied to clipboard!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to copy link', type: 'error' });
    }
  };

  const handleDownloadQR = () => {
    if (!shareLink) return;
    
    // Generate QR code as PNG from SVG
    const qrCodeElement = document.getElementById(`qr-code-${portfolioId}`);
    if (qrCodeElement) {
      const svg = qrCodeElement.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `qr-code-${portfolioId}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              setToast({ message: 'QR code downloaded!', type: 'success' });
            }
          }, 'image/png');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    } else {
      setToast({ message: 'QR code not available', type: 'error' });
    }
  };

  const handleOpenLink = () => {
    if (!shareLink) {
      setToast({ message: 'No share link available', type: 'error' });
      return;
    }
    
    try {
      console.log('[ShareDialog] Opening link:', shareLink.shareUrl);
      const newWindow = window.open(shareLink.shareUrl, '_blank', 'noopener,noreferrer');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        // Pop-up blocked, try alternative method
        console.warn('[ShareDialog] Pop-up blocked, trying alternative method');
        setToast({ 
          message: 'Pop-up blocked. Please allow pop-ups or copy the link manually.', 
          type: 'error' 
        });
        // Fallback: copy to clipboard and show message
        navigator.clipboard.writeText(shareLink.shareUrl).then(() => {
          setToast({ 
            message: 'Link copied! Pop-up was blocked. Paste the link in a new tab.', 
            type: 'success' 
          });
        });
      } else {
        setToast({ message: 'Opening share link in new tab...', type: 'success' });
      }
    } catch (error) {
      console.error('[ShareDialog] Error opening link:', error);
      setToast({ 
        message: 'Failed to open link. Please copy and paste it manually.', 
        type: 'error' 
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="relative">
        <CardTitle>Share Portfolio</CardTitle>
        <CardDescription>
          Share your portfolio with others using the link or QR code below
        </CardDescription>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {mutation.isPending ? (
          <div className="text-center py-12">
            <LoadingSpinner size="lg" />
            <p className="text-gray-500 mt-4">Generating share link...</p>
            <p className="text-xs text-gray-400 mt-2">This may take a few seconds</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                mutation.reset();
                setShareLink(null);
              }}
              className="mt-4"
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
          </div>
        ) : mutation.isError ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-2 font-medium">
              Failed to generate share link
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {mutation.error?.response?.data?.error || mutation.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() => {
                mutation.reset();
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Retrying...' : 'Retry'}
            </Button>
          </div>
        ) : shareLink ? (
          <div className="space-y-6">
            {/* Share URL */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink.shareUrl}
                  readOnly
                  onClick={(e) => {
                    e.currentTarget.select();
                    handleCopyLink();
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm cursor-pointer hover:bg-gray-100"
                  title="Click to select and copy"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenLink}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click the link above to copy, or use the buttons
              </p>
              {/* Direct link as alternative */}
              <div className="mt-2">
                <a
                  href={shareLink.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open link in new tab
                </a>
              </div>
            </div>

            {/* QR Code */}
            <div>
              <label className="block text-sm font-medium mb-2">
                QR Code
              </label>
              <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white">
                <div id={`qr-code-${portfolioId}`} className="flex items-center justify-center">
                  <QRCodeSVG
                    value={shareLink.shareUrl}
                    size={192}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadQR}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download QR Code
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Scan this QR code to open the portfolio on any device
              </p>
            </div>

            {/* Expiration Info */}
            {shareLink.expiresAt && (
              <div className="text-sm text-gray-500">
                <strong>Expires:</strong>{' '}
                {new Date(shareLink.expiresAt).toLocaleString()}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShareLink(null);
                  mutation.reset();
                }}
                className="flex-1"
              >
                Generate New Link
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              {mutation.isPending ? 'Generating share link...' : 'Click the button below to generate a share link'}
            </p>
            <Button
              onClick={() => {
                console.log('[ShareDialog] Manual generate button clicked');
                console.log('[ShareDialog] Portfolio ID:', portfolioId);
                console.log('[ShareDialog] Mutation state:', {
                  isPending: mutation.isPending,
                  isError: mutation.isError,
                  isSuccess: mutation.isSuccess
                });
                
                setShareLink(null);
                hasGeneratedRef.current = false;
                mutation.reset();
                
                console.log('[ShareDialog] Calling mutation.mutate()...');
                mutation.mutate();
              }}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Generating...' : 'Generate Share Link'}
            </Button>
            {mutation.isError && (
              <div className="mt-4">
                <p className="text-sm text-red-600 font-medium">Failed to generate share link</p>
                <p className="text-xs text-gray-500 mt-1">
                  Check the browser console for details
                </p>
              </div>
            )}
            {!mutation.isPending && !mutation.isError && !mutation.isSuccess && (
              <p className="text-xs text-gray-400 mt-2">
                If nothing happens, check the browser console (F12)
              </p>
            )}
          </div>
        )}
      </CardContent>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Card>
  );
}

