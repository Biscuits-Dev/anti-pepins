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
      temoignages: {
        Row: {
          id: string;
          prenom: string;
          age: number;
          scam_type: 'phishing' | 'romance' | 'fake-shop' | 'investment' | 'tech-support' | 'sms-livraison' | 'lottery' | 'fake-job' | 'identity' | 'harassment' | 'autre';
          incident_date: string;
          content: string;
          ip_address: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          prenom: string;
          age: number;
          scam_type: 'phishing' | 'romance' | 'fake-shop' | 'investment' | 'tech-support' | 'sms-livraison' | 'lottery' | 'fake-job' | 'identity' | 'harassment' | 'autre';
          incident_date: string;
          content: string;
          ip_address: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          prenom?: string;
          age?: number;
          scam_type?: 'phishing' | 'romance' | 'fake-shop' | 'investment' | 'tech-support' | 'sms-livraison' | 'lottery' | 'fake-job' | 'identity' | 'harassment' | 'autre';
          incident_date?: string;
          content?: string;
          ip_address?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          text: string;
          sender: 'user' | 'admin';
          timestamp: string;
        };
        Insert: {
          id: string;
          session_id: string;
          text: string;
          sender: 'user' | 'admin';
          timestamp: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          text?: string;
          sender?: 'user' | 'admin';
          timestamp?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
