export type GalleryStatus = 'draft' | 'active' | 'archived';

export interface Gallery {
  id: string;
  user_id: string;
  client_id?: string | null;
  title: string;
  slug: string;
  event_date?: string | null;
  cover_photo_id?: string | null;
  cover_photo_url?: string | null;
  password_hash?: string | null;
  is_public_portfolio: boolean;
  allow_low_res_download: boolean;
  allow_high_res_download: boolean;
  watermark_enabled: boolean;
  watermark_text?: string | null;
  price_per_extra_photo: number;
  google_drive_folder_id?: string | null;
  status: GalleryStatus;
  created_at: string;
  updated_at: string;
  // Dynamic extra fields
  photo_count?: number;
  client_name?: string;
  client_email?: string;
  photos?: GalleryPhoto[];
}

export interface GalleryPhoto {
  id: string;
  gallery_id: string;
  google_drive_file_id: string;
  supabase_thumb_path: string;
  supabase_web_path: string;
  file_name?: string | null;
  file_size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  display_order: number;
  created_at: string;
}

export interface GalleryFormData {
  title: string;
  slug: string;
  event_date?: string;
  client_id?: string;
  password?: string;
  remove_password?: boolean;
  is_public_portfolio: boolean;
  allow_low_res_download: boolean;
  allow_high_res_download: boolean;
  watermark_enabled: boolean;
  watermark_text?: string;
  price_per_extra_photo?: number;
  status: GalleryStatus;
}

export interface FileUploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'compressing' | 'uploading_thumb' | 'uploading_web' | 'uploading_original' | 'completed' | 'error';
  errorMessage?: string;
  photoRecord?: GalleryPhoto;
}
