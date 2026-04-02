// Supabase Database Types
// These types are generated based on your Supabase schema
// You can regenerate these types using the Supabase CLI or by updating them manually

export interface Database {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          fullname: string;
          email: string;
          subject: string;
          message: string;
          ip_address: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          fullname: string;
          email: string;
          subject: string;
          message: string;
          ip_address: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          fullname?: string;
          email?: string;
          subject?: string;
          message?: string;
          ip_address?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      temoignage: {
        Row: {
          id: string;
          name: string;
          message: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          message: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          message?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}