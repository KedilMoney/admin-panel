export interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface BankMaster {
  id: number;
  name: string;
  slug: string;
  shortName: string;
  url?: string;
  blob_image?: string;
  imageUrl?: string;
  isGlobal: boolean;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  isGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  allocated?: number;
  available?: number;
  activity?: any[];
  assignedHistory?: any[];
  groupId?: string;
  groupName?: string;
  recurrenceType?: string;
  recurrenceInterval?: number;
  allocatedAmount?: number;
  carryForward?: boolean;
  description?: string;
  imageUrl?: string;
  details?: any;
}

export interface Group {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  isGlobal?: boolean;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  details?: any;
}

export interface CategoryGroup {
  id: string;
  name: string;
  isAutoCreated?: boolean;
  allocated?: number;
  available?: number;
  activity?: number;
  categories?: Category[];
}

export interface DashboardData {
  groups: CategoryGroup[];
  uncategorized: {
    amount: number;
    activity: any[];
  };
  summary: {
    assigned: number;
    activity: number;
    available: number;
    credit: number;
    debit: number;
    overspent: number;
    dateRange: {
      fromDate: string;
      toDate: string;
    };
  };
}

export interface Icon {
  id: string;
  slug: string;
  imageUrl?: string;
  blob_image?: string;
  searchTags?: string[];
  tags?: string; // Comma-separated tags for display
  isGlobal?: boolean;
  createdAt?: string;
  updatedAt?: string;
  created_by?: string;
  updated_by?: string;
}

