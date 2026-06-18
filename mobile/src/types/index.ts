export interface User {
  id: string;
  phone_number: string | null;
  email: string | null;
  full_name: string | null;
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | "prescription"
  | "lab_report"
  | "scan"
  | "discharge_summary"
  | "other";

export interface ExtractedHealthData {
  id: string;
  document_id: string;
  extracted_text: string;
  key_values_json: {
    medicines?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
    }>;
    tests?: Array<{
      name: string;
      value?: string;
      reference_range?: string;
      unit?: string;
      status?: string;
    }>;
  };
  abnormal_flags_json: {
    alerts?: string[];
  };
  created_at: string;
}

export interface MedicalDocument {
  id: string;
  user_id: string;
  document_type: DocumentType;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  file_format: "pdf" | "png" | "jpg";
  document_date: string | null;
  uploaded_at: string;
  notes: string | null;
  tags: string[] | null;
  source_type: "camera" | "gallery" | "upload";
  created_at: string;
  updated_at: string;
  pre_signed_url: string | null;
  extracted_data: ExtractedHealthData | null;
}


export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  referenced_document_ids: string[] | null;
  created_at: string;
}

export interface AIConversation {
  id: string;
  session_title: string;
  created_at: string;
  updated_at: string;
  messages: AIMessage[];
}

export interface ShareLink {
  id: string;
  share_token: string;
  expires_at: string;
  is_active: boolean;
  share_url: string;
  document_ids: string[];
  created_at: string;
}
