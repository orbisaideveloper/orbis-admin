\set ON_ERROR_STOP on

\echo '=== ORBIS IDENTITY DISPOSABLE DATABASE VERIFICATION ==='
\echo '=== CATALOG CONTRACT ==='

DO $$
DECLARE
  n integer;
BEGIN
  SELECT count(*)
  INTO n
  FROM pg_namespace
  WHERE nspname = 'orbis_identity';

  IF n <> 1 THEN
    RAISE EXCEPTION
      'orbis_identity schema count %, expected 1', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_class c
  JOIN pg_namespace ns
    ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'orbis_identity'
    AND c.relkind = 'r';

  IF n <> 6 THEN
    RAISE EXCEPTION
      'ordinary table count %, expected 6', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_class c
  JOIN pg_namespace ns
    ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'orbis_identity'
    AND c.relkind = 'r'
    AND c.relname IN (
      'identities',
      'identifiers',
      'product_references',
      'identity_actions',
      'identity_audit_events',
      'merge_records'
    );

  IF n <> 6 THEN
    RAISE EXCEPTION
      'expected identity table count %, expected 6', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_class c
  JOIN pg_namespace ns
    ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'orbis_identity'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND c.relforcerowsecurity;

  IF n <> 6 THEN
    RAISE EXCEPTION
      'forced RLS table count %, expected 6', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_policies
  WHERE schemaname = 'orbis_identity';

  IF n <> 0 THEN
    RAISE EXCEPTION
      'browser-facing RLS policy count %, expected 0', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_proc p
  JOIN pg_namespace ns
    ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'orbis_identity';

  IF n <> 12 THEN
    RAISE EXCEPTION
      'function count %, expected 12', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_trigger t
  JOIN pg_class c
    ON c.oid = t.tgrelid
  JOIN pg_namespace ns
    ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'orbis_identity'
    AND NOT t.tgisinternal;

  IF n <> 13 THEN
    RAISE EXCEPTION
      'trigger count %, expected 13', n;
  END IF;
END
$$;

\echo 'CATALOG_COUNTS=PASS'

\echo '=== PUBLIC PRIVILEGE CONTRACT ==='

CREATE ROLE orbis_probe NOLOGIN;

DO $$
DECLARE
  n integer;
BEGIN
  IF has_schema_privilege(
    'orbis_probe',
    'orbis_identity',
    'USAGE'
  ) THEN
    RAISE EXCEPTION
      'PUBLIC-derived schema USAGE unexpectedly available';
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_class c
  JOIN pg_namespace ns
    ON ns.oid = c.relnamespace
  WHERE ns.nspname = 'orbis_identity'
    AND c.relkind = 'r'
    AND has_table_privilege(
      'orbis_probe',
      c.oid,
      'SELECT'
    );

  IF n <> 0 THEN
    RAISE EXCEPTION
      'PUBLIC-derived table SELECT privileges found: %', n;
  END IF;

  SELECT count(*)
  INTO n
  FROM pg_proc p
  JOIN pg_namespace ns
    ON ns.oid = p.pronamespace
  WHERE ns.nspname = 'orbis_identity'
    AND has_function_privilege(
      'orbis_probe',
      p.oid,
      'EXECUTE'
    );

  IF n <> 0 THEN
    RAISE EXCEPTION
      'PUBLIC-derived function EXECUTE privileges found: %', n;
  END IF;
END
$$;

DROP ROLE orbis_probe;

\echo 'PUBLIC_PRIVILEGES=PASS'

\echo '=== BEHAVIOR CONTRACT ==='

INSERT INTO orbis_identity.identities (
  orbis_identity_id,
  display_id,
  subject_kind,
  lifecycle,
  display_name
)
VALUES
(
  '00000000-0000-7000-8000-000000000001',
  'ORB-U-ABCDEFGH',
  'person',
  'active',
  'Target Person'
),
(
  '00000000-0000-7000-8000-000000000002',
  'ORB-U-JKMNPQRS',
  'person',
  'active',
  'Source Person'
),
(
  '00000000-0000-7000-8000-000000000003',
  'ORB-U-TUVWXYZ2',
  'person',
  'active',
  'Third Person'
);

INSERT INTO orbis_identity.identifiers (
  orbis_identifier_id,
  orbis_identity_id,
  kind,
  normalized_value,
  assurance,
  verified_at
)
VALUES (
  '00000000-0000-7000-8000-000000000010',
  '00000000-0000-7000-8000-000000000001',
  'email',
  'verified@example.test',
  'verified',
  now()
);

DO $$
BEGIN
  BEGIN
    INSERT INTO orbis_identity.identifiers (
      orbis_identifier_id,
      orbis_identity_id,
      kind,
      normalized_value,
      assurance,
      verified_at
    )
    VALUES (
      '00000000-0000-7000-8000-000000000011',
      '00000000-0000-7000-8000-000000000003',
      'email',
      'verified@example.test',
      'verified',
      now()
    );

    RAISE EXCEPTION
      'duplicate verified identifier was accepted';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;
END
$$;

\echo 'VERIFIED_IDENTIFIER_UNIQUENESS=PASS'

INSERT INTO orbis_identity.identity_actions (
  orbis_action_id,
  source_project_id,
  idempotency_key,
  action_kind,
  actor_kind,
  actor_reference
)
VALUES (
  '00000000-0000-7000-8000-000000000100',
  'disposable-validation',
  'request-100',
  'resolve_observation',
  'system',
  'migration-validator'
);

