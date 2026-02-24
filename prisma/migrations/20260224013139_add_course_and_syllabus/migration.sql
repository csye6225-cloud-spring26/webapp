-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "department_code" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "credit_hours" INTEGER NOT NULL,
    "classification" TEXT NOT NULL,
    "description" VARCHAR(2000),
    "prerequisites" VARCHAR(512),
    "has_syllabus" BOOLEAN NOT NULL DEFAULT false,
    "date_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabi" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "s3_bucket_name" TEXT NOT NULL,
    "s3_object_key" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "date_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_updated" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "syllabi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "courses_department_code_number_key" ON "courses"("department_code", "number");

-- CreateIndex
CREATE UNIQUE INDEX "syllabi_course_id_key" ON "syllabi"("course_id");

-- AddForeignKey
ALTER TABLE "syllabi" ADD CONSTRAINT "syllabi_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
