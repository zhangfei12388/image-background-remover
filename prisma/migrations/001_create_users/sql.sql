-- Create users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "picture" TEXT,
    "googleId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "users_email_key" UNIQUE ("email"),
    CONSTRAINT "users_googleId_key" UNIQUE ("googleId")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_googleId_idx" ON "users"("googleId");
