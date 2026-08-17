export type GalleryStatus = 'draft' | 'active' | 'archived';

export interface ProgressiveDiscountTier {
  min_photos: number;
  max_photos: number;
  price_per_photo: number;
}

export interface GalleryVisitor {
  id: string;
  gallery_id: string;
  name: string;
  email?: string | null;
  whatsapp?: string | null;
  accessed_at: string;
  last_accessed_at?: string | null;
  downloads_count?: number;
  lead_id?: string | null;
  selected_photo_ids?: string[];
  gallery_title?: string;
}

export interface GalleryOrder {
  id: string;
  gallery_id: string;
  visitor_id?: string | null;
  buyer_name: string;
  buyer_email?: string | null;
  buyer_whatsapp?: string | null;
  photo_count: number;
  total_price: number;
  payment_status: 'pending' | 'paid' | 'canceled';
  payment_method: string;
  created_at: string;
}

export interface GallerySelection {
  id: string;
  gallery_id: string;
  visitor_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_whatsapp?: string | null;
  selected_photo_ids: string[];
  total_photos: number;
  included_photos: number;
  extra_photos: number;
  extra_photos_total_price: number;
  payment_status: 'pending' | 'paid' | 'waived';
  created_at: string;
}

export type WatermarkType = 'text' | 'image';

export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

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
  enable_sales?: boolean;
  enable_downloads?: boolean;
  watermark_enabled: boolean;
  watermark_type?: WatermarkType;
  watermark_position?: WatermarkPosition;
  watermark_opacity?: number;
  watermark_scale?: number;
  watermark_text?: string | null;
  watermark_logo_url?: string | null;
  enable_usage_policy_modal?: boolean;
  usage_policy_text?: string | null;
  price_per_extra_photo: number;
  package_photo_limit?: number | null;
  progressive_discounts?: ProgressiveDiscountTier[] | null;
  require_lead_capture?: boolean;
  enable_social_promo?: boolean;
  photographer_instagram?: string | null;
  google_drive_folder_id?: string | null;
  photo_sort_order?: 'capture_asc' | 'capture_desc' | 'name_asc' | 'name_desc' | 'order_asc' | null;
  require_download_pin?: boolean;
  download_pin?: string | null;
  subgalleries?: string[] | null;
  status: GalleryStatus;
  created_at: string;
  updated_at: string;
  // Dynamic extra fields
  photo_count?: number;
  client_name?: string;
  client_email?: string;
  photos?: GalleryPhoto[];
  visitors?: GalleryVisitor[];
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
  subgallery_name?: string | null;
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
  enable_sales?: boolean;
  enable_downloads?: boolean;
  require_download_pin?: boolean;
  download_pin?: string;
  watermark_enabled: boolean;
  watermark_type?: WatermarkType;
  watermark_position?: WatermarkPosition;
  watermark_opacity?: number;
  watermark_scale?: number;
  watermark_text?: string;
  watermark_logo_url?: string;
  watermark_rotation?: number;
  enable_usage_policy_modal?: boolean;
  usage_policy_text?: string;
  photo_sort_order?: 'capture_asc' | 'capture_desc' | 'name_asc' | 'name_desc' | 'order_asc';
  subgalleries?: string[];
  price_per_extra_photo?: number;
  package_photo_limit?: number;
  progressive_discounts?: ProgressiveDiscountTier[];
  require_lead_capture?: boolean;
  enable_social_promo?: boolean;
  photographer_instagram?: string;
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

