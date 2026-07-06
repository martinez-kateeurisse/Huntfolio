// Types for the Huntfolio database.
//
// These mirror the schema in supabase/migrations/0001_init.sql. They follow the
// shape that `supabase gen types typescript` produces, so once you have a live
// project you can regenerate this file to stay in sync:
//
//   npx supabase gen types typescript --project-id <ref> --schema public \
//     > lib/database.types.ts

type Timestamp = string;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      applications: {
        Row: {
          id: string;
          user_id: string;
          company: string;
          role_title: string;
          job_url: string | null;
          source: string | null;
          location: string | null;
          work_mode: string | null;
          salary_min: number | null;
          salary_max: number | null;
          salary_currency: string | null;
          status: string;
          close_reason: string | null;
          track: string | null;
          priority: string | null;
          date_saved: Timestamp | null;
          date_applied: Timestamp | null;
          notes: string | null;
          created_at: Timestamp | null;
          updated_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          company: string;
          role_title: string;
          job_url?: string | null;
          source?: string | null;
          location?: string | null;
          work_mode?: string | null;
          salary_min?: number | null;
          salary_max?: number | null;
          salary_currency?: string | null;
          status?: string;
          close_reason?: string | null;
          track?: string | null;
          priority?: string | null;
          date_saved?: Timestamp | null;
          date_applied?: Timestamp | null;
          notes?: string | null;
          created_at?: Timestamp | null;
          updated_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["applications"]["Insert"]>;
        Relationships: [];
      };
      status_history: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          from_status: string | null;
          to_status: string;
          changed_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          from_status?: string | null;
          to_status: string;
          changed_at?: Timestamp | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["status_history"]["Insert"]
        >;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          title: string;
          description: string | null;
          due_date: Timestamp | null;
          status: string | null;
          priority: string | null;
          created_at: Timestamp | null;
          updated_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          title: string;
          description?: string | null;
          due_date?: Timestamp | null;
          status?: string | null;
          priority?: string | null;
          created_at?: Timestamp | null;
          updated_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
        Relationships: [];
      };
      interviews: {
        Row: {
          id: string;
          user_id: string;
          application_id: string;
          type: string | null;
          scheduled_at: Timestamp | null;
          location: string | null;
          notes: string | null;
          outcome: string | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id: string;
          type?: string | null;
          scheduled_at?: Timestamp | null;
          location?: string | null;
          notes?: string | null;
          outcome?: string | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["interviews"]["Insert"]>;
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: string | null;
          version_label: string | null;
          file_url: string | null;
          is_default: boolean | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: string | null;
          version_label?: string | null;
          file_url?: string | null;
          is_default?: boolean | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["documents"]["Insert"]>;
        Relationships: [];
      };
      application_documents: {
        Row: {
          application_id: string;
          document_id: string;
          user_id: string;
        };
        Insert: {
          application_id: string;
          document_id: string;
          user_id: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["application_documents"]["Insert"]
        >;
        Relationships: [];
      };
      prep_notes: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          category: string | null;
          title: string | null;
          content: string | null;
          created_at: Timestamp | null;
          updated_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          category?: string | null;
          title?: string | null;
          content?: string | null;
          created_at?: Timestamp | null;
          updated_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["prep_notes"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          application_id: string | null;
          name: string;
          role: string | null;
          company: string | null;
          email: string | null;
          linkedin: string | null;
          notes: string | null;
          created_at: Timestamp | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          application_id?: string | null;
          name: string;
          role?: string | null;
          company?: string | null;
          email?: string | null;
          linkedin?: string | null;
          notes?: string | null;
          created_at?: Timestamp | null;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

// Convenience row aliases used across the app.
export type Application =
  Database["public"]["Tables"]["applications"]["Row"];
export type ApplicationInsert =
  Database["public"]["Tables"]["applications"]["Insert"];
export type ApplicationUpdate =
  Database["public"]["Tables"]["applications"]["Update"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type StatusHistory =
  Database["public"]["Tables"]["status_history"]["Row"];
export type Interview = Database["public"]["Tables"]["interviews"]["Row"];
export type InterviewInsert =
  Database["public"]["Tables"]["interviews"]["Insert"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type DocumentInsert =
  Database["public"]["Tables"]["documents"]["Insert"];
export type ApplicationDocument =
  Database["public"]["Tables"]["application_documents"]["Row"];
export type PrepNote = Database["public"]["Tables"]["prep_notes"]["Row"];
export type PrepNoteInsert =
  Database["public"]["Tables"]["prep_notes"]["Insert"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInsert =
  Database["public"]["Tables"]["contacts"]["Insert"];