UPDATE orbis_identity.identity_actions
SET
  status = 'completed',
  completed_at = now(),
  resolved_orbis_identity_id =
    '00000000-0000-7000-8000-000000000001'
WHERE orbis_action_id =
  '00000000-0000-7000-8000-000000000100';

DO $$
BEGIN
  BEGIN
    UPDATE orbis_identity.identity_actions
    SET status = 'rejected'
    WHERE orbis_action_id =
      '00000000-0000-7000-8000-000000000100';

    RAISE EXCEPTION
      'completed action unexpectedly mutable';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <>
        'a completed identity action is immutable'
      THEN
        RAISE;
      END IF;
  END;
END
$$;

\echo 'TERMINAL_ACTION_IMMUTABILITY=PASS'

DO $$
BEGIN
  BEGIN
    UPDATE orbis_identity.identities
    SET display_id = 'ORB-U-23456789'
    WHERE orbis_identity_id =
      '00000000-0000-7000-8000-000000000001';

    RAISE EXCEPTION
      'display_id unexpectedly mutable';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'display_id is immutable' THEN
        RAISE;
      END IF;
  END;
END
$$;

\echo 'IDENTITY_KEY_IMMUTABILITY=PASS'

INSERT INTO orbis_identity.product_references (
  orbis_product_reference_id,
  orbis_identity_id,
  project_id,
  local_entity_type,
  local_entity_id,
  roles
)
VALUES (
  '00000000-0000-7000-8000-000000000200',
  '00000000-0000-7000-8000-000000000001',
  'orbis-foundation-test',
  'user',
  'local-user-1',
  ARRAY['member']
);

DO $$
BEGIN
  BEGIN
    DELETE FROM orbis_identity.product_references
    WHERE orbis_product_reference_id =
      '00000000-0000-7000-8000-000000000200';

    RAISE EXCEPTION
      'product reference physical delete was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <>
        'product references are never physically deleted'
      THEN
        RAISE;
      END IF;
  END;
END
$$;

\echo 'PRODUCT_REFERENCE_DELETE_GUARD=PASS'

INSERT INTO orbis_identity.identity_actions (
  orbis_action_id,
  source_project_id,
  idempotency_key,
  action_kind,
  actor_kind,
  actor_reference,
  status,
  resolved_orbis_identity_id,
  completed_at
)
VALUES (
  '00000000-0000-7000-8000-000000000300',
  'disposable-validation',
  'merge-request-300',
  'merge_identity',
  'system',
  'migration-validator',
  'completed',
  '00000000-0000-7000-8000-000000000001',
  now()
);

INSERT INTO orbis_identity.merge_records (
  orbis_merge_id,
  source_orbis_identity_id,
  target_orbis_identity_id,
  orbis_action_id,
  reason
)
VALUES (
  '00000000-0000-7000-8000-000000000301',
  '00000000-0000-7000-8000-000000000002',
  '00000000-0000-7000-8000-000000000001',
  '00000000-0000-7000-8000-000000000300',
  'Disposable validation merge'
);

INSERT INTO orbis_identity.identity_audit_events (
  orbis_identity_event_id,
  orbis_action_id,
  orbis_identity_id,
  event_kind,
  target_type,
  target_reference
)
VALUES (
  '00000000-0000-7000-8000-000000000302',
  '00000000-0000-7000-8000-000000000300',
  '00000000-0000-7000-8000-000000000002',
  'identity_merged',
  'identity',
  '00000000-0000-7000-8000-000000000001'
);

UPDATE orbis_identity.identities
SET
  lifecycle = 'merged',
  merged_into_orbis_identity_id =
    '00000000-0000-7000-8000-000000000001'
WHERE orbis_identity_id =
  '00000000-0000-7000-8000-000000000002';

DO $$
BEGIN
  BEGIN
    UPDATE orbis_identity.identities
    SET
      lifecycle = 'active',
      merged_into_orbis_identity_id = NULL
    WHERE orbis_identity_id =
      '00000000-0000-7000-8000-000000000002';

    RAISE EXCEPTION
      'merged identity restoration was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <>
        'a merged identity cannot be restored in place'
      THEN
        RAISE;
      END IF;
  END;
END
$$;

\echo 'MERGE_EVIDENCE_AND_REDIRECT_GUARD=PASS'

DO $$
BEGIN
  BEGIN
    UPDATE orbis_identity.identity_audit_events
    SET event_details = '{"changed":true}'::jsonb
    WHERE orbis_identity_event_id =
      '00000000-0000-7000-8000-000000000302';

    RAISE EXCEPTION
      'audit event mutation was accepted';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <>
        'identity audit events are append-only'
      THEN
        RAISE;
      END IF;
  END;
END
$$;

\echo 'AUDIT_APPEND_ONLY=PASS'

SELECT
  (SELECT count(*)
   FROM orbis_identity.identities) AS identities,
  (SELECT count(*)
   FROM orbis_identity.identifiers) AS identifiers,
  (SELECT count(*)
   FROM orbis_identity.product_references) AS product_references,
  (SELECT count(*)
   FROM orbis_identity.identity_actions) AS identity_actions,
  (SELECT count(*)
   FROM orbis_identity.identity_audit_events) AS audit_events,
  (SELECT count(*)
   FROM orbis_identity.merge_records) AS merge_records;

\echo 'DISPOSABLE_SQL_VERIFICATION=PASS'
