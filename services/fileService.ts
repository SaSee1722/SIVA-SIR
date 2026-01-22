import { getSharedSupabaseClient } from '@/template/core/client';
import { UploadedFile } from '@/types';

export const fileService = {
  async uploadFile(file: Omit<UploadedFile, 'id' | 'uploadedAt'>): Promise<UploadedFile> {
    const supabase = getSharedSupabaseClient();

    let uploadedUrl = '';

    if (file.base64Data) {
      console.log('[FileService] Uploading to Cloudinary...');

      const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudName || !uploadPreset || cloudName === 'YOUR_CLOUD_NAME') {
        throw new Error('Cloudinary configuration missing. Please check your .env file.');
      }

      // Determine resource type (image, video, or raw for documents)
      let resourceType = 'auto';
      if (file.fileType.includes('image')) resourceType = 'image';
      else if (file.fileType.includes('video')) resourceType = 'video';
      else resourceType = 'raw';

      const formData = new FormData();
      formData.append('file', file.base64Data);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', `eduportal/${file.studentId}`);

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        const data = await response.json();

        if (data.error) {
          console.error('[Cloudinary] Upload Error:', data.error.message);
          throw new Error(data.error.message);
        }

        uploadedUrl = data.secure_url;
        console.log('[FileService] Cloudinary upload success:', uploadedUrl);
      } catch (err: any) {
        console.error('[FileService] Cloudinary fetch error:', err.message);
        throw err;
      }
    }

    const newFileRow = {
      student_id: file.studentId,
      student_name: file.studentName,
      file_name: file.fileName,
      file_type: file.fileType,
      file_size: file.fileSize,
      thumbnail_uri: uploadedUrl || file.thumbnailUri,
      uploaded_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('files')
      .insert([newFileRow])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      studentId: data.student_id,
      studentName: data.student_name,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      uploadedAt: data.uploaded_at,
      thumbnailUri: data.thumbnail_uri,
    };
  },

  async getAllFiles(): Promise<UploadedFile[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(f => ({
      id: f.id,
      studentId: f.student_id,
      studentName: f.student_name,
      fileName: f.file_name,
      fileType: f.file_type,
      fileSize: f.file_size,
      uploadedAt: f.uploaded_at,
      thumbnailUri: f.thumbnail_uri,
    }));
  },

  async getFilesByStudent(studentId: string): Promise<UploadedFile[]> {
    const supabase = getSharedSupabaseClient();
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('student_id', studentId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(f => ({
      id: f.id,
      studentId: f.student_id,
      studentName: f.student_name,
      fileName: f.file_name,
      fileType: f.file_type,
      fileSize: f.file_size,
      uploadedAt: f.uploaded_at,
      thumbnailUri: f.thumbnail_uri,
    }));
  },

  async deleteFile(fileId: string): Promise<void> {
    const supabase = getSharedSupabaseClient();

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (error) throw error;
  },
};

