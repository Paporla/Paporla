export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.15'
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          id: string
          market_id: string | null
          metadata: Json
          occurred_at: string
          request_id: string | null
          severity: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          id?: string
          market_id?: string | null
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          severity?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          id?: string
          market_id?: string | null
          metadata?: Json
          occurred_at?: string
          request_id?: string | null
          severity?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_logs_actor_fkey'
            columns: ['actor_user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activity_logs_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          shop_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          shop_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          shop_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_shop_fkey'
            columns: ['shop_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      legal_acceptances: {
        Row: {
          acceptance_context: string
          accepted_at: string
          app_platform: string
          app_version: string | null
          legal_document_id: string
          user_id: string
        }
        Insert: {
          acceptance_context: string
          accepted_at?: string
          app_platform: string
          app_version?: string | null
          legal_document_id: string
          user_id: string
        }
        Update: {
          acceptance_context?: string
          accepted_at?: string
          app_platform?: string
          app_version?: string | null
          legal_document_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'legal_acceptances_document_fkey'
            columns: ['legal_document_id']
            isOneToOne: false
            referencedRelation: 'legal_documents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'legal_acceptances_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      legal_documents: {
        Row: {
          content_sha256: string
          content_url: string
          created_at: string
          created_by: string | null
          document_type: string
          effective_at: string
          id: string
          is_required: boolean
          language: string
          market_id: string
          published_at: string | null
          retired_at: string | null
          status: string
          supersedes_document_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          content_sha256: string
          content_url: string
          created_at?: string
          created_by?: string | null
          document_type: string
          effective_at: string
          id?: string
          is_required?: boolean
          language: string
          market_id: string
          published_at?: string | null
          retired_at?: string | null
          status?: string
          supersedes_document_id?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          content_sha256?: string
          content_url?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          effective_at?: string
          id?: string
          is_required?: boolean
          language?: string
          market_id?: string
          published_at?: string | null
          retired_at?: string | null
          status?: string
          supersedes_document_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: 'legal_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'legal_documents_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'legal_documents_supersedes_fkey'
            columns: ['supersedes_document_id']
            isOneToOne: false
            referencedRelation: 'legal_documents'
            referencedColumns: ['id']
          },
        ]
      }
      localities: {
        Row: {
          center_geog: unknown
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          market_id: string
          name: string
          region_id: string
          slug: string
          sort_order: number
          timezone: string
          updated_at: string
        }
        Insert: {
          center_geog?: unknown
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          market_id: string
          name: string
          region_id: string
          slug: string
          sort_order?: number
          timezone: string
          updated_at?: string
        }
        Update: {
          center_geog?: unknown
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          market_id?: string
          name?: string
          region_id?: string
          slug?: string
          sort_order?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'localities_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'localities_region_market_fkey'
            columns: ['region_id', 'market_id']
            isOneToOne: false
            referencedRelation: 'regions'
            referencedColumns: ['id', 'market_id']
          },
        ]
      }
      markets: {
        Row: {
          cancellation_cutoff_minutes: number
          country_code: string
          created_at: string
          currency_code: string
          currency_minor_units: number
          default_locale: string
          default_timezone: string
          id: string
          locality_label: string
          name: string
          no_show_policy: string
          region_label: string
          reservation_hold_minutes: number
          slug: string
          status: string
          support_email: string | null
          updated_at: string
        }
        Insert: {
          cancellation_cutoff_minutes?: number
          country_code: string
          created_at?: string
          currency_code: string
          currency_minor_units?: number
          default_locale: string
          default_timezone: string
          id?: string
          locality_label?: string
          name: string
          no_show_policy?: string
          region_label?: string
          reservation_hold_minutes?: number
          slug: string
          status?: string
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          cancellation_cutoff_minutes?: number
          country_code?: string
          created_at?: string
          currency_code?: string
          currency_minor_units?: number
          default_locale?: string
          default_timezone?: string
          id?: string
          locality_label?: string
          name?: string
          no_show_policy?: string
          region_label?: string
          reservation_hold_minutes?: number
          slug?: string
          status?: string
          support_email?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          category: string
          channel: string
          created_at: string
          enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string
          enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          data: Json
          expires_at: string | null
          id: string
          pack_id: string | null
          read_at: string | null
          reservation_id: string | null
          shop_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          pack_id?: string | null
          read_at?: string | null
          reservation_id?: string | null
          shop_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          data?: Json
          expires_at?: string | null
          id?: string
          pack_id?: string | null
          read_at?: string | null
          reservation_id?: string | null
          shop_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_pack_fkey'
            columns: ['pack_id']
            isOneToOne: false
            referencedRelation: 'packs'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_reservation_fkey'
            columns: ['reservation_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_shop_fkey'
            columns: ['shop_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notifications_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      outbox_events: {
        Row: {
          aggregate_id: string | null
          aggregate_type: string
          attempts: number
          available_at: string
          created_at: string
          dedupe_key: string
          event_type: string
          id: string
          last_error_code: string | null
          locked_at: string | null
          locked_by: string | null
          market_id: string | null
          payload: Json
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aggregate_id?: string | null
          aggregate_type: string
          attempts?: number
          available_at?: string
          created_at?: string
          dedupe_key: string
          event_type: string
          id?: string
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          market_id?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aggregate_id?: string | null
          aggregate_type?: string
          attempts?: number
          available_at?: string
          created_at?: string
          dedupe_key?: string
          event_type?: string
          id?: string
          last_error_code?: string | null
          locked_at?: string | null
          locked_by?: string | null
          market_id?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'outbox_events_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
        ]
      }
      packs: {
        Row: {
          allergen_notice: string | null
          archived_at: string | null
          category: string
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          handling_notice: string | null
          id: string
          image_gallery: string[]
          image_path: string | null
          market_id: string
          original_price_minor: number | null
          pickup_end_at: string
          pickup_start_at: string
          price_minor: number
          published_at: string | null
          remaining_stock: number
          sales_start_at: string | null
          shop_id: string
          status: string
          tags: string[]
          timezone_snapshot: string
          title: string
          total_stock: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allergen_notice?: string | null
          archived_at?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          currency_code: string
          description?: string | null
          handling_notice?: string | null
          id?: string
          image_gallery?: string[]
          image_path?: string | null
          market_id: string
          original_price_minor?: number | null
          pickup_end_at: string
          pickup_start_at: string
          price_minor: number
          published_at?: string | null
          remaining_stock: number
          sales_start_at?: string | null
          shop_id: string
          status?: string
          tags?: string[]
          timezone_snapshot: string
          title: string
          total_stock: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allergen_notice?: string | null
          archived_at?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          handling_notice?: string | null
          id?: string
          image_gallery?: string[]
          image_path?: string | null
          market_id?: string
          original_price_minor?: number | null
          pickup_end_at?: string
          pickup_start_at?: string
          price_minor?: number
          published_at?: string | null
          remaining_stock?: number
          sales_start_at?: string | null
          shop_id?: string
          status?: string
          tags?: string[]
          timezone_snapshot?: string
          title?: string
          total_stock?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'packs_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'packs_market_currency_fkey'
            columns: ['market_id', 'currency_code']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id', 'currency_code']
          },
          {
            foreignKeyName: 'packs_shop_market_fkey'
            columns: ['shop_id', 'market_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id', 'market_id']
          },
          {
            foreignKeyName: 'packs_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      payment_events: {
        Row: {
          attempts: number
          event_type: string
          id: string
          last_error_code: string | null
          payload_sha256: string | null
          payment_id: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          received_at: string
          reservation_id: string | null
          sanitized_payload: Json | null
          status: string
        }
        Insert: {
          attempts?: number
          event_type: string
          id?: string
          last_error_code?: string | null
          payload_sha256?: string | null
          payment_id?: string | null
          processed_at?: string | null
          provider: string
          provider_event_id: string
          received_at?: string
          reservation_id?: string | null
          sanitized_payload?: Json | null
          status?: string
        }
        Update: {
          attempts?: number
          event_type?: string
          id?: string
          last_error_code?: string | null
          payload_sha256?: string | null
          payment_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          received_at?: string
          reservation_id?: string | null
          sanitized_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_events_payment_fkey'
            columns: ['payment_id']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'payment_events_reservation_fkey'
            columns: ['reservation_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
        ]
      }
      payment_refunds: {
        Row: {
          amount_minor: number
          completed_at: string | null
          created_at: string
          currency_code: string
          failed_at: string | null
          failure_code: string | null
          id: string
          idempotency_key: string
          payment_id: string
          provider: string
          provider_created_at: string | null
          provider_refund_id: string | null
          reason: string
          requested_actor_role: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_minor: number
          completed_at?: string | null
          created_at?: string
          currency_code: string
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          idempotency_key: string
          payment_id: string
          provider: string
          provider_created_at?: string | null
          provider_refund_id?: string | null
          reason: string
          requested_actor_role: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_minor?: number
          completed_at?: string | null
          created_at?: string
          currency_code?: string
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          idempotency_key?: string
          payment_id?: string
          provider?: string
          provider_created_at?: string | null
          provider_refund_id?: string | null
          reason?: string
          requested_actor_role?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'payment_refunds_payment_identity_fkey'
            columns: ['payment_id', 'provider', 'currency_code']
            isOneToOne: false
            referencedRelation: 'payments'
            referencedColumns: ['id', 'provider', 'currency_code']
          },
          {
            foreignKeyName: 'payment_refunds_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          authorization_expires_at: string | null
          authorized_at: string | null
          capture_mode: string
          capture_scheduled_at: string | null
          captured_at: string | null
          created_at: string
          currency_code: string
          failed_at: string | null
          failure_code: string | null
          id: string
          idempotency_key: string
          market_id: string
          provider: string
          provider_created_at: string | null
          provider_payment_id: string | null
          refund_pending_at: string | null
          refunded_at: string | null
          reservation_id: string
          status: string
          supports_manual_capture_snapshot: boolean
          updated_at: string
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          authorization_expires_at?: string | null
          authorized_at?: string | null
          capture_mode: string
          capture_scheduled_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency_code: string
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          idempotency_key: string
          market_id: string
          provider: string
          provider_created_at?: string | null
          provider_payment_id?: string | null
          refund_pending_at?: string | null
          refunded_at?: string | null
          reservation_id: string
          status?: string
          supports_manual_capture_snapshot?: boolean
          updated_at?: string
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          authorization_expires_at?: string | null
          authorized_at?: string | null
          capture_mode?: string
          capture_scheduled_at?: string | null
          captured_at?: string | null
          created_at?: string
          currency_code?: string
          failed_at?: string | null
          failure_code?: string | null
          id?: string
          idempotency_key?: string
          market_id?: string
          provider?: string
          provider_created_at?: string | null
          provider_payment_id?: string | null
          refund_pending_at?: string | null
          refunded_at?: string | null
          reservation_id?: string
          status?: string
          supports_manual_capture_snapshot?: boolean
          updated_at?: string
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'payments_reservation_identity_fkey'
            columns: ['reservation_id', 'market_id', 'currency_code', 'amount_minor']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id', 'market_id', 'currency_code', 'total_amount_minor']
          },
        ]
      }
      rate_limits: {
        Row: {
          action: string
          blocked_until: string | null
          created_at: string
          identifier_hash: string
          key_hash: string
          request_count: number
          scope: string
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          action: string
          blocked_until?: string | null
          created_at?: string
          identifier_hash: string
          key_hash: string
          request_count?: number
          scope: string
          updated_at?: string
          window_end: string
          window_start: string
        }
        Update: {
          action?: string
          blocked_until?: string | null
          created_at?: string
          identifier_hash?: string
          key_hash?: string
          request_count?: number
          scope?: string
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      regions: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          market_id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          market_id: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          market_id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'regions_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
        ]
      }
      reservations: {
        Row: {
          anonymized_at: string | null
          cancel_reason: string | null
          cancelled_actor_role: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          capture_scheduled_at: string | null
          checkout_hold_expires_at: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency_code: string
          expired_at: string | null
          id: string
          idempotency_key: string
          market_id: string
          no_show_at: string | null
          pack_id: string
          pack_title_snapshot: string
          payment_status: string
          picked_up_at: string | null
          pickup_code_hash: string | null
          pickup_credential_issued_at: string | null
          pickup_credential_used_at: string | null
          pickup_credential_version: number | null
          pickup_end_at: string
          pickup_start_at: string
          pickup_token_hash: string | null
          quantity: number
          ready_at: string | null
          shop_address_snapshot: string | null
          shop_id: string
          shop_name_snapshot: string
          status: string
          timezone_snapshot: string
          total_amount_minor: number
          unit_price_minor: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          anonymized_at?: string | null
          cancel_reason?: string | null
          cancelled_actor_role?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capture_scheduled_at?: string | null
          checkout_hold_expires_at: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_code: string
          expired_at?: string | null
          id?: string
          idempotency_key: string
          market_id: string
          no_show_at?: string | null
          pack_id: string
          pack_title_snapshot: string
          payment_status?: string
          picked_up_at?: string | null
          pickup_code_hash?: string | null
          pickup_credential_issued_at?: string | null
          pickup_credential_used_at?: string | null
          pickup_credential_version?: number | null
          pickup_end_at: string
          pickup_start_at: string
          pickup_token_hash?: string | null
          quantity?: number
          ready_at?: string | null
          shop_address_snapshot?: string | null
          shop_id: string
          shop_name_snapshot: string
          status?: string
          timezone_snapshot: string
          total_amount_minor: number
          unit_price_minor: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          anonymized_at?: string | null
          cancel_reason?: string | null
          cancelled_actor_role?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          capture_scheduled_at?: string | null
          checkout_hold_expires_at?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency_code?: string
          expired_at?: string | null
          id?: string
          idempotency_key?: string
          market_id?: string
          no_show_at?: string | null
          pack_id?: string
          pack_title_snapshot?: string
          payment_status?: string
          picked_up_at?: string | null
          pickup_code_hash?: string | null
          pickup_credential_issued_at?: string | null
          pickup_credential_used_at?: string | null
          pickup_credential_version?: number | null
          pickup_end_at?: string
          pickup_start_at?: string
          pickup_token_hash?: string | null
          quantity?: number
          ready_at?: string | null
          shop_address_snapshot?: string | null
          shop_id?: string
          shop_name_snapshot?: string
          status?: string
          timezone_snapshot?: string
          total_amount_minor?: number
          unit_price_minor?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reservations_cancelled_by_fkey'
            columns: ['cancelled_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reservations_pack_identity_fkey'
            columns: ['pack_id', 'shop_id', 'market_id', 'currency_code']
            isOneToOne: false
            referencedRelation: 'packs'
            referencedColumns: ['id', 'shop_id', 'market_id', 'currency_code']
          },
          {
            foreignKeyName: 'reservations_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          market_id: string
          moderated_at: string | null
          moderated_by: string | null
          moderation_reason: string | null
          moderation_status: string
          rating: number
          reservation_id: string
          shop_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          market_id: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          rating: number
          reservation_id: string
          shop_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          market_id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          moderation_reason?: string | null
          moderation_status?: string
          rating?: number
          reservation_id?: string
          shop_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reviews_moderated_by_fkey'
            columns: ['moderated_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_reservation_fkey'
            columns: ['reservation_id']
            isOneToOne: true
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reviews_shop_market_fkey'
            columns: ['shop_id', 'market_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id', 'market_id']
          },
          {
            foreignKeyName: 'reviews_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      scheduled_job_runs: {
        Row: {
          created_at: string
          error_code: string | null
          failed_count: number
          finished_at: string | null
          heartbeat_at: string
          id: string
          job_name: string
          processed_count: number
          run_key: string
          scheduled_for: string
          started_at: string
          status: string
          succeeded_count: number
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          failed_count?: number
          finished_at?: string | null
          heartbeat_at?: string
          id?: string
          job_name: string
          processed_count?: number
          run_key: string
          scheduled_for: string
          started_at?: string
          status?: string
          succeeded_count?: number
        }
        Update: {
          created_at?: string
          error_code?: string | null
          failed_count?: number
          finished_at?: string | null
          heartbeat_at?: string
          id?: string
          job_name?: string
          processed_count?: number
          run_key?: string
          scheduled_for?: string
          started_at?: string
          status?: string
          succeeded_count?: number
        }
        Relationships: []
      }
      shop_hours: {
        Row: {
          closes_at: string | null
          created_at: string
          id: string
          is_closed: boolean
          opens_at: string | null
          sequence: number
          shop_id: string
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          sequence?: number
          shop_id: string
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          opens_at?: string | null
          sequence?: number
          shop_id?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: 'shop_hours_shop_fkey'
            columns: ['shop_id']
            isOneToOne: false
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
        ]
      }
      shop_stats: {
        Row: {
          active_packs_count: number
          cancelled_by_shop_count: number
          completed_reservations_count: number
          rating_count: number
          rating_sum: number
          shop_id: string
          total_packs_sold: number
          total_revenue_minor: number
          updated_at: string
        }
        Insert: {
          active_packs_count?: number
          cancelled_by_shop_count?: number
          completed_reservations_count?: number
          rating_count?: number
          rating_sum?: number
          shop_id: string
          total_packs_sold?: number
          total_revenue_minor?: number
          updated_at?: string
        }
        Update: {
          active_packs_count?: number
          cancelled_by_shop_count?: number
          completed_reservations_count?: number
          rating_count?: number
          rating_sum?: number
          shop_id?: string
          total_packs_sold?: number
          total_revenue_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shop_stats_shop_fkey'
            columns: ['shop_id']
            isOneToOne: true
            referencedRelation: 'shops'
            referencedColumns: ['id']
          },
        ]
      }
      shops: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          category: string | null
          cover_path: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          geog: unknown
          id: string
          instagram_handle: string | null
          latitude: number | null
          locality_id: string | null
          logo_path: string | null
          longitude: number | null
          market_id: string
          name: string
          owner_id: string
          phone_e164: string | null
          postal_code: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          status_reason: string | null
          timezone: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          geog?: unknown
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          locality_id?: string | null
          logo_path?: string | null
          longitude?: number | null
          market_id: string
          name: string
          owner_id: string
          phone_e164?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          timezone: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          category?: string | null
          cover_path?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          geog?: unknown
          id?: string
          instagram_handle?: string | null
          latitude?: number | null
          locality_id?: string | null
          logo_path?: string | null
          longitude?: number | null
          market_id?: string
          name?: string
          owner_id?: string
          phone_e164?: string | null
          postal_code?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          status_reason?: string | null
          timezone?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'shops_locality_market_fkey'
            columns: ['locality_id', 'market_id']
            isOneToOne: false
            referencedRelation: 'localities'
            referencedColumns: ['id', 'market_id']
          },
          {
            foreignKeyName: 'shops_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shops_owner_fkey'
            columns: ['owner_id']
            isOneToOne: true
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shops_reviewed_by_fkey'
            columns: ['reviewed_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_label: string | null
          id: string
          last_seen_at: string
          locale: string
          market_id: string | null
          platform: string
          push_provider: string
          push_token: string
          push_token_hash: string
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          locale: string
          market_id?: string | null
          platform: string
          push_provider: string
          push_token: string
          push_token_hash: string
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_label?: string | null
          id?: string
          last_seen_at?: string
          locale?: string
          market_id?: string | null
          platform?: string
          push_provider?: string
          push_token?: string
          push_token_hash?: string
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_devices_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_devices_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_penalties: {
        Row: {
          created_at: string
          created_by: string | null
          enforcement_status: string
          expires_at: string | null
          id: string
          market_id: string
          reason: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_reservation_id: string | null
          starts_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enforcement_status?: string
          expires_at?: string | null
          id?: string
          market_id: string
          reason: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_reservation_id?: string | null
          starts_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enforcement_status?: string
          expires_at?: string | null
          id?: string
          market_id?: string
          reason?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_reservation_id?: string | null
          starts_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_penalties_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_penalties_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_penalties_reservation_fkey'
            columns: ['source_reservation_id']
            isOneToOne: false
            referencedRelation: 'reservations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_penalties_revoked_by_fkey'
            columns: ['revoked_by']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'user_penalties_user_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'user_profiles'
            referencedColumns: ['id']
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status: string
          avatar_path: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string | null
          email_confirmed_at: string | null
          id: string
          last_login_at: string | null
          locale: string
          locality_id: string | null
          market_id: string | null
          onboarding_completed_at: string | null
          phone_e164: string | null
          role: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_path?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id: string
          last_login_at?: string | null
          locale?: string
          locality_id?: string | null
          market_id?: string | null
          onboarding_completed_at?: string | null
          phone_e164?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_path?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          email_confirmed_at?: string | null
          id?: string
          last_login_at?: string | null
          locale?: string
          locality_id?: string | null
          market_id?: string | null
          onboarding_completed_at?: string | null
          phone_e164?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_profiles_locality_market_fkey'
            columns: ['locality_id', 'market_id']
            isOneToOne: false
            referencedRelation: 'localities'
            referencedColumns: ['id', 'market_id']
          },
          {
            foreignKeyName: 'user_profiles_market_fkey'
            columns: ['market_id']
            isOneToOne: false
            referencedRelation: 'markets'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_legal_document: {
        Args: {
          p_acceptance_context: string
          p_app_platform: string
          p_app_version: string
          p_legal_document_id: string
        }
        Returns: Json
      }
      adjust_pack_stock: {
        Args: { p_new_total_stock: number; p_pack_id: string }
        Returns: Json
      }
      admin_review_shop: {
        Args: { p_new_status: string; p_reason: string; p_shop_id: string }
        Returns: Json
      }
      admin_set_account_status: {
        Args: {
          p_new_status: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: Json
      }
      admin_set_user_role: {
        Args: { p_new_role: string; p_target_user_id: string }
        Returns: Json
      }
      archive_pack: { Args: { p_pack_id: string }; Returns: Json }
      cancel_reservation: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: Json
      }
      create_own_shop: {
        Args: {
          p_address_line1: string
          p_address_line2: string
          p_category: string
          p_description: string
          p_locality_id: string
          p_market_id: string
          p_name: string
          p_phone_e164: string
          p_postal_code: string
        }
        Returns: Json
      }
      create_pack_draft: {
        Args: {
          p_allergen_notice: string
          p_category: string
          p_description: string
          p_handling_notice: string
          p_image_gallery: string[]
          p_image_path: string
          p_original_price_minor: number
          p_pickup_end_at: string
          p_pickup_start_at: string
          p_price_minor: number
          p_sales_start_at: string
          p_shop_id: string
          p_tags: string[]
          p_title: string
          p_total_stock: number
        }
        Returns: Json
      }
      create_payment_reservation: {
        Args: { p_idempotency_key: string; p_pack_id: string }
        Returns: Json
      }
      get_my_shop: { Args: never; Returns: Json }
      get_public_shop: { Args: { p_shop_id: string }; Returns: Json }
      list_current_legal_documents: {
        Args: { p_language: string; p_market_id: string }
        Returns: {
          content_sha256: string
          content_url: string
          document_type: string
          effective_at: string
          is_required: boolean
          language: string
          legal_document_id: string
          version: string
        }[]
      }
      list_my_packs: {
        Args: {
          p_before_created_at?: string
          p_before_pack_id?: string
          p_limit?: number
        }
        Returns: {
          created_at: string
          currency_code: string
          image_path: string
          pack_id: string
          pickup_end_at: string
          pickup_start_at: string
          price_minor: number
          remaining_stock: number
          status: string
          title: string
          total_stock: number
          updated_at: string
        }[]
      }
      list_my_reservations: {
        Args: {
          p_before_created_at?: string
          p_before_reservation_id?: string
          p_limit?: number
        }
        Returns: {
          cancel_reason: string
          created_at: string
          currency_code: string
          pack_id: string
          pack_title: string
          payment_status: string
          pickup_end_at: string
          pickup_start_at: string
          reservation_id: string
          shop_address: string
          shop_id: string
          shop_name: string
          status: string
          timezone: string
          total_amount_minor: number
        }[]
      }
      list_public_reviews: {
        Args: {
          p_before_created_at?: string
          p_before_review_id?: string
          p_limit?: number
          p_shop_id: string
        }
        Returns: {
          comment: string
          created_at: string
          rating: number
          review_id: string
        }[]
      }
      list_shop_reservations: {
        Args: {
          p_before_pickup_start_at?: string
          p_before_reservation_id?: string
          p_limit?: number
          p_shop_id: string
          p_status?: string
        }
        Returns: {
          created_at: string
          currency_code: string
          customer_display_name: string
          pack_id: string
          pack_title: string
          payment_status: string
          pickup_end_at: string
          pickup_start_at: string
          reservation_id: string
          status: string
          timezone: string
          total_amount_minor: number
        }[]
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: Json
      }
      publish_pack: { Args: { p_pack_id: string }; Returns: Json }
      register_device: {
        Args: {
          p_app_version: string
          p_device_label?: string
          p_locale: string
          p_market_id: string
          p_platform: string
          p_push_provider: string
          p_push_token: string
        }
        Returns: Json
      }
      revoke_device: { Args: { p_device_id: string }; Returns: Json }
      search_available_packs: {
        Args: {
          p_cursor_pack_id?: string
          p_cursor_pickup_start_at?: string
          p_latitude?: number
          p_limit?: number
          p_locality_id?: string
          p_longitude?: number
          p_market_id: string
          p_query?: string
          p_radius_meters?: number
        }
        Returns: {
          allergen_notice: string
          category: string
          currency_code: string
          description: string
          distance_meters: number
          image_path: string
          locality_id: string
          locality_name: string
          original_price_minor: number
          pack_id: string
          pickup_end_at: string
          pickup_start_at: string
          price_minor: number
          remaining_stock: number
          shop_address: string
          shop_category: string
          shop_id: string
          shop_latitude: number
          shop_longitude: number
          shop_name: string
          shop_rating: number
          shop_rating_count: number
          tags: string[]
          timezone: string
          title: string
        }[]
      }
      service_begin_refund: {
        Args: {
          p_amount_minor: number
          p_idempotency_key: string
          p_payment_id: string
          p_reason: string
          p_requested_actor_role: string
        }
        Returns: Json
      }
      service_check_rate_limit: {
        Args: {
          p_action: string
          p_block_seconds?: number
          p_identifier_hash: string
          p_key_hash: string
          p_limit: number
          p_scope: string
          p_window_seconds: number
        }
        Returns: Json
      }
      service_claim_outbox: {
        Args: { p_limit?: number; p_lock_timeout?: string; p_worker_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          event_type: string
          id: string
          market_id: string
          payload: Json
        }[]
      }
      service_cleanup_rate_limits: { Args: { p_limit?: number }; Returns: Json }
      service_complete_picked_up_reservations: {
        Args: { p_after?: string; p_limit?: number }
        Returns: Json
      }
      service_expire_payment_holds: {
        Args: { p_limit?: number }
        Returns: Json
      }
      service_finish_outbox: {
        Args: {
          p_error_code?: string
          p_event_id: string
          p_retry_after?: string
          p_success: boolean
          p_worker_id: string
        }
        Returns: Json
      }
      service_issue_pickup_credentials: {
        Args: {
          p_code_hash: string
          p_reservation_id: string
          p_token_hash: string
          p_version?: number
        }
        Returns: Json
      }
      service_mark_authorized_payment_captured: {
        Args: { p_captured_at: string; p_payment_id: string }
        Returns: Json
      }
      service_mark_no_shows: { Args: { p_limit?: number }; Returns: Json }
      service_mark_payment_voided: {
        Args: { p_payment_id: string; p_voided_at: string }
        Returns: Json
      }
      service_mark_refund_completed: {
        Args: {
          p_completed_at: string
          p_provider_refund_id: string
          p_refund_id: string
        }
        Returns: Json
      }
      service_mark_refund_failed: {
        Args: { p_failure_code: string; p_refund_id: string }
        Returns: Json
      }
      service_open_pickup_windows: { Args: { p_limit?: number }; Returns: Json }
      service_record_payment_authorized: {
        Args: {
          p_authorization_expires_at: string
          p_authorized_at: string
          p_idempotency_key: string
          p_provider: string
          p_provider_payment_id: string
          p_reservation_id: string
        }
        Returns: Json
      }
      service_record_payment_paid: {
        Args: {
          p_captured_at: string
          p_idempotency_key: string
          p_provider: string
          p_provider_payment_id: string
          p_reservation_id: string
        }
        Returns: Json
      }
      set_favorite: {
        Args: { p_enabled: boolean; p_shop_id: string }
        Returns: Json
      }
      set_notification_preference: {
        Args: { p_category: string; p_channel: string; p_enabled: boolean }
        Returns: Json
      }
      set_pack_paused: {
        Args: { p_pack_id: string; p_paused: boolean }
        Returns: Json
      }
      set_shop_hour: {
        Args: {
          p_closes_at: string
          p_is_closed: boolean
          p_opens_at: string
          p_sequence: number
          p_shop_id: string
          p_weekday: number
        }
        Returns: Json
      }
      submit_own_shop_for_review: { Args: { p_shop_id: string }; Returns: Json }
      update_own_profile: {
        Args: {
          p_avatar_path: string
          p_display_name: string
          p_locale: string
          p_locality_id: string
          p_market_id: string
          p_phone_e164: string
        }
        Returns: Json
      }
      update_own_shop: {
        Args: {
          p_address_line1: string
          p_address_line2: string
          p_category: string
          p_cover_path: string
          p_description: string
          p_instagram_handle: string
          p_latitude: number
          p_locality_id: string
          p_logo_path: string
          p_longitude: number
          p_name: string
          p_phone_e164: string
          p_postal_code: string
          p_shop_id: string
          p_website_url: string
        }
        Returns: Json
      }
      update_pack_content: {
        Args: {
          p_allergen_notice: string
          p_category: string
          p_description: string
          p_handling_notice: string
          p_image_gallery: string[]
          p_image_path: string
          p_original_price_minor: number
          p_pack_id: string
          p_pickup_end_at: string
          p_pickup_start_at: string
          p_price_minor: number
          p_sales_start_at: string
          p_tags: string[]
          p_title: string
        }
        Returns: Json
      }
      validate_pickup: { Args: { p_credential: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
