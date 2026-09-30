-- El libro de ajustes abrevia "ACCESORIO Y MANTENIMIENTO DEL HOGAR". El catálogo solo se siembra
-- en la primera instalación, así que el alias nuevo llega a las bases existentes por aquí.
UPDATE "Categoria"
SET "alias" = COALESCE("alias" || E'\n', '') || 'ACCESORIO Y MANT HOGAR'
WHERE "nombre" = 'Accesorios y Mantenimiento del Hogar'
  AND COALESCE("alias", '') NOT LIKE '%MANT HOGAR%';
