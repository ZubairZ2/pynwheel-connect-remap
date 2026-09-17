/** A company row on the Companies listing. camelCase, as models always are. */
export interface Company {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  locked: boolean;
  inactivate: boolean;
  pmsProviders: string[];
  regionCount: number;
  portfolioGroupCount: number;
  propertyCount: number;
  userCount: number;
  updatedAt: string | null;
}
