-- Patch Violoncello URL obra 3595 (Drive sync tardío al primer seed)
UPDATE obras_particellas
SET url_archivo = '[{"url":"https://drive.google.com/file/d/1qxY7mG8muNW5eOKutz4m7ae7HhstTCs8/view?usp=drivesdk","description":"Violoncello - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]'
WHERE id_obra = 3595
  AND nombre_archivo = 'Violoncello'
  AND (url_archivo = '[]' OR url_archivo IS NULL);
