-- Tarif uch pog'onadan ikkitaga: FREE (bepul) va PRO (pullik)
-- STANDARD va PREMIUM farqlanmagan edi — ikkalasi ham PRO ga o'tadi.
UPDATE "Clinic" SET "tier" = 'PRO' WHERE "tier" IN ('STANDARD', 'PREMIUM');
