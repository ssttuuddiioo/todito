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
      activities: {
        Row: {
          contact_id: string | null
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          type: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: string
          last_contact: string | null
          name: string
          notes: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_contact?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string | null
          description: string | null
          id: string
          project_id: string | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string | null
          description?: string | null
          id?: string
          project_id?: string | null
          receipt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ignored_items: {
        Row: {
          id: string
          ignored_at: string | null
          item_data: Json
          item_type: string
        }
        Insert: {
          id?: string
          ignored_at?: string | null
          item_data: Json
          item_type: string
        }
        Update: {
          id?: string
          ignored_at?: string | null
          item_data?: Json
          item_type?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          contact_id: string | null
          created_at: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issue_date: string | null
          notes: string | null
          paid_date: string | null
          project_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contact_id?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issue_date?: string | null
          notes?: string | null
          paid_date?: string | null
          project_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notes_archive: {
        Row: {
          created_at: string | null
          id: string
          parsed_data: Json | null
          raw_text: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          parsed_data?: Json | null
          raw_text: string
        }
        Update: {
          created_at?: string | null
          id?: string
          parsed_data?: Json | null
          raw_text?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          contact_id: string | null
          created_at: string | null
          expected_close: string | null
          id: string
          notes: string | null
          probability: number | null
          stage: string | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          expected_close?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          expected_close?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          stage?: string | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          created_at: string | null
          deadline: string | null
          drive_folder_url: string | null
          id: string
          milestones: Json | null
          name: string
          next_milestone: string | null
          notes: string | null
          phase: string | null
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client?: string | null
          created_at?: string | null
          deadline?: string | null
          drive_folder_url?: string | null
          id?: string
          milestones?: Json | null
          name: string
          next_milestone?: string | null
          notes?: string | null
          phase?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client?: string | null
          created_at?: string | null
          deadline?: string | null
          drive_folder_url?: string | null
          id?: string
          milestones?: Json | null
          name?: string
          next_milestone?: string | null
          notes?: string | null
          phase?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          energy: string | null
          id: string
          is_mine: boolean | null
          order: number | null
          pomodoro_count: number | null
          priority: string | null
          project_id: string | null
          status: string | null
          subtitle: string | null
          team: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          energy?: string | null
          id?: string
          is_mine?: boolean | null
          order?: number | null
          pomodoro_count?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          subtitle?: string | null
          team?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assignee?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          energy?: string | null
          id?: string
          is_mine?: boolean | null
          order?: number | null
          pomodoro_count?: number | null
          priority?: string | null
          project_id?: string | null
          status?: string | null
          subtitle?: string | null
          team?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          billable: boolean | null
          created_at: string | null
          date: string | null
          description: string | null
          hours: number
          id: string
          project_id: string | null
          task_id: string | null
        }
        Insert: {
          billable?: boolean | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          hours: number
          id?: string
          project_id?: string | null
          task_id?: string | null
        }
        Update: {
          billable?: boolean | null
          created_at?: string | null
          date?: string | null
          description?: string | null
          hours?: number
          id?: string
          project_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Row"]

export type TablesInsert<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Insert"]

export type TablesUpdate<
  T extends keyof Database["public"]["Tables"]
> = Database["public"]["Tables"][T]["Update"]



