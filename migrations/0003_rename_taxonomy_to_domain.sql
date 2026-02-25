-- Rename document "Category" concept to "Domain"
ALTER TABLE "documents" RENAME COLUMN "taxonomy" TO "domain";
ALTER TABLE "document_categories" RENAME TO "document_domains";
