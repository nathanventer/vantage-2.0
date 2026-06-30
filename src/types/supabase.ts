/**
 * Supabase Database types for project qzckmlhaoehsngxjlgfk (public schema).
 *
 * Generated from the canonical Phase-1 schema + additive Phase-2 migrations.
 * Regenerate when the live schema changes:
 *   bun run types:gen   (requires `supabase login`)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_id?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      companies: {
        Row: {
          id: string;
          name: string;
          type: string;
          registration_number: string | null;
          vat_number: string | null;
          sars_customs_code: string | null;
          sars_clearing_code: string | null;
          country: string | null;
          city: string | null;
          contact_person: string | null;
          contact_email: string | null;
          contact_phone: string | null;
          fleet_size: number | null;
          warehouse_capacity_sqm: number | null;
          service_categories: string[] | null;
          approval_status: string;
          approved_at: string | null;
          verification_checklist: Json;
          rejection_reason: string | null;
          source_override_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["companies"]["Row"]> & {
          name: string;
          type: string;
        };
        Update: Partial<Database["public"]["Tables"]["companies"]["Insert"]>;
        Relationships: [];
      };
      compliance_documents: {
        Row: {
          id: string;
          company_id: string;
          doc_type: string;
          verification_status: string;
          verified_at: string | null;
          file_path: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          doc_type: string;
          verification_status?: string;
          verified_at?: string | null;
          file_path?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["compliance_documents"]["Insert"]>;
        Relationships: [];
      };
      data_subject_requests: {
        Row: {
          id: string;
          user_id: string;
          request_type: string;
          reason: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          request_type: string;
          reason?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["data_subject_requests"]["Insert"]>;
        Relationships: [];
      };
      lane_rates: {
        Row: {
          id: string;
          rate_card_id: string | null;
          provider_company_id: string | null;
          provider_name: string;
          origin: string;
          destination: string;
          mode: string;
          period: string;
          price: number;
          currency: string;
          transit_days: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lane_rates"]["Row"]> & {
          provider_name: string;
          origin: string;
          destination: string;
          mode: string;
          period: string;
          price: number;
        };
        Update: Partial<Database["public"]["Tables"]["lane_rates"]["Insert"]>;
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          prefs: Json;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          prefs?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["notification_preferences"]["Insert"]>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          title: string;
          body: string | null;
          kind: string;
          link: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          title: string;
          kind: string;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
        Relationships: [];
      };
      popia_consents: {
        Row: {
          id: string;
          user_id: string;
          consent_type: string;
          granted: boolean;
          policy_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          consent_type: string;
          granted: boolean;
          policy_version: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["popia_consents"]["Insert"]>;
        Relationships: [];
      };
      price_alerts: {
        Row: {
          id: string;
          user_id: string;
          lane: string;
          mode: string;
          threshold: number;
          direction: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["price_alerts"]["Row"]> & {
          user_id: string;
          lane: string;
          mode: string;
          threshold: number;
          direction: string;
        };
        Update: Partial<Database["public"]["Tables"]["price_alerts"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string;
          status: string;
          company_id: string | null;
          onboarding_step: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      quotes: {
        Row: {
          id: string;
          reference: string | null;
          shipment_id: string;
          source_company_id: string;
          freight_cost: number | null;
          customs_cost: number | null;
          warehouse_cost: number | null;
          transport_cost: number | null;
          other_cost: number | null;
          vat_amount: number | null;
          total: number | null;
          estimated_transit_days: number | null;
          cost_score: number | null;
          service_score: number | null;
          compliance_score: number | null;
          capacity_score: number | null;
          risk_score: number | null;
          total_score: number | null;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["quotes"]["Row"]> & {
          shipment_id: string;
          source_company_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["quotes"]["Insert"]>;
        Relationships: [];
      };
      rate_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_end: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["rate_subscriptions"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["rate_subscriptions"]["Insert"]>;
        Relationships: [];
      };
      ref_sequences: {
        Row: { prefix: string; last_value: number };
        Insert: { prefix: string; last_value?: number };
        Update: Partial<Database["public"]["Tables"]["ref_sequences"]["Insert"]>;
        Relationships: [];
      };
      shipment_documents: {
        Row: {
          id: string;
          shipment_id: string | null;
          doc_type: string;
          reference: string | null;
          status: string;
          version: number;
          payload: Json | null;
          file_path: string | null;
          signature_token: string | null;
          signed_by: string | null;
          signed_at: string | null;
          generated_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shipment_documents"]["Row"]> & {
          doc_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_documents"]["Insert"]>;
        Relationships: [];
      };
      shipment_events: {
        Row: {
          id: string;
          shipment_id: string;
          event_type: string;
          step: number | null;
          note: string | null;
          payload: Json | null;
          trip_ref: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shipment_events"]["Row"]> & {
          shipment_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipment_events"]["Insert"]>;
        Relationships: [];
      };
      shipments: {
        Row: {
          id: string;
          reference: string;
          demand_company_id: string;
          source_company_id: string | null;
          created_by: string | null;
          shipment_type: string | null;
          currency: string | null;
          origin_port: string | null;
          destination_port: string | null;
          final_delivery_location: string | null;
          container_type: string | null;
          cargo_description: string | null;
          cargo_value: number | null;
          weight_kg: number | null;
          status: string;
          current_step: number;
          source_override_reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["shipments"]["Row"]> & {
          reference: string;
          demand_company_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["shipments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_ref: { Args: { p_prefix: string }; Returns: string };
      match_providers_for_shipment: { Args: { p_shipment_id: string }; Returns: number };
      select_shipment_quote: {
        Args: { p_shipment_id: string; p_quote_id: string; p_override_reason?: string | null };
        Returns: undefined;
      };
      is_admin: { Args: Record<string, never>; Returns: boolean };
      my_company: { Args: Record<string, never>; Returns: string };
      has_active_pulse: { Args: Record<string, never>; Returns: boolean };
      pulse_executive_summary: { Args: Record<string, never>; Returns: Json };
      pulse_transit_trend: { Args: Record<string, never>; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
