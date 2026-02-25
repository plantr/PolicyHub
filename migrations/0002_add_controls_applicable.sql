-- Add applicable flag to controls (allows marking controls as N/A)
ALTER TABLE "controls" ADD COLUMN "applicable" boolean NOT NULL DEFAULT true;
