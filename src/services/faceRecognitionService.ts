import * as faceapi from '@vladmandic/face-api';

export interface DetectedFace {
  boundingBox: { x: number; y: number; width: number; height: number };
  descriptor: number[];
}

export interface MatchResult {
  photoId: string;
  distance: number;
  confidencePercent: number;
}

class FaceRecognitionService {
  private modelsLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Carrega os modelos neurais compactos de reconhecimento facial
   */
  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = (async () => {
      try {
        const MODEL_URL = '/models/face';
        console.log('[FaceRecognitionService] Carregando modelos neurais de face...');

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        this.modelsLoaded = true;
        console.log('[FaceRecognitionService] ✅ Modelos neurais carregados com sucesso!');
      } catch (err: any) {
        this.loadingPromise = null;
        this.modelsLoaded = false;
        console.error('[FaceRecognitionService] ❌ Erro ao carregar modelos neurais:', err);
        throw new Error(
          'Falha ao carregar modelos neurais de reconhecimento facial. Certifique-se de que os arquivos em /models/face estão acessíveis.'
        );
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Detecta todos os rostos em uma imagem e extrai os vetores de 128 dimensões
   */
  async detectFaces(
    input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    scoreThreshold = 0.4
  ): Promise<DetectedFace[]> {
    await this.loadModels();

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold,
    });

    const detections = await faceapi
      .detectAllFaces(input, options)
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    return detections.map((d) => ({
      boundingBox: {
        x: Math.round(d.detection.box.x),
        y: Math.round(d.detection.box.y),
        width: Math.round(d.detection.box.width),
        height: Math.round(d.detection.box.height),
      },
      descriptor: Array.from(d.descriptor),
    }));
  }

  /**
   * Detecta o rosto principal em uma selfie (o maior ou mais nítido)
   */
  async detectSingleFace(
    input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    scoreThreshold = 0.4
  ): Promise<DetectedFace | null> {
    await this.loadModels();

    const faces = await this.detectFaces(input, scoreThreshold);
    if (!faces || faces.length === 0) return null;

    // Se houver mais de um rosto, escolhe o de maior área (focado na selfie)
    let bestFace = faces[0];
    let maxArea = bestFace.boundingBox.width * bestFace.boundingBox.height;

    for (let i = 1; i < faces.length; i++) {
      const area = faces[i].boundingBox.width * faces[i].boundingBox.height;
      if (area > maxArea) {
        maxArea = area;
        bestFace = faces[i];
      }
    }

    return bestFace;
  }

  /**
   * Calcula a distância euclidiana entre dois descritores de 128 dimensões
   * (Valores menores que 0.55 indicam a mesma pessoa com alta probabilidade)
   */
  computeDistance(desc1: number[], desc2: number[]): number {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) return 1.0;
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const diff = desc1[i] - desc2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Compara a selfie com todos os rostos indexados na galeria e retorna as fotos correspondentes
   */
  matchSelfieWithGallery(
    selfieDescriptor: number[],
    galleryFaces: Array<{ photo_id: string; descriptor: number[] }>,
    threshold = 0.58
  ): MatchResult[] {
    const photoMatchMap = new Map<string, number>();

    for (const item of galleryFaces) {
      if (!item.descriptor || item.descriptor.length !== 128) continue;

      const distance = this.computeDistance(selfieDescriptor, item.descriptor);
      if (distance <= threshold) {
        const currentBest = photoMatchMap.get(item.photo_id);
        if (currentBest === undefined || distance < currentBest) {
          photoMatchMap.set(item.photo_id, distance);
        }
      }
    }

    const results: MatchResult[] = [];
    photoMatchMap.forEach((dist, photoId) => {
      // Converte distância em confiança percentual (distância 0 -> 100%, distância 0.58 -> ~65%)
      const confidence = Math.max(50, Math.min(100, Math.round((1 - dist / 0.8) * 100)));
      results.push({
        photoId,
        distance: dist,
        confidencePercent: confidence,
      });
    });

    // Ordena pelo melhor match (menor distância / maior confiança)
    return results.sort((a, b) => a.distance - b.distance);
  }
}

export const faceRecognitionService = new FaceRecognitionService();
