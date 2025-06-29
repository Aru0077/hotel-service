/*
  Warnings:

  - The values [MERCHANT,USER] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - The values [BANNED,PENDING_VERIFICATION] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `hotels` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `amenities` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `businessLicense` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `checkInTime` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `checkOutTime` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `contactPerson` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `hotelEmail` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `hotelPhone` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `hotelType` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `isOnline` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `merchantId` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `starRating` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `verificationStatus` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedAt` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `zipCode` on the `hotels` table. All the data in the column will be lost.
  - The `id` column on the `hotels` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `address` on the `hotels` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - The `facilities` column on the `hotels` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `facebookId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `users` table. All the data in the column will be lost.
  - The `id` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `guest_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_methods` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_profiles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `verification_codes` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[uuid]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contact_phone` to the `hotels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hotel_name` to the `hotels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `hotels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `hotels` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - The required column `uuid` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('PHONE', 'FACEBOOK', 'PASSWORD', 'EMAIL');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('CLIENT', 'BUSINESS', 'ADMIN');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING');
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "UserStatus_old";
ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "guest_profiles" DROP CONSTRAINT "guest_profiles_userProfileId_fkey";

-- DropForeignKey
ALTER TABLE "hotels" DROP CONSTRAINT "hotels_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "payment_methods" DROP CONSTRAINT "payment_methods_userProfileId_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_userId_fkey";

-- DropIndex
DROP INDEX "hotels_merchantId_idx";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "users_facebookId_key";

-- DropIndex
DROP INDEX "users_phone_key";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "hotels" DROP CONSTRAINT "hotels_pkey",
DROP COLUMN "amenities",
DROP COLUMN "businessLicense",
DROP COLUMN "checkInTime",
DROP COLUMN "checkOutTime",
DROP COLUMN "city",
DROP COLUMN "contactPerson",
DROP COLUMN "contactPhone",
DROP COLUMN "createdAt",
DROP COLUMN "district",
DROP COLUMN "hotelEmail",
DROP COLUMN "hotelPhone",
DROP COLUMN "hotelType",
DROP COLUMN "isActive",
DROP COLUMN "isOnline",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "merchantId",
DROP COLUMN "name",
DROP COLUMN "province",
DROP COLUMN "rejectionReason",
DROP COLUMN "starRating",
DROP COLUMN "updatedAt",
DROP COLUMN "verificationStatus",
DROP COLUMN "verifiedAt",
DROP COLUMN "website",
DROP COLUMN "zipCode",
ADD COLUMN     "bank_account" VARCHAR(50),
ADD COLUMN     "business_license" VARCHAR(255),
ADD COLUMN     "check_in_time" VARCHAR(10),
ADD COLUMN     "check_out_time" VARCHAR(10),
ADD COLUMN     "company_name" VARCHAR(100),
ADD COLUMN     "contact_phone" VARCHAR(20) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" VARCHAR(100),
ADD COLUMN     "hotel_name" VARCHAR(100) NOT NULL,
ADD COLUMN     "star_rating" SMALLINT,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "address" SET DATA TYPE VARCHAR(255),
DROP COLUMN "facilities",
ADD COLUMN     "facilities" JSONB,
ADD CONSTRAINT "hotels_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "emailVerified",
DROP COLUMN "facebookId",
DROP COLUMN "lastLoginAt",
DROP COLUMN "password",
DROP COLUMN "phone",
DROP COLUMN "phoneVerified",
DROP COLUMN "updatedAt",
DROP COLUMN "username",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "uuid" CHAR(36) NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "guest_profiles";

-- DropTable
DROP TABLE "payment_methods";

-- DropTable
DROP TABLE "refresh_tokens";

-- DropTable
DROP TABLE "user_profiles";

-- DropTable
DROP TABLE "verification_codes";

-- DropEnum
DROP TYPE "Gender";

-- DropEnum
DROP TYPE "HotelVerificationStatus";

-- DropEnum
DROP TYPE "VerificationCodeType";

-- DropEnum
DROP TYPE "VerificationPurpose";

-- CreateTable
CREATE TABLE "auth_credentials" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "auth_type" "AuthType" NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "credential" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_profiles" (
    "user_id" INTEGER NOT NULL,
    "facebook_id" VARCHAR(100) NOT NULL,
    "full_name" VARCHAR(50),
    "avatar" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "email" VARCHAR(100),

    CONSTRAINT "client_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "admin_profiles" (
    "user_id" INTEGER NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "department" VARCHAR(50),
    "permissions" JSONB,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "auth_credentials_user_id_idx" ON "auth_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_credentials_auth_type_identifier_key" ON "auth_credentials"("auth_type", "identifier");

-- CreateIndex
CREATE UNIQUE INDEX "client_profiles_facebook_id_key" ON "client_profiles"("facebook_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_username_key" ON "admin_profiles"("username");

-- CreateIndex
CREATE INDEX "hotels_user_id_idx" ON "hotels"("user_id");

-- CreateIndex
CREATE INDEX "hotels_contact_phone_idx" ON "hotels"("contact_phone");

-- CreateIndex
CREATE INDEX "hotels_hotel_name_idx" ON "hotels"("hotel_name");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- AddForeignKey
ALTER TABLE "auth_credentials" ADD CONSTRAINT "auth_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_profiles" ADD CONSTRAINT "client_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
