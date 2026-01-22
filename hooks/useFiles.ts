import { useState, useEffect, useCallback } from 'react';
import { fileService } from '@/services/fileService';
import { UploadedFile } from '@/types';

export function useFiles(studentId?: string, staffId?: string) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedFiles: UploadedFile[] = [];
      if (studentId) {
        loadedFiles = await fileService.getFilesByStudent(studentId);
      } else if (staffId) {
        loadedFiles = await fileService.getFilesByRecipient(staffId);
      } else {
        loadedFiles = await fileService.getAllFiles();
      }
      setFiles(loadedFiles);
    } catch (error) {
      console.error('Load files error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, staffId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const uploadFile = async (file: Omit<UploadedFile, 'id' | 'uploadedAt'>) => {
    const newFile = await fileService.uploadFile(file);
    setFiles((prev) => [newFile, ...prev]);
    return newFile;
  };

  const deleteFile = async (fileId: string) => {
    await fileService.deleteFile(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  return { files, isLoading, uploadFile, deleteFile, refresh: loadFiles };
}
