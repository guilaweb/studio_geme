/**
 * Utilitário de compressão de imagens no cliente (Smartphone / Mobile First)
 * Reduz imagens de alta resolução (8MB - 15MB) tiradas na câmara do smartphone
 * para ficheiros leves (~200KB - 400KB), mantendo qualidade nítida para relatórios de engenharia
 * e economizando largura de banda em redes móveis 3G/4G.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/webp';
}

export async function compressImageForMobile(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.8,
    format = 'image/jpeg',
  } = options;

  // Se não for imagem suportada, retorna o ficheiro original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Redimensionar proporcionalmente se exceder os limites
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            // Se o ficheiro comprimido for maior que o original por alguma razão, mantém o original
            if (blob.size >= file.size) {
              return resolve(file);
            }

            const fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
            const compressedFile = new File([blob], fileName, {
              type: format,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          format,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
