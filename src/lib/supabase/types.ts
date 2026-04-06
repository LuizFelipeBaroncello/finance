export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  finance: {
    Tables: {
      client: {
        Row: {
          client_id: number
          client_name: string
          email: string
          auth_user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          client_id?: number
          client_name: string
          email: string
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: number
          client_name?: string
          email?: string
          auth_user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      account: {
        Row: {
          account_id: number
          account_name: string
          description: string
          client_id: number
          institution_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          account_id?: number
          account_name: string
          description: string
          client_id: number
          institution_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          account_id?: number
          account_name?: string
          description?: string
          client_id?: number
          institution_id?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_account_client"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_account_institution"
            columns: ["institution_id"]
            referencedRelation: "institution"
            referencedColumns: ["institution_id"]
          }
        ]
      }
      category: {
        Row: {
          category_id: number
          category_name: string
          client_id: number
          parent_category_id: number | null
          type: Database["finance"]["Enums"]["transaction_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          category_id?: number
          category_name: string
          client_id: number
          parent_category_id?: number | null
          type?: Database["finance"]["Enums"]["transaction_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: number
          category_name?: string
          client_id?: number
          parent_category_id?: number | null
          type?: Database["finance"]["Enums"]["transaction_type"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_category_client"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fk_category_parent"
            columns: ["parent_category_id"]
            referencedRelation: "category"
            referencedColumns: ["category_id"]
          }
        ]
      }
      transaction: {
        Row: {
          trans_id: number
          account_id: number
          date: string
          description: string
          amount: number
          type: Database["finance"]["Enums"]["transaction_type"]
          created_at: string
          updated_at: string
        }
        Insert: {
          trans_id?: number
          account_id: number
          date: string
          description: string
          amount: number
          type: Database["finance"]["Enums"]["transaction_type"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          trans_id?: number
          account_id?: number
          date?: string
          description?: string
          amount?: number
          type?: Database["finance"]["Enums"]["transaction_type"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_transaction_account"
            columns: ["account_id"]
            referencedRelation: "account"
            referencedColumns: ["account_id"]
          }
        ]
      }
      re_category_transaction: {
        Row: {
          trans_id: number
          category_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          trans_id: number
          category_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          trans_id?: number
          category_id?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_recat_trans"
            columns: ["trans_id"]
            referencedRelation: "transaction"
            referencedColumns: ["trans_id"]
          },
          {
            foreignKeyName: "fk_recat_category"
            columns: ["category_id"]
            referencedRelation: "category"
            referencedColumns: ["category_id"]
          }
        ]
      }
      institution: {
        Row: {
          institution_id: number
          client_id: number
          name: string
          type: Database["finance"]["Enums"]["institution_type"]
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          institution_id?: number
          client_id: number
          name: string
          type?: Database["finance"]["Enums"]["institution_type"]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          institution_id?: number
          client_id?: number
          name?: string
          type?: Database["finance"]["Enums"]["institution_type"]
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "institution_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          }
        ]
      }
      fixed_income: {
        Row: {
          fixed_income_id: number
          client_id: number
          institution_id: number | null
          name: string
          type: Database["finance"]["Enums"]["fixed_income_type"]
          invested_amount: number
          rate_type: Database["finance"]["Enums"]["rate_type"]
          rate_value: number
          investment_date: string
          maturity_date: string | null
          expected_return: number | null
          is_redeemed: boolean
          redemption_date: string | null
          redemption_amount: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          fixed_income_id?: number
          client_id: number
          institution_id?: number | null
          name: string
          type: Database["finance"]["Enums"]["fixed_income_type"]
          invested_amount: number
          rate_type: Database["finance"]["Enums"]["rate_type"]
          rate_value: number
          investment_date: string
          maturity_date?: string | null
          expected_return?: number | null
          is_redeemed?: boolean
          redemption_date?: string | null
          redemption_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          fixed_income_id?: number
          client_id?: number
          institution_id?: number | null
          name?: string
          type?: Database["finance"]["Enums"]["fixed_income_type"]
          invested_amount?: number
          rate_type?: Database["finance"]["Enums"]["rate_type"]
          rate_value?: number
          investment_date?: string
          maturity_date?: string | null
          expected_return?: number | null
          is_redeemed?: boolean
          redemption_date?: string | null
          redemption_amount?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fixed_income_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fixed_income_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institution"
            referencedColumns: ["institution_id"]
          }
        ]
      }
      variable_income: {
        Row: {
          variable_income_id: number
          client_id: number
          institution_id: number | null
          asset_type: Database["finance"]["Enums"]["asset_type"]
          ticker: string
          name: string
          quantity: number
          avg_price: number
          total_invested: number
          investment_date: string
          is_sold: boolean
          sell_date: string | null
          sell_price: number | null
          sell_total: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          variable_income_id?: number
          client_id: number
          institution_id?: number | null
          asset_type: Database["finance"]["Enums"]["asset_type"]
          ticker: string
          name: string
          quantity: number
          avg_price: number
          total_invested: number
          investment_date: string
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          sell_total?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          variable_income_id?: number
          client_id?: number
          institution_id?: number | null
          asset_type?: Database["finance"]["Enums"]["asset_type"]
          ticker?: string
          name?: string
          quantity?: number
          avg_price?: number
          total_invested?: number
          investment_date?: string
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          sell_total?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "variable_income_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "variable_income_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institution"
            referencedColumns: ["institution_id"]
          }
        ]
      }
      real_estate: {
        Row: {
          real_estate_id: number
          client_id: number
          name: string
          property_type: Database["finance"]["Enums"]["property_type"]
          address: string | null
          purchase_date: string
          purchase_price: number
          current_estimated_value: number | null
          is_financed: boolean
          is_rental: boolean
          monthly_rental_income: number | null
          is_sold: boolean
          sell_date: string | null
          sell_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          real_estate_id?: number
          client_id: number
          name: string
          property_type: Database["finance"]["Enums"]["property_type"]
          address?: string | null
          purchase_date: string
          purchase_price: number
          current_estimated_value?: number | null
          is_financed?: boolean
          is_rental?: boolean
          monthly_rental_income?: number | null
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          real_estate_id?: number
          client_id?: number
          name?: string
          property_type?: Database["finance"]["Enums"]["property_type"]
          address?: string | null
          purchase_date?: string
          purchase_price?: number
          current_estimated_value?: number | null
          is_financed?: boolean
          is_rental?: boolean
          monthly_rental_income?: number | null
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_estate_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          }
        ]
      }
      vehicle: {
        Row: {
          vehicle_id: number
          client_id: number
          name: string
          vehicle_type: Database["finance"]["Enums"]["vehicle_type"]
          brand: string | null
          model: string | null
          year: number | null
          purchase_date: string
          purchase_price: number
          current_estimated_value: number | null
          is_financed: boolean
          is_sold: boolean
          sell_date: string | null
          sell_price: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          vehicle_id?: number
          client_id: number
          name: string
          vehicle_type: Database["finance"]["Enums"]["vehicle_type"]
          brand?: string | null
          model?: string | null
          year?: number | null
          purchase_date: string
          purchase_price: number
          current_estimated_value?: number | null
          is_financed?: boolean
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          vehicle_id?: number
          client_id?: number
          name?: string
          vehicle_type?: Database["finance"]["Enums"]["vehicle_type"]
          brand?: string | null
          model?: string | null
          year?: number | null
          purchase_date?: string
          purchase_price?: number
          current_estimated_value?: number | null
          is_financed?: boolean
          is_sold?: boolean
          sell_date?: string | null
          sell_price?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          }
        ]
      }
      liability: {
        Row: {
          liability_id: number
          client_id: number
          institution_id: number | null
          name: string
          type: Database["finance"]["Enums"]["liability_type"]
          original_amount: number
          outstanding_balance: number
          interest_rate: number | null
          interest_rate_period: Database["finance"]["Enums"]["rate_period"] | null
          total_installments: number | null
          paid_installments: number
          installment_amount: number | null
          start_date: string
          end_date: string | null
          real_estate_id: number | null
          vehicle_id: number | null
          is_paid_off: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          liability_id?: number
          client_id: number
          institution_id?: number | null
          name: string
          type: Database["finance"]["Enums"]["liability_type"]
          original_amount: number
          outstanding_balance: number
          interest_rate?: number | null
          interest_rate_period?: Database["finance"]["Enums"]["rate_period"] | null
          total_installments?: number | null
          paid_installments?: number
          installment_amount?: number | null
          start_date: string
          end_date?: string | null
          real_estate_id?: number | null
          vehicle_id?: number | null
          is_paid_off?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          liability_id?: number
          client_id?: number
          institution_id?: number | null
          name?: string
          type?: Database["finance"]["Enums"]["liability_type"]
          original_amount?: number
          outstanding_balance?: number
          interest_rate?: number | null
          interest_rate_period?: Database["finance"]["Enums"]["rate_period"] | null
          total_installments?: number | null
          paid_installments?: number
          installment_amount?: number | null
          start_date?: string
          end_date?: string | null
          real_estate_id?: number | null
          vehicle_id?: number | null
          is_paid_off?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liability_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "liability_institution_id_fkey"
            columns: ["institution_id"]
            referencedRelation: "institution"
            referencedColumns: ["institution_id"]
          },
          {
            foreignKeyName: "liability_real_estate_id_fkey"
            columns: ["real_estate_id"]
            referencedRelation: "real_estate"
            referencedColumns: ["real_estate_id"]
          },
          {
            foreignKeyName: "liability_vehicle_id_fkey"
            columns: ["vehicle_id"]
            referencedRelation: "vehicle"
            referencedColumns: ["vehicle_id"]
          }
        ]
      }
      liability_payment: {
        Row: {
          payment_id: number
          liability_id: number
          client_id: number
          payment_date: string
          amount: number
          principal: number | null
          interest: number | null
          installment_number: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          payment_id?: number
          liability_id: number
          client_id: number
          payment_date: string
          amount: number
          principal?: number | null
          interest?: number | null
          installment_number?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          payment_id?: number
          liability_id?: number
          client_id?: number
          payment_date?: string
          amount?: number
          principal?: number | null
          interest?: number | null
          installment_number?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liability_payment_liability_id_fkey"
            columns: ["liability_id"]
            referencedRelation: "liability"
            referencedColumns: ["liability_id"]
          },
          {
            foreignKeyName: "liability_payment_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "client"
            referencedColumns: ["client_id"]
          }
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
      transaction_type: "debit" | "credit" | "transfer"
      institution_type: "bank" | "broker" | "fintech" | "other"
      fixed_income_type: "cdb" | "lci" | "lca" | "tesouro_selic" | "tesouro_ipca" | "tesouro_prefixado" | "debenture" | "cri" | "cra" | "other"
      rate_type: "pre" | "pre_ipca" | "pos_cdi" | "pos_ipca" | "pos_selic"
      asset_type: "stock" | "fii" | "etf" | "crypto" | "bdr" | "other"
      property_type: "apartment" | "house" | "land" | "commercial" | "other"
      vehicle_type: "car" | "motorcycle" | "truck" | "other"
      liability_type: "mortgage" | "vehicle_loan" | "personal_loan" | "credit_card" | "student_loan" | "other"
      rate_period: "monthly" | "yearly"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      [_ in never]: never
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

type FinanceSchema = Database["finance"]

// Helper types for the finance schema
export type Tables<T extends keyof FinanceSchema["Tables"]> = FinanceSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof FinanceSchema["Tables"]> = FinanceSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof FinanceSchema["Tables"]> = FinanceSchema["Tables"][T]["Update"]
export type Enums<T extends keyof FinanceSchema["Enums"]> = FinanceSchema["Enums"][T]
