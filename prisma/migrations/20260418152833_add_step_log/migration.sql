-- CreateTable
CREATE TABLE "StepLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steps" INTEGER NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StepLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StepLog" ADD CONSTRAINT "StepLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
