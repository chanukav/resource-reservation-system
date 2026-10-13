-- CreateIndex: Guarantee resource names are unique within each category
CREATE UNIQUE INDEX "resources_categoryId_name_key" ON "resources"("categoryId", "name");
