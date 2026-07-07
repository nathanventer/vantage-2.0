-- The client document system distinguishes Proof of Delivery from Delivery Note,
-- but the doc_type enum lacked the value — recordPOD would fail at runtime.
-- Applied to live via MCP as `demo_doc_type_proof_of_delivery`.
alter type public.doc_type add value if not exists 'proof_of_delivery';
