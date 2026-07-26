import React, { createContext, useContext, useState } from 'react';

// Define the Roles and their permissions mapping
export const ROLES = {
  INVESTIGATOR: {
    id: 'INVESTIGATOR',
    label: 'Investigator',
    description: 'Full case details + own cases. Limited access to systemic analytics.',
    allowedNav: ['/dashboard', '/dashboard/hotspots', '/dashboard/search', '/dashboard/network', '/dashboard/settings']
  },
  ANALYST: {
    id: 'ANALYST',
    label: 'Analyst',
    description: 'Analytics, patterns, anomalies. Limited PII access.',
    allowedNav: ['/dashboard', '/dashboard/analytics', '/dashboard/predictions', '/dashboard/financial', '/dashboard/socioeconomic', '/dashboard/search', '/dashboard/settings']
  },
  SUPERVISOR: {
    id: 'SUPERVISOR',
    label: 'Supervisor',
    description: 'Full access to all cases, analytics, and governance/audit logs.',
    allowedNav: ['/dashboard', '/dashboard/analytics', '/dashboard/hotspots', '/dashboard/network', '/dashboard/offenders', '/dashboard/predictions', '/dashboard/financial', '/dashboard/socioeconomic', '/dashboard/search', '/dashboard/governance', '/dashboard/settings', '/dashboard/assistant', '/dashboard/reports']
  },
  POLICYMAKER: {
    id: 'POLICYMAKER',
    label: 'Policymaker',
    description: 'Aggregate statistical views only. No individual case PII.',
    allowedNav: ['/dashboard', '/dashboard/analytics', '/dashboard/hotspots', '/dashboard/socioeconomic', '/dashboard/governance', '/dashboard/settings']
  }
};

const RoleContext = createContext();

export function RoleProvider({ children }) {
  // Default to Supervisor so nothing is broken by default
  const [currentRole, setCurrentRole] = useState(ROLES.SUPERVISOR);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
