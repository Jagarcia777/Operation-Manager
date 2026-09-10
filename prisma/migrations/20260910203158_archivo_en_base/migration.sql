/*
  Warnings:

  - You are about to drop the column `archivoRuta` on the `Extraccion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Extraccion" DROP COLUMN "archivoRuta",
ADD COLUMN     "archivoContenido" BYTEA;
