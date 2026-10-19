-- Review-only migration: NOT executed by this patch. No account grants are created.
BEGIN;
ALTER TABLE orbis_membership.maya_grants DROP CONSTRAINT maya_grants_capability_check;
ALTER TABLE orbis_membership.maya_grants ADD CONSTRAINT maya_grants_capability_check
 CHECK (capability IN ('general.chat','dream.analysis','astro.interpretation'));
COMMIT;
