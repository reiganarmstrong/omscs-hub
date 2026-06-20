export type Bindings = Env;

export type Variables = {
  authUser: AuthUser;
};

export type AuthUser = {
  id: string;
  primaryEmail: string;
  emailDomain: string;
};

export type ReviewSource = "omscentral" | "app";

export type ReviewRow = {
  id: string;
  course_id: string;
  source: ReviewSource;
  semester_label: string;
  body: string;
  difficulty: number | null;
  workload: number | null;
  rating: number | null;
  recommend: number | null;
  program_stage: "First" | "Mid" | "Late" | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  user_id?: string | null;
  source_url?: string | null;
  source_author_hash?: string | null;
};
