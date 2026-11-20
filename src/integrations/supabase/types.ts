export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      license_key_redemptions: {
        Row: {
          code: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          code: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          code?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_key_redemptions_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["code"]
          },
        ]
      }
      license_keys: {
        Row: {
          activations_count: number
          code: string
          created_at: string
          duration_days: number | null
          expires_at: string | null
          max_activations: number
          note: string
          plan: string
        }
        Insert: {
          activations_count?: number
          code: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          max_activations?: number
          note?: string
          plan?: string
        }
        Update: {
          activations_count?: number
          code?: string
          created_at?: string
          duration_days?: number | null
          expires_at?: string | null
          max_activations?: number
          note?: string
          plan?: string
        }
        Relationships: []
      }
      licenses: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          environment: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          environment?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          environment?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string
          environment: string
          id: string
          plan: string | null
          receipt_url: string | null
          status: string
          stripe_ref: string | null
          user_id: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string
          environment?: string
          id?: string
          plan?: string | null
          receipt_url?: string | null
          status?: string
          stripe_ref?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string
          environment?: string
          id?: string
          plan?: string | null
          receipt_url?: string | null
          status?: string
          stripe_ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pult_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string
          id: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string
          id?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: []
      }
      show_invites: {
        Row: {
          created_at: string
          email: string
          id: string
          owner_id: string
          show_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          owner_id?: string
          show_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          owner_id?: string
          show_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_invites_show_id_fkey"
            columns: ["show_id"]
            isOneToOne: false
            referencedRelation: "shows"
            referencedColumns: ["id"]
          },
        ]
      }
      shows: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          remote_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          remote_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          remote_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          body: string
          created_at: string
          email: string | null
          id: string
          kind: string
          status: string
          subject: string
          system_info: string | null
          ticket_no: number
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          email?: string | null
          id?: string
          kind: string
          status?: string
          subject: string
          system_info?: string | null
          ticket_no?: number
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          email?: string | null
          id?: string
          kind?: string
          status?: string
          subject?: string
          system_info?: string | null
          ticket_no?: number
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_pult_device: {
        Args: { _device_id: string; _device_name: string }
        Returns: Json
      }
      redeem_license_key: { Args: { _code: string }; Returns: Json }
      shared_shows: {
        Args: never
        Returns: {
          id: string
          name: string
          remote_code: string
        }[]
      }
      submit_ticket: {
        Args: {
          _body: string
          _email: string
          _kind: string
          _subject: string
          _system_info: string
        }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
