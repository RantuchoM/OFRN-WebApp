import { useState } from 'react';

// --- FUNCIÓN UTILITARIA DE COMPRESIÓN ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200; // Ancho máximo razonable para noticias
        const scaleSize = MAX_WIDTH / img.width;
        
        // Solo redimensionamos si es más grande que el máximo
        const width = scaleSize < 1 ? MAX_WIDTH : img.width;
        const height = scaleSize < 1 ? img.height * scaleSize : img.height;

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertimos a JPEG con 70% de calidad
        canvas.toBlob((blob) => {
          // Recreamos el archivo con el nuevo blob
          const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/jpeg', 0.7); 
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const useImagePaster = (supabase, bucketName = 'news-content') => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (file) => {
    try {
      // 1. COMPRESIÓN EN EL NAVEGADOR (Cliente)
      // Esto reduce una captura de 3MB a ~200KB antes de tocar Supabase
      const compressedFile = await compressImage(file);

      // 2. Generar path limpio
      const fileName = `${Date.now()}_img.jpg`; // Forzamos extensión jpg
      const filePath = `${fileName}`;

      // 3. Subir a Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, compressedFile, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
        });

      if (uploadError) throw uploadError;

      // 4. URL Pública
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (e) {
      console.error("Error en upload:", e);
      throw e;
    }
  };

  const handlePaste = async (e, currentText, setFormDataField) => {
    if (!e.clipboardData || !e.clipboardData.items) return;
    const items = e.clipboardData.items;
    let file = null;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        file = items[i].getAsFile();
        break;
      }
    }
    if (!file) return;

    e.preventDefault();
    setIsUploading(true);

    try {
      const textarea = e.target;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const placeholder = `![Subiendo...]()...`;
      
      const textWithPlaceholder = 
        currentText.substring(0, startPos) + 
        placeholder + 
        currentText.substring(endPos);
      
      setFormDataField(textWithPlaceholder);

      const publicUrl = await uploadImage(file);
      const markdownImage = `![Imagen](${publicUrl})`;

      const finalText = textWithPlaceholder.replace(placeholder, markdownImage);
      setFormDataField(finalText);

    } catch (error) {
      alert("Error al procesar la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  return { handlePaste, isUploading };
};