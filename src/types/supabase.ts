export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          after: Json | null;
          before: Json | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          after?: Json | null;
          before?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: never;
        };
        Relationships: [];
      };
      bank_accounts: {
        Row: {
          account_number: string | null;
          account_type: string | null;
          bank_name: string | null;
          branch_code: string | null;
          company_id: string;
          id: string;
          verified: boolean;
        };
        Insert: {
          account_number?: string | null;
          account_type?: string | null;
          bank_name?: string | null;
          branch_code?: string | null;
          company_id: string;
          id?: string;
          verified?: boolean;
        };
        Update: {
          account_number?: string | null;
          account_type?: string | null;
          bank_name?: string | null;
          branch_code?: string | null;
          company_id?: string;
          id?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      cargo_handling: {
        Row: {
          client_company_id: string | null;
          condition: string;
          created_at: string;
          handled_at: string;
          id: string;
          operation: string;
          provider_company_id: string | null;
          reference: string;
          shipment_id: string | null;
          weight_kg: number;
        };
        Insert: {
          client_company_id?: string | null;
          condition?: string;
          created_at?: string;
          handled_at?: string;
          id?: string;
          operation: string;
          provider_company_id?: string | null;
          reference: string;
          shipment_id?: string | null;
          weight_kg?: number;
        };
        Update: {
          client_company_id?: string | null;
          condition?: string;
          created_at?: string;
          handled_at?: string;
          id?: string;
          operation?: string;
          provider_company_id?: string | null;
          reference?: string;
          shipment_id?: string | null;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cargo_handling_client_company_id_fkey";
            columns: ["client_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cargo_handling_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cargo_handling_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          address: string | null;
          approval_notes: string | null;
          approval_status: Database["public"]["Enums"]["approval_status"];
          approved_at: string | null;
          approved_by: string | null;
          capacity: string | null;
          city: string | null;
          contact_email: string | null;
          contact_person: string | null;
          contact_phone: string | null;
          country: string | null;
          created_at: string;
          fleet_size: number | null;
          id: string;
          name: string;
          registration_number: string | null;
          rejection_reason: string | null;
          risk_rating: string | null;
          route_coverage: string[] | null;
          sars_clearing_code: string | null;
          sars_customs_code: string | null;
          service_categories: string[] | null;
          type: Database["public"]["Enums"]["company_type"];
          updated_at: string;
          vat_number: string | null;
          verification_checklist: Json;
          warehouse_capacity_sqm: number | null;
        };
        Insert: {
          address?: string | null;
          approval_notes?: string | null;
          approval_status?: Database["public"]["Enums"]["approval_status"];
          approved_at?: string | null;
          approved_by?: string | null;
          capacity?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          country?: string | null;
          created_at?: string;
          fleet_size?: number | null;
          id?: string;
          name: string;
          registration_number?: string | null;
          rejection_reason?: string | null;
          risk_rating?: string | null;
          route_coverage?: string[] | null;
          sars_clearing_code?: string | null;
          sars_customs_code?: string | null;
          service_categories?: string[] | null;
          type: Database["public"]["Enums"]["company_type"];
          updated_at?: string;
          vat_number?: string | null;
          verification_checklist?: Json;
          warehouse_capacity_sqm?: number | null;
        };
        Update: {
          address?: string | null;
          approval_notes?: string | null;
          approval_status?: Database["public"]["Enums"]["approval_status"];
          approved_at?: string | null;
          approved_by?: string | null;
          capacity?: string | null;
          city?: string | null;
          contact_email?: string | null;
          contact_person?: string | null;
          contact_phone?: string | null;
          country?: string | null;
          created_at?: string;
          fleet_size?: number | null;
          id?: string;
          name?: string;
          registration_number?: string | null;
          rejection_reason?: string | null;
          risk_rating?: string | null;
          route_coverage?: string[] | null;
          sars_clearing_code?: string | null;
          sars_customs_code?: string | null;
          service_categories?: string[] | null;
          type?: Database["public"]["Enums"]["company_type"];
          updated_at?: string;
          vat_number?: string | null;
          verification_checklist?: Json;
          warehouse_capacity_sqm?: number | null;
        };
        Relationships: [];
      };
      company_documents: {
        Row: {
          company_id: string;
          doc_type: string;
          file_path: string | null;
          id: string;
          notes: string | null;
          uploaded_at: string;
          verified_by: string | null;
        };
        Insert: {
          company_id: string;
          doc_type: string;
          file_path?: string | null;
          id?: string;
          notes?: string | null;
          uploaded_at?: string;
          verified_by?: string | null;
        };
        Update: {
          company_id?: string;
          doc_type?: string;
          file_path?: string | null;
          id?: string;
          notes?: string | null;
          uploaded_at?: string;
          verified_by?: string | null;
        };
        Relationships: [];
      };
      company_services: {
        Row: {
          company_id: string;
          id: string;
          relation: Database["public"]["Enums"]["service_relation"];
          service_id: string;
        };
        Insert: {
          company_id: string;
          id?: string;
          relation: Database["public"]["Enums"]["service_relation"];
          service_id: string;
        };
        Update: {
          company_id?: string;
          id?: string;
          relation?: Database["public"]["Enums"]["service_relation"];
          service_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_services_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_documents: {
        Row: {
          company_id: string;
          created_at: string;
          doc_type: Database["public"]["Enums"]["compliance_doc_type"];
          file_path: string | null;
          id: string;
          notes: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          doc_type: Database["public"]["Enums"]["compliance_doc_type"];
          file_path?: string | null;
          id?: string;
          notes?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          doc_type?: Database["public"]["Enums"]["compliance_doc_type"];
          file_path?: string | null;
          id?: string;
          notes?: string | null;
          verification_status?: Database["public"]["Enums"]["verification_status"];
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "compliance_documents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      compliance_flags: {
        Row: {
          area: string;
          entity_company_id: string | null;
          entity_label: string;
          id: string;
          noted_at: string;
          notes: string | null;
          resolved_at: string | null;
          severity: string;
          status: string;
        };
        Insert: {
          area: string;
          entity_company_id?: string | null;
          entity_label: string;
          id?: string;
          noted_at?: string;
          notes?: string | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
        };
        Update: {
          area?: string;
          entity_company_id?: string | null;
          entity_label?: string;
          id?: string;
          noted_at?: string;
          notes?: string | null;
          resolved_at?: string | null;
          severity?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "compliance_flags_entity_company_id_fkey";
            columns: ["entity_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      container_jobs: {
        Row: {
          client_company_id: string | null;
          container_no: string;
          created_at: string;
          damage: boolean;
          dwell_days: number;
          id: string;
          job_type: string;
          provider_company_id: string | null;
          shipment_id: string | null;
          status: string;
          updated_at: string;
          vessel: string | null;
        };
        Insert: {
          client_company_id?: string | null;
          container_no: string;
          created_at?: string;
          damage?: boolean;
          dwell_days?: number;
          id?: string;
          job_type: string;
          provider_company_id?: string | null;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          vessel?: string | null;
        };
        Update: {
          client_company_id?: string | null;
          container_no?: string;
          created_at?: string;
          damage?: boolean;
          dwell_days?: number;
          id?: string;
          job_type?: string;
          provider_company_id?: string | null;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          vessel?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "container_jobs_client_company_id_fkey";
            columns: ["client_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_jobs_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "container_jobs_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      data_subject_requests: {
        Row: {
          created_at: string;
          id: string;
          reason: string | null;
          request_type: string;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          request_type: string;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          reason?: string | null;
          request_type?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      directors: {
        Row: {
          company_id: string;
          full_name: string;
          id: string;
          id_number: string | null;
          verified: boolean;
        };
        Insert: {
          company_id: string;
          full_name: string;
          id?: string;
          id_number?: string | null;
          verified?: boolean;
        };
        Update: {
          company_id?: string;
          full_name?: string;
          id?: string;
          id_number?: string | null;
          verified?: boolean;
        };
        Relationships: [];
      };
      invoices: {
        Row: {
          amount_cents: number;
          client_company_id: string;
          created_at: string;
          due_at: string | null;
          id: string;
          issued_at: string;
          number: string;
          provider_company_id: string | null;
          shipment_id: string | null;
          status: string;
          transaction_ref: string | null;
          updated_at: string;
        };
        Insert: {
          amount_cents?: number;
          client_company_id: string;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          issued_at?: string;
          number: string;
          provider_company_id?: string | null;
          shipment_id?: string | null;
          status?: string;
          transaction_ref?: string | null;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          client_company_id?: string;
          created_at?: string;
          due_at?: string | null;
          id?: string;
          issued_at?: string;
          number?: string;
          provider_company_id?: string | null;
          shipment_id?: string | null;
          status?: string;
          transaction_ref?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_client_company_id_fkey";
            columns: ["client_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      lane_rates: {
        Row: {
          created_at: string;
          currency: string;
          destination: string;
          id: string;
          mode: string;
          origin: string;
          period: string;
          price: number;
          provider_company_id: string | null;
          provider_name: string;
          rate_card_id: string | null;
          transit_days: number | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          destination: string;
          id?: string;
          mode: string;
          origin: string;
          period: string;
          price: number;
          provider_company_id?: string | null;
          provider_name: string;
          rate_card_id?: string | null;
          transit_days?: number | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          destination?: string;
          id?: string;
          mode?: string;
          origin?: string;
          period?: string;
          price?: number;
          provider_company_id?: string | null;
          provider_name?: string;
          rate_card_id?: string | null;
          transit_days?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "lane_rates_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lane_rates_rate_card_id_fkey";
            columns: ["rate_card_id"];
            isOneToOne: false;
            referencedRelation: "rate_cards";
            referencedColumns: ["id"];
          },
        ];
      };
      market_benchmarks: {
        Row: {
          created_at: string;
          high_price: number;
          id: string;
          lane: string;
          low_price: number;
          median_price: number;
          mode: string;
          period: string;
          samples: number;
        };
        Insert: {
          created_at?: string;
          high_price: number;
          id?: string;
          lane: string;
          low_price: number;
          median_price: number;
          mode: string;
          period: string;
          samples?: number;
        };
        Update: {
          created_at?: string;
          high_price?: number;
          id?: string;
          lane?: string;
          low_price?: number;
          median_price?: number;
          mode?: string;
          period?: string;
          samples?: number;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          prefs: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          prefs?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          prefs?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          dedup_key: string | null;
          id: string;
          kind: string;
          link: string | null;
          metadata: Json;
          read: boolean;
          read_at: string | null;
          sender_id: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          dedup_key?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          metadata?: Json;
          read?: boolean;
          read_at?: string | null;
          sender_id?: string | null;
          title: string;
          type?: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          dedup_key?: string | null;
          id?: string;
          kind?: string;
          link?: string | null;
          metadata?: Json;
          read?: boolean;
          read_at?: string | null;
          sender_id?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          gateway_ref: string | null;
          gateway_status: string;
          id: string;
          invoice_id: string | null;
          invoice_number: string | null;
          method: string;
          settled_at: string | null;
        };
        Insert: {
          amount_cents?: number;
          created_at?: string;
          gateway_ref?: string | null;
          gateway_status?: string;
          id?: string;
          invoice_id?: string | null;
          invoice_number?: string | null;
          method?: string;
          settled_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          gateway_ref?: string | null;
          gateway_status?: string;
          id?: string;
          invoice_id?: string | null;
          invoice_number?: string | null;
          method?: string;
          settled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
        ];
      };
      popia_consents: {
        Row: {
          company_id: string | null;
          consent_type: string;
          created_at: string;
          granted: boolean;
          id: string;
          ip_address: string | null;
          policy_version: string;
          user_id: string | null;
        };
        Insert: {
          company_id?: string | null;
          consent_type: string;
          created_at?: string;
          granted: boolean;
          id?: string;
          ip_address?: string | null;
          policy_version?: string;
          user_id?: string | null;
        };
        Update: {
          company_id?: string | null;
          consent_type?: string;
          created_at?: string;
          granted?: boolean;
          id?: string;
          ip_address?: string | null;
          policy_version?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "popia_consents_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "popia_consents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      price_alerts: {
        Row: {
          created_at: string;
          direction: string;
          id: string;
          lane: string;
          mode: string;
          threshold: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          direction: string;
          id?: string;
          lane: string;
          mode: string;
          threshold: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          direction?: string;
          id?: string;
          lane?: string;
          mode?: string;
          threshold?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          company_id: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          onboarding_step: number;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          status: string;
          updated_at: string;
        };
        Insert: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          onboarding_step?: number;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          onboarding_step?: number;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          capacity_score: number | null;
          compliance_score: number | null;
          cost_score: number | null;
          created_at: string;
          customs_cost: number | null;
          estimated_transit_days: number | null;
          freight_cost: number | null;
          id: string;
          other_cost: number | null;
          reference: string;
          rejected_at: string | null;
          rejected_by: string | null;
          rejection_reason: string | null;
          risk_score: number | null;
          service_score: number | null;
          shipment_id: string;
          source_company_id: string;
          status: Database["public"]["Enums"]["quote_status"];
          total: number | null;
          total_score: number | null;
          transport_cost: number | null;
          validity_date: string | null;
          vat_amount: number | null;
          warehouse_cost: number | null;
        };
        Insert: {
          capacity_score?: number | null;
          compliance_score?: number | null;
          cost_score?: number | null;
          created_at?: string;
          customs_cost?: number | null;
          estimated_transit_days?: number | null;
          freight_cost?: number | null;
          id?: string;
          other_cost?: number | null;
          reference: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          risk_score?: number | null;
          service_score?: number | null;
          shipment_id: string;
          source_company_id: string;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number | null;
          total_score?: number | null;
          transport_cost?: number | null;
          validity_date?: string | null;
          vat_amount?: number | null;
          warehouse_cost?: number | null;
        };
        Update: {
          capacity_score?: number | null;
          compliance_score?: number | null;
          cost_score?: number | null;
          created_at?: string;
          customs_cost?: number | null;
          estimated_transit_days?: number | null;
          freight_cost?: number | null;
          id?: string;
          other_cost?: number | null;
          reference?: string;
          rejected_at?: string | null;
          rejected_by?: string | null;
          rejection_reason?: string | null;
          risk_score?: number | null;
          service_score?: number | null;
          shipment_id?: string;
          source_company_id?: string;
          status?: Database["public"]["Enums"]["quote_status"];
          total?: number | null;
          total_score?: number | null;
          transport_cost?: number | null;
          validity_date?: string | null;
          vat_amount?: number | null;
          warehouse_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_source_company_id_fkey";
            columns: ["source_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_cards: {
        Row: {
          created_at: string;
          currency: string;
          id: string;
          name: string;
          provider_company_id: string | null;
          valid_from: string | null;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          id?: string;
          name: string;
          provider_company_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string;
          currency?: string;
          id?: string;
          name?: string;
          provider_company_id?: string | null;
          valid_from?: string | null;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rate_cards_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      ref_sequences: {
        Row: {
          last_value: number;
          prefix: string;
        };
        Insert: {
          last_value?: number;
          prefix: string;
        };
        Update: {
          last_value?: number;
          prefix?: string;
        };
        Relationships: [];
      };
      sars_verifications: {
        Row: {
          created_at: string;
          declaration_ref: string | null;
          id: string;
          notes: string | null;
          shipment_id: string;
          status: Database["public"]["Enums"]["sars_status"];
          verified_at: string | null;
        };
        Insert: {
          created_at?: string;
          declaration_ref?: string | null;
          id?: string;
          notes?: string | null;
          shipment_id: string;
          status?: Database["public"]["Enums"]["sars_status"];
          verified_at?: string | null;
        };
        Update: {
          created_at?: string;
          declaration_ref?: string | null;
          id?: string;
          notes?: string | null;
          shipment_id?: string;
          status?: Database["public"]["Enums"]["sars_status"];
          verified_at?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          category: string;
          id: string;
          name: string;
        };
        Insert: {
          category: string;
          id?: string;
          name: string;
        };
        Update: {
          category?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      shipment_bids: {
        Row: {
          amount: number;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          id: string;
          lead_time_days: number | null;
          notes: string | null;
          shipment_id: string;
          source_company_id: string;
          status: Database["public"]["Enums"]["bid_status"];
        };
        Insert: {
          amount: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          id?: string;
          lead_time_days?: number | null;
          notes?: string | null;
          shipment_id: string;
          source_company_id: string;
          status?: Database["public"]["Enums"]["bid_status"];
        };
        Update: {
          amount?: number;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          id?: string;
          lead_time_days?: number | null;
          notes?: string | null;
          shipment_id?: string;
          source_company_id?: string;
          status?: Database["public"]["Enums"]["bid_status"];
        };
        Relationships: [];
      };
      shipment_documents: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          file_path: string | null;
          generated_by: string | null;
          id: string;
          payload: Json | null;
          reference: string | null;
          shipment_id: string;
          signature_token: string | null;
          signed_at: string | null;
          signed_by: string | null;
          status: Database["public"]["Enums"]["doc_status"];
          version: number;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          doc_type: Database["public"]["Enums"]["doc_type"];
          file_path?: string | null;
          generated_by?: string | null;
          id?: string;
          payload?: Json | null;
          reference?: string | null;
          shipment_id: string;
          signature_token?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          status?: Database["public"]["Enums"]["doc_status"];
          version?: number;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          doc_type?: Database["public"]["Enums"]["doc_type"];
          file_path?: string | null;
          generated_by?: string | null;
          id?: string;
          payload?: Json | null;
          reference?: string | null;
          shipment_id?: string;
          signature_token?: string | null;
          signed_at?: string | null;
          signed_by?: string | null;
          status?: Database["public"]["Enums"]["doc_status"];
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "shipment_documents_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_documents_generated_by_fkey";
            columns: ["generated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipment_documents_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      shipment_events: {
        Row: {
          created_at: string;
          created_by: string | null;
          event_type: string;
          id: string;
          location: string | null;
          note: string | null;
          notes: string | null;
          payload: Json | null;
          shipment_id: string;
          step: number | null;
          trip_ref: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          event_type: string;
          id?: string;
          location?: string | null;
          note?: string | null;
          notes?: string | null;
          payload?: Json | null;
          shipment_id: string;
          step?: number | null;
          trip_ref?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          event_type?: string;
          id?: string;
          location?: string | null;
          note?: string | null;
          notes?: string | null;
          payload?: Json | null;
          shipment_id?: string;
          step?: number | null;
          trip_ref?: string | null;
        };
        Relationships: [];
      };
      shipments: {
        Row: {
          budget: number | null;
          cargo_description: string | null;
          cargo_value: number | null;
          container_type: string | null;
          created_at: string;
          created_by: string | null;
          currency: string | null;
          current_step: number;
          demand_company_id: string;
          destination_port: string | null;
          final_delivery_location: string | null;
          id: string;
          notes: string | null;
          origin_port: string | null;
          quantity: number | null;
          reference: string;
          required_date: string | null;
          required_services: string[] | null;
          shipment_type: string | null;
          source_company_id: string | null;
          source_override_reason: string | null;
          special_handling: string | null;
          status: Database["public"]["Enums"]["shipment_status"];
          updated_at: string;
          weight_kg: number | null;
        };
        Insert: {
          budget?: number | null;
          cargo_description?: string | null;
          cargo_value?: number | null;
          container_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          current_step?: number;
          demand_company_id: string;
          destination_port?: string | null;
          final_delivery_location?: string | null;
          id?: string;
          notes?: string | null;
          origin_port?: string | null;
          quantity?: number | null;
          reference: string;
          required_date?: string | null;
          required_services?: string[] | null;
          shipment_type?: string | null;
          source_company_id?: string | null;
          source_override_reason?: string | null;
          special_handling?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          updated_at?: string;
          weight_kg?: number | null;
        };
        Update: {
          budget?: number | null;
          cargo_description?: string | null;
          cargo_value?: number | null;
          container_type?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string | null;
          current_step?: number;
          demand_company_id?: string;
          destination_port?: string | null;
          final_delivery_location?: string | null;
          id?: string;
          notes?: string | null;
          origin_port?: string | null;
          quantity?: number | null;
          reference?: string;
          required_date?: string | null;
          required_services?: string[] | null;
          shipment_type?: string | null;
          source_company_id?: string | null;
          source_override_reason?: string | null;
          special_handling?: string | null;
          status?: Database["public"]["Enums"]["shipment_status"];
          updated_at?: string;
          weight_kg?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "shipments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_demand_company_id_fkey";
            columns: ["demand_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shipments_source_company_id_fkey";
            columns: ["source_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      transaction_documents: {
        Row: {
          created_at: string;
          doc_type: string;
          file_path: string | null;
          id: string;
          shipment_id: string;
          signed: boolean;
          uploaded_by: string | null;
          version: number;
        };
        Insert: {
          created_at?: string;
          doc_type: string;
          file_path?: string | null;
          id?: string;
          shipment_id: string;
          signed?: boolean;
          uploaded_by?: string | null;
          version?: number;
        };
        Update: {
          created_at?: string;
          doc_type?: string;
          file_path?: string | null;
          id?: string;
          shipment_id?: string;
          signed?: boolean;
          uploaded_by?: string | null;
          version?: number;
        };
        Relationships: [];
      };
      transport_jobs: {
        Row: {
          created_at: string;
          delivered_at: string | null;
          driver_name: string | null;
          id: string;
          pod_file_path: string | null;
          route: string | null;
          scheduled_at: string | null;
          shipment_id: string;
          status: Database["public"]["Enums"]["op_status"];
          vehicle_reg: string | null;
        };
        Insert: {
          created_at?: string;
          delivered_at?: string | null;
          driver_name?: string | null;
          id?: string;
          pod_file_path?: string | null;
          route?: string | null;
          scheduled_at?: string | null;
          shipment_id: string;
          status?: Database["public"]["Enums"]["op_status"];
          vehicle_reg?: string | null;
        };
        Update: {
          created_at?: string;
          delivered_at?: string | null;
          driver_name?: string | null;
          id?: string;
          pod_file_path?: string | null;
          route?: string | null;
          scheduled_at?: string | null;
          shipment_id?: string;
          status?: Database["public"]["Enums"]["op_status"];
          vehicle_reg?: string | null;
        };
        Relationships: [];
      };
      trip_waypoints: {
        Row: {
          id: string;
          label: string | null;
          lat: number;
          lng: number;
          recorded_at: string;
          seq: number;
          trip_id: string;
        };
        Insert: {
          id?: string;
          label?: string | null;
          lat: number;
          lng: number;
          recorded_at?: string;
          seq: number;
          trip_id: string;
        };
        Update: {
          id?: string;
          label?: string | null;
          lat?: number;
          lng?: number;
          recorded_at?: string;
          seq?: number;
          trip_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_waypoints_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
        ];
      };
      trips: {
        Row: {
          client_company_id: string | null;
          created_at: string;
          destination: string;
          driver: string;
          id: string;
          lat: number | null;
          lng: number | null;
          origin: string;
          pod_storage_path: string | null;
          pod_uploaded: boolean;
          progress_pct: number;
          provider_company_id: string | null;
          reference: string;
          shipment_id: string | null;
          status: string;
          updated_at: string;
          vehicle: string;
        };
        Insert: {
          client_company_id?: string | null;
          created_at?: string;
          destination: string;
          driver: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          origin: string;
          pod_storage_path?: string | null;
          pod_uploaded?: boolean;
          progress_pct?: number;
          provider_company_id?: string | null;
          reference: string;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          vehicle: string;
        };
        Update: {
          client_company_id?: string | null;
          created_at?: string;
          destination?: string;
          driver?: string;
          id?: string;
          lat?: number | null;
          lng?: number | null;
          origin?: string;
          pod_storage_path?: string | null;
          pod_uploaded?: boolean;
          progress_pct?: number;
          provider_company_id?: string | null;
          reference?: string;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          vehicle?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_client_company_id_fkey";
            columns: ["client_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trips_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
      warehouse_jobs: {
        Row: {
          checklist: Json;
          client_company_id: string;
          created_at: string;
          id: string;
          location: string;
          provider_company_id: string | null;
          reference: string;
          shipment_id: string | null;
          status: string;
          updated_at: string;
          warehouse_type: string;
        };
        Insert: {
          checklist?: Json;
          client_company_id: string;
          created_at?: string;
          id?: string;
          location: string;
          provider_company_id?: string | null;
          reference: string;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          warehouse_type: string;
        };
        Update: {
          checklist?: Json;
          client_company_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          provider_company_id?: string | null;
          reference?: string;
          shipment_id?: string | null;
          status?: string;
          updated_at?: string;
          warehouse_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "warehouse_jobs_client_company_id_fkey";
            columns: ["client_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_jobs_provider_company_id_fkey";
            columns: ["provider_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "warehouse_jobs_shipment_id_fkey";
            columns: ["shipment_id"];
            isOneToOne: false;
            referencedRelation: "shipments";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      mv_cost_by_route: {
        Row: {
          avg_cost: number | null;
          destination: string | null;
          origin: string | null;
          shipments: number | null;
          total_cost: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      activate_pulse_demo: { Args: { p_plan?: string }; Returns: undefined };
      can_see_shipment: { Args: { p_shipment: string }; Returns: boolean };
      current_company: { Args: never; Returns: string };
      deliver_notification: {
        Args: {
          p_body?: string | null;
          p_dedup_key?: string | null;
          p_kind?: string;
          p_link?: string | null;
          p_metadata?: Json;
          p_recipient_id: string;
          p_title: string;
          p_type?: string;
        };
        Returns: string;
      };
      has_active_pulse: { Args: never; Returns: boolean };
      has_role: { Args: { p_role: string }; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_compliance_admin: { Args: never; Returns: boolean };
      is_finance_admin: { Args: never; Returns: boolean };
      match_providers_for_shipment: {
        Args: { p_shipment_id: string };
        Returns: number;
      };
      my_company: { Args: never; Returns: string };
      my_demand_shipment_ids: { Args: never; Returns: string[] };
      my_quote_shipment_ids: { Args: never; Returns: string[] };
      next_ref:
        | { Args: { p_prefix: string }; Returns: string }
        | { Args: { p_prefix: string; p_seq: unknown }; Returns: string };
      pulse_executive_summary: { Args: never; Returns: Json };
      pulse_transit_trend: {
        Args: never;
        Returns: {
          avg_transit_days: number;
          period: string;
          shipments: number;
        }[];
      };
      refresh_pulse_aggregates: { Args: never; Returns: undefined };
      select_shipment_quote: {
        Args: {
          p_override_reason?: string;
          p_quote_id: string;
          p_shipment_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      approval_status: "pending" | "under_review" | "approved" | "rejected";
      bid_status: "submitted" | "accepted" | "rejected" | "withdrawn";
      company_status: "pending" | "under_review" | "approved" | "rejected";
      company_type: "demand" | "source" | "both";
      compliance_doc_type:
        | "company_registration"
        | "tax_clearance"
        | "vat_certificate"
        | "bank_confirmation"
        | "director_id"
        | "sars_registration"
        | "insurance"
        | "operating_license"
        | "bbbee_certificate"
        | "other";
      doc_status:
        | "draft"
        | "generated"
        | "uploaded"
        | "submitted"
        | "approved"
        | "rejected"
        | "archived";
      doc_type:
        | "rfq"
        | "source_selection"
        | "formal_quote"
        | "purchase_order"
        | "proforma_invoice"
        | "proof_of_service"
        | "tax_invoice"
        | "proof_of_payment"
        | "transaction_summary"
        | "commercial_invoice"
        | "bill_of_lading"
        | "customs_declaration"
        | "delivery_note"
        | "warehouse_receipt"
        | "transport_manifest"
        | "sars_clearing"
        | "packing_list"
        | "import_permit"
        | "insurance_certificate"
        | "proof_of_delivery";
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
      op_status: "pending" | "in_progress" | "completed";
      op_type:
        | "receiving"
        | "inspection"
        | "destuffing"
        | "stuffing"
        | "palletizing"
        | "storage"
        | "dispatch"
        | "damage";
      payment_status: "pending" | "processing" | "settled" | "failed";
      quote_status: "submitted" | "shortlisted" | "selected" | "rejected" | "withdrawn";
      sars_status: "not_started" | "submitted" | "verified" | "query" | "rejected";
      service_relation: "offer" | "require";
      shipment_status:
        | "draft"
        | "submitted"
        | "quoted"
        | "approved"
        | "in_progress"
        | "completed"
        | "invoiced"
        | "paid"
        | "cancelled"
        | "disputed"
        | "archived";
      user_role:
        | "super_admin"
        | "operations_admin"
        | "finance_admin"
        | "compliance_admin"
        | "demand_user"
        | "source_user"
        | "subscriber";
      verification_status: "pending" | "verified" | "failed" | "not_required";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      approval_status: ["pending", "under_review", "approved", "rejected"],
      bid_status: ["submitted", "accepted", "rejected", "withdrawn"],
      company_status: ["pending", "under_review", "approved", "rejected"],
      company_type: ["demand", "source", "both"],
      compliance_doc_type: [
        "company_registration",
        "tax_clearance",
        "vat_certificate",
        "bank_confirmation",
        "director_id",
        "sars_registration",
        "insurance",
        "operating_license",
        "bbbee_certificate",
        "other",
      ],
      doc_status: [
        "draft",
        "generated",
        "uploaded",
        "submitted",
        "approved",
        "rejected",
        "archived",
      ],
      doc_type: [
        "rfq",
        "source_selection",
        "formal_quote",
        "purchase_order",
        "proforma_invoice",
        "proof_of_service",
        "tax_invoice",
        "proof_of_payment",
        "transaction_summary",
        "commercial_invoice",
        "bill_of_lading",
        "customs_declaration",
        "delivery_note",
        "warehouse_receipt",
        "transport_manifest",
        "sars_clearing",
        "packing_list",
        "import_permit",
        "insurance_certificate",
        "proof_of_delivery",
      ],
      invoice_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      op_status: ["pending", "in_progress", "completed"],
      op_type: [
        "receiving",
        "inspection",
        "destuffing",
        "stuffing",
        "palletizing",
        "storage",
        "dispatch",
        "damage",
      ],
      payment_status: ["pending", "processing", "settled", "failed"],
      quote_status: ["submitted", "shortlisted", "selected", "rejected", "withdrawn"],
      sars_status: ["not_started", "submitted", "verified", "query", "rejected"],
      service_relation: ["offer", "require"],
      shipment_status: [
        "draft",
        "submitted",
        "quoted",
        "approved",
        "in_progress",
        "completed",
        "invoiced",
        "paid",
        "cancelled",
        "disputed",
        "archived",
      ],
      user_role: [
        "super_admin",
        "operations_admin",
        "finance_admin",
        "compliance_admin",
        "demand_user",
        "source_user",
        "subscriber",
      ],
      verification_status: ["pending", "verified", "failed", "not_required"],
    },
  },
} as const;
