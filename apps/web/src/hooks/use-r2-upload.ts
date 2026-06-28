import { useState } from "react";
import { toast } from "sonner";

interface UseR2UploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

export function useR2Upload(options?: UseR2UploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    type: "avatar" | "document" = "avatar",
  ) => {
    setIsUploading(true);
    setProgress(0);

    try {
      // 1. Get presigned URL from backend
      const params = new URLSearchParams({
        fileName: file.name,
        fileType: file.type,
        type,
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/uploads/presigned-url?${params.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get upload permission");
      }

      const { uploadUrl, key, publicUrl } = await response.json();

      // 2. Upload directly to R2
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      // 3. Confirm upload with backend
      if (type === "avatar") {
        const confirmResponse = await fetch(
          `${process.env.NEXT_PUBLIC_CLIENT_SIDE_API_BASE_URL}/api/uploads/confirm-avatar`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({ key }),
          },
        );

        if (!confirmResponse.ok) {
          throw new Error("Failed to confirm upload with server");
        }
      }

      setProgress(100);
      options?.onSuccess?.(publicUrl);
      return publicUrl;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      toast.error(errorMessage);
      options?.onError?.(
        error instanceof Error ? error : new Error(errorMessage),
      );
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
  };
}
