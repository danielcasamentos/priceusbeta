import { supabase } from '../lib/supabase';

export interface InstagramAccountInfo {
  id: string; // Instagram Business Account ID
  username?: string;
  name?: string;
  profilePictureUrl?: string;
}

export interface PublishResult {
  success: boolean;
  postId?: string;
  error?: string;
}

/**
 * Faz upload do Blob renderizado do slide (com foto, grade ou arte) para um link público de alta velocidade
 * que os servidores da Meta conseguem baixar imediatamente.
 */
export async function uploadSlideBlobToPublicUrl(blob: Blob, slideIndex = 0): Promise<string> {
  const fileName = `instagram_publish/${Date.now()}_slide_${slideIndex}_${Math.random().toString(36).substring(2, 6)}.jpg`;

  try {
    const { data, error } = await supabase.storage
      .from('gallery-assets')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.warn('[Instagram Bridge] Falha ao enviar para gallery-assets, tentando fotos:', error);
      // Tentativa de fallback em bucket público 'photos'
      const { data: fbData } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

      const { data: fbUrl } = supabase.storage
        .from('photos')
        .getPublicUrl(fbData?.path || fileName);

      return fbUrl.publicUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from('gallery-assets')
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  } catch (err: any) {
    console.error('[Instagram Bridge Error]:', err);
    throw new Error('Falha ao gerar link público para a imagem.');
  }
}

/**
 * Gera a URL oficial de Login com Facebook/Instagram para qualquer fotógrafo conectar a própria conta em 1 clique
 */
export function getInstagramOAuthUrl(redirectUri = window.location.origin): string {
  const appId = import.meta.env.VITE_INSTAGRAM_APP_ID || '4703114263265678';
  const scope = 'instagram_basic,pages_show_list,pages_read_engagement';
  return `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=token`;
}

/**
 * Busca as contas do Instagram vinculadas ao token de acesso do usuário
 */
export async function fetchConnectedInstagramAccounts(accessToken?: string): Promise<InstagramAccountInfo[]> {
  const token = accessToken || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Token de acesso do Instagram não configurado.');
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account{id,username,name,profile_picture_url},name,id&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      console.error('[Instagram API] Erro ao buscar contas:', data.error);
      throw new Error(data.error.message || 'Erro na API do Instagram');
    }

    const accounts: InstagramAccountInfo[] = [];
    if (data.data && Array.isArray(data.data)) {
      for (const page of data.data) {
        if (page.instagram_business_account) {
          accounts.push({
            id: page.instagram_business_account.id,
            username: page.instagram_business_account.username || page.name,
            name: page.instagram_business_account.name || page.name,
            profilePictureUrl: page.instagram_business_account.profile_picture_url,
          });
        }
      }
    }

    return accounts;
  } catch (err: any) {
    console.error('[Instagram API] Falha na requisição:', err);
    throw err;
  }
}

/**
 * Publica 1 foto solo no feed do Instagram
 */
export async function publishSinglePhotoToInstagram(
  igAccountId: string,
  imageUrl: string,
  caption: string,
  accessToken?: string
): Promise<PublishResult> {
  const token = accessToken || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  if (!token) return { success: false, error: 'Token não configurado' };

  try {
    // 1. Criar o container de mídia
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          caption: caption,
          access_token: token,
        }),
      }
    );
    const createData = await createRes.json();

    if (createData.error) {
      return { success: false, error: createData.error.message };
    }

    const creationId = createData.id;

    // 2. Publicar o container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao publicar no Instagram' };
  }
}

/**
 * Publica um Carrossel (de 2 até 20 fotos) no feed do Instagram
 */
export async function publishCarouselToInstagram(
  igAccountId: string,
  imageUrls: string[],
  caption: string,
  accessToken?: string
): Promise<PublishResult> {
  const token = accessToken || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  if (!token) return { success: false, error: 'Token não configurado' };
  if (imageUrls.length < 2) {
    return publishSinglePhotoToInstagram(igAccountId, imageUrls[0], caption, token);
  }

  try {
    // 1. Criar containers individuais para cada slide do carrossel (máximo 20)
    const validUrls = imageUrls.slice(0, 20);
    const itemIds: string[] = [];

    for (const url of validUrls) {
      const itemRes = await fetch(
        `https://graph.facebook.com/v19.0/${igAccountId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: url,
            is_carousel_item: true,
            access_token: token,
          }),
        }
      );
      const itemData = await itemRes.json();
      if (itemData.id) {
        itemIds.push(itemData.id);
      }
    }

    if (itemIds.length < 2) {
      return { success: false, error: 'Não foi possível processar as imagens do carrossel.' };
    }

    // 2. Criar container do Carrossel agrupando os filhos
    const carouselRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: itemIds.join(','),
          caption: caption,
          access_token: token,
        }),
      }
    );
    const carouselData = await carouselRes.json();
    if (carouselData.error) {
      return { success: false, error: carouselData.error.message };
    }

    // 3. Publicar o carrossel
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: carouselData.id,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao publicar carrossel no Instagram' };
  }
}

/**
 * Publica um Story (formato 9:16) no Instagram
 */
export async function publishStoryToInstagram(
  igAccountId: string,
  imageUrl: string,
  accessToken?: string
): Promise<PublishResult> {
  const token = accessToken || import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
  if (!token) return { success: false, error: 'Token não configurado' };

  try {
    // 1. Criar container de Story
    const createRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          media_type: 'STORIES',
          access_token: token,
        }),
      }
    );
    const createData = await createRes.json();
    if (createData.error) {
      return { success: false, error: createData.error.message };
    }

    // 2. Publicar Story
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: createData.id,
          access_token: token,
        }),
      }
    );
    const publishData = await publishRes.json();
    if (publishData.error) {
      return { success: false, error: publishData.error.message };
    }

    return { success: true, postId: publishData.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao publicar Story' };
  }
}
