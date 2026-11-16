import React, { createContext, useContext, useState, useEffect } from 'react';
import { Employee, Settings } from '../types';
import { api } from '../api';

interface AuthContextType {
  role: 'staff' | 'owner';
  currentStaff: Employee | null;
  employees: Employee[];
  isOwnerAuthenticated: boolean;
  ownerName: string;
  ownerModalOpen: boolean;
  setOwnerModalOpen: (open: boolean) => void;
  selectStaff: (employee: Employee, rememberOnDevice: boolean) => void;
  switchStaff: () => void;
  loginAsOwner: (password: string) => Promise<boolean>;
  logoutOwner: () => void;
  refreshEmployees: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<'staff' | 'owner'>('staff');
  const [currentStaff, setCurrentStaff] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState<boolean>(false);
  const [ownerName, setOwnerName] = useState<string>('Abhigit');
  const [ownerModalOpen, setOwnerModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshEmployees = async () => {
    try {
      const [list, settings] = await Promise.all([api.getEmployees(), api.getSettings()]);
      setEmployees(list);
      if (settings?.owner_name) {
        setOwnerName(settings.owner_name);
      }

      // Check owner authentication in localStorage
      const savedOwner = localStorage.getItem('mp_owner_authenticated');
      if (savedOwner === 'true') {
        setIsOwnerAuthenticated(true);
      }

      // Check remembered staff in localStorage
      const savedStaffId = localStorage.getItem('mp_remembered_staff_id');
      if (savedStaffId) {
        const found = list.find((e) => e.id === Number(savedStaffId));
        if (found) {
          setCurrentStaff(found);
        }
      }
    } catch (err) {
      console.error('Failed to initialize auth state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshEmployees();
  }, []);

  const selectStaff = (employee: Employee, rememberOnDevice: boolean) => {
    setCurrentStaff(employee);
    setRole('staff');
    if (rememberOnDevice) {
      localStorage.setItem('mp_remembered_staff_id', String(employee.id));
    } else {
      localStorage.removeItem('mp_remembered_staff_id');
    }
  };

  const switchStaff = () => {
    setCurrentStaff(null);
    localStorage.removeItem('mp_remembered_staff_id');
  };

  const loginAsOwner = async (password: string): Promise<boolean> => {
    try {
      const res = await api.ownerLogin(password);
      if (res.authenticated) {
        setIsOwnerAuthenticated(true);
        setRole('owner');
        setOwnerModalOpen(false);
        localStorage.setItem('mp_owner_authenticated', 'true');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logoutOwner = () => {
    setIsOwnerAuthenticated(false);
    localStorage.removeItem('mp_owner_authenticated');
    setRole('staff');
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        currentStaff,
        employees,
        isOwnerAuthenticated,
        ownerName,
        ownerModalOpen,
        setOwnerModalOpen,
        selectStaff,
        switchStaff,
        loginAsOwner,
        logoutOwner,
        refreshEmployees,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
