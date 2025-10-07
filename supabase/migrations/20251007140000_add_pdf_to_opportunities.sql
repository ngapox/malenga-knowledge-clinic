-- Adds a column to store the PDF URL
ALTER TABLE public.opportunities
ADD COLUMN pdf_url TEXT;

-- Create a policy to allow public access to the files in the new bucket
CREATE POLICY "Public can view opportunity PDFs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING ( bucket_id = 'opportunity_pdfs' );

-- Create a policy to allow admins to upload, update, and delete PDFs
-- --- 👇 THIS IS THE CORRECTED PART 👇 ---
CREATE POLICY "Admins can manage opportunity PDFs"
ON storage.objects FOR ALL -- Use ALL instead of INSERT, UPDATE, DELETE
TO authenticated
WITH CHECK (
  bucket_id = 'opportunity_pdfs' AND
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = TRUE
);