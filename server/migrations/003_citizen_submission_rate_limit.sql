CREATE INDEX citizen_submissions_entity_email_created_at
  ON citizen_submissions (entity_id, LOWER(email), created_at DESC);
