// ── Supabase lib ──────────────────────────────────────────────────────────────
declare module '*/supabase.js' {
  import { SupabaseClient } from '@supabase/supabase-js';

  export const supabase: SupabaseClient;

  export interface ResourceData {
    id: string;
    title: string;
    type: string;
    department: string;
    semester: number;
    courseCode: string;
    courseName: string;
    link: string;
    uploadedBy: string;
    uploadedAt: string;
    description: string;
    reportCount: number;
    status: string;
    adminNote: string;
    reviewedAt?: string;
  }

  // Public API
  export function submitResource(data: Partial<ResourceData>): Promise<{ id: string; success: boolean; error?: string }>;
  export function getResources(filters?: {
    department?: string;
    semester?: number;
    courseCode?: string;
    type?: string;
    limitCount?: number;
  }): Promise<ResourceData[]>;
  export function getRecentResources(count?: number): Promise<ResourceData[]>;
  export function reportResource(id: string): Promise<boolean>;
  export function searchResources(query: string, filters?: {
    type?: string;
    department?: string;
    semester?: string | number;
    courseCode?: string;
  }): Promise<ResourceData[]>;
  export function getDeptResourceCounts(): Promise<Record<string, number>>;
  export function getTotalResourceCount(): Promise<number>;
  export function getContributorCount(): Promise<number>;

  // Contact API
  export function submitContactRequest(data: {
    name: string;
    email: string;
    type: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; error?: string }>;

  // Admin API
  export function adminGetResources(status?: string, dept?: string | null): Promise<{ data: ResourceData[]; error: string | null }>;
  export function adminApproveResource(id: string, note?: string): Promise<{ success: boolean; error?: string }>;
  export function adminRejectResource(id: string, note?: string): Promise<{ success: boolean; error?: string }>;
  export function adminDeleteResource(id: string): Promise<{ success: boolean; error?: string }>;
  export function adminDismissFlags(id: string): Promise<{ success: boolean; error?: string }>;
  export function adminGetStats(dept?: string | null): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
    total: number;
    daily: Array<{ date: string; count: number }>;
  }>;
  export function adminGetContactSubmissions(): Promise<{ data: any[]; error: string | null }>;
  export function adminDeleteContactSubmission(id: string): Promise<{ success: boolean; error?: string }>;
  export function adminMarkSubmissionRead(id: string): Promise<{ success: boolean; error?: string }>;

  // Category Management API
  export function adminGetDepartments(): Promise<{ data: any[]; error: string | null }>;
  export function adminCreateDepartment(name: string, description?: string, sortOrder?: number): Promise<{ success: boolean; data?: any; error?: string }>;
  export function adminUpdateDepartment(id: string, name: string, description?: string, sortOrder?: number, isActive?: boolean): Promise<{ success: boolean; data?: any; error?: string }>;
  export function adminDeleteDepartment(id: string): Promise<{ success: boolean; error?: string }>;
  export function adminGetCourses(departmentId?: string | null): Promise<{ data: any[]; error: string | null }>;
  export function adminCreateCourse(departmentId: string, semester: number, code: string, name: string, creditHours?: number): Promise<{ success: boolean; data?: any; error?: string }>;
  export function adminUpdateCourse(id: string, semester: number, code: string, name: string, creditHours?: number, isActive?: boolean): Promise<{ success: boolean; data?: any; error?: string }>;
  export function adminDeleteCourse(id: string): Promise<{ success: boolean; error?: string }>;
  export function adminBulkImportCourses(departmentId: string, courses: any[]): Promise<{ success: boolean; inserted?: number; skipped?: number; error?: string }>;
  
  // Moderator Management API
  export function adminGetModerators(): Promise<{ data: any[]; error: string | null }>;
  export function adminCreateModerator(key: string, dept: string, name?: string): Promise<{ success: boolean; error?: string }>;
  export function adminDeleteModerator(id: string): Promise<{ success: boolean; error?: string }>;

  // Auth
  export function adminLogin(password: string): Promise<boolean>;
  export function adminLogout(): void;
  export function isAdminLoggedIn(): boolean;
  export function getAdminSession(): any;
}

// ── Courses data ──────────────────────────────────────────────────────────────
declare module '*/courses.js' {
  export interface CourseEntry { code: string; name: string; ch: number }
  export type SemesterMap = { [semester: string]: CourseEntry[] };
  export type DepartmentMap = { [department: string]: SemesterMap };
  export const departments: DepartmentMap;
  export const departmentList: string[];
  export const resourceTypes: string[];
  export const resourceTypeBadgeColors: Record<string, { bg: string; text: string }>;
}
