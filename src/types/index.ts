export interface Category {
  id: string;
  name: string;
  nameZh?: string;
  slug: string;
  parentId?: string;
  icon?: string;
  children?: Category[];
  count?: number;
}

export interface Company {
  id: string;
  name: string;
  nameZh?: string;
  country?: string;
  logo?: string;
}

export interface BrowseItem {
  id: string;
  label: string;
  labelZh?: string;
  count: number;
  meta?: string;
}

export type CertificateStatus = "ACTIVE" | "EXPIRED" | "PENDING";
export type ReviewStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface Certificate {
  id: string;
  name: string;
  nameZh?: string;
  productName: string;
  productNameZh?: string;
  certifiedType: string;
  description?: string;
  descriptionZh?: string;
  categoryId: string;
  category?: Category;
  companyId?: string;
  company?: Company;
  model: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string;
  reviewStatus: ReviewStatus;
  uploadedBy: string;
  auditStatusNote?: string;
  pdfUrl?: string;
  imageUrl?: string;
  previewImages?: string[];
  languages: string[];
  status: CertificateStatus;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  certificates: Certificate[];
  total: number;
  page: number;
  pageSize: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: "USER" | "ADMIN";
}
