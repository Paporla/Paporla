export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          phone: string | null;
          role: string;
          avatar_url: string | null;
          email_confirmed: boolean | null;
          last_login: string | null;
          created_at: string | null;
          country: string | null;
          city: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          phone?: string | null;
          role?: string;
          avatar_url?: string | null;
          email_confirmed?: boolean | null;
          last_login?: string | null;
          created_at?: string | null;
          country?: string | null;
          city?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          phone?: string | null;
          role?: string;
          avatar_url?: string | null;
          email_confirmed?: boolean | null;
          last_login?: string | null;
          created_at?: string | null;
          country?: string | null;
          city?: string | null;
        };
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          address: string | null;
          phone: string | null;
          verified: boolean;
          banned: boolean;
          created_at: string | null;
          latitude: number | null;
          longitude: number | null;
          city: string | null;
          logo_url: string | null;
          cover_url: string | null;
          rating: number | null;
          total_ratings: number | null;
          deleted_at: string | null;
          country: string | null;
          category: string | null;
          website: string | null;
          instagram: string | null;
          hours: Json | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          verified?: boolean;
          banned?: boolean;
          created_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          rating?: number | null;
          total_ratings?: number | null;
          deleted_at?: string | null;
          country?: string | null;
          category?: string | null;
          website?: string | null;
          instagram?: string | null;
          hours?: Json | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          description?: string | null;
          address?: string | null;
          phone?: string | null;
          verified?: boolean;
          banned?: boolean;
          created_at?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          city?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          rating?: number | null;
          total_ratings?: number | null;
          deleted_at?: string | null;
          country?: string | null;
          category?: string | null;
          website?: string | null;
          instagram?: string | null;
          hours?: Json | null;
        };
      };
      packs: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          description: string | null;
          price_cents: number;
          total_stock: number;
          remaining_stock: number;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean;
          created_at: string | null;
          original_price_cents: number | null;
          discount_percentage: number | null;
          pickup_date: string | null;
          pickup_start_time: string | null;
          pickup_end_time: string | null;
          image_url: string | null;
          status: string | null;
          deleted_at: string | null;
          updated_by: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          shop_id: string;
          title: string;
          description?: string | null;
          price_cents: number;
          total_stock: number;
          remaining_stock: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          original_price_cents?: number | null;
          discount_percentage?: number | null;
          pickup_date?: string | null;
          pickup_start_time?: string | null;
          pickup_end_time?: string | null;
          image_url?: string | null;
          status?: string | null;
          deleted_at?: string | null;
          updated_by?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          shop_id?: string;
          title?: string;
          description?: string | null;
          price_cents?: number;
          total_stock?: number;
          remaining_stock?: number;
          starts_at?: string | null;
          ends_at?: string | null;
          is_active?: boolean;
          created_at?: string | null;
          original_price_cents?: number | null;
          discount_percentage?: number | null;
          pickup_date?: string | null;
          pickup_start_time?: string | null;
          pickup_end_time?: string | null;
          image_url?: string | null;
          status?: string | null;
          deleted_at?: string | null;
          updated_by?: string | null;
          updated_at?: string | null;
        };
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string;
          pack_id: string;
          quantity: number | null;
          total_price_cents: number | null;
          status: string | null;
          pickup_code: string | null;
          payment_id: string | null;
          payment_status: string | null;
          payment_method: string | null;
          reserved_at: string | null;
          picked_up_at: string | null;
          cancelled_at: string | null;
          created_at: string | null;
          pickup_date: string | null;
          pickup_start_time: string | null;
          pickup_end_time: string | null;
          cancelled_by: string | null;
          cancel_reason: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id: string;
          pack_id: string;
          quantity?: number | null;
          total_price_cents?: number | null;
          status?: string | null;
          pickup_code?: string | null;
          payment_id?: string | null;
          payment_status?: string | null;
          payment_method?: string | null;
          reserved_at?: string | null;
          picked_up_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          pickup_date?: string | null;
          pickup_start_time?: string | null;
          pickup_end_time?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_id?: string;
          pack_id?: string;
          quantity?: number | null;
          total_price_cents?: number | null;
          status?: string | null;
          pickup_code?: string | null;
          payment_id?: string | null;
          payment_status?: string | null;
          payment_method?: string | null;
          reserved_at?: string | null;
          picked_up_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          pickup_date?: string | null;
          pickup_start_time?: string | null;
          pickup_end_time?: string | null;
          cancelled_by?: string | null;
          cancel_reason?: string | null;
          updated_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          reservation_id: string | null;
          type: string;
          message: string;
          is_read: boolean | null;
          sent_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reservation_id?: string | null;
          type: string;
          message: string;
          is_read?: boolean | null;
          sent_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          reservation_id?: string | null;
          type?: string;
          message?: string;
          is_read?: boolean | null;
          sent_at?: string | null;
          created_at?: string | null;
        };
      };
      favorites: {
        Row: {
          id: string;
          user_id: string;
          shop_id: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          shop_id: string;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          shop_id?: string;
          created_at?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          type: string;
          severity: string | null;
          title: string;
          description: string | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: string;
          severity?: string | null;
          title: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          type?: string;
          severity?: string | null;
          title?: string;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      available_packs: {
        Row: {
          id: string | null;
          shop_id: string | null;
          title: string | null;
          description: string | null;
          price_cents: number | null;
          total_stock: number | null;
          remaining_stock: number | null;
          starts_at: string | null;
          ends_at: string | null;
          is_active: boolean | null;
          created_at: string | null;
          original_price_cents: number | null;
          discount_percentage: number | null;
          pickup_date: string | null;
          pickup_start_time: string | null;
          pickup_end_time: string | null;
          image_url: string | null;
          status: string | null;
          deleted_at: string | null;
          updated_by: string | null;
          shop_name: string | null;
          shop_address: string | null;
          shop_city: string | null;
          shop_rating: number | null;
          shop_verified: boolean | null;
          user_already_reserved: boolean | null;
        };
      };
    };
    Functions: {
      get_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      generate_pickup_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      cancel_reservation: {
        Args: { p_reservation_id: string; p_cancel_reason?: string };
        Returns: Json;
      };
      expire_old_reservations: {
        Args: Record<string, never>;
        Returns: number;
      };
      validate_pickup: {
        Args: { p_pickup_code: string };
        Returns: Json;
      };
    };
  };
}