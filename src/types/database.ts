// Types générés automatiquement depuis le schéma Supabase (project_id: xwlaipdlskpslvwgreqm)
// Ne pas éditer manuellement — régénérer via Supabase MCP (generate_typescript_types)
// après toute modification du schéma.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      assessment_exports: {
        Row: {
          enrollment_id: string
          file_url: string | null
          format: string
          generated_at: string
          id: string
          user_id: string
        }
        Insert: {
          enrollment_id: string
          file_url?: string | null
          format: string
          generated_at?: string
          id?: string
          user_id: string
        }
        Update: {
          enrollment_id?: string
          file_url?: string | null
          format?: string
          generated_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_exports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_progress_view"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "assessment_exports_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          course_id: string
          course_title: string
          duration_hours: number
          email_sent: boolean
          email_sent_at: string | null
          enrollment_id: string
          final_score: number
          formateur_name: string
          id: string
          issued_at: string
          pdf_url: string | null
          user_id: string
          verify_token: string
        }
        Insert: {
          course_id: string
          course_title?: string
          duration_hours?: number
          email_sent?: boolean
          email_sent_at?: string | null
          enrollment_id: string
          final_score: number
          formateur_name?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id: string
          verify_token?: string
        }
        Update: {
          course_id?: string
          course_title?: string
          duration_hours?: number
          email_sent?: boolean
          email_sent_at?: string | null
          enrollment_id?: string
          final_score?: number
          formateur_name?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id?: string
          verify_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_progress_view"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_ratings: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          certificate_enabled: boolean
          created_at: string
          description: string
          duration_hours: number
          enrolled_count: number
          formateur_id: string
          id: string
          is_free: boolean
          language: string
          level: string
          max_attempts_final: number
          objectives: string[]
          pass_score_final: number
          prerequisites: string[]
          price_fcfa: number
          promo_video_url: string | null
          published_at: string | null
          rating_avg: number
          rating_count: number
          short_description: string
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          certificate_enabled?: boolean
          created_at?: string
          description?: string
          duration_hours?: number
          enrolled_count?: number
          formateur_id: string
          id?: string
          is_free?: boolean
          language?: string
          level?: string
          max_attempts_final?: number
          objectives?: string[]
          pass_score_final?: number
          prerequisites?: string[]
          price_fcfa?: number
          promo_video_url?: string | null
          published_at?: string | null
          rating_avg?: number
          rating_count?: number
          short_description?: string
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          certificate_enabled?: boolean
          created_at?: string
          description?: string
          duration_hours?: number
          enrolled_count?: number
          formateur_id?: string
          id?: string
          is_free?: boolean
          language?: string
          level?: string
          max_attempts_final?: number
          objectives?: string[]
          pass_score_final?: number
          prerequisites?: string[]
          price_fcfa?: number
          promo_video_url?: string | null
          published_at?: string | null
          rating_avg?: number
          rating_count?: number
          short_description?: string
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_formateur_id_fkey"
            columns: ["formateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          progress_pct: number
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          user_id: string
          validated_at: string | null
          validated_by: string | null
          validation_note: string | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          progress_pct?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          user_id?: string
          validated_at?: string | null
          validated_by?: string | null
          validation_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_results: {
        Row: {
          answers_json: Json
          attempt_number: number
          enrollment_id: string | null
          exercise_id: string
          id: string
          passed: boolean
          score: number
          submitted_at: string
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          answers_json?: Json
          attempt_number?: number
          enrollment_id?: string | null
          exercise_id: string
          id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          answers_json?: Json
          attempt_number?: number
          enrollment_id?: string | null
          exercise_id?: string
          id?: string
          passed?: boolean
          score?: number
          submitted_at?: string
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_results_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_progress_view"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "exercise_results_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          instructions: string
          is_final_exam: boolean
          max_attempts: number
          pass_score: number
          questions: Json
          retry_delay_hours: number
          session_id: string | null
          show_feedback_immediately: boolean
          shuffle_answers: boolean
          shuffle_questions: boolean
          time_limit_minutes: number | null
          title: string
          type: Database["public"]["Enums"]["exercise_type"]
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructions?: string
          is_final_exam?: boolean
          max_attempts?: number
          pass_score?: number
          questions?: Json
          retry_delay_hours?: number
          session_id?: string | null
          show_feedback_immediately?: boolean
          shuffle_answers?: boolean
          shuffle_questions?: boolean
          time_limit_minutes?: number | null
          title: string
          type?: Database["public"]["Enums"]["exercise_type"]
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          instructions?: string
          is_final_exam?: boolean
          max_attempts?: number
          pass_score?: number
          questions?: Json
          retry_delay_hours?: number
          session_id?: string | null
          show_feedback_immediately?: boolean
          shuffle_answers?: boolean
          shuffle_questions?: boolean
          time_limit_minutes?: number | null
          title?: string
          type?: Database["public"]["Enums"]["exercise_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercises_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      learner_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          updated_at: string
          user_id: string
          video_timestamp_seconds: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          updated_at?: string
          user_id: string
          video_timestamp_seconds?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          updated_at?: string
          user_id?: string
          video_timestamp_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learner_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learner_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string
          description: string
          id: string
          is_free_preview: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string
          id?: string
          is_free_preview?: boolean
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          is_free_preview?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          max_seats: number
          name: string
          plan: string
          type: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_seats?: number
          name: string
          plan?: string
          type?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_seats?: number
          name?: string
          plan?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_fcfa: number
          course_id: string
          created_at: string
          currency: string
          enrollment_id: string | null
          id: string
          metadata: Json
          notes: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_fcfa: number
          course_id: string
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_fcfa?: number
          course_id?: string
          created_at?: string
          currency?: string
          enrollment_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_progress_view"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          org_id: string | null
          organization_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id: string
          is_active?: boolean
          org_id?: string | null
          organization_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          org_id?: string | null
          organization_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          enrollment_id: string
          id: string
          is_completed: boolean
          last_position_seconds: number
          session_id: string
          time_spent_seconds: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          id?: string
          is_completed?: boolean
          last_position_seconds?: number
          session_id: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          id?: string
          is_completed?: boolean
          last_position_seconds?: number
          session_id?: string
          time_spent_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollment_progress_view"
            referencedColumns: ["enrollment_id"]
          },
          {
            foreignKeyName: "session_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_progress_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          content_text: string | null
          content_url: string | null
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_free_preview: boolean
          module_id: string
          order_index: number
          resources: Json
          title: string
          type: Database["public"]["Enums"]["session_type"]
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_free_preview?: boolean
          module_id: string
          order_index?: number
          resources?: Json
          title: string
          type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_free_preview?: boolean
          module_id?: string
          order_index?: number
          resources?: Json
          title?: string
          type?: Database["public"]["Enums"]["session_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      enrollment_progress_view: {
        Row: {
          completed_sessions: number | null
          course_id: string | null
          enrollment_id: string | null
          progress_pct: number | null
          status: Database["public"]["Enums"]["enrollment_status"] | null
          total_sessions: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_course_completion: {
        Args: { p_enrollment_id: string }
        Returns: boolean
      }
      get_certificate_by_id: {
        Args: { p_id: string }
        Returns: {
          course_title: string
          duration_hours: number
          final_score: number
          formateur_name: string
          id: string
          issued_at: string
          student_name: string
          verify_token: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_enrolled: { Args: { p_course_id: string }; Returns: boolean }
      is_formateur: { Args: never; Returns: boolean }
      verify_certificate_by_token: {
        Args: { p_token: string }
        Returns: {
          course_title: string
          duration_hours: number
          final_score: number
          formateur_name: string
          id: string
          issued_at: string
          student_name: string
        }[]
      }
    }
    Enums: {
      course_status: "brouillon" | "en_revision" | "publie" | "archive"
      enrollment_status: "en_attente" | "actif" | "complete" | "suspendu"
      exercise_type:
        | "qcm"
        | "vrai_faux"
        | "texte_a_trous"
        | "association"
        | "ordre"
        | "reponse_courte"
        | "upload"
      payment_provider:
        | "pawapay"
        | "airtel"
        | "moov"
        | "mtn"
        | "wave"
        | "orange"
        | "cinetpay"
        | "stripe"
        | "paypal"
        | "especes"
        | "autre"
      payment_status: "en_attente" | "valide" | "rembourse" | "echoue"
      session_type: "texte" | "video" | "audio" | "pdf" | "slides" | "live"
      user_role: "apprenant" | "formateur" | "institution" | "admin"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      course_status: ["brouillon", "en_revision", "publie", "archive"],
      enrollment_status: ["en_attente", "actif", "complete", "suspendu"],
      exercise_type: [
        "qcm",
        "vrai_faux",
        "texte_a_trous",
        "association",
        "ordre",
        "reponse_courte",
        "upload",
      ],
      payment_provider: [
        "pawapay",
        "airtel",
        "moov",
        "mtn",
        "wave",
        "orange",
        "cinetpay",
        "stripe",
        "paypal",
        "especes",
        "autre",
      ],
      payment_status: ["en_attente", "valide", "rembourse", "echoue"],
      session_type: ["texte", "video", "audio", "pdf", "slides", "live"],
      user_role: ["apprenant", "formateur", "institution", "admin"],
    },
  },
} as const
