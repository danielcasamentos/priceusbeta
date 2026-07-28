import { supabase } from '../lib/supabase';

export interface SystemNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: 'gallery' | 'lead' | 'sale' | 'download' | 'upload' | 'payment';
  link?: string;
  relatedId?: string;
}

export class NotificationService {
  /**
   * Envia uma notificação no sistema Supabase que dispara áudio e WebSocket ao vivo
   */
  static async sendNotification(payload: SystemNotificationPayload): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: payload.userId,
        title: payload.title,
        message: payload.message,
        type: payload.type || 'gallery',
        link: payload.link || null,
        related_id: payload.relatedId || null,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[NotificationService] Não foi possível registrar notificação no banco:', err);
    }
  }

  /**
   * Notificação: Upload Concluído
   */
  static async notifyUploadCompleted(userId: string, galleryTitle: string, photoCount: number, galleryId?: string): Promise<void> {
    await this.sendNotification({
      userId,
      title: '📁 Upload de Fotos Concluído',
      message: `${photoCount} fotos foram processadas e enviadas para a galeria "${galleryTitle}".`,
      type: 'upload',
      link: galleryId ? `/galleries/${galleryId}` : '/galleries',
    });
  }

  /**
   * Notificação: Galeria Publicada
   */
  static async notifyGalleryPublished(userId: string, galleryTitle: string, slug: string): Promise<void> {
    await this.sendNotification({
      userId,
      title: '🌐 Nova Galeria Publicada Online',
      message: `A galeria "${galleryTitle}" está online e disponível no link público.`,
      type: 'gallery',
      link: `/g/${slug}`,
    });
  }

  /**
   * Notificação: Visitante Acessou Galeria (Lead Capturado)
   */
  static async notifyVisitorAccess(userId: string, galleryTitle: string, visitor: { name: string; whatsapp?: string; email?: string }): Promise<void> {
    const contactInfo = visitor.whatsapp ? `(WhatsApp: ${visitor.whatsapp})` : visitor.email ? `(E-mail: ${visitor.email})` : '';
    await this.sendNotification({
      userId,
      title: '👤 Novo Visitante na Galeria',
      message: `${visitor.name} ${contactInfo} acessou a galeria "${galleryTitle}".`,
      type: 'lead',
      link: '/leads',
    });
  }

  /**
   * Notificação: Download de Fotos
   */
  static async notifyPhotosDownloaded(userId: string, galleryTitle: string, photoCount: number): Promise<void> {
    await this.sendNotification({
      userId,
      title: '📥 Download Realizado',
      message: `Foram baixadas ${photoCount} fotos da galeria "${galleryTitle}".`,
      type: 'download',
      link: '/galleries',
    });
  }

  /**
   * Notificação: Venda de Fotos Extras (PIX / Cartão)
   */
  static async notifyExtraPhotosSale(userId: string, galleryTitle: string, photoCount: number, totalAmount: number, paymentMethod: 'pix' | 'credit_card'): Promise<void> {
    const methodText = paymentMethod === 'pix' ? 'PIX' : 'Cartão de Crédito';
    await this.sendNotification({
      userId,
      title: '💰 Nova Venda de Fotos Extras!',
      message: `Venda de ${photoCount} fotos extras na galeria "${galleryTitle}" por R$ ${totalAmount.toFixed(2)} via ${methodText}.`,
      type: 'sale',
      link: '/finance',
    });
  }

  /**
   * Notificação: Pagamento Processado & Liberação de Download
   */
  static async notifyPaymentApproved(userId: string, galleryTitle: string, photoCount: number): Promise<void> {
    await this.sendNotification({
      userId,
      title: '✅ Pagamento Aprovado & Fotos Liberadas',
      message: `O pagamento foi confirmado! ${photoCount} fotos extras da galeria "${galleryTitle}" foram liberadas para download do cliente.`,
      type: 'payment',
      link: '/galleries',
    });
  }
}
