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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          bay_code: string | null
          captured_at: string
          confidence: number
          decision: Database["public"]["Enums"]["access_decision"]
          direction: Database["public"]["Enums"]["gate_direction"]
          estate_id: string
          gate_id: string | null
          id: string
          pass_id: string | null
          plate: string
          reason: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          vehicle_id: string | null
        }
        Insert: {
          bay_code?: string | null
          captured_at?: string
          confidence?: number
          decision: Database["public"]["Enums"]["access_decision"]
          direction?: Database["public"]["Enums"]["gate_direction"]
          estate_id: string
          gate_id?: string | null
          id?: string
          pass_id?: string | null
          plate: string
          reason: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          vehicle_id?: string | null
        }
        Update: {
          bay_code?: string | null
          captured_at?: string
          confidence?: number
          decision?: Database["public"]["Enums"]["access_decision"]
          direction?: Database["public"]["Enums"]["gate_direction"]
          estate_id?: string
          gate_id?: string | null
          id?: string
          pass_id?: string | null
          plate?: string
          reason?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_events_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_pass_id_fkey"
            columns: ["pass_id"]
            isOneToOne: false
            referencedRelation: "visitor_passes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          estate_id: string
          gate_id: string | null
          id: string
          kind: string
          last_seen_at: string
          name: string
          status: Database["public"]["Enums"]["device_status"]
        }
        Insert: {
          created_at?: string
          estate_id: string
          gate_id?: string | null
          id?: string
          kind?: string
          last_seen_at?: string
          name: string
          status?: Database["public"]["Enums"]["device_status"]
        }
        Update: {
          created_at?: string
          estate_id?: string
          gate_id?: string | null
          id?: string
          kind?: string
          last_seen_at?: string
          name?: string
          status?: Database["public"]["Enums"]["device_status"]
        }
        Relationships: [
          {
            foreignKeyName: "devices_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "gates"
            referencedColumns: ["id"]
          },
        ]
      }
      estate_codes: {
        Row: {
          admin_code: string
          estate_id: string
          guard_code: string
          resident_code: string
        }
        Insert: {
          admin_code: string
          estate_id: string
          guard_code: string
          resident_code: string
        }
        Update: {
          admin_code?: string
          estate_id?: string
          guard_code?: string
          resident_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "estate_codes_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: true
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      estates: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      gates: {
        Row: {
          created_at: string
          direction: Database["public"]["Enums"]["gate_direction"]
          estate_id: string
          id: string
          is_open: boolean
          name: string
        }
        Insert: {
          created_at?: string
          direction?: Database["public"]["Enums"]["gate_direction"]
          estate_id: string
          id?: string
          is_open?: boolean
          name: string
        }
        Update: {
          created_at?: string
          direction?: Database["public"]["Enums"]["gate_direction"]
          estate_id?: string
          id?: string
          is_open?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gates_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      parking_bays: {
        Row: {
          code: string
          created_at: string
          estate_id: string
          id: string
          occupied_plate: string | null
          status: Database["public"]["Enums"]["bay_status"]
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          estate_id: string
          id?: string
          occupied_plate?: string | null
          status?: Database["public"]["Enums"]["bay_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          estate_id?: string
          id?: string
          occupied_plate?: string | null
          status?: Database["public"]["Enums"]["bay_status"]
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parking_bays_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parking_bays_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      unit_residents: {
        Row: {
          created_at: string
          estate_id: string
          id: string
          is_primary: boolean
          unit_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estate_id: string
          id?: string
          is_primary?: boolean
          unit_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          estate_id?: string
          id?: string
          is_primary?: boolean
          unit_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_residents_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_residents_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          created_at: string
          estate_id: string
          id: string
          label: string
        }
        Insert: {
          created_at?: string
          estate_id: string
          id?: string
          label: string
        }
        Update: {
          created_at?: string
          estate_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          estate_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          estate_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          estate_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          colour: string | null
          created_at: string
          estate_id: string
          id: string
          is_active: boolean
          make: string | null
          model: string | null
          owner_id: string
          plate: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          colour?: string | null
          created_at?: string
          estate_id: string
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          owner_id: string
          plate: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          colour?: string | null
          created_at?: string
          estate_id?: string
          id?: string
          is_active?: boolean
          make?: string | null
          model?: string | null
          owner_id?: string
          plate?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      visitor_passes: {
        Row: {
          created_at: string
          estate_id: string
          host_id: string
          id: string
          notes: string | null
          plate: string
          status: Database["public"]["Enums"]["pass_status"]
          unit_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string
          visitor_name: string
          visitor_phone: string | null
        }
        Insert: {
          created_at?: string
          estate_id: string
          host_id: string
          id?: string
          notes?: string | null
          plate: string
          status?: Database["public"]["Enums"]["pass_status"]
          unit_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to: string
          visitor_name: string
          visitor_phone?: string | null
        }
        Update: {
          created_at?: string
          estate_id?: string
          host_id?: string
          id?: string
          notes?: string | null
          plate?: string
          status?: Database["public"]["Enums"]["pass_status"]
          unit_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string
          visitor_name?: string
          visitor_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_passes_estate_id_fkey"
            columns: ["estate_id"]
            isOneToOne: false
            referencedRelation: "estates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_passes_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      access_decision: "allowed" | "denied" | "held"
      app_role: "super_admin" | "estate_admin" | "guard" | "resident"
      bay_status: "free" | "occupied" | "reserved"
      device_status: "online" | "degraded" | "offline"
      gate_direction: "entry" | "exit" | "both"
      pass_status: "active" | "expired" | "used" | "revoked"
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
    Enums: {
      access_decision: ["allowed", "denied", "held"],
      app_role: ["super_admin", "estate_admin", "guard", "resident"],
      bay_status: ["free", "occupied", "reserved"],
      device_status: ["online", "degraded", "offline"],
      gate_direction: ["entry", "exit", "both"],
      pass_status: ["active", "expired", "used", "revoked"],
    },
  },
} as const
