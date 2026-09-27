import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { faceRecognitionService } from '../../services/faceRecognitionService';
import { GalleryService } from '../../services/galleryService';

interface GalleryFaceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  onMatchSuccess: (matchedPhotoIds: string[], count: number) => void;
}

export function GalleryFaceSearchModal({
  isOpen,
  onClose,
  galleryId,
  onMatchSuccess,
}: GalleryFaceSearchModalProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Iniciar câmera ao abrir ou trocar para aba de câmera
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Seu navegador não possui suporte para acesso direto à câmera.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('[FaceSearch] Falha ao iniciar câmera:', err);
      setIsCameraActive(false);
      setCameraError('Não foi possível acessar a câmera frontal. Você pode fazer upload de uma foto.');
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('Identificando seu rosto...');

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Falha ao processar imagem');

      // Espelhar horizontalmente para ficar natural como um espelho
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      await runFaceMatching(canvas);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao analisar selfie.');
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProcessingStatus('Processando foto...');

    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      await runFaceMatching(img);
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao analisar foto enviada.');
      setIsProcessing(false);
    }
  };

  const runFaceMatching = async (inputElement: HTMLCanvasElement | HTMLImageElement) => {
    setProcessingStatus('Carregando inteligência artificial...');
    await faceRecognitionService.loadModels();

    setProcessingStatus('Detectando traços faciais na sua selfie...');
    const detectedFace = await faceRecognitionService.detectSingleFace(inputElement);

    if (!detectedFace) {
      throw new Error(
        'Nenhum rosto nítido foi identificado. Tire a foto em um local iluminado, de frente para a câmera e sem cobrir o rosto.'
      );
    }

    setProcessingStatus('Buscando suas fotos no evento...');
    const galleryFaces = await GalleryService.getGalleryFaces(galleryId);

    if (!galleryFaces || galleryFaces.length === 0) {
      throw new Error(
        'Esta galeria ainda não teve seus rostos indexados pelo fotógrafo ou não possui fotos cadastradas.'
      );
    }

    const matches = faceRecognitionService.matchSelfieWithGallery(
      detectedFace.descriptor,
      galleryFaces,
      0.58
    );

    const matchedPhotoIds = matches.map((m) => m.photoId);

    setIsProcessing(false);
    stopCamera();
    onMatchSuccess(matchedPhotoIds, matchedPhotoIds.length);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white space-y-4 p-6 relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Encontrar Minhas Fotos</h3>
              <p className="text-[11px] text-slate-400">Tire uma selfie para filtrar onde você aparece</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alternância de Abas (Câmera vs Enviar Foto) */}
        <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-2xl border border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Tirar Selfie</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Enviar Foto</span>
          </button>
        </div>

        {/* Área de Visualização */}
        {activeTab === 'camera' && (
          <div className="relative aspect-square max-h-[300px] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Guia Oval de Rosto */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-[65%] h-[80%] border-2 border-dashed border-purple-400/70 rounded-[50%] shadow-[0_0_25px_rgba(168,85,247,0.3)] animate-pulse" />
                </div>
              </>
            ) : (
              <div className="p-4 text-center space-y-2">
                {cameraError ? (
                  <p className="text-xs text-amber-400">{cameraError}</p>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span>Iniciando câmera frontal...</span>
                  </div>
                )}
              </div>
            )}

            {/* Overlay de Processamento */}
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-xs font-semibold text-purple-200">{processingStatus}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-purple-500/60 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition space-y-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-white">Toque aqui para escolher uma foto sua</p>
              <p className="text-[11px] text-slate-400">Selecione uma foto nítida do rolo da câmera</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {isProcessing && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center gap-2 text-xs text-purple-300">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>{processingStatus}</span>
              </div>
            )}
          </div>
        )}

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botões de Ação */}
        {activeTab === 'camera' && isCameraActive && (
          <button
            type="button"
            onClick={handleCaptureFromCamera}
            disabled={isProcessing}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analisando...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Tirar Selfie e Buscar</span>
              </>
            )}
          </button>
        )}

        <div className="pt-2 text-center">
          <p className="text-[10px] text-slate-500">
            🔒 Sua selfie é processada instantaneamente no seu navegador e não é salva no servidor.
          </p>
        </div>
      </div>
    </div>
  );
}
