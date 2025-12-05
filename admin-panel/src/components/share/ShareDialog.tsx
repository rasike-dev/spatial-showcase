import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { shareApi } from '@/api/share';
import type { ShareLink } from '@/api/share';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, QrCode, ExternalLink } from 'lucide-react';
import { Toast } from '@/components/ui/toast';

interface ShareDialogProps {
  portfolioId: string;
  onClose?: () => void;
}

export function ShareDialog({ portfolioId, onClose }: ShareDialogProps) {
  const [shareLink, setShareLink] = useState<ShareLink | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const mutation = useMutation({
    mutationFn: () => shareApi.generate(portfolioId),
    onSuccess: (data) => {
      setShareLink(data);
      setToast({ message: 'Share link generated successfully!', type: 'success' });
    },
    onError: (error: any) => {
      setToast({
        message: error?.response?.data?.error || 'Failed to generate share link',
        type: 'error',
      });
    },
  });

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
    const link = document.createElement('a');
    link.href = shareLink.qrCode;
    link.download = `qr-code-${portfolioId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: 'QR code downloaded!', type: 'success' });
  };

  const handleOpenLink = () => {
    if (!shareLink) return;
    window.open(shareLink.shareUrl, '_blank');
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Share Portfolio</CardTitle>
        <CardDescription>
          Generate a shareable link to let others view your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!shareLink ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Generate a shareable link for this portfolio
            </p>
            <Button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Generating...' : 'Generate Share Link'}
            </Button>
          </div>
        ) : (
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
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
            </div>

            {/* QR Code */}
            <div>
              <label className="block text-sm font-medium mb-2">
                QR Code
              </label>
              <div className="flex flex-col items-center gap-4 p-4 border border-gray-200 rounded-lg bg-white">
                <img
                  src={shareLink.qrCode}
                  alt="QR Code"
                  className="w-48 h-48"
                />
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

