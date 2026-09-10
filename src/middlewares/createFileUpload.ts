import multer from 'multer';

interface FileUploadOptions {
  maxFileSizeBytes: number;
  maxFiles: number;
}

export function createFileUpload(options: FileUploadOptions) {
  const upload = multer({ 
    storage: multer.diskStorage({}), 
    limits: {
      fileSize: options.maxFileSizeBytes,
      files: options.maxFiles
    }
  });

  return upload;
}
