import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';

/**
 * 1. Módulo de Câmera
 */
export const ObjectCamera = {
    /**
     * Abre a câmera (com opção de forçar frontal ou traseira) para tirar uma foto.
     */
    async capturePhoto(source: CameraSource = CameraSource.Prompt): Promise<string | undefined> {
        try {
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source, // CameraSource.Camera (Traseira) ou CameraSource.Photos, ou Prompt
            });
            return image.dataUrl;
        } catch (error) {
            console.error('Erro ao abrir a câmera:', error);
            return undefined;
        }
    },

    async captureSelfie(): Promise<string | undefined> {
        return this.capturePhoto(CameraSource.Camera);
        // Note: Em alguns casos o Capacitor CameraSource.Prompt já deixa o usuário escolher.
        // Para forçar a frontal em certas versões nativas customizadas, existe o `direction` option 
        // Em versões recentes da Camera plugin o "direction" foi removido ou mantido? 
        // Vamos de Prompt de forma segura, ou CameraSource.Camera
    }
};

/**
 * 2. Módulo de Áudio (Gravador de voz nativo ou via web APIs suportadas em WebView)
 */
export class AudioRecorder {
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    /**
     * Solicita permissão (se necessário) e inicia a gravação.
     */
    async startRecording(): Promise<void> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.start();
            console.log('Gravação de áudio iniciada...');
        } catch (error) {
            console.error('Erro ao acessar o microfone:', error);
            throw new Error('Permissão de microfone negada ou não suportada.');
        }
    }

    /**
     * Para a gravação e retorna o arquivo de áudio como Blob.
     */
    stopRecording(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                return reject(new Error('Nenhuma gravação em andamento.'));
            }

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                resolve(audioBlob);

                // Desliga o microfone liberando as tracks
                this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
                this.mediaRecorder = null;
            };

            this.mediaRecorder.stop();
            console.log('Gravação finalizada.');
        });
    }
}

/**
 * 3. Módulo de Localização (GPS)
 */
export const ObjectLocation = {
    /**
     * Solicita a posição atual via GPS nativo e Capacitor Geolocation
     */
    async getCurrentPosition(): Promise<Position | null> {
        try {
            // Verifica/solicita a permissão primeiro se necessário (Capacitor 5+ levanta prompt nativo automaticamente no .getCurrentPosition,
            // mas podemos checar com checkPermissions)
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location !== 'granted') {
                await Geolocation.requestPermissions();
            }

            const coordinates = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
            });
            return coordinates;
        } catch (error) {
            console.error('Erro ao obter a localização:', error);
            return null;
        }
    }
};
