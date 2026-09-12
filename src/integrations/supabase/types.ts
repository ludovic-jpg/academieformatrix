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
      coffre_fichiers: {
        Row: {
          chemin: string
          created_at: string
          formateur_id: string
          formation_id: string
          id: string
          nom: string
          taille: number
        }
        Insert: {
          chemin: string
          created_at?: string
          formateur_id: string
          formation_id: string
          id?: string
          nom: string
          taille?: number
        }
        Update: {
          chemin?: string
          created_at?: string
          formateur_id?: string
          formation_id?: string
          id?: string
          nom?: string
          taille?: number
        }
        Relationships: [
          {
            foreignKeyName: "coffre_fichiers_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      formations: {
        Row: {
          created_at: string
          duree_heures: number
          formateur_id: string
          id: string
          niveau: string
          programme: Json
          titre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duree_heures?: number
          formateur_id: string
          id?: string
          niveau?: string
          programme: Json
          titre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duree_heures?: number
          formateur_id?: string
          id?: string
          niveau?: string
          programme?: Json
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      partages_coffre: {
        Row: {
          actif: boolean
          created_at: string
          formateur_id: string
          formation_id: string
          id: string
          jeton: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          formateur_id: string
          formation_id: string
          id?: string
          jeton: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          formateur_id?: string
          formation_id?: string
          id?: string
          jeton?: string
        }
        Relationships: [
          {
            foreignKeyName: "partages_coffre_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      pieces_formateur: {
        Row: {
          chemin: string
          created_at: string
          formateur_id: string
          id: string
          nom_fichier: string
          type: Database["public"]["Enums"]["type_piece"]
        }
        Insert: {
          chemin: string
          created_at?: string
          formateur_id: string
          id?: string
          nom_fichier: string
          type: Database["public"]["Enums"]["type_piece"]
        }
        Update: {
          chemin?: string
          created_at?: string
          formateur_id?: string
          id?: string
          nom_fichier?: string
          type?: Database["public"]["Enums"]["type_piece"]
        }
        Relationships: []
      }
      profils_formateurs: {
        Row: {
          adresse: string
          consentement: boolean
          consentement_at: string | null
          created_at: string
          email: string
          nom: string
          numero_declaration_activite: string
          photo_url: string
          prenom: string
          siret: string
          statut: Database["public"]["Enums"]["statut_candidature"]
          telephone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adresse?: string
          consentement?: boolean
          consentement_at?: string | null
          created_at?: string
          email: string
          nom?: string
          numero_declaration_activite?: string
          photo_url?: string
          prenom?: string
          siret?: string
          statut?: Database["public"]["Enums"]["statut_candidature"]
          telephone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adresse?: string
          consentement?: boolean
          consentement_at?: string | null
          created_at?: string
          email?: string
          nom?: string
          numero_declaration_activite?: string
          photo_url?: string
          prenom?: string
          siret?: string
          statut?: Database["public"]["Enums"]["statut_candidature"]
          telephone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaires: {
        Row: {
          created_at: string
          formateur_id: string
          formation_id: string
          id: string
          questions: Json
          titre: string
          type: Database["public"]["Enums"]["type_questionnaire"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          formateur_id: string
          formation_id: string
          id?: string
          questions: Json
          titre?: string
          type: Database["public"]["Enums"]["type_questionnaire"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          formateur_id?: string
          formation_id?: string
          id?: string
          questions?: Json
          titre?: string
          type?: Database["public"]["Enums"]["type_questionnaire"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "formateur"
      statut_candidature: "en_attente" | "validee" | "refusee"
      type_piece: "cv" | "diplome" | "identite" | "casier" | "autre"
      type_questionnaire: "positionnement" | "acquis"
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
      app_role: ["admin", "formateur"],
      statut_candidature: ["en_attente", "validee", "refusee"],
      type_piece: ["cv", "diplome", "identite", "casier", "autre"],
      type_questionnaire: ["positionnement", "acquis"],
    },
  },
} as const
