export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      bots: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string | null
          status: string
          token: string
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id?: string | null
          status?: string
          token: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string | null
          status?: string
          token?: string
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          bot_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_vip: boolean | null
          name: string
          telegram_id: string
          updated_at: string | null
        }
        Insert: {
          bot_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_vip?: boolean | null
          name: string
          telegram_id: string
          updated_at?: string | null
        }
        Update: {
          bot_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_vip?: boolean | null
          name?: string
          telegram_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "groups_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bot_id: string | null
          created_at: string | null
          expires_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          method: string
          plan_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_telegram_id: string
        }
        Insert: {
          amount: number
          bot_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          method: string
          plan_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_telegram_id: string
        }
        Update: {
          amount?: number
          bot_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          method?: string
          plan_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          bot_id: string | null
          created_at: string | null
          days_access: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          period: string
          price: number
          updated_at: string | null
        }
        Insert: {
          bot_id?: string | null
          created_at?: string | null
          days_access: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          period: string
          price: number
          updated_at?: string | null
        }
        Update: {
          bot_id?: string | null
          created_at?: string | null
          days_access?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          period?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          bot_id: string | null
          created_at: string | null
          id: string
          message: string
          payment_id: string | null
          scheduled_for: string
          sent: boolean | null
          sent_at: string | null
          user_telegram_id: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          payment_id?: string | null
          scheduled_for: string
          sent?: boolean | null
          sent_at?: string | null
          user_telegram_id: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          payment_id?: string | null
          scheduled_for?: string
          sent?: boolean | null
          sent_at?: string | null
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount: number
          bot_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          plan_id: string | null
          user_telegram_id: string
        }
        Insert: {
          amount: number
          bot_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          user_telegram_id: string
        }
        Update: {
          amount?: number
          bot_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          user_telegram_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          telegram_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          telegram_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          telegram_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never 