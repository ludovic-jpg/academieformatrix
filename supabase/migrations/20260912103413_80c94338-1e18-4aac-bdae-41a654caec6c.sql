
CREATE POLICY "Pieces: lecture proprietaire ou admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pieces' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Pieces: depot proprietaire" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pieces' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Pieces: suppression proprietaire" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pieces' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Coffre: lecture proprietaire" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'coffre' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Coffre: depot proprietaire" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'coffre' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Coffre: suppression proprietaire" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'coffre' AND (storage.foldername(name))[1] = auth.uid()::text);
